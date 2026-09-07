-- بيت المصور — deterministic, idempotent database seed through CP-E
-- Generated from src/data/admin/seed.ts, src/data/admin/permissions.ts, and the matching public image files.
-- UUIDs are SHA-256(namespace + logical key), normalized to RFC 4122 version/variant bits.
-- profiles and corporate request tables remain empty until Auth/operational data integration.
-- media mirrors the 14 Mock entries backed by uploaded bm-media objects; byte sizes and dimensions come from the real files.
-- Upserts update only changed business columns, preserving updated_at on a no-op rerun.

begin;

insert into public.roles (id, key, name, description, kind, created_at, updated_at) values
  ('c2392f2a-80ca-5927-84d5-3abde7efd87d', 'owner', 'المالك', 'صلاحية كاملة على كل وحدات لوحة التحكم — دور نظامي مقفول لا يُعدَّل ولا يُحذف', 'system', '2026-08-31T00:00:00.000Z', '2026-08-31T00:00:00.000Z'),
  ('f89ebb75-fed1-54cb-8fdc-70f4cce1e102', 'admin', 'مسؤول النظام', 'إدارة شاملة لكل الوحدات عدا صلاحيات المالك الحساسة: إدارة الأدوار نفسها وإعدادات الدفع', 'system', '2026-08-31T00:00:00.000Z', '2026-08-31T00:00:00.000Z'),
  ('e0944299-d2f5-5b3a-98a1-2df7335b163c', 'content-editor', 'محرر محتوى', 'الصفحة الرئيسية والمدونة والتقييمات ومكتبة الوسائط', 'system', '2026-08-31T00:00:00.000Z', '2026-08-31T00:00:00.000Z'),
  ('190d39e6-3c1f-5432-8576-5111df1ea394', 'course-manager', 'مدير الدورات', 'الدورات ومواعيدها والمدربون والمسارات التعليمية', 'system', '2026-08-31T00:00:00.000Z', '2026-08-31T00:00:00.000Z'),
  ('8c80a4c1-490f-5e9d-bd09-272e1c90aba9', 'finance', 'المالية', 'متابعة إعدادات الدفع وعرض بيانات طلبات الشركات ذات الصلة المالية', 'system', '2026-08-31T00:00:00.000Z', '2026-08-31T00:00:00.000Z')
on conflict (key) do update set id = excluded.id, name = excluded.name, description = excluded.description, kind = excluded.kind
where (roles.id, roles.name, roles.description, roles.kind) is distinct from (excluded.id, excluded.name, excluded.description, excluded.kind);

insert into public.permissions (module, action) values
  ('dashboard', 'view'),
  ('courses', 'view'),
  ('courses', 'create'),
  ('courses', 'edit'),
  ('courses', 'delete'),
  ('courses', 'publish'),
  ('sessions', 'view'),
  ('sessions', 'create'),
  ('sessions', 'edit'),
  ('sessions', 'delete'),
  ('trainers', 'view'),
  ('trainers', 'create'),
  ('trainers', 'edit'),
  ('trainers', 'delete'),
  ('paths', 'view'),
  ('paths', 'create'),
  ('paths', 'edit'),
  ('paths', 'delete'),
  ('paths', 'publish'),
  ('homepage', 'view'),
  ('homepage', 'edit'),
  ('testimonials', 'view'),
  ('testimonials', 'create'),
  ('testimonials', 'edit'),
  ('testimonials', 'delete'),
  ('testimonials', 'publish'),
  ('blog', 'view'),
  ('blog', 'create'),
  ('blog', 'edit'),
  ('blog', 'delete'),
  ('blog', 'publish'),
  ('corporate-requests', 'view'),
  ('corporate-requests', 'edit'),
  ('corporate-requests', 'manage'),
  ('media', 'view'),
  ('media', 'create'),
  ('media', 'edit'),
  ('media', 'delete'),
  ('legal', 'view'),
  ('legal', 'edit'),
  ('legal', 'publish'),
  ('settings', 'view'),
  ('settings', 'edit'),
  ('payments', 'view'),
  ('payments', 'manage'),
  ('users', 'view'),
  ('users', 'create'),
  ('users', 'edit'),
  ('users', 'delete'),
  ('roles', 'view'),
  ('roles', 'create'),
  ('roles', 'edit'),
  ('roles', 'delete')
on conflict (module, action) do nothing;

insert into public.role_permissions (role_id, module, action) values
  ('c2392f2a-80ca-5927-84d5-3abde7efd87d', 'dashboard', 'view'),
  ('c2392f2a-80ca-5927-84d5-3abde7efd87d', 'courses', 'view'),
  ('c2392f2a-80ca-5927-84d5-3abde7efd87d', 'courses', 'create'),
  ('c2392f2a-80ca-5927-84d5-3abde7efd87d', 'courses', 'edit'),
  ('c2392f2a-80ca-5927-84d5-3abde7efd87d', 'courses', 'delete'),
  ('c2392f2a-80ca-5927-84d5-3abde7efd87d', 'courses', 'publish'),
  ('c2392f2a-80ca-5927-84d5-3abde7efd87d', 'sessions', 'view'),
  ('c2392f2a-80ca-5927-84d5-3abde7efd87d', 'sessions', 'create'),
  ('c2392f2a-80ca-5927-84d5-3abde7efd87d', 'sessions', 'edit'),
  ('c2392f2a-80ca-5927-84d5-3abde7efd87d', 'sessions', 'delete'),
  ('c2392f2a-80ca-5927-84d5-3abde7efd87d', 'trainers', 'view'),
  ('c2392f2a-80ca-5927-84d5-3abde7efd87d', 'trainers', 'create'),
  ('c2392f2a-80ca-5927-84d5-3abde7efd87d', 'trainers', 'edit'),
  ('c2392f2a-80ca-5927-84d5-3abde7efd87d', 'trainers', 'delete'),
  ('c2392f2a-80ca-5927-84d5-3abde7efd87d', 'paths', 'view'),
  ('c2392f2a-80ca-5927-84d5-3abde7efd87d', 'paths', 'create'),
  ('c2392f2a-80ca-5927-84d5-3abde7efd87d', 'paths', 'edit'),
  ('c2392f2a-80ca-5927-84d5-3abde7efd87d', 'paths', 'delete'),
  ('c2392f2a-80ca-5927-84d5-3abde7efd87d', 'paths', 'publish'),
  ('c2392f2a-80ca-5927-84d5-3abde7efd87d', 'homepage', 'view'),
  ('c2392f2a-80ca-5927-84d5-3abde7efd87d', 'homepage', 'edit'),
  ('c2392f2a-80ca-5927-84d5-3abde7efd87d', 'testimonials', 'view'),
  ('c2392f2a-80ca-5927-84d5-3abde7efd87d', 'testimonials', 'create'),
  ('c2392f2a-80ca-5927-84d5-3abde7efd87d', 'testimonials', 'edit'),
  ('c2392f2a-80ca-5927-84d5-3abde7efd87d', 'testimonials', 'delete'),
  ('c2392f2a-80ca-5927-84d5-3abde7efd87d', 'testimonials', 'publish'),
  ('c2392f2a-80ca-5927-84d5-3abde7efd87d', 'blog', 'view'),
  ('c2392f2a-80ca-5927-84d5-3abde7efd87d', 'blog', 'create'),
  ('c2392f2a-80ca-5927-84d5-3abde7efd87d', 'blog', 'edit'),
  ('c2392f2a-80ca-5927-84d5-3abde7efd87d', 'blog', 'delete'),
  ('c2392f2a-80ca-5927-84d5-3abde7efd87d', 'blog', 'publish'),
  ('c2392f2a-80ca-5927-84d5-3abde7efd87d', 'corporate-requests', 'view'),
  ('c2392f2a-80ca-5927-84d5-3abde7efd87d', 'corporate-requests', 'edit'),
  ('c2392f2a-80ca-5927-84d5-3abde7efd87d', 'corporate-requests', 'manage'),
  ('c2392f2a-80ca-5927-84d5-3abde7efd87d', 'media', 'view'),
  ('c2392f2a-80ca-5927-84d5-3abde7efd87d', 'media', 'create'),
  ('c2392f2a-80ca-5927-84d5-3abde7efd87d', 'media', 'edit'),
  ('c2392f2a-80ca-5927-84d5-3abde7efd87d', 'media', 'delete'),
  ('c2392f2a-80ca-5927-84d5-3abde7efd87d', 'legal', 'view'),
  ('c2392f2a-80ca-5927-84d5-3abde7efd87d', 'legal', 'edit'),
  ('c2392f2a-80ca-5927-84d5-3abde7efd87d', 'legal', 'publish'),
  ('c2392f2a-80ca-5927-84d5-3abde7efd87d', 'settings', 'view'),
  ('c2392f2a-80ca-5927-84d5-3abde7efd87d', 'settings', 'edit'),
  ('c2392f2a-80ca-5927-84d5-3abde7efd87d', 'payments', 'view'),
  ('c2392f2a-80ca-5927-84d5-3abde7efd87d', 'payments', 'manage'),
  ('c2392f2a-80ca-5927-84d5-3abde7efd87d', 'users', 'view'),
  ('c2392f2a-80ca-5927-84d5-3abde7efd87d', 'users', 'create'),
  ('c2392f2a-80ca-5927-84d5-3abde7efd87d', 'users', 'edit'),
  ('c2392f2a-80ca-5927-84d5-3abde7efd87d', 'users', 'delete'),
  ('c2392f2a-80ca-5927-84d5-3abde7efd87d', 'roles', 'view'),
  ('c2392f2a-80ca-5927-84d5-3abde7efd87d', 'roles', 'create'),
  ('c2392f2a-80ca-5927-84d5-3abde7efd87d', 'roles', 'edit'),
  ('c2392f2a-80ca-5927-84d5-3abde7efd87d', 'roles', 'delete'),
  ('f89ebb75-fed1-54cb-8fdc-70f4cce1e102', 'dashboard', 'view'),
  ('f89ebb75-fed1-54cb-8fdc-70f4cce1e102', 'courses', 'view'),
  ('f89ebb75-fed1-54cb-8fdc-70f4cce1e102', 'courses', 'create'),
  ('f89ebb75-fed1-54cb-8fdc-70f4cce1e102', 'courses', 'edit'),
  ('f89ebb75-fed1-54cb-8fdc-70f4cce1e102', 'courses', 'delete'),
  ('f89ebb75-fed1-54cb-8fdc-70f4cce1e102', 'courses', 'publish'),
  ('f89ebb75-fed1-54cb-8fdc-70f4cce1e102', 'sessions', 'view'),
  ('f89ebb75-fed1-54cb-8fdc-70f4cce1e102', 'sessions', 'create'),
  ('f89ebb75-fed1-54cb-8fdc-70f4cce1e102', 'sessions', 'edit'),
  ('f89ebb75-fed1-54cb-8fdc-70f4cce1e102', 'sessions', 'delete'),
  ('f89ebb75-fed1-54cb-8fdc-70f4cce1e102', 'trainers', 'view'),
  ('f89ebb75-fed1-54cb-8fdc-70f4cce1e102', 'trainers', 'create'),
  ('f89ebb75-fed1-54cb-8fdc-70f4cce1e102', 'trainers', 'edit'),
  ('f89ebb75-fed1-54cb-8fdc-70f4cce1e102', 'trainers', 'delete'),
  ('f89ebb75-fed1-54cb-8fdc-70f4cce1e102', 'paths', 'view'),
  ('f89ebb75-fed1-54cb-8fdc-70f4cce1e102', 'paths', 'create'),
  ('f89ebb75-fed1-54cb-8fdc-70f4cce1e102', 'paths', 'edit'),
  ('f89ebb75-fed1-54cb-8fdc-70f4cce1e102', 'paths', 'delete'),
  ('f89ebb75-fed1-54cb-8fdc-70f4cce1e102', 'paths', 'publish'),
  ('f89ebb75-fed1-54cb-8fdc-70f4cce1e102', 'homepage', 'view'),
  ('f89ebb75-fed1-54cb-8fdc-70f4cce1e102', 'homepage', 'edit'),
  ('f89ebb75-fed1-54cb-8fdc-70f4cce1e102', 'testimonials', 'view'),
  ('f89ebb75-fed1-54cb-8fdc-70f4cce1e102', 'testimonials', 'create'),
  ('f89ebb75-fed1-54cb-8fdc-70f4cce1e102', 'testimonials', 'edit'),
  ('f89ebb75-fed1-54cb-8fdc-70f4cce1e102', 'testimonials', 'delete'),
  ('f89ebb75-fed1-54cb-8fdc-70f4cce1e102', 'testimonials', 'publish'),
  ('f89ebb75-fed1-54cb-8fdc-70f4cce1e102', 'blog', 'view'),
  ('f89ebb75-fed1-54cb-8fdc-70f4cce1e102', 'blog', 'create'),
  ('f89ebb75-fed1-54cb-8fdc-70f4cce1e102', 'blog', 'edit'),
  ('f89ebb75-fed1-54cb-8fdc-70f4cce1e102', 'blog', 'delete'),
  ('f89ebb75-fed1-54cb-8fdc-70f4cce1e102', 'blog', 'publish'),
  ('f89ebb75-fed1-54cb-8fdc-70f4cce1e102', 'corporate-requests', 'view'),
  ('f89ebb75-fed1-54cb-8fdc-70f4cce1e102', 'corporate-requests', 'edit'),
  ('f89ebb75-fed1-54cb-8fdc-70f4cce1e102', 'corporate-requests', 'manage'),
  ('f89ebb75-fed1-54cb-8fdc-70f4cce1e102', 'media', 'view'),
  ('f89ebb75-fed1-54cb-8fdc-70f4cce1e102', 'media', 'create'),
  ('f89ebb75-fed1-54cb-8fdc-70f4cce1e102', 'media', 'edit'),
  ('f89ebb75-fed1-54cb-8fdc-70f4cce1e102', 'media', 'delete'),
  ('f89ebb75-fed1-54cb-8fdc-70f4cce1e102', 'legal', 'view'),
  ('f89ebb75-fed1-54cb-8fdc-70f4cce1e102', 'legal', 'edit'),
  ('f89ebb75-fed1-54cb-8fdc-70f4cce1e102', 'legal', 'publish'),
  ('f89ebb75-fed1-54cb-8fdc-70f4cce1e102', 'settings', 'view'),
  ('f89ebb75-fed1-54cb-8fdc-70f4cce1e102', 'settings', 'edit'),
  ('f89ebb75-fed1-54cb-8fdc-70f4cce1e102', 'payments', 'view'),
  ('f89ebb75-fed1-54cb-8fdc-70f4cce1e102', 'users', 'view'),
  ('f89ebb75-fed1-54cb-8fdc-70f4cce1e102', 'users', 'create'),
  ('f89ebb75-fed1-54cb-8fdc-70f4cce1e102', 'users', 'edit'),
  ('f89ebb75-fed1-54cb-8fdc-70f4cce1e102', 'users', 'delete'),
  ('f89ebb75-fed1-54cb-8fdc-70f4cce1e102', 'roles', 'view'),
  ('e0944299-d2f5-5b3a-98a1-2df7335b163c', 'dashboard', 'view'),
  ('e0944299-d2f5-5b3a-98a1-2df7335b163c', 'homepage', 'view'),
  ('e0944299-d2f5-5b3a-98a1-2df7335b163c', 'homepage', 'edit'),
  ('e0944299-d2f5-5b3a-98a1-2df7335b163c', 'testimonials', 'view'),
  ('e0944299-d2f5-5b3a-98a1-2df7335b163c', 'testimonials', 'create'),
  ('e0944299-d2f5-5b3a-98a1-2df7335b163c', 'testimonials', 'edit'),
  ('e0944299-d2f5-5b3a-98a1-2df7335b163c', 'testimonials', 'delete'),
  ('e0944299-d2f5-5b3a-98a1-2df7335b163c', 'testimonials', 'publish'),
  ('e0944299-d2f5-5b3a-98a1-2df7335b163c', 'blog', 'view'),
  ('e0944299-d2f5-5b3a-98a1-2df7335b163c', 'blog', 'create'),
  ('e0944299-d2f5-5b3a-98a1-2df7335b163c', 'blog', 'edit'),
  ('e0944299-d2f5-5b3a-98a1-2df7335b163c', 'blog', 'delete'),
  ('e0944299-d2f5-5b3a-98a1-2df7335b163c', 'blog', 'publish'),
  ('e0944299-d2f5-5b3a-98a1-2df7335b163c', 'media', 'view'),
  ('e0944299-d2f5-5b3a-98a1-2df7335b163c', 'media', 'create'),
  ('e0944299-d2f5-5b3a-98a1-2df7335b163c', 'media', 'edit'),
  ('e0944299-d2f5-5b3a-98a1-2df7335b163c', 'media', 'delete'),
  ('190d39e6-3c1f-5432-8576-5111df1ea394', 'dashboard', 'view'),
  ('190d39e6-3c1f-5432-8576-5111df1ea394', 'courses', 'view'),
  ('190d39e6-3c1f-5432-8576-5111df1ea394', 'courses', 'create'),
  ('190d39e6-3c1f-5432-8576-5111df1ea394', 'courses', 'edit'),
  ('190d39e6-3c1f-5432-8576-5111df1ea394', 'courses', 'delete'),
  ('190d39e6-3c1f-5432-8576-5111df1ea394', 'courses', 'publish'),
  ('190d39e6-3c1f-5432-8576-5111df1ea394', 'sessions', 'view'),
  ('190d39e6-3c1f-5432-8576-5111df1ea394', 'sessions', 'create'),
  ('190d39e6-3c1f-5432-8576-5111df1ea394', 'sessions', 'edit'),
  ('190d39e6-3c1f-5432-8576-5111df1ea394', 'sessions', 'delete'),
  ('190d39e6-3c1f-5432-8576-5111df1ea394', 'trainers', 'view'),
  ('190d39e6-3c1f-5432-8576-5111df1ea394', 'trainers', 'create'),
  ('190d39e6-3c1f-5432-8576-5111df1ea394', 'trainers', 'edit'),
  ('190d39e6-3c1f-5432-8576-5111df1ea394', 'trainers', 'delete'),
  ('190d39e6-3c1f-5432-8576-5111df1ea394', 'paths', 'view'),
  ('190d39e6-3c1f-5432-8576-5111df1ea394', 'paths', 'create'),
  ('190d39e6-3c1f-5432-8576-5111df1ea394', 'paths', 'edit'),
  ('190d39e6-3c1f-5432-8576-5111df1ea394', 'paths', 'delete'),
  ('190d39e6-3c1f-5432-8576-5111df1ea394', 'paths', 'publish'),
  ('190d39e6-3c1f-5432-8576-5111df1ea394', 'media', 'view'),
  ('8c80a4c1-490f-5e9d-bd09-272e1c90aba9', 'dashboard', 'view'),
  ('8c80a4c1-490f-5e9d-bd09-272e1c90aba9', 'corporate-requests', 'view'),
  ('8c80a4c1-490f-5e9d-bd09-272e1c90aba9', 'payments', 'view'),
  ('8c80a4c1-490f-5e9d-bd09-272e1c90aba9', 'payments', 'manage')
