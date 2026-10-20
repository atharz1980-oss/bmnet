-- ═══════════════════════════════════════════════════════════════════
-- تأجير المعدات — Bayt Almosawer (2026-10-21)
--
-- إضافي بالكامل: جداول جديدة وفهارسها ومشغّلاتها وسياساتها. لا يلمس أي
-- جدول أو دالة أو سياسة قائمة.
--
--  - equipment_categories: تصنيف المعدات (كاميرات، إضاءة، مايكات…).
--  - equipment_items: المعدة نفسها — SKU وسيريال وكمية وسعر اليوم وقيمة
--    الاستبدال والمواصفات (jsonb مرن) وحالتها التشغيلية.
--  - equipment_images: معرض صور المعدة (مسارات في bm-media).
--  - equipment_agreements: نص العقد الإلكتروني بإصدارات — يُحرَّر من اللوحة،
--    وكل إيجار يخزّن رقم الإصدار الذي قَبِله العميل (سجل قانوني ثابت).
--  - equipment_rentals: الإيجار = صف واحد يجمع الفترة والدفع والتوقيع
--    (نمط studio_space_bookings): لا يُكتب «مؤكد» إلا بعد تحقق الخادم من
--    ميسر مباشرة، والهوية تُسجَّل صراحةً بحالتها — لا تُدَّعى موثقة.
--  - equipment_rental_inspections: محاضر التسليم والاسترجاع (سيريال، حالة،
--    ملحقات، وسائط، إقرار المستلم) — سلسلة عهدة موثّقة.
--  - equipment_audit_events: سجل تدقيق append-only لكل انتقال.
--
-- قاعدة التوافر: الكمية المحجوزة = مجموع كميات الإيجارات الحاجزة (مؤكدة،
-- أو pending بمهلة دفع حية) المتقاطعة زمنيًا، ولا تتجاوز كمية المعدة.
-- ═══════════════════════════════════════════════════════════════════

begin;

-- ─────────────────────────────── الأنواع ───────────────────────────────

-- الحالة التشغيلية للمعدة كما تُدار من اللوحة.
create type public.equipment_status as enum ('available', 'rented', 'maintenance', 'retired');

-- حالة الإيجار: بانتظار الدفع ← مؤكّد ← قيد الاستخدام ← أُرجع ← مغلق.
create type public.equipment_rental_status as enum (
  'pending',
  'confirmed',
  'out_on_rent',
  'returned',
  'closed',
  'cancelled',
  'expired'
);

-- طريقة الاستلام.
create type public.equipment_handover_method as enum ('pickup', 'delivery');

-- حالة التحقق من هوية المستأجر — صريحة ولا تُجمَّل.
-- unverified: لم يُطلب. pending: بيانات مُدخلة تنتظر تحققًا بشريًا عند التسليم.
-- verified: تحقق موثوق (يُضبط عبر المحوّل المعتمد مستقبلًا، أو يدويًا هنا).
create type public.equipment_identity_status as enum ('unverified', 'pending', 'verified', 'failed');

-- نوع المحضر.
create type public.equipment_inspection_kind as enum ('handover', 'return');

-- ─────────────────────────────── التصنيفات ───────────────────────────────

create table public.equipment_categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9][a-z0-9-]{1,79}$'),
  name text not null check (char_length(btrim(name)) between 2 and 120),
  description text not null default '' check (char_length(description) <= 1000),
  icon_key text not null default '' check (char_length(icon_key) <= 40),
  sort_order integer not null default 0,
  published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_equipment_categories_listing
  on public.equipment_categories (published, sort_order, created_at desc);

-- ─────────────────────────────── المعدات ───────────────────────────────

