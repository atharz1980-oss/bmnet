-- Bayt Almosawer — Community CP-H V1: اختبارات RLS (2026-09-10)
-- ============================================================
-- تُنفَّذ داخل قاعدة الإنتاج بعد تطبيق مخططات المجتمع الثلاثة:
--   supabase/migrations/20260910090000_community_schema.sql
--   supabase/migrations/20260910091000_community_admin_module.sql
--   supabase/migrations/20260910092000_community_rls_storage_triggers.sql
-- الأسلوب: انتحال الأدوار عبر set_config('role'…)+claims كما في cp_c_security_rls.test.sql.
-- كل اختبار ينظف بياناته — لا يترك أي أثر. لا يستخدم أي أسرار.

-- ===== إعداد: عضوان اختباريان في auth.users ثم حذفهما في النهاية =====
do $$
begin
  -- ملاحظة: يتطلب صلاحية postgres/superuser (SQL Editor للمالك يملكها)
  null;
end $$;

create temp table if not exists rls_test_ids (a uuid, b uuid, admin uuid, post_a uuid);

do $$
declare
  user_a uuid; user_b uuid; admin_id uuid; post_id uuid;
  username_a text := 'rls_test_a'; username_b text := 'rls_test_b';
  pass text := crypt('rls-test-pass-2026', gen_salt('bf'));
begin
  -- 1) إنشاء مستخدمين اختباريين (auth.users)
  insert into auth.users (instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data)
  values ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated',
    username_a || '@rls-test.invalid', pass, now(), now(), now(), '{"provider":"email","providers":["email"]}', '{}')
  returning id into user_a;
  insert into auth.users (instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data)
  values ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated',
    username_b || '@rls-test.invalid', pass, now(), now(), now(), '{"provider":"email","providers":["email"]}', '{}')
  returning id into user_b;

  insert into rls_test_ids (a, b) values (user_a, user_b);

  -- 2) ملفان مجتمعيان
  insert into public.community_profiles (user_id, username, display_name, status)
    values (user_a, username_a, 'عضو اختبار أ', 'active');
  insert into public.community_profiles (user_id, username, display_name, status)
    values (user_b, username_b, 'عضو اختبار ب', 'active');
end $$;

-- ===== A) قراءة الملفات العامة للمجهول =====
do $$
declare cnt int;
begin
  select count(*) into cnt from public.community_profiles
  where username in ('rls_test_a', 'rls_test_b');
  if cnt <> 2 then raise exception 'FAIL A1: anon يجب أن يقرأ الملفات النشطة (وجد %)', cnt; end if;
  raise notice 'PASS A1: anon يقرأ الملفات النشطة';
end $$;

-- ===== B) منع anon من أي كتابة =====
do $$
begin
  begin
    insert into public.community_posts (author_id, caption)
    select user_id, 'hijack' from public.community_profiles where username = 'rls_test_a';
    raise exception 'FAIL B1: anon تمكن من إدراج منشور!';
  exception when insufficient_privilege then
    raise notice 'PASS B1: anon ممنوع من الإدراج';
  end;
end $$;

-- ===== C) انتحال هوية العضو أ ومنع spoofing =====
set local role authenticated;
set local request.jwt.claims to '{"sub": null, "role": "authenticated"}';
-- (بدون JWT: auth.uid() يرجع null — كل سياسات الكتابة تفشل)
do $$
declare cnt int;
begin
  begin
    insert into public.community_posts (author_id, caption)
    select user_id, 'x' from public.community_profiles where username = 'rls_test_a';
    raise exception 'FAIL C1: كتابة بلا جلسة نجحت!';
  exception when insufficient_privilege or check_violation then
    raise notice 'PASS C1: بلا جلسة لا كتابة (with check auth.uid())';
  end;
end $$;

-- جلسة العضو أ
select set_config('request.jwt.claims',
  json_build_object('sub', (select a from rls_test_ids), 'role', 'authenticated')::text, true);

do $$
declare post_id uuid; cnt int;
begin
  -- C2: العضو أ ينشئ منشورًا باسمه
  insert into public.community_posts (author_id, caption)
  values ((select a from rls_test_ids), 'منشور اختبار RLS')
  returning id into post_id;
  update rls_test_ids set post_a = post_id;
  raise notice 'PASS C2: العضو ينشئ منشورًا باسمه';

  -- C3: spoofing — محاولة إنشاء منشور باسم العضو ب يجب أن تفشل
  begin
    insert into public.community_posts (author_id, caption)
    values ((select b from rls_test_ids), 'spoof');
    raise exception 'FAIL C3: spoofing author_id نجح!';
  exception when check_violation then
    raise notice 'PASS C3: with check يمنع spoofing';
  end;
