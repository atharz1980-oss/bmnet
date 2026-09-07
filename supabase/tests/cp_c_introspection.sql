select 'POLICIES=' || count(*)
from pg_policies
where schemaname = 'public';

select 'CP_C_FUNCTIONS=' || count(*)
from pg_proc as procedure
join pg_namespace as namespace on namespace.oid = procedure.pronamespace
where namespace.nspname = 'private';

select 'SECURITY_DEFINER_FUNCTIONS=' || count(*)
from pg_proc as procedure
join pg_namespace as namespace on namespace.oid = procedure.pronamespace
where namespace.nspname = 'private'
  and procedure.prosecdef;

select 'CP_C_PROTECTION_TRIGGERS=' || count(*)
from pg_trigger
where not tgisinternal
  and tgname in (
    'trg_role_permissions_integrity',
    'trg_roles_system_protection',
    'trg_profiles_owner_protection',
    'trg_courses_publish_enforcement',
    'trg_paths_publish_enforcement',
    'trg_blog_publish_enforcement',
    'trg_legal_publish_enforcement'
  );

select 'RLS_TABLES=' || count(*) filter (where relrowsecurity)
  || '/' || count(*)
from pg_class as relation
join pg_namespace as namespace on namespace.oid = relation.relnamespace
where namespace.nspname = 'public'
  and relation.relkind = 'r';

select 'VIEWS=' || count(*)
from pg_class as relation
join pg_namespace as namespace on namespace.oid = relation.relnamespace
where namespace.nspname = 'public'
  and relation.relkind in ('v', 'm');

select 'FIXTURE_ROWS=' || (
  (select count(*) from public.roles)
  + (select count(*) from public.permissions)
  + (select count(*) from public.role_permissions)
  + (select count(*) from public.profiles)
  + (select count(*) from public.trainers)
  + (select count(*) from public.courses)
  + (select count(*) from public.blog_posts)
  + (select count(*) from public.testimonials)
  + (select count(*) from public.payment_settings)
  + (select count(*) from public.homepage_hero)
  + (select count(*) from public.corporate_requests)
);

select grantee, privilege_type, count(*)
from information_schema.role_table_grants
where table_schema = 'public'
  and grantee in ('anon', 'authenticated')
group by grantee, privilege_type
order by grantee, privilege_type;

select 'RLS_WITHOUT_POLICY=' || count(*)
from pg_class as relation
join pg_namespace as namespace on namespace.oid = relation.relnamespace
where namespace.nspname = 'public'
  and relation.relkind = 'r'
  and relation.relrowsecurity
  and not exists (
    select 1 from pg_policy as policy where policy.polrelid = relation.oid
  );

select 'MUTABLE_CP_C_SEARCH_PATH=' || count(*)
from pg_proc as procedure
join pg_namespace as namespace on namespace.oid = procedure.pronamespace
where namespace.nspname in ('public', 'private')
  and procedure.proname in (
    'set_updated_at', 'has_permission', 'is_owner', 'can_assign_role',
    'enforce_role_permission_integrity', 'protect_system_roles',
    'protect_profiles', 'enforce_publish_transition'
  )
  and not exists (
    select 1
    from unnest(coalesce(procedure.proconfig, '{}')) as setting
    where setting like 'search_path=%'
  );

select 'ANON_SENSITIVE_GRANTS=' || count(*)
from information_schema.role_table_grants
where table_schema = 'public'
  and grantee = 'anon'
  and table_name in (
    'roles', 'permissions', 'role_permissions', 'profiles', 'payment_settings',
    'corporate_request_notes', 'corporate_request_timeline', 'media'
  );

select 'ANON_CORPORATE_NON_INSERT_GRANTS=' || count(*)
from information_schema.role_table_grants
where table_schema = 'public'
  and grantee = 'anon'
  and table_name = 'corporate_requests'
  and privilege_type <> 'INSERT';

select 'CLIENT_PERMISSION_CATALOG_MUTATION_GRANTS=' || count(*)
from information_schema.role_table_grants
where table_schema = 'public'
  and grantee in ('anon', 'authenticated')
  and table_name = 'permissions'
  and privilege_type in ('INSERT', 'UPDATE', 'DELETE');

select 'ANON_PRIVATE_FUNCTION_EXECUTE=' || count(*)
from information_schema.routine_privileges
where routine_schema = 'private'
  and grantee = 'anon'
  and privilege_type = 'EXECUTE';

select 'AUTHENTICATED_PRIVATE_DEFINER_EXECUTE=' || count(*)
from information_schema.routine_privileges as privilege
join pg_proc as procedure on procedure.proname = privilege.routine_name
join pg_namespace as namespace on namespace.oid = procedure.pronamespace
  and namespace.nspname = privilege.routine_schema
where privilege.routine_schema = 'private'
  and privilege.grantee = 'authenticated'
  and privilege.privilege_type = 'EXECUTE'
  and procedure.prosecdef;
