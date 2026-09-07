-- ═══════════════════════════════════════════════════════════════════════════
-- بيت المصور — CP-B: Database Schema (Phase 3)
-- ─────────────────────────────────────────────────────────────────────────────
-- Enums + Tables + PK/FK + CHECK + UNIQUE + sort_order + timestamps
-- + updated_at triggers + الفهارس الضرورية فقط.
--
-- قرارات موثقة (memory.md D-54..D-57):
--  * IDs: uuid gen_random_uuid() — المرجعية الصغيرة بمفاتيح طبيعية فقط
--    (permissions(module,action) و homepage_sections(section_key)).
--  * Singleton tables: id integer PK default 1 CHECK (id = 1).
--  * فصل حالة الدورة: publish_status + operational_status (nullable للمسودة).
--  * صفحات قانونية CMS-friendly: uuid + slug (لا enum).
--  * registered_count مؤقتة حتى جدول registrations مستقبلًا.
--  * FK إلى auth.users مؤجل إلى CP-C (حفاظًا على قابلية إعادة البناء
--    على قاعدة نظيفة بلا مخطط auth).
--  * RLS مفعّل بلا Policies (CP-C) — مالك الجداول يتجاوزها للترحيل/الاختبار.
--  * لا Seed — الجداول فارغة في نهاية CP-B.
-- ═══════════════════════════════════════════════════════════════════════════

-- ─────────────────────────────── Enums ───────────────────────────────

create type public.course_publish_status as enum ('draft', 'published');

create type public.course_operational_status as enum
  ('coming-soon', 'registration-open', 'full', 'completed');

create type public.session_status as enum
  ('upcoming', 'open', 'full', 'closed', 'completed');

create type public.request_status as enum
  ('new', 'contacted', 'preparing-offer', 'offer-sent', 'agreed', 'closed');

create type public.trainer_status as enum ('active', 'hidden');

create type public.publish_status as enum ('draft', 'published');

create type public.testimonial_source as enum ('google', 'manual');

create type public.role_kind as enum ('system', 'custom');

create type public.user_status as enum ('active', 'invited', 'suspended');

create type public.admin_module as enum (
  'dashboard', 'courses', 'sessions', 'trainers', 'paths', 'homepage',
  'testimonials', 'blog', 'corporate-requests', 'media', 'legal',
  'settings', 'payments', 'users', 'roles'
);

create type public.permission_action as enum
  ('view', 'create', 'edit', 'delete', 'publish', 'manage');

create type public.payment_provider as enum ('moyasar', 'tabby', 'tamara');

create type public.payment_environment as enum ('test', 'production');

create type public.blog_block_type as enum
  ('paragraph', 'heading', 'image', 'quote', 'list');

create type public.course_category as enum
  ('in-person-individuals', 'in-person-corporates', 'online', 'private');

create type public.course_level as enum
  ('beginner', 'intermediate', 'advanced', 'all-levels');

create type public.footer_link_group as enum ('quick', 'legal', 'social');

create type public.homepage_section as enum (
  'hero', 'statistics', 'upcoming-course', 'course-categories',
  'featured-courses', 'why-us', 'accreditations', 'partners',
  'testimonials', 'cta'
);

create type public.homepage_selection_mode as enum ('automatic', 'manual');

create type public.corporate_request_event as enum
  ('request-created', 'status-changed', 'note-added');

-- ─────────────────── updated_at Helper (واحد للجميع) ───────────────────

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ─────────────────── الهوية والصلاحيات ───────────────────

