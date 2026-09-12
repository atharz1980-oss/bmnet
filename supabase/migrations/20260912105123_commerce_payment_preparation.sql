-- Additive payment preparation. Apply once, only after local verification.
-- No changes to existing Community tables or policies.
begin;

create table public.commerce_settings (
  id boolean primary key default true check (id),
  legal_name text not null default 'بيت المصور',
  legal_name_en text not null default '',
  commercial_registration text not null default '7055038298',
  unified_number text not null default '',
  national_short_address text not null default '',
  national_address text not null default '',
  invoice_email text not null default '',
  invoice_phone text not null default '',
  vat_status text not null default 'unconfigured' check (vat_status in ('unconfigured', 'registered', 'not_registered')),
  vat_number text not null default '',
  tax_rate_bps integer check (tax_rate_bps between 0 and 10000),
  prices_include_tax boolean not null default false check (not prices_include_tax),
  full_payment_enabled boolean not null default true,
  deposit_enabled boolean not null default true,
  deposit_type text not null default 'unconfigured' check (deposit_type in ('unconfigured', 'percentage', 'fixed')),
  deposit_value integer check (deposit_value > 0 and deposit_value <= 999999999),
  balance_due_days integer check (balance_due_days between 0 and 365),
  policies_approved boolean not null default false,
  updated_at timestamptz not null default now(),
  check (deposit_type <> 'percentage' or deposit_value <= 10000),
  check (vat_status <> 'registered' or (tax_rate_bps is not null and vat_number ~ '^[0-9]{15}$')),
  check (vat_status <> 'not_registered' or tax_rate_bps = 0)
);
insert into public.commerce_settings (id) values (true);

-- Ciphertext only; access is denied to all browser roles, including staff owners.
-- Staff must go through owner-checked server actions.
create table public.payment_credentials (
  provider public.payment_provider not null,
  environment public.payment_environment not null,
  encrypted_payload text not null,
  merchant_approved boolean not null default false,
  deposit_approved boolean not null default false,
  verified_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (provider, environment)
);

alter table public.commerce_settings enable row level security;
alter table public.payment_credentials enable row level security;
revoke all on public.commerce_settings, public.payment_credentials from public, anon, authenticated;
grant select, insert, update, delete on public.commerce_settings, public.payment_credentials to service_role;

commit;
