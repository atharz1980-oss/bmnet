-- المرحلة الثانية للدفع — الأساس. إضافية بالكامل: لا تعدّل جدولًا قائمًا
-- ولا سياسة ولا دالة، عدا قيدًا واحدًا كان يمنع قرار المالك.
--
-- ─────────────────────── قرار التسعير ───────────────────────
-- السعر المعروض **شامل** ضريبة القيمة المضافة: من يرى «1,000 ريال» يُخصم
-- منه 1,000 ريال بالضبط، وتُستخرج الضريبة منه ولا تُضاف فوقه. القيد القديم
-- `check (not prices_include_tax)` كان يفرض العكس، فيُسقَط هنا وحده.
-- ويُسقط بالبحث عن تعريفه لا باسم مخمَّن: أسماء القيود الضمنية من توليد
-- Postgres، وتخمين اسم يعني migration ينجح على قاعدة ويفشل على أخرى.
--
-- ─────────────────────── لماذا جدول واحد للشراء ───────────────────────
-- لا عربون ولا دفعات جزئية ولا أقساط ندير جدولها (تابي وتمارا تديرها
-- عندها). فعملية شراء ناجحة واحدة = صف واحد، والمحاولة المعادة صف جديد.
-- فصل «طلب» عن «دفعة» يكسب معناه يوم تحمل عملية واحدة أكثر من دفعة ناجحة،
-- وهو خارج النموذج المعتمد. القيود الفريدة الجزئية أدناه تحرس ما كان
-- سيحرسه الفصل، وبلا ثابت عابر للجدولين.
--
-- ─────────────────────── ما يفتح الوصول ───────────────────────
-- لا شيء في هذا الملف يمنح وصولًا إلا `finalize_course_purchase`، وهي
-- معاملة واحدة تقفل صف الدفع ثم تكتب التسجيل. لا إعادة توجيه من المتصفح
-- ولا جسم webhook يبلغ هذا الحد: الخادم يتحقق من المزود أولًا، ثم ينادي
-- هذه الدالة. وتكرار النداء بعد النجاح لا يفعل شيئًا ويُعيد النتيجة نفسها.
--
-- الأمان: RLS على الثلاثة، revoke من الجميع، ثم منح select بالأعمدة فقط
-- لما يخص المشاهد. لا كتابة من المتصفح البتة — الكتابة لـservice_role خلف
-- إجراءات الخادم. وسجل الإشعارات غير مرئي لأي دور متصفح أصلًا.
begin;

-- ─────────────── الأسعار شاملة الضريبة (قرار المالك) ───────────────
do $$
declare
  v_name text;
begin
  select con.conname into v_name
    from pg_constraint as con
   where con.conrelid = 'public.commerce_settings'::regclass
     and con.contype = 'c'
     and pg_get_constraintdef(con.oid) ilike '%NOT prices_include_tax%';
  if v_name is not null then
    execute format('alter table public.commerce_settings drop constraint %I', v_name);
  end if;
end $$;

alter table public.commerce_settings alter column prices_include_tax set default true;
update public.commerce_settings set prices_include_tax = true where id;

-- ─────────────── وسائل الدفع المتاحة لكل دورة ───────────────
-- جدول مستقل لا أعمدة في `courses`: حفظ الدورة يمر بـ`save_course_atomic`
-- بقائمة أعمدة ثابتة، وتوسيعها يمس أخطر دالة في المشروع بلا داعٍ. ومزود
-- رابع لاحقًا يصير صفًّا لا عمودًا ولا تعديلًا في تلك الدالة.
create table public.course_payment_methods (
  course_id uuid not null references public.courses(id) on delete cascade,
  provider public.payment_provider not null,
  enabled boolean not null default true,
  sort_order smallint not null default 0 check (sort_order between 0 and 99),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (course_id, provider)
);
create index idx_course_payment_methods_enabled
  on public.course_payment_methods (course_id) where enabled;

