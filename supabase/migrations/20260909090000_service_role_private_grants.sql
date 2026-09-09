-- Bayt Almosawer — Launch Audit Fix #1 (2026-09-09)
-- ============================================================
-- المشكلة: كل UPDATE على courses / learning_paths / blog_posts / legal_pages
-- يفشل عبر عميل الخدمة (service_role) بخطأ 42501 «permission denied for schema
-- private» لأن المحفزات publish_enforcement (CP-C) تعيش في مخطط private:
--   - سُحب USAGE على المخطط من public/anon ولم يُمنح إلا لـ authenticated.
--   - سُحب EXECUTE على دوال المحفزات من public (الشامل) أيضًا.
-- كل كتابات الإدارة (CP-G) تمر عبر عميل الخدمة — إذًا تعديل/نشر أي محتوى
-- من هذه الأنواع الأربعة كان مستحيلًا في الإنتاج.
--
-- الإصلاح: منح service_role (خادم التطبيق فقط — المفتاح سرّي) ما يلزم
-- لتنفيذ المحفزات. منطق الحماية لا يتغير:
--   - auth.uid() = NULL عبر الخدمة → تخطي فحص النشر (مقصود — البوابة
--     الحقيقية requirePermission على مستوى Server Actions).
--   - authenticated يبقى مقيّدًا بـ has_permission كما هو.
--   - anon لا يملك أي وصول للمخطط كما هو.

grant usage on schema private to service_role;

grant execute on function private.enforce_publish_transition() to service_role;
grant execute on function private.enforce_role_permission_integrity() to service_role;
grant execute on function private.protect_system_roles() to service_role;
grant execute on function private.protect_profiles() to service_role;
