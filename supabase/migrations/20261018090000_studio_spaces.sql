-- ═══════════════════════════════════════════════════════════════════
-- مساحات الاستوديو وحجوزاتها — Bayt Almosawer (2026-10-18)
--
-- إضافي بالكامل: أربعة جداول جديدة وفهارسها ومشغّل updated_at وحارس
-- التعارض وسياساتها. لا يلمس أي جدول أو دالة أو سياسة قائمة.
--
--  - studio_spaces: المساحة كما تُدار من اللوحة (اسم ووصف وسعر الساعة
--    وحالة النشر). لا محتوى ثابت هنا: كل مساحة تُضاف من الباك اند.
--  - studio_space_images: معرض صور المساحة (مسارات في bm-media).
--  - studio_space_hours: أيام الحجز ونطاقات الوقت «من — إلى» متعددة لكل يوم.
--  - studio_space_bookings: الحجز = صف واحد يجمع الحجز والدفع (نمط
--    guest_course_orders): الحجز يُؤكد لحظيًا بعد تحقق الخادم من ميسر،
--    ولا يُخزَّن أي شيء من البطاقة.
--
-- قاعدة التعارض: الحجز «حاجز للموعد» حين يكون مؤكّدًا، أو pending بمحاولة
-- دفع لم تنتهِ مهلتها. المهلة المنتهية لا تحجز الوقت.
-- ═══════════════════════════════════════════════════════════════════

begin;

-- ─────────────────────────────── المساحة ───────────────────────────────
create table public.studio_spaces (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9][a-z0-9-]{1,79}$'),
  name text not null check (char_length(btrim(name)) between 2 and 120),
  short_description text not null default '' check (char_length(short_description) <= 300),
  description text not null default '' check (char_length(description) <= 5000),
  -- سعر الساعة بالهللات — كل مبالغ المشروع تُخزَّن هللات صريحة.
  price_per_hour_halalas integer not null check (price_per_hour_halalas between 100 and 999999999),
  publish_status public.publish_status not null default 'draft',
  featured boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_studio_spaces_listing
  on public.studio_spaces (publish_status, sort_order, created_at desc);

-- ─────────────────────────────── الصور ───────────────────────────────
create table public.studio_space_images (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.studio_spaces(id) on delete cascade,
  storage_path text not null check (char_length(storage_path) <= 512),
  alt_text text not null default '' check (char_length(alt_text) <= 200),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  constraint studio_space_images_path_unique unique (space_id, storage_path)
);

create index idx_studio_space_images_space
  on public.studio_space_images (space_id, sort_order, created_at);

-- ───────────────────── أيام الحجز والوقت «من — إلى» ─────────────────────
-- day_of_week بحسب extract(dow): 0=الأحد … 6=السبت.
-- نطاقات متعددة في اليوم الواحد مسموحة (صباح ومساء مثلًا).
create table public.studio_space_hours (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.studio_spaces(id) on delete cascade,
  day_of_week smallint not null check (day_of_week between 0 and 6),
  start_time time not null,
  end_time time not null,
  constraint studio_space_hours_range check (end_time > start_time),
  constraint studio_space_hours_unique unique (space_id, day_of_week, start_time)
);

create index idx_studio_space_hours_lookup
  on public.studio_space_hours (space_id, day_of_week);

-- ─────────────────────────────── الحجز ───────────────────────────────
create table public.studio_space_bookings (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.studio_spaces(id) on delete restrict,
  -- لقطة بالاسم: حذف/تعديل المساحة لا يمحو سجلًا ماليًا قائمًا.
  space_name_snapshot text not null default '' check (char_length(space_name_snapshot) <= 200),
  booking_date date not null check (booking_date >= '2026-01-01'::date),
  start_time time not null,
  end_time time not null,
  constraint studio_space_bookings_range check (end_time > start_time),

  -- نوع مزوّد الحجز: فرد، شركة، معلن/جهة إعلانية، أو أي أحد.
  customer_type text not null
    check (customer_type in ('individual', 'company', 'advertiser', 'other')),
  customer_name text not null check (char_length(btrim(customer_name)) between 2 and 80),
  company_name text check (company_name is null or char_length(btrim(company_name)) between 2 and 120),
  email text not null
    check (email = lower(email) and char_length(email) <= 254 and email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]{2,}$'),
  phone text not null check (phone ~ '^9665[0-9]{8}$'),
  notes text check (notes is null or char_length(notes) <= 2000),

  -- حياة الحجز: بانتظار الدفع ← مؤكّد ← مكتمل، أو ملغى/منتهي.
  status text not null default 'pending'
    check (status in ('pending', 'confirmed', 'completed', 'cancelled', 'expired')),
  -- حياة الدفع: معجم ميسّر نفسه كما في guest_course_orders.
  payment_status text not null default 'created'
    check (payment_status in ('created', 'pending', 'authorized', 'paid', 'failed', 'cancelled', 'expired', 'refunded')),

  provider public.payment_provider not null default 'moyasar',
  -- صف بيئة الاختبار لا يُؤكَّد بمفتاح إنتاج، والعكس.
  environment public.payment_environment not null,

  -- لقطة تجارية بالهللات: net + total_ = total حرفيًا.
  duration_minutes integer not null check (duration_minutes between 30 and 1440),
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
  -- رمزنا نحن (مثل amount_mismatch)، لا رسالة المزود.
  failure_code text not null default '' check (char_length(failure_code) <= 64),

  cancelled_at timestamptz,
  -- معرّف المشرف الذي ألغى (بلا مفتاح أجنبي: جدول auth خارج نطاق الاشتراك).
  cancelled_by uuid,
  admin_note text check (admin_note is null or char_length(admin_note) <= 1000),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint studio_space_bookings_total_matches check (total_amount = net_amount + tax_amount),
  -- «مؤكّد» و«مكتمل» لا يكونان بلا دفع ناجح — التأكيد يأتي من ميسر وحده.
  constraint studio_space_bookings_confirmed_paid check (status <> 'confirmed' or payment_status = 'paid'),
  constraint studio_space_bookings_completed_paid check (status <> 'completed' or payment_status = 'paid'),
  constraint studio_space_bookings_paid_has_time check (payment_status <> 'paid' or paid_at is not null),
  constraint studio_space_bookings_cancelled_has_time check (status <> 'cancelled' or cancelled_at is not null),
  constraint studio_space_bookings_refunded_has_time check (payment_status <> 'refunded' or refunded_at is not null),
  constraint studio_space_bookings_idempotency_unique unique (idempotency_key)
);

