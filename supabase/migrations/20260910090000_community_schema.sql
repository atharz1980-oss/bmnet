-- Bayt Almosawer — Community CP-H V1 (2026-09-10)
-- ============================================================
-- ملف 1/3: جداول المجتمع + القيود + الفهارس (بلا صلاحيات جديدة)
-- الهوية: auth.users (Supabase Auth) — لا نلمس public.profiles (هوية الموظفين).
-- الأعضاء يُنشئون صفًا واحدًا في community_profiles مرتبطًا بحسابهم.
-- الإشعارات تُنشأ بمشغلات DB (الملف 3/3) لا من العميل.

-- ============ 1) هوية العضو ============
create table if not exists public.community_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  username text not null
    check (username ~ '^[a-z0-9_]{3,24}$'),
  display_name text not null
    check (char_length(btrim(display_name)) between 1 and 80),
  bio text check (char_length(coalesce(btrim(bio), '')) <= 1000),
  city text check (char_length(coalesce(btrim(city), '')) <= 80),
  country text check (char_length(coalesce(btrim(country), '')) <= 80),
  specialties text[] not null default '{}'
    check (cardinality(specialties) <= 8),
  experience_level text not null default 'beginner'
    check (experience_level in ('beginner', 'intermediate', 'professional')),
  avatar_path text,
  cover_path text,
  available_for_work boolean not null default false,
  website_url text,
  instagram_url text,
  youtube_url text,
  status text not null default 'active' check (status in ('active', 'suspended')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint community_profiles_social_urls check (
    (website_url is null or website_url ~* '^https://[^\s]{1,200}$')
    and (instagram_url is null or instagram_url ~* '^https://(www\.)?instagram\.com/[\w.\-/]{1,120}$')
    and (youtube_url is null or youtube_url ~* '^https://(www\.)?youtube\.com/[\w.\-/=@]{1,150}$')
  )
);

create unique index if not exists idx_community_profiles_username
  on public.community_profiles (username);
create index if not exists idx_community_profiles_discovery
  on public.community_profiles (status, available_for_work, experience_level, created_at desc);
create index if not exists idx_community_profiles_city
  on public.community_profiles (city) where city is not null;
create index if not exists idx_community_profiles_specialties
  on public.community_profiles using gin (specialties);

-- ============ 2) المنشورات ============
create table if not exists public.community_posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null
    references public.community_profiles(user_id) on delete cascade,
  caption text not null default '' check (char_length(caption) <= 2200),
  category text check (char_length(coalesce(btrim(category), '')) <= 60),
  camera text check (char_length(coalesce(btrim(camera), '')) <= 80),
  lens text check (char_length(coalesce(btrim(lens), '')) <= 80),
  location_name text check (char_length(coalesce(btrim(location_name), '')) <= 120),
  visibility text not null default 'public' check (visibility in ('public')),
  status text not null default 'published' check (status in ('published', 'hidden')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_community_posts_feed
  on public.community_posts (created_at desc) where status = 'published';
create index if not exists idx_community_posts_author
  on public.community_posts (author_id, created_at desc);
create index if not exists idx_community_posts_category
  on public.community_posts (category) where category is not null;

-- ============ 3) وسائط المنشور ============
create table if not exists public.community_post_media (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.community_posts(id) on delete cascade,
  storage_path text not null
    check (storage_path ~ '^community/[\w-]{36}/[\w.\-]{1,160}$'),
  media_type text not null default 'image' check (media_type in ('image')),
  sort_order integer not null default 0 check (sort_order between 0 and 9),
  alt_text text not null default '' check (char_length(alt_text) <= 300),
  created_at timestamptz not null default now()
);

create index if not exists idx_community_post_media_post
  on public.community_post_media (post_id, sort_order);

-- ============ 4) الإعجابات (زوج فريد) ============
create table if not exists public.community_post_likes (
  post_id uuid not null references public.community_posts(id) on delete cascade,
  user_id uuid not null references public.community_profiles(user_id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create index if not exists idx_community_likes_user
  on public.community_post_likes (user_id);

-- ============ 5) التعليقات ============
create table if not exists public.community_post_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.community_posts(id) on delete cascade,
  author_id uuid not null
    references public.community_profiles(user_id) on delete cascade,
  body text not null check (char_length(btrim(body)) between 1 and 1000),
  status text not null default 'published' check (status in ('published', 'hidden')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_community_comments_post
  on public.community_post_comments (post_id, created_at) where status = 'published';
create index if not exists idx_community_comments_author
  on public.community_post_comments (author_id);

-- ============ 6) المحفوظات (زوج فريد) ============
create table if not exists public.community_saved_posts (
  user_id uuid not null references public.community_profiles(user_id) on delete cascade,
  post_id uuid not null references public.community_posts(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, post_id)
);

-- ============ 7) المتابعة (زوج فريد + لا متابعة ذات) ============
create table if not exists public.community_follows (
  follower_id uuid not null references public.community_profiles(user_id) on delete cascade,
  following_id uuid not null references public.community_profiles(user_id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, following_id),
  constraint no_self_follow check (follower_id <> following_id)
);