on conflict (role_id, module, action) do nothing;

insert into public.trainers (id, name, image_path, image_alt, title, specialty, short_bio, bio, years_experience, skills, instagram_url, linkedin_url, website_url, status, created_at, updated_at) values
  ('312e1109-fa9a-562e-8663-c8efcf5d558c', 'أحمد الشريف', '', null, 'مصور فوتوغرافي محترف', 'التصوير الفوتوغرافي', 'مصور محترف وخبرة تتجاوز 12 عامًا في تدريب المصورين في جدة.', 'مصور محترف بخبرة تتجاوز 12 عامًا في تصوير المنتجات والبورتريه والإضاءة الاستوديوهية، درّب مئات المتدربين في جدة على الانتقال من الهواية إلى الاحتراف.', 12, array['إضاءة الاستوديو', 'تصوير المنتجات', 'تصوير البورتريه']::text[], 'https://instagram.com/baytalmosawer', null, null, 'active', '2026-08-31T00:00:00.000Z', '2026-08-31T00:00:00.000Z'),
  ('106beee4-a992-5912-a6c3-9cc7eafc793d', 'لينا العتيبي', '', null, 'مصورة بورتريه', 'بورتريه وصناعة المحتوى', 'مصورة بورتريه ومدرّبة صناعة محتوى لأعمال منشورة لعلامات محلية.', 'مصورة بورتريه ومدرّبة صناعة محتوى، تركز في تدريباتها على لغة التواصل مع الموديل وبناء التكوين الواعي، ولها أعمال منشورة لعدد من العلامات المحلية.', 8, array['تصوير البورتريه', 'التصوير بالجوال', 'تحرير الصور']::text[], 'https://instagram.com/baytalmosawer', null, null, 'active', '2026-08-31T00:00:00.000Z', '2026-08-31T00:00:00.000Z'),
  ('d4667ae1-2f49-5d79-80ed-8bb24a04d893', 'خالد الغامدي', '', null, 'مخرج ومونتير', 'الفيديو والمونتاج', 'مخرج ومونتير بخبرة عشر سنوات في الإنتاج المرئي التجاري.', 'مخرج ومونتير بخبرة عشر سنوات في الإنتاج المرئي التجاري، متخصص في اللغة السينمائية وإخراج المشاهد القصيرة وتدريب فرق المحتوى.', 10, array['الإخراج السينمائي', 'المونتاج', 'تصحيح الألوان']::text[], null, null, 'https://baytalmosawer.com', 'active', '2026-08-31T00:00:00.000Z', '2026-08-31T00:00:00.000Z')
on conflict (id) do update set name = excluded.name, image_path = excluded.image_path, image_alt = excluded.image_alt, title = excluded.title, specialty = excluded.specialty, short_bio = excluded.short_bio, bio = excluded.bio, years_experience = excluded.years_experience, skills = excluded.skills, instagram_url = excluded.instagram_url, linkedin_url = excluded.linkedin_url, website_url = excluded.website_url, status = excluded.status
where (trainers.name, trainers.image_path, trainers.image_alt, trainers.title, trainers.specialty, trainers.short_bio, trainers.bio, trainers.years_experience, trainers.skills, trainers.instagram_url, trainers.linkedin_url, trainers.website_url, trainers.status) is distinct from (excluded.name, excluded.image_path, excluded.image_alt, excluded.title, excluded.specialty, excluded.short_bio, excluded.bio, excluded.years_experience, excluded.skills, excluded.instagram_url, excluded.linkedin_url, excluded.website_url, excluded.status);

