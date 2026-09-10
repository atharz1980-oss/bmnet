-- Bayt Almosawer — Community CP-H V1: اختبارات RLS (النسخة النهائية المصححة 2026-09-11)
-- ============================================================
-- تُنفَّذ في Supabase SQL Editor على الإنتاج بعد تطبيق مخططات المجتمع الثلاثة:
--   supabase/migrations/20260910090000_community_schema.sql
--   supabase/migrations/20260910091000_community_admin_module.sql
--   supabase/migrations/20260910092000_community_rls_storage_triggers.sql
-- الأسلوب: انتحال الأدوار كما في cp_c_security_rls.test.sql المُجرَّب.
--
-- التصحيحات النهائية عن النسخة الأصلية:
--   1) begin/rollback صريحان — صفر أثر حتى لو انهار اختبار في المنتصف.
--   2) القسمان A وB يعملان بدور anon فعليًا (set local role anon) لا postgres.
--   3) جدول temp بمنح صريح: select لـ anon+authenticated، وupdate لـ authenticated فقط.
--   4) معالجات الأخطاء تلتقط insufficient_privilege (خرق RLS = 42501 / فئة 42xxx).
--   5) القسم E: إزالة الحجب بهوية الحاجب أ ثم إعادة المتابعة بهوية ب (كانت بهوية خاطئة).
--   6) 🔴 إصلاح حاسم: داخل كتل DO $$ يُستخدم PERFORM set_config(...) لا SELECT —
--      PL/pgSQL يرفض SELECT بلا INTO (خطأ: query has no destination for result data).
--      الموضعان top-level خارج الكتل يبقيان SELECT — صحيحان كأوامر SQL مستقلة.
--   7) جلسة إدارة حقيقية: ملف موظف اختباري في public.profiles يرتبط بدور admin
--      الإنتاجي → has_permission('community', …) يعمل كما في الواقع (نمط cp_c).
--   8) تغطية موسعة: الإيقاف (suspended)، الحفظ (saves)، إشعار الإعجاب،
--      حذف الإداري لمنشور مخفي.
--   9) rollback النهائي يحل محل الحذف اليدوي — لا مستخدمو اختبار ولا بيانات متبقية.
-- لا يستخدم أي أسرار.

begin;

create temp table rls_test_ids (a uuid, b uuid, admin uuid, post_a uuid);

-- جدول temp أُنشئ بصفة postgres — الأدوار المنتحلة تحتاج منحًا صريحًا:
-- anon يقرأ فقط (قسم G2)، authenticated يقرأ ويحدّث (C2 وأقسام الجلسات)
grant select on rls_test_ids to anon;
grant select, update on rls_test_ids to authenticated;

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

  -- 2) ملفان مجتمعيان (كـ postgres — تجهيز بيانات وليس اختبار سياسة)
  insert into public.community_profiles (user_id, username, display_name, status)
    values (user_a, username_a, 'عضو اختبار أ', 'active');
  insert into public.community_profiles (user_id, username, display_name, status)
    values (user_b, username_b, 'عضو اختبار ب', 'active');
end $$;

-- ===== A) قراءة الملفات العامة للمجهول (بدور anon فعليًا) =====
set local role anon;
do $$
declare cnt int;
begin
  select count(*) into cnt from public.community_profiles
  where username in ('rls_test_a', 'rls_test_b');
  if cnt <> 2 then raise exception 'FAIL A1: anon يجب أن يقرأ الملفات النشطة (وجد %)', cnt; end if;
  raise notice 'PASS A1: anon يقرأ الملفات النشطة';
end $$;
reset role;

-- ===== B) منع anon من أي كتابة (بدور anon فعليًا) =====
set local role anon;
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
reset role;

-- ===== C) جلسة العضو أ + فحوص spoofing =====
set local role authenticated;
-- C1: بلا جلسة — claim.sub فارغ وclaims JSON بلا sub → auth.uid() يرجع null
-- (top-level: SELECT صالح هنا كأمر SQL مستقل — خارج كتل DO)
select set_config('request.jwt.claim.sub', '', true),
       set_config('request.jwt.claims', '{"sub": null, "role": "authenticated"}', true);
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

