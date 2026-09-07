-- Bayt Almosawer — CP-D.1 course schema parity

alter table public.courses
  add column outcomes text[] not null default '{}',
  add column audience text[] not null default '{}',
  add column requirements text[] not null default '{}';
