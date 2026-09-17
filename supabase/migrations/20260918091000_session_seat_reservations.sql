-- حجز مقاعد الدفعات — المقعد الأخير لا يُباع مرتين.
--
-- ─────────────────────── لماذا جدول مستقل ───────────────────────
-- `course_enrollments` يعني «يحق لهذا الشخص هذه الدورة»، ومفتاحه الفريد
-- (user_id, course_id). والمقعد يعني «يحضر هذه الدفعة بتاريخها»، ومفتاحه
-- (user, session). وضع `session_id` في التسجيل يخلط المعنيين ويمنع حضور
-- دفعة أخرى لاحقًا، ويُجبرنا على حالة تسجيل خامسة تعني «حجز لم يُدفع بعد».
-- والأهم: `save_course_atomic` يحذف الدفعات الغائبة عن الحمولة، فمفتاح
-- أجنبي من التسجيلات إلى الدفعات يجعل حفظ دورة عاديًّا إما يفشل على جدول
-- يقرأه نظام التعلّم، أو يمحو حقوق وصول. العزل هنا مقصود.
--
-- ─────────────────────── الحالات ثلاث لا أكثر ───────────────────────
--   held → confirmed → (released)
--   held → released
-- و«منتهي» ليس حالة بل خاصية وقت: `held and hold_expires_at <= now()`.
-- كل استعلام توافر وكل مطالبة يعاملانه كغير شاغل **فورًا**، فلا تتوقف
-- الصحة على مهمة تنظيف تعمل في الثانية المناسبة.
--
-- ─────────────────── المقعد الأخير: قفل لا عدّ تطبيقي ───────────────────
-- كل مطالبة تقفل صف الدفعة `for update` أولًا، ثم تعدّ ثم تُدرج داخل القفل
-- نفسه. المتنافسان يتسلسلان في القاعدة، ولا يعتمد شيء على ترتيب التطبيق.
-- وفوق ذلك فهرسان فريدان جزئيان يمنعان مقعدين حيّين لشخص واحد.
--
-- ─────────────────── التاريخ المالي لا يضيع ───────────────────
-- `course_payments` يحفظ **لقطة** لهوية الدفعة وقت الشراء (الاسم والتاريخ
-- والوقت والمكان) إلى جانب `session_id`. اللقطة هي المرجع التاريخي: تبقى
-- صحيحة ولو عُدّلت الدفعة أو حُذفت. والمفتاح الأجنبي للوصول العلائقي فقط.
-- ويُمنع حذف أي دفعة لها سجل مقاعد أصلًا (RESTRICT + حارس برسالة مفهومة)،
-- فاللقطة والحارس معًا لا أحدهما.
begin;

-- ─────────────────────────── المقاعد ───────────────────────────
create table public.course_session_seats (
  id uuid primary key default gen_random_uuid(),
  -- restrict: دفعة لها سجل مقاعد لا تختفي بحذف من تبويب المواعيد.
  session_id uuid not null references public.course_sessions(id) on delete restrict,
  -- مكرَّر عمدًا: يجعل «مقعد حيّ واحد لكل دورة» فهرسًا لا مشغّلًا بربط،
  -- ويتيح التحقق من انتماء الدفعة للدورة بلا ثقة في المستدعي.
  course_id uuid not null references public.courses(id) on delete restrict,
  user_id uuid not null references auth.users(id) on delete restrict,
  status text not null default 'held' check (status in ('held', 'confirmed', 'released')),
  hold_expires_at timestamptz,
  source text not null default 'purchase' check (source in ('free', 'purchase', 'manual')),
  payment_id uuid references public.course_payments(id) on delete set null,
  enrollment_id uuid references public.course_enrollments(id) on delete set null,
  confirmed_at timestamptz,
  released_at timestamptz,
  -- رمزنا نحن لا رسالة مزوّد: expired · checkout_failed · student_cancelled
  -- · admin_cancelled · session_cancelled · seat_unavailable · transferred
  release_reason text not null default '' check (length(release_reason) <= 40),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint seat_held_has_expiry check (status <> 'held' or hold_expires_at is not null),
  constraint seat_confirmed_has_time check (status <> 'confirmed' or confirmed_at is not null),
  constraint seat_released_has_time check (status <> 'released' or released_at is not null)
);

