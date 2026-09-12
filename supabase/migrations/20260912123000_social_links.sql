-- قائمة وسائل التواصل الاجتماعي — مصدر واحد تديره «بيانات التواصل».
-- إضافة فقط: لا تمس جداول المجتمع ولا سياساتها ولا footer_links القائم.
-- سبب الجدول: footer_links يحمل uuid فقط بلا مفتاح منصة، فتعذّر اختيار
-- الأيقونة الصحيحة وسقطت كل الروابط من الاشتقاق العام.
begin;

create type public.social_platform as enum (
  'instagram', 'tiktok', 'snapchat', 'x', 'youtube', 'facebook',
  'linkedin', 'telegram', 'pinterest', 'threads', 'behance',
  'whatsapp', 'email', 'website'
);

-- المنصة هي المفتاح: رابط واحد لكل منصة، فلا تكرار ولا التباس في الأيقونة.
create table public.social_links (
  platform public.social_platform primary key,
  url text not null default '',
  label text not null default '',
  enabled boolean not null default true,
  sort_order integer not null default 0,
  updated_at timestamptz not null default now()
);

create trigger trg_social_links_updated_at before update on public.social_links
  for each row execute function public.set_updated_at();

alter table public.social_links enable row level security;

-- الزائر يقرأ المفعّل فقط؛ الموقع العام يحمّل بعميل anon.
create policy public_social_links_select on public.social_links
  for select to anon, authenticated using (enabled = true);

create policy admin_social_links_select on public.social_links
  for select to authenticated
  using ((select private.has_permission('settings'::public.admin_module, 'view'::public.permission_action)));

create policy admin_social_links_insert on public.social_links
  for insert to authenticated
  with check ((select private.has_permission('settings'::public.admin_module, 'edit'::public.permission_action)));

create policy admin_social_links_update on public.social_links
  for update to authenticated
  using ((select private.has_permission('settings'::public.admin_module, 'edit'::public.permission_action)))
  with check ((select private.has_permission('settings'::public.admin_module, 'edit'::public.permission_action)));

create policy admin_social_links_delete on public.social_links
  for delete to authenticated
  using ((select private.has_permission('settings'::public.admin_module, 'edit'::public.permission_action)));

-- بذرة المنصات المستخدمة حاليًا في الموقع الثابت، معطّلة حتى يعتمد المالك الروابط.
insert into public.social_links (platform, label, url, enabled, sort_order) values
  ('instagram', 'إنستغرام', '', false, 1),
  ('tiktok', 'تيك توك', '', false, 2),
  ('whatsapp', 'واتساب', '', false, 3),
  ('email', 'البريد الإلكتروني', '', false, 4);

commit;
