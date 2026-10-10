-- اختبارات ترحيل 20261010090000 (طلبات الورش والرصيد التدريبي) على Postgres حقيقي.
-- محلي فقط — لا يُشغَّل على الإنتاج. كله داخل معاملة تنتهي بـ ROLLBACK إلزامي.
-- مثال: حاوية public.ecr.aws/supabase/postgres مؤقتة، ثم:
--   psql -U supabase_admin -v ON_ERROR_STOP=1 -f <الترحيل> -f supabase/tests/workshop_orders_credits.test.sql
-- (على قاعدة بلا مخطط المشروع: طبّق أولًا الأنواع payment_provider/payment_environment والدالة set_updated_at من cp_b_init_schema.)

-- كل فشل يرفع استثناء ويوقف الملف.

begin;

create or replace function pg_temp.expect_error(sql text, pattern text) returns void language plpgsql as $$
begin
  begin
    execute sql;
  exception when others then
    if sqlerrm !~* pattern and sqlstate !~* pattern then
      raise exception 'expected error ~ %, got: % (%)', pattern, sqlerrm, sqlstate;
    end if;
    raise notice 'OK (refused as expected): % -> %', left(sql, 70), sqlerrm;
    return;
  end;
  raise exception 'expected error ~ % but statement succeeded: %', pattern, sql;
end $$;
grant execute on all functions in schema pg_temp to public;

-- ───── 1. القيود الأساسية ─────
select pg_temp.expect_error($q$insert into public.workshop_orders (workshop_slug, environment, payment_plan, customer_name, email, phone, total_amount, deposit_amount)
  values ('photography-basics','test','deposit','سارة محمد','s@example.com','966512345670',79600,79600)$q$, 'workshop_orders_plan_deposit');
select pg_temp.expect_error($q$insert into public.workshop_orders (workshop_slug, environment, payment_plan, customer_name, email, phone, total_amount)
  values ('photography-basics','test','full','سارة محمد','S@Example.com','966512345670',79600)$q$, 'check');

insert into public.workshop_orders (id, workshop_slug, environment, payment_plan, customer_name, email, phone, total_amount, deposit_amount, status, paid_amount)
values ('00000000-0000-4000-8000-000000000001','photography-basics','test','deposit','سارة محمد','sara@example.com','966512345670',79600,30000,'deposit_paid',30000);

select pg_temp.expect_error($q$insert into public.workshop_orders (workshop_slug, environment, payment_plan, customer_name, email, phone, total_amount)
  values ('photography-basics','test','full','سارة محمد','sara@example.com','966512345670',79600)$q$, 'uq_workshop_orders_live_email');

insert into public.workshop_payments (order_id, kind, environment, amount, status, provider_payment_id)
values ('00000000-0000-4000-8000-000000000001','balance','test',49600,'pending','inv-1');
select pg_temp.expect_error($q$insert into public.workshop_payments (order_id, kind, environment, amount, status)
  values ('00000000-0000-4000-8000-000000000001','balance','test',49600,'created')$q$, 'uq_workshop_payments_one_open');
select pg_temp.expect_error($q$update public.workshop_payments set status = 'paid' where provider_payment_id = 'inv-1'$q$, 'workshop_payments_paid_has_time');

-- ───── 2. صلاحيات المتصفح: لا شيء ─────
set role anon;
select pg_temp.expect_error('select * from public.training_credits', 'permission denied');
select pg_temp.expect_error('select * from public.workshop_orders', 'permission denied');
select pg_temp.expect_error($q$insert into public.training_credits (holder_name, holder_email, holder_phone, source_type, source_id, original_amount, balance, expires_at)
  values ('x y','a@b.cc','966512345670','workshop_order',gen_random_uuid(),100,100,now()+interval '1 day')$q$, 'permission denied');
select pg_temp.expect_error($q$select public.redeem_training_credit(gen_random_uuid(), 100, 'x', null)$q$, 'permission denied');
reset role;
set role authenticated;
select pg_temp.expect_error('select * from public.training_credit_transactions', 'permission denied');
select pg_temp.expect_error($q$update public.workshop_orders set paid_amount = 79600$q$, 'permission denied');
select pg_temp.expect_error($q$select public.cancel_workshop_order_to_credit('00000000-0000-4000-8000-000000000001', null)$q$, 'permission denied');
reset role;

-- ───── 3. الخدمة: قراءة الرصيد فقط، والكتابة عبر الدوال ─────
set role service_role;
select pg_temp.expect_error($q$insert into public.training_credits (holder_name, holder_email, holder_phone, source_type, source_id, original_amount, balance, expires_at)
  values ('x y','a@b.cc','966512345670','workshop_order',gen_random_uuid(),100,100,now()+interval '1 day')$q$, 'permission denied');
select pg_temp.expect_error('delete from public.workshop_orders', 'permission denied');