-- مقعد حيّ واحد لكل شخص في الدفعة، وواحد في الدورة كلها (قرار V1).
create unique index uq_seat_one_live_per_session
  on public.course_session_seats (session_id, user_id) where status in ('held', 'confirmed');
create unique index uq_seat_one_live_per_course
  on public.course_session_seats (course_id, user_id) where status in ('held', 'confirmed');
-- عملية دفع واحدة لا تحجز مقعدين.
create unique index uq_seat_one_per_payment
  on public.course_session_seats (payment_id) where payment_id is not null;
create index idx_seat_session_live on public.course_session_seats (session_id, status, hold_expires_at);
create index idx_seat_user on public.course_session_seats (user_id, created_at desc);

create trigger trg_course_session_seats_updated_at before update
  on public.course_session_seats for each row execute function public.set_updated_at();

-- ─────────────────── لقطة الدفعة في السجل المالي ───────────────────
alter table public.course_payments
  add column session_id uuid references public.course_sessions(id) on delete set null,
  add column session_label text not null default '',
  add column session_start_date date,
  add column session_start_time time,
  add column session_location text not null default '';
-- من يذكر دفعةً يحفظ تاريخها: اللقطة تبقى بعد ضياع المفتاح.
alter table public.course_payments
  add constraint course_payments_session_snapshot
  check (session_id is null or session_start_date is not null);
create index idx_course_payments_session on public.course_payments (session_id);

-- ─────────────────── حرّاس الدفعة (يشملون كتابة الموظف المباشرة) ───────────────────
-- الموظف يملك منحًا مباشرة على `course_sessions` من المتصفح، فالحماية هنا
-- لا في إجراء الخادم وحده.

create or replace function public.guard_session_capacity() returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_taken integer;
begin
  if new.capacity = old.capacity and new.registered_count = old.registered_count then
    return new;
  end if;
  select count(*) into v_taken
    from public.course_session_seats
   where session_id = new.id
     and (status = 'confirmed' or (status = 'held' and hold_expires_at > now()));
  -- الحجوزات الحيّة تُحسب: تخفيض السعة تحتها يخلق تجاوزًا فوريًا.
  if new.capacity < new.registered_count + v_taken then
    raise exception 'capacity_below_taken' using errcode = 'P0001';
  end if;
  return new;
end;
$$;
create trigger trg_session_capacity_guard before update on public.course_sessions
  for each row execute function public.guard_session_capacity();

create or replace function public.guard_session_delete() returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_seats integer;
begin
  select count(*) into v_seats
    from public.course_session_seats where session_id = old.id;
  -- أي سجل مقاعد يمنع الحذف — الحيّ والتاريخي معًا. الحذف يمحو دليلًا.
  if v_seats > 0 then
    raise exception 'session_has_seats' using errcode = 'P0001';
  end if;
  return old;
end;
$$;
create trigger trg_session_delete_guard before delete on public.course_sessions
  for each row execute function public.guard_session_delete();

