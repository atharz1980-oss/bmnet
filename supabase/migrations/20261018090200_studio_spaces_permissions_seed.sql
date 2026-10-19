-- Bayt Almosawer — بذور صلاحيات وحدة 'spaces' (2026-10-18)
-- ========================================================
-- يتابع 20261018090100 (قيمة enum) بترحيل منفصل: يجب أن تُثبَّت قيمة
-- الـenum (commit) قبل استخدامها — قيد PostgreSQL 55P04.
-- بلا transaction معلن: الـCLI يطبق كل ملف في معاملة واحدة.

-- 1) صفوف الصلاحيات القياسية لوحدة المساحات
insert into public.permissions (module, action)
values
  ('spaces', 'view'),
  ('spaces', 'create'),
  ('spaces', 'edit'),
  ('spaces', 'delete'),
  ('spaces', 'publish')
on conflict (module, action) do nothing;

-- 2) إسنادها للأدوار النظامية (owner وadmin فقط — باقي الأدوار بلا صلاحيات
--    مساحات افتراضيًا، وتُمنح من لوحة الأدوار عند الحاجة)
insert into public.role_permissions (role_id, module, action)
select r.id, p.module, p.action
from public.roles r
join public.permissions p on p.module = 'spaces'::public.admin_module
where r.key in ('owner', 'admin')
on conflict (role_id, module, action) do nothing;
