-- Bayt Almosawer — Community CP-H V1 (2026-09-10)
-- ============================================================
-- ملف 3/3: RLS كحاجز أمني حقيقي + bucket وسائط المجتمع + مشغلات الإشعارات
-- المبادئ:
--   anon      → قراءة المحتوى العام فقط، صفر كتابة.
--   member    → كل كتابة مقيّدة بـ auth.uid() في with check (لا spoofing حتى عبر REST)
--               + فحص الحجب المتبادل على كل تفاعل + منع التفاعل مع عضو موقوف.
--   admin     → سياسات إضافية عبر (select private.has_permission('community', …))
--               بنمط cached-initplan كما في cp_c.
--   الإشعارات → تُنشأ بمشغلات security definer فقط؛ العميل يقرأ/يحدّث read_at لصفوفه فقط.

alter table public.community_profiles enable row level security;
alter table public.community_posts enable row level security;
alter table public.community_post_media enable row level security;
alter table public.community_post_likes enable row level security;
alter table public.community_post_comments enable row level security;
alter table public.community_saved_posts enable row level security;
alter table public.community_follows enable row level security;
alter table public.community_portfolio_projects enable row level security;
alter table public.community_portfolio_media enable row level security;
alter table public.community_notifications enable row level security;
alter table public.community_content_reports enable row level security;
alter table public.community_user_blocks enable row level security;

-- ===== إبطال الصلاحيات الافتراضية ثم المنح الصريحة (نمط cp_c) =====
revoke all on public.community_profiles from anon, authenticated;
revoke all on public.community_posts from anon, authenticated;
revoke all on public.community_post_media from anon, authenticated;
revoke all on public.community_post_likes from anon, authenticated;
revoke all on public.community_post_comments from anon, authenticated;
revoke all on public.community_saved_posts from anon, authenticated;
revoke all on public.community_follows from anon, authenticated;
revoke all on public.community_portfolio_projects from anon, authenticated;
revoke all on public.community_portfolio_media from anon, authenticated;
revoke all on public.community_notifications from anon, authenticated;
revoke all on public.community_content_reports from anon, authenticated;
revoke all on public.community_user_blocks from anon, authenticated;

grant select on public.community_profiles to anon, authenticated;
grant insert, update on public.community_profiles to authenticated;
grant select on public.community_posts to anon, authenticated;
grant insert, update, delete on public.community_posts to authenticated;
grant select on public.community_post_media to anon, authenticated;
grant insert, update, delete on public.community_post_media to authenticated;
grant select on public.community_post_likes to anon, authenticated;
grant insert, delete on public.community_post_likes to authenticated;
grant select on public.community_post_comments to anon, authenticated;
grant insert, update, delete on public.community_post_comments to authenticated;
grant select, insert, delete on public.community_saved_posts to authenticated;
grant select on public.community_follows to anon, authenticated;
grant insert, delete on public.community_follows to authenticated;
grant select on public.community_portfolio_projects to anon, authenticated;
grant insert, update, delete on public.community_portfolio_projects to authenticated;
grant select on public.community_portfolio_media to anon, authenticated;
grant insert, update, delete on public.community_portfolio_media to authenticated;
grant select, update on public.community_notifications to authenticated;
grant select, insert, update on public.community_content_reports to authenticated;
grant select, insert, delete on public.community_user_blocks to authenticated;

-- ===== helpers: عدم الحجب المتبادل + نشاط العضو (تُستخدم داخل السياسات فقط) =====
create or replace function private.community_block_between(a uuid, b uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select a is not null and b is not null and a <> b and not exists (
    select 1 from public.community_user_blocks blk
    where (blk.blocker_id = a and blk.blocked_id = b)
       or (blk.blocker_id = b and blk.blocked_id = a)
  );
$$;

create or replace function private.community_member_active(member uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.community_profiles cp
    where cp.user_id = member and cp.status = 'active'
  );
$$;

grant usage on schema private to authenticated, service_role;
grant execute on function private.community_block_between(uuid, uuid),
  private.community_member_active(uuid) to authenticated, service_role;

-- ============================================================
-- 1) community_profiles
-- ============================================================
create policy community_profiles_public_select
  on public.community_profiles for select to anon, authenticated
  using (status = 'active' or user_id = (select auth.uid()));

create policy community_profiles_insert_own
  on public.community_profiles for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and status = 'active'
    and private.community_member_active(user_id) is not null
  );

create policy community_profiles_update_own
  on public.community_profiles for update to authenticated
  using (user_id = (select auth.uid()) and status = 'active')
  with check (user_id = (select auth.uid()) and status = 'active');

-- الإدارة: قراءة الكل (موقوفًا وعاديًا) + تعليق/استرجاع + حذف
create policy community_profiles_staff_select
  on public.community_profiles for select to authenticated
  using ((select private.has_permission('community', 'view')));