-- ─────────────────────── التوافر الموثوق ───────────────────────
-- المشغول = مسجّلون يدويًا + مؤكَّدون + حجوزات حيّة لم تنتهِ.
-- تُعيد أرقامًا مجمّعة فقط: لا اسم ولا بريد ولا معرّف مستخدم ولا دفع.
create or replace function public.session_availability(p_course_id uuid)
returns table (
  session_id uuid,
  capacity integer,
  manual_count integer,
  taken integer,
  available integer,
  selectable boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  select s.id,
         s.capacity,
         s.registered_count,
         coalesce(o.taken, 0)::integer,
         greatest(s.capacity - s.registered_count - coalesce(o.taken, 0), 0)::integer,
         s.status in ('upcoming', 'open')
           and s.start_date >= current_date
           and s.capacity > 0
           and (s.capacity - s.registered_count - coalesce(o.taken, 0)) > 0
    from public.course_sessions s
    join public.courses c on c.id = s.course_id
    left join lateral (
      select count(*) as taken
        from public.course_session_seats z
       where z.session_id = s.id
         and (z.status = 'confirmed' or (z.status = 'held' and z.hold_expires_at > now()))
    ) o on true
   where s.course_id = p_course_id
     and c.publish_status = 'published'::public.course_publish_status;
$$;

-- ─────────────────── المطالبة بمقعد: معاملة واحدة ───────────────────
create or replace function public.claim_session_seat(
  p_user_id uuid,
  p_course_id uuid,
  p_session_id uuid,
  p_mode text,
  p_hold_minutes integer default 20
)
returns uuid
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_session public.course_sessions%rowtype;
  v_course public.courses%rowtype;
  v_existing public.course_session_seats%rowtype;
  v_taken integer;
  v_seat_id uuid;
  v_enrollment_id uuid;
begin
  if p_mode not in ('free', 'purchase') then
    raise exception 'invalid_mode' using errcode = 'P0001';
  end if;
  if p_hold_minutes < 1 or p_hold_minutes > 120 then
    raise exception 'invalid_hold' using errcode = 'P0001';
  end if;

  /* 1. القفل أولًا: كل مطالبة بمقعد في هذه الدفعة تتسلسل من هنا. */
  select * into v_session from public.course_sessions where id = p_session_id for update;
  if not found then raise exception 'session_not_found' using errcode = 'P0002'; end if;

  /* 2. الدفعة تخص هذه الدورة، والدورة تقبل التسجيل الذاتي أصلًا. */
  if v_session.course_id <> p_course_id then
    raise exception 'session_course_mismatch' using errcode = 'P0001';
  end if;
  select * into v_course from public.courses where id = p_course_id;
  if not found or v_course.publish_status <> 'published'::public.course_publish_status then
    raise exception 'course_not_published' using errcode = 'P0001';
  end if;
  if v_course.request_quote or v_course.category = 'in-person-corporates'::public.course_category then
    raise exception 'corporate_course' using errcode = 'P0001';
  end if;
  if (p_mode = 'free') <> v_course.is_free then
    raise exception 'commercial_mode_mismatch' using errcode = 'P0001';
  end if;
  if v_session.status not in ('upcoming'::public.session_status, 'open'::public.session_status) then
    raise exception 'session_not_open' using errcode = 'P0001';
  end if;
  if v_session.start_date < current_date then
    raise exception 'session_in_past' using errcode = 'P0001';
  end if;
  /* سعة صفر = غير مضبوطة، لا لا نهائية. */
  if v_session.capacity <= 0 then
    raise exception 'session_capacity_unset' using errcode = 'P0001';
  end if;

  /* 3. مقعد حيّ قائم لهذا الشخص: يُعاد بدل خطأ فريد خام. */
  select * into v_existing
    from public.course_session_seats
   where course_id = p_course_id
     and user_id = p_user_id
     and status in ('held', 'confirmed')
   for update;
  if found then
    if v_existing.session_id <> p_session_id then
      raise exception 'seat_in_other_session' using errcode = 'P0001';
    end if;
    if v_existing.status = 'confirmed' then
      return v_existing.id;
    end if;
    if v_existing.hold_expires_at > now() then
      /* حجز حيّ: يُعاد كما هو. لا تمديد بطلب من المتصفح. */
      if p_mode = 'free' then
        update public.course_session_seats
           set status = 'confirmed', confirmed_at = now(), hold_expires_at = null
         where id = v_existing.id;
        insert into public.course_enrollments (user_id, course_id, source, status)
        values (p_user_id, p_course_id, 'manual', 'active')
        on conflict (user_id, course_id) do update set status = 'active', updated_at = now()
        returning id into v_enrollment_id;
        update public.course_session_seats set enrollment_id = v_enrollment_id where id = v_existing.id;
      end if;
      return v_existing.id;
    end if;
    /* حجز منتهٍ: يُغلق ثم نبدأ من جديد بالسعة الحالية. */
    update public.course_session_seats
       set status = 'released', released_at = now(), release_reason = 'expired'
     where id = v_existing.id;
  end if;

  /* 4. العدّ داخل القفل — المنتهي لا يشغل مقعدًا. */
  select count(*) into v_taken
    from public.course_session_seats
   where session_id = p_session_id
     and (status = 'confirmed' or (status = 'held' and hold_expires_at > now()));
  if v_session.registered_count + v_taken >= v_session.capacity then
    raise exception 'session_full' using errcode = 'P0001';
  end if;

  /* 5. الإدراج داخل القفل نفسه: لا يمر اثنان على المقعد الأخير. */
  begin
    insert into public.course_session_seats (
      session_id, course_id, user_id, status, hold_expires_at, source, confirmed_at)
    values (
      p_session_id, p_course_id, p_user_id,
      case when p_mode = 'free' then 'confirmed' else 'held' end,
      case when p_mode = 'free' then null else now() + make_interval(mins => p_hold_minutes) end,
      case when p_mode = 'free' then 'free' else 'purchase' end,
      case when p_mode = 'free' then now() else null end)
    returning id into v_seat_id;
  exception when unique_violation then
    /* سباق على المقعد نفسه من نافذتين: أعد الحيّ القائم بهدوء. */
    select id into v_seat_id
      from public.course_session_seats
     where course_id = p_course_id and user_id = p_user_id and status in ('held', 'confirmed')
     limit 1;
    if v_seat_id is null then raise; end if;
    return v_seat_id;
  end;

  /* 6. المجاني يُفعَّل فورًا؛ المدفوع ينتظر تحقق الدفع. */
  if p_mode = 'free' then
    insert into public.course_enrollments (user_id, course_id, source, status)
    values (p_user_id, p_course_id, 'manual', 'active')
    on conflict (user_id, course_id) do update set status = 'active', updated_at = now()
    returning id into v_enrollment_id;
    update public.course_session_seats set enrollment_id = v_enrollment_id where id = v_seat_id;
  end if;

  return v_seat_id;
end;
$$;

-- ─────────────────────── تحرير مقعد ───────────────────────
create or replace function public.release_session_seat(p_seat_id uuid, p_reason text)
returns boolean
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_updated integer;
begin
  update public.course_session_seats
     set status = 'released', released_at = now(),
         hold_expires_at = null, release_reason = left(coalesce(p_reason, ''), 40)
   where id = p_seat_id
     and status in ('held', 'confirmed');
  get diagnostics v_updated = row_count;
  return v_updated > 0;
end;
$$;

-- ─────────────── تنظيف الحجوزات المنتهية (ترتيب لا صحة) ───────────────
-- التوافر يتجاهل المنتهي فورًا؛ هذه الدالة تنظّف السجل فقط.
create or replace function public.release_expired_session_holds()
returns integer
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_count integer;
begin
  update public.course_session_seats
     set status = 'released', released_at = now(), hold_expires_at = null, release_reason = 'expired'
   where status = 'held' and hold_expires_at <= now();
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

-- ─────────────── تفعيل الشراء: الدفع والمقعد والتسجيل معًا ───────────────
-- توسيع بنفس التوقيع. خامل تمامًا لعملية بلا مقعد، فالدورات الأونلاين بلا
-- دفعات تمر كما كانت حرفيًا.
create or replace function public.finalize_course_purchase(
  p_payment_id uuid,
  p_provider_payment_id text,
  p_environment public.payment_environment
)
returns uuid
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_payment public.course_payments%rowtype;
  v_seat public.course_session_seats%rowtype;
  v_session public.course_sessions%rowtype;
  v_session_id uuid;
  v_taken integer;
  v_enrollment_id uuid;
begin
  select * into v_payment from public.course_payments where id = p_payment_id for update;
  if not found then
    raise exception 'payment_not_found' using errcode = 'P0002';
  end if;

  /* تكرار التفعيل نجاحٌ بلا أثر — هذا ما يجعل إعادة الإشعار غير ضارة. */
  if v_payment.status = 'paid' then
    return v_payment.enrollment_id;
  end if;
  if v_payment.status in ('failed', 'cancelled', 'expired', 'refunded') then
    raise exception 'payment_terminal' using errcode = 'P0001';
  end if;
  if v_payment.environment <> p_environment then
    raise exception 'environment_mismatch' using errcode = 'P0001';
  end if;
  if p_provider_payment_id is null or length(btrim(p_provider_payment_id)) = 0 then
    raise exception 'provider_reference_required' using errcode = 'P0001';
  end if;
  if v_payment.provider_payment_id is not null
     and v_payment.provider_payment_id <> p_provider_payment_id then
    raise exception 'provider_reference_mismatch' using errcode = 'P0001';
  end if;

  /* مقعد مرتبط بهذه العملية؟ عندها التأكيد جزء من المعاملة نفسها.
     ترتيب القفل هنا هو ترتيبه في  حرفيًا: الدفعة ثم
     المقعد. عكسه في أحد الموضعين يصنع جمودًا متبادلًا تحت التزامن. */
  select session_id into v_session_id from public.course_session_seats
   where payment_id = p_payment_id;

  /* عملية تذكر دفعة بلا مقعد: لا تُفعَّل بحال. لا يصنعها التدفّق الطبيعي
     (الحجز يسبق إنشاء صف الدفع)، وهذا الحارس يمنع أن يصنعها خطأ يومًا. */
  if v_session_id is null and v_payment.session_id is not null then
    update public.course_payments
       set status = 'paid', paid_at = now(),
           provider_payment_id = p_provider_payment_id,
           failure_code = 'seat_unavailable'
     where id = p_payment_id;
    return null;
  end if;

  if v_session_id is not null then
    select * into v_session from public.course_sessions
     where id = v_session_id for update;
    select * into v_seat from public.course_session_seats
     where payment_id = p_payment_id for update;

    if v_seat.status = 'released' then
      /* دُفع بعد ضياع المقعد: المال وصل، والوصول لا يُفتح. */
      update public.course_payments
         set status = 'paid', paid_at = now(),
             provider_payment_id = p_provider_payment_id,
             failure_code = 'seat_unavailable'
       where id = p_payment_id;
      return null;
    end if;

    if v_seat.status = 'held' and v_seat.hold_expires_at <= now() then
      select count(*) into v_taken
        from public.course_session_seats
       where session_id = v_seat.session_id
         and id <> v_seat.id
         and (status = 'confirmed' or (status = 'held' and hold_expires_at > now()));
      if v_session.registered_count + v_taken >= v_session.capacity then
        update public.course_session_seats
           set status = 'released', released_at = now(),
               hold_expires_at = null, release_reason = 'seat_unavailable'
         where id = v_seat.id;
        update public.course_payments
           set status = 'paid', paid_at = now(),
               provider_payment_id = p_provider_payment_id,
               failure_code = 'seat_unavailable'
         where id = p_payment_id;
        return null;
      end if;
    end if;

    update public.course_session_seats
       set status = 'confirmed', confirmed_at = now(), hold_expires_at = null
     where id = v_seat.id;
  end if;

  insert into public.course_enrollments (user_id, course_id, source, status)
  values (v_payment.user_id, v_payment.course_id, 'purchase', 'active')
  on conflict (user_id, course_id) do update
    set status = 'active', source = 'purchase', updated_at = now()
  returning id into v_enrollment_id;

  if v_seat.id is not null then
    update public.course_session_seats set enrollment_id = v_enrollment_id where id = v_seat.id;
  end if;

  update public.course_payments
     set status = 'paid',
         paid_at = now(),
         provider_payment_id = p_provider_payment_id,
         enrollment_id = v_enrollment_id
   where id = p_payment_id;

  return v_enrollment_id;
end;
$$;

-- الصلاحية تُعاد صراحةً بعد الاستبدال: CREATE OR REPLACE يحفظها، لكن
-- الاعتماد على ذلك ضمنًا يترك أخطر دالة بلا سطر يثبت من ينفّذها.
revoke all on function public.finalize_course_purchase(uuid, text, public.payment_environment)
  from public, anon, authenticated;
grant execute on function public.finalize_course_purchase(uuid, text, public.payment_environment)
  to service_role;

-- ──────────────────────────── RLS ────────────────────────────
alter table public.course_session_seats enable row level security;
revoke all on public.course_session_seats from public, anon, authenticated;

-- المتدرب يرى مقعده هو، بأعمدة لا تكشف دفعًا ولا مهلة حجز.
create policy own_course_session_seats_select
on public.course_session_seats
for select
to authenticated
using (user_id = (select auth.uid()));
grant select (id, session_id, course_id, status, source, created_at, confirmed_at)
  on table public.course_session_seats to authenticated;

grant select, insert, update, delete on public.course_session_seats to service_role;

revoke all on function public.claim_session_seat(uuid, uuid, uuid, text, integer)
  from public, anon, authenticated;
revoke all on function public.release_session_seat(uuid, text) from public, anon, authenticated;
revoke all on function public.release_expired_session_holds() from public, anon, authenticated;
revoke all on function public.guard_session_capacity() from public, anon, authenticated;
revoke all on function public.guard_session_delete() from public, anon, authenticated;
grant execute on function public.claim_session_seat(uuid, uuid, uuid, text, integer) to service_role;
grant execute on function public.release_session_seat(uuid, text) to service_role;
grant execute on function public.release_expired_session_holds() to service_role;

-- التوافر أرقام مجمّعة لدورة منشورة — يقرأها الزائر.
revoke all on function public.session_availability(uuid) from public;
grant execute on function public.session_availability(uuid) to anon, authenticated, service_role;

commit;
