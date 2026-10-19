-- Bayt Almosawer — قيمة enum 'spaces' (2026-10-18)
-- ==============================================
-- منفصلة عن ملف البذور 20261018090200_studio_spaces_permissions_seed.sql
-- عمدًا: `alter type … add value` لا تُستعمل داخل نفس الـtransaction الذي
-- أضافها (PostgreSQL SQLSTATE 55P04) — نفس قاعدة ملف
-- 20260918090000_session_status_cancelled.sql.
-- يرافق ملف الجداول 20261018090000_studio_spaces.sql.

-- قيمة الوحدة الجديدة في enum الوحدات الحالي (لا دور جديد — القرار المعماري)
alter type public.admin_module add value if not exists 'spaces' after 'paths';