create table public.equipment_items (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.equipment_categories(id) on delete restrict,
  slug text not null unique check (slug ~ '^[a-z0-9][a-z0-9-]{1,79}$'),
  name text not null check (char_length(btrim(name)) between 2 and 160),
  short_description text not null default '' check (char_length(short_description) <= 300),
  description text not null default '' check (char_length(description) <= 5000),
  -- رمز الصنف الداخلي (اختياري) — للجرد لا للعميل.
  sku text not null default '' check (char_length(sku) <= 60),
  -- السيريال الأساسي (اختياري): يُضبط في التسليم لكل وحدة مسلّمة.
  serial_number text not null default '' check (char_length(serial_number) <= 120),
  -- الكمية القابلة للتأجير — بوابة منع البيع المزدوج.
  quantity integer not null default 1 check (quantity between 0 and 9999),
  -- سعر اليوم بالهللات — كل مبالغ المشروع تُخزَّن هللات صريحة.
  price_per_day_halalas integer not null check (price_per_day_halalas between 100 and 999999999),
  -- قيمة الاستبدال المعلنة في العقد (لا تُحصَّل تلقائيًا — للتوعية والتعويض).
  replacement_value_halalas integer not null default 0 check (replacement_value_halalas >= 0),
  -- مواصفات مرنة: مصفوفة [{ "label": "...", "value": "..." }].
  specs jsonb not null default '[]'::jsonb check (jsonb_typeof(specs) = 'array'),
  status public.equipment_status not null default 'available',
  -- «مميّزة» ترفعها في الواجهة، و«منشورة» تعني قابلة للتأجير.
  featured boolean not null default false,
  published boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- المعدة المعطّلة/المسحوبة لا تُنشر: حالة تشغيلية صارمة.
  constraint equipment_items_published_usable
    check (not published or status in ('available', 'rented'))
);

create index idx_equipment_items_listing
  on public.equipment_items (published, category_id, sort_order, created_at desc);
create index idx_equipment_items_featured
  on public.equipment_items (published, featured, created_at desc);

-- ─────────────────────────────── الصور ───────────────────────────────

create table public.equipment_images (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.equipment_items(id) on delete cascade,
  storage_path text not null check (char_length(storage_path) <= 512),
  alt_text text not null default '' check (char_length(alt_text) <= 200),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  constraint equipment_images_path_unique unique (item_id, storage_path)
);

create index idx_equipment_images_item
  on public.equipment_images (item_id, sort_order, created_at);

-- ─────────────────────────── عقد الإيجار بإصدارات ───────────────────────────

