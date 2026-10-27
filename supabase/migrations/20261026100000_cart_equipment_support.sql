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

-- فهرس للمعدات في السلة
create index if not exists idx_shopping_cart_items_equipment
  on public.shopping_cart_items(equipment_id);

-- توسيع سجلات الطلبات لدعم انتهاء الحجز المؤقت
alter table public.shopping_orders
  add column if not exists hold_expires_at timestamptz,
  add column if not exists hold_released_at timestamptz;

create index if not exists idx_shopping_orders_hold_expires
  on public.shopping_orders(status, hold_expires_at);

-- ربط إيجار المعدات بالطلب المجمّع وحفظ صورة التوقيع
alter table public.equipment_rentals
  add column if not exists shopping_order_id uuid references public.shopping_orders(id) on delete set null,
  add column if not exists signature_data_url text;

create index if not exists idx_equipment_rentals_order
  on public.equipment_rentals (shopping_order_id)
  where shopping_order_id is not null;

-- تعديل الفهرس الفريد للمحاولات المفتوحة للمعدات ليكون للحجز المباشر فقط (حيث shopping_order_id is null)
drop index if exists public.uq_equipment_rentals_one_open;
create unique index uq_equipment_rentals_one_open
  on public.equipment_rentals (item_id, email)
  where status = 'pending'
    and payment_status in ('created', 'pending', 'authorized')
    and shopping_order_id is null;

-- توسيع عناصر الطلب لدعم المعدات
alter table public.shopping_order_items
  drop constraint if exists shopping_order_items_kind_check,
  add constraint shopping_order_items_kind_check check (kind in ('course', 'space', 'equipment'));

alter table public.shopping_order_items
  add column if not exists equipment_id uuid references public.equipment_items(id) on delete restrict,
  add column if not exists equipment_rental_id uuid references public.equipment_rentals(id) on delete set null;

-- تحديث دالة تفعيل طلب السلة لتشمل المعدات
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
        update public.shopping_order_items
           set status = 'failed', failure_code = 'booking_unavailable'
         where id = v_item.id;
        v_any_failed := true;
      end;

    elsif v_item.kind = 'equipment' then
      begin
        update public.equipment_rentals
           set status = 'confirmed',
               payment_status = 'paid',
               paid_at = now()
         where id = v_item.equipment_rental_id
           and status = 'pending'
           and payment_status in ('created', 'pending', 'authorized');

        if not found then
          update public.shopping_order_items
             set status = 'failed', failure_code = 'rental_unavailable'
           where id = v_item.id;
          v_any_failed := true;
        else
          update public.shopping_order_items
             set status = 'fulfilled'
           where id = v_item.id;
        end if;
      exception when others then
        update public.shopping_order_items
           set status = 'failed', failure_code = 'rental_unavailable'
         where id = v_item.id;
        v_any_failed := true;
      end;

    elsif v_item.kind = 'course' then
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

  delete from public.shopping_cart_items
   where id in (
     select oi.cart_item_id
       from public.shopping_order_items oi
      where oi.order_id = p_order_id
        and oi.cart_item_id is not null
   );
end;
$$;

commit;
