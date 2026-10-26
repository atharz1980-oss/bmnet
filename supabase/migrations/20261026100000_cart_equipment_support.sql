-- دعم إضافة المعدات للسلة + معلومات الإيجار + التوقيع
-- يضاف بدون لمس المسار المباشر الحالي، ويمكن تحويله لاحقًا

begin;

-- توسيع kind ليشمل equipment
alter type public.cart_item_kind add value if not exists 'equipment';

-- إضافة أعمدة المعدات في سلة التسوق
alter table public.shopping_cart_items
  add column if not exists equipment_id uuid references public.equipment_items(id) on delete cascade,
  add column if not exists rental_start_date date,
  add column if not exists rental_end_date date,
  add column if not exists rental_quantity integer check (rental_quantity is null or rental_quantity between 1 and 9999),
  add column if not exists rental_method public.equipment_handover_method,
  add column if not exists rental_delivery_address text check (rental_delivery_address is null or char_length(rental_delivery_address) <= 500),
  add column if not exists agreement_version integer check (agreement_version is null or agreement_version between 1 and 100000),
  add column if not exists agreement_accepted_at timestamptz,
  add column if not exists signature_name text check (signature_name is null or char_length(btrim(signature_name)) between 2 and 120),
  add column if not exists signature_data_url text,
  add column if not exists signature_hash text check (signature_hash is null or signature_hash ~ '^[a-f0-9]{64}$'),
  add column if not exists national_id text check (national_id is null or national_id ~ '^[0-9]{10}$'),
  add column if not exists national_id_expiry date;

-- فهرس للمعدات
create index if not exists idx_shopping_cart_items_equipment
  on public.shopping_cart_items(equipment_id);

-- توسيع سجلات الطلبات لدعم انتهاء الحجز المؤقت
alter table public.shopping_orders
  add column if not exists hold_expires_at timestamptz,
  add column if not exists hold_released_at timestamptz;

create index if not exists idx_shopping_orders_hold_expires
  on public.shopping_orders(status, hold_expires_at);

commit;
