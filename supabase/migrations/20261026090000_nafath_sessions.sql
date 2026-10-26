-- Nafath identity verification sessions (prepared for future integration)
-- Tables added without changing existing rental flow. All disabled by default via env.

begin;

create table if not exists public.nafath_sessions (
  id uuid primary key default gen_random_uuid(),
  rental_id uuid references public.equipment_rentals(id) on delete set null,
  request_id text,
  state text,
  status text not null default 'pending' check (status in ('pending', 'completed', 'failed', 'expired', 'cancelled')),
  national_id text,
  full_name text,
  verified_at timestamptz,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_nafath_sessions_rental_id on public.nafath_sessions (rental_id);
create index if not exists idx_nafath_sessions_request_id on public.nafath_sessions (request_id);
create index if not exists idx_nafath_sessions_status on public.nafath_sessions (status);

alter table public.nafath_sessions enable row level security;
revoke all on public.nafath_sessions from public, anon, authenticated;
grant select, insert, update on public.nafath_sessions to service_role;

create trigger trg_nafath_sessions_updated_at before update
  on public.nafath_sessions for each row execute function public.set_updated_at();

commit;