insert into public.courses (id, slug, name, short_description, description, category, level, language, trainer_id, image_path, image_alt, price, original_price, discount_percent, show_price, is_free, request_quote, duration_days, duration_hours, outcomes, audience, requirements, featured, publish_status, operational_status, seo_title, seo_description, created_at, updated_at) values
  ('699bbf9c-8cb2-5021-8225-cbc1cbb51aa4', 'photography-fundamentals', 'ورشة أساسيات التصوير', 'نقطة البداية الصحيحة لرحلتك في التصوير: افهم الكاميرا وتحكّم بالإضاءة والتكوين بخطوات عملية واضحة.', 'دورة تأسيسية مصممة لمن يبدأ رحلته في عالم التصوير، تشرح المفاهيم الجوهرية للكاميرا بطريقة مبسطة وعملية دون تعقيد تقني زائد.

خلال الأيام الأربعة ستتعامل مباشرة مع كاميرتك، وتنفذ تدريبات قصيرة داخل الاستوديو وخارجه، مع مراجعة أعمالك يومياً من المدرب وملاحظات تطويرية مباشرة.

بنهاية الدورة ستكون قادراً على التصوير بوضع يدوي كامل بثقة، وقراءة الضوء في أي مكان، والتقاط صور متوازنة التكوين تعكس رؤيتك.', 'in-person-individuals', 'beginner', 'ar', '312e1109-fa9a-562e-8663-c8efcf5d558c', '/images/course-fundamentals.jpg', 'كاميرا احترافية على طاولة خلال تدريب أساسيات التصوير', 1000, null, null, true, false, false, 4, 12, array['التصوير بوضع يدوي كامل بثقة ووعي', 'قراءة الإضاءة في أي بيئة تصوير', 'بناء تكوين متوازن وصورة واضحة الرسالة', 'اختيار العدسة والإعدادات المناسبة لكل موقف']::text[], array['من يبدأ من الصفر بلا خبرة سابقة في التصوير', 'أصحاب المتاجر وصنّاع المحتوى الراغبون في تحسين صورهم']::text[], array['كاميرا (أي نوع متاح لديك — ونوفر معدات التدريب داخل المركز)', 'لا توجد متطلبات معرفية مسبقة']::text[], true, 'published', 'registration-open', null, null, '2026-08-01T09:00:00.000Z', '2026-08-01T09:00:00.000Z'),
  ('e13ab532-29c9-5ccb-b646-26f515c596eb', 'studio-lighting', 'الإضاءة الاستوديوهية', 'تعرّف على معدات الاستوديو وتحكّم بأنواع الإضاءة: إضاءة واحدة، إضائتان، وبناء الإضاءة من الصفر.', 'دورة عملية بالكامل داخل الاستوديو، تشرح لغة الضوء: الاتجاه، القسوة، النسبة، والتباين، وكيف تصنع مزاج الصورة بإعدادات بسيطة.

ستتعامل مع Softbox وUmbrella وReflectors وأنظمة الفلاش، وتبني سيناريوهات إضاءة كاملة بيديك أمام الموديل.

مناسبة لمن أتمّ أساسيات التصوير أو يصور فعلياً ويرغب بالانتقال لمستوى الاستوديو.', 'in-person-individuals', 'intermediate', 'ar', '312e1109-fa9a-562e-8663-c8efcf5d558c', '/images/course-lighting.jpg', 'معدات إضاءة استوديو مع سوفت بوكس خلال التدريب', 1500, null, null, true, false, false, 3, 9, array['بناء إضاءة استوديو من الصفر لأي فكرة', 'فهم سلوك الضوء والتحكم بدرجاته', 'التعامل الواثق مع معدات الفلاش والمعدِّلات']::text[], array['من أتمّ أساسيات التصوير أو يمتلك خبرة عملية بسيطة', 'المصورون الراغبون في تطوير تخصص محدد']::text[], array['كاميرا (أي نوع متاح لديك — ونوفر معدات التدريب داخل المركز)', 'لا توجد متطلبات معرفية مسبقة']::text[], true, 'published', 'registration-open', null, null, '2026-08-02T09:00:00.000Z', '2026-08-02T09:00:00.000Z'),
  ('a96da6a0-e29b-56f8-8e18-f96000cbe70a', 'portrait-photography', 'تصوير البورتريه', 'من التوجيه والتواصل مع الشخص إلى الإخراج النهائي: كيف تصنع بورتريه يعكس شخصية صاحبه.', 'دورة تركز على أهم عنصر في بورتريه: الإنسان. تتعلم كيفية التواصل وتوجيه الموديل وكسر الحرج لتحصل على تعبيرات طبيعية.

كما تغطي اختيار الزاوية والعدسة والخلفية، والتعامل مع الإضاءة الطبيعية والاصطناعية، ولمسات التحرير الأساسية بعد التصوير.

تتضمن الدورة جلسات تصوير حية داخل المركز وخارجه مع مراجعة فردية لأعمال كل متدرب.', 'in-person-individuals', 'intermediate', 'ar', '106beee4-a992-5912-a6c3-9cc7eafc793d', '/images/course-portrait.jpg', 'جلسة تصوير بورتريه في استوديو بإضاءة ناعمة', 1500, null, null, true, false, false, 3, 9, array['توجيه الموديل والحصول على تعبيرات طبيعية', 'اختيار الإضاءة والزاوية المناسبة لكل شخص', 'تحرير البورتريه بلمسات احترافية بسيطة']::text[], array['من أتمّ أساسيات التصوير أو يمتلك خبرة عملية بسيطة', 'المصورون الراغبون في تطوير تخصص محدد']::text[], array['كاميرا (أي نوع متاح لديك — ونوفر معدات التدريب داخل المركز)', 'لا توجد متطلبات معرفية مسبقة']::text[], true, 'published', 'registration-open', null, null, '2026-08-03T09:00:00.000Z', '2026-08-03T09:00:00.000Z'),
  ('07015583-2011-51c4-b20c-75e9818877d4', 'product-photography', 'تصوير المنتجات', 'احترف تصوير المنتجات للتجارة الإلكترونية والعلامات: طاولة التصوير، الإضاءة، والتنسيق.', 'دورة موجهة لمن يريد تقديم صور منتجات بمستوى تجاري، سواء لمتجره الخاص أو كخدمة للعلامات التجارية.

تتعلم بناء طاولة تصوير اقتصادية ومهنية، والتحكم بالانعكاسات على الزجاج والمعادن، وتصوير الأطعمة والمشروبات.

تُختتم الدورة بمشروع تصوير منتج فعلي من البداية للنهاية مع ملف تحرير كامل.', 'in-person-individuals', 'intermediate', 'ar', '312e1109-fa9a-562e-8663-c8efcf5d558c', '/images/course-products.jpg', 'طاولة تصوير منتجات مع إضاءة وخلفية بيضاء', 1800, null, null, true, false, false, 4, 12, array['بناء طاولة تصوير منتجات مهنية', 'التعامل مع الأسطح العاكسة والمواد الصعبة', 'تسليم صور جاهزة للاستخدام التجاري']::text[], array['من أتمّ أساسيات التصوير أو يمتلك خبرة عملية بسيطة', 'المصورون الراغبون في تطوير تخصص محدد']::text[], array['كاميرا (أي نوع متاح لديك — ونوفر معدات التدريب داخل المركز)', 'لا توجد متطلبات معرفية مسبقة']::text[], true, 'published', 'registration-open', null, null, '2026-08-04T09:00:00.000Z', '2026-08-04T09:00:00.000Z'),
  ('7f8a2618-70f4-5796-af80-23b6c005281f', 'mobile-photography', 'التصوير الاحترافي بالجوال', 'أفضل كاميرا هي التي معك: أطلق إمكانات كاميرا جوالك في التصوير والمحتوى اليومي.', 'دورة أونلاين مكثفة تُظهر لك أن الجوال كافٍ لإنتاج صور ومحتوى احترافي عند إتقان الأساسيات.

تغطي إعدادات الكاميرا، التكوين، الإضاءة البسيطة بالأدوات المنزلية، وتطبيقات التحرير الأساسية.

مناسبة لأصحاب المتاجر وصنّاع المحتوى وأي شخص يوثق يومه بصور أفضل.', 'online', 'beginner', 'ar', '106beee4-a992-5912-a6c3-9cc7eafc793d', '/images/course-mobile.jpg', 'تصوير احترافي باستخدام كاميرا الهاتف المحمول', 450, null, null, true, false, false, 2, 6, array['استغلال كاميرا الجوال بكامل إمكاناتها', 'تصوير محتوى جاهز للنشر بجودة عالية', 'تحرير سريع بأسلوب ثابت']::text[], array['من يبدأ من الصفر بلا خبرة سابقة في التصوير', 'أصحاب المتاجر وصنّاع المحتوى الراغبون في تحسين صورهم']::text[], array['جهاز حاسوب أو جوال بمتصفح حديث', 'اتصال إنترنت مستقر للجلسات المباشرة']::text[], true, 'published', 'registration-open', null, null, '2026-08-05T09:00:00.000Z', '2026-08-05T09:00:00.000Z'),
  ('7672ca91-1b9d-588a-a690-b639cddb5b71', 'video-editing-basics', 'مونتاج الفيديو للمبتدئين', 'من الملفات الخام إلى فيديو متكامل: أساسيات المونتاج والإيقاع والصوت والتصدير.', 'دورة أونلاين عملية تبدأ من استيراد المقاطع وتنتهي بتصدير فيديو جاهز للنشر، باستخدام برنامج مونتاج متاح للجميع.

تتعلم الفك والترتيب والإيقاع، ومونتاج الحوار والموسيقى، والانتقالات بذوق سليم، وتصحيح الألوان الأساسي.

مثالية لصنّاع المحتوى ومنسقي الفرع وفرق التسويق.', 'online', 'beginner', 'ar', 'd4667ae1-2f49-5d79-80ed-8bb24a04d893', '/images/course-editing.jpg', 'شاشة تحرير فيديو أثناء تدريب المونتاج', 1050, null, null, true, false, false, 5, 10, array['مونتاج فيديو كامل من الصفر للنشر', 'إيقاع قصّ سليم وصوت نظيف', 'تصدير ملفات بجودة مناسبة لكل منصة']::text[], array['من يبدأ من الصفر بلا خبرة سابقة في التصوير', 'أصحاب المتاجر وصنّاع المحتوى الراغبون في تحسين صورهم']::text[], array['جهاز حاسوب أو جوال بمتصفح حديث', 'اتصال إنترنت مستقر للجلسات المباشرة']::text[], true, 'published', 'registration-open', null, null, '2026-08-06T09:00:00.000Z', '2026-08-06T09:00:00.000Z'),
  ('508745fc-6d73-58fe-ad32-9f057e13273d', 'cinematic-video', 'الفيديو السينمائي', 'حركة الكاميرا والإضاءة السينمائية ورواية القصة: انتقل من الفيديو العادي إلى الصورة السينمائية.', 'دورة حضورية متقدمة تدمج المعرفة السينمائية بتطبيق عملي كثيف داخل وخارج الاستوديو.

تتعلم بناء المشهد، حركات الكاميرا ومعانيها، إضاءة المشاهد الحوارية، واتساق الألوان بين اللقطات.

تُنفَّذ المشروع الختامي كمشهد قصير متكامل بفريق عمل مصغر.', 'in-person-individuals', 'advanced', 'ar', 'd4667ae1-2f49-5d79-80ed-8bb24a04d893', '/images/course-video.jpg', 'كاميرا سينمائية على ستيدي خلال تصوير مشهد تدريبي', 2500, null, null, true, false, false, 5, 15, array['إخراج مشهد بلغة بصرية سينمائية واضحة', 'استخدام حركة الكاميرا بشكل مقصود', 'إضاءة مشاهد حوارية بجودة احترافية']::text[], array['المصورون المتمرسون الساعون لمستوى الإنتاج التجاري', 'من يعمل ضمن فرق إنتاج مرئي']::text[], array['كاميرا (أي نوع متاح لديك — ونوفر معدات التدريب داخل المركز)', 'لا توجد متطلبات معرفية مسبقة']::text[], false, 'published', 'registration-open', null, null, '2026-08-07T09:00:00.000Z', '2026-08-07T09:00:00.000Z'),
  ('fa4c8da1-f072-5e73-9085-2a31510306a1', 'private-program', 'البرنامج الخاص – برايفت', 'تدريب فردي مصمم حول هدفك: تحدد أنت المحتوى والمستوى والموعد، ونحن نبني البرنامج لك.', 'برنامج تدريب فردي يُبنى بعد جلسة تحديد أهداف مجانية، حيث نرسم معك خطة تدريب تناسب مستواك الحالي وطموحك.

يمكن أن يغطي البرنامج أي مجال من مجالات التصوير أو الفيديو أو صناعة المحتوى، بجلسات مرنة ومواعيد مرنة.

مناسب للمصورين الذين يريدون قفزة نوعية، أو الموظفين بمواعيد غير ثابتة، أو من يفضل الإشراف الفردي الكامل.', 'private', 'all-levels', 'ar', '312e1109-fa9a-562e-8663-c8efcf5d558c', '/images/course-private.jpg', 'تدريب فردي على التصوير بإشراف مباشر من مدرب متخصص', 0, null, null, true, false, false, 1, 0, array['خطة تدريب مبنية على هدفك الشخصي', 'مرونة كاملة في المواعيد والمحتوى', 'إشراف فردي من بداية البرنامج لنهايته']::text[], array['كل المستويات — يُخصَّص المحتوى حسب هدف المتدرب']::text[], array['حضور جلسة تحديد أهداف المجانية قبل بدء البرنامج']::text[], false, 'published', null, null, null, '2026-08-08T09:00:00.000Z', '2026-08-08T09:00:00.000Z'),
  ('a5c98ef8-477b-5ba0-8c5b-339f74547e6c', 'corporate-team-program', 'برنامج تدريب فرق العمل', 'برنامج تدريبي مصمم للجهات والشركات: تصوير وصناعة محتوى تُنفَّذ في مقر المركز أو مقر الجهة حسب الاحتياج.', 'برنامج مخصص للجهات يبدأ بجلسة تحليل احتياج الفريق، ثم يُبنى محتوى تدريبي عملي يغطي التصوير وصناعة المحتوى بما يخدم أهداف الجهة.

يُنفَّذ البرنامج بمجموعات من فرق العمل نفسها مع مشاريع تطبيقية من بيئة العمل الفعلية، وتُسلَّم تقارير نتائج بتوصيات تطويرية.', 'in-person-corporates', 'all-levels', 'ar', '312e1109-fa9a-562e-8663-c8efcf5d558c', '/images/corporate-training.jpg', 'فريق شركة في برنامج تدريبي على صناعة المحتوى', 0, null, null, false, false, true, 2, 8, array['فريق قادر على إنتاج محتوى بصري يخدم أهداف الجهة', 'توحيد أسلوب التصوير والهوية البصرية عبر الفريق', 'تقرير نتائج بتوصيات تطويرية قابلة للتطبيق']::text[], array['فرق التسويق والمحتوى في الجهات والشركات', 'الموظفون المسؤولون عن التواصل البصري']::text[], array['لا توجد متطلبات مسبقة — يُبنى البرنامج حول احتياج الجهة']::text[], false, 'published', null, null, null, '2026-08-05T09:00:00.000Z', '2026-08-05T09:00:00.000Z'),
  ('44e595d7-677a-576e-b893-47f34aa57b70', 'night-photography-workshop', 'ورشة التصوير الليلي', 'ورشة مسائية عملية للتصوير في الإضاءة المنخفضة: التعريض الطويل، الإضاءة الحضرية، وضبط الضوضاء الرقمية.', 'ورشة مسارية مكثفة داخل جدة تشرح تقنيات التصوير الليلي: حامل الثلاثي، التعريض الطويل، والتعامل مع مصادر الضوء الحضري.

تنتهي الورشة بجولة تصوير عملية ومراجعة جماعية لأعمال المتدربين مع توصيات تحرير مخصصة.', 'in-person-individuals', 'intermediate', 'ar', '312e1109-fa9a-562e-8663-c8efcf5d558c', '/images/course-lighting.jpg', 'ورشة تصوير ليلي بإضاءة منخفضة', 850, null, null, true, false, false, 1, 4, array['التصوير الواثق في الإضاءة المنخفضة', 'ضبط التعريض الطويل دون اهتزاز', 'معالجة الضوضاء الرقمية في التحرير']::text[], array['من أتمّ أساسيات التصوير', 'المهتمون بتصوير المدينة ليلاً']::text[], array['كاميرا بوضع Manual وحامل ثلاثي', 'خبرة بسيطة بإعدادات التعريض']::text[], false, 'draft', null, null, null, '2026-08-10T09:00:00.000Z', '2026-08-10T09:00:00.000Z')
on conflict (id) do update set slug = excluded.slug, name = excluded.name, short_description = excluded.short_description, description = excluded.description, category = excluded.category, level = excluded.level, language = excluded.language, trainer_id = excluded.trainer_id, image_path = excluded.image_path, image_alt = excluded.image_alt, price = excluded.price, original_price = excluded.original_price, discount_percent = excluded.discount_percent, show_price = excluded.show_price, is_free = excluded.is_free, request_quote = excluded.request_quote, duration_days = excluded.duration_days, duration_hours = excluded.duration_hours, outcomes = excluded.outcomes, audience = excluded.audience, requirements = excluded.requirements, featured = excluded.featured, publish_status = excluded.publish_status, operational_status = excluded.operational_status, seo_title = excluded.seo_title, seo_description = excluded.seo_description
where (courses.slug, courses.name, courses.short_description, courses.description, courses.category, courses.level, courses.language, courses.trainer_id, courses.image_path, courses.image_alt, courses.price, courses.original_price, courses.discount_percent, courses.show_price, courses.is_free, courses.request_quote, courses.duration_days, courses.duration_hours, courses.outcomes, courses.audience, courses.requirements, courses.featured, courses.publish_status, courses.operational_status, courses.seo_title, courses.seo_description) is distinct from (excluded.slug, excluded.name, excluded.short_description, excluded.description, excluded.category, excluded.level, excluded.language, excluded.trainer_id, excluded.image_path, excluded.image_alt, excluded.price, excluded.original_price, excluded.discount_percent, excluded.show_price, excluded.is_free, excluded.request_quote, excluded.duration_days, excluded.duration_hours, excluded.outcomes, excluded.audience, excluded.requirements, excluded.featured, excluded.publish_status, excluded.operational_status, excluded.seo_title, excluded.seo_description);

insert into public.course_sessions (id, course_id, batch_name, start_date, end_date, start_time, end_time, location, city, capacity, registered_count, price_override, status, created_at, updated_at) values
  ('617139d0-89fa-5b5d-9bdb-eba264a32243', '699bbf9c-8cb2-5021-8225-cbc1cbb51aa4', 'دفعة 2026/09', '2026-09-14', '2026-09-17', '18:00', '21:00', 'مركز بيت المصور — حي الشرفية — جدة', 'جدة', 12, 7, null, 'open', '2026-08-31T00:00:00.000Z', '2026-08-31T00:00:00.000Z'),
  ('da4d7289-8738-58aa-a0f4-0e935f354a97', '699bbf9c-8cb2-5021-8225-cbc1cbb51aa4', 'دفعة 2026/10', '2026-10-11', '2026-10-14', '18:00', '21:00', 'مركز بيت المصور — حي الشرفية — جدة', 'جدة', 12, 0, null, 'open', '2026-08-31T00:00:00.000Z', '2026-08-31T00:00:00.000Z'),
  ('b45e1989-85d4-5292-9e57-f870e75ae8a6', 'e13ab532-29c9-5ccb-b646-26f515c596eb', 'دفعة 2026/09', '2026-09-21', '2026-09-23', '18:00', '21:00', 'بيت المصور – جدة', 'جدة', 10, 3, null, 'open', '2026-08-31T00:00:00.000Z', '2026-08-31T00:00:00.000Z'),
  ('f1b70211-5990-553d-bb96-0873dfe6d9db', 'a96da6a0-e29b-56f8-8e18-f96000cbe70a', 'دفعة 2026/10', '2026-10-05', '2026-10-07', '18:00', '21:00', 'بيت المصور – جدة', 'جدة', 10, 2, null, 'open', '2026-08-31T00:00:00.000Z', '2026-08-31T00:00:00.000Z'),
  ('df420dd9-f841-53c4-b67b-afc47d746ac2', '07015583-2011-51c4-b20c-75e9818877d4', 'دفعة 2026/10', '2026-10-19', '2026-10-22', '18:00', '21:00', 'بيت المصور – جدة', 'جدة', 10, 1, null, 'open', '2026-08-31T00:00:00.000Z', '2026-08-31T00:00:00.000Z'),
  ('92c54244-20cd-5eca-ae5f-877418d8e810', '7f8a2618-70f4-5796-af80-23b6c005281f', 'دفعة 2026/09', '2026-09-26', '2026-09-27', '20:00', '22:00', 'أونلاين – رابط مباشر', 'أونلاين', 30, 16, null, 'open', '2026-08-31T00:00:00.000Z', '2026-08-31T00:00:00.000Z'),
  ('0f72209b-e535-56f1-962b-ce5c933215a6', '7672ca91-1b9d-588a-a690-b639cddb5b71', 'دفعة 2026/10', '2026-10-04', '2026-10-08', '20:00', '22:00', 'أونلاين – رابط مباشر', 'أونلاين', 25, 14, null, 'open', '2026-08-31T00:00:00.000Z', '2026-08-31T00:00:00.000Z'),
  ('eece4ec9-fa7f-5932-ba8c-67d74801b74b', '508745fc-6d73-58fe-ad32-9f057e13273d', 'دفعة 2026/11', '2026-11-01', '2026-11-05', '18:00', '21:00', 'بيت المصور – جدة', 'جدة', 8, 2, null, 'open', '2026-08-31T00:00:00.000Z', '2026-08-31T00:00:00.000Z')
on conflict (id) do update set course_id = excluded.course_id, batch_name = excluded.batch_name, start_date = excluded.start_date, end_date = excluded.end_date, start_time = excluded.start_time, end_time = excluded.end_time, location = excluded.location, city = excluded.city, capacity = excluded.capacity, registered_count = excluded.registered_count, price_override = excluded.price_override, status = excluded.status
where (course_sessions.course_id, course_sessions.batch_name, course_sessions.start_date, course_sessions.end_date, course_sessions.start_time, course_sessions.end_time, course_sessions.location, course_sessions.city, course_sessions.capacity, course_sessions.registered_count, course_sessions.price_override, course_sessions.status) is distinct from (excluded.course_id, excluded.batch_name, excluded.start_date, excluded.end_date, excluded.start_time, excluded.end_time, excluded.location, excluded.city, excluded.capacity, excluded.registered_count, excluded.price_override, excluded.status);

insert into public.course_curriculum_days (id, course_id, title, sort_order, created_at, updated_at) values
  ('ead39761-c239-5c2a-9908-3d626421c7d9', '699bbf9c-8cb2-5021-8225-cbc1cbb51aa4', 'اليوم الأول', 0, '2026-08-31T00:00:00.000Z', '2026-08-31T00:00:00.000Z'),
  ('07f559a0-974c-54ab-8d97-40f0684ed51a', '699bbf9c-8cb2-5021-8225-cbc1cbb51aa4', 'اليوم الثاني', 1, '2026-08-31T00:00:00.000Z', '2026-08-31T00:00:00.000Z'),
  ('b7a402b6-b312-51ff-a524-68993a1d10b5', '699bbf9c-8cb2-5021-8225-cbc1cbb51aa4', 'اليوم الثالث', 2, '2026-08-31T00:00:00.000Z', '2026-08-31T00:00:00.000Z'),
  ('ff1ae6c2-4ebd-5308-a032-3a943d509500', '699bbf9c-8cb2-5021-8225-cbc1cbb51aa4', 'اليوم الرابع', 3, '2026-08-31T00:00:00.000Z', '2026-08-31T00:00:00.000Z'),
  ('2d5c57e2-afcf-5f54-ba1c-fb42855dffb1', 'e13ab532-29c9-5ccb-b646-26f515c596eb', 'اليوم الأول: لغة الضوء', 0, '2026-08-31T00:00:00.000Z', '2026-08-31T00:00:00.000Z'),
  ('0c6814a4-60e7-5f99-a250-cfd6dd6f2756', 'e13ab532-29c9-5ccb-b646-26f515c596eb', 'اليوم الثاني: بناء الإضاءة', 1, '2026-08-31T00:00:00.000Z', '2026-08-31T00:00:00.000Z'),
  ('69c7b683-fd77-500f-babb-6c7ad08efa5c', 'e13ab532-29c9-5ccb-b646-26f515c596eb', 'اليوم الثالث: مشروع كامل', 2, '2026-08-31T00:00:00.000Z', '2026-08-31T00:00:00.000Z'),
  ('7b01c935-92b3-5f7e-9409-9909db28c336', 'a96da6a0-e29b-56f8-8e18-f96000cbe70a', 'اليوم الأول: الشخص قبل الكاميرا', 0, '2026-08-31T00:00:00.000Z', '2026-08-31T00:00:00.000Z'),
  ('aaa2ff16-189d-51f1-b469-9c211bf2b8b1', 'a96da6a0-e29b-56f8-8e18-f96000cbe70a', 'اليوم الثاني: الضوء والخلفية', 1, '2026-08-31T00:00:00.000Z', '2026-08-31T00:00:00.000Z'),
  ('a49378a2-5429-5bed-9f35-ffd6d4b21e33', 'a96da6a0-e29b-56f8-8e18-f96000cbe70a', 'اليوم الثالث: التحرير والعرض', 2, '2026-08-31T00:00:00.000Z', '2026-08-31T00:00:00.000Z'),
  ('ad62f9dd-69df-5541-b2f1-1694e1c79e2a', '07015583-2011-51c4-b20c-75e9818877d4', 'اليوم الأول: طاولة التصوير', 0, '2026-08-31T00:00:00.000Z', '2026-08-31T00:00:00.000Z'),
  ('af8f7249-3b5a-5102-8c19-1131a52abf0c', '07015583-2011-51c4-b20c-75e9818877d4', 'اليوم الثاني: التحديات', 1, '2026-08-31T00:00:00.000Z', '2026-08-31T00:00:00.000Z'),
  ('2aecbe5a-ce6c-5ac5-85a4-73db3213da78', '07015583-2011-51c4-b20c-75e9818877d4', 'اليوم الثالث: الأطعمة والمشروبات', 2, '2026-08-31T00:00:00.000Z', '2026-08-31T00:00:00.000Z'),
  ('bfda5d2d-94fc-56ef-a124-b9dbd8240f9a', '07015583-2011-51c4-b20c-75e9818877d4', 'اليوم الرابع: المشروع والتحرير', 3, '2026-08-31T00:00:00.000Z', '2026-08-31T00:00:00.000Z'),
  ('9a596794-50e9-5b62-9872-8613e7d2a24e', '7f8a2618-70f4-5796-af80-23b6c005281f', 'الجلسة الأولى: الكاميرا والتكوين', 0, '2026-08-31T00:00:00.000Z', '2026-08-31T00:00:00.000Z'),
  ('1a8f559e-4f7a-5d6f-85a0-23a940a5571e', '7f8a2618-70f4-5796-af80-23b6c005281f', 'الجلسة الثانية: التحرير والنشر', 1, '2026-08-31T00:00:00.000Z', '2026-08-31T00:00:00.000Z'),
  ('1660866c-686b-541f-b527-08f84fb1d5cf', '7672ca91-1b9d-588a-a690-b639cddb5b71', 'اليوم الأول: التعريف بالبرنامج', 0, '2026-08-31T00:00:00.000Z', '2026-08-31T00:00:00.000Z'),
  ('765fe011-0bcf-59fc-9ba7-a8c9b0889abd', '7672ca91-1b9d-588a-a690-b639cddb5b71', 'اليوم الثاني: الإيقاع والقص', 1, '2026-08-31T00:00:00.000Z', '2026-08-31T00:00:00.000Z'),
  ('9ea77f56-e9fa-5832-9488-ad095bc1a4e0', '7672ca91-1b9d-588a-a690-b639cddb5b71', 'اليوم الثالث: الصوت', 2, '2026-08-31T00:00:00.000Z', '2026-08-31T00:00:00.000Z'),
  ('19008451-fa46-5f0f-829f-bbb790ff9d58', '7672ca91-1b9d-588a-a690-b639cddb5b71', 'اليوم الرابع: الصورة', 3, '2026-08-31T00:00:00.000Z', '2026-08-31T00:00:00.000Z'),
  ('1e066951-4e8e-5c1f-9b94-02f8164eefae', '7672ca91-1b9d-588a-a690-b639cddb5b71', 'اليوم الخامس: التسليم', 4, '2026-08-31T00:00:00.000Z', '2026-08-31T00:00:00.000Z'),
  ('3a8ef0c9-22fa-5838-a5f3-569c527f8c68', '508745fc-6d73-58fe-ad32-9f057e13273d', 'اليوم الأول: لغة الصورة السينمائية', 0, '2026-08-31T00:00:00.000Z', '2026-08-31T00:00:00.000Z'),
  ('8339bef1-430e-5ab9-8ade-2f51b0d05c9c', '508745fc-6d73-58fe-ad32-9f057e13273d', 'اليوم الثاني: حركة الكاميرا', 1, '2026-08-31T00:00:00.000Z', '2026-08-31T00:00:00.000Z'),
  ('2fab0b21-b9b0-5be8-9373-e43e5789449d', '508745fc-6d73-58fe-ad32-9f057e13273d', 'اليوم الثالث: الإضاءة السينمائية', 2, '2026-08-31T00:00:00.000Z', '2026-08-31T00:00:00.000Z'),
  ('deecd590-560b-5777-983d-af5961a5c01a', '508745fc-6d73-58fe-ad32-9f057e13273d', 'اليوم الرابع والخامس: المشروع', 3, '2026-08-31T00:00:00.000Z', '2026-08-31T00:00:00.000Z'),
  ('7eb6cf7f-1621-5b0d-a14f-41441e025e61', 'fa4c8da1-f072-5e73-9085-2a31510306a1', 'كيف يعمل البرنامج؟', 0, '2026-08-31T00:00:00.000Z', '2026-08-31T00:00:00.000Z'),
  ('ee1fd4f6-d2f1-5279-90b1-d530670f14b8', 'a5c98ef8-477b-5ba0-8c5b-339f74547e6c', 'اليوم الأول: الأساسيات وتحليل الاحتياج', 0, '2026-08-31T00:00:00.000Z', '2026-08-31T00:00:00.000Z'),
  ('625df732-2859-5375-9469-f95ae111e7c7', 'a5c98ef8-477b-5ba0-8c5b-339f74547e6c', 'اليوم الثاني: التطبيق والتسليم', 1, '2026-08-31T00:00:00.000Z', '2026-08-31T00:00:00.000Z'),
  ('19303d99-fc60-5115-969d-7536042ba4e7', '44e595d7-677a-576e-b893-47f34aa57b70', 'الورشة المسارية', 0, '2026-08-31T00:00:00.000Z', '2026-08-31T00:00:00.000Z')
on conflict (id) do update set course_id = excluded.course_id, title = excluded.title, sort_order = excluded.sort_order
where (course_curriculum_days.course_id, course_curriculum_days.title, course_curriculum_days.sort_order) is distinct from (excluded.course_id, excluded.title, excluded.sort_order);

insert into public.course_curriculum_items (id, day_id, title, description, sort_order, created_at, updated_at) values
  ('a609a387-360a-5243-8e0f-eecf42877187', 'ead39761-c239-5c2a-9908-3d626421c7d9', 'مقدمة في التصوير الفوتوغرافي', null, 0, '2026-08-31T00:00:00.000Z', '2026-08-31T00:00:00.000Z'),
  ('5f85718f-825e-56c8-82c3-d628d1365187', 'ead39761-c239-5c2a-9908-3d626421c7d9', 'تكوين الصورة الفوتوغرافية', null, 1, '2026-08-31T00:00:00.000Z', '2026-08-31T00:00:00.000Z'),
  ('96be6a84-c6b1-5a3c-a25a-cdde992c2cb1', 'ead39761-c239-5c2a-9908-3d626421c7d9', 'آلية عمل الكاميرا وطريقة استخدامها', null, 2, '2026-08-31T00:00:00.000Z', '2026-08-31T00:00:00.000Z'),
  ('bdd8c755-1705-596a-a489-41a148599d8c', '07f559a0-974c-54ab-8d97-40f0684ed51a', 'الفرق بين أنواع الكاميرات', null, 0, '2026-08-31T00:00:00.000Z', '2026-08-31T00:00:00.000Z'),
  ('f17632f3-a547-5ad9-a8db-175629621d47', '07f559a0-974c-54ab-8d97-40f0684ed51a', 'الفرق بين العدسات', null, 1, '2026-08-31T00:00:00.000Z', '2026-08-31T00:00:00.000Z'),
  ('3d5feeba-b00a-5520-ad2b-f13fe23157a4', 'b7a402b6-b312-51ff-a524-68993a1d10b5', 'التعرف على أزرار وأوضاع الكاميرا', null, 0, '2026-08-31T00:00:00.000Z', '2026-08-31T00:00:00.000Z'),
  ('aae02045-1d31-52b0-b12a-94815e3c2f0e', 'b7a402b6-b312-51ff-a524-68993a1d10b5', 'ضبط التعريض الصحيح في الوضع اليدوي Manual', null, 1, '2026-08-31T00:00:00.000Z', '2026-08-31T00:00:00.000Z'),
  ('511d5f07-e380-5a30-920e-ecff0e881ee2', 'ff1ae6c2-4ebd-5308-a032-3a943d509500', 'عمق الميدان Depth of Field', null, 0, '2026-08-31T00:00:00.000Z', '2026-08-31T00:00:00.000Z'),
  ('b2c2a812-36a8-51be-a580-39a3ee2ad249', '2d5c57e2-afcf-5f54-ba1c-fb42855dffb1', 'خصائص الضوء: الاتجاه، القسوة، النسبة', null, 0, '2026-08-31T00:00:00.000Z', '2026-08-31T00:00:00.000Z'),
  ('4b32ede9-06d7-5ec2-9f33-7e46d0dd7c5b', '2d5c57e2-afcf-5f54-ba1c-fb42855dffb1', 'المعدات وأنواع المعدِّلات', null, 1, '2026-08-31T00:00:00.000Z', '2026-08-31T00:00:00.000Z'),
  ('4144fe2a-12b1-5632-b945-315cfea3a0fa', '2d5c57e2-afcf-5f54-ba1c-fb42855dffb1', 'إضاءة واحدة: صورة كاملة بمصدر وحيد', null, 2, '2026-08-31T00:00:00.000Z', '2026-08-31T00:00:00.000Z'),
  ('46c182a2-d0aa-553c-bdc1-4a6a26358448', '0c6814a4-60e7-5f99-a250-cfd6dd6f2756', 'إضائتان: Key وFill عملياً', null, 0, '2026-08-31T00:00:00.000Z', '2026-08-31T00:00:00.000Z'),
  ('049d174e-9b0d-5ec5-a90e-c4cfb0f306b7', '0c6814a4-60e7-5f99-a250-cfd6dd6f2756', 'إضاءة الخلفية وفصل الشخص عن الخلفية', null, 1, '2026-08-31T00:00:00.000Z', '2026-08-31T00:00:00.000Z'),
  ('f0103f76-491a-51d2-959c-78ef2835a0f0', '0c6814a4-60e7-5f99-a250-cfd6dd6f2756', 'سيناريوهات: بورتريه كلاسيكي ومعاصر', null, 2, '2026-08-31T00:00:00.000Z', '2026-08-31T00:00:00.000Z'),
  ('d15f28bb-bd85-52dd-b6ff-3599e13c1af7', '69c7b683-fd77-500f-babb-6c7ad08efa5c', 'تخطيط جلسة تصوير من الفكرة للتنفيذ', null, 0, '2026-08-31T00:00:00.000Z', '2026-08-31T00:00:00.000Z'),
  ('430a4c71-80b9-5111-8d00-d07b3315d291', '69c7b683-fd77-500f-babb-6c7ad08efa5c', 'تصوير مشروع بإشراف المدرب', null, 1, '2026-08-31T00:00:00.000Z', '2026-08-31T00:00:00.000Z'),
  ('2fa98405-1ad1-5d12-bfe6-53a842bbe510', '69c7b683-fd77-500f-babb-6c7ad08efa5c', 'مراجعة النتائج وتسليم الشهادات', null, 2, '2026-08-31T00:00:00.000Z', '2026-08-31T00:00:00.000Z'),
  ('b468bd07-2ab9-55ba-80a3-0a483d1b25ea', '7b01c935-92b3-5f7e-9409-9909db28c336', 'التواصل مع الموديل وبناء الثقة', null, 0, '2026-08-31T00:00:00.000Z', '2026-08-31T00:00:00.000Z'),
  ('0952975c-99d0-5975-ad79-1fc204667d2e', '7b01c935-92b3-5f7e-9409-9909db28c336', 'زاوية التصوير ولغة الجسد', null, 1, '2026-08-31T00:00:00.000Z', '2026-08-31T00:00:00.000Z'),
  ('c200faa2-2906-5726-ad11-019a7b88dbbd', '7b01c935-92b3-5f7e-9409-9909db28c336', 'تمرين: بورتريه بإضاءة النافذة', null, 2, '2026-08-31T00:00:00.000Z', '2026-08-31T00:00:00.000Z'),
  ('0fd997ac-ca57-5776-be9e-4f95c2f6e2aa', 'aaa2ff16-189d-51f1-b469-9c211bf2b8b1', 'بورتريه بإضاءة طبيعية خارجية', null, 0, '2026-08-31T00:00:00.000Z', '2026-08-31T00:00:00.000Z'),
  ('3e001cbb-ce2c-5885-a456-b4e8ad2799fd', 'aaa2ff16-189d-51f1-b469-9c211bf2b8b1', 'بورتريه بإضاءة استوديو', null, 1, '2026-08-31T00:00:00.000Z', '2026-08-31T00:00:00.000Z'),
  ('d46f7bc5-8b93-5b77-8740-d9ac763adb8c', 'aaa2ff16-189d-51f1-b469-9c211bf2b8b1', 'اختيار الخلفية والألوان', null, 2, '2026-08-31T00:00:00.000Z', '2026-08-31T00:00:00.000Z'),
  ('8ee9472b-e165-5c60-882a-74af34b89479', 'a49378a2-5429-5bed-9f35-ffd6d4b21e33', 'أساسيات تحرير البورتريه', null, 0, '2026-08-31T00:00:00.000Z', '2026-08-31T00:00:00.000Z'),
  ('05774814-2b21-54cf-a147-38181e30b99b', 'a49378a2-5429-5bed-9f35-ffd6d4b21e33', 'بناء سلسلة صور متكاملة', null, 1, '2026-08-31T00:00:00.000Z', '2026-08-31T00:00:00.000Z'),
  ('3ca085ce-2f0c-5bfa-9044-df4b9c8f9051', 'a49378a2-5429-5bed-9f35-ffd6d4b21e33', 'مراجعة الأعمال النهائية', null, 2, '2026-08-31T00:00:00.000Z', '2026-08-31T00:00:00.000Z'),
  ('d50d2af2-0819-5901-b9a9-247b654af907', 'ad62f9dd-69df-5541-b2f1-1694e1c79e2a', 'المعدات وخيارات اقتصادية', null, 0, '2026-08-31T00:00:00.000Z', '2026-08-31T00:00:00.000Z'),
  ('52486b06-4611-58ed-b04a-d29ed5c0c16f', 'ad62f9dd-69df-5541-b2f1-1694e1c79e2a', 'الخلفيات والدعامات', null, 1, '2026-08-31T00:00:00.000Z', '2026-08-31T00:00:00.000Z'),
  ('f9343299-53f4-52c4-ba0c-0be3a922c67b', 'ad62f9dd-69df-5541-b2f1-1694e1c79e2a', 'إضاءة منتج أساسي: صورة نظيفة', null, 2, '2026-08-31T00:00:00.000Z', '2026-08-31T00:00:00.000Z'),
  ('40fd4084-dab7-5d37-8435-245bb75fa3e1', 'af8f7249-3b5a-5102-8c19-1131a52abf0c', 'تصوير الزجاج والمعادن اللامعة', null, 0, '2026-08-31T00:00:00.000Z', '2026-08-31T00:00:00.000Z'),
  ('56955bf4-5872-5ffb-a8a0-430dd0cd2149', 'af8f7249-3b5a-5102-8c19-1131a52abf0c', 'الظلال والانعكاسات', null, 1, '2026-08-31T00:00:00.000Z', '2026-08-31T00:00:00.000Z'),
  ('f2e4e3fc-73fd-563b-9a89-e30775d1b89a', 'af8f7249-3b5a-5102-8c19-1131a52abf0c', 'تمرين عملي متنوع', null, 2, '2026-08-31T00:00:00.000Z', '2026-08-31T00:00:00.000Z'),
  ('9102f3c3-b015-5d46-bd88-84f7c5c24a42', '2aecbe5a-ce6c-5ac5-85a4-73db3213da78', 'تنسيق الطعام Styling', null, 0, '2026-08-31T00:00:00.000Z', '2026-08-31T00:00:00.000Z'),
  ('44997c9d-3df8-57f3-a5b9-c68f67c6598b', '2aecbe5a-ce6c-5ac5-85a4-73db3213da78', 'خدع إضاءة الأطعمة', null, 1, '2026-08-31T00:00:00.000Z', '2026-08-31T00:00:00.000Z'),
  ('793881f9-0405-5b63-9e9f-aa0f2e8db822', '2aecbe5a-ce6c-5ac5-85a4-73db3213da78', 'تصوير مشهد مشروب كامل', null, 2, '2026-08-31T00:00:00.000Z', '2026-08-31T00:00:00.000Z'),
  ('438501cf-7134-5924-9228-2beb5fe4fe1f', 'bfda5d2d-94fc-56ef-a124-b9dbd8240f9a', 'مشروع تصوير منتج كامل', null, 0, '2026-08-31T00:00:00.000Z', '2026-08-31T00:00:00.000Z'),
  ('90219d2f-09ea-5649-8689-95412bbaffd9', 'bfda5d2d-94fc-56ef-a124-b9dbd8240f9a', 'تحرير الصور للتسليم التجاري', null, 1, '2026-08-31T00:00:00.000Z', '2026-08-31T00:00:00.000Z'),
  ('c5c27439-4a2f-5e56-9d6b-1411a9697a4a', 'bfda5d2d-94fc-56ef-a124-b9dbd8240f9a', 'تجهيز ملف العرض للعملاء', null, 2, '2026-08-31T00:00:00.000Z', '2026-08-31T00:00:00.000Z'),
  ('586fd568-e48b-561c-b7d4-a7ea8b954a91', '9a596794-50e9-5b62-9872-8613e7d2a24e', 'إعدادات كاميرا الجوال المخفية', null, 0, '2026-08-31T00:00:00.000Z', '2026-08-31T00:00:00.000Z'),
  ('e126549f-8cd0-5cf5-83b7-2d2fd7a24db8', '9a596794-50e9-5b62-9872-8613e7d2a24e', 'التكوين والإضاءة المنزلية', null, 1, '2026-08-31T00:00:00.000Z', '2026-08-31T00:00:00.000Z'),
  ('155eba9f-6df1-51cf-8157-442ee12ec7ea', '9a596794-50e9-5b62-9872-8613e7d2a24e', 'تمرين عملي مباشر', null, 2, '2026-08-31T00:00:00.000Z', '2026-08-31T00:00:00.000Z'),
  ('0f0d50b2-35af-5d6a-8df4-b2b0506f8390', '1a8f559e-4f7a-5d6f-85a0-23a940a5571e', 'تحرير الصور على الجوال', null, 0, '2026-08-31T00:00:00.000Z', '2026-08-31T00:00:00.000Z'),
  ('88fffd35-1e69-52de-bf99-2013c5a4c77c', '1a8f559e-4f7a-5d6f-85a0-23a940a5571e', 'تصوير محتوى للمتاجر والسوشال', null, 1, '2026-08-31T00:00:00.000Z', '2026-08-31T00:00:00.000Z'),
  ('00cbf63c-eaff-532c-be83-85b28dea39a7', '1a8f559e-4f7a-5d6f-85a0-23a940a5571e', 'بناء أسلوبك الخاص', null, 2, '2026-08-31T00:00:00.000Z', '2026-08-31T00:00:00.000Z'),
  ('8a82d21f-dcaf-57c1-be07-86c7ca7830bd', '1660866c-686b-541f-b527-08f84fb1d5cf', 'واجهة البرنامج والإعدادات', null, 0, '2026-08-31T00:00:00.000Z', '2026-08-31T00:00:00.000Z'),
  ('af174a43-8a54-5473-aaad-be353bf73218', '1660866c-686b-541f-b527-08f84fb1d5cf', 'استيراد وتنظيم الملفات', null, 1, '2026-08-31T00:00:00.000Z', '2026-08-31T00:00:00.000Z'),
  ('b840b85f-3b1b-58d9-9528-a2092249bcb8', '1660866c-686b-541f-b527-08f84fb1d5cf', 'أول قطع بسيط', null, 2, '2026-08-31T00:00:00.000Z', '2026-08-31T00:00:00.000Z'),
  ('48b32eb3-821f-5b88-b295-289d0de5764d', '765fe011-0bcf-59fc-9ba7-a8c9b0889abd', 'أساسيات الإيقاع السردي', null, 0, '2026-08-31T00:00:00.000Z', '2026-08-31T00:00:00.000Z'),
  ('2edbc1c4-0435-5467-a812-df15a29d24e9', '765fe011-0bcf-59fc-9ba7-a8c9b0889abd', 'قص الحوارات والمقابلات', null, 1, '2026-08-31T00:00:00.000Z', '2026-08-31T00:00:00.000Z'),
  ('501dd1b5-92ab-563d-8f1f-085c0627a5bb', '765fe011-0bcf-59fc-9ba7-a8c9b0889abd', 'الانتقالات ومتى تُستخدم', null, 2, '2026-08-31T00:00:00.000Z', '2026-08-31T00:00:00.000Z'),
  ('ba4c2ea2-0910-5094-b364-07097a64f2de', '9ea77f56-e9fa-5832-9488-ad095bc1a4e0', 'تنظيف الصوت ومستوياته', null, 0, '2026-08-31T00:00:00.000Z', '2026-08-31T00:00:00.000Z'),
  ('d12b5717-b72c-5e18-a866-20f7fb4fc4c0', '9ea77f56-e9fa-5832-9488-ad095bc1a4e0', 'الموسيقى والمؤثرات', null, 1, '2026-08-31T00:00:00.000Z', '2026-08-31T00:00:00.000Z'),
  ('07c9505e-7332-523e-90e2-a067e8d1d9c4', '9ea77f56-e9fa-5832-9488-ad095bc1a4e0', 'مزامنة الصوت مع الصورة', null, 2, '2026-08-31T00:00:00.000Z', '2026-08-31T00:00:00.000Z'),
  ('6bb5d923-9902-5e49-91de-b9b8c8c3c55b', '19008451-fa46-5f0f-829f-bbb790ff9d58', 'تصحيح الألوان الأساسي', null, 0, '2026-08-31T00:00:00.000Z', '2026-08-31T00:00:00.000Z'),
  ('8da9a388-060e-5f15-b0b3-e8d4c17f1778', '19008451-fa46-5f0f-829f-bbb790ff9d58', 'العناوين والنصوص', null, 1, '2026-08-31T00:00:00.000Z', '2026-08-31T00:00:00.000Z'),
  ('1fe34490-3a3b-5868-a4dd-726e20846d1c', '19008451-fa46-5f0f-829f-bbb790ff9d58', 'قوالب الإخراج السريع', null, 2, '2026-08-31T00:00:00.000Z', '2026-08-31T00:00:00.000Z'),
  ('a51af34e-1c56-5604-9e32-8359d9823ac4', '1e066951-4e8e-5c1f-9b94-02f8164eefae', 'إعدادات التصدير لكل منصة', null, 0, '2026-08-31T00:00:00.000Z', '2026-08-31T00:00:00.000Z'),
  ('83de65fc-8d4f-57ef-a0ed-7eb628c9c74b', '1e066951-4e8e-5c1f-9b94-02f8164eefae', 'مشروع ختامي متكامل', null, 1, '2026-08-31T00:00:00.000Z', '2026-08-31T00:00:00.000Z'),
  ('cac35069-743a-51a4-8eec-ab394c9a3c9f', '1e066951-4e8e-5c1f-9b94-02f8164eefae', 'مراجعة وتغذية راجعة', null, 2, '2026-08-31T00:00:00.000Z', '2026-08-31T00:00:00.000Z'),
  ('13c27ef0-57ae-5961-9334-a82be7ae91fb', '3a8ef0c9-22fa-5838-a5f3-569c527f8c68', 'حجم اللقطة ومعناها', null, 0, '2026-08-31T00:00:00.000Z', '2026-08-31T00:00:00.000Z'),
  ('b02cfa31-3376-5340-a22c-36eaf95085fc', '3a8ef0c9-22fa-5838-a5f3-569c527f8c68', 'تشكيل الإطار داخل المشهد', null, 1, '2026-08-31T00:00:00.000Z', '2026-08-31T00:00:00.000Z'),
  ('2f19d984-640a-5026-bf92-19c39dc327ac', '3a8ef0c9-22fa-5838-a5f3-569c527f8c68', 'تحليل مشاهد مرجعية', null, 2, '2026-08-31T00:00:00.000Z', '2026-08-31T00:00:00.000Z'),
  ('e5808755-23a5-57e4-98dd-d615cad56998', '8339bef1-430e-5ab9-8ade-2f51b0d05c9c', 'أدوات الحركة والتثبيت', null, 0, '2026-08-31T00:00:00.000Z', '2026-08-31T00:00:00.000Z'),
  ('39c4e463-b6a2-519c-8381-64cbcf551295', '8339bef1-430e-5ab9-8ade-2f51b0d05c9c', 'حركة بمعنى: متى ولماذا', null, 1, '2026-08-31T00:00:00.000Z', '2026-08-31T00:00:00.000Z'),
  ('50a49ddc-172d-5f4f-b833-17f7a58fb4eb', '8339bef1-430e-5ab9-8ade-2f51b0d05c9c', 'تمرين مشهد متحرك', null, 2, '2026-08-31T00:00:00.000Z', '2026-08-31T00:00:00.000Z'),
  ('b24be84c-1625-51d8-8d4d-ed451cdba4da', '2fab0b21-b9b0-5be8-9373-e43e5789449d', 'بناء مزاج المشهد', null, 0, '2026-08-31T00:00:00.000Z', '2026-08-31T00:00:00.000Z'),
  ('89f12223-0360-5b19-8bbd-0595825e2b6a', '2fab0b21-b9b0-5be8-9373-e43e5789449d', 'إضاءة الحوارات', null, 1, '2026-08-31T00:00:00.000Z', '2026-08-31T00:00:00.000Z'),
  ('017c12c1-9845-5cf0-949f-9cdfdbd783e2', '2fab0b21-b9b0-5be8-9373-e43e5789449d', 'التعامل مع الإضاءة المتاحة', null, 2, '2026-08-31T00:00:00.000Z', '2026-08-31T00:00:00.000Z'),
  ('c417eb65-0056-5b3c-916f-62c0311d435f', 'deecd590-560b-5777-983d-af5961a5c01a', 'تخطيط مشهد قصير كامل', null, 0, '2026-08-31T00:00:00.000Z', '2026-08-31T00:00:00.000Z'),
  ('d13d7f59-3d81-5e73-9eab-4650a71c878b', 'deecd590-560b-5777-983d-af5961a5c01a', 'التصوير بفريق مصغر', null, 1, '2026-08-31T00:00:00.000Z', '2026-08-31T00:00:00.000Z'),
  ('6d02656d-637f-51b8-8e6b-9277049d22b3', 'deecd590-560b-5777-983d-af5961a5c01a', 'المراجعة والتسليم', null, 2, '2026-08-31T00:00:00.000Z', '2026-08-31T00:00:00.000Z'),
  ('48a1e848-643b-55c8-b0ed-f3acdef49166', '7eb6cf7f-1621-5b0d-a14f-41441e025e61', 'جلسة تحديد أهداف مجانية', null, 0, '2026-08-31T00:00:00.000Z', '2026-08-31T00:00:00.000Z'),
  ('4d522632-1450-54db-8c85-165cad220115', '7eb6cf7f-1621-5b0d-a14f-41441e025e61', 'خطة تدريب مخصصة واضحة', null, 1, '2026-08-31T00:00:00.000Z', '2026-08-31T00:00:00.000Z'),
  ('2f22589e-9797-5836-b1c1-fc79ae4a7ab4', '7eb6cf7f-1621-5b0d-a14f-41441e025e61', 'جلسات مرنة حسب جدولك', null, 2, '2026-08-31T00:00:00.000Z', '2026-08-31T00:00:00.000Z'),
  ('89fea36e-2792-5e25-8d92-c4a95a984fcc', '7eb6cf7f-1621-5b0d-a14f-41441e025e61', 'متابعة وتقييم بين الجلسات', null, 3, '2026-08-31T00:00:00.000Z', '2026-08-31T00:00:00.000Z'),
  ('76a0d5b4-a194-5d1a-bcc5-d92e8a962b13', 'ee1fd4f6-d2f1-5279-90b1-d530670f14b8', 'جلسة تحليل احتياج الفريق', null, 0, '2026-08-31T00:00:00.000Z', '2026-08-31T00:00:00.000Z'),
  ('0716d245-7779-59c8-b543-deba3253dc17', 'ee1fd4f6-d2f1-5279-90b1-d530670f14b8', 'أساسيات التصوير العملية للفرق', null, 1, '2026-08-31T00:00:00.000Z', '2026-08-31T00:00:00.000Z'),
  ('6c596769-5718-5ad0-b020-6fce476c4ab8', '625df732-2859-5375-9469-f95ae111e7c7', 'مشروع تطبيقي من بيئة العمل', null, 0, '2026-08-31T00:00:00.000Z', '2026-08-31T00:00:00.000Z'),
  ('27bf732c-7e36-56ed-8268-99d6f04e6fd6', '625df732-2859-5375-9469-f95ae111e7c7', 'تسليم تقرير النتائج والتوصيات', null, 1, '2026-08-31T00:00:00.000Z', '2026-08-31T00:00:00.000Z'),
  ('ca156c2d-5d10-5386-9ccf-a0057fa41582', '19303d99-fc60-5115-969d-7536042ba4e7', 'مقدمة: سلوك الضوء ليلاً', null, 0, '2026-08-31T00:00:00.000Z', '2026-08-31T00:00:00.000Z'),
  ('56228e62-7725-510d-a59d-aea77c547d95', '19303d99-fc60-5115-969d-7536042ba4e7', 'جولة تصوير عملية في كورنيش جدة', null, 1, '2026-08-31T00:00:00.000Z', '2026-08-31T00:00:00.000Z'),
  ('e0edf71a-42fb-5b6a-9359-0388fd859e9c', '19303d99-fc60-5115-969d-7536042ba4e7', 'مراجعة الأعمال وتوصيات التحرير', null, 2, '2026-08-31T00:00:00.000Z', '2026-08-31T00:00:00.000Z')
on conflict (id) do update set day_id = excluded.day_id, title = excluded.title, description = excluded.description, sort_order = excluded.sort_order
where (course_curriculum_items.day_id, course_curriculum_items.title, course_curriculum_items.description, course_curriculum_items.sort_order) is distinct from (excluded.day_id, excluded.title, excluded.description, excluded.sort_order);

insert into public.learning_paths (id, slug, name, short_description, description, image_path, image_alt, level, discount_percent, publish_status, featured, created_at, updated_at) values
  ('1485a0a1-82a3-531d-8d3f-e9ad4dbc8a2a', 'photography-professional', 'مسار التصوير الفوتوغرافي الاحترافي', 'ثلاث دورات متدرجة من الصفر إلى التحكم الكامل بالكاميرا والضوء.', 'ثلاث دورات متدرجة تأخذك من صفر معرفة إلى مصور يتحكم بالكاميرا والضوء: الأساسيات، ثم الإضاءة الاستوديوهية، ثم البورتريه.', '/images/path-photography.jpg', 'مسار التصوير الفوتوغرافي الاحترافي', 'beginner', 20, 'published', false, '2026-08-31T00:00:00.000Z', '2026-08-31T00:00:00.000Z'),
  ('250741b5-60e9-5a73-ac36-891375bd0c70', 'content-video', 'مسار صناعة المحتوى والفيديو', 'من الجوال إلى السينمائي: مسار متكامل لمهارات الفيديو والمونتاج.', 'من الجوال إلى الكاميرا السينمائية: مسار متكامل يغطي التصوير بالجوال، المونتاج، ثم الفيديو السينمائي بإخراج متقدم.', '/images/path-content.jpg', 'مسار صناعة المحتوى والفيديو', 'all-levels', 15, 'published', false, '2026-08-31T00:00:00.000Z', '2026-08-31T00:00:00.000Z')
on conflict (id) do update set slug = excluded.slug, name = excluded.name, short_description = excluded.short_description, description = excluded.description, image_path = excluded.image_path, image_alt = excluded.image_alt, level = excluded.level, discount_percent = excluded.discount_percent, publish_status = excluded.publish_status, featured = excluded.featured
where (learning_paths.slug, learning_paths.name, learning_paths.short_description, learning_paths.description, learning_paths.image_path, learning_paths.image_alt, learning_paths.level, learning_paths.discount_percent, learning_paths.publish_status, learning_paths.featured) is distinct from (excluded.slug, excluded.name, excluded.short_description, excluded.description, excluded.image_path, excluded.image_alt, excluded.level, excluded.discount_percent, excluded.publish_status, excluded.featured);

insert into public.learning_path_courses (path_id, course_id, sort_order, created_at, updated_at) values
  ('1485a0a1-82a3-531d-8d3f-e9ad4dbc8a2a', '699bbf9c-8cb2-5021-8225-cbc1cbb51aa4', 0, '2026-08-31T00:00:00.000Z', '2026-08-31T00:00:00.000Z'),
  ('1485a0a1-82a3-531d-8d3f-e9ad4dbc8a2a', 'e13ab532-29c9-5ccb-b646-26f515c596eb', 1, '2026-08-31T00:00:00.000Z', '2026-08-31T00:00:00.000Z'),
  ('1485a0a1-82a3-531d-8d3f-e9ad4dbc8a2a', 'a96da6a0-e29b-56f8-8e18-f96000cbe70a', 2, '2026-08-31T00:00:00.000Z', '2026-08-31T00:00:00.000Z'),
  ('250741b5-60e9-5a73-ac36-891375bd0c70', '7f8a2618-70f4-5796-af80-23b6c005281f', 0, '2026-08-31T00:00:00.000Z', '2026-08-31T00:00:00.000Z'),
  ('250741b5-60e9-5a73-ac36-891375bd0c70', '7672ca91-1b9d-588a-a690-b639cddb5b71', 1, '2026-08-31T00:00:00.000Z', '2026-08-31T00:00:00.000Z'),
  ('250741b5-60e9-5a73-ac36-891375bd0c70', '508745fc-6d73-58fe-ad32-9f057e13273d', 2, '2026-08-31T00:00:00.000Z', '2026-08-31T00:00:00.000Z')
on conflict (path_id, course_id) do update set sort_order = excluded.sort_order
where (learning_path_courses.sort_order) is distinct from (excluded.sort_order);

insert into public.testimonials (id, name, role, review, rating, source, source_url, featured, visible, reviewed_at, created_at, updated_at) values
  ('c698c32e-1183-5bcf-9c9f-2fb8afcd1878', 'عبدالله المطيري', 'متدرب – أساسيات التصوير', 'دورة منظمة من أول يوم، المدرب يشرح بطريقة عملية أكثر من نظري. خرجت من الدورة أصور بالوضع اليدوي بشكل طبيعي وواثق.', 5, 'google', null, true, true, '2026-07-18', '2026-08-31T00:00:00.000Z', '2026-08-31T00:00:00.000Z'),
  ('41a5e6f8-e500-5332-b07d-bf41eb646a06', 'سارة الحربي', 'متدربة – الإضاءة الاستوديوهية', 'الاستوديو مجهز بشكل ممتاز والمجموعة صغيرة وهذا ساعدني أطبق بنفسي أكثر من مرة. أفضل استثمار في تطوير مهارتي التصوير.', 5, 'google', null, true, true, '2026-07-02', '2026-08-31T00:00:00.000Z', '2026-08-31T00:00:00.000Z'),
  ('370f89c3-dd56-55e5-b8b8-da674767ba0d', 'محمد الزهراني', 'متدرب – مونتاج الفيديو', 'كنت أعتقد المونتاج معقد، لكن الدورة كانت متدرجة بذكاء. الآن أجهز فيديوهات لمتجرنا بشكل مستقل.', 5, 'google', null, true, true, '2026-06-21', '2026-08-31T00:00:00.000Z', '2026-08-31T00:00:00.000Z'),
  ('8c097170-dc32-533a-84bc-6336af6876dd', 'نورة القحطاني', 'متدربة – تصوير المنتجات', 'تجربة مفيدة جداً، خصوصاً تطبيق تصوير المنتجات الفعلي. تمنيت لو الدورة أطول من أربعة أيام.', 4, 'google', null, false, true, '2026-06-10', '2026-08-31T00:00:00.000Z', '2026-08-31T00:00:00.000Z'),
  ('e90567c5-deb4-577f-a8ff-4abf7fa6b56e', 'فهد العسيري', 'متدرب – البرنامج الخاص', 'دخلت البرنامج الخاص بمستوى مبتدئ وبعد شهر أصور مناسبات بأجر. المتابعة الفردية أحدثت الفرق الحقيقي.', 5, 'google', null, false, true, '2026-05-28', '2026-08-31T00:00:00.000Z', '2026-08-31T00:00:00.000Z'),
  ('f73eea6d-24b5-5865-b388-e15b966dcb73', 'ريم الشهري', 'متدربة – التصوير بالجوال', 'دورة أونلاين مرتبة وجلساتها مسجلة وهذا ساعدني أراجع وقت ما أبي. صرت ألتقط صور محتوى أفضل بكثير.', 5, 'google', null, false, true, '2026-05-15', '2026-08-31T00:00:00.000Z', '2026-08-31T00:00:00.000Z')
on conflict (id) do update set name = excluded.name, role = excluded.role, review = excluded.review, rating = excluded.rating, source = excluded.source, source_url = excluded.source_url, featured = excluded.featured, visible = excluded.visible, reviewed_at = excluded.reviewed_at
where (testimonials.name, testimonials.role, testimonials.review, testimonials.rating, testimonials.source, testimonials.source_url, testimonials.featured, testimonials.visible, testimonials.reviewed_at) is distinct from (excluded.name, excluded.role, excluded.review, excluded.rating, excluded.source, excluded.source_url, excluded.featured, excluded.visible, excluded.reviewed_at);

insert into public.blog_posts (id, slug, title, excerpt, cover_path, cover_alt, category, author_id, publish_status, published_at, seo_title, seo_description, created_at, updated_at) values
  ('d98bc3f0-4c7c-52ad-8fd4-ff92b76e327c', 'choose-your-first-camera', 'كيف تختار كاميرتك الأولى؟', 'دليل مبسط يشرح الفرق بين أنواع الكاميرات، وأهم الأسئلة التي يجب أن تطرحها على نفسك قبل الشراء بدلاً من الانسياق وراء المواصفات.', '/images/course-fundamentals.jpg', 'كاميرا احترافية مناسبة للمبتدئين', 'نصائح للمبتدئين', null, 'published', '2026-08-12T00:00:00.000Z', 'كيف تختار كاميرتك الأولى؟', 'دليل مبسط يشرح الفرق بين أنواع الكاميرات، وأهم الأسئلة التي يجب أن تطرحها على نفسك قبل الشراء بدلاً من الانسياق وراء المواصفات.', '2026-08-31T00:00:00.000Z', '2026-08-31T00:00:00.000Z'),
  ('151ae6d5-bb87-5afb-bb89-768e192950e4', 'rule-of-thirds-composition', 'قاعدة الأثلاث: أساس الصورة المقنعة', 'أشهر قاعدة في التكوين الفوتوغرافي تُشرح بأمثلة عملية: متى تستخدمها، ومتى تكسرها بوعي لتحصل على صورة مميزة.', '/images/course-portrait.jpg', 'صورة بورتريه توضح قاعدة الأثلاث في التكوين', 'التكوين', null, 'published', '2026-07-30T00:00:00.000Z', 'قاعدة الأثلاث: أساس الصورة المقنعة', 'أشهر قاعدة في التكوين الفوتوغرافي تُشرح بأمثلة عملية: متى تستخدمها، ومتى تكسرها بوعي لتحصل على صورة مميزة.', '2026-08-31T00:00:00.000Z', '2026-08-31T00:00:00.000Z'),
  ('d0ff2d6e-26fe-5a7e-bc2e-3e71eaa856e1', 'natural-vs-studio-light', 'الإضاءة الطبيعية أم الاستوديوهية؟', 'مقارنة عملية بين خياري الإضاءة الأساسيين: مميزات كل خيار، تحدياته، وكيف تختار الأنسب حسب نوع مشروعك.', '/images/course-lighting.jpg', 'معدات إضاءة استوديو بجانب نافذة بإضاءة طبيعية', 'الإضاءة', null, 'published', '2026-07-14T00:00:00.000Z', 'الإضاءة الطبيعية أم الاستوديوهية؟', 'مقارنة عملية بين خياري الإضاءة الأساسيين: مميزات كل خيار، تحدياته، وكيف تختار الأنسب حسب نوع مشروعك.', '2026-08-31T00:00:00.000Z', '2026-08-31T00:00:00.000Z'),
  ('0934ef13-a791-5ec7-9e83-c50e3faac228', 'common-beginner-mistakes', '5 أخطاء شائعة لدى المصورين المبتدئين', 'أخطاء نتلقاها في كل دورة تأسيسية، وكيف تتجنبها من اليوم الأول: من الاعتماد على الأوضوت التلقائية إلى إهمال الخلفية.', '/images/category-individuals.jpg', 'متدرب يتعلم أساسيات التصوير في ورشة عملية', 'نصائح للمبتدئين', null, 'published', '2026-06-25T00:00:00.000Z', '5 أخطاء شائعة لدى المصورين المبتدئين', 'أخطاء نتلقاها في كل دورة تأسيسية، وكيف تتجنبها من اليوم الأول: من الاعتماد على الأوضوت التلقائية إلى إهمال الخلفية.', '2026-08-31T00:00:00.000Z', '2026-08-31T00:00:00.000Z'),
  ('4096ec0b-826d-52ba-868a-6a32d35389a2', 'build-your-first-portfolio', 'كيف تبني معرض أعمالك الأول؟', 'معرض الأعمال هو بطاقة تعريفك كمصور. في هذا المقال نشرح كيف تبني ملفاً متماسكاً بقوة، حتى بمشاريع معدودة.', '/images/path-photography.jpg', 'مصور يراجع أعماله لبناء معرض أعماله الأول', 'المسار المهني', null, 'published', '2026-06-08T00:00:00.000Z', 'كيف تبني معرض أعمالك الأول؟', 'معرض الأعمال هو بطاقة تعريفك كمصور. في هذا المقال نشرح كيف تبني ملفاً متماسكاً بقوة، حتى بمشاريع معدودة.', '2026-08-31T00:00:00.000Z', '2026-08-31T00:00:00.000Z'),
  ('215970fb-b75d-5a03-9dea-4d9ddba3ae31', 'shooting-modes-explained', 'أوضاع التصوير: متى تستخدم كل وضع؟', 'Auto وProgram وAperture Priority وShutter Priority وManual: دليل مرجعي سريع يوضح متى يكون كل وضع هو الخيار الصحيح.', '/images/course-products.jpg', 'قرص أوضاع التصوير في كاميرا احترافية', 'أساسيات', null, 'published', '2026-05-20T00:00:00.000Z', 'أوضاع التصوير: متى تستخدم كل وضع؟', 'Auto وProgram وAperture Priority وShutter Priority وManual: دليل مرجعي سريع يوضح متى يكون كل وضع هو الخيار الصحيح.', '2026-08-31T00:00:00.000Z', '2026-08-31T00:00:00.000Z')
on conflict (id) do update set slug = excluded.slug, title = excluded.title, excerpt = excluded.excerpt, cover_path = excluded.cover_path, cover_alt = excluded.cover_alt, category = excluded.category, author_id = excluded.author_id, publish_status = excluded.publish_status, published_at = excluded.published_at, seo_title = excluded.seo_title, seo_description = excluded.seo_description
where (blog_posts.slug, blog_posts.title, blog_posts.excerpt, blog_posts.cover_path, blog_posts.cover_alt, blog_posts.category, blog_posts.author_id, blog_posts.publish_status, blog_posts.published_at, blog_posts.seo_title, blog_posts.seo_description) is distinct from (excluded.slug, excluded.title, excluded.excerpt, excluded.cover_path, excluded.cover_alt, excluded.category, excluded.author_id, excluded.publish_status, excluded.published_at, excluded.seo_title, excluded.seo_description);

insert into public.blog_content_blocks (id, post_id, block_type, content, sort_order, created_at, updated_at) values
  ('363c3856-cc6d-5d1c-8329-780879867c67', 'd98bc3f0-4c7c-52ad-8fd4-ff92b76e327c', 'paragraph', '{"text":"دليل مبسط يشرح الفرق بين أنواع الكاميرات، وأهم الأسئلة التي يجب أن تطرحها على نفسك قبل الشراء بدلاً من الانسياق وراء المواصفات."}'::jsonb, 0, '2026-08-31T00:00:00.000Z', '2026-08-31T00:00:00.000Z'),
  ('e05aa3ac-d737-55a9-bf40-58742cb2475b', 'd98bc3f0-4c7c-52ad-8fd4-ff92b76e327c', 'heading', '{"text":"ثلاثة أسئلة تحدد كاميرتك المناسبة"}'::jsonb, 1, '2026-08-31T00:00:00.000Z', '2026-08-31T00:00:00.000Z'),
  ('0c5e2a9c-165e-58e4-a263-d71794a05d7a', 'd98bc3f0-4c7c-52ad-8fd4-ff92b76e327c', 'paragraph', '{"text":"في هذا المقال نأخذك خطوة بخطوة عبر أهم النقاط العملية التي تحتاجها، بأمثلة من تدريباتنا المباشرة داخل المركز، وبأسلوب مبسط يركّز على الفهم قبل الأدوات."}'::jsonb, 2, '2026-08-31T00:00:00.000Z', '2026-08-31T00:00:00.000Z'),
  ('1d4accd1-1e64-5eb0-b393-588629829fc5', 'd98bc3f0-4c7c-52ad-8fd4-ff92b76e327c', 'quote', '{"text":"أفضل كاميرا هي التي تحملها فعلًا — اختر ما يخدم استمرارك في التصوير لا ما يبهرك في المواصفات."}'::jsonb, 3, '2026-08-31T00:00:00.000Z', '2026-08-31T00:00:00.000Z'),
  ('7bf60cdc-84f1-57c6-a6d5-88696f4da049', 'd98bc3f0-4c7c-52ad-8fd4-ff92b76e327c', 'list', '{"items":["حدد ميزانيتك الشاملة مع عدسة إضافية إن أمكن","جرّب الكاميرا بيدك قبل الشراء إن استطعت","تأكد من توفر خدمة الصيانة محليًا"]}'::jsonb, 4, '2026-08-31T00:00:00.000Z', '2026-08-31T00:00:00.000Z'),
  ('f9f4ac09-bea0-5383-b17d-87a0071b84fb', 'd98bc3f0-4c7c-52ad-8fd4-ff92b76e327c', 'paragraph', '{"text":"طبّق ما تقرأه فورًا بكاميرتك أو جوالك؛ فالتصوير مهارة تُبنى بالتكرار الواعي أكثر من كثرة المعلومات. وإذا أردت التعمق في «كيف تختار كاميرتك الأولى؟» تجد دوراتنا التدريبية المصنفة حسب المستوى في صفحة الدورات، أو تواصل معنا وسنرشدك للأنسب."}'::jsonb, 5, '2026-08-31T00:00:00.000Z', '2026-08-31T00:00:00.000Z'),
  ('cbdade90-7e19-59e2-97fd-80cdeb081436', '151ae6d5-bb87-5afb-bb89-768e192950e4', 'paragraph', '{"text":"أشهر قاعدة في التكوين الفوتوغرافي تُشرح بأمثلة عملية: متى تستخدمها، ومتى تكسرها بوعي لتحصل على صورة مميزة."}'::jsonb, 0, '2026-08-31T00:00:00.000Z', '2026-08-31T00:00:00.000Z'),
  ('3e916acb-d98e-52a2-be29-397fababa30f', '151ae6d5-bb87-5afb-bb89-768e192950e4', 'paragraph', '{"text":"في هذا المقال نأخذك خطوة بخطوة عبر أهم النقاط العملية التي تحتاجها، بأمثلة من تدريباتنا المباشرة داخل المركز، وبأسلوب مبسط يركّز على الفهم قبل الأدوات."}'::jsonb, 1, '2026-08-31T00:00:00.000Z', '2026-08-31T00:00:00.000Z'),
  ('e9ad3d0f-5c02-5fd5-b4b4-a1efa0abe9a5', '151ae6d5-bb87-5afb-bb89-768e192950e4', 'paragraph', '{"text":"طبّق ما تقرأه فورًا بكاميرتك أو جوالك؛ فالتصوير مهارة تُبنى بالتكرار الواعي أكثر من كثرة المعلومات. وإذا أردت التعمق في «قاعدة الأثلاث: أساس الصورة المقنعة» تجد دوراتنا التدريبية المصنفة حسب المستوى في صفحة الدورات، أو تواصل معنا وسنرشدك للأنسب."}'::jsonb, 2, '2026-08-31T00:00:00.000Z', '2026-08-31T00:00:00.000Z'),
  ('73242e00-b6a2-5c0e-914f-b6d7b0aac892', 'd0ff2d6e-26fe-5a7e-bc2e-3e71eaa856e1', 'paragraph', '{"text":"مقارنة عملية بين خياري الإضاءة الأساسيين: مميزات كل خيار، تحدياته، وكيف تختار الأنسب حسب نوع مشروعك."}'::jsonb, 0, '2026-08-31T00:00:00.000Z', '2026-08-31T00:00:00.000Z'),
  ('9e94edd1-c08e-5a70-9d91-1debda63c801', 'd0ff2d6e-26fe-5a7e-bc2e-3e71eaa856e1', 'paragraph', '{"text":"في هذا المقال نأخذك خطوة بخطوة عبر أهم النقاط العملية التي تحتاجها، بأمثلة من تدريباتنا المباشرة داخل المركز، وبأسلوب مبسط يركّز على الفهم قبل الأدوات."}'::jsonb, 1, '2026-08-31T00:00:00.000Z', '2026-08-31T00:00:00.000Z'),
  ('a86e4dd4-953d-5474-aa64-fc9056aba6f5', 'd0ff2d6e-26fe-5a7e-bc2e-3e71eaa856e1', 'paragraph', '{"text":"طبّق ما تقرأه فورًا بكاميرتك أو جوالك؛ فالتصوير مهارة تُبنى بالتكرار الواعي أكثر من كثرة المعلومات. وإذا أردت التعمق في «الإضاءة الطبيعية أم الاستوديوهية؟» تجد دوراتنا التدريبية المصنفة حسب المستوى في صفحة الدورات، أو تواصل معنا وسنرشدك للأنسب."}'::jsonb, 2, '2026-08-31T00:00:00.000Z', '2026-08-31T00:00:00.000Z'),
  ('bb8da9e5-ce36-5767-b989-8009209971d3', '0934ef13-a791-5ec7-9e83-c50e3faac228', 'paragraph', '{"text":"أخطاء نتلقاها في كل دورة تأسيسية، وكيف تتجنبها من اليوم الأول: من الاعتماد على الأوضوت التلقائية إلى إهمال الخلفية."}'::jsonb, 0, '2026-08-31T00:00:00.000Z', '2026-08-31T00:00:00.000Z'),
  ('aa9d21aa-d771-5cec-8644-e19c927702df', '0934ef13-a791-5ec7-9e83-c50e3faac228', 'paragraph', '{"text":"في هذا المقال نأخذك خطوة بخطوة عبر أهم النقاط العملية التي تحتاجها، بأمثلة من تدريباتنا المباشرة داخل المركز، وبأسلوب مبسط يركّز على الفهم قبل الأدوات."}'::jsonb, 1, '2026-08-31T00:00:00.000Z', '2026-08-31T00:00:00.000Z'),
  ('5d265265-82e9-51fa-826c-4b4176d8acc9', '0934ef13-a791-5ec7-9e83-c50e3faac228', 'paragraph', '{"text":"طبّق ما تقرأه فورًا بكاميرتك أو جوالك؛ فالتصوير مهارة تُبنى بالتكرار الواعي أكثر من كثرة المعلومات. وإذا أردت التعمق في «5 أخطاء شائعة لدى المصورين المبتدئين» تجد دوراتنا التدريبية المصنفة حسب المستوى في صفحة الدورات، أو تواصل معنا وسنرشدك للأنسب."}'::jsonb, 2, '2026-08-31T00:00:00.000Z', '2026-08-31T00:00:00.000Z'),
  ('80236fe6-b319-5ef0-9bfc-e043461a0e79', '4096ec0b-826d-52ba-868a-6a32d35389a2', 'paragraph', '{"text":"معرض الأعمال هو بطاقة تعريفك كمصور. في هذا المقال نشرح كيف تبني ملفاً متماسكاً بقوة، حتى بمشاريع معدودة."}'::jsonb, 0, '2026-08-31T00:00:00.000Z', '2026-08-31T00:00:00.000Z'),
  ('e4b11ef8-ad1b-5578-851b-9b20f5cb9b81', '4096ec0b-826d-52ba-868a-6a32d35389a2', 'paragraph', '{"text":"في هذا المقال نأخذك خطوة بخطوة عبر أهم النقاط العملية التي تحتاجها، بأمثلة من تدريباتنا المباشرة داخل المركز، وبأسلوب مبسط يركّز على الفهم قبل الأدوات."}'::jsonb, 1, '2026-08-31T00:00:00.000Z', '2026-08-31T00:00:00.000Z'),
  ('7bde314c-23ba-5523-baaf-844506235a03', '4096ec0b-826d-52ba-868a-6a32d35389a2', 'paragraph', '{"text":"طبّق ما تقرأه فورًا بكاميرتك أو جوالك؛ فالتصوير مهارة تُبنى بالتكرار الواعي أكثر من كثرة المعلومات. وإذا أردت التعمق في «كيف تبني معرض أعمالك الأول؟» تجد دوراتنا التدريبية المصنفة حسب المستوى في صفحة الدورات، أو تواصل معنا وسنرشدك للأنسب."}'::jsonb, 2, '2026-08-31T00:00:00.000Z', '2026-08-31T00:00:00.000Z'),
  ('002ab030-4fce-57ca-96c2-b30402b59015', '215970fb-b75d-5a03-9dea-4d9ddba3ae31', 'paragraph', '{"text":"Auto وProgram وAperture Priority وShutter Priority وManual: دليل مرجعي سريع يوضح متى يكون كل وضع هو الخيار الصحيح."}'::jsonb, 0, '2026-08-31T00:00:00.000Z', '2026-08-31T00:00:00.000Z'),
  ('da74f13c-8589-5fc5-87ad-95c59a1b8eec', '215970fb-b75d-5a03-9dea-4d9ddba3ae31', 'paragraph', '{"text":"في هذا المقال نأخذك خطوة بخطوة عبر أهم النقاط العملية التي تحتاجها، بأمثلة من تدريباتنا المباشرة داخل المركز، وبأسلوب مبسط يركّز على الفهم قبل الأدوات."}'::jsonb, 1, '2026-08-31T00:00:00.000Z', '2026-08-31T00:00:00.000Z'),
  ('b2487567-2122-5ebd-9a15-d3eb8808a0aa', '215970fb-b75d-5a03-9dea-4d9ddba3ae31', 'paragraph', '{"text":"طبّق ما تقرأه فورًا بكاميرتك أو جوالك؛ فالتصوير مهارة تُبنى بالتكرار الواعي أكثر من كثرة المعلومات. وإذا أردت التعمق في «أوضاع التصوير: متى تستخدم كل وضع؟» تجد دوراتنا التدريبية المصنفة حسب المستوى في صفحة الدورات، أو تواصل معنا وسنرشدك للأنسب."}'::jsonb, 2, '2026-08-31T00:00:00.000Z', '2026-08-31T00:00:00.000Z')
on conflict (id) do update set post_id = excluded.post_id, block_type = excluded.block_type, content = excluded.content, sort_order = excluded.sort_order
where (blog_content_blocks.post_id, blog_content_blocks.block_type, blog_content_blocks.content, blog_content_blocks.sort_order) is distinct from (excluded.post_id, excluded.block_type, excluded.content, excluded.sort_order);

insert into public.blog_tags (id, name, slug) values
  ('2056dbfc-ffd3-5883-ba43-2a3c4fd1995a', 'نصائح للمبتدئين', 'beginner-tips'),
  ('66deb03b-b1ea-5be0-9a6d-1f4b1952e1ac', 'بيت المصور', 'bayt-almosawer'),
  ('9344dc97-aeef-5557-8540-25a9235f53f2', 'التكوين', 'composition'),
  ('f833e2e6-00eb-5c6d-b263-163d2c3f089a', 'الإضاءة', 'lighting'),
  ('8ea38a9e-9e4b-52ab-bade-ea6ae44ad536', 'المسار المهني', 'career-path'),
  ('d403921f-e75a-5e44-8923-864135604cd6', 'أساسيات', 'fundamentals')
on conflict (id) do update set name = excluded.name, slug = excluded.slug
where (blog_tags.name, blog_tags.slug) is distinct from (excluded.name, excluded.slug);

insert into public.blog_post_tags (post_id, tag_id, created_at) values
  ('d98bc3f0-4c7c-52ad-8fd4-ff92b76e327c', '2056dbfc-ffd3-5883-ba43-2a3c4fd1995a', '2026-08-31T00:00:00.000Z'),
  ('d98bc3f0-4c7c-52ad-8fd4-ff92b76e327c', '66deb03b-b1ea-5be0-9a6d-1f4b1952e1ac', '2026-08-31T00:00:00.000Z'),
  ('151ae6d5-bb87-5afb-bb89-768e192950e4', '9344dc97-aeef-5557-8540-25a9235f53f2', '2026-08-31T00:00:00.000Z'),
  ('151ae6d5-bb87-5afb-bb89-768e192950e4', '66deb03b-b1ea-5be0-9a6d-1f4b1952e1ac', '2026-08-31T00:00:00.000Z'),
  ('d0ff2d6e-26fe-5a7e-bc2e-3e71eaa856e1', 'f833e2e6-00eb-5c6d-b263-163d2c3f089a', '2026-08-31T00:00:00.000Z'),
  ('d0ff2d6e-26fe-5a7e-bc2e-3e71eaa856e1', '66deb03b-b1ea-5be0-9a6d-1f4b1952e1ac', '2026-08-31T00:00:00.000Z'),
  ('0934ef13-a791-5ec7-9e83-c50e3faac228', '2056dbfc-ffd3-5883-ba43-2a3c4fd1995a', '2026-08-31T00:00:00.000Z'),
  ('0934ef13-a791-5ec7-9e83-c50e3faac228', '66deb03b-b1ea-5be0-9a6d-1f4b1952e1ac', '2026-08-31T00:00:00.000Z'),
  ('4096ec0b-826d-52ba-868a-6a32d35389a2', '8ea38a9e-9e4b-52ab-bade-ea6ae44ad536', '2026-08-31T00:00:00.000Z'),
  ('4096ec0b-826d-52ba-868a-6a32d35389a2', '66deb03b-b1ea-5be0-9a6d-1f4b1952e1ac', '2026-08-31T00:00:00.000Z'),
  ('215970fb-b75d-5a03-9dea-4d9ddba3ae31', 'd403921f-e75a-5e44-8923-864135604cd6', '2026-08-31T00:00:00.000Z'),
  ('215970fb-b75d-5a03-9dea-4d9ddba3ae31', '66deb03b-b1ea-5be0-9a6d-1f4b1952e1ac', '2026-08-31T00:00:00.000Z')
on conflict (post_id, tag_id) do nothing;

insert into public.media (id, bucket, storage_path, file_name, mime_type, size_bytes, alt_text, caption, width, height, uploaded_by, created_at, updated_at) values
  ('16854b09-bf40-55c2-adb3-bb09c5eb2510', 'bm-media', 'homepage/31ab18fe-e41d-5f49-850e-6db84b4238e8.jpg', 'hero.jpg', 'image/jpeg', 77419, 'مصور محترف يحمل كاميرته داخل استوديو التصوير في بيت المصور', null, 1344, 768, null, '2026-08-01T09:00:00.000Z', '2026-08-01T09:00:00.000Z'),
  ('0a6d8245-c5af-5be4-997a-9e80702cb3ee', 'bm-media', 'site/6ccb0a2d-5db3-53f7-b99d-fe738a67797b.jpg', 'about-studio.jpg', 'image/jpeg', 97394, 'استوديو بيت المصور للتدريب على التصوير في جدة', null, 1344, 768, null, '2026-08-02T09:00:00.000Z', '2026-08-02T09:00:00.000Z'),
  ('53e3f348-c964-5841-997c-ca25f6daa728', 'bm-media', 'courses/ae7ad6bc-c797-5f99-ae0e-8f79bc032cde.jpg', 'corporate-training.jpg', 'image/jpeg', 105519, 'فريق عمل يحضر برنامجاً تدريبياً على التصوير في مقر الشركة', null, 1344, 768, null, '2026-08-03T09:00:00.000Z', '2026-08-03T09:00:00.000Z'),
  ('fb655eec-fc61-5c02-8ca5-53a2cb93bac3', 'bm-media', 'courses/4f3c79be-15a2-5fa7-9322-93e3e3197e53.jpg', 'course-fundamentals.jpg', 'image/jpeg', 118713, 'كاميرا احترافية على طاولة تدريب', null, 1344, 768, null, '2026-08-04T09:00:00.000Z', '2026-08-04T09:00:00.000Z'),
  ('090f98bf-b851-514d-a0c5-6ef1cef2422d', 'bm-media', 'courses/b87da101-640f-51b6-96f4-a21da976f7d0.jpg', 'course-lighting.jpg', 'image/jpeg', 111274, 'معدات إضاءة استوديو', null, 1344, 768, null, '2026-08-05T09:00:00.000Z', '2026-08-05T09:00:00.000Z'),
  ('873b3e07-7724-553b-a99b-ba52388d6f01', 'bm-media', 'courses/1eb47154-9648-5556-8128-089df9330ede.jpg', 'course-portrait.jpg', 'image/jpeg', 55802, 'جلسة تصوير بورتريه', null, 1344, 768, null, '2026-08-06T09:00:00.000Z', '2026-08-06T09:00:00.000Z'),
  ('dd746624-8f90-5b6a-9829-66b1cb16db98', 'bm-media', 'courses/91a2f16d-dc24-5cfd-8495-191285a4ac16.jpg', 'course-products.jpg', 'image/jpeg', 88900, 'طاولة تصوير منتجات', null, 1344, 768, null, '2026-08-07T09:00:00.000Z', '2026-08-07T09:00:00.000Z'),
  ('c8e4416f-cc47-5f6c-86fa-b30934e682aa', 'bm-media', 'courses/20c50024-25e7-522d-8b8f-d647a5d06dda.jpg', 'course-mobile.jpg', 'image/jpeg', 67882, 'تصوير احترافي بالجوال', null, 1344, 768, null, '2026-08-08T09:00:00.000Z', '2026-08-08T09:00:00.000Z'),
  ('b8c66ff9-9134-5ee5-807a-e4a8be9b1a53', 'bm-media', 'courses/810f1f99-1dc2-5b69-acc4-c82a8944e3d9.jpg', 'course-editing.jpg', 'image/jpeg', 69715, 'شاشة تحرير فيديو', null, 1344, 768, null, '2026-08-09T09:00:00.000Z', '2026-08-09T09:00:00.000Z'),
  ('006021c8-3283-56ea-95b0-513e3da98b83', 'bm-media', 'courses/2c190f10-d2bd-587a-b8ca-e3c7a31defb2.jpg', 'course-video.jpg', 'image/jpeg', 75625, 'كاميرا سينمائية على ستيدي', null, 1344, 768, null, '2026-08-10T09:00:00.000Z', '2026-08-10T09:00:00.000Z'),
  ('03299025-2fe3-5160-aec0-c6c7975cd988', 'bm-media', 'paths/0aaf0357-3e54-5f08-8b1a-ce1138cf3dcb.jpg', 'path-photography.jpg', 'image/jpeg', 84775, 'مسار التصوير الفوتوغرافي الاحترافي في بيت المصور', null, 1344, 768, null, '2026-08-11T09:00:00.000Z', '2026-08-11T09:00:00.000Z'),
  ('3c2dab69-4ed5-5eb5-aaa4-0a6676989f68', 'bm-media', 'paths/4a0b4641-43ad-5c39-9e19-9c9fb812c5f0.jpg', 'path-content.jpg', 'image/jpeg', 69447, 'مسار صناعة المحتوى والفيديو في بيت المصور', null, 1344, 768, null, '2026-08-12T09:00:00.000Z', '2026-08-12T09:00:00.000Z'),
  ('77a6c200-7f7b-5d77-aec8-2b331c895cb6', 'bm-media', 'homepage/2bffe463-e9b9-52df-b60c-73c10f3cb41d.jpg', 'category-individuals.jpg', 'image/jpeg', 104838, 'مجموعة صغيرة من المتدربين في ورشة تصوير حضورية', null, 1152, 864, null, '2026-08-13T09:00:00.000Z', '2026-08-13T09:00:00.000Z'),
  ('99b99b48-1b0e-51d2-854f-9ffda7397a73', 'bm-media', 'site/7339ba9a-591d-5f61-84de-faf73813a109.png', 'logo.png', 'image/png', 807963, 'شعار بيت المصور', 'الشعار الرسمي للمركز بخلفية شفافة', 1254, 1254, null, '2026-08-14T09:00:00.000Z', '2026-08-14T09:00:00.000Z')
on conflict (id) do update set bucket = excluded.bucket, storage_path = excluded.storage_path, file_name = excluded.file_name, mime_type = excluded.mime_type, size_bytes = excluded.size_bytes, alt_text = excluded.alt_text, caption = excluded.caption, width = excluded.width, height = excluded.height, uploaded_by = excluded.uploaded_by
where (media.bucket, media.storage_path, media.file_name, media.mime_type, media.size_bytes, media.alt_text, media.caption, media.width, media.height, media.uploaded_by) is distinct from (excluded.bucket, excluded.storage_path, excluded.file_name, excluded.mime_type, excluded.size_bytes, excluded.alt_text, excluded.caption, excluded.width, excluded.height, excluded.uploaded_by);

insert into public.homepage_sections (section_key, enabled, sort_order, updated_at) values
  ('hero', true, 0, '2026-08-31T00:00:00.000Z'),
  ('statistics', true, 1, '2026-08-31T00:00:00.000Z'),
  ('upcoming-course', true, 2, '2026-08-31T00:00:00.000Z'),
  ('course-categories', true, 3, '2026-08-31T00:00:00.000Z'),
  ('featured-courses', true, 4, '2026-08-31T00:00:00.000Z'),
  ('why-us', true, 5, '2026-08-31T00:00:00.000Z'),
  ('accreditations', true, 6, '2026-08-31T00:00:00.000Z'),
  ('partners', true, 7, '2026-08-31T00:00:00.000Z'),
  ('testimonials', true, 8, '2026-08-31T00:00:00.000Z'),
  ('cta', true, 9, '2026-08-31T00:00:00.000Z')
on conflict (section_key) do update set enabled = excluded.enabled, sort_order = excluded.sort_order
where (homepage_sections.enabled, homepage_sections.sort_order) is distinct from (excluded.enabled, excluded.sort_order);

insert into public.homepage_hero (id, title, description, primary_cta_text, primary_cta_url, secondary_cta_text, secondary_cta_url, image_path, image_alt, updated_at) values
  (1, 'من الشغف إلى الاحتراف', 'دورات تدريبية متخصصة في التصوير الفوتوغرافي والفيديو وصناعة المحتوى، يقدمها مدربون محترفون بأسلوب عملي يأخذك من الأساسيات إلى مستوى الاحتراف.', 'احجز دورتك الآن', '/courses', 'استكشف الدورات', '/courses', '/images/hero.jpg', 'مصور محترف يحمل كاميرته داخل استوديو التصوير في بيت المصور', '2026-08-31T00:00:00.000Z')
on conflict (id) do update set title = excluded.title, description = excluded.description, primary_cta_text = excluded.primary_cta_text, primary_cta_url = excluded.primary_cta_url, secondary_cta_text = excluded.secondary_cta_text, secondary_cta_url = excluded.secondary_cta_url, image_path = excluded.image_path, image_alt = excluded.image_alt
where (homepage_hero.title, homepage_hero.description, homepage_hero.primary_cta_text, homepage_hero.primary_cta_url, homepage_hero.secondary_cta_text, homepage_hero.secondary_cta_url, homepage_hero.image_path, homepage_hero.image_alt) is distinct from (excluded.title, excluded.description, excluded.primary_cta_text, excluded.primary_cta_url, excluded.secondary_cta_text, excluded.secondary_cta_url, excluded.image_path, excluded.image_alt);

insert into public.homepage_statistics (id, label, value, prefix, suffix, enabled, sort_order, created_at, updated_at) values
  ('0a9082cf-7ec2-570c-96f9-74cd6679e80f', 'متدرب', 4500, null, '+', true, 0, '2026-08-31T00:00:00.000Z', '2026-08-31T00:00:00.000Z'),
  ('629082cb-9360-5f1d-9a91-d4ecf5c9e77e', 'دورة تدريبية', 120, null, '+', true, 1, '2026-08-31T00:00:00.000Z', '2026-08-31T00:00:00.000Z'),
  ('6de9102c-237d-5f9c-a1df-4f587676da1b', 'سنوات خبرة', 8, null, '+', true, 2, '2026-08-31T00:00:00.000Z', '2026-08-31T00:00:00.000Z'),
  ('aea38652-3b2a-539f-9c21-8af3f6cdfb75', 'جهة وشريك', 25, null, '+', true, 3, '2026-08-31T00:00:00.000Z', '2026-08-31T00:00:00.000Z')
on conflict (id) do update set label = excluded.label, value = excluded.value, prefix = excluded.prefix, suffix = excluded.suffix, enabled = excluded.enabled, sort_order = excluded.sort_order
where (homepage_statistics.label, homepage_statistics.value, homepage_statistics.prefix, homepage_statistics.suffix, homepage_statistics.enabled, homepage_statistics.sort_order) is distinct from (excluded.label, excluded.value, excluded.prefix, excluded.suffix, excluded.enabled, excluded.sort_order);

insert into public.homepage_upcoming_course (id, mode, manual_course_id, manual_session_id, updated_at) values
  (1, 'automatic', null, null, '2026-08-31T00:00:00.000Z')
on conflict (id) do update set mode = excluded.mode, manual_course_id = excluded.manual_course_id, manual_session_id = excluded.manual_session_id
where (homepage_upcoming_course.mode, homepage_upcoming_course.manual_course_id, homepage_upcoming_course.manual_session_id) is distinct from (excluded.mode, excluded.manual_course_id, excluded.manual_session_id);

insert into public.homepage_categories (id, category_key, title, short_description, image_path, image_alt, cta_label, enabled, sort_order, created_at, updated_at) values
  ('39d8da64-c7c7-5e95-9d07-395db9afbb12', 'in-person-individuals', 'حضوري أفراد', 'دورات عملية داخل مقر المركز في جدة بمجموعات صغيرة، مع تطبيق مباشر على أرض الواقع وإشراف مباشر من المدرب.', '/images/category-individuals.jpg', 'مجموعة صغيرة من المتدربين في ورشة تصوير حضورية', 'استكشف الدورات', true, 0, '2026-08-31T00:00:00.000Z', '2026-08-31T00:00:00.000Z'),
  ('266fe871-3a67-576e-b097-191faea22131', 'in-person-corporates', 'حضوري شركات', 'برامج تدريبية مصممة خصيصاً لفرق العمل والجهات، تُنفَّذ في مقر المركز أو مقر الجهة حسب احتياجها.', '/images/category-corporates.jpg', 'فريق شركة في برنامج تدريبي على صناعة المحتوى', 'استكشف الدورات', true, 1, '2026-08-31T00:00:00.000Z', '2026-08-31T00:00:00.000Z'),
  ('8ff3e2fa-b572-56c6-9e6a-fcf35a1fb9c8', 'online', 'أونلاين', 'دورات عن بُعد بجلسات مباشرة ومحتوى مسجل، تتيح لك التعلّم في الوقت المناسب لك من أي مكان.', '/images/category-online.jpg', 'متدرب يتابع دورة تصوير أونلاين عبر الحاسوب', 'استكشف الدورات', true, 2, '2026-08-31T00:00:00.000Z', '2026-08-31T00:00:00.000Z'),
  ('d20cd842-aed2-5faa-be7e-b8bd6de8c313', 'private', 'برايفت', 'تدريب فردي بإشراف مباشر، يُبنى المحتوى حول مستواك وهدفك سواء كنت مبتدئاً أو ترغب بتطوير مهارة محددة.', '/images/category-private.jpg', 'تدريب فردي على التصوير بإشراف مباشر من مدرب', 'استكشف الدورات', true, 3, '2026-08-31T00:00:00.000Z', '2026-08-31T00:00:00.000Z')
on conflict (id) do update set category_key = excluded.category_key, title = excluded.title, short_description = excluded.short_description, image_path = excluded.image_path, image_alt = excluded.image_alt, cta_label = excluded.cta_label, enabled = excluded.enabled, sort_order = excluded.sort_order
where (homepage_categories.category_key, homepage_categories.title, homepage_categories.short_description, homepage_categories.image_path, homepage_categories.image_alt, homepage_categories.cta_label, homepage_categories.enabled, homepage_categories.sort_order) is distinct from (excluded.category_key, excluded.title, excluded.short_description, excluded.image_path, excluded.image_alt, excluded.cta_label, excluded.enabled, excluded.sort_order);

insert into public.homepage_featured_courses (id, mode, updated_at) values
  (1, 'automatic', '2026-08-31T00:00:00.000Z')
on conflict (id) do update set mode = excluded.mode
where (homepage_featured_courses.mode) is distinct from (excluded.mode);

insert into public.homepage_why_us (id, title, description, updated_at) values
  (1, 'لماذا بيت المصور؟', 'ما يميز تجربة التدريب معنا: تفاصيل صغيرة تصنع فرقًا كبيرًا في نتيجتك.', '2026-08-31T00:00:00.000Z')
on conflict (id) do update set title = excluded.title, description = excluded.description
where (homepage_why_us.title, homepage_why_us.description) is distinct from (excluded.title, excluded.description);

insert into public.homepage_why_us_items (id, title, description, icon_key, enabled, sort_order, created_at, updated_at) values
  ('1245e2ee-f82c-56a1-8a2e-572bc5925a8c', 'تطبيق عملي مباشر', 'كل تدريب يعتمد على تنفيذ فعلي بالكاميرا، لا مجرد محاضرات نظرية.', 'lightbulb', true, 0, '2026-08-31T00:00:00.000Z', '2026-08-31T00:00:00.000Z'),
  ('fb9a75f0-e22d-5aca-be25-a51833d3e9c9', 'مجموعات صغيرة', 'مقاعد محدودة لكل دفعة لضمان إشراف فردي ووقت كافٍ لكل متدرب.', 'users', true, 1, '2026-08-31T00:00:00.000Z', '2026-08-31T00:00:00.000Z'),
  ('f45e070e-de87-59bc-a375-739b6d42a4c8', 'مدربون ممارسون', 'يدربك محترفون يعملون فعليًا في السوق ويشاركون تجربتهم اليومية.', 'graduation', true, 2, '2026-08-31T00:00:00.000Z', '2026-08-31T00:00:00.000Z')
on conflict (id) do update set title = excluded.title, description = excluded.description, icon_key = excluded.icon_key, enabled = excluded.enabled, sort_order = excluded.sort_order
where (homepage_why_us_items.title, homepage_why_us_items.description, homepage_why_us_items.icon_key, homepage_why_us_items.enabled, homepage_why_us_items.sort_order) is distinct from (excluded.title, excluded.description, excluded.icon_key, excluded.enabled, excluded.sort_order);

insert into public.homepage_testimonials (id, title, description, mode, updated_at) values
  (1, 'ماذا قالوا عن تجربتهم معنا', 'نماذج من تقييمات المتدربين — الوضع التلقائي يعرض التقييمات المميزة (Featured).', 'automatic', '2026-08-31T00:00:00.000Z')
on conflict (id) do update set title = excluded.title, description = excluded.description, mode = excluded.mode
where (homepage_testimonials.title, homepage_testimonials.description, homepage_testimonials.mode) is distinct from (excluded.title, excluded.description, excluded.mode);

insert into public.homepage_accreditations (id, name, logo_path, url, description, visible, sort_order, created_at, updated_at) values
  ('055d9ee7-817d-5863-86cc-5ef3f214b3a8', 'وزارة الثقافة', '', null, null, true, 1, '2026-08-31T00:00:00.000Z', '2026-08-31T00:00:00.000Z'),
  ('1f775b47-2b9e-50c8-8fe2-7155a812fc4b', 'المؤسسة العامة للتدريب التقني والمهني', '', null, null, true, 2, '2026-08-31T00:00:00.000Z', '2026-08-31T00:00:00.000Z'),
  ('d1a7ae63-cdfb-5914-8dad-6c3bea71465d', 'وزارة الإعلام', '', null, null, true, 3, '2026-08-31T00:00:00.000Z', '2026-08-31T00:00:00.000Z')
on conflict (id) do update set name = excluded.name, logo_path = excluded.logo_path, url = excluded.url, description = excluded.description, visible = excluded.visible, sort_order = excluded.sort_order
where (homepage_accreditations.name, homepage_accreditations.logo_path, homepage_accreditations.url, homepage_accreditations.description, homepage_accreditations.visible, homepage_accreditations.sort_order) is distinct from (excluded.name, excluded.logo_path, excluded.url, excluded.description, excluded.visible, excluded.sort_order);

insert into public.homepage_partners (id, name, logo_path, url, description, visible, sort_order, created_at, updated_at) values
  ('19a6965a-137d-514c-80e8-ab6be946bdfe', 'Sony', '', null, 'شعار تجريبي مؤقت', true, 1, '2026-08-31T00:00:00.000Z', '2026-08-31T00:00:00.000Z'),
  ('e1b8dc41-63e2-59c0-b035-cc9c02062da0', 'Nanlite', '', null, 'شعار تجريبي مؤقت', true, 2, '2026-08-31T00:00:00.000Z', '2026-08-31T00:00:00.000Z'),
  ('57cb12bf-a1cc-5b48-883f-c36828003c67', 'نيوم', '', null, 'شعار تجريبي مؤقت', true, 3, '2026-08-31T00:00:00.000Z', '2026-08-31T00:00:00.000Z'),
  ('9b59cb83-4730-5b3b-88b9-7558392987e9', 'المؤسسة العامة للتدريب التقني والمهني', '', null, 'شعار تجريبي مؤقت', true, 4, '2026-08-31T00:00:00.000Z', '2026-08-31T00:00:00.000Z')
on conflict (id) do update set name = excluded.name, logo_path = excluded.logo_path, url = excluded.url, description = excluded.description, visible = excluded.visible, sort_order = excluded.sort_order
where (homepage_partners.name, homepage_partners.logo_path, homepage_partners.url, homepage_partners.description, homepage_partners.visible, homepage_partners.sort_order) is distinct from (excluded.name, excluded.logo_path, excluded.url, excluded.description, excluded.visible, excluded.sort_order);

insert into public.homepage_cta (id, title, description, primary_cta_text, primary_cta_url, secondary_cta_text, secondary_cta_url, background_image_path, background_image_alt, updated_at) values
  (1, 'جاهز تبدأ رحلتك في عالم التصوير؟', 'استعرض الدورات واختر ما يناسب مستواك، أو تواصل معنا عبر واتساب وسنساعدك في تحديد أنسب برنامج تدريبي لك.', 'استكشف الدورات', '/courses', 'تواصل عبر واتساب', 'https://wa.me/966551234567?text=%D8%A7%D9%84%D8%B3%D9%84%D8%A7%D9%85%20%D8%B9%D9%84%D9%8A%D9%83%D9%85%D8%8C%20%D8%A3%D8%B1%D8%AF%D8%AA%20%D8%A7%D9%84%D8%A7%D8%B3%D8%AA%D9%81%D8%B3%D8%A7%D8%B1%20%D8%B9%D9%86%20%D8%A7%D9%84%D8%AF%D9%88%D8%B1%D8%A7%D8%AA', '', null, '2026-08-31T00:00:00.000Z')
on conflict (id) do update set title = excluded.title, description = excluded.description, primary_cta_text = excluded.primary_cta_text, primary_cta_url = excluded.primary_cta_url, secondary_cta_text = excluded.secondary_cta_text, secondary_cta_url = excluded.secondary_cta_url, background_image_path = excluded.background_image_path, background_image_alt = excluded.background_image_alt
where (homepage_cta.title, homepage_cta.description, homepage_cta.primary_cta_text, homepage_cta.primary_cta_url, homepage_cta.secondary_cta_text, homepage_cta.secondary_cta_url, homepage_cta.background_image_path, homepage_cta.background_image_alt) is distinct from (excluded.title, excluded.description, excluded.primary_cta_text, excluded.primary_cta_url, excluded.secondary_cta_text, excluded.secondary_cta_url, excluded.background_image_path, excluded.background_image_alt);

insert into public.site_settings (id, site_name_ar, site_name_en, logo_dark_path, logo_light_path, favicon_path, default_language, currency, timezone, city, country, updated_at) values
  (1, 'بيت المصور', 'Bayt Almosawer', '/images/logo.png', '/images/logo.png', '/icon.png', 'ar', 'SAR', 'Asia/Riyadh', 'جدة', 'السعودية', '2026-08-31T00:00:00.000Z')
on conflict (id) do update set site_name_ar = excluded.site_name_ar, site_name_en = excluded.site_name_en, logo_dark_path = excluded.logo_dark_path, logo_light_path = excluded.logo_light_path, favicon_path = excluded.favicon_path, default_language = excluded.default_language, currency = excluded.currency, timezone = excluded.timezone, city = excluded.city, country = excluded.country
where (site_settings.site_name_ar, site_settings.site_name_en, site_settings.logo_dark_path, site_settings.logo_light_path, site_settings.favicon_path, site_settings.default_language, site_settings.currency, site_settings.timezone, site_settings.city, site_settings.country) is distinct from (excluded.site_name_ar, excluded.site_name_en, excluded.logo_dark_path, excluded.logo_light_path, excluded.favicon_path, excluded.default_language, excluded.currency, excluded.timezone, excluded.city, excluded.country);

insert into public.contact_settings (id, main_mobile, whatsapp_number, whatsapp_message, secondary_phone, email, instagram_url, tiktok_url, address, maps_url, working_hours, channel_main_mobile, channel_whatsapp, channel_secondary_phone, channel_email, channel_instagram, channel_tiktok, channel_address, channel_maps, channel_working_hours, updated_at) values
  (1, '+966551234567', '+966551234567', 'السلام عليكم، أردت الاستفسار عن الدورات', null, 'info@baytalmosawer.com', 'https://instagram.com/baytalmosawer', 'https://tiktok.com/@baytalmosawer', 'جدة – حي الروضة، شارع الأمير سلطان', null, 'السبت – الخميس: 9 صباحاً – 9 مساءً', true, true, false, true, true, true, true, false, true, '2026-08-31T00:00:00.000Z')
on conflict (id) do update set main_mobile = excluded.main_mobile, whatsapp_number = excluded.whatsapp_number, whatsapp_message = excluded.whatsapp_message, secondary_phone = excluded.secondary_phone, email = excluded.email, instagram_url = excluded.instagram_url, tiktok_url = excluded.tiktok_url, address = excluded.address, maps_url = excluded.maps_url, working_hours = excluded.working_hours, channel_main_mobile = excluded.channel_main_mobile, channel_whatsapp = excluded.channel_whatsapp, channel_secondary_phone = excluded.channel_secondary_phone, channel_email = excluded.channel_email, channel_instagram = excluded.channel_instagram, channel_tiktok = excluded.channel_tiktok, channel_address = excluded.channel_address, channel_maps = excluded.channel_maps, channel_working_hours = excluded.channel_working_hours
where (contact_settings.main_mobile, contact_settings.whatsapp_number, contact_settings.whatsapp_message, contact_settings.secondary_phone, contact_settings.email, contact_settings.instagram_url, contact_settings.tiktok_url, contact_settings.address, contact_settings.maps_url, contact_settings.working_hours, contact_settings.channel_main_mobile, contact_settings.channel_whatsapp, contact_settings.channel_secondary_phone, contact_settings.channel_email, contact_settings.channel_instagram, contact_settings.channel_tiktok, contact_settings.channel_address, contact_settings.channel_maps, contact_settings.channel_working_hours) is distinct from (excluded.main_mobile, excluded.whatsapp_number, excluded.whatsapp_message, excluded.secondary_phone, excluded.email, excluded.instagram_url, excluded.tiktok_url, excluded.address, excluded.maps_url, excluded.working_hours, excluded.channel_main_mobile, excluded.channel_whatsapp, excluded.channel_secondary_phone, excluded.channel_email, excluded.channel_instagram, excluded.channel_tiktok, excluded.channel_address, excluded.channel_maps, excluded.channel_working_hours);

insert into public.footer_settings (id, about_text, copyright, updated_at) values
  (1, 'مركز متخصص في التدريب على التصوير الفوتوغرافي والفيديو وصناعة المحتوى في جدة، ببرامج عملية للأفراد والشركات يقدمها مدربون محترفون.', '© 2026 بيت المصور — جميع الحقوق محفوظة', '2026-08-31T00:00:00.000Z')
on conflict (id) do update set about_text = excluded.about_text, copyright = excluded.copyright
where (footer_settings.about_text, footer_settings.copyright) is distinct from (excluded.about_text, excluded.copyright);

insert into public.footer_links (id, link_group, label, url, enabled, sort_order, created_at, updated_at) values
  ('81de9cc7-4b39-52b9-8d71-7aa189477b9f', 'quick', 'الرئيسية', '/', true, 0, '2026-08-31T00:00:00.000Z', '2026-08-31T00:00:00.000Z'),
  ('ac024182-7efa-53af-9bdc-f43e9a2854b0', 'quick', 'من نحن', '/about', true, 1, '2026-08-31T00:00:00.000Z', '2026-08-31T00:00:00.000Z'),
  ('a629fd64-750c-5079-ac68-faa80151b7b4', 'quick', 'الدورات', '/courses', true, 2, '2026-08-31T00:00:00.000Z', '2026-08-31T00:00:00.000Z'),
  ('ca971792-87ec-5eda-90cd-b34944562e65', 'quick', 'المسارات', '/paths', true, 3, '2026-08-31T00:00:00.000Z', '2026-08-31T00:00:00.000Z'),
  ('0fe894cd-41b1-5730-aed9-3f7005e5addc', 'quick', 'المدونة', '/blog', true, 4, '2026-08-31T00:00:00.000Z', '2026-08-31T00:00:00.000Z'),
  ('6520c66d-5886-5ae4-b389-770f9276b5b5', 'quick', 'تواصل معنا', '/contact', true, 5, '2026-08-31T00:00:00.000Z', '2026-08-31T00:00:00.000Z'),
  ('c908cc58-31f9-50c5-a635-165a0b919c1e', 'legal', 'سياسة الخصوصية', '/policies/privacy', true, 0, '2026-08-31T00:00:00.000Z', '2026-08-31T00:00:00.000Z'),
  ('1ed3372a-77b9-5b1e-9401-d3dd0b869bd1', 'legal', 'الشروط والأحكام', '/policies/terms', true, 1, '2026-08-31T00:00:00.000Z', '2026-08-31T00:00:00.000Z'),
  ('02eec865-7d4c-5739-b14d-9aedde8ca99b', 'legal', 'سياسة الاسترجاع', '/policies/refund', true, 2, '2026-08-31T00:00:00.000Z', '2026-08-31T00:00:00.000Z'),
  ('e68d8704-9f34-5e79-954b-0dc592f05797', 'legal', 'سياسة التسجيل والإلغاء', '/policies/registration-cancellation', true, 3, '2026-08-31T00:00:00.000Z', '2026-08-31T00:00:00.000Z'),
  ('d4dbacfd-fa1a-569e-841a-ded8bbc90021', 'social', 'إنستغرام', 'https://instagram.com/baytalmosawer', true, 0, '2026-08-31T00:00:00.000Z', '2026-08-31T00:00:00.000Z'),
  ('1232c84a-700f-5760-a362-93f37112c266', 'social', 'تيك توك', 'https://tiktok.com/@baytalmosawer', true, 1, '2026-08-31T00:00:00.000Z', '2026-08-31T00:00:00.000Z'),
  ('d24238f7-7117-5183-9b86-ec8623801c17', 'social', 'واتساب', 'https://wa.me/966551234567?text=%D8%A7%D9%84%D8%B3%D9%84%D8%A7%D9%85%20%D8%B9%D9%84%D9%8A%D9%83%D9%85%D8%8C%20%D8%A3%D8%B1%D8%AF%D8%AA%20%D8%A7%D9%84%D8%A7%D8%B3%D8%AA%D9%81%D8%B3%D8%A7%D8%B1%20%D8%B9%D9%86%20%D8%A7%D9%84%D8%AF%D9%88%D8%B1%D8%A7%D8%AA', true, 2, '2026-08-31T00:00:00.000Z', '2026-08-31T00:00:00.000Z'),
  ('447cc642-a6fc-5921-89cc-8df2565d2ea0', 'social', 'البريد الإلكتروني', 'mailto:info@baytalmosawer.com', true, 3, '2026-08-31T00:00:00.000Z', '2026-08-31T00:00:00.000Z')
on conflict (id) do update set link_group = excluded.link_group, label = excluded.label, url = excluded.url, enabled = excluded.enabled, sort_order = excluded.sort_order
where (footer_links.link_group, footer_links.label, footer_links.url, footer_links.enabled, footer_links.sort_order) is distinct from (excluded.link_group, excluded.label, excluded.url, excluded.enabled, excluded.sort_order);

insert into public.seo_settings (id, site_title, default_meta_description, og_image_path, social_image_path, index_site, google_verification, bing_verification, updated_at) values
  (1, 'بيت المصور | مركز التدريب على التصوير وصناعة المحتوى – جدة', 'بيت المصور مركز متخصص في التدريب على التصوير الفوتوغرافي والفيديو وصناعة المحتوى في جدة، يقدّم دورات حضورية وأونلاين وبرامج تدريب مخصصة للأفراد والشركات.', '/images/hero.jpg', '/images/hero.jpg', true, null, null, '2026-08-31T00:00:00.000Z')
on conflict (id) do update set site_title = excluded.site_title, default_meta_description = excluded.default_meta_description, og_image_path = excluded.og_image_path, social_image_path = excluded.social_image_path, index_site = excluded.index_site, google_verification = excluded.google_verification, bing_verification = excluded.bing_verification
where (seo_settings.site_title, seo_settings.default_meta_description, seo_settings.og_image_path, seo_settings.social_image_path, seo_settings.index_site, seo_settings.google_verification, seo_settings.bing_verification) is distinct from (excluded.site_title, excluded.default_meta_description, excluded.og_image_path, excluded.social_image_path, excluded.index_site, excluded.google_verification, excluded.bing_verification);

insert into public.payment_settings (id, provider, enabled, environment, display_name, sort_order, created_at, updated_at) values
  ('0e619045-3a3b-509b-aad2-683e9b9947ea', 'moyasar', false, 'test', 'Moyasar', 0, '2026-08-31T00:00:00.000Z', '2026-08-31T00:00:00.000Z'),
  ('06470e76-b2f0-5521-9b5b-03304372deab', 'tabby', false, 'test', 'Tabby', 1, '2026-08-31T00:00:00.000Z', '2026-08-31T00:00:00.000Z'),
  ('77324125-239d-5cf3-bec2-c5341359ee9a', 'tamara', false, 'test', 'Tamara', 2, '2026-08-31T00:00:00.000Z', '2026-08-31T00:00:00.000Z')
on conflict (id) do update set provider = excluded.provider, enabled = excluded.enabled, environment = excluded.environment, display_name = excluded.display_name, sort_order = excluded.sort_order
where (payment_settings.provider, payment_settings.enabled, payment_settings.environment, payment_settings.display_name, payment_settings.sort_order) is distinct from (excluded.provider, excluded.enabled, excluded.environment, excluded.display_name, excluded.sort_order);

insert into public.legal_pages (id, slug, title, content, published, published_at, created_at, updated_at) values
  ('9b993acb-370b-584a-9177-e341364f654f', 'privacy', 'سياسة الخصوصية', 'نحترم خصوصية زوار بيت المصور ونلتزم بحماية بياناتهم الشخصية. نجمع فقط البيانات اللازمة لإتمام التسجيل والتواصل: الاسم، رقم الجوال، البريد الإلكتروني، وبيانات الدورة المطلوبة.

تُستخدم البيانات حصراً لإدارة التسجيلات وإرسال التذكيرات والتواصل بشأن البرامج التدريبية، ولا تُشارك مع أي طرف ثالث لأغراض تسويقية.

يمكنك طلب تعديل بياناتك أو حذفها في أي وقت بالتواصل معنا عبر القنوات الرسمية الموضحة في صفحة التواصل.', true, '2026-08-01T00:00:00.000Z', '2026-08-01T00:00:00.000Z', '2026-08-01T00:00:00.000Z'),
  ('e497c930-4d70-5cb5-b36a-df130faa5b36', 'terms', 'الشروط والأحكام', 'باستخدامك موقع بيت المصور والتسجيل في أي برنامج تدريبي، فإنك توافق على هذه الشروط. المحتوى التدريبي وأصوله مملوكة للمركز ولا يجوز إعادة نشرها أو بيعها دون إذن كتابي.

المقاعد محدودة وتُثبَّت باستقبال رسوم الدورة. يحتفظ المركز بحق تعديل مواعيد أو مدربي الدورات لأسباب تشغيلية مع إشعار مسبق وبدائل مناسبة.

يتحمل المتدرب مسؤولية الالتزام بنظام المركز واحترام المعدات والمرافق، وتُطبق تعويضات المعدات التالفة عمداً وفق تقييم المركز.', true, '2026-08-01T00:00:00.000Z', '2026-08-01T00:00:00.000Z', '2026-08-01T00:00:00.000Z'),
  ('d1162ca4-937c-59f0-a6cd-ba7ea1ba0222', 'refund', 'سياسة الاسترجاع', 'يُسترد كامل المبلغ إذا أُلغيت الدورة من طرف المركز أو لم تتحقق الحد الأدنى من المسجلين.

يُسترد 100% من المبلغ عند الإلغاء قبل 7 أيام من بداية الدورة، و50% عند الإلغاء خلال 3–6 أيام، ولا يُسترد المبلغ عند الإلغاء قبل الانعقاد بأقل من 48 ساعة.

تُعالج مبالغ الاسترجاع على نفس وسيلة الدفع خلال 5–10 أيام عمل من اعتماد الطلب.', true, '2026-08-01T00:00:00.000Z', '2026-08-01T00:00:00.000Z', '2026-08-01T00:00:00.000Z'),
  ('d54e77f3-132c-5d6f-8598-0eb1b346dc0b', 'registration-cancellation', 'سياسة التسجيل والإلغاء', 'يُتم التسجيل عبر الموقع أو قنوات التواصل الرسمية، ويفضل الحجز المبكر نظراً لمحدودية المقاعد في كل دفعة.

للمتدرب نقل حجزه إلى دفعة لاحقة مرة واحدة مجاناً بشرط إخطارنا قبل 5 أيام من بداية الدورة، شريطة توفر مقاعد في الدفعة المقصودة.

في حال عدم حضور الدورة دون إخطار مسبق تُعامل الحالة كإلغاء متأخر وفق سياسة الاسترجاع المعتمدة.', true, '2026-08-01T00:00:00.000Z', '2026-08-01T00:00:00.000Z', '2026-08-01T00:00:00.000Z')
on conflict (id) do update set slug = excluded.slug, title = excluded.title, content = excluded.content, published = excluded.published, published_at = excluded.published_at
where (legal_pages.slug, legal_pages.title, legal_pages.content, legal_pages.published, legal_pages.published_at) is distinct from (excluded.slug, excluded.title, excluded.content, excluded.published, excluded.published_at);

commit;
