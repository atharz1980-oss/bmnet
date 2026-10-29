-- Expire abandoned rental and space checkouts in the database, not only
-- when a customer next requests an availability refresh.
begin;

create extension if not exists pg_cron with schema extensions;

do $$
declare
  v_job_id bigint;
begin
  select jobid into v_job_id from cron.job where jobname = 'bmnet-expire-space-checkouts';
  if v_job_id is not null then
    perform cron.unschedule(v_job_id);
  end if;

  select jobid into v_job_id from cron.job where jobname = 'bmnet-expire-equipment-checkouts';
  if v_job_id is not null then
    perform cron.unschedule(v_job_id);
  end if;

  perform cron.schedule(
    'bmnet-expire-space-checkouts',
    '* * * * *',
    $job$
      update public.studio_space_bookings
      set status = 'expired', payment_status = 'expired'
      where status = 'pending'
        and payment_status in ('created', 'pending', 'authorized')
        and checkout_expires_at <= now();
    $job$
  );

  perform cron.schedule(
    'bmnet-expire-equipment-checkouts',
    '* * * * *',
    $job$
      update public.equipment_rentals
      set status = 'expired', payment_status = 'expired'
      where status = 'pending'
        and payment_status in ('created', 'pending', 'authorized')
        and checkout_expires_at <= now();
    $job$
  );
end
$$;

commit;
