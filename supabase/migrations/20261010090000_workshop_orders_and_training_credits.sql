-- ورش حضورية بدفع كامل أو عربون + الرصيد التدريبي.
--
-- إضافي بالكامل: جداول جديدة ودوال جديدة، لا مساس بـ course_payments ولا
-- guest_course_orders ولا أي جدول قائم.
--
-- قواعد لا تُكسر:
--   1. المبالغ بالهللات، والمبلغ المحصَّل يقرره الخادم لا المتصفح.
--   2. «مدفوع» لا يُكتب إلا بعد سؤال ميسّر ومطابقة المرجع والمبلغ والعملة
--      والمعرّف والبيئة (في الخادم). كل دفعة صف مستقل في workshop_payments،
--      وانتقال حالتها تحديث شرطي واحد: التكرار بلا أثر ثانٍ.
--   3. الرصيد التدريبي يُنشأ ويُستهلك بدوال ذرية تنفذها الخدمة وحدها، ولا
--      يملك المتصفح أي صلاحية على هذه الجداول.
--   4. لا استرداد مالي تلقائي: «استرداد مستحق» حالة يعالجها إداري يدويًا.

begin;

-- ─────────────────────────────── الطلبات ───────────────────────────────

create table public.workshop_orders (
  id uuid primary key default gen_random_uuid(),
  workshop_slug text not null check (workshop_slug ~ '^[a-z0-9-]{3,80}$'),
  workshop_title_snapshot text not null default '' check (char_length(workshop_title_snapshot) <= 200),
  environment public.payment_environment not null,
  status text not null default 'pending'
    check (status in ('pending','deposit_paid','paid','cancelled_by_customer','cancelled_by_academy','expired')),
  payment_plan text not null check (payment_plan in ('full','deposit')),

  customer_name text not null check (char_length(btrim(customer_name)) between 2 and 80),
  email text not null
    check (email = lower(email) and char_length(email) <= 254 and email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]{2,}$'),
  phone text not null check (phone ~ '^9665[0-9]{8}$'),

  currency char(3) not null default 'SAR' check (currency = 'SAR'),
  total_amount integer not null check (total_amount between 100 and 999999999),
  deposit_amount integer not null default 0 check (deposit_amount >= 0),
  -- مجموع الدفعات المؤكدة. بلا سقف عمدًا: دفعة متأخرة حقيقية لا تُرفض،
  -- وتظهر للإدارة «دفعًا زائدًا» للمراجعة.
  paid_amount integer not null default 0 check (paid_amount >= 0),

  -- رابط سداد المتبقي: يُحفظ تجزئة الرمز فقط (SHA-256)، والرمز نفسه لا يُخزَّن.
  balance_token_hash text check (balance_token_hash is null or balance_token_hash ~ '^[0-9a-f]{64}$'),
  balance_link_created_at timestamptz,

  refund_status text not null default 'none' check (refund_status in ('none','due','refunded')),
  refund_due_amount integer not null default 0 check (refund_due_amount >= 0),
  refunded_at timestamptz,
  cancelled_at timestamptz,
  cancelled_by uuid,
  admin_note text not null default '' check (char_length(admin_note) <= 1000),

  utm_source text check (utm_source is null or char_length(utm_source) <= 200),
  utm_medium text check (utm_medium is null or char_length(utm_medium) <= 200),
  utm_campaign text check (utm_campaign is null or char_length(utm_campaign) <= 200),
  utm_content text check (utm_content is null or char_length(utm_content) <= 200),
  utm_term text check (utm_term is null or char_length(utm_term) <= 200),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint workshop_orders_plan_deposit check (
    (payment_plan = 'full' and deposit_amount = 0)
    or (payment_plan = 'deposit' and deposit_amount > 0 and deposit_amount < total_amount)
  ),
  constraint workshop_orders_cancel_has_time check (
    status not in ('cancelled_by_customer','cancelled_by_academy') or cancelled_at is not null
  ),
  constraint workshop_orders_refunded_has_time check (refund_status <> 'refunded' or refunded_at is not null)
);

-- حجز حي واحد لكل بريد في الورشة: الضغط المكرر يعيد الطلب نفسه.
create unique index uq_workshop_orders_live_email
  on public.workshop_orders (workshop_slug, email)
  where status in ('pending','deposit_paid','paid');