create policy community_profiles_staff_update
  on public.community_profiles for update to authenticated
  using ((select private.has_permission('community', 'edit')))
  with check ((select private.has_permission('community', 'edit')));

create policy community_profiles_staff_delete
  on public.community_profiles for delete to authenticated
  using ((select private.has_permission('community', 'delete')));

-- ============================================================
-- 2) community_posts
-- ============================================================
create policy community_posts_public_select
  on public.community_posts for select to anon, authenticated
  using (
    author_id = (select auth.uid())
    or (
      status = 'published'
      and private.community_member_active(author_id)
    )
  );

create policy community_posts_insert_own
  on public.community_posts for insert to authenticated
  with check (
    author_id = (select auth.uid())
    and status = 'published'
    and visibility = 'public'
    and private.community_member_active(auth.uid())
  );

-- المالك يعدّل منشوره المنشور فقط (لا يُحيي منشورًا مخفيًا إداريًا)
create policy community_posts_update_own
  on public.community_posts for update to authenticated
  using (author_id = (select auth.uid()) and status = 'published')
  with check (author_id = (select auth.uid()) and status = 'published');

create policy community_posts_delete_own
  on public.community_posts for delete to authenticated
  using (author_id = (select auth.uid()));

-- الإدارة: إخفاء/استرجاع + حذف
create policy community_posts_staff_update
  on public.community_posts for update to authenticated
  using ((select private.has_permission('community', 'edit')))
  with check ((select private.has_permission('community', 'edit')));

create policy community_posts_staff_delete
  on public.community_posts for delete to authenticated
  using ((select private.has_permission('community', 'delete')));

-- ============================================================
-- 3) community_post_media — الوسائط تتبع ظهور المنشور الأب
-- ============================================================
create policy community_post_media_select
  on public.community_post_media for select to anon, authenticated
  using (
    exists (
      select 1 from public.community_posts p
      where p.id = post_id
        and p.status = 'published'
        and private.community_member_active(p.author_id)
    )
    or exists (
      select 1 from public.community_posts p
      where p.id = post_id and p.author_id = (select auth.uid())
    )
  );

create policy community_post_media_write_own
  on public.community_post_media for insert to authenticated
  with check (
    exists (
      select 1 from public.community_posts p
      where p.id = post_id and p.author_id = (select auth.uid())
    )
    and storage_path like 'community/' || (select auth.uid())::text || '/%'
  );

create policy community_post_media_update_own
  on public.community_post_media for update to authenticated
  using (
    exists (
      select 1 from public.community_posts p
      where p.id = post_id and p.author_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.community_posts p
      where p.id = post_id and p.author_id = (select auth.uid())
    )
  );

create policy community_post_media_delete_own
  on public.community_post_media for delete to authenticated
  using (
    exists (
      select 1 from public.community_posts p
      where p.id = post_id and p.author_id = (select auth.uid())
    )
  );

-- ============================================================
-- 4) community_post_likes — إعجاب واحد لكل زوج (PK) + حجب متبادل
-- ============================================================
create policy community_likes_select
  on public.community_post_likes for select to anon, authenticated
  using (true);

create policy community_likes_insert_own
  on public.community_post_likes for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.community_posts p
      where p.id = post_id and p.status = 'published'
    )
    and private.community_member_active(auth.uid())
    and private.community_block_between(
      (select auth.uid()),
      (select p.author_id from public.community_posts p where p.id = post_id)
    )
  );

create policy community_likes_delete_own
  on public.community_post_likes for delete to authenticated
  using (user_id = (select auth.uid()));

-- ============================================================
-- 5) community_post_comments
-- ============================================================
create policy community_comments_select
  on public.community_post_comments for select to anon, authenticated
  using (
    (
      status = 'published'
      and exists (
        select 1 from public.community_posts p
        where p.id = post_id and p.status = 'published'
      )
      and private.community_member_active(author_id)
    )
    or exists (
      select 1 from public.community_posts p
      where p.id = post_id and p.author_id = (select auth.uid())
    )
    or author_id = (select auth.uid())
  );

create policy community_comments_insert_own
  on public.community_post_comments for insert to authenticated
  with check (
    author_id = (select auth.uid())
    and status = 'published'
    and exists (
      select 1 from public.community_posts p
      where p.id = post_id and p.status = 'published'
    )
    and private.community_member_active(auth.uid())
    and private.community_block_between(
      (select auth.uid()),
      (select p.author_id from public.community_posts p where p.id = post_id)
    )
  );

create policy community_comments_update_own
  on public.community_post_comments for update to authenticated
  using (author_id = (select auth.uid()) and status = 'published')
  with check (author_id = (select auth.uid()) and status = 'published');

