-- ═══════════════════════════════════════════════════════════════════
-- سلة الشراء والطلبات المجمّعة — Bayt Almosawer (2026-10-20)
--
-- إضافي بالكامل: ستّ عمليات إنشاء، وعمود واحد على الحجوزات، وفهرسان
-- يُستبدلان، ودالة تفعيل واحدة. لا جدول مالي قائم يُعاد تعريفه.
--
-- الفكرة: السلة تحفظ **اختيارات** الزائر (دورة أو مساحة) بلا حجز موعد
-- ولا مقعد. الحجز الحقيقي يبدأ عند الضغط على «ادفع»: طلب واحد، ثم
-- حجوزات مؤقتة (مساحة/مقعد) مربوطة به، ثم صفحة دفع واحدة للمبلغ كله.
-- إن خرج الزائر بقيت الحجوزات معلّقة حتى المهلة، ويمكنه العودة للإكمال
-- أو الإلغاء أو التعديل — وهذا هو ما يعالج «دفعة معلّقة لا سبيل إليها».
--
-- سلة واحدة لكل متصفح: رمز عشوائي في كوكي httpOnly، ويُخزَّن هنا
-- بصمته فقط. لا يُقرأ أي صف من المتصفح: كل الكتابة والقراءة عبر
-- الخادم (service_role) بعد التحقق من الرمز أو من الحساب.
--
-- دفع واحد لعدة عناصر يعني أن مرجع المزود الواحد يخص الطلب لا كل صف؛
-- لذلك تبقى `provider_payment_id` في حجوزات المساحة فارغة للطلبات
-- المجمّعة، ويُربط الحجز بالطلب نفسه. الحجز المباشر القديم كما هو.
-- ═══════════════════════════════════════════════════════════════════

begin;