-- جلسة العضو أ (GUCs كلاهما: يغطي نسختي auth.uid())
-- (top-level: SELECT صالح — خارج كتل DO)
select set_config('request.jwt.claim.sub', (select a::text from rls_test_ids), true),
       set_config('request.jwt.claims',
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

  -- C3: spoofing — إنشاء منشور باسم العضو ب يجب أن يفشل
  begin
    insert into public.community_posts (author_id, caption)
    values ((select b from rls_test_ids), 'spoof');
    raise exception 'FAIL C3: spoofing author_id نجح!';
  exception when check_violation or insufficient_privilege then
    raise notice 'PASS C3: with check يمنع spoofing';
  end;
end $$;

-- ===== D) المتابعة والحفظ ثم الحجب يقطع التفاعل =====
do $$
declare cnt int;
begin
  -- D1: العضو ب يتابع أ — PERFORM داخل PL/pgSQL (لا SELECT)
  perform set_config('request.jwt.claim.sub', (select b::text from rls_test_ids), true);
  perform set_config('request.jwt.claims',
    json_build_object('sub', (select b from rls_test_ids), 'role', 'authenticated')::text, true);
  insert into public.community_follows (follower_id, following_id)
  values ((select b from rls_test_ids), (select a from rls_test_ids));
  raise notice 'PASS D1: المتابعة قبل الحجب تعمل';

  -- D2: ب يحفظ منشور أ (saves — خاص بالحافظ فقط)
  insert into public.community_saved_posts (user_id, post_id)
  values ((select b from rls_test_ids), (select post_a from rls_test_ids));
  raise notice 'PASS D2: الحفظ يعمل للمالك';

  -- D3: أ يحجب ب
  perform set_config('request.jwt.claim.sub', (select a::text from rls_test_ids), true);
  perform set_config('request.jwt.claims',
    json_build_object('sub', (select a from rls_test_ids), 'role', 'authenticated')::text, true);
  insert into public.community_user_blocks (blocker_id, blocked_id)
  values ((select a from rls_test_ids), (select b from rls_test_ids));
  raise notice 'PASS D3: الحجب نجح';

  -- D4: مشغل التنظيف قطع متابعة ب→أ
  select count(*) into cnt from public.community_follows
  where follower_id = (select b from rls_test_ids)
    and following_id = (select a from rls_test_ids);
  if cnt <> 0 then raise exception 'FAIL D4: الحجب لم يقطع المتابعة'; end if;
  raise notice 'PASS D4: الحجب قطع المتابعة (مشغل)';

  -- D5: ب المحجوب لا يستطيع الإعجاب بمنشور أ
  perform set_config('request.jwt.claim.sub', (select b::text from rls_test_ids), true);
  perform set_config('request.jwt.claims',
    json_build_object('sub', (select b from rls_test_ids), 'role', 'authenticated')::text, true);
  begin
    insert into public.community_post_likes (post_id, user_id)
    values ((select post_a from rls_test_ids), (select b from rls_test_ids));
    raise exception 'FAIL D5: المحجوب أعجب بمنشور الحاجب!';
  exception when check_violation or insufficient_privilege then
    raise notice 'PASS D5: RLS يمنع تفاعل المحجوب';
  end;

  -- D6: أ لا يرى محفوظات ب (saved_select_own — خاصة بالحافظ)
  perform set_config('request.jwt.claim.sub', (select a::text from rls_test_ids), true);
  perform set_config('request.jwt.claims',
    json_build_object('sub', (select a from rls_test_ids), 'role', 'authenticated')::text, true);
  select count(*) into cnt from public.community_saved_posts
  where user_id = (select b from rls_test_ids);
  if cnt <> 0 then raise exception 'FAIL D6: أ قرأ محفوظات ب!'; end if;
  raise notice 'PASS D6: المحفوظات خاصة بالحافظ فقط';
end $$;

-- ===== E) الإشعارات تُنشأ بالمشغل ويقرأها المالك فقط =====
do $$
declare cnt int;
begin
  -- إزالة الحجب بهوية الحاجب أ فقط (ب لا يرى صف حجب أ أصلًا بفضل RLS)
  perform set_config('request.jwt.claim.sub', (select a::text from rls_test_ids), true);
  perform set_config('request.jwt.claims',
    json_build_object('sub', (select a from rls_test_ids), 'role', 'authenticated')::text, true);
  delete from public.community_user_blocks
  where blocker_id = (select a from rls_test_ids) and blocked_id = (select b from rls_test_ids);

  -- ب يعيد المتابعة بهويته (المشغل ينشئ إشعار متابعة ثانيًا لأ)
  perform set_config('request.jwt.claim.sub', (select b::text from rls_test_ids), true);
  perform set_config('request.jwt.claims',
    json_build_object('sub', (select b from rls_test_ids), 'role', 'authenticated')::text, true);
  insert into public.community_follows (follower_id, following_id)
  values ((select b from rls_test_ids), (select a from rls_test_ids));

  -- ب يُعجب بمنشور أ بعد رفع الحجب (المشغل ينشئ إشعار إعجاب لأ)
  insert into public.community_post_likes (post_id, user_id)
  values ((select post_a from rls_test_ids), (select b from rls_test_ids));
  raise notice 'PASS E1: الإعجاب بعد رفع الحجب يعمل';

  -- ب يقرأ إشعارات أ → يجب أن يرى 0
  select count(*) into cnt from public.community_notifications
  where user_id = (select a from rls_test_ids);
  if cnt <> 0 then raise exception 'FAIL E2: ب قرأ إشعارات أ!'; end if;
  raise notice 'PASS E2: RLS يمنع قراءة إشعارات غيرك';

  -- أ يرى إشعارات المتابعة والإعجاب (مشغلات community_notify_follow/like)
  perform set_config('request.jwt.claim.sub', (select a::text from rls_test_ids), true);
  perform set_config('request.jwt.claims',
    json_build_object('sub', (select a from rls_test_ids), 'role', 'authenticated')::text, true);
  select count(*) into cnt from public.community_notifications
  where user_id = (select a from rls_test_ids) and type = 'follow';
  if cnt < 1 then raise exception 'FAIL E3: مشغل إشعار المتابعة لم يعمل'; end if;
  select count(*) into cnt from public.community_notifications
  where user_id = (select a from rls_test_ids) and type = 'like';
  if cnt < 1 then raise exception 'FAIL E4: مشغل إشعار الإعجاب لم يعمل'; end if;
  raise notice 'PASS E3/E4: مشغلات الإشعارات أنشأت إشعاري المتابعة والإعجاب';
