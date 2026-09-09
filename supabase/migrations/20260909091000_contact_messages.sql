-- Bayt Almosawer — Launch Audit Fix #2 (2026-09-09)
-- ============================================================
-- جدول رسائل التواصل العام: نموذج «تواصل معنا» كان واجهة بلا Backend
-- (يعرض نجاحًا وهميًا) — هذه المهمة تمنع وجود Form كذلك (قاعدة المراجعة).
-- الزائر يُدرج فقط (RLS)؛ والقراءة للإدارة عبر لوحة Supabase أو الخدمة.
-- لا يُضاف أي Module جديد للوحة (قرار نطاق المراجعة).

create table if not exists public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 1 and 120),
  phone text not null check (char_length(phone) between 9 and 32),
  email text not null check (char_length(email) between 5 and 160),
  message text not null check (char_length(btrim(message)) between 10 and 2000),
  status text not null default 'new' check (status in ('new', 'read', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- فهرس لعرض الأحدث أولًا في أي قائمة مستقبلية
create index if not exists idx_contact_messages_created_at
  on public.contact_messages (created_at desc);

alter table public.contact_messages enable row level security;

revoke all on public.contact_messages from anon, authenticated;

-- الزائر: إدراج فقط — لا قراءة ولا تعديل ولا حذف
create policy "anon_can_insert_contact_messages"
  on public.contact_messages
  for insert to anon
  with check (
    char_length(btrim(name)) between 1 and 120
    and char_length(phone) between 9 and 32
    and char_length(email) between 5 and 160
    and char_length(btrim(message)) between 10 and 2000
  );

-- الإدارة المصادقة: قراءة وتحديث الحالة وفق صلاحية وحدة الطلبات
create policy "staff_read_contact_messages"
  on public.contact_messages
  for select to authenticated
  using (private.has_permission('corporate-requests', 'view'));

create policy "staff_update_contact_messages"
  on public.contact_messages
  for update to authenticated
  using (private.has_permission('corporate-requests', 'edit'))
  with check (private.has_permission('corporate-requests', 'edit'));

-- نفس محفز updated_at المستخدم في بقية الجداول
create trigger trg_contact_messages_updated_at
  before update on public.contact_messages
  for each row execute function public.set_updated_at();
