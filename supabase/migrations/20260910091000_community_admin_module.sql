-- Bayt Almosawer — Community CP-H V1 (2026-09-10)
-- ============================================================
-- ملف 2/3: وحدة الإدارة الجديدة 'community' + بذور الصلاحيات
-- (ملف مستقل: قيمة enum الجديدة لا تُستخدم داخل نفس الـtransaction — قيد PG)

-- 1) قيمة الوحدة الجديدة في enum الوحدات الحالي (لا دور جديد — القرار المعماري)
alter type public.admin_module add value if not exists 'community' after 'roles';

-- 2) صفوف الصلاحيات القياسية لوحدة المجتمع
insert into public.permissions (module, action)
values
  ('community', 'view'),
  ('community', 'edit'),
  ('community', 'delete')
on conflict (module, action) do nothing;

-- 3) إسنادها للأدوار النظامية (owner وadmin فقط — باقي الأدوار بلا صلاحيات مجتمع افتراضيًا)
insert into public.role_permissions (role_id, module, action)
select r.id, p.module, p.action
from public.roles r
join public.permissions p on p.module = 'community'::public.admin_module
where r.key in ('owner', 'admin')
on conflict (role_id, module, action) do nothing;
