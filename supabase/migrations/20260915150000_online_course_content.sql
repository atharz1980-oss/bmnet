-- محتوى الدورة الأونلاين: وحدات ودروس وتسجيل — 2026-09-15
-- ============================================================
-- المرحلة الأولى من الدورات الأونلاين: بنية المحتوى وحارس الوصول. لا شراء
-- هنا ولا تحصيل — `course_enrollments` تُملأ يدويًا من الإدارة الآن،
-- وستملؤها معاملة الشراء لاحقًا بلا تغيير في هذا العقد.
--
-- لماذا جداول مستقلة لا أعمدة في `courses`: حفظ الدورة يمر بـ
-- `save_course_atomic` وهي معاملة أُغلق بها HIGH. توسيع حمولتها بمحتوى
-- تعليمي يربط نشر درس بحفظ الدورة كلها بلا داعٍ، ويوسّع سطح أخطر دالة في
-- المشروع. المحتوى هنا يُدار بإجراءاته الخاصة ولا يمس تلك الدالة إطلاقًا.
--
-- الأمان — ثلاث طبقات لا واحدة:
--  1. RLS: لا وحدة في دورة غير منشورة، ولا وحدة غير منشورة، ولا درس غير
--     منشور. النشر بوابة مطلقة على كل مستوى.
--  2. منح على مستوى العمود: `video_id` (معرّف الفيديو لدى Bunny) **غير
--     ممنوح** لـanon ولا authenticated إطلاقًا. حتى لو انفتحت سياسة يومًا،
--     لا يستطيع المتصفح قراءة العمود أصلًا. هذا هو الفارق بين «مخفي» و
--     «ممنوع».
--  3. لا كتابة من المتصفح البتة: الكتابة لـservice_role وحده، خلف
--     requirePermission('courses', …) في Server Action.
--
-- ─────────────────────────────────────────────────────────────
-- تشغيليًا — شرط لا يراه الكود ولا يستطيع فحصه:
--
--   في لوحة Bunny ← Stream ← المكتبة ← Security:
--     • Embed View Token Authentication  =  **يجب تفعيله**
--     • CDN Token Authentication         =  **لا تفعّله** لهذا التدفق
--
-- بدون الأول يعمل الـembed بلا توقيع، فمن عرف `video_id` شاهد الدرس
-- وتصبح كل طبقات الحماية أعلاه زينة. والثاني نظام مفاتيح آخر يوجب توقيع
-- طلبات المقاطع داخليًا — تفعيله يكسر التشغيل ما لم يتغير التنفيذ.
-- ─────────────────────────────────────────────────────────────
--
-- التسجيل: `user_id` يشير إلى auth.users لأن المتعلم عضو مجتمع لا موظف
-- إدارة. و`granted_by` يشير إلى profiles لأن المانح موظف. الفرق مقصود.
begin;

-- ─────────────────────────── الوحدات ───────────────────────────
create table public.course_modules (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  title text not null check (length(btrim(title)) between 1 and 200),
  summary text not null default '',
  -- مسودة افتراضًا: وحدة تُنشأ فارغة ثم تُملأ دروسًا. لو بدأت منشورة لظهر
  -- للزائر عنوان بلا محتوى في اللحظة بين الإنشاء والتعبئة، وكل خطأ نشر
  -- يصير تسريبًا افتراضيًا. الافتراض الآمن أن الجديد لا يُعرض.
  published boolean not null default false,
  sort_order integer not null default 0 check (sort_order between 0 and 9999),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_course_modules_course on public.course_modules (course_id, sort_order);

-- ─────────────────────────── الدروس ────────────────────────────
create table public.course_lessons (
  id uuid primary key default gen_random_uuid(),
  module_id uuid not null references public.course_modules(id) on delete cascade,
  title text not null check (length(btrim(title)) between 1 and 200),
  description text not null default '',
  -- نوع الدرس: المرحلة الأولى فيديو فقط، والعمود موجود كي لا يفرض قيدُ
  -- الفيديو نفسَه على دروس نصية أو ملفات لاحقًا.
  lesson_type text not null default 'video' check (lesson_type in ('video', 'text')),
  -- معرّف الفيديو لدى Bunny Stream — GUID بصيغة UUID. لا يُسلَّم للمتصفح
  -- بحال؛ الخادم وحده يوقّع به رابط تشغيل قصير الأجل بعد التحقق من الوصول.
  video_id text not null default ''
    check (video_id = '' or video_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'),
  duration_seconds integer not null default 0 check (duration_seconds between 0 and 86400),
  -- «لا يحتاج تسجيلًا» — وليست تجاوزًا لحالة المسودة. النشر يبقى بوابة.
  free_preview boolean not null default false,
  published boolean not null default false,
  sort_order integer not null default 0 check (sort_order between 0 and 9999),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- درس فيديو منشور بلا معرّف يعرض على المتدرب إطارًا فارغًا. القيد مشروط
  -- بالنوع فلا يمنع درسًا نصيًا من النشر بلا فيديو.
  constraint course_lessons_published_video_required
    check (not published or lesson_type <> 'video' or video_id <> '')
);
create index idx_course_lessons_module on public.course_lessons (module_id, sort_order);

-- ────────────────────────── التسجيل ────────────────────────────
create table public.course_enrollments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  -- restrict لا cascade: صف التسجيل سجلٌّ تاريخي لمن وصله المحتوى، ويصير
  -- سجلًا ماليًا مع الشراء. حذف دورة يجب أن يُرفض ما دامت لها تسجيلات، لا
  -- أن يمحوها صامتًا. الإدارة تُلغي النشر بدل الحذف.
  course_id uuid not null references public.courses(id) on delete restrict,
  source text not null default 'manual' check (source in ('manual', 'purchase')),
  -- الحالة هي مصدر الحقيقة للوصول، لا مجرد وجود الصف. الاسترداد والإلغاء
  -- يغيّران الحالة ويُبقيان السجل — الحذف يمحو الدليل.
  status text not null default 'active'
    check (status in ('pending', 'active', 'cancelled', 'expired', 'refunded')),
  granted_by uuid references public.profiles(id) on delete set null,
  granted_at timestamptz not null default now(),
  -- فارغ = وصول دائم. الشراء مرة واحدة، فهذا هو المعتاد.
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, course_id)
);
create index idx_course_enrollments_user on public.course_enrollments (user_id);
create index idx_course_enrollments_course_status on public.course_enrollments (course_id, status);

