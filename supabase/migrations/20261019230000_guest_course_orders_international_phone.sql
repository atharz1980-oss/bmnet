-- Migration: 20261019230000_guest_course_orders_international_phone.sql
-- Description: Allow international mobile numbers in E.164 format (+[1-9][0-9]{6,14})
-- while strictly preserving backwards-compatibility with legacy Saudi numbers (9665XXXXXXXX).

ALTER TABLE public.guest_course_orders
  DROP CONSTRAINT IF EXISTS guest_course_orders_phone_check;

ALTER TABLE public.guest_course_orders
  ADD CONSTRAINT guest_course_orders_phone_check
  CHECK (
    phone ~ '^\+[1-9][0-9]{6,14}$'
    OR phone ~ '^9665[0-9]{8}$'
  );

COMMENT ON CONSTRAINT guest_course_orders_phone_check ON public.guest_course_orders IS
  'Accepts international numbers in E.164 format (+[1-9]...) or legacy Saudi numbers (9665XXXXXXXX).';
