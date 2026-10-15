import "server-only";

/**
 * بيت المصور — المؤشرات المالية الحقيقية (Phase 1)
 * ------------------------------------------------
 * كل الأرقام مشتقة من جداول الدفع الفعلية، ومحصورة في بيئة واحدة
 * (`PAYMENTS_MODE`) فلا يختلط إنتاج باختبار أبدًا.
 *
 * ─────────────── المرتكز المحاسبي (لماذا `paid_at`) ───────────────
 * الحالة (`status`) ليست مؤشرًا تاريخيًا: الصف المدفوع ثم المسترد كليًا في
 * `course_payments`/`guest_course_orders` يبقى `paid` ويُضبط عليه
 * `refunded_amount` فقط، بينما `status='refunded'` يُكتب لصفوف **لم تُدفع
 * محليًا** أصلًا. لذلك:
 *   - «المؤكد محليًا» = Σ المبلغ حيث `paid_at IS NOT NULL` (يُكتب فقط بعد
 *     تأكيد المزود مع مطابقة المرجع/المبلغ/العملة، ولا يُمسح ولا يُكتب في
 *     مسار آخر).
 *   - «موثّق» من الاسترداد = Σ `refunded_amount` لنفس صفوف `paid_at`.
 *
 * ─────────────── ما لا نحسبه عمدًا ───────────────
 * - لا صافي تحصيل موحّد، ولا إيراد محاسبي مكتسب: لا توجد إشارة إتمام خدمة،
 *   والمال المحصّل قد يقابله التزام (رصيد تدريبي) لا إيراد.
 * - لا نجمع قناتي استرداد الورش (على مستوى الدفعة + اليدوي على الطلب) في
 *   رقم واحد: لا دليل يقطع بمنع الازدواج، فتُعرض كل قناة مستقلة.
 * - الأرصدة التدريبية مستبعدة: جدول `training_credits` بلا عمود `environment`
 *   فلا يمكن فصل إنتاج/اختبار عليها.
 *
 * ─────────────── الفشل المغلق ───────────────
 * أي خطأ في أي استعلام ⇒ تُعيد الدالة `null`، فتعرض الواجهة «تعذّر التحميل»
 * بدل أرقام جزئية أو صفر مضلِّل.
 */

import { paymentsMode, type PaymentMode } from "@/lib/payments/env";
import { getServiceSupabase } from "@/lib/supabase/service";

export type PaymentEnvironment = PaymentMode;

/** حالات «محاولة دفع لم تكتمل» — لا مال محصّل فيها. */
const OPEN_STATUSES = ["created", "pending", "authorized"] as const;

/** حجم صفحة جلب الصفوف — نتجاوز حد Supabase الافتراضي بالترقيم الكامل. */
export const FINANCIAL_KPI_PAGE_SIZE = 1000;

/* ─────────────────────────── أشكال الصفوف ─────────────────────────── */

export interface CourseGuestRow {
  paid_at: string | null;
  status: string;
  total_amount: number;
  refunded_amount: number;
}

export interface WorkshopPaymentRow {
  paid_at: string | null;
  status: string;
  amount: number;
  refunded_amount: number;
}

export interface WorkshopOrderRow {
  status: string;
  total_amount: number;
  paid_amount: number;
  refund_status: string;
  refund_due_amount: number;
}

export interface FinancialKpisInput {
  environment: PaymentEnvironment;
  coursePayments: readonly CourseGuestRow[];
  guestOrders: readonly CourseGuestRow[];
  workshopPayments: readonly WorkshopPaymentRow[];
  workshopOrders: readonly WorkshopOrderRow[];
}

/* ─────────────────────────── الخرج ─────────────────────────── */

export interface FinancialKpis {
  environment: PaymentEnvironment;
  /** المدفوعات المؤكدة محليًا (paid_at) — إجمالي، لا صافٍ. */
  collected: {
    courses: number;
    guests: number;
    workshops: number;
    total: number;
    count: number;
  };
  /** استردادات موثّقة من المزود على مستوى الدفعة، لكل مصدر مستقل. */
  documentedRefunds: {
    courses: number;
    guests: number;
    workshops: number;
  };
  /** استرداد ورش سُجّل تنفيذه يدويًا (refund_status='refunded'). */
  workshopManualRefunds: number;
  /** استرداد ورش مستحق لم يُنفّذ بعد (refund_status='due'). */
  workshopRefundsDue: number;
  /** المتبقي على حجوزات الورش ذات العربون — receivable لا تحصيل. */
  workshopRemaining: number;
  /** محاولات دفع لم تكتمل (غير محصّلة) — منفصلة عن المتبقي. */
  pendingAttempts: {
    count: number;
    amount: number;
  };
}

/* ─────────────────────────── الحساب النقي ─────────────────────────── */

function sum<T>(rows: readonly T[], pick: (row: T) => number): number {
  let total = 0;
  for (const row of rows) total += pick(row);
  return total;
}

function isCollected(row: { paid_at: string | null }): boolean {
  return row.paid_at !== null;
}

function isOpen(row: { status: string }): boolean {
  return (OPEN_STATUSES as readonly string[]).includes(row.status);
}

/** استرداد الدفعة موثّق ومقصوص بحدّ أصلها (ورش لا قيد علوي عليها في المخطط). */
function documentedRefund(row: { paid_at: string | null; refunded_amount: number }, cap: number): number {
  if (!isCollected(row) || row.refunded_amount <= 0) return 0;
  return Math.min(row.refunded_amount, cap);
}

