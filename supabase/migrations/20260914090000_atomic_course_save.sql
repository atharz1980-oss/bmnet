-- حفظ الدورة كمعاملة واحدة (إغلاق HIGH) — 2026-09-14
-- ============================================================
-- المشكلة المقيسة: `writeCourseChildren` في التطبيق كان يحذف **كل** مواعيد
-- الدورة وأيام منهجها ثم يُدرج البديل، عبر طلبات PostgREST منفصلة. كل طلب
-- معاملته الخاصة، فلا تراجع بينها: أي فشل بعد الحذف يترك الدورة بلا منهج
-- ولا مواعيد بلا رجعة. وقع فعلًا على الإنتاج ومُحيت بيانات دورة.
--
-- العلاج: دالة واحدة يجري جسمها داخل معاملة واحدة — تنجح كلها أو تُرفض
-- كلها وتبقى البيانات كما كانت حرفيًا.
--
-- وترقية ثانية لازمة: الحذف‑ثم‑الإدراج كان يُفني هوية الصفوف. و
-- `homepage_upcoming_course.manual_session_id` مفتاح أجنبي بـON DELETE SET
-- NULL، فكل حفظ لدورة مثبَّت أحد مواعيدها في الرئيسية كان يفكّ التثبيت
-- صامتًا. هنا تُحدَّث الصفوف القائمة في مكانها بمعرّفاتها، ولا يُحذف إلا
-- ما غاب فعلًا عن الحمولة — فتبقى الهوية وتبقى الإشارات إليها.
--
-- الأمان: SECURITY INVOKER عمدًا (لا DEFINER). المستدعي هو عميل الخدمة من
-- Server Action مرّ ببوابة requirePermission('courses', …) — وهو نموذج
-- التفويض الحقيقي للمشروع. فلا حاجة لرفع صلاحية داخل الدالة، و
-- EXECUTE ممنوح لـservice_role وحده: لا anon ولا authenticated يملك
-- استدعاءها أصلًا. وفي جسمها حارس عمق إضافي لو مُنحت يومًا لدور مستخدم.
--
-- التزامن: الدورة تُقفل بـSELECT … FOR UPDATE قبل أي كتابة، فحفظان
-- متزامنان للدورة نفسها يتسلسلان بدل أن يتداخل حذف أحدهما مع إدراج الآخر.
-- قفل صفّي واحد لا أكثر — لا يعطّل بقية الجدول.
begin;

create or replace function public.save_course_atomic(
  p_course_id uuid,
  p_course jsonb,
  p_curriculum jsonb default '[]'::jsonb,
  p_sessions jsonb default '[]'::jsonb
)
returns uuid
language plpgsql
volatile
set search_path to ''
as $$
declare
  v_course_id uuid;
  v_day jsonb;
  v_item jsonb;
  v_session jsonb;
  v_day_id uuid;
  v_raw text;
  v_new_id uuid;
  v_day_index int := 0;
  v_item_index int;
  v_session_index int := 0;
  v_kept_days uuid[] := '{}';
  v_kept_items uuid[] := '{}';
  v_kept_sessions uuid[] := '{}';
  c_uuid constant text := '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$';