-- إلغاء المشترك → رصيد بكامل المدفوع، سنة ميلادية.
do $$
declare v_credit uuid; c record; n int;
begin
  v_credit := public.cancel_workshop_order_to_credit('00000000-0000-4000-8000-000000000001', '44444444-4444-4444-8444-444444444444');
  select * into c from public.training_credits where id = v_credit;
  if c.original_amount <> 30000 or c.balance <> 30000 or c.status <> 'active' then raise exception 'bad credit %', row_to_json(c); end if;
  if c.expires_at <> c.issued_at + interval '1 year' then raise exception 'bad expiry % %', c.issued_at, c.expires_at; end if;
  if c.holder_email <> 'sara@example.com' then raise exception 'bad holder'; end if;
  select count(*) into n from public.training_credit_transactions where credit_id = v_credit and kind = 'issue' and amount = 30000;
  if n <> 1 then raise exception 'issue tx missing'; end if;
  if (select status from public.workshop_orders where id = '00000000-0000-4000-8000-000000000001') <> 'cancelled_by_customer' then raise exception 'order not cancelled'; end if;
  raise notice 'OK: cancel → credit 30000, expires +1 year, issue tx';
end $$;
select pg_temp.expect_error($q$select public.cancel_workshop_order_to_credit('00000000-0000-4000-8000-000000000001', null)$q$, 'order_not_cancellable');

-- الاستخدام: جزئي، تكرار مرجع مرفوض بلا خصم، أكثر من الرصيد مرفوض، ثم الباقي → used.
do $$
declare v_id uuid; v_left int;
begin
  select id into v_id from public.training_credits limit 1;
  v_left := public.redeem_training_credit(v_id, 10000, 'course-order-1', null);
  if v_left <> 20000 then raise exception 'expected 20000, got %', v_left; end if;
  begin
    perform public.redeem_training_credit(v_id, 5000, 'course-order-1', null);
    raise exception 'repeat reference was accepted';
  exception when unique_violation then
    raise notice 'OK: repeated reference refused (unique_violation)';
  end;
  if (select balance from public.training_credits where id = v_id) <> 20000 then raise exception 'balance changed by refused repeat'; end if;
  begin
    perform public.redeem_training_credit(v_id, 20001, 'course-order-2', null);
    raise exception 'over-balance accepted';
  exception when others then
    if sqlerrm <> 'credit_unavailable' then raise; end if;
    raise notice 'OK: over-balance refused';
  end;
  v_left := public.redeem_training_credit(v_id, 20000, 'course-order-2', null);
  if v_left <> 0 or (select status from public.training_credits where id = v_id) <> 'used' then raise exception 'not used'; end if;
  begin
    perform public.redeem_training_credit(v_id, 1, 'course-order-3', null);
    raise exception 'used credit accepted';
  exception when others then
    if sqlerrm <> 'credit_unavailable' then raise; end if;
    raise notice 'OK: used credit refused';
  end;
  begin
    perform public.redeem_training_credit(v_id, 0, 'zero', null);
    raise exception 'zero accepted';
  exception when others then
    if sqlerrm <> 'invalid_amount' then raise; end if;
    raise notice 'OK: zero amount refused';
  end;
end $$;
select pg_temp.expect_error($q$update public.training_credits set balance = 99999$q$, 'permission denied');
reset role;

-- ───── 4. انتهاء الصلاحية (المدة تُقدَّم كمشرف قاعدة) ─────
insert into public.workshop_orders (id, workshop_slug, environment, payment_plan, customer_name, email, phone, total_amount, status, paid_amount)
values ('00000000-0000-4000-8000-000000000002','photography-basics','test','full','نورة علي','noura@example.com','966512345671',79600,'paid',79600);
set role service_role;
select public.cancel_workshop_order_to_credit('00000000-0000-4000-8000-000000000002', null);
reset role;
update public.training_credits set issued_at = now() - interval '2 years', expires_at = now() - interval '1 year' where source_id = '00000000-0000-4000-8000-000000000002';
set role service_role;
select pg_temp.expect_error($q$select public.redeem_training_credit((select id from public.training_credits where source_id = '00000000-0000-4000-8000-000000000002'), 100, 'late', null)$q$, 'credit_unavailable');
-- طلب بلا مدفوع: إلغاء بلا رصيد.
reset role;
insert into public.workshop_orders (id, workshop_slug, environment, payment_plan, customer_name, email, phone, total_amount)
values ('00000000-0000-4000-8000-000000000003','photography-basics','test','full','ريم خالد','reem@example.com','966512345672',79600);
set role service_role;
do $$ begin
  if public.cancel_workshop_order_to_credit('00000000-0000-4000-8000-000000000003', null) is not null then raise exception 'credit for unpaid order'; end if;
  raise notice 'OK: unpaid order cancelled with no credit';
end $$;
reset role;

select 'ALL SQL TESTS PASSED' as result;

rollback;
