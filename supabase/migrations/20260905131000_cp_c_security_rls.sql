-- Bayt Almosawer - Phase 3 / CP-C: Security foundation only
--
-- Scope: permission helpers, RLS policies, publishing enforcement, role/profile
-- guards, privilege-escalation prevention, and least-privilege grants.
-- No production seed, Auth UI, Storage, repositories, or application DB access.

create schema if not exists private;
revoke all on schema private from public;
revoke all on schema private from anon;
grant usage on schema private to authenticated;

-- The helper must bypass RLS on profiles/role_permissions to avoid policy
-- recursion. It accepts no user id: the subject is always auth.uid().
create or replace function private.has_permission(
  requested_module public.admin_module,
  requested_action public.permission_action
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select auth.uid()) is not null
    and exists (
      select 1
      from public.profiles as profile
      join public.role_permissions as role_permission
        on role_permission.role_id = profile.role_id
      where profile.id = (select auth.uid())
        and profile.status = 'active'::public.user_status
        and role_permission.module = requested_module
        and role_permission.action = requested_action
    );
$$;

create or replace function private.is_owner()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select auth.uid()) is not null
    and exists (
      select 1
      from public.profiles as profile
      join public.roles as role on role.id = profile.role_id
      where profile.id = (select auth.uid())
        and profile.status = 'active'::public.user_status
        and role.key = 'owner'
    );
$$;

