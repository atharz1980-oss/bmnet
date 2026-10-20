-- Bayt Almosawer — قيمة enum الوحدة 'equipment' (2026-10-21)
-- ===========================================================
-- منفصلة عن ملف البذور 20261021090200_equipment_permissions_seed.sql عمدًا:
-- `alter type … add value` لا تُستعمل داخل نفس الـtransaction الذي أضافها
-- (PostgreSQL SQLSTATE 55P04) — نفس قاعدة ملف
-- 20261018090100_studio_spaces_admin_module.sql.
-- يرافق ملف الجداول 20261021090000_equipment_rental.sql.

-- قيمة الوحدة الجديدة في enum الوحدات الحالي (لا دور جديد — القرار المعماري).
alter type public.admin_module add value if not exists 'equipment' after 'spaces';