create unique index uq_workshop_orders_balance_token
  on public.workshop_orders (balance_token_hash)
  where balance_token_hash is not null;
create index idx_workshop_orders_phone on public.workshop_orders (workshop_slug, phone);
create index idx_workshop_orders_status on public.workshop_orders (workshop_slug, status, created_at desc);

create trigger trg_workshop_orders_updated_at before update
  on public.workshop_orders for each row execute function public.set_updated_at();

-- ─────────────────────────────── الدفعات ───────────────────────────────

create table public.workshop_payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.workshop_orders(id) on delete restrict,
  kind text not null check (kind in ('full','deposit','balance')),
  provider public.payment_provider not null default 'moyasar',
  environment public.payment_environment not null,
  status text not null default 'created'
    check (status in ('created','pending','authorized','paid','failed','cancelled','expired','refunded')),
  amount integer not null check (amount between 100 and 999999999),
  currency char(3) not null default 'SAR' check (currency = 'SAR'),
  idempotency_key uuid not null default gen_random_uuid(),
  provider_payment_id text
    check (provider_payment_id is null or char_length(btrim(provider_payment_id)) between 1 and 128),
  provider_checkout_url text check (provider_checkout_url is null or char_length(provider_checkout_url) <= 2048),
  checkout_expires_at timestamptz,
  paid_at timestamptz,
  failed_at timestamptz,
  failure_code text not null default '' check (char_length(failure_code) <= 64),
  refunded_amount integer not null default 0 check (refunded_amount >= 0),
  refunded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint workshop_payments_idempotency_unique unique (idempotency_key),
  constraint workshop_payments_paid_has_time check (status <> 'paid' or paid_at is not null)
);

-- عملية المزود الواحدة لا تؤكد دفعتين.
create unique index uq_workshop_payments_provider_ref
  on public.workshop_payments (provider, provider_payment_id)
  where provider_payment_id is not null;
-- محاولة دفع مفتوحة واحدة لكل طلب.
create unique index uq_workshop_payments_one_open
  on public.workshop_payments (order_id)
  where status in ('created','pending','authorized');
create index idx_workshop_payments_order on public.workshop_payments (order_id, status);

create trigger trg_workshop_payments_updated_at before update
  on public.workshop_payments for each row execute function public.set_updated_at();

-- ─────────────────────────────── الرصيد التدريبي ───────────────────────────────
-- عام لأي مصدر مستقبلًا (source_type)، والمصدر الواحد لا ينتج رصيدين.

