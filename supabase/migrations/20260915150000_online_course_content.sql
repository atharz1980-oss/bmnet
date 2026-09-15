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
--  1. RLS: الزائر لا يرى إلا محتوى دورة منشورة ودرسًا منشورًا.
--  2. منح على مستوى العمود: `video_id` (معرّف الفيديو لدى Bunny) **غير
--     ممنوح** لـanon ولا authenticated إطلاقًا. حتى لو انفتحت سياسة يومًا،
--     لا يستطيع المتصفح قراءة العمود أصلًا. هذا هو الفارق بين «مخفي» و
--     «ممنوع».
--  3. لا كتابة من المتصفح البتة: الكتابة لـservice_role وحده، خلف
--     requirePermission('courses', …) في Server Action.
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
  -- معرّف الفيديو لدى Bunny Stream. لا يُسلَّم للمتصفح بحال؛ الخادم وحده
  -- يوقّع به رابط تشغيل قصير الأجل بعد التحقق من الوصول.
  video_id text not null default '' check (video_id = '' or video_id ~ '^[0-9a-fA-F-]{8,64}$'),
  duration_seconds integer not null default 0 check (duration_seconds between 0 and 86400),
  -- درس معاينة: يُفتح لأي زائر، وهو باب التسويق للدورة.
  free_preview boolean not null default false,
  published boolean not null default false,
  sort_order integer not null default 0 check (sort_order between 0 and 9999),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_course_lessons_module on public.course_lessons (module_id, sort_order);

-- ────────────────────────── التسجيل ────────────────────────────
create table public.course_enrollments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  source text not null default 'manual' check (source in ('manual', 'purchase')),
  granted_by uuid references public.profiles(id) on delete set null,
  granted_at timestamptz not null default now(),
  -- فارغ = وصول دائم. الشراء مرة واحدة، فهذا هو المعتاد.
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, course_id)
);
create index idx_course_enrollments_user on public.course_enrollments (user_id);
create index idx_course_enrollments_course on public.course_enrollments (course_id);

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

-- وحدات دورة منشورة تُقرأ للعامة: هي فهرس المحتوى في صفحة الدورة.
create policy public_course_modules_select
on public.course_modules
for select
to anon, authenticated
using (
  exists (
    select 1 from public.courses as parent
    where parent.id = course_id
      and parent.publish_status = 'published'::public.course_publish_status
  )
);
grant select on table public.course_modules to anon, authenticated;

-- الدروس كذلك — لكن المنشور منها فقط.
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
      and course.publish_status = 'published'::public.course_publish_status
  )
);
-- منح بالعمود عمدًا: كل شيء إلا `video_id`. لا صيغة `grant select on table`
-- هنا — تلك تمنح كل الأعمدة الحاضرة والمستقبلية.
grant select (
  id, module_id, title, description, duration_seconds,
  free_preview, published, sort_order, created_at, updated_at
) on table public.course_lessons to anon, authenticated;

-- العضو يرى تسجيلاته وحدها.
create policy own_course_enrollments_select
on public.course_enrollments
for select
to authenticated
using (user_id = (select auth.uid()));
grant select on table public.course_enrollments to authenticated;

-- الكتابة كلها لعميل الخدمة خلف بوابة صلاحيات في Server Action.
grant select, insert, update, delete
  on public.course_modules, public.course_lessons, public.course_enrollments
  to service_role;

commit;
