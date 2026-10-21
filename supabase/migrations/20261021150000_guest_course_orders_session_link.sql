-- ═══════════════════════════════════════════════════════════════════
-- ربط حجوزات الضيوف بالجلسات الحضورية (Fast Guest Checkout Session Link)
--
-- 1. إضافة عمودي session_id و hold_expires_at إلى جدول guest_course_orders.
-- 2. تحديث دالة session_availability لاستثناء الطلبات غير المؤكدة المقاعد.
-- 3. دالة claim_guest_session_order لحجز المقعد ذريًا بقفل الجلسة FOR UPDATE.
-- 4. دالة confirm_guest_payment لتأكيد الدفع المتأخر ذريًا بقفل الجلسة.
-- ═══════════════════════════════════════════════════════════════════

begin;

-- 1. إضافة عمودي session_id و hold_expires_at وفهارسهما
alter table public.guest_course_orders
  add column if not exists session_id uuid references public.course_sessions(id) on delete restrict,
  add column if not exists hold_expires_at timestamptz;

create index if not exists idx_guest_course_orders_session
  on public.guest_course_orders (session_id)
  where session_id is not null;

create index if not exists idx_guest_course_orders_session_status
  on public.guest_course_orders (session_id, status)
  where session_id is not null;

-- 2. تحديث دالة التوافر الموثوق لتشمل مقاعد الضيوف مع استبعاد المقاعد غير المتاحة
create or replace function public.session_availability(p_course_id uuid)
returns table (
  session_id uuid,
  capacity integer,
  manual_count integer,
  taken integer,
  available integer,
  selectable boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  select s.id,
         s.capacity,
         s.registered_count,
         (coalesce(o.taken, 0) + coalesce(g.taken, 0))::integer,
         greatest(s.capacity - s.registered_count - coalesce(o.taken, 0) - coalesce(g.taken, 0), 0)::integer,
         s.status in ('upcoming', 'open')
           and s.start_date >= current_date
           and s.capacity > 0
           and (s.capacity - s.registered_count - coalesce(o.taken, 0) - coalesce(g.taken, 0)) > 0
    from public.course_sessions s
    join public.courses c on c.id = s.course_id
    left join lateral (
      select count(*) as taken
        from public.course_session_seats z
       where z.session_id = s.id
         and (z.status = 'confirmed' or (z.status = 'held' and z.hold_expires_at > now()))
    ) o on true
    left join lateral (
      select count(*) as taken
        from public.guest_course_orders gco
       where gco.session_id = s.id
         and (
           (gco.status = 'paid' and coalesce(gco.failure_code, '') <> 'seat_unavailable')
           or (gco.status in ('created', 'pending', 'authorized') and coalesce(gco.hold_expires_at, gco.checkout_expires_at) > now())
         )
    ) g on true
   where s.course_id = p_course_id
     and c.publish_status = 'published'::public.course_publish_status;
$$;

-- 3. دالة المطالبة الذرية بمقعد ضيف
drop function if exists public.claim_guest_session_order(uuid, uuid, public.payment_provider, public.payment_environment, text, text, text, text, integer, integer, integer, integer, text, timestamptz, text, text, text, text, text);
drop function if exists public.claim_guest_session_order(uuid, uuid, public.payment_provider, public.payment_environment, text, text, text, text, integer, integer, integer, integer, text, timestamptz, text, text, text, text, text, timestamptz);

create or replace function public.claim_guest_session_order(
  p_course_id uuid,
  p_session_id uuid,
  p_provider public.payment_provider,
  p_environment public.payment_environment,
  p_customer_name text,
  p_email text,
  p_phone text,
  p_course_title_snapshot text,
  p_net_amount integer,
  p_tax_amount integer,
  p_total_amount integer,
  p_tax_rate_bps integer,
  p_currency text,
  p_checkout_expires_at timestamptz,
  p_utm_source text default null,
  p_utm_medium text default null,
  p_utm_campaign text default null,
  p_utm_content text default null,
  p_utm_term text default null,
  p_hold_expires_at timestamptz default null
)
returns table (
  order_id uuid,
  idempotency_key text
)
language plpgsql
volatile
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  v_session public.course_sessions%rowtype;
  v_taken_seats integer;
  v_taken_guest integer;
  v_order_id uuid;
  v_idempotency_key text;
  v_hold_expires_at timestamptz;
begin
  v_hold_expires_at := coalesce(p_hold_expires_at, p_checkout_expires_at + interval '5 minutes');

  if p_session_id is not null then
    -- قفل صف الجلسة لتسلسل الطلبات المتزامنة
    select * into v_session
      from public.course_sessions
     where id = p_session_id and course_id = p_course_id
       for update;
    if not found then
      raise exception 'session_not_found' using errcode = 'P0002';
    end if;
    if v_session.status not in ('upcoming'::public.session_status, 'open'::public.session_status) then
      raise exception 'session_not_open' using errcode = 'P0001';
    end if;
    if v_session.start_date < current_date then
      raise exception 'session_in_past' using errcode = 'P0001';
    end if;
    if v_session.capacity <= 0 then
      raise exception 'session_capacity_unset' using errcode = 'P0001';
    end if;

    select count(*) into v_taken_seats
      from public.course_session_seats
     where session_id = p_session_id
       and (status = 'confirmed' or (status = 'held' and hold_expires_at > now()));

    select count(*) into v_taken_guest
      from public.guest_course_orders gco
     where gco.session_id = p_session_id
       and (
         (gco.status = 'paid' and coalesce(gco.failure_code, '') <> 'seat_unavailable')
         or (gco.status in ('created', 'pending', 'authorized') and coalesce(gco.hold_expires_at, gco.checkout_expires_at) > now())
       );

    if v_session.registered_count + v_taken_seats + v_taken_guest >= v_session.capacity then
      raise exception 'session_full' using errcode = 'P0001';
    end if;
  end if;

  insert into public.guest_course_orders as gco (
    course_id,
    session_id,
    provider,
    environment,
    status,
    customer_name,
    email,
    phone,
    course_title_snapshot,
    net_amount,
    tax_amount,
    total_amount,
    tax_rate_bps,
    currency,
    checkout_expires_at,
    hold_expires_at,
    utm_source,
    utm_medium,
    utm_campaign,
    utm_content,
    utm_term
  ) values (
    p_course_id,
    p_session_id,
    p_provider,
    p_environment,
    'created',
    p_customer_name,
    p_email,
    p_phone,
    p_course_title_snapshot,
    p_net_amount,
    p_tax_amount,
    p_total_amount,
    p_tax_rate_bps,
    p_currency,
    p_checkout_expires_at,
    v_hold_expires_at,
    p_utm_source,
    p_utm_medium,
    p_utm_campaign,
    p_utm_content,
    p_utm_term
  )
  returning gco.id, gco.idempotency_key into v_order_id, v_idempotency_key;

  return query select v_order_id, v_idempotency_key;
end;
$$;

revoke all on function public.claim_guest_session_order(uuid, uuid, public.payment_provider, public.payment_environment, text, text, text, text, integer, integer, integer, integer, text, timestamptz, text, text, text, text, text, timestamptz) from public;
grant execute on function public.claim_guest_session_order(uuid, uuid, public.payment_provider, public.payment_environment, text, text, text, text, integer, integer, integer, integer, text, timestamptz, text, text, text, text, text, timestamptz) to service_role;

-- 4. دالة تأكيد الدفع مع قفل الجلسة وفحص السعة ذريًا
drop function if exists public.confirm_guest_payment(uuid, text, timestamptz);

create or replace function public.confirm_guest_payment(
  p_order_id uuid,
  p_provider_payment_id text,
  p_paid_at timestamptz default now()
)
returns table (
  outcome text,
  seat_confirmed boolean,
  failure_code text
)
language plpgsql
volatile
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  v_order public.guest_course_orders%rowtype;
  v_session public.course_sessions%rowtype;
  v_duplicate_of uuid;
  v_late boolean := false;
  v_seat_confirmed boolean := true;
  v_failure_code text := '';
  v_taken_seats integer;
  v_taken_guest integer;
begin
  -- 1. قفل صف الطلب
  select * into v_order
    from public.guest_course_orders
   where id = p_order_id
     for update;

  if not found then
    return query select 'not_found'::text, false, 'order_not_found'::text;
    return;
  end if;

  -- 2. التحقق من التكرار المسبق (Idempotency)
  if v_order.status = 'paid' then
    return query select 'paid'::text, (coalesce(v_order.failure_code, '') <> 'seat_unavailable'), v_order.failure_code;
    return;
  end if;

  -- 3. فحص الحجز المكرر لنفس البريد أو الجوال
  select id into v_duplicate_of
    from public.guest_course_orders
   where course_id = v_order.course_id
     and status = 'paid'
     and id <> v_order.id
     and (email = v_order.email or phone = v_order.phone)
   limit 1;

  -- 4. تحديد إن كان الدفع متأخرًا (انتهت مهلة الفاتورة أو الحجز)
  v_late := (v_order.status not in ('created', 'pending', 'authorized'))
            or (v_order.checkout_expires_at is not null and v_order.checkout_expires_at <= now())
            or (v_order.hold_expires_at is not null and v_order.hold_expires_at <= now());

  -- 5. إذا كان الطلب مرتبطاً بجلسة، نقفل صف الجلسة ذرياً للتأكد من وجودها وصلاحيتها وسعتها
  if v_order.session_id is not null then
    select * into v_session
      from public.course_sessions
     where id = v_order.session_id
       for update;

    if not found
       or v_session.capacity <= 0
       or v_session.status not in ('upcoming'::public.session_status, 'open'::public.session_status)
       or v_session.start_date < current_date then
      v_seat_confirmed := false;
      v_failure_code := 'seat_unavailable';
    else
      if v_late then
        -- حساب المقاعد المشغولة حالياً باستثناء هذا الطلب
        select count(*) into v_taken_seats
          from public.course_session_seats
         where session_id = v_order.session_id
           and (status = 'confirmed' or (status = 'held' and hold_expires_at > now()));

        select count(*) into v_taken_guest
          from public.guest_course_orders
         where session_id = v_order.session_id
           and id <> v_order.id
           and (
             (status = 'paid' and coalesce(failure_code, '') <> 'seat_unavailable')
             or (status in ('created', 'pending', 'authorized') and coalesce(hold_expires_at, checkout_expires_at) > now())
           );

        if (v_session.registered_count + v_taken_seats + v_taken_guest) >= v_session.capacity then
          v_seat_confirmed := false;
          v_failure_code := 'seat_unavailable';
        else
          v_seat_confirmed := true;
          v_failure_code := 'late_payment';
        end if;
      else
        v_seat_confirmed := true;
        v_failure_code := '';
      end if;
    end if;
  else
    if v_late then
      v_failure_code := 'late_payment';
    end if;
  end if;

  -- 6. تحديث الطلب وتثبيت المبلغ والدفع في السجلات
  update public.guest_course_orders
     set status = 'paid',
         paid_at = coalesce(p_paid_at, now()),
         provider_payment_id = coalesce(p_provider_payment_id, provider_payment_id),
         failure_code = v_failure_code,
         duplicate_of = v_duplicate_of,
         updated_at = now()
   where id = p_order_id;

  return query select 'paid'::text, v_seat_confirmed, v_failure_code;
end;
$$;

revoke all on function public.confirm_guest_payment(uuid, text, timestamptz) from public;
grant execute on function public.confirm_guest_payment(uuid, text, timestamptz) to service_role;

commit;