create table public.training_credits (
  id uuid primary key default gen_random_uuid(),
  holder_name text not null check (char_length(btrim(holder_name)) between 2 and 80),
  holder_email text not null check (holder_email = lower(holder_email) and char_length(holder_email) <= 254),
  holder_phone text not null check (holder_phone ~ '^9665[0-9]{8}$'),
  source_type text not null check (source_type in ('workshop_order')),
  source_id uuid not null,
  currency char(3) not null default 'SAR' check (currency = 'SAR'),
  original_amount integer not null check (original_amount > 0),
  balance integer not null check (balance >= 0),
  status text not null default 'active' check (status in ('active','used','void')),
  issued_at timestamptz not null default now(),
  expires_at timestamptz not null,
  created_by uuid,
  note text not null default '' check (char_length(note) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint training_credits_balance_within check (balance <= original_amount),
  constraint training_credits_used_is_empty check (status <> 'used' or balance = 0),
  constraint training_credits_expiry_after_issue check (expires_at > issued_at),
  constraint training_credits_one_per_source unique (source_type, source_id)
);
create index idx_training_credits_holder_email on public.training_credits (holder_email, status);
create index idx_training_credits_holder_phone on public.training_credits (holder_phone, status);

create trigger trg_training_credits_updated_at before update
  on public.training_credits for each row execute function public.set_updated_at();

create table public.training_credit_transactions (
  id uuid primary key default gen_random_uuid(),
  credit_id uuid not null references public.training_credits(id) on delete restrict,
  kind text not null check (kind in ('issue','redeem','void')),
  amount integer not null check (amount > 0),
  reference text not null default '' check (char_length(reference) <= 200),
  created_by uuid,
  created_at timestamptz not null default now(),
  -- المرجع نفسه (مثل رقم طلب الدورة) لا يُستهلك به الرصيد مرتين.
  constraint training_credit_tx_unique_reference unique (credit_id, kind, reference)
);
create index idx_training_credit_tx_credit on public.training_credit_transactions (credit_id, created_at);

-- ─────────────────────────────── دوال ذرية ───────────────────────────────

-- إلغاء من المشترك: الطلب يُلغى، وكامل المدفوع يصبح رصيدًا صالحًا سنة ميلادية.
create or replace function public.cancel_workshop_order_to_credit(p_order_id uuid, p_actor uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.workshop_orders%rowtype;
  v_credit_id uuid;
begin
  update public.workshop_orders
     set status = 'cancelled_by_customer', cancelled_at = now(), cancelled_by = p_actor
   where id = p_order_id and status in ('pending','deposit_paid','paid')
  returning * into v_order;
  if not found then
    raise exception 'order_not_cancellable' using errcode = 'P0001';
  end if;

  if v_order.paid_amount > 0 then
    insert into public.training_credits
      (holder_name, holder_email, holder_phone, source_type, source_id,
       original_amount, balance, issued_at, expires_at, created_by, note)
    values
      (v_order.customer_name, v_order.email, v_order.phone, 'workshop_order', v_order.id,
       v_order.paid_amount, v_order.paid_amount, now(), now() + interval '1 year', p_actor,
       'إلغاء من المشترك — ' || v_order.workshop_title_snapshot)
    returning id into v_credit_id;

    insert into public.training_credit_transactions (credit_id, kind, amount, reference, created_by)
    values (v_credit_id, 'issue', v_order.paid_amount, 'workshop_order:' || v_order.id::text, p_actor);
  end if;

  return v_credit_id;
end;
$$;

-- استخدام الرصيد: نشط، غير منتهٍ، يكفي المبلغ، ومرجع لم يُستعمل — في عملية واحدة.
create or replace function public.redeem_training_credit(
  p_credit_id uuid, p_amount integer, p_reference text, p_actor uuid
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_balance integer;
begin
  if p_amount is null or p_amount <= 0 then
    raise exception 'invalid_amount' using errcode = 'P0001';
  end if;
  if coalesce(btrim(p_reference), '') = '' then
    raise exception 'reference_required' using errcode = 'P0001';
  end if;

  update public.training_credits
     set balance = balance - p_amount,
         status = case when balance - p_amount = 0 then 'used' else status end
   where id = p_credit_id
     and status = 'active'
     and expires_at > now()
     and balance >= p_amount
  returning balance into v_balance;
  if not found then
    raise exception 'credit_unavailable' using errcode = 'P0001';
  end if;

  -- القيد الفريد يُفشل التكرار فيُلغى الخصم أعلاه مع المعاملة كلها.
  insert into public.training_credit_transactions (credit_id, kind, amount, reference, created_by)
  values (p_credit_id, 'redeem', p_amount, btrim(p_reference), p_actor);

  return v_balance;
end;
$$;

-- ─────────────────────────────── RLS والصلاحيات ───────────────────────────────
-- لا سياسة لأي دور متصفح. الخادم وحده (service_role) يقرأ ويكتب — بلا حذف.

alter table public.workshop_orders enable row level security;
alter table public.workshop_payments enable row level security;
alter table public.training_credits enable row level security;
alter table public.training_credit_transactions enable row level security;

-- Supabase يمنح الأدوار كلها (ومنها service_role) صلاحيات افتراضية على كل جدول
-- جديد في public: تُسحب كلها أولًا، ثم يُمنح الخادم ما يحتاجه فقط.
revoke all on public.workshop_orders, public.workshop_payments,
  public.training_credits, public.training_credit_transactions
  from public, anon, authenticated, service_role;
grant select, insert, update on public.workshop_orders, public.workshop_payments to service_role;
-- الرصيد وحركاته: القراءة للخادم، والكتابة عبر الدوال الذرية فقط.
grant select on public.training_credits, public.training_credit_transactions to service_role;

revoke all on function public.cancel_workshop_order_to_credit(uuid, uuid) from public, anon, authenticated, service_role;
revoke all on function public.redeem_training_credit(uuid, integer, text, uuid) from public, anon, authenticated, service_role;
grant execute on function public.cancel_workshop_order_to_credit(uuid, uuid) to service_role;
grant execute on function public.redeem_training_credit(uuid, integer, text, uuid) to service_role;

commit;