create policy community_comments_delete_own
  on public.community_post_comments for delete to authenticated
  using (author_id = (select auth.uid()));

-- صاحب المنشور يحذف تعليقات منشوره
create policy community_comments_delete_post_author
  on public.community_post_comments for delete to authenticated
  using (
    exists (
      select 1 from public.community_posts p
      where p.id = post_id and p.author_id = (select auth.uid())
    )
  );

-- الإدارة: إخفاء/استرجاع + حذف
create policy community_comments_staff_update
  on public.community_post_comments for update to authenticated
  using ((select private.has_permission('community', 'edit')))
  with check ((select private.has_permission('community', 'edit')));

create policy community_comments_staff_delete
  on public.community_post_comments for delete to authenticated
  using ((select private.has_permission('community', 'delete')));

-- ============================================================
-- 6) community_saved_posts — خاص بالمالك فقط (لا قراءة عامة)
-- ============================================================
create policy community_saved_select_own
  on public.community_saved_posts for select to authenticated
  using (user_id = (select auth.uid()));

create policy community_saved_insert_own
  on public.community_saved_posts for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.community_posts p
      where p.id = post_id and p.status = 'published'
    )
  );

create policy community_saved_delete_own
  on public.community_saved_posts for delete to authenticated
  using (user_id = (select auth.uid()));

-- ============================================================
-- 7) community_follows — زوج فريد (PK) + لا ذاتية + حجب متبادل
-- ============================================================
create policy community_follows_select
  on public.community_follows for select to anon, authenticated
  using (true);

create policy community_follows_insert_own
  on public.community_follows for insert to authenticated
  with check (
    follower_id = (select auth.uid())
    and follower_id <> following_id
    and private.community_member_active(following_id)
    and private.community_block_between(follower_id, following_id)
  );

create policy community_follows_delete_own
  on public.community_follows for delete to authenticated
  using (follower_id = (select auth.uid()));

-- ============================================================
-- 8) community_portfolio_projects
-- ============================================================
create policy community_portfolio_public_select
  on public.community_portfolio_projects for select to anon, authenticated
  using (
    user_id = (select auth.uid())
    or (
      published = true
      and private.community_member_active(user_id)
    )
  );

create policy community_portfolio_insert_own
  on public.community_portfolio_projects for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and private.community_member_active(auth.uid())
  );

create policy community_portfolio_update_own
  on public.community_portfolio_projects for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy community_portfolio_delete_own
  on public.community_portfolio_projects for delete to authenticated
  using (user_id = (select auth.uid()));

-- ============================================================
-- 9) community_portfolio_media — تتبع ظهور المشروع الأب
-- ============================================================
create policy community_portfolio_media_select
  on public.community_portfolio_media for select to anon, authenticated
  using (
    exists (
      select 1 from public.community_portfolio_projects pr
      where pr.id = project_id
        and pr.published = true
        and private.community_member_active(pr.user_id)
    )
    or exists (
      select 1 from public.community_portfolio_projects pr
      where pr.id = project_id and pr.user_id = (select auth.uid())
    )
  );

create policy community_portfolio_media_insert_own
  on public.community_portfolio_media for insert to authenticated
  with check (
    exists (
      select 1 from public.community_portfolio_projects pr
      where pr.id = project_id and pr.user_id = (select auth.uid())
    )
    and storage_path like 'community/' || (select auth.uid())::text || '/%'
  );

create policy community_portfolio_media_update_own
  on public.community_portfolio_media for update to authenticated
  using (
    exists (
      select 1 from public.community_portfolio_projects pr
      where pr.id = project_id and pr.user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.community_portfolio_projects pr
      where pr.id = project_id and pr.user_id = (select auth.uid())
    )
  );

create policy community_portfolio_media_delete_own
  on public.community_portfolio_media for delete to authenticated
  using (
    exists (
      select 1 from public.community_portfolio_projects pr
      where pr.id = project_id and pr.user_id = (select auth.uid())
    )
  );

-- ============================================================
-- 10) community_notifications — قراءة/تعليم قراءة للمالك فقط
--     (الإنشاء بمشغلات security definer أدناه — لا policy insert للأعضاء)
-- ============================================================
create policy community_notifications_select_own
  on public.community_notifications for select to authenticated
  using (user_id = (select auth.uid()));

create policy community_notifications_update_own
  on public.community_notifications for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- ============================================================
-- 11) community_content_reports — البلّاغ يقرأ بلاغاته؛ الإدارة تدير
-- ============================================================
create policy community_reports_insert_own
  on public.community_content_reports for insert to authenticated
  with check (
    reporter_id = (select auth.uid())
    and private.community_member_active(auth.uid())
  );

create policy community_reports_select_own
  on public.community_content_reports for select to authenticated
  using (
    reporter_id = (select auth.uid())
    or (select private.has_permission('community', 'view'))
  );