-- ─────────────────────────────── السلة ───────────────────────────────
create table public.shopping_carts (
  id uuid primary key default gen_random_uuid(),
  -- بصمة SHA-256 للرمز (64 hex) — لا يُخزَّن الرمز نفسه.
  token_hash text not null unique check (token_hash ~ '^[0-9a-f]{64}$'),
  -- يُملأ عند أول كتابة من مستخدم مسجّل؛ الضيف يبقى null.
  user_id uuid references auth.users(id) on delete cascade,

  -- بيانات التواصل الافتراضية التي جمعها نموذج المساحة (تُقترح في الدفع).
  customer_type text
    check (customer_type is null or customer_type in ('individual', 'company', 'advertiser', 'other')),
  customer_name text
    check (customer_name is null or char_length(btrim(customer_name)) between 2 and 80),
  company_name text
    check (company_name is null or char_length(btrim(company_name)) between 2 and 120),
  email text
    check (email is null or (email = lower(email) and char_length(email) <= 254
      and email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]{2,}$')),
  phone text check (phone is null or phone ~ '^9665[0-9]{8}$'),
  notes text check (notes is null or char_length(notes) <= 2000),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_shopping_carts_user
  on public.shopping_carts (user_id, updated_at desc)
  where user_id is not null;

-- ───────────────────────────── عناصر السلة ─────────────────────────────
create table public.shopping_cart_items (
  id uuid primary key default gen_random_uuid(),
  cart_id uuid not null references public.shopping_carts(id) on delete cascade,
  kind text not null check (kind in ('course', 'space')),

  course_id uuid references public.courses(id) on delete cascade,
  session_id uuid references public.course_sessions(id) on delete set null,
  space_id uuid references public.studio_spaces(id) on delete cascade,
  booking_date date check (booking_date is null or booking_date >= '2026-01-01'::date),
  start_time time,
  end_time time,

  -- لقطة للعرض فقط؛ السعر الفعلي يُعاد حسابه من القاعدة عند الدفع.
  title_snapshot text not null check (char_length(btrim(title_snapshot)) between 1 and 200),
  subtitle_snapshot text not null default '' check (char_length(subtitle_snapshot) <= 300),
  href_snapshot text not null default '' check (char_length(href_snapshot) <= 300),
  unit_gross_halalas integer not null check (unit_gross_halalas between 100 and 999999999),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint shopping_cart_items_shape check (
    (
      kind = 'course'
      and course_id is not null
      and space_id is null
      and booking_date is null
      and start_time is null
      and end_time is null
    )
    or (
      kind = 'space'
      and course_id is null
      and session_id is null
      and space_id is not null
      and booking_date is not null
      and start_time is not null
      and end_time is not null
      and end_time > start_time
    )
  )
);

-- دورة واحدة لكل سلة (نحدّث الموعد بدل تكرارها)، وموعد مساحة واحد لكل
-- (مساحة، يوم، من، إلى) — تكرار الضغط لا يصنع سطرين.
create unique index uq_shopping_cart_items_course
  on public.shopping_cart_items (cart_id, course_id)
  where kind = 'course';
create unique index uq_shopping_cart_items_space
  on public.shopping_cart_items (cart_id, space_id, booking_date, start_time, end_time)
  where kind = 'space';

create index idx_shopping_cart_items_cart
  on public.shopping_cart_items (cart_id, created_at);

-- ─────────────────────────────── الطلب ───────────────────────────────
create table public.shopping_orders (
  id uuid primary key default gen_random_uuid(),
  cart_id uuid references public.shopping_carts(id) on delete set null,
  -- صاحب الطلب وقت الدفع. الطلب المدفوع يبقى بعد حذف الحساب (set null).
  user_id uuid references auth.users(id) on delete set null,

  provider public.payment_provider not null default 'moyasar',
  environment public.payment_environment not null,
  status text not null default 'created'
    check (status in ('created', 'pending', 'authorized', 'paid', 'failed', 'cancelled', 'expired', 'refunded')),

  customer_type text
    check (customer_type is null or customer_type in ('individual', 'company', 'advertiser', 'other')),
  customer_name text not null check (char_length(btrim(customer_name)) between 2 and 80),
  company_name text
    check (company_name is null or char_length(btrim(company_name)) between 2 and 120),
  email text not null
    check (email = lower(email) and char_length(email) <= 254
      and email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]{2,}$'),
  phone text check (phone is null or phone ~ '^9665[0-9]{8}$'),
  notes text check (notes is null or char_length(notes) <= 2000),

  item_count integer not null check (item_count between 1 and 20),
  net_amount integer not null check (net_amount between 0 and 999999999),
  tax_amount integer not null default 0 check (tax_amount >= 0),
  total_amount integer not null check (total_amount between 100 and 999999999),
  tax_rate_bps integer not null check (tax_rate_bps between 0 and 10000),
  currency char(3) not null default 'SAR' check (currency = 'SAR'),

  idempotency_key uuid not null default gen_random_uuid(),
  provider_payment_id text
    check (provider_payment_id is null or char_length(btrim(provider_payment_id)) between 1 and 128),
  provider_checkout_url text
    check (provider_checkout_url is null or char_length(provider_checkout_url) <= 2048),
  checkout_expires_at timestamptz,
  paid_at timestamptz,
  failed_at timestamptz,
  cancelled_at timestamptz,
  refunded_at timestamptz,
  refunded_amount integer not null default 0 check (refunded_amount >= 0),
  failure_code text not null default '' check (char_length(failure_code) <= 64),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint shopping_orders_total_matches check (total_amount = net_amount + tax_amount),
  constraint shopping_orders_paid_has_time check (status <> 'paid' or paid_at is not null),
  constraint shopping_orders_cancelled_has_time check (status <> 'cancelled' or cancelled_at is not null),
  constraint shopping_orders_refunded_has_time check (status <> 'refunded' or refunded_at is not null)
);

-- عملية مزوّد واحدة لا تخص طلبين.
create unique index uq_shopping_orders_provider_ref
  on public.shopping_orders (provider, provider_payment_id)
  where provider_payment_id is not null;

-- طلب مفتوح واحد لكل سلة: لا فاتورتان معلّقتان لنفس الاختيارات.
create unique index uq_shopping_orders_one_open
  on public.shopping_orders (cart_id)
  where cart_id is not null and status in ('created', 'pending', 'authorized');

create index idx_shopping_orders_user
  on public.shopping_orders (user_id, created_at desc)
  where user_id is not null;
create index idx_shopping_orders_cart
  on public.shopping_orders (cart_id, created_at desc);

-- ───────────────────── ربط حجز المساحة بالطلب المجمّع ─────────────────────
alter table public.studio_space_bookings
  add column shopping_order_id uuid references public.shopping_orders(id) on delete set null;

create index idx_studio_space_bookings_order
  on public.studio_space_bookings (shopping_order_id)
  where shopping_order_id is not null;

-- الحجز المباشر يبقى «محاولة مفتوحة واحدة لكل بريد في المساحة». أما
-- حجوزات السلة فمتعددة بطبيعتها (يومان مختلفان مثلًا)، والتعارض الزمني
-- وحده يحكمها عبر مشغّل prevent_space_booking_overlap القائم.
drop index if exists public.uq_studio_space_bookings_one_open;
create unique index uq_studio_space_bookings_one_open
  on public.studio_space_bookings (space_id, email)
  where status = 'pending'
    and payment_status in ('created', 'pending', 'authorized')
    and shopping_order_id is null;

-- ───────────────────────────── عناصر الطلب ─────────────────────────────
create table public.shopping_order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.shopping_orders(id) on delete restrict,
  -- العنصر الذي جاء منه؛ يُصفَّر عند نجاح الطلب لأن عنصر السلة يُحذف.
  cart_item_id uuid references public.shopping_cart_items(id) on delete set null,
  position integer not null check (position between 0 and 19),
  kind text not null check (kind in ('course', 'space')),

  -- `restrict`: القيد الشكلي أدناه يفرض وجود course_id/space_id لعنصر من
  -- نوعه، فحذف دورة أو مساحة لها عنصر طلب تاريخي كان سيصطدم بالقيد بعد
  -- التصفير. نمنع الحذف صراحةً بدل أن يفشل بصمت في لحظة غير متوقعة. الموعد
  -- (`session_id`) ليس شرطًا في القيد فيبقى set null.
  course_id uuid references public.courses(id) on delete restrict,
  session_id uuid references public.course_sessions(id) on delete set null,
  space_id uuid references public.studio_spaces(id) on delete restrict,
  booking_date date check (booking_date is null or booking_date >= '2026-01-01'::date),
  start_time time,
  end_time time,

  title_snapshot text not null check (char_length(btrim(title_snapshot)) between 1 and 200),
  subtitle_snapshot text not null default '' check (char_length(subtitle_snapshot) <= 300),
  href_snapshot text not null default '' check (char_length(href_snapshot) <= 300),

  gross_amount integer not null check (gross_amount between 100 and 999999999),
  net_amount integer not null check (net_amount between 0 and 999999999),
  tax_amount integer not null default 0 check (tax_amount >= 0),
  tax_rate_bps integer not null check (tax_rate_bps between 0 and 10000),
  constraint shopping_order_items_total_matches check (gross_amount = net_amount + tax_amount),

  status text not null default 'pending'
    check (status in ('pending', 'fulfilled', 'failed', 'cancelled')),
  failure_code text not null default '' check (char_length(failure_code) <= 64),

  enrollment_id uuid references public.course_enrollments(id) on delete set null,
  space_booking_id uuid references public.studio_space_bookings(id) on delete set null,
  seat_id uuid references public.course_session_seats(id) on delete set null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (order_id, position),
  constraint shopping_order_items_shape check (
    (
      kind = 'course'
      and course_id is not null
      and space_id is null
      and booking_date is null
      and start_time is null
      and end_time is null
    )
    or (
      kind = 'space'
      and course_id is null
      and session_id is null
      and space_id is not null
      and booking_date is not null
      and start_time is not null
      and end_time is not null
      and end_time > start_time
    )
  )
);

create index idx_shopping_order_items_order
  on public.shopping_order_items (order_id, position);
create index idx_shopping_order_items_booking
  on public.shopping_order_items (space_booking_id)
  where space_booking_id is not null;
create index idx_shopping_order_items_seat
  on public.shopping_order_items (seat_id)
  where seat_id is not null;

-- ───────────────────────── updated_at triggers ─────────────────────────
create trigger trg_shopping_carts_updated_at before update
  on public.shopping_carts for each row execute function public.set_updated_at();
create trigger trg_shopping_cart_items_updated_at before update
  on public.shopping_cart_items for each row execute function public.set_updated_at();
create trigger trg_shopping_orders_updated_at before update
  on public.shopping_orders for each row execute function public.set_updated_at();
create trigger trg_shopping_order_items_updated_at before update
  on public.shopping_order_items for each row execute function public.set_updated_at();

-- ─────────────────────── تفعيل الطلب بعد تحقق الخادم ───────────────────────
-- لا يُنادى إلا بعد أن يسأل الخادم المزود ويطابق المرجع والمبلغ والعملة
-- والبيئة وربط البيانات الوصفية. التكرار نجاح بلا أثر. أي عنصر تعذّر
-- تأكيده يُعلَّم failed والطلب يبقى paid (المال وصل) — لا وصول بلا تأكيد.
create or replace function public.finalize_shopping_order(
  p_order_id uuid,
  p_provider_payment_id text,
  p_environment public.payment_environment
)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_order public.shopping_orders%rowtype;
  v_item public.shopping_order_items%rowtype;
  v_seat public.course_session_seats%rowtype;
  v_session public.course_sessions%rowtype;
  v_enrollment_id uuid;
  v_taken integer;
  v_fail text;
  v_any_failed boolean := false;
begin
  select * into v_order from public.shopping_orders where id = p_order_id for update;
  if not found then
    raise exception 'order_not_found' using errcode = 'P0002';
  end if;

  /* تكرار التفعيل بعد النجاح: لا أثر، وهذه هي الخاصية التي تجعل الإشعار
     المعاد وفتح صفحة الحالة معًا غير ضارين. */
  if v_order.status = 'paid' then
    return;
  end if;
  if v_order.status in ('cancelled', 'failed', 'expired', 'refunded') then
    raise exception 'order_terminal' using errcode = 'P0001';
  end if;
  if v_order.environment <> p_environment then
    raise exception 'environment_mismatch' using errcode = 'P0001';
  end if;
  if p_provider_payment_id is null or length(btrim(p_provider_payment_id)) = 0 then
    raise exception 'provider_reference_required' using errcode = 'P0001';
  end if;
  if v_order.provider_payment_id is not null
     and v_order.provider_payment_id <> p_provider_payment_id then
    raise exception 'provider_reference_mismatch' using errcode = 'P0001';
  end if;

  /* ترتيب الأقفال: الطلب ← الدفعات ← المقاعد. وهو ترتيب دالة الدورة
     القائمة (دفعة ← دفعة تدريب ← مقعد)، فلا ينشأ جمود متبادل. */
  perform 1
    from public.course_sessions s
   where s.id in (
     select oi.session_id from public.shopping_order_items oi
      where oi.order_id = p_order_id and oi.session_id is not null
   )
   order by s.id
   for update;

  perform 1
    from public.course_session_seats st
   where st.id in (
     select oi.seat_id from public.shopping_order_items oi
      where oi.order_id = p_order_id and oi.seat_id is not null
   )
   order by st.id
   for update;

  for v_item in
    select * from public.shopping_order_items
     where order_id = p_order_id
     order by position
     for update
  loop
    if v_item.status <> 'pending' then
      continue;
    end if;

    if v_item.kind = 'space' then
      begin
        update public.studio_space_bookings
           set status = 'confirmed',
               payment_status = 'paid',
               paid_at = now()
         where id = v_item.space_booking_id
           and status = 'pending'
           and payment_status in ('created', 'pending', 'authorized');

        if not found then
          update public.shopping_order_items
             set status = 'failed', failure_code = 'booking_unavailable'
           where id = v_item.id;
          v_any_failed := true;
        else
          update public.shopping_order_items
             set status = 'fulfilled'
           where id = v_item.id;
        end if;
      exception when others then
        /* حارس التعارض رفض التأكيد: المقعد الزمني ضاع بين المهلة والدفع. */
        update public.shopping_order_items
           set status = 'failed', failure_code = 'booking_unavailable'
         where id = v_item.id;
        v_any_failed := true;
      end;

    elsif v_item.kind = 'course' then
      /* دورة بلا حساب لا تفتح وصولًا — لا ينشئها التطبيق أصلًا، وهذا حارس. */
      if v_order.user_id is null then
        update public.shopping_order_items
           set status = 'failed', failure_code = 'account_required'
         where id = v_item.id;
        v_any_failed := true;
        continue;
      end if;

      if v_item.session_id is not null and v_item.seat_id is null then
        update public.shopping_order_items
           set status = 'failed', failure_code = 'seat_unavailable'
         where id = v_item.id;
        v_any_failed := true;
        continue;
      end if;

      begin
        v_fail := null;

        if v_item.seat_id is not null then
          select * into v_seat
            from public.course_session_seats
           where id = v_item.seat_id;

          if not found then
            v_fail := 'seat_mismatch';
          elsif v_seat.user_id <> v_order.user_id
             or v_seat.course_id <> v_item.course_id
             or v_seat.session_id <> v_item.session_id then
            v_fail := 'seat_mismatch';
          elsif v_seat.status = 'released' then
            v_fail := 'seat_unavailable';
          elsif v_seat.status = 'held' and v_seat.hold_expires_at <= now() then
            /* المهلة انتهت: نتحقق من السعة لحظة التأكيد، تمامًا كما في
               finalize_course_purchase. */
            select count(*) into v_taken
              from public.course_session_seats
             where session_id = v_seat.session_id
               and id <> v_seat.id
               and (status = 'confirmed' or (status = 'held' and hold_expires_at > now()));

            select * into v_session
              from public.course_sessions
             where id = v_seat.session_id;

            if v_session.registered_count + v_taken >= v_session.capacity then
              update public.course_session_seats
                 set status = 'released',
                     released_at = now(),
                     hold_expires_at = null,
                     release_reason = 'seat_unavailable'
               where id = v_seat.id;
              v_fail := 'seat_unavailable';
            end if;
          end if;
        end if;

        if v_fail is not null then
          update public.shopping_order_items
             set status = 'failed', failure_code = v_fail
           where id = v_item.id;
          v_any_failed := true;
        else
          insert into public.course_enrollments (user_id, course_id, source, status)
          values (v_order.user_id, v_item.course_id, 'purchase', 'active')
          on conflict (user_id, course_id) do update
            set status = 'active', source = 'purchase', updated_at = now()
          returning id into v_enrollment_id;

          if v_item.seat_id is not null then
            update public.course_session_seats
               set status = 'confirmed',
                   confirmed_at = now(),
                   hold_expires_at = null,
                   enrollment_id = v_enrollment_id
             where id = v_item.seat_id;
          end if;

          update public.shopping_order_items
             set status = 'fulfilled', enrollment_id = v_enrollment_id
           where id = v_item.id;
        end if;
      exception when others then
        /* تراجع المعاملة الفرعية يُلغي التسجيل وتأكيد المقعد معًا. */
        update public.shopping_order_items
           set status = 'failed', failure_code = 'fulfillment_failed'
         where id = v_item.id;
        v_any_failed := true;
      end;
    end if;
  end loop;

  update public.shopping_orders
     set status = 'paid',
         paid_at = now(),
         provider_payment_id = p_provider_payment_id,
         failure_code = case when v_any_failed then 'partial_fulfillment' else '' end
   where id = p_order_id;

  /* نجح الطلب: عناصره لم تعد في السلة. الفاشلة أيضًا تُزال حتى لا يعيد
     الزائر دفعها بلا قصد؛ تظهر في صفحة الطلب ويُعالجها الفريق. */
  delete from public.shopping_cart_items
   where id in (
     select oi.cart_item_id
       from public.shopping_order_items oi
      where oi.order_id = p_order_id
        and oi.cart_item_id is not null
   );
end;
$$;

revoke all on function public.finalize_shopping_order(uuid, text, public.payment_environment)
  from public, anon, authenticated;
grant execute on function public.finalize_shopping_order(uuid, text, public.payment_environment)
  to service_role;

-- ─────────────────────────────── RLS ───────────────────────────────
-- لا وصول من المتصفح إلى السلة أو الطلبات: الرمز والجلسة يُتحققان في
-- الخادم، وكل قراءة/كتابة تمر بعميل الخدمة. لا سياسة = لا وصول.
alter table public.shopping_carts enable row level security;
alter table public.shopping_cart_items enable row level security;
alter table public.shopping_orders enable row level security;
alter table public.shopping_order_items enable row level security;

revoke all on public.shopping_carts from public, anon, authenticated;
revoke all on public.shopping_cart_items from public, anon, authenticated;
revoke all on public.shopping_orders from public, anon, authenticated;
revoke all on public.shopping_order_items from public, anon, authenticated;

grant select, insert, update, delete on public.shopping_carts to service_role;
grant select, insert, update, delete on public.shopping_cart_items to service_role;
grant select, insert, update on public.shopping_orders to service_role;
grant select, insert, update on public.shopping_order_items to service_role;

commit;