create index if not exists idx_community_follows_following
  on public.community_follows (following_id);
create index if not exists idx_community_follows_follower
  on public.community_follows (follower_id);

-- ============ 8) مشاريع الأعمال ============
create table if not exists public.community_portfolio_projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.community_profiles(user_id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 1 and 120),
  description text check (char_length(coalesce(btrim(description), '')) <= 2000),
  category text check (char_length(coalesce(btrim(category), '')) <= 60),
  location_name text check (char_length(coalesce(btrim(location_name), '')) <= 120),
  project_date date,
  cover_path text,
  published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_community_portfolio_user
  on public.community_portfolio_projects (user_id, created_at desc);
create index if not exists idx_community_portfolio_public
  on public.community_portfolio_projects (published, project_date desc) where published = true;

create table if not exists public.community_portfolio_media (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null
    references public.community_portfolio_projects(id) on delete cascade,
  storage_path text not null
    check (storage_path ~ '^community/[\w-]{36}/[\w.\-]{1,160}$'),
  media_type text not null default 'image' check (media_type in ('image')),
  sort_order integer not null default 0 check (sort_order between 0 and 19),
  alt_text text not null default '' check (char_length(alt_text) <= 300),
  created_at timestamptz not null default now()
);

create index if not exists idx_community_portfolio_media_project
  on public.community_portfolio_media (project_id, sort_order);

-- ============ 9) الإشعارات الداخلية ============
create table if not exists public.community_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.community_profiles(user_id) on delete cascade,
  actor_id uuid references public.community_profiles(user_id) on delete set null,
  type text not null check (type in ('follow', 'like', 'comment')),
  entity_type text not null check (entity_type in ('post', 'profile')),
  entity_id uuid,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  constraint notification_actor_is_actor check (actor_id is null or actor_id <> user_id)
);

create index if not exists idx_community_notifications_user
  on public.community_notifications (user_id, created_at desc);
create index if not exists idx_community_notifications_unread
  on public.community_notifications (user_id, read_at)
  where read_at is null;

-- ============ 10) البلاغات ============
create table if not exists public.community_content_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.community_profiles(user_id) on delete cascade,
  target_type text not null check (target_type in ('post', 'comment', 'profile')),
  target_id uuid not null,
  reason text not null
    check (reason in ('spam', 'inappropriate', 'harassment', 'copyright', 'impersonation', 'other')),
  details text check (char_length(coalesce(btrim(details), '')) <= 1000),
  status text not null default 'open' check (status in ('open', 'reviewing', 'resolved', 'dismissed')),
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_community_reports_status
  on public.community_content_reports (status, created_at desc);
create index if not exists idx_community_reports_target
  on public.community_content_reports (target_type, target_id);
create index if not exists idx_community_reports_reporter
  on public.community_content_reports (reporter_id);

-- ============ 11) الحجب (زوج فريد + لا حجب ذات) ============
create table if not exists public.community_user_blocks (
  blocker_id uuid not null references public.community_profiles(user_id) on delete cascade,
  blocked_id uuid not null references public.community_profiles(user_id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  constraint no_self_block check (blocker_id <> blocked_id)
);

-- ============ محفزات updated_at ============
create trigger trg_community_profiles_updated_at
  before update on public.community_profiles
  for each row execute function public.set_updated_at();
create trigger trg_community_posts_updated_at
  before update on public.community_posts
  for each row execute function public.set_updated_at();
create trigger trg_community_comments_updated_at
  before update on public.community_post_comments
  for each row execute function public.set_updated_at();
create trigger trg_community_portfolio_updated_at
  before update on public.community_portfolio_projects
  for each row execute function public.set_updated_at();
create trigger trg_community_reports_updated_at
  before update on public.community_content_reports
  for each row execute function public.set_updated_at();