-- عملية المزود الواحدة لا تؤكد حجزين.
create unique index uq_studio_space_bookings_provider_ref
  on public.studio_space_bookings (provider, provider_payment_id)
  where provider_payment_id is not null;

-- محاولة دفع مفتوحة واحدة لكل بريد في المساحة: الضغط المكرر يعيد
-- نفس صفحة الدفع ولا يفتح فاتورة ثانية.
create unique index uq_studio_space_bookings_one_open
  on public.studio_space_bookings (space_id, email)
  where status = 'pending' and payment_status in ('created', 'pending', 'authorized');

create index idx_studio_space_bookings_day
  on public.studio_space_bookings (space_id, booking_date, start_time);
create index idx_studio_space_bookings_status
  on public.studio_space_bookings (status, booking_date desc, start_time desc);
create index idx_studio_space_bookings_email
  on public.studio_space_bookings (email);

create trigger trg_studio_spaces_updated_at before update
  on public.studio_spaces for each row execute function public.set_updated_at();
create trigger trg_studio_space_bookings_updated_at before update
  on public.studio_space_bookings for each row execute function public.set_updated_at();

-- ─────────────────────── حرّاس التعارض (منع الازدواج) ───────────────────────
-- تطابق زمني بين حجزين لموقع واحد = مبيع مزدوج. الفحص في التطبيق يسبق
-- الكتابة، وهذا الحارس يسدّ نافذة التزامن على مستوى القاعدة.
create or replace function public.prevent_space_booking_overlap()
returns trigger
language plpgsql
as $$
declare
  clash public.studio_space_bookings%rowtype;
begin
  /* الصف الجديد لا يحجز موعدًا: ملغى، أو منتهي، أو pending بمهلة دفع انتهت. */
  if not (
    new.status = 'confirmed'
    or (
      new.status = 'pending'
      and new.payment_status in ('created', 'pending', 'authorized')
      and new.checkout_expires_at is not null
      and new.checkout_expires_at > now()
    )
  ) then
    return new;
  end if;

  select * into clash
  from public.studio_space_bookings b
  where b.id is distinct from new.id
    and b.space_id = new.space_id
    and b.booking_date = new.booking_date
    and (
      b.status = 'confirmed'
      or (
        b.status = 'pending'
        and b.payment_status in ('created', 'pending', 'authorized')
        and b.checkout_expires_at is not null
        and b.checkout_expires_at > now()
      )
    )
    and b.start_time < new.end_time
    and b.end_time > new.start_time
  limit 1;

  if found then
    raise exception 'space_slot_taken'
      using message = 'space_slot_taken',
            hint = 'الوقت محجوز بحجز آخر يحجز الموعد نفسه.';
  end if;

  return new;
end;
$$;

create trigger trg_studio_space_bookings_overlap
  before insert or update on public.studio_space_bookings
  for each row execute function public.prevent_space_booking_overlap();

-- ─────────────────────────────── RLS ───────────────────────────────
-- قراءة عامة فقط للمساحات المنشورة وصورها ومواعيدها — كما في بقية
-- المحتوى العام (نمط public_*_select في cp_c).
alter table public.studio_spaces enable row level security;
alter table public.studio_space_images enable row level security;
alter table public.studio_space_hours enable row level security;
alter table public.studio_space_bookings enable row level security;

revoke all on public.studio_spaces from public, anon, authenticated;
revoke all on public.studio_space_images from public, anon, authenticated;
revoke all on public.studio_space_hours from public, anon, authenticated;
revoke all on public.studio_space_bookings from public, anon, authenticated;

grant select on public.studio_spaces to anon, authenticated;
grant select on public.studio_space_images to anon, authenticated;
grant select on public.studio_space_hours to anon, authenticated;

create policy public_studio_spaces_select
  on public.studio_spaces
  for select to anon, authenticated
  using (publish_status = 'published'::public.publish_status);

create policy public_studio_space_images_select
  on public.studio_space_images
  for select to anon, authenticated
  using (exists (
    select 1 from public.studio_spaces as parent
    where parent.id = space_id
      and parent.publish_status = 'published'::public.publish_status
  ));

create policy public_studio_space_hours_select
  on public.studio_space_hours
  for select to anon, authenticated
  using (exists (
    select 1 from public.studio_spaces as parent
    where parent.id = space_id
      and parent.publish_status = 'published'::public.publish_status
  ));

-- الحجوزات لا تُقرأ ولا تُكتب من المتصفح: الخادم وحده (كما في الدفع).
-- بلا حذف: السجل المالي لا يُمحى.
grant select, insert, update on public.studio_space_bookings to service_role;

commit;
