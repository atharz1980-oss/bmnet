-- Tokenizes customer-initiated checkout returns so only the matching
-- unpaid booking can be cancelled from the provider's back URL.
begin;

alter table public.studio_space_bookings
  add column checkout_return_token uuid not null default gen_random_uuid();

create unique index uq_studio_space_bookings_return_token
  on public.studio_space_bookings (checkout_return_token);

commit;