create table public.roles (
  id uuid primary key default gen_random_uuid(),
  key text unique,
  name text not null,
  description text not null default '',
  kind public.role_kind not null default 'custom',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.permissions (
  module public.admin_module not null,
  action public.permission_action not null,
  primary key (module, action)
);

create table public.role_permissions (
  role_id uuid not null references public.roles (id) on delete cascade,
  module public.admin_module not null,
  action public.permission_action not null,
  primary key (role_id, module, action),
  foreign key (module, action) references public.permissions (module, action)
    on delete cascade
);

create table public.profiles (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  avatar_path text,
  role_id uuid not null references public.roles (id) on delete restrict,
  status public.user_status not null default 'invited',
  last_active_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ─────────────────── المدربون ───────────────────

create table public.trainers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  image_path text not null default '',
  image_alt text,
  title text not null,
  specialty text not null default '',
  short_bio text not null default '',
  bio text not null default '',
  years_experience integer not null default 0 check (years_experience >= 0),
  skills text[] not null default '{}',
  instagram_url text,
  linkedin_url text,
  website_url text,
  status public.trainer_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ─────────────────── الدورات ───────────────────

create table public.courses (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  short_description text not null default '',
  description text not null default '',
  category public.course_category not null,
  level public.course_level not null default 'beginner',
  language text not null default 'ar',
  trainer_id uuid not null references public.trainers (id) on delete restrict,
  image_path text not null default '',
  image_alt text not null default '',
  price numeric(10,2) not null default 0 check (price >= 0),
  original_price numeric(10,2) check (original_price >= 0),
  discount_percent integer check (discount_percent between 0 and 100),
  show_price boolean not null default true,
  is_free boolean not null default false,
  request_quote boolean not null default false,
  duration_days integer not null default 0 check (duration_days >= 0),
  duration_hours integer not null default 0 check (duration_hours >= 0),
  featured boolean not null default false,
  publish_status public.course_publish_status not null default 'draft',
  operational_status public.course_operational_status,
  seo_title text,
  seo_description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.course_sessions (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses (id) on delete cascade,
  batch_name text,
  start_date date not null,
  end_date date check (end_date >= start_date),
  start_time time not null,
  end_time time not null,
  location text not null default '',
  city text not null default '',
  capacity integer not null default 0 check (capacity >= 0),
  registered_count integer not null default 0 check (registered_count >= 0),
  price_override numeric(10,2) check (price_override >= 0),
  status public.session_status not null default 'upcoming',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint registered_within_capacity check (registered_count <= capacity)
);

create table public.course_curriculum_days (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses (id) on delete cascade,
  title text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.course_curriculum_items (
  id uuid primary key default gen_random_uuid(),
  day_id uuid not null references public.course_curriculum_days (id)
    on delete cascade,
  title text not null,
  description text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ─────────────────── المسارات ───────────────────

create table public.learning_paths (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  short_description text not null default '',
  description text not null default '',
  image_path text not null default '',
  image_alt text not null default '',
  level public.course_level not null default 'beginner',
  discount_percent integer not null default 0
    check (discount_percent between 0 and 100),
  publish_status public.publish_status not null default 'draft',
  featured boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.learning_path_courses (
  path_id uuid not null references public.learning_paths (id) on delete cascade,
  course_id uuid not null references public.courses (id) on delete restrict,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (path_id, course_id)
);

-- ─────────────────── التقييمات ───────────────────

create table public.testimonials (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  role text,
  review text not null,
  rating integer not null check (rating between 1 and 5),
  source public.testimonial_source not null default 'manual',
  source_url text,
  featured boolean not null default false,
  visible boolean not null default true,
  reviewed_at date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ─────────────────── المدونة ───────────────────

create table public.blog_posts (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  excerpt text not null default '',
  cover_path text not null default '',
  cover_alt text,
  category text not null default '',
  author_id uuid references public.profiles (id) on delete set null,
  publish_status public.publish_status not null default 'draft',
  published_at timestamptz,
  seo_title text,
  seo_description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.blog_content_blocks (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.blog_posts (id) on delete cascade,
  block_type public.blog_block_type not null,
  content jsonb not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint content_is_object check (jsonb_typeof(content) = 'object')
);

create table public.blog_tags (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique
);

create table public.blog_post_tags (
  post_id uuid not null references public.blog_posts (id) on delete cascade,
  tag_id uuid not null references public.blog_tags (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, tag_id)
);

-- ─────────────────── طلبات الشركات ───────────────────

create table public.corporate_requests (
  id uuid primary key default gen_random_uuid(),
  company_name text not null,
  contact_name text not null,
  phone text not null default '',
  email text not null default '',
  trainee_count integer not null default 1 check (trainee_count > 0),
  requested_course text not null default '',
  notes text not null default '',
  status public.request_status not null default 'new',
  assigned_to uuid references public.profiles (id) on delete set null,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.corporate_request_notes (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.corporate_requests (id)
    on delete cascade,
  author_id uuid references public.profiles (id) on delete set null,
  note text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.corporate_request_timeline (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.corporate_requests (id)
    on delete cascade,
  actor_id uuid references public.profiles (id) on delete set null,
  event_type public.corporate_request_event not null,
  from_status public.request_status,
  to_status public.request_status,
  description text not null default '',
  created_at timestamptz not null default now()
);

-- ─────────────────── الوسائط ───────────────────

create table public.media (
  id uuid primary key default gen_random_uuid(),
  bucket text not null default 'media',
  storage_path text not null unique,
  file_name text not null,
  mime_type text not null,
  size_bytes bigint not null default 0 check (size_bytes >= 0),
  alt_text text not null default '',
  caption text,
  width integer check (width is null or width > 0),
  height integer check (height is null or height > 0),
  uploaded_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ─────────────────── الصفحة الرئيسية (Hybrid) ───────────────────
-- homepage_sections: ترتيب وتفعيل الأقسام العشرة (مفتاح طبيعي مرجعي)
-- البقية: محتوى كل قسم — singletons بمفتاح id=1 وجداول عناصر بـ sort_order

create table public.homepage_sections (
  section_key public.homepage_section primary key,
  enabled boolean not null default true,
  sort_order integer not null default 0,
  updated_at timestamptz not null default now()
);

create table public.homepage_hero (
  id integer primary key default 1 check (id = 1),
  title text not null default '',
  description text not null default '',
  primary_cta_text text not null default '',
  primary_cta_url text not null default '',
  secondary_cta_text text not null default '',
  secondary_cta_url text not null default '',
  image_path text not null default '',
  image_alt text not null default '',
  updated_at timestamptz not null default now()
);

create table public.homepage_statistics (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  value numeric(12,2) not null default 0 check (value >= 0),
  prefix text,
  suffix text,
  enabled boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.homepage_upcoming_course (
  id integer primary key default 1 check (id = 1),
  mode public.homepage_selection_mode not null default 'automatic',
  manual_course_id uuid references public.courses (id) on delete set null,
  manual_session_id uuid references public.course_sessions (id)
    on delete set null,
  updated_at timestamptz not null default now()
);

create table public.homepage_categories (
  id uuid primary key default gen_random_uuid(),
  category_key public.course_category not null unique,
  title text not null,
  short_description text not null default '',
  image_path text not null default '',
  image_alt text,
  cta_label text not null default '',
  enabled boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.homepage_featured_courses (
  id integer primary key default 1 check (id = 1),
  mode public.homepage_selection_mode not null default 'automatic',
  updated_at timestamptz not null default now()
);

create table public.homepage_featured_course_items (
  id uuid primary key default gen_random_uuid(),
  featured_courses_id integer not null references
    public.homepage_featured_courses (id) on delete cascade,
  course_id uuid not null references public.courses (id) on delete cascade,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (course_id)
);

create table public.homepage_why_us (
  id integer primary key default 1 check (id = 1),
  title text not null default '',
  description text not null default '',
  updated_at timestamptz not null default now()
);

create table public.homepage_why_us_items (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null default '',
  icon_key text,
  enabled boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.homepage_testimonials (
  id integer primary key default 1 check (id = 1),
  title text not null default '',
  description text not null default '',
  mode public.homepage_selection_mode not null default 'automatic',
  updated_at timestamptz not null default now()
);

create table public.homepage_testimonial_items (
  id uuid primary key default gen_random_uuid(),
  testimonials_section_id integer not null references
    public.homepage_testimonials (id) on delete cascade,
  testimonial_id uuid not null references public.testimonials (id)
    on delete cascade,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (testimonial_id)
);

create table public.homepage_accreditations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  logo_path text not null default '',
  url text,
  description text,
  visible boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.homepage_partners (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  logo_path text not null default '',
  url text,
  description text,
  visible boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.homepage_cta (
  id integer primary key default 1 check (id = 1),
  title text not null default '',
  description text not null default '',
  primary_cta_text text not null default '',
  primary_cta_url text not null default '',
  secondary_cta_text text not null default '',
  secondary_cta_url text not null default '',
  background_image_path text,
  background_image_alt text,
  updated_at timestamptz not null default now()
);

-- ─────────────────── الإعدادات ───────────────────

create table public.site_settings (
  id integer primary key default 1 check (id = 1),
  site_name_ar text not null default '',
  site_name_en text not null default '',
  logo_dark_path text not null default '',
  logo_light_path text not null default '',
  favicon_path text not null default '',
  default_language text not null default 'ar',
  currency text not null default 'SAR',
  timezone text not null default 'Asia/Riyadh',
  city text not null default '',
  country text not null default '',
  updated_at timestamptz not null default now()
);

create table public.contact_settings (
  id integer primary key default 1 check (id = 1),
  main_mobile text not null default '',
  whatsapp_number text not null default '',
  whatsapp_message text not null default '',
  secondary_phone text,
  email text not null default '',
  instagram_url text not null default '',
  tiktok_url text not null default '',
  address text not null default '',
  maps_url text,
  working_hours text not null default '',
  channel_main_mobile boolean not null default true,
  channel_whatsapp boolean not null default true,
  channel_secondary_phone boolean not null default true,
  channel_email boolean not null default true,
  channel_instagram boolean not null default true,
  channel_tiktok boolean not null default true,
  channel_address boolean not null default true,
  channel_maps boolean not null default true,
  channel_working_hours boolean not null default true,
  updated_at timestamptz not null default now()
);

create table public.footer_settings (
  id integer primary key default 1 check (id = 1),
  about_text text not null default '',
  copyright text not null default '',
  updated_at timestamptz not null default now()
);

create table public.footer_links (
  id uuid primary key default gen_random_uuid(),
  link_group public.footer_link_group not null,
  label text not null,
  url text not null,
  enabled boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.seo_settings (
  id integer primary key default 1 check (id = 1),
  site_title text not null default '',
  default_meta_description text not null default '',
  og_image_path text not null default '',
  social_image_path text not null default '',
  index_site boolean not null default true,
  google_verification text,
  bing_verification text,
  updated_at timestamptz not null default now()
);

create table public.payment_settings (
  id uuid primary key default gen_random_uuid(),
  provider public.payment_provider not null unique,
  enabled boolean not null default false,
  environment public.payment_environment not null default 'test',
  display_name text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ─────────────────── الصفحات القانونية ───────────────────

create table public.legal_pages (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  content text not null,
  published boolean not null default false,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ─────────────────── الفهارس (الضرورية فقط) ───────────────────

create index idx_courses_publish_status on public.courses (publish_status);
create index idx_courses_category on public.courses (category);
create index idx_courses_featured_published on public.courses (id)
  where featured = true and publish_status = 'published';
create index idx_course_sessions_course_start on public.course_sessions
  (course_id, start_date);
create index idx_course_sessions_status_start on public.course_sessions
  (status, start_date);
create index idx_curriculum_days_course_sort on public.course_curriculum_days
  (course_id, sort_order);
create index idx_curriculum_items_day_sort on public.course_curriculum_items
  (day_id, sort_order);
create index idx_trainers_status on public.trainers (status);
create index idx_learning_paths_publish on public.learning_paths (publish_status);
create index idx_path_courses_path_sort on public.learning_path_courses
  (path_id, sort_order);
create index idx_testimonials_featured_visible on public.testimonials
  (featured, visible);
create index idx_blog_posts_publish_published on public.blog_posts
  (publish_status, published_at);
create index idx_blog_blocks_post_sort on public.blog_content_blocks
  (post_id, sort_order);
create index idx_corporate_requests_status on public.corporate_requests (status);
create index idx_corporate_requests_created on public.corporate_requests
  (created_at);
create index idx_corporate_requests_assigned on public.corporate_requests
  (assigned_to) where assigned_to is not null;
create index idx_profiles_role on public.profiles (role_id);
create index idx_media_created on public.media (created_at);

-- ─────────────────── Triggers: updated_at موحدة ───────────────────

create trigger trg_roles_updated_at before update on public.roles
  for each row execute function public.set_updated_at();
create trigger trg_profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();
create trigger trg_trainers_updated_at before update on public.trainers
  for each row execute function public.set_updated_at();
create trigger trg_courses_updated_at before update on public.courses
  for each row execute function public.set_updated_at();
create trigger trg_course_sessions_updated_at before update on public.course_sessions
  for each row execute function public.set_updated_at();
create trigger trg_curriculum_days_updated_at before update on public.course_curriculum_days
  for each row execute function public.set_updated_at();
create trigger trg_curriculum_items_updated_at before update on public.course_curriculum_items
  for each row execute function public.set_updated_at();
create trigger trg_learning_paths_updated_at before update on public.learning_paths
  for each row execute function public.set_updated_at();
create trigger trg_learning_path_courses_updated_at before update on public.learning_path_courses
  for each row execute function public.set_updated_at();
create trigger trg_testimonials_updated_at before update on public.testimonials
  for each row execute function public.set_updated_at();
create trigger trg_blog_posts_updated_at before update on public.blog_posts
  for each row execute function public.set_updated_at();
create trigger trg_blog_content_blocks_updated_at before update on public.blog_content_blocks
  for each row execute function public.set_updated_at();
create trigger trg_corporate_requests_updated_at before update on public.corporate_requests
  for each row execute function public.set_updated_at();
create trigger trg_corporate_request_notes_updated_at before update on public.corporate_request_notes
  for each row execute function public.set_updated_at();
create trigger trg_media_updated_at before update on public.media
  for each row execute function public.set_updated_at();
create trigger trg_homepage_sections_updated_at before update on public.homepage_sections
  for each row execute function public.set_updated_at();
create trigger trg_homepage_hero_updated_at before update on public.homepage_hero
  for each row execute function public.set_updated_at();
create trigger trg_homepage_statistics_updated_at before update on public.homepage_statistics
  for each row execute function public.set_updated_at();
create trigger trg_homepage_upcoming_course_updated_at before update on public.homepage_upcoming_course
  for each row execute function public.set_updated_at();
create trigger trg_homepage_categories_updated_at before update on public.homepage_categories
  for each row execute function public.set_updated_at();
create trigger trg_homepage_featured_courses_updated_at before update on public.homepage_featured_courses
  for each row execute function public.set_updated_at();
create trigger trg_homepage_featured_course_items_updated_at before update on public.homepage_featured_course_items
  for each row execute function public.set_updated_at();
create trigger trg_homepage_why_us_updated_at before update on public.homepage_why_us
  for each row execute function public.set_updated_at();
create trigger trg_homepage_why_us_items_updated_at before update on public.homepage_why_us_items
  for each row execute function public.set_updated_at();
create trigger trg_homepage_testimonials_updated_at before update on public.homepage_testimonials
  for each row execute function public.set_updated_at();
create trigger trg_homepage_testimonial_items_updated_at before update on public.homepage_testimonial_items
  for each row execute function public.set_updated_at();
create trigger trg_homepage_accreditations_updated_at before update on public.homepage_accreditations
  for each row execute function public.set_updated_at();
create trigger trg_homepage_partners_updated_at before update on public.homepage_partners
  for each row execute function public.set_updated_at();
create trigger trg_homepage_cta_updated_at before update on public.homepage_cta
  for each row execute function public.set_updated_at();
create trigger trg_site_settings_updated_at before update on public.site_settings
  for each row execute function public.set_updated_at();
create trigger trg_contact_settings_updated_at before update on public.contact_settings
  for each row execute function public.set_updated_at();
create trigger trg_footer_settings_updated_at before update on public.footer_settings
  for each row execute function public.set_updated_at();
create trigger trg_footer_links_updated_at before update on public.footer_links
  for each row execute function public.set_updated_at();
create trigger trg_seo_settings_updated_at before update on public.seo_settings
  for each row execute function public.set_updated_at();
create trigger trg_payment_settings_updated_at before update on public.payment_settings
  for each row execute function public.set_updated_at();
create trigger trg_legal_pages_updated_at before update on public.legal_pages
  for each row execute function public.set_updated_at();

-- ─────────────────── RLS: تفعيل بلا Policies (CP-C) ───────────────────
-- مالك الجداول (اتصال الترحيل) يتجاوز RLS — الوصول عبر API مسدود حتى CP-C

alter table public.roles enable row level security;
alter table public.permissions enable row level security;
alter table public.role_permissions enable row level security;
alter table public.profiles enable row level security;
alter table public.trainers enable row level security;
alter table public.courses enable row level security;
alter table public.course_sessions enable row level security;
alter table public.course_curriculum_days enable row level security;
alter table public.course_curriculum_items enable row level security;
alter table public.learning_paths enable row level security;
alter table public.learning_path_courses enable row level security;
alter table public.testimonials enable row level security;
alter table public.blog_posts enable row level security;
alter table public.blog_content_blocks enable row level security;
alter table public.blog_tags enable row level security;
alter table public.blog_post_tags enable row level security;
alter table public.corporate_requests enable row level security;
alter table public.corporate_request_notes enable row level security;
alter table public.corporate_request_timeline enable row level security;
alter table public.media enable row level security;
alter table public.homepage_sections enable row level security;
alter table public.homepage_hero enable row level security;
alter table public.homepage_statistics enable row level security;
alter table public.homepage_upcoming_course enable row level security;
alter table public.homepage_categories enable row level security;
alter table public.homepage_featured_courses enable row level security;
alter table public.homepage_featured_course_items enable row level security;
alter table public.homepage_why_us enable row level security;
alter table public.homepage_why_us_items enable row level security;
alter table public.homepage_testimonials enable row level security;
alter table public.homepage_testimonial_items enable row level security;
alter table public.homepage_accreditations enable row level security;
alter table public.homepage_partners enable row level security;
alter table public.homepage_cta enable row level security;
alter table public.site_settings enable row level security;
alter table public.contact_settings enable row level security;
alter table public.footer_settings enable row level security;
alter table public.footer_links enable row level security;
alter table public.seo_settings enable row level security;
alter table public.payment_settings enable row level security;
alter table public.legal_pages enable row level security;
