-- ═══════════════════════════════════════════════════════════════════
-- Fast Guest Checkout — طلبات الضيوف (بلا حساب) لورشة صفحة الهبوط.
--
-- إضافي بالكامل: جدول جديد وفهارسه ومشغّل updated_at وصلاحياته. لا يلمس
-- أي جدول أو دالة أو سياسة قائمة (course_payments وfinalize_course_purchase
-- وcourse_enrollments كما هي).
--
-- الطلب المدفوع = حجز مؤكد. لا حساب ولا تسجيل في دورة في V1.
-- لا بيانات بطاقة ولا حمولة مزود خام — ما لا يُخزَّن لا يتسرب.
-- ═══════════════════════════════════════════════════════════════════

begin;

create table public.guest_course_orders (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete restrict,
  provider public.payment_provider not null,
  -- صف بيئة الاختبار لا يُؤكَّد بمفتاح إنتاج، والعكس.
  environment public.payment_environment not null,
  status text not null default 'created'
    check (status in ('created','pending','authorized','paid','failed','cancelled','expired','refunded')),

  -- بيانات التواصل فقط — مُطبَّعة على الخادم قبل الكتابة.
  customer_name text not null check (char_length(btrim(customer_name)) between 2 and 80),
  email text not null
    check (email = lower(email) and char_length(email) <= 254 and email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]{2,}$'),
  -- جوال سعودي بصيغة دولية بلا رموز: 9665XXXXXXXX.
  phone text not null check (phone ~ '^9665[0-9]{8}$'),

  -- لقطة تجارية بالهللات، كما في course_payments: net + tax = total حرفيًا.
  course_title_snapshot text not null default '' check (char_length(course_title_snapshot) <= 200),
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
  -- رمزنا نحن (مثل late_payment أو amount_mismatch)، لا رسالة المزود.
  failure_code text not null default '' check (char_length(failure_code) <= 64),
  -- طلب مدفوع ثانٍ لنفس البريد أو الجوال: يُسجَّل (المال حقيقي) ويُعلَّم للاسترداد.
  duplicate_of uuid references public.guest_course_orders(id) on delete set null,

  -- إسناد الحملة — لا يؤثر في السعر ولا الحالة.
  utm_source text check (utm_source is null or char_length(utm_source) <= 200),
  utm_medium text check (utm_medium is null or char_length(utm_medium) <= 200),
  utm_campaign text check (utm_campaign is null or char_length(utm_campaign) <= 200),
  utm_content text check (utm_content is null or char_length(utm_content) <= 200),
  utm_term text check (utm_term is null or char_length(utm_term) <= 200),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint guest_course_orders_total_matches check (total_amount = net_amount + tax_amount),
  constraint guest_course_orders_refund_within_total check (refunded_amount <= total_amount),
  constraint guest_course_orders_paid_has_time check (status <> 'paid' or paid_at is not null),
  constraint guest_course_orders_refunded_has_time check (status <> 'refunded' or refunded_at is not null),
  constraint guest_course_orders_idempotency_unique unique (idempotency_key)
);

-- عملية المزود الواحدة لا تؤكّد طلبين.
create unique index uq_guest_course_orders_provider_ref
  on public.guest_course_orders (provider, provider_payment_id)
  where provider_payment_id is not null;

-- محاولة مفتوحة واحدة لكل بريد في الدورة: الضغط المكرر يعيد نفس صفحة الدفع.
create unique index uq_guest_course_orders_one_open
  on public.guest_course_orders (course_id, email)
  where status in ('created','pending','authorized');

-- عمدًا بلا فهرس فريد على «مدفوع لكل بريد/جوال»: حين يصير الطلب مدفوعًا
-- يكون المال قد أُخذ فعلًا، والقيد هنا يمنع تسجيل دفعة حقيقية. التكرار
-- يُمنع قبل إنشاء الطلب ويُعلَّم بعده (duplicate_of).
create index idx_guest_course_orders_paid_email
  on public.guest_course_orders (course_id, email) where status = 'paid';
create index idx_guest_course_orders_paid_phone
  on public.guest_course_orders (course_id, phone) where status = 'paid';
create index idx_guest_course_orders_course_status
  on public.guest_course_orders (course_id, status, created_at desc);

create trigger trg_guest_course_orders_updated_at before update
  on public.guest_course_orders for each row execute function public.set_updated_at();

-- ─────────────────────────────── RLS ───────────────────────────────
-- لا سياسة لأي دور متصفح: الجدول غير موجود من منظور anon/authenticated.
-- الخادم وحده (service_role) يقرأ ويكتب — بلا حذف: السجل المالي لا يُمحى.
alter table public.guest_course_orders enable row level security;
revoke all on public.guest_course_orders from public, anon, authenticated;
grant select, insert, update on public.guest_course_orders to service_role;

commit;
