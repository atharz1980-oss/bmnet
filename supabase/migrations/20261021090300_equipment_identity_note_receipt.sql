-- ═══════════════════════════════════════════════════════════════════
-- تأجير المعدات — الهوية وسند الضمان والإيصال (2026-10-21)
--
-- مكمّل لـ 20261021090000_equipment_rental.sql. لا يلمس أي جدول قائم
-- خارج وحدة المعدات. يضيف:
--  - تاريخ انتهاء الهوية على الإيجار (التحقق من سريانها أثناء مدة الإيجار).
--  - requires_security_note على المعدة: هل يلزم سند ضمان «نافذ» قبل التسليم؟
--  - receipt_token: مفتاح عشوائي لصفحة الإيصال الإلكتروني — لا تُقرأ
--    بيانات الإيجار بالمعرّف وحده.
--  - equipment_security_notes: سجل سند الضمان بحالته الرسمية. الحالة لا
--    تُشتق ولا تُفترض: تُنقل يدويًا من بوابة نافذ بعد اعتماد العميل، ولا
--    يُعدّ «طلب مُنشأ» سندًا معتمدًا.
--  - customer_notified_at: يختم متى أُرسل إشعار التأكيد للعميل.
-- ═══════════════════════════════════════════════════════════════════

begin;

-- ─────────────────────── حقول المعدة والإيجار ───────────────────────

alter table public.equipment_items
  add column requires_security_note boolean not null default false;

alter table public.equipment_rentals
  add column national_id_expiry date,
  add column identity_check_method text not null default 'manual'
    check (identity_check_method in ('manual', 'nafath')),
  add column receipt_token uuid not null default gen_random_uuid(),
  add column customer_notified_at timestamptz;

-- سريان الهوية يجب أن يغطي آخر يوم إيجار.
alter table public.equipment_rentals
  add constraint equipment_rentals_id_expiry
  check (national_id_expiry is null or national_id_expiry >= end_date);

create unique index uq_equipment_rentals_receipt_token
  on public.equipment_rentals (receipt_token);

-- ─────────────────────── سند الضمان (نافذ) ───────────────────────

create type public.equipment_note_status as enum (
  'not_requested',
  'requested',
  'approved',
  'rejected',
  'expired',
  'released'
);

create table public.equipment_security_notes (
  id uuid primary key default gen_random_uuid(),
  rental_id uuid not null unique references public.equipment_rentals(id) on delete cascade,
  provider text not null default 'nafith' check (provider in ('nafith')),
  -- مبلغ السند: قيمة الاستبدال × الكمية. لا يُحصَّل تلقائيًا ولا يُعدّ عربونًا.
  amount_halalas integer not null check (amount_halalas between 0 and 999999999),
  status public.equipment_note_status not null default 'not_requested',
  -- مرجع العملية الرسمي كما يظهر في بوابة نافذ بعد الإنشاء.
  provider_reference text check (provider_reference is null or char_length(btrim(provider_reference)) between 1 and 200),
  -- نص حالة المزود كما قرأه الموظف (اختياري — للتوثيق البشري).
  provider_status_text text not null default '' check (char_length(provider_status_text) <= 300),
  note text check (note is null or char_length(note) <= 2000),
  requested_at timestamptz,
  approved_at timestamptz,
  rejected_at timestamptz,
  expired_at timestamptz,
  released_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- كل حالة نهائية لها طابعها الزمني: السجل لا يدّعي ما لم يحدث.
  constraint equipment_security_notes_requested_time
    check (status = 'not_requested' or requested_at is not null),
  constraint equipment_security_notes_approved_time
    check (status <> 'approved' or approved_at is not null),
  constraint equipment_security_notes_rejected_time
    check (status <> 'rejected' or rejected_at is not null),
  constraint equipment_security_notes_expired_time
    check (status <> 'expired' or expired_at is not null),
  constraint equipment_security_notes_released_time
    check (status <> 'released' or released_at is not null),
  constraint equipment_security_notes_reference
    check (status = 'not_requested' or (provider_reference is not null and char_length(btrim(provider_reference)) >= 1))
);

create index idx_equipment_security_notes_status
  on public.equipment_security_notes (status, created_at desc);

create trigger trg_equipment_security_notes_updated_at before update
  on public.equipment_security_notes for each row execute function public.set_updated_at();

-- ─────────────────────────────── RLS ───────────────────────────────

alter table public.equipment_security_notes enable row level security;
revoke all on public.equipment_security_notes from public, anon, authenticated;

-- الخادم وحده. لا حذف: أثر السند يبقى.
grant select, insert, update on public.equipment_security_notes to service_role;

commit;