/**
 * يحوّل صفوف الجداول الأربعة (مُصفّاة مسبقًا على بيئة واحدة) إلى مؤشرات.
 * دالة نقيّة بلا إدخال/إخراج — قابلة للاختبار مباشرة.
 */
export function computeFinancialKpis(input: FinancialKpisInput): FinancialKpis {
  const { coursePayments, guestOrders, workshopPayments, workshopOrders } = input;

  const collectedCourses = sum(coursePayments, (row) => (isCollected(row) ? row.total_amount : 0));
  const collectedGuests = sum(guestOrders, (row) => (isCollected(row) ? row.total_amount : 0));
  const collectedWorkshops = sum(workshopPayments, (row) => (isCollected(row) ? row.amount : 0));

  const collectedCount =
    coursePayments.filter(isCollected).length +
    guestOrders.filter(isCollected).length +
    workshopPayments.filter(isCollected).length;

  const documentedRefunds = {
    courses: sum(coursePayments, (row) => documentedRefund(row, row.total_amount)),
    guests: sum(guestOrders, (row) => documentedRefund(row, row.total_amount)),
    workshops: sum(workshopPayments, (row) => documentedRefund(row, row.amount)),
  };

  const workshopManualRefunds = sum(workshopOrders, (order) =>
    order.refund_status === "refunded" ? order.refund_due_amount : 0,
  );
  const workshopRefundsDue = sum(workshopOrders, (order) =>
    order.refund_status === "due" ? order.refund_due_amount : 0,
  );
  const workshopRemaining = sum(workshopOrders, (order) =>
    order.status === "deposit_paid" ? Math.max(0, order.total_amount - order.paid_amount) : 0,
  );

  const pendingAmount =
    sum(coursePayments, (row) => (isOpen(row) ? row.total_amount : 0)) +
    sum(guestOrders, (row) => (isOpen(row) ? row.total_amount : 0)) +
    sum(workshopPayments, (row) => (isOpen(row) ? row.amount : 0));
  const pendingCount =
    coursePayments.filter(isOpen).length +
    guestOrders.filter(isOpen).length +
    workshopPayments.filter(isOpen).length;

  return {
    environment: input.environment,
    collected: {
      courses: collectedCourses,
      guests: collectedGuests,
      workshops: collectedWorkshops,
      total: collectedCourses + collectedGuests + collectedWorkshops,
      count: collectedCount,
    },
    documentedRefunds,
    workshopManualRefunds,
    workshopRefundsDue,
    workshopRemaining,
    pendingAttempts: { count: pendingCount, amount: pendingAmount },
  };
}

/* ─────────────────────────── الجلب (ترقيم كامل) ─────────────────────────── */

type PageFetcher = (from: number, to: number) => PromiseLike<{ data: unknown; error: unknown }>;

/**
 * يجلب كل الصفوف عبر ترقيم كامل (لا يتوقف عند حد Supabase الافتراضي).
 * يُعيد `null` عند أي خطأ — فشل مغلق.
 */
export async function fetchAllPages(
  fetchPage: PageFetcher,
  pageSize: number = FINANCIAL_KPI_PAGE_SIZE,
): Promise<unknown[] | null> {
  const rows: unknown[] = [];
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await fetchPage(from, from + pageSize - 1);
    if (error) return null;
    const page = (data ?? []) as unknown[];
    rows.push(...page);
    if (page.length < pageSize) return rows;
  }
}

/**
 * يحمّل المؤشرات للبيئة الحالية (أو بيئة محدّدة صراحةً — للحالات الإدارية).
 * أي فشل ⇒ `null`.
 *
 * الترتيب `created_at` ثم `id`: بدون معيار ثانٍ فريد لا يضمن Postgres ترتيبًا
 * ثابتًا عند تعادل `created_at`، فقد تتكرر صفوف أو تُفقد بين صفحات الترقيم.
 */
export async function loadFinancialKpis(
  environment: PaymentEnvironment = paymentsMode(),
): Promise<FinancialKpis | null> {
  const svc = getServiceSupabase();

  const [coursePayments, guestOrders, workshopPayments, workshopOrders] = await Promise.all([
    fetchAllPages((from, to) =>
      svc
        .from("course_payments")
        .select("status, total_amount, refunded_amount, paid_at")
        .eq("environment", environment)
        .order("created_at", { ascending: true })
        .order("id", { ascending: true })
        .range(from, to),
    ),
    fetchAllPages((from, to) =>
      svc
        .from("guest_course_orders")
        .select("status, total_amount, refunded_amount, paid_at")
        .eq("environment", environment)
        .order("created_at", { ascending: true })
        .order("id", { ascending: true })
        .range(from, to),
    ),
    fetchAllPages((from, to) =>
      svc
        .from("workshop_payments")
        .select("status, amount, refunded_amount, paid_at")
        .eq("environment", environment)
        .order("created_at", { ascending: true })
        .order("id", { ascending: true })
        .range(from, to),
    ),
    fetchAllPages((from, to) =>
      svc
        .from("workshop_orders")
        .select("status, total_amount, paid_amount, refund_status, refund_due_amount")
        .eq("environment", environment)
        .order("created_at", { ascending: true })
        .order("id", { ascending: true })
        .range(from, to),
    ),
  ]);

  if (!coursePayments || !guestOrders || !workshopPayments || !workshopOrders) return null;

  return computeFinancialKpis({
    environment,
    coursePayments: coursePayments as CourseGuestRow[],
    guestOrders: guestOrders as CourseGuestRow[],
    workshopPayments: workshopPayments as WorkshopPaymentRow[],
    workshopOrders: workshopOrders as WorkshopOrderRow[],
  });
}