create trigger trg_course_modules_updated_at before update on public.course_modules
  for each row execute function public.set_updated_at();
create trigger trg_course_lessons_updated_at before update on public.course_lessons
  for each row execute function public.set_updated_at();
create trigger trg_course_enrollments_updated_at before update on public.course_enrollments
  for each row execute function public.set_updated_at();

-- ──────────────────────────── RLS ──────────────────────────────
alter table public.course_modules enable row level security;
alter table public.course_lessons enable row level security;
alter table public.course_enrollments enable row level security;

revoke all on public.course_modules, public.course_lessons, public.course_enrollments
  from public, anon, authenticated;

-- وحدة منشورة في دورة منشورة: هي فهرس المحتوى في صفحة الدورة.
create policy public_course_modules_select
on public.course_modules
for select
to anon, authenticated
using (
  published
  and exists (
    select 1 from public.courses as parent
    where parent.id = course_id
      and parent.publish_status = 'published'::public.course_publish_status
  )
);
grant select (id, course_id, title, summary, published, sort_order, created_at, updated_at)
  on table public.course_modules to anon, authenticated;

-- الدرس: منشور، في وحدة منشورة، في دورة منشورة. الثلاثة معًا.
create policy public_course_lessons_select
on public.course_lessons
for select
to anon, authenticated
using (
  published
  and exists (
    select 1
    from public.course_modules as parent
    join public.courses as course on course.id = parent.course_id
    where parent.id = module_id
      and parent.published
      and course.publish_status = 'published'::public.course_publish_status
  )
);
-- منح بالعمود عمدًا: كل شيء إلا `video_id`. لا صيغة `grant select on table`
-- هنا — تلك تمنح كل الأعمدة الحاضرة والمستقبلية.
grant select (
  id, module_id, title, description, lesson_type, duration_seconds,
  free_preview, published, sort_order, created_at, updated_at
) on table public.course_lessons to anon, authenticated;

-- العضو يرى تسجيلاته وحدها، وبالأعمدة التي تخصّه — لا هوية من منحه.
create policy own_course_enrollments_select
on public.course_enrollments
for select
to authenticated
using (user_id = (select auth.uid()));
grant select (id, user_id, course_id, source, status, granted_at, expires_at, created_at, updated_at)
  on table public.course_enrollments to authenticated;

-- الكتابة كلها لعميل الخدمة خلف بوابة صلاحيات في Server Action.
grant select, insert, update, delete
  on public.course_modules, public.course_lessons, public.course_enrollments
  to service_role;

-- ───────────────── جسر إلى auth.users للإدارة ──────────────────
-- منح الوصول يحتاج معرّف المستخدم من بريده، وعرض المسجّلين يحتاج العكس.
-- وجدول `auth.users` غير مكشوف عبر PostgREST، فالبديل كان تنزيل صفحة من
-- كل المستخدمين إلى الخادم والبحث فيها — لا يتوسّع ويحمّل ما لا يلزم.
--
-- دالتان تبحثان بالفهرس. SECURITY DEFINER لازمة للوصول إلى schema المصادقة،
-- وحدودها ضيقة: search_path مثبّت، والإرجاع معرّف وبريد فقط، وEXECUTE
-- لـservice_role وحده — لا anon ولا authenticated يملك استدعاءها أصلًا،
-- فلا يوجد سطح لتعداد المستخدمين من المتصفح.
create or replace function public.admin_user_id_by_email(p_email text)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select id from auth.users where lower(email) = lower(btrim(p_email)) limit 1;
$$;

create or replace function public.admin_emails_for_users(p_ids uuid[])
returns table (user_id uuid, email text)
language sql
stable
security definer
set search_path = ''
as $$
  select u.id, u.email::text from auth.users as u where u.id = any(p_ids);
$$;

-- في schema `public` لأن PostgREST لا ينادي إلا ما فيه — والحماية بالمنح لا
-- بالمكان: EXECUTE مسحوبة من الجميع وممنوحة لـservice_role وحده، فنداء من
-- المتصفح بمفتاح anon يُرفض قبل أن يصل جسم الدالة.
revoke all on function public.admin_user_id_by_email(text) from public, anon, authenticated;
revoke all on function public.admin_emails_for_users(uuid[]) from public, anon, authenticated;
grant execute on function public.admin_user_id_by_email(text) to service_role;
grant execute on function public.admin_emails_for_users(uuid[]) to service_role;

commit;