-- A users manager may only assign a role whose effective permissions are a
-- subset of the caller's permissions. Only an owner may assign the owner role.
create or replace function private.can_assign_role(target_role_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when (select private.is_owner()) then
      exists (select 1 from public.roles where id = target_role_id)
    else
      exists (
        select 1
        from public.roles as target_role
        where target_role.id = target_role_id
          and target_role.key is distinct from 'owner'
      )
      and not exists (
        select 1
        from public.role_permissions as target_permission
        where target_permission.role_id = target_role_id
          and not (select private.has_permission(
            target_permission.module,
            target_permission.action
          ))
      )
  end;
$$;

revoke all on function private.has_permission(public.admin_module, public.permission_action)
  from public, anon, authenticated;
revoke all on function private.is_owner() from public, anon, authenticated;
revoke all on function private.can_assign_role(uuid) from public, anon, authenticated;
grant execute on function private.has_permission(public.admin_module, public.permission_action)
  to authenticated;
grant execute on function private.is_owner() to authenticated;
grant execute on function private.can_assign_role(uuid) to authenticated;

-- Permission normalization and owner-matrix immutability.
create or replace function private.enforce_role_permission_integrity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  old_role_key text;
  new_role_key text;
begin
  if tg_op in ('UPDATE', 'DELETE') then
    select role.key into old_role_key
    from public.roles as role
    where role.id = old.role_id;

    if old_role_key = 'owner' then
      raise exception 'The owner permission matrix is immutable'
        using errcode = '42501';
    end if;

    if old.action = 'view'::public.permission_action
      and exists (
        select 1
        from public.role_permissions as permission
        where permission.role_id = old.role_id
          and permission.module = old.module
          and permission.action <> 'view'::public.permission_action
      )
    then
      raise exception 'view is required while higher permissions exist'
        using errcode = '23514';
    end if;
  end if;

  if tg_op in ('INSERT', 'UPDATE') then
    select role.key into new_role_key
    from public.roles as role
    where role.id = new.role_id;

    if (select auth.uid()) is not null
      and not (select private.is_owner())
      and not (select private.has_permission(new.module, new.action))
    then
      raise exception 'Cannot grant a permission the caller does not hold'
        using errcode = '42501';
    end if;

    if new.action <> 'view'::public.permission_action then
      insert into public.role_permissions (role_id, module, action)
      values (new.role_id, new.module, 'view'::public.permission_action)
      on conflict do nothing;
    end if;
  end if;

  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

create trigger trg_role_permissions_integrity
before insert or update or delete on public.role_permissions
for each row execute function private.enforce_role_permission_integrity();

-- Reserved system keys are immutable for authenticated callers, all system
-- roles are undeletable, and the owner role can never become custom.
create or replace function private.protect_system_roles()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  reserved_keys constant text[] := array[
    'owner', 'admin', 'content-editor', 'course-manager', 'finance'
  ];
begin
  if tg_op = 'DELETE' then
    if old.kind = 'system'::public.role_kind or old.key = any(reserved_keys) then
      raise exception 'System roles cannot be deleted' using errcode = '42501';
    end if;
    return old;
  end if;

  if tg_op = 'UPDATE'
    and (old.kind = 'system'::public.role_kind or old.key = any(reserved_keys))
    and (new.key is distinct from old.key or new.kind is distinct from old.kind)
  then
    raise exception 'System role key and kind are immutable'
      using errcode = '42501';
  end if;

  if new.key = 'owner' and new.kind <> 'system'::public.role_kind then
    raise exception 'The owner key must remain a system role'
      using errcode = '23514';
  end if;

  if (select auth.uid()) is not null
    and new.key = any(reserved_keys)
    and (tg_op = 'INSERT' or old.key is distinct from new.key)
  then
    raise exception 'Reserved system role keys cannot be created by clients'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

create trigger trg_roles_system_protection
before insert or update or delete on public.roles
for each row execute function private.protect_system_roles();

-- Database-level last-owner and self-escalation protection.
create or replace function private.protect_profiles()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  old_is_owner boolean;
  removing_active_owner boolean;
  another_active_owner_exists boolean;
begin
  select role.key = 'owner' into old_is_owner
  from public.roles as role
  where role.id = old.role_id;
  old_is_owner := coalesce(old_is_owner, false);

  if tg_op = 'UPDATE'
    and (select auth.uid()) = old.id
    and (
      new.role_id is distinct from old.role_id
      or new.status is distinct from old.status
    )
  then
    raise exception 'A user cannot change their own role or status'
      using errcode = '42501';
  end if;

  if old_is_owner and (select auth.uid()) is not null
    and not (select private.is_owner())
    and (
      tg_op = 'DELETE'
      or new.role_id is distinct from old.role_id
      or new.status is distinct from old.status
    )
  then
    raise exception 'Only an owner may change another owner account'
      using errcode = '42501';
  end if;

  removing_active_owner := old_is_owner
    and old.status = 'active'::public.user_status
    and (
      tg_op = 'DELETE'
      or new.role_id is distinct from old.role_id
      or new.status is distinct from 'active'::public.user_status
    );

  if removing_active_owner then
    select exists (
      select 1
      from public.profiles as other_profile
      join public.roles as other_role on other_role.id = other_profile.role_id
      where other_profile.id <> old.id
        and other_profile.status = 'active'::public.user_status
        and other_role.key = 'owner'
    ) into another_active_owner_exists;

    if not another_active_owner_exists then
      raise exception 'The last active owner cannot be removed, suspended, or reassigned'
        using errcode = '23514';
    end if;
  end if;

  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

create trigger trg_profiles_owner_protection
before update or delete on public.profiles
for each row execute function private.protect_profiles();

-- Publishing is a state transition, not ordinary editing. Migration/maintenance
-- connections have no auth.uid() and are intentionally not blocked.
create or replace function private.enforce_publish_transition()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  requested_module public.admin_module := tg_argv[0]::public.admin_module;
  status_column text := tg_argv[1];
begin
  if (to_jsonb(old) ->> status_column) is distinct from
     (to_jsonb(new) ->> status_column)
    and (select auth.uid()) is not null
    and not (select private.has_permission(
      requested_module,
      'publish'::public.permission_action
    ))
  then
    raise exception 'Publishing transitions require the publish permission'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger trg_courses_publish_enforcement
before update on public.courses
for each row execute function private.enforce_publish_transition('courses', 'publish_status');

create trigger trg_paths_publish_enforcement
before update on public.learning_paths
for each row execute function private.enforce_publish_transition('paths', 'publish_status');

create trigger trg_blog_publish_enforcement
before update on public.blog_posts
for each row execute function private.enforce_publish_transition('blog', 'publish_status');

create trigger trg_legal_publish_enforcement
before update on public.legal_pages
for each row execute function private.enforce_publish_transition('legal', 'published');

revoke all on function private.enforce_role_permission_integrity()
  from public, anon, authenticated;
revoke all on function private.protect_system_roles()
  from public, anon, authenticated;
revoke all on function private.protect_profiles()
  from public, anon, authenticated;
revoke all on function private.enforce_publish_transition()
  from public, anon, authenticated;
alter function public.set_updated_at() set search_path = '';
revoke execute on function public.set_updated_at() from public, anon, authenticated;
-- Supabase's project bootstrap installs this event-trigger helper in public.
-- Clients never need to invoke it directly; leaving EXECUTE open is flagged by
-- the Security Advisor even though only the event trigger should call it.
do $$
begin
  if to_regprocedure('public.rls_auto_enable()') is not null then
    execute 'revoke execute on function public.rls_auto_enable() from public, anon, authenticated';
  end if;
end;
$$;

-- Start from an explicit deny posture. Grants below are the complete client API.
revoke all privileges on all tables in schema public from anon, authenticated;
revoke all privileges on all sequences in schema public from anon, authenticated;

-- Public-safe reads. Predicates are deliberately independent of operational
-- status; publication is the security boundary.
do $$
declare
  policy_spec record;
begin
  for policy_spec in
    select * from (values
      ('trainers', 'exists (select 1 from public.courses as parent where parent.trainer_id = id and parent.publish_status = ''published''::public.course_publish_status)'),
      ('courses', 'publish_status = ''published''::public.course_publish_status'),
      ('course_sessions', 'exists (select 1 from public.courses as parent where parent.id = course_id and parent.publish_status = ''published''::public.course_publish_status)'),
      ('course_curriculum_days', 'exists (select 1 from public.courses as parent where parent.id = course_id and parent.publish_status = ''published''::public.course_publish_status)'),
      ('course_curriculum_items', 'exists (select 1 from public.course_curriculum_days as day join public.courses as parent on parent.id = day.course_id where day.id = day_id and parent.publish_status = ''published''::public.course_publish_status)'),
      ('learning_paths', 'publish_status = ''published''::public.publish_status'),
      ('learning_path_courses', 'exists (select 1 from public.learning_paths as parent_path join public.courses as parent_course on parent_course.id = course_id where parent_path.id = path_id and parent_path.publish_status = ''published''::public.publish_status and parent_course.publish_status = ''published''::public.course_publish_status)'),
      ('testimonials', 'visible = true'),
      ('blog_posts', 'publish_status = ''published''::public.publish_status'),
      ('blog_content_blocks', 'exists (select 1 from public.blog_posts as parent where parent.id = post_id and parent.publish_status = ''published''::public.publish_status)'),
      ('blog_tags', 'exists (select 1 from public.blog_post_tags as relation join public.blog_posts as parent on parent.id = relation.post_id where relation.tag_id = id and parent.publish_status = ''published''::public.publish_status)'),
      ('blog_post_tags', 'exists (select 1 from public.blog_posts as parent where parent.id = post_id and parent.publish_status = ''published''::public.publish_status)'),
      ('homepage_sections', 'true'),
      ('homepage_hero', 'true'),
      ('homepage_statistics', 'enabled = true'),
      ('homepage_upcoming_course', 'true'),
      ('homepage_categories', 'enabled = true'),
      ('homepage_featured_courses', 'true'),
      ('homepage_featured_course_items', 'exists (select 1 from public.courses as parent where parent.id = course_id and parent.publish_status = ''published''::public.course_publish_status)'),
      ('homepage_why_us', 'true'),
      ('homepage_why_us_items', 'enabled = true'),
      ('homepage_testimonials', 'true'),
      ('homepage_testimonial_items', 'exists (select 1 from public.testimonials as parent where parent.id = testimonial_id and parent.visible = true)'),
      ('homepage_accreditations', 'visible = true'),
      ('homepage_partners', 'visible = true'),
      ('homepage_cta', 'true'),
      ('site_settings', 'true'),
      ('contact_settings', 'true'),
      ('footer_settings', 'true'),
      ('footer_links', 'enabled = true'),
      ('seo_settings', 'true'),
      ('legal_pages', 'published = true')
    ) as policies(table_name, predicate)
  loop
    execute format(
      'create policy %I on public.%I for select to anon, authenticated using (%s)',
      'public_' || policy_spec.table_name || '_select',
      policy_spec.table_name,
      policy_spec.predicate
    );
    execute format('grant select on table public.%I to anon, authenticated', policy_spec.table_name);
  end loop;
end;
$$;

-- The only public write: a pristine corporate lead. No public read/update/delete.
create policy public_corporate_requests_insert
on public.corporate_requests
for insert
to anon, authenticated
with check (
  status = 'new'::public.request_status
  and assigned_to is null
  and archived_at is null
);
grant insert on table public.corporate_requests to anon, authenticated;

-- Admin authorization map. This creates command-specific policies so grants
-- and RLS both follow the 15-module matrix. The dynamic DDL is migration-time
-- only; has_permission itself contains no dynamic SQL.
do $$
declare
  policy_spec record;
begin
  for policy_spec in
    select * from (values
      ('roles', 'roles', 'create', 'edit', 'delete'),
      ('permissions', 'roles', null, null, null),
      ('role_permissions', 'roles', 'edit', 'edit', 'edit'),
      ('profiles', 'users', 'create', 'edit', 'delete'),
      ('trainers', 'trainers', 'create', 'edit', 'delete'),
      ('courses', 'courses', 'create', 'edit', 'delete'),
      ('course_sessions', 'sessions', 'create', 'edit', 'delete'),
      ('course_curriculum_days', 'courses', 'create', 'edit', 'delete'),
      ('course_curriculum_items', 'courses', 'create', 'edit', 'delete'),
      ('learning_paths', 'paths', 'create', 'edit', 'delete'),
      ('learning_path_courses', 'paths', 'create', 'edit', 'delete'),
      ('testimonials', 'testimonials', 'create', 'edit', 'delete'),
      ('blog_posts', 'blog', 'create', 'edit', 'delete'),
      ('blog_content_blocks', 'blog', 'create', 'edit', 'delete'),
      ('blog_tags', 'blog', 'create', 'edit', 'delete'),
      ('blog_post_tags', 'blog', 'create', 'edit', 'delete'),
      ('corporate_requests', 'corporate-requests', null, 'edit', null),
      ('corporate_request_notes', 'corporate-requests', 'manage', 'edit', 'manage'),
      ('corporate_request_timeline', 'corporate-requests', 'manage', 'edit', 'manage'),
      ('media', 'media', 'create', 'edit', 'delete'),
      ('homepage_sections', 'homepage', 'edit', 'edit', 'edit'),
      ('homepage_hero', 'homepage', 'edit', 'edit', 'edit'),
      ('homepage_statistics', 'homepage', 'edit', 'edit', 'edit'),
      ('homepage_upcoming_course', 'homepage', 'edit', 'edit', 'edit'),
      ('homepage_categories', 'homepage', 'edit', 'edit', 'edit'),
      ('homepage_featured_courses', 'homepage', 'edit', 'edit', 'edit'),
      ('homepage_featured_course_items', 'homepage', 'edit', 'edit', 'edit'),
      ('homepage_why_us', 'homepage', 'edit', 'edit', 'edit'),
      ('homepage_why_us_items', 'homepage', 'edit', 'edit', 'edit'),
      ('homepage_testimonials', 'homepage', 'edit', 'edit', 'edit'),
      ('homepage_testimonial_items', 'homepage', 'edit', 'edit', 'edit'),
      ('homepage_accreditations', 'homepage', 'edit', 'edit', 'edit'),
      ('homepage_partners', 'homepage', 'edit', 'edit', 'edit'),
      ('homepage_cta', 'homepage', 'edit', 'edit', 'edit'),
      ('site_settings', 'settings', null, 'edit', null),
      ('contact_settings', 'settings', null, 'edit', null),
      ('footer_settings', 'settings', null, 'edit', null),
      ('footer_links', 'settings', 'edit', 'edit', 'edit'),
      ('seo_settings', 'settings', null, 'edit', null),
      ('payment_settings', 'payments', null, 'manage', null),
      ('legal_pages', 'legal', null, 'edit', null)
    ) as policies(table_name, module_name, insert_action, update_action, delete_action)
  loop
    execute format(
      'create policy %I on public.%I for select to authenticated using ((select private.has_permission(%L::public.admin_module, ''view''::public.permission_action)))',
      'admin_' || policy_spec.table_name || '_select',
      policy_spec.table_name,
      policy_spec.module_name
    );
    execute format('grant select on table public.%I to authenticated', policy_spec.table_name);

    if policy_spec.insert_action is not null then
      execute format(
        'create policy %I on public.%I for insert to authenticated with check ((select private.has_permission(%L::public.admin_module, %L::public.permission_action)))',
        'admin_' || policy_spec.table_name || '_insert',
        policy_spec.table_name,
        policy_spec.module_name,
        policy_spec.insert_action
      );
      execute format('grant insert on table public.%I to authenticated', policy_spec.table_name);
    end if;

    if policy_spec.update_action is not null then
      execute format(
        'create policy %I on public.%I for update to authenticated using ((select private.has_permission(%L::public.admin_module, %L::public.permission_action))) with check ((select private.has_permission(%L::public.admin_module, %L::public.permission_action)))',
        'admin_' || policy_spec.table_name || '_update',
        policy_spec.table_name,
        policy_spec.module_name,
        policy_spec.update_action,
        policy_spec.module_name,
        policy_spec.update_action
      );
      execute format('grant update on table public.%I to authenticated', policy_spec.table_name);
    end if;

    if policy_spec.delete_action is not null then
      execute format(
        'create policy %I on public.%I for delete to authenticated using ((select private.has_permission(%L::public.admin_module, %L::public.permission_action)))',
        'admin_' || policy_spec.table_name || '_delete',
        policy_spec.table_name,
        policy_spec.module_name,
        policy_spec.delete_action
      );
      execute format('grant delete on table public.%I to authenticated', policy_spec.table_name);
    end if;
  end loop;
end;
$$;

-- Profiles need an additional role-assignment boundary beyond users.edit.
drop policy admin_profiles_insert on public.profiles;
create policy admin_profiles_insert
on public.profiles
for insert
to authenticated
with check (
  (select private.has_permission('users', 'create'))
  and (select private.can_assign_role(role_id))
);

drop policy admin_profiles_update on public.profiles;
create policy admin_profiles_update
on public.profiles
for update
to authenticated
using ((select private.has_permission('users', 'edit')))
with check (
  (select private.has_permission('users', 'edit'))
  and (select private.can_assign_role(role_id))
);

-- Role matrices may only receive permissions the caller already holds.
drop policy admin_role_permissions_insert on public.role_permissions;
create policy admin_role_permissions_insert
on public.role_permissions
for insert
to authenticated
with check (
  (select private.has_permission('roles', 'edit'))
  and (
    (select private.is_owner())
    or (select private.has_permission(module, action))
  )
);

drop policy admin_role_permissions_update on public.role_permissions;
create policy admin_role_permissions_update
on public.role_permissions
for update
to authenticated
using ((select private.has_permission('roles', 'edit')))
with check (
  (select private.has_permission('roles', 'edit'))
  and (
    (select private.is_owner())
    or (select private.has_permission(module, action))
  )
);

-- Keep future objects closed by default. CP-D and later migrations must opt in.
alter default privileges in schema public revoke all on tables from anon, authenticated;
alter default privileges in schema public revoke all on sequences from anon, authenticated;
alter default privileges in schema public revoke execute on functions from public, anon, authenticated;

comment on function private.has_permission(public.admin_module, public.permission_action)
is 'CP-C authorization helper: auth.uid() -> active profile -> role -> role_permissions.';
comment on table public.corporate_requests
is 'Public INSERT is allowed only for pristine new requests. Rate limiting is deferred.';
comment on table public.profiles
is 'Administrative identity data. No public SELECT policy; public author projection is deferred.';