begin
  /* حارس عمق: غير مُفعَّل اليوم لأن EXECUTE لـservice_role وحده، لكنه
     يمنع أي منح مستقبلي من أن يفتح تعديل الدورات لعضو عادي. */
  if current_user <> 'service_role' then
    if not (select private.has_permission('courses'::public.admin_module, 'edit'::public.permission_action)) then
      raise exception 'insufficient_privilege: courses.edit' using errcode = '42501';
    end if;
  end if;

  if p_course is null or jsonb_typeof(p_course) <> 'object' then
    raise exception 'invalid_course_payload' using errcode = '22023';
  end if;

  if p_course_id is null then
    /* قائمة أعمدة صريحة: jsonb_populate_record يضع NULL للمفاتيح الغائبة،
       والـNULL الصريح يتجاوز DEFAULT فتنكسر أعمدة NOT NULL. */
    insert into public.courses (
      slug, name, short_description, description, category, level, language, trainer_id,
      image_path, image_alt, price, original_price, discount_percent, show_price, is_free,
      request_quote, duration_days, duration_hours, outcomes, audience, requirements,
      featured, publish_status, operational_status, seo_title, seo_description)
    values (
      p_course->>'slug', p_course->>'name',
      coalesce(p_course->>'short_description', ''), coalesce(p_course->>'description', ''),
      (p_course->>'category')::public.course_category,
      coalesce((p_course->>'level')::public.course_level, 'beginner'),
      coalesce(p_course->>'language', 'ar'), (p_course->>'trainer_id')::uuid,
      coalesce(p_course->>'image_path', ''), coalesce(p_course->>'image_alt', ''),
      coalesce((p_course->>'price')::numeric, 0), nullif(p_course->>'original_price', '')::numeric,
      nullif(p_course->>'discount_percent', '')::int,
      coalesce((p_course->>'show_price')::boolean, true),
      coalesce((p_course->>'is_free')::boolean, false),
      coalesce((p_course->>'request_quote')::boolean, false),
      coalesce((p_course->>'duration_days')::int, 0), coalesce((p_course->>'duration_hours')::int, 0),
      coalesce((select array_agg(value::text) from jsonb_array_elements_text(p_course->'outcomes') as t(value)), '{}'::text[]),
      coalesce((select array_agg(value::text) from jsonb_array_elements_text(p_course->'audience') as t(value)), '{}'::text[]),
      coalesce((select array_agg(value::text) from jsonb_array_elements_text(p_course->'requirements') as t(value)), '{}'::text[]),
      coalesce((p_course->>'featured')::boolean, false),
      coalesce((p_course->>'publish_status')::public.course_publish_status, 'draft'),
      nullif(p_course->>'operational_status', '')::public.course_operational_status,
      nullif(p_course->>'seo_title', ''), nullif(p_course->>'seo_description', ''))
    returning id into v_course_id;
  else
    /* القفل قبل الكتابة: يسلسل الحفظ المتزامن لنفس الدورة. */
    select id into v_course_id from public.courses where id = p_course_id for update;
    if v_course_id is null then
      raise exception 'course_not_found' using errcode = 'P0002';
    end if;
    update public.courses c
       set slug = coalesce(p_course->>'slug', c.slug),
           name = coalesce(p_course->>'name', c.name),
           short_description = coalesce(p_course->>'short_description', c.short_description),
           description = coalesce(p_course->>'description', c.description),
           category = coalesce((p_course->>'category')::public.course_category, c.category),
           level = coalesce((p_course->>'level')::public.course_level, c.level),
           language = coalesce(p_course->>'language', c.language),
           trainer_id = coalesce((p_course->>'trainer_id')::uuid, c.trainer_id),
           image_path = coalesce(p_course->>'image_path', c.image_path),
           image_alt = coalesce(p_course->>'image_alt', c.image_alt),
           price = coalesce((p_course->>'price')::numeric, c.price),
           original_price = nullif(p_course->>'original_price', '')::numeric,
           discount_percent = nullif(p_course->>'discount_percent', '')::int,
           show_price = coalesce((p_course->>'show_price')::boolean, c.show_price),
           is_free = coalesce((p_course->>'is_free')::boolean, c.is_free),
           request_quote = coalesce((p_course->>'request_quote')::boolean, c.request_quote),
           duration_days = coalesce((p_course->>'duration_days')::int, c.duration_days),
           duration_hours = coalesce((p_course->>'duration_hours')::int, c.duration_hours),
           outcomes = coalesce(
             (select array_agg(value::text) from jsonb_array_elements_text(p_course->'outcomes') as t(value)),
             '{}'::text[]),
           audience = coalesce(
             (select array_agg(value::text) from jsonb_array_elements_text(p_course->'audience') as t(value)),
             '{}'::text[]),
           requirements = coalesce(
             (select array_agg(value::text) from jsonb_array_elements_text(p_course->'requirements') as t(value)),
             '{}'::text[]),
           featured = coalesce((p_course->>'featured')::boolean, c.featured),
           publish_status = coalesce((p_course->>'publish_status')::public.course_publish_status, c.publish_status),
           operational_status = nullif(p_course->>'operational_status', '')::public.course_operational_status,
           seo_title = nullif(p_course->>'seo_title', ''),
           seo_description = nullif(p_course->>'seo_description', '')
     where c.id = v_course_id;
  end if;

  /* ── المنهج: تحديث في المكان بالمعرّف، وإدراج للجديد، وحذف للغائب ── */
  for v_day in select * from jsonb_array_elements(coalesce(p_curriculum, '[]'::jsonb))
  loop
    v_day_index := v_day_index + 1;
    v_raw := nullif(v_day->>'id', '');
    v_day_id := null;
    if v_raw is not null and v_raw ~ c_uuid then
      /* المعرّف صالح شكلًا — لكن لا يُقبل إلا إن كان ليوم من هذه الدورة. */
      select d.id into v_day_id from public.course_curriculum_days d
       where d.id = v_raw::uuid and d.course_id = v_course_id;
    end if;

    if v_day_id is null then
      insert into public.course_curriculum_days (course_id, title, sort_order)
      values (v_course_id, coalesce(v_day->>'title', ''), v_day_index)
      returning id into v_day_id;
    else
      update public.course_curriculum_days
         set title = coalesce(v_day->>'title', ''), sort_order = v_day_index
       where id = v_day_id;
    end if;
    v_kept_days := v_kept_days || v_day_id;

    v_item_index := 0;
    for v_item in select * from jsonb_array_elements(coalesce(v_day->'items', '[]'::jsonb))
    loop
      v_item_index := v_item_index + 1;
      v_raw := nullif(v_item->>'id', '');
      if v_raw is not null and v_raw ~ c_uuid
         and exists (select 1 from public.course_curriculum_items i where i.id = v_raw::uuid and i.day_id = v_day_id)
      then
        update public.course_curriculum_items
           set title = coalesce(v_item->>'title', ''),
               description = nullif(v_item->>'description', ''),
               sort_order = v_item_index
         where id = v_raw::uuid;
        v_kept_items := v_kept_items || v_raw::uuid;
      else
        insert into public.course_curriculum_items (day_id, title, description, sort_order)
        values (v_day_id, coalesce(v_item->>'title', ''), nullif(v_item->>'description', ''), v_item_index)
        returning id into v_new_id;
        v_kept_items := v_kept_items || v_new_id;
      end if;
    end loop;
  end loop;

  delete from public.course_curriculum_items i
   using public.course_curriculum_days d
   where i.day_id = d.id and d.course_id = v_course_id and not (i.id = any(v_kept_items));
  delete from public.course_curriculum_days d
   where d.course_id = v_course_id and not (d.id = any(v_kept_days));

  /* ── المواعيد: بالمنطق نفسه — الهوية تبقى فتبقى إشارة الرئيسية إليها ── */
  for v_session in select * from jsonb_array_elements(coalesce(p_sessions, '[]'::jsonb))
  loop
    v_session_index := v_session_index + 1;
    v_raw := nullif(v_session->>'id', '');
    if v_raw is not null and v_raw ~ c_uuid
       and exists (select 1 from public.course_sessions s where s.id = v_raw::uuid and s.course_id = v_course_id)
    then
      update public.course_sessions
         set batch_name = nullif(v_session->>'batch_name', ''),
             start_date = (v_session->>'start_date')::date,
             end_date = nullif(v_session->>'end_date', '')::date,
             start_time = (v_session->>'start_time')::time,
             end_time = (v_session->>'end_time')::time,
             location = coalesce(v_session->>'location', ''),
             city = coalesce(v_session->>'city', ''),
             capacity = coalesce((v_session->>'capacity')::int, 0),
             registered_count = coalesce((v_session->>'registered_count')::int, 0),
             price_override = nullif(v_session->>'price_override', '')::numeric,
             status = coalesce((v_session->>'status')::public.session_status, 'upcoming')
       where id = v_raw::uuid;
      v_kept_sessions := v_kept_sessions || v_raw::uuid;
    else
      insert into public.course_sessions (
        course_id, batch_name, start_date, end_date, start_time, end_time,
        location, city, capacity, registered_count, price_override, status)
      values (
        v_course_id, nullif(v_session->>'batch_name', ''), (v_session->>'start_date')::date,
        nullif(v_session->>'end_date', '')::date, (v_session->>'start_time')::time,
        (v_session->>'end_time')::time, coalesce(v_session->>'location', ''),
        coalesce(v_session->>'city', ''), coalesce((v_session->>'capacity')::int, 0),
        coalesce((v_session->>'registered_count')::int, 0),
        nullif(v_session->>'price_override', '')::numeric,
        coalesce((v_session->>'status')::public.session_status, 'upcoming'))
      returning id into v_new_id;
      v_kept_sessions := v_kept_sessions || v_new_id;
    end if;
  end loop;

  delete from public.course_sessions s
   where s.course_id = v_course_id and not (s.id = any(v_kept_sessions));

  return v_course_id;
end;
$$;

comment on function public.save_course_atomic(uuid, jsonb, jsonb, jsonb) is
  'حفظ الدورة وأطفالها في معاملة واحدة. تُستدعى من Server Action بعميل الخدمة بعد بوابة requirePermission. تحدّث الصفوف بمعرّفاتها فلا تُفنى الهوية.';

/* لا anon ولا authenticated: الاستدعاء من الخادم وحده. */
revoke all on function public.save_course_atomic(uuid, jsonb, jsonb, jsonb) from public;
revoke all on function public.save_course_atomic(uuid, jsonb, jsonb, jsonb) from anon;
revoke all on function public.save_course_atomic(uuid, jsonb, jsonb, jsonb) from authenticated;
grant execute on function public.save_course_atomic(uuid, jsonb, jsonb, jsonb) to service_role;

commit;
