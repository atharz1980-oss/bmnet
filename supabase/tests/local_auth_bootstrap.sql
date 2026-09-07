-- Plain-PostgreSQL harness for CP-C migration tests.
-- Supabase already supplies these roles and auth.uid(); this file is never
-- applied remotely and contains no application or production seed.

create role anon nologin;
create role authenticated nologin;

create schema auth;
create or replace function auth.uid()
returns uuid
language sql
stable
set search_path = ''
as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
$$;

grant usage on schema auth to anon, authenticated;
grant execute on function auth.uid() to anon, authenticated;