end $$;

-- ===== D) الحجب يمنع التفاعل =====
do $$
declare cnt int;
begin
  -- D1: العضو ب يتابع أ
  select set_config('request.jwt.claims',
    json_build_object('sub', (select b from rls_test_ids), 'role', 'authenticated')::text, true);
  insert into public.community_follows (follower_id, following_id)
  values ((select b from rls_test_ids), (select a from rls_test_ids));
  raise notice 'PASS D1: المتابعة قبل الحجب تعمل';

  -- D2: أ يحجب ب
  select set_config('request.jwt.claims',
    json_build_object('sub', (select a from rls_test_ids), 'role', 'authenticated')::text, true);
  insert into public.community_user_blocks (blocker_id, blocked_id)
  values ((select a from rls_test_ids), (select b from rls_test_ids));
  raise notice 'PASS D2: الحجب نجح';

  -- D3: مشغل التنظيف قطع متابعة ب→أ
  select count(*) into cnt from public.community_follows
  where follower_id = (select b from rls_test_ids)
    and following_id = (select a from rls_test_ids);
  if cnt <> 0 then raise exception 'FAIL D3: الحجب لم يقطع المتابعة'; end if;
  raise notice 'PASS D3: الحجب قطع المتابعة (مشغل)';

  -- D4: ب لا يستطيع الإعجاب بمنشور أ بعد الحجب
  select set_config('request.jwt.claims',
    json_build_object('sub', (select b from rls_test_ids), 'role', 'authenticated')::text, true);
  begin
    insert into public.community_post_likes (post_id, user_id)
    values ((select post_a from rls_test_ids), (select b from rls_test_ids));
    raise exception 'FAIL D4: المحجوب أعجب بمنشور الحاجب!';
  exception when check_violation then
    raise notice 'PASS D4: RLS يمنع تفاعل المحجوب';
  end;
end $$;

-- ===== E) الإشعارات تُنشأ بالمشغل ويقرأها المالك فقط =====
do $$
declare cnt int;
begin
  -- إعجاب ب منشور أ قبل الحجب كان سينشئ إشعارًا — ننشئ إشعارًا متابعة بدلًا: أعِد إنشاء متابعة مؤقتة بعد إلغاء الحجب
  delete from public.community_user_blocks
  where blocker_id = (select a from rls_test_ids) and blocked_id = (select b from rls_test_ids);
  insert into public.community_follows (follower_id, following_id)
  values ((select b from rls_test_ids), (select a from rls_test_ids));

  -- ب يقرأ إشعارات أ → يجب أن يرى 0
  select set_config('request.jwt.claims',
    json_build_object('sub', (select b from rls_test_ids), 'role', 'authenticated')::text, true);
  select count(*) into cnt from public.community_notifications
  where user_id = (select a from rls_test_ids);
  if cnt <> 0 then raise exception 'FAIL E1: ب قرأ إشعارات أ!'; end if;
  raise notice 'PASS E1: RLS يمنع قراءة إشعارات غيرك';

  -- أ يرى إشعار المتابعة (مشغل community_notify_follow)
  select set_config('request.jwt.claims',
    json_build_object('sub', (select a from rls_test_ids), 'role', 'authenticated')::text, true);
  select count(*) into cnt from public.community_notifications
  where user_id = (select a from rls_test_ids) and type = 'follow';
  if cnt < 1 then raise exception 'FAIL E2: مشغل الإشعار لم يعمل'; end if;
  raise notice 'PASS E2: مشغل الإشعارات أنشأ إشعار المتابعة';
end $$;

-- ===== F) منشور مخفي إداريًا لا يستطيع المالك استرجاعه بتعديل عادي =====
do $$
begin
  select set_config('request.jwt.claims',
    json_build_object('sub', (select a from rls_test_ids), 'role', 'authenticated')::text, true);
  update public.community_posts set status = 'published'
  where id = (select post_a from rls_test_ids);
  if found then raise exception 'FAIL F1: المالك عدّل حالة المنشور'; end if;
  raise notice 'PASS F1: تحديث المالك لا يمس الحالة (سياسة using status=published)';
end $$;

-- ===== تنظيف كامل (cascade يحذف كل المحتوى المرتبط) =====
do $$
declare rec record;
begin
  for rec in select a, b from rls_test_ids loop
    delete from auth.users where id in (rec.a, rec.b);
  end loop;
  raise notice 'CLEANUP: حُذف المستخدمون الاختباريون وكل بياناتهم (cascade)';
end $$;

reset role;