create policy community_reports_staff_update
  on public.community_content_reports for update to authenticated
  using ((select private.has_permission('community', 'edit')))
  with check ((select private.has_permission('community', 'edit')));

create policy community_reports_staff_delete
  on public.community_content_reports for delete to authenticated
  using ((select private.has_permission('community', 'delete')));

-- ============================================================
-- 12) community_user_blocks — القائمة خاصة بالحاجب
-- ============================================================
create policy community_blocks_select_own
  on public.community_user_blocks for select to authenticated
  using (blocker_id = (select auth.uid()));

create policy community_blocks_insert_own
  on public.community_user_blocks for insert to authenticated
  with check (
    blocker_id = (select auth.uid())
    and blocker_id <> blocked_id
    and private.community_member_active(blocker_id)
  );

create policy community_blocks_delete_own
  on public.community_user_blocks for delete to authenticated
  using (blocker_id = (select auth.uid()));

-- ============================================================
-- 13) Storage — bucket مستقل community-media (bm-media لا يُلمس)
-- ============================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'community-media', 'community-media', true, 5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
  set public = true,
      file_size_limit = 5242880,
      allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp'];

-- القراءة العامة
create policy community_media_public_read
  on storage.objects for select to anon, authenticated
  using (bucket_id = 'community-media');

-- الرفع: مسار مضبوط community/{auth.uid()}/… فقط (لا يمكن الرفع في مجلد غيرك)
create policy community_media_upload_own_folder
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'community-media'
    and (storage.foldername(name))[1] = 'community'
    and (storage.foldername(name))[2] = (select auth.uid())::text
  );

-- الاستبدال/الحذف: نفس المجلد الشخصي فقط
create policy community_media_update_own_folder
  on storage.objects for update to authenticated
  using (
    bucket_id = 'community-media'
    and (storage.foldername(name))[1] = 'community'
    and (storage.foldername(name))[2] = (select auth.uid())::text
  )
  with check (
    bucket_id = 'community-media'
    and (storage.foldername(name))[1] = 'community'
    and (storage.foldername(name))[2] = (select auth.uid())::text
  );

create policy community_media_delete_own_folder
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'community-media'
    and (storage.foldername(name))[1] = 'community'
    and (storage.foldername(name))[2] = (select auth.uid())::text
  );

-- ============================================================
-- 14) مشغلات الإشعارات + تنظيف المتابعة عند الحجب
--     (security definer — تتجاوز RLS بملكية postgres؛ skip-self)
-- ============================================================
create or replace function private.community_notify_follow()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.community_notifications (user_id, actor_id, type, entity_type, entity_id)
  values (new.following_id, new.follower_id, 'follow', 'profile', new.follower_id);
  return new;
end;
$$;

create or replace function private.community_notify_like()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare post_author uuid;
begin
  select p.author_id into post_author from public.community_posts p where p.id = new.post_id;
  if post_author is not null and post_author <> new.user_id then
    insert into public.community_notifications (user_id, actor_id, type, entity_type, entity_id)
    values (post_author, new.user_id, 'like', 'post', new.post_id);
  end if;
  return new;
end;
$$;

create or replace function private.community_notify_comment()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare post_author uuid;
begin
  select p.author_id into post_author from public.community_posts p where p.id = new.post_id;
  if post_author is not null and post_author <> new.author_id then
    insert into public.community_notifications (user_id, actor_id, type, entity_type, entity_id)
    values (post_author, new.author_id, 'comment', 'post', new.post_id);
  end if;
  return new;
end;
$$;

-- الحجب يقطع المتابعة بالاتجاهين فورًا (قاعدة التفاعل الممنوع)
create or replace function private.community_block_cleanup()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  delete from public.community_follows f
  where (f.follower_id = new.blocker_id and f.following_id = new.blocked_id)
     or (f.follower_id = new.blocked_id and f.following_id = new.blocker_id);
  return new;
end;
$$;

create trigger trg_community_notify_follow
  after insert on public.community_follows
  for each row execute function private.community_notify_follow();

create trigger trg_community_notify_like
  after insert on public.community_post_likes
  for each row execute function private.community_notify_like();

create trigger trg_community_notify_comment
  after insert on public.community_post_comments
  for each row execute function private.community_notify_comment();

create trigger trg_community_block_cleanup
  after insert on public.community_user_blocks
  for each row execute function private.community_block_cleanup();

-- منح التنفيذ (نمط 20260909090000): authenticated يطلق المشغلات عبر كتاباته،
-- وservice_role عند أي كتابة خدمية مستقبلية
grant execute on function
  private.community_notify_follow(),
  private.community_notify_like(),
  private.community_notify_comment(),
  private.community_block_cleanup()
  to authenticated, service_role;