end $$;

-- ===== F) سلوك الإيقاف + جلسة الإدارة الحقيقية (has_permission) =====
-- تجهيز (كـ postgres): إيقاف ب + ملف موظف اختباري مرتبط بدور admin الإنتاجي
reset role;
update public.community_profiles set status = 'suspended'
  where user_id = (select b from rls_test_ids);
insert into public.profiles (id, name, role_id, status)
values ('636f6d6d-0000-0000-0000-0000000000c1', 'RLS admin test',
        (select id from public.roles where key = 'admin'), 'active');
update rls_test_ids set admin = '636f6d6d-0000-0000-0000-0000000000c1';

set local role anon;
do $$
declare cnt int;
begin
  -- F1: anon يرى عضوًا واحدًا فقط — الموقوف يختفي (public_select: status='active')
  select count(*) into cnt from public.community_profiles
  where username in ('rls_test_a', 'rls_test_b');
  if cnt <> 1 then raise exception 'FAIL F1: anon وجد % ملفًا والمتوقع 1 (الموقوف مخفي)', cnt; end if;
  raise notice 'PASS F1: anon لا يرى الملف الموقوف';
end $$;
reset role;

set local role authenticated;
do $$
declare cnt int;
begin
  -- جلسة الإدارة (نمط cp_c: ملف profiles + GUC بلا صف auth.users)
  perform set_config('request.jwt.claim.sub', (select admin::text from rls_test_ids), true);
  perform set_config('request.jwt.claims',
    json_build_object('sub', (select admin from rls_test_ids), 'role', 'authenticated')::text, true);

  -- F2: admin يرى الملفين (منهم الموقوف) — staff_select عبر has_permission('community','view')
  select count(*) into cnt from public.community_profiles
  where username in ('rls_test_a', 'rls_test_b');
  if cnt <> 2 then raise exception 'FAIL F2: admin وجد % ملفًا والمتوقع 2', cnt; end if;
  raise notice 'PASS F2: admin يرى الملفات بما فيها الموقوف (staff_select)';

  -- F3: admin يخفي منشور العضو أ — staff_update عبر has_permission('community','edit')
  update public.community_posts set status = 'hidden'
  where id = (select post_a from rls_test_ids);
  if not found then raise exception 'FAIL F3: admin لم يتمكن من الإخفاء'; end if;
  raise notice 'PASS F3: admin أخفى المنشور (staff_update)';
end $$;
reset role;

-- ===== G) المنشور المخفي إداريًا =====
set local role authenticated;
do $$
begin
  -- G1: المالك لا يستطيع إحياء منشوره المخفي (update_own: using status='published')
  perform set_config('request.jwt.claim.sub', (select a::text from rls_test_ids), true);
  perform set_config('request.jwt.claims',
    json_build_object('sub', (select a from rls_test_ids), 'role', 'authenticated')::text, true);
  update public.community_posts set status = 'published'
  where id = (select post_a from rls_test_ids);
  if found then raise exception 'FAIL G1: المالك عدّل حالة المنشور المخفي'; end if;
  raise notice 'PASS G1: المالك لا يحيي المنشور المخفي إداريًا';
end $$;
reset role;

set local role anon;
do $$
declare cnt int;
begin
  -- G2: anon لا يرى المنشور المخفي إطلاقًا (public_select: status='published')
  select count(*) into cnt from public.community_posts
  where id = (select post_a from rls_test_ids);
  if cnt <> 0 then raise exception 'FAIL G2: anon يرى منشورًا مخفيًا!', cnt; end if;
  raise notice 'PASS G2: anon لا يرى المنشور المخفي';
end $$;
reset role;

set local role authenticated;
do $$
begin
  -- H: admin يحذف المنشور المخفي — staff_delete عبر has_permission('community','delete')
  perform set_config('request.jwt.claim.sub', (select admin::text from rls_test_ids), true);
  perform set_config('request.jwt.claims',
    json_build_object('sub', (select admin from rls_test_ids), 'role', 'authenticated')::text, true);
  delete from public.community_posts
  where id = (select post_a from rls_test_ids);
  if not found then raise exception 'FAIL H1: admin لم يتمكن من حذف المنشور المخفي'; end if;
  raise notice 'PASS H1: admin حذف المنشور المخفي (staff_delete)';
end $$;
reset role;

-- ===== نهاية: rollback إلزامي — يمسح كل بيانات الاختبار بلا أثر =====
rollback;
