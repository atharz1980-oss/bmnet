/**
 * FinancialKpisPanel — المؤشرات المالية الحقيقية على لوحة التحكم (Phase 1)
 * -----------------------------------------------------------------------
 * مكوّن خادم (Server Component):
 *  - محروس بصلاحية `payments:view` القائمة (المالك والمالية). من لا يملكها
 *    لا يرى اللوحة أصلًا (يُعاد null) — لا أرقام ولا هياكل.
 *  - فشل الاستعلام ⇒ حالة «تعذّر التحميل» بدل رقم صفري مضلِّل.
 *  - الأرقام محصورة في بيئة الدفع الحالية، والاستردادات تُعرض منفصلة عن
 *    التحصيل بلا أي دمج أو صافٍ.
 */
import { AlertTriangle, Banknote, GraduationCap, Hourglass, RotateCcw, Undo2, Users, Wrench } from "lucide-react";

import { StatCard } from "@/components/admin/ui/stat-card";
import { formatNumber } from "@/lib/format";
import { loadFinancialKpis } from "@/lib/admin/financial-kpis";
import { requirePermission } from "@/lib/admin/session";
import { cn } from "@/lib/utils";

function formatSar(halalas: number): string {
  return `${new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(halalas / 100)} ر.س`;
}

function Group({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border border-border bg-white">
      <div className="border-b border-border px-5 py-4">
        <h2 className="brand-micro text-[#111111]">{title}</h2>
        {description ? (
          <p className="mt-1.5 text-xs leading-relaxed text-charcoal-400">{description}</p>
        ) : null}
      </div>
      <div className="grid grid-cols-1 gap-px bg-border sm:grid-cols-2 xl:grid-cols-4">
        {children}
      </div>
    </section>
  );
}

export async function FinancialKpisPanel({ className }: { className?: string }) {
  const gate = await requirePermission("payments", "view");
  if (!gate.ok) return null;

  const kpis = await loadFinancialKpis();

  if (!kpis) {
    return (
      <section
        className={cn("border border-danger-600/30 bg-danger-50 p-5", className)}
        role="alert"
      >
        <h2 className="brand-micro flex items-center gap-2 text-danger-600">
          <AlertTriangle aria-hidden="true" className="h-4 w-4" strokeWidth={1.5} />
          المؤشرات المالية
        </h2>
        <p className="mt-2 text-sm text-charcoal-600">
          تعذّر تحميل المؤشرات المالية من قاعدة البيانات. أعد تحديث الصفحة، وإن تكرر الخطأ تحقق من
          الاتصال.
        </p>
      </section>
    );
  }

  const envLabel = kpis.environment === "production" ? "بيئة الإنتاج" : "بيئة الاختبار";

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="brand-micro text-[#111111]">المؤشرات المالية</h2>
        <span className="brand-micro text-charcoal-400">{envLabel}</span>
      </div>

      {/* التحصيل المؤكد محليًا — إجمالي بلا صافٍ ولا إيراد محاسبي */}
      <Group
        title="المحصّل المؤكد محليًا"
        description="مجموع المدفوعات المؤكدة مع المزود (paid_at). إجمالي محصّل — ليس صافيًا ولا إيرادًا مكتسبًا."
      >
        <StatCard
          label="إجمالي المحصّل"
          value={formatSar(kpis.collected.total)}
          icon={Banknote}
          hint={`من ${formatNumber(kpis.collected.count)} دفعة مؤكدة`}
          className="border-0"
        />
        <StatCard
          label="مدفوعات الدورات"
          value={formatSar(kpis.collected.courses)}
          icon={GraduationCap}
          hint="course_payments"
          className="border-0"
        />
        <StatCard
          label="مدفوعات الضيوف"
          value={formatSar(kpis.collected.guests)}
          icon={Users}
          hint="guest_course_orders"
          className="border-0"
        />
        <StatCard
          label="دفعات الورش"
          value={formatSar(kpis.collected.workshops)}
          icon={Wrench}
          hint="workshop_payments"
          className="border-0"
        />
      </Group>

      {/* الاستردادات — كل قناة مستقلة، ولا تُدمج مع التحصيل أعلاه */}
      <Group
        title="الاستردادات (منفصلة — لا تُدمج مع المحصّل)"
        description="تُعرض كل قناة على حدة بلا جمع أو صافٍ، لأن تداخل قنوات استرداد الورش غير مُثبت المنع."
      >
        <StatCard
          label="استردادات الدورات (موثّقة)"
          value={formatSar(kpis.documentedRefunds.courses)}
          icon={RotateCcw}
          hint="من refunded_amount"
          className="border-0"
        />
        <StatCard
          label="استردادات الضيوف (موثّقة)"
          value={formatSar(kpis.documentedRefunds.guests)}
          icon={RotateCcw}
          hint="من refunded_amount"
          className="border-0"
        />
        {/* مخفي مؤقتًا: مسار تسجيل استرداد على مستوى دفعة الورش لا يُكتب للصفوف
            المدفوعة فعلًا، فالبطاقة تظهر 0.00 دائمًا. الحساب في
            computeFinancialKpis.kpis.documentedRefunds.workshops وبقية الاختبارات
            محفوظة، ومعها استردادتا الورش اليدوية/المستحقة أدناه. */}
        <StatCard
          label="استردادات ورش منفّذة يدويًا"
          value={formatSar(kpis.workshopManualRefunds)}
          icon={Undo2}
          hint="refund_status = refunded"
          className="border-0"
        />
        <StatCard
          label="استردادات ورش مستحقة"
          value={formatSar(kpis.workshopRefundsDue)}
          icon={AlertTriangle}
          hint="refund_status = due — لم تُنفّذ بعد"
          className="border-0"
        />
      </Group>

      {/* الورش والمحاولات — التزامات وحالات سير عمل لا تُضاف للتحصيل */}
      <Group
        title="الورش والمحاولات (لا تُضاف للتحصيل)"
        description="المتبقي على حجوزات الورش ومحاولات الدفع غير المكتملة — بنود مستقلة عن المال المحصّل."
      >
        <StatCard
          label="المتبقي على حجوزات الورش"
          value={formatSar(kpis.workshopRemaining)}
          icon={Hourglass}
          hint="لحجوزات بحالة deposit_paid"
          className="border-0"
        />
        <StatCard
          label="محاولات دفع غير مكتملة (العدد)"
          value={formatNumber(kpis.pendingAttempts.count)}
          icon={Wrench}
          hint="بحالات created / pending / authorized"
          className="border-0"
        />
        <StatCard
          label="مبلغ المحاولات غير المكتملة"
          value={formatSar(kpis.pendingAttempts.amount)}
          icon={Wrench}
          hint="غير محصّل — للعلم فقط"
          className="border-0"
        />
      </Group>
    </div>
  );
}