-- ─────────────────────── عمليات الشراء ───────────────────────
create table public.course_payments (
  id uuid primary key default gen_random_uuid(),
  -- restrict لا cascade: السجل المالي لا يختفي مع الحساب. حذف عضو له
  -- مشتريات يُرفض حتى تُعالج سجلاته صراحةً.
  user_id uuid not null references auth.users(id) on delete restrict,
  course_id uuid not null references public.courses(id) on delete restrict,
  provider public.payment_provider not null,
  -- بيئة العملية: صف بيئة الاختبار لا يفتح وصولًا على خادم إنتاج.
  environment public.payment_environment not null,
  status text not null default 'created'
    check (status in ('created','pending','authorized','paid','failed','cancelled','expired','refunded')),
  -- لقطة تجارية: الاسم قد يتغير والسعر قد يتغير، والسجل يبقى كما اشترى.
  course_title_snapshot text not null default '' check (length(course_title_snapshot) <= 200),
  -- كله بالهللات. `total_amount` هو السعر المعروض نفسه، و`net + vat = total`
  -- حرفيًا فلا يختلف المحصَّل عن المعلن بهلل.
  net_amount integer not null check (net_amount between 1 and 999999999),
  tax_amount integer not null default 0 check (tax_amount >= 0),
  total_amount integer not null check (total_amount between 100 and 999999999),
  tax_rate_bps integer not null check (tax_rate_bps between 0 and 10000),
  currency char(3) not null default 'SAR' check (currency = 'SAR'),
  -- مفتاح التكرار: يُرسل للمزود مرجعًا، ويمنع محاولتين متطابقتين.
  idempotency_key uuid not null default gen_random_uuid(),
  provider_payment_id text
    check (provider_payment_id is null or length(btrim(provider_payment_id)) between 1 and 128),
  provider_checkout_url text check (provider_checkout_url is null or length(provider_checkout_url) <= 2048),
  checkout_expires_at timestamptz,
  authorized_at timestamptz,
  paid_at timestamptz,
  failed_at timestamptz,
  refunded_at timestamptz,
  refunded_amount integer not null default 0 check (refunded_amount >= 0),
  -- رمزنا نحن، لا حمولة المزود: رسائل المزود قد تحمل ترويسات طلب.
  failure_code text not null default '' check (length(failure_code) <= 64),
  enrollment_id uuid references public.course_enrollments(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint course_payments_total_matches check (total_amount = net_amount + tax_amount),
  constraint course_payments_refund_within_total check (refunded_amount <= total_amount),
  constraint course_payments_paid_has_time check (status <> 'paid' or paid_at is not null),
  constraint course_payments_refunded_has_time check (status <> 'refunded' or refunded_at is not null),
  constraint course_payments_idempotency_unique unique (idempotency_key)
);

-- عملية المزود الواحدة لا تُنسب لصفين — ولا لمستخدمين اثنين.
create unique index uq_course_payments_provider_ref
  on public.course_payments (provider, provider_payment_id)
  where provider_payment_id is not null;
-- شراء واحد مدفوع لكل دورة لكل متدرب.
create unique index uq_course_payments_one_paid
  on public.course_payments (user_id, course_id) where status = 'paid';
-- ومحاولة مفتوحة واحدة: الضغط المكرر يعيد نفس صفحة الدفع لا صفحة جديدة.
create unique index uq_course_payments_one_open
  on public.course_payments (user_id, course_id)
  where status in ('created','pending','authorized');
create index idx_course_payments_course_status on public.course_payments (course_id, status);
create index idx_course_payments_user_created on public.course_payments (user_id, created_at desc);
create index idx_course_payments_status_created on public.course_payments (status, created_at desc);

-- ─────────────── سجل إشعارات المزودين (لا مصدر حقيقة) ───────────────
-- غرضه شيئان: ابتلاع التكرار بقيد فريد بدل منطق تطبيقي، وترك أثر للدعم.
-- لا مبالغ ولا بيانات عميل ولا حمولة خام — ما لا يُخزَّن لا يتسرب.
create table public.payment_webhook_events (
  id uuid primary key default gen_random_uuid(),
  provider public.payment_provider not null,
  event_id text not null check (length(btrim(event_id)) between 1 and 200),
  event_type text not null default '' check (length(event_type) <= 64),
  provider_payment_id text check (length(provider_payment_id) <= 128),
  payment_id uuid references public.course_payments(id) on delete set null,
  signature_valid boolean not null,
  processed boolean not null default false,
  received_at timestamptz not null default now(),
  unique (provider, event_id)
);
create index idx_payment_webhook_events_payment on public.payment_webhook_events (payment_id);

create trigger trg_course_payment_methods_updated_at before update
  on public.course_payment_methods for each row execute function public.set_updated_at();
create trigger trg_course_payments_updated_at before update
  on public.course_payments for each row execute function public.set_updated_at();

-- ──────────────────────────── RLS ────────────────────────────
alter table public.course_payment_methods enable row level security;
alter table public.course_payments enable row level security;
alter table public.payment_webhook_events enable row level security;

revoke all on public.course_payment_methods, public.course_payments,
              public.payment_webhook_events from public, anon, authenticated;

-- الوسائل المتاحة معلومة عامة: صفحة الدورة تحتاجها لتعرض أزرارها.
create policy public_course_payment_methods_select
on public.course_payment_methods
for select
to anon, authenticated
using (
  enabled
  and exists (
    select 1 from public.courses as parent
    where parent.id = course_id
      and parent.publish_status = 'published'::public.course_publish_status
  )
);
grant select (course_id, provider, enabled, sort_order)
  on table public.course_payment_methods to anon, authenticated;

-- المتدرب يرى مشترياته هو. المنح بالعمود عمدًا: مرجع المزود ومفتاح
-- التكرار والبيئة ورابط الدفع لا تُمنح لأي دور متصفح، فلا تُعدّ ولا تُخمّن.
create policy own_course_payments_select
on public.course_payments
for select
to authenticated
using (user_id = (select auth.uid()));
grant select (id, course_id, provider, status, total_amount, currency, created_at, paid_at)
  on table public.course_payments to authenticated;

-- سجل الإشعارات: لا سياسة ولا منح — غير موجود من منظور المتصفح.

grant select, insert, update, delete
  on public.course_payment_methods, public.course_payments, public.payment_webhook_events
  to service_role;

-- ───────────── تفعيل الوصول: معاملة واحدة لا أكثر ─────────────
-- تُنادى بعد تحقق الخادم من المزود، لا قبله. تقفل الصف ثم تكتب، فنداءان
-- متزامنان يتسلسلان ولا ينتج عنهما تسجيلان.
create or replace function public.finalize_course_purchase(
  p_payment_id uuid,
  p_provider_payment_id text,
  p_environment public.payment_environment
)
returns uuid
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_payment public.course_payments%rowtype;
  v_enrollment_id uuid;
begin
  select * into v_payment
    from public.course_payments
   where id = p_payment_id
     for update;
  if not found then
    raise exception 'payment_not_found' using errcode = 'P0002';
  end if;

  /* تكرار التفعيل نجاحٌ بلا أثر — هذا ما يجعل إعادة الإشعار غير ضارة. */
  if v_payment.status = 'paid' then
    return v_payment.enrollment_id;
  end if;

  if v_payment.status in ('failed','cancelled','expired','refunded') then
    raise exception 'payment_terminal' using errcode = 'P0001';
  end if;

  if v_payment.environment <> p_environment then
    raise exception 'environment_mismatch' using errcode = 'P0001';
  end if;

  if p_provider_payment_id is null or length(btrim(p_provider_payment_id)) = 0 then
    raise exception 'provider_reference_required' using errcode = 'P0001';
  end if;

  if v_payment.provider_payment_id is not null
     and v_payment.provider_payment_id <> p_provider_payment_id then
    raise exception 'provider_reference_mismatch' using errcode = 'P0001';
  end if;

  insert into public.course_enrollments (user_id, course_id, source, status)
  values (v_payment.user_id, v_payment.course_id, 'purchase', 'active')
  on conflict (user_id, course_id) do update
    set status = 'active',
        source = 'purchase',
        updated_at = now()
  returning id into v_enrollment_id;

  update public.course_payments
     set status = 'paid',
         paid_at = now(),
         provider_payment_id = p_provider_payment_id,
         enrollment_id = v_enrollment_id
   where id = p_payment_id;

  return v_enrollment_id;
end;
$$;

-- في schema `public` لأن PostgREST لا ينادي إلا ما فيه، والحماية بالمنح:
-- EXECUTE مسحوبة من الجميع وممنوحة لـservice_role وحده، فنداء بمفتاح
-- المتصفح يُرفض قبل أن يصل جسم الدالة.
revoke all on function public.finalize_course_purchase(uuid, text, public.payment_environment)
  from public, anon, authenticated;
grant execute on function public.finalize_course_purchase(uuid, text, public.payment_environment)
  to service_role;

commit;
