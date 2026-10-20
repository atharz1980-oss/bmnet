-- ═══════════════════════════════════════════════════════════════════
-- Course WhatsApp Groups — روابط مجموعات واتساب للدورات
--
-- جدول إضافي يربط الدورة برابط مجموعة واتساب المخصصة لها.
-- يُدار من لوحة التحكم من قبل المشرفين المخولين (courses.edit).
-- ولا يُعرض الرابط إلا للمشتركين الذين تم التحقق من سدادهم بنجاح.
--
-- تنبيه: هذا الملف مُعد للمراجعة فقط — لا يُطبَّق على قاعدة الإنتاج تلقائياً.
-- ═══════════════════════════════════════════════════════════════════

begin;

create table if not exists public.course_whatsapp_groups (
  course_id uuid primary key references public.courses(id) on delete cascade,
  whatsapp_url text not null check (
    whatsapp_url ~* '^https:\/\/(chat\.whatsapp\.com|wa\.me)\/[a-zA-Z0-9_\-\.\?=&]+$'
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- مشغّل تحديث updated_at تلقائياً
create or replace function public.touch_course_whatsapp_groups_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_course_whatsapp_groups_updated_at on public.course_whatsapp_groups;
create trigger trg_course_whatsapp_groups_updated_at
  before update on public.course_whatsapp_groups
  for each row execute function public.touch_course_whatsapp_groups_updated_at();

-- تفعيل أمان مستوى الصفوف (RLS)
alter table public.course_whatsapp_groups enable row level security;

-- صلاحيات الدور: service_role كامل الصلاحيات
grant select, insert, update, delete on public.course_whatsapp_groups to service_role;

-- سياسة القراءة للمستخدم المسجل والمشترك في الدورة بصورة نشطة فقط
drop policy if exists "course_whatsapp_groups_enrolled_read" on public.course_whatsapp_groups;
create policy "course_whatsapp_groups_enrolled_read"
  on public.course_whatsapp_groups
  for select
  to authenticated
  using (
    exists (
      select 1 from public.course_enrollments e
      where e.course_id = course_whatsapp_groups.course_id
        and e.user_id = auth.uid()
        and e.status = 'active'
    )
  );

comment on table public.course_whatsapp_groups is 'روابط مجموعات واتساب المخصصة للدورات والورش';
comment on column public.course_whatsapp_groups.whatsapp_url is 'رابط دعوة مجموعة واتساب ويبدأ بـ https://chat.whatsapp.com/ أو https://wa.me/';

commit;
