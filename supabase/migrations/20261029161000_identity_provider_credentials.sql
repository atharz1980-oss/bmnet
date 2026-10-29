-- Store identity-provider setup separately from payment-provider credentials.
-- Secrets are encrypted by the application; browser roles never access rows.
begin;

create table public.identity_provider_credentials (
  provider text not null check (provider in ('nafath', 'nafith')),
  environment text not null check (environment in ('sandbox', 'production')),
  base_url text not null default '' check (char_length(base_url) <= 500),
  client_id text not null default '' check (char_length(client_id) <= 500),
  redirect_uri text not null default '' check (char_length(redirect_uri) <= 500),
  scope text not null default '' check (char_length(scope) <= 500),
  encrypted_payload text not null,
  updated_at timestamptz not null default now(),
  primary key (provider, environment)
);

alter table public.identity_provider_credentials enable row level security;
revoke all on public.identity_provider_credentials from public, anon, authenticated;
grant select, insert, update, delete on public.identity_provider_credentials to service_role;

commit;
