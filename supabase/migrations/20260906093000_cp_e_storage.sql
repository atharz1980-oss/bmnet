-- Bayt Almosawer — CP-E Storage foundation
-- One public image bucket. Object mutations remain permission-gated and
-- must be performed through the Supabase Storage API, never by editing
-- storage.objects directly from application code.

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'bm-media',
  'bm-media',
  true,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'image/avif']::text[]
)
on conflict (id) do update
set
  name = excluded.name,
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types
where (
  buckets.name,
  buckets.public,
  buckets.file_size_limit,
  buckets.allowed_mime_types
) is distinct from (
  excluded.name,
  excluded.public,
  excluded.file_size_limit,
  excluded.allowed_mime_types
);

alter table public.media
  alter column bucket set default 'bm-media';

alter table public.media
  add constraint media_bucket_is_bm_media
  check (bucket = 'bm-media');

create policy media_objects_select
on storage.objects
for select
to anon, authenticated
using (
  bucket_id = 'bm-media'
);

create policy media_objects_insert
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'bm-media'
  and (select private.has_permission(
    'media'::public.admin_module,
    'create'::public.permission_action
  ))
);

create policy media_objects_update
on storage.objects
for update
to authenticated
using (
  bucket_id = 'bm-media'
  and (select private.has_permission(
    'media'::public.admin_module,
    'edit'::public.permission_action
  ))
)
with check (
  bucket_id = 'bm-media'
  and (select private.has_permission(
    'media'::public.admin_module,
    'edit'::public.permission_action
  ))
);

create policy media_objects_delete
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'bm-media'
  and (select private.has_permission(
    'media'::public.admin_module,
    'delete'::public.permission_action
  ))
);

grant usage on schema storage to anon, authenticated;
revoke all on table storage.objects from anon, authenticated;
grant select on table storage.objects to anon;
grant select, insert, update, delete on table storage.objects to authenticated;
