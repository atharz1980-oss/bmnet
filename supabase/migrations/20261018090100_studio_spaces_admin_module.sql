-- Bayt Almosawer — وحدة الإدارة 'spaces' + بذور الصلاحيات (2026-10-18)
-- ============================================================
-- ملف مستقل بلا transaction: قيمة enum الجديدة لا تُستخدم داخل نفس
-- الـtransaction — قيد PG (كما في ملف وحدة community).
-- يرافق ملف 20261018090000_studio_spaces.sql (الجداول).

-- 1) قيمة الوحدة الجديدة في enum الوحدات الحالي (لا دور جديد — القرار المعماري)
alter type public.admin_module add value if not exists 'spaces' after 'paths';

-- 2) صفوف الصلاحيات القياسية لوحدة المساحات
insert into public.permissions (module, action)
values
  ('spaces', 'view'),
  ('spaces', 'create'),
  ('spaces', 'edit'),
  ('spaces', 'delete'),
  ('spaces', 'publish')
on conflict (module, action) do nothing;

-- 3) إسنادها للأدوار النظامية (owner وadmin فقط — باقي الأدوار بلا صلاحيات
--    مساحات افتراضيًا، وتُمنح من لوحة الأدوار عند الحاجة)
insert into public.role_permissions (role_id, module, action)
select r.id, p.module, p.action
from public.roles r
join public.permissions p on p.module = 'spaces'::public.admin_module
where r.key in ('owner', 'admin')
on conflict (role_id, module, action) do nothing;