-- نص العقد كاملًا في كل إصدار: تعديل العقد يُنشئ إصدارًا جديدًا فيبقى نص
-- ما وقّعه كل عميل قابلًا للإثبات. الإصدار المفعّل هو الأعلى رقمًا.
create table public.equipment_agreements (
  id uuid primary key default gen_random_uuid(),
  version integer not null unique check (version between 1 and 100000),
  title text not null check (char_length(btrim(title)) between 2 and 200),
  body text not null check (char_length(btrim(body)) between 20 and 40000),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_equipment_agreements_active
  on public.equipment_agreements (active, version desc);

-- ─────────────────────────────── الإيجار ───────────────────────────────

create table public.equipment_rentals (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.equipment_items(id) on delete restrict,
  -- لقطة بالاسم: حذف/تعديل المعدة لا يمحو سجلًا ماليًا قائمًا.
  item_name_snapshot text not null default '' check (char_length(item_name_snapshot) <= 200),
  quantity integer not null check (quantity between 1 and 9999),
  start_date date not null check (start_date >= '2026-01-01'::date),
  end_date date not null check (end_date >= '2026-01-01'::date),
  constraint equipment_rentals_date_range check (end_date >= start_date),

  method public.equipment_handover_method not null default 'pickup',
  -- عنوان التوصيل إلزامي عند التوصيل: قيد منطقي أدناه.
  delivery_address text check (delivery_address is null or char_length(delivery_address) <= 500),
  delivery_fee_halalas integer not null default 0 check (delivery_fee_halalas >= 0),

  customer_type text not null
    check (customer_type in ('individual', 'company', 'advertiser', 'other')),
  customer_name text not null check (char_length(btrim(customer_name)) between 2 and 80),
  company_name text check (company_name is null or char_length(btrim(company_name)) between 2 and 120),
  email text not null
    check (email = lower(email) and char_length(email) <= 254 and email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]{2,}$'),
  phone text not null check (phone ~ '^9665[0-9]{8}$'),
  notes text check (notes is null or char_length(notes) <= 2000),

  -- ── الهوية: تُسجَّل صراحةً بحالتها، ولا يُدَّعى تحقق لم يحدث ──
  -- رقم الهوية الوطنية/الإقامة كما أدخله العميل (10 أرقام).
  national_id text not null check (national_id ~ '^[0-9]{10}$'),
  identity_status public.equipment_identity_status not null default 'pending',
  identity_reference text check (identity_reference is null or char_length(identity_reference) <= 200),
  identity_verified_at timestamptz,
  constraint equipment_rentals_identity_time
    check (identity_status <> 'verified' or identity_verified_at is not null),

  -- ── العقد: الإصدار المقبول وتوقيعه ──
  agreement_version integer not null check (agreement_version between 1 and 100000),
  agreement_accepted_at timestamptz not null default now(),
  -- التوقيع: الاسم كما كتبه الموقّع + بصمة نصية (اسم+هوية+إصدار+طابع).
  signature_name text not null check (char_length(btrim(signature_name)) between 2 and 120),
  signature_hash text not null check (signature_hash ~ '^[a-f0-9]{64}$'),
  signature_ip text check (signature_ip is null or char_length(signature_ip) <= 64),

  -- حياة الإيجار.
  status public.equipment_rental_status not null default 'pending'
    check (status in ('pending', 'confirmed', 'out_on_rent', 'returned', 'closed', 'cancelled', 'expired')),
  -- حياة الدفع: معجم ميسّر نفسه كما في بقية الجداول المالية.
  payment_status text not null default 'created'
    check (payment_status in ('created', 'pending', 'authorized', 'paid', 'failed', 'cancelled', 'expired', 'refunded')),

  provider public.payment_provider not null default 'moyasar',
  environment public.payment_environment not null,

  -- لقطة تجارية بالهللات: net + tax = total حرفيًا. الإجمالي يشمل رسوم التوصيل.
  rental_days integer not null check (rental_days between 1 and 365),
  rental_amount_halalas integer not null check (rental_amount_halalas between 100 and 999999999),
  net_amount integer not null check (net_amount between 1 and 999999999),
  tax_amount integer not null default 0 check (tax_amount >= 0),
  total_amount integer not null check (total_amount between 100 and 999999999),
  tax_rate_bps integer not null check (tax_rate_bps between 0 and 10000),
  currency char(3) not null default 'SAR' check (currency = 'SAR'),

  idempotency_key uuid not null default gen_random_uuid(),
  provider_payment_id text
    check (provider_payment_id is null or char_length(btrim(provider_payment_id)) between 1 and 128),
  provider_checkout_url text check (provider_checkout_url is null or char_length(provider_checkout_url) <= 2048),
  checkout_expires_at timestamptz,
  paid_at timestamptz,
  failed_at timestamptz,
  refunded_at timestamptz,
  refunded_amount integer not null default 0 check (refunded_amount >= 0),
  failure_code text not null default '' check (char_length(failure_code) <= 64),

  cancelled_at timestamptz,
  cancelled_by uuid,
  admin_note text check (admin_note is null or char_length(admin_note) <= 1000),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- الإجمالي = الصافي + الضريبة حرفيًا.
  constraint equipment_rentals_total_matches check (total_amount = net_amount + tax_amount),
  -- «مؤكّد» وما بعده لا يكون بلا دفع ناجح.
  constraint equipment_rentals_paid_states
    check (status not in ('confirmed', 'out_on_rent', 'returned', 'closed') or payment_status = 'paid'),
  constraint equipment_rentals_paid_has_time check (payment_status <> 'paid' or paid_at is not null),
  constraint equipment_rentals_cancelled_has_time check (status <> 'cancelled' or cancelled_at is not null),
  constraint equipment_rentals_refunded_has_time check (payment_status <> 'refunded' or refunded_at is not null),
  -- التوصيل يلزمه عنوان.
  constraint equipment_rentals_delivery_address
    check (method <> 'delivery' or (delivery_address is not null and char_length(btrim(delivery_address)) >= 5)),
  constraint equipment_rentals_idempotency_unique unique (idempotency_key)
);

-- عملية المزود الواحدة لا تؤكد إيجارين.
create unique index uq_equipment_rentals_provider_ref
  on public.equipment_rentals (provider, provider_payment_id)
  where provider_payment_id is not null;

-- محاولة دفع مفتوحة واحدة لكل بريد في المعدة: الضغط المكرر يعيد نفس الصفحة.
create unique index uq_equipment_rentals_one_open
  on public.equipment_rentals (item_id, email)
  where status = 'pending' and payment_status in ('created', 'pending', 'authorized');

create index idx_equipment_rentals_dates
  on public.equipment_rentals (item_id, start_date, end_date);
create index idx_equipment_rentals_status
  on public.equipment_rentals (status, start_date desc);
create index idx_equipment_rentals_email
  on public.equipment_rentals (email);

-- ─────────────────────── محاضر التسليم والاسترجاع ───────────────────────

create table public.equipment_rental_inspections (
  id uuid primary key default gen_random_uuid(),
  rental_id uuid not null references public.equipment_rentals(id) on delete cascade,
  kind public.equipment_inspection_kind not null,
  -- السيريال الفعلي المسلَّم/المستلَم.
  serial_number text not null default '' check (char_length(serial_number) <= 120),
  -- قائمة تحقق الحالة: [{ "label": "...", "ok": true, "note": "" }].
  checklist jsonb not null default '[]'::jsonb check (jsonb_typeof(checklist) = 'array'),
  accessories text not null default '' check (char_length(accessories) <= 2000),
  -- وسائط (صور/فيديو) في bm-media: [{ "path": "...", "kind": "image" }].
  media jsonb not null default '[]'::jsonb check (jsonb_typeof(media) = 'array'),
  -- إقرار المستلم بالتسليم أو الاسترجاع.
  acknowledged_by_name text not null check (char_length(btrim(acknowledged_by_name)) between 2 and 120),
  acknowledged_by_id text not null check (acknowledged_by_id ~ '^[0-9]{10}$'),
  damage_note text check (damage_note is null or char_length(damage_note) <= 2000),
  -- الموظف/المندوب الذي أجرى المحضر.
  actor_id uuid,
  created_at timestamptz not null default now(),
  -- محضر واحد لكل نوع لكل إيجار: التسليم مرة والاسترجاع مرة.
  constraint equipment_rental_inspections_unique unique (rental_id, kind)
);

create index idx_equipment_rental_inspections_rental
  on public.equipment_rental_inspections (rental_id, kind);

-- ─────────────────────────── سجل التدقيق ───────────────────────────

-- append-only: لا تحديث ولا حذف (منع في القاعدة عبر منحة service_role بلا
-- update/delete، وقاعدة تمنع الكتابة المتأخرة).
create table public.equipment_audit_events (
  id uuid primary key default gen_random_uuid(),
  rental_id uuid references public.equipment_rentals(id) on delete restrict,
  item_id uuid references public.equipment_items(id) on delete restrict,
  event_type text not null check (char_length(event_type) <= 64),
  from_status text not null default '' check (char_length(from_status) <= 40),
  to_status text not null default '' check (char_length(to_status) <= 40),
  actor_id uuid,
  detail jsonb not null default '{}'::jsonb check (jsonb_typeof(detail) = 'object'),
  created_at timestamptz not null default now()
);

create index idx_equipment_audit_events_rental
  on public.equipment_audit_events (rental_id, created_at desc);

-- ─────────────────────────── مشغّلات updated_at ───────────────────────────

create trigger trg_equipment_categories_updated_at before update
  on public.equipment_categories for each row execute function public.set_updated_at();
create trigger trg_equipment_items_updated_at before update
  on public.equipment_items for each row execute function public.set_updated_at();
create trigger trg_equipment_agreements_updated_at before update
  on public.equipment_agreements for each row execute function public.set_updated_at();
create trigger trg_equipment_rentals_updated_at before update
  on public.equipment_rentals for each row execute function public.set_updated_at();

-- ─────────────────────── حارس الكمية (منع الازدواج) ───────────────────────
-- تطابق زمني بين إيجارين حاجزين لنفس المعدة بحيث يتجاوز مجموعهما الكمية =
-- مبيع مزدوج. الفحص في التطبيق يسبق الكتابة، وهذا الحارس يسدّ نافذة التزامن.
create or replace function public.prevent_equipment_overbook()
returns trigger
language plpgsql
as $$
declare
  reserved integer;
  capacity integer;
begin
  /* الصف الجديد لا يحجز كمية: ملغى، أو منتهٍ، أو pending بمهلة انتهت. */
  if not (
    new.status in ('confirmed', 'out_on_rent', 'returned')
    or (
      new.status = 'pending'
      and new.payment_status in ('created', 'pending', 'authorized')
      and new.checkout_expires_at is not null
      and new.checkout_expires_at > now()
    )
  ) then
    return new;
  end if;

  select quantity into capacity from public.equipment_items where id = new.item_id;
  if capacity is null then
    raise exception 'equipment_item_missing'
      using message = 'equipment_item_missing';
  end if;

  select coalesce(sum(b.quantity), 0) into reserved
  from public.equipment_rentals b
  where b.id is distinct from new.id
    and b.item_id = new.item_id
    and (
      b.status in ('confirmed', 'out_on_rent', 'returned')
      or (
        b.status = 'pending'
        and b.payment_status in ('created', 'pending', 'authorized')
        and b.checkout_expires_at is not null
        and b.checkout_expires_at > now()
      )
    )
    /* تقاطع فترة الإيجار (شمولية الأيام): b.start <= new.end و b.end >= new.start. */
    and b.start_date <= new.end_date
    and b.end_date >= new.start_date;

  if reserved + new.quantity > capacity then
    raise exception 'equipment_quantity_exhausted'
      using message = 'equipment_quantity_exhausted',
            hint = 'الكمية المتاحة من هذه المعدة لا تكفي في هذه الفترة.';
  end if;

  return new;
end;
$$;

create trigger trg_equipment_rentals_overbook
  before insert or update on public.equipment_rentals
  for each row execute function public.prevent_equipment_overbook();

-- ─────────────────────────────── RLS ───────────────────────────────

alter table public.equipment_categories enable row level security;
alter table public.equipment_items enable row level security;
alter table public.equipment_images enable row level security;
alter table public.equipment_agreements enable row level security;
alter table public.equipment_rentals enable row level security;
alter table public.equipment_rental_inspections enable row level security;
alter table public.equipment_audit_events enable row level security;

revoke all on public.equipment_categories from public, anon, authenticated;
revoke all on public.equipment_items from public, anon, authenticated;
revoke all on public.equipment_images from public, anon, authenticated;
revoke all on public.equipment_agreements from public, anon, authenticated;
revoke all on public.equipment_rentals from public, anon, authenticated;
revoke all on public.equipment_rental_inspections from public, anon, authenticated;
revoke all on public.equipment_audit_events from public, anon, authenticated;

-- قراءة عامة للتصنيفات والمعدات المنشورة وصورها فقط.
grant select on public.equipment_categories to anon, authenticated;
grant select on public.equipment_items to anon, authenticated;
grant select on public.equipment_images to anon, authenticated;

create policy public_equipment_categories_select
  on public.equipment_categories
  for select to anon, authenticated
  using (published);

create policy public_equipment_items_select
  on public.equipment_items
  for select to anon, authenticated
  using (
    published
    and exists (
      select 1 from public.equipment_categories as parent
      where parent.id = category_id and parent.published
    )
  );

create policy public_equipment_images_select
  on public.equipment_images
  for select to anon, authenticated
  using (exists (
    select 1 from public.equipment_items as parent
    where parent.id = item_id and parent.published
  ));

-- الإيجارات والمحاضر والتدقيق والعقود: الخادم وحده. ولا حذف — السجل المالي
-- والعقدي لا يُمحى. سجل التدقيق append-only: بلا update/delete أصلًا.
grant select, insert, update on public.equipment_rentals to service_role;
grant select, insert, update on public.equipment_rental_inspections to service_role;
grant select, insert on public.equipment_audit_events to service_role;
grant select, insert, update, delete on public.equipment_categories to service_role;
grant select, insert, update, delete on public.equipment_items to service_role;
grant select, insert, update, delete on public.equipment_images to service_role;
grant select, insert, update, delete on public.equipment_agreements to service_role;

commit;
