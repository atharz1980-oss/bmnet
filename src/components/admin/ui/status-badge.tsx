/**
 * StatusBadge — شارة حالة موحدة لكل كيانات لوحة التحكم
 * خلفية سطح + حد + نقطة لون (وفق design.md §7):
 * الأحمر = نشط/مفتوح، الفحمي الفاتح = محايد، الفحمي الغامق = قادم.
 */
import { cn } from "@/lib/utils";
import type { CourseStatus, RequestStatus, SessionStatus, PublishStatus } from "@/data/admin/types";

type AnyStatus = CourseStatus | SessionStatus | RequestStatus | PublishStatus | "active" | "hidden";

interface StatusConfig {
  label: string;
  dot: string;
  /** استثناء خلفية تفتح الانتباه (مثل الطلبات الجديدة) */
  highlight?: boolean;
}

const STATUS_CONFIG: Record<string, StatusConfig> = {
  /* الدورات */
  draft: { label: "مسودة", dot: "bg-charcoal-300" },
  published: { label: "منشورة", dot: "bg-brand-600" },
  "coming-soon": { label: "قريبًا", dot: "bg-charcoal-800" },
  "registration-open": { label: "التسجيل مفتوح", dot: "bg-brand-600" },
  full: { label: "مكتملة المقاعد", dot: "bg-charcoal-400" },
  completed: { label: "منتهية", dot: "bg-charcoal-400" },
  /* المواعيد */
  upcoming: { label: "قادمة", dot: "bg-charcoal-800" },
  open: { label: "التسجيل مفتوح", dot: "bg-brand-600" },
  closed: { label: "مغلق", dot: "bg-charcoal-400" },
  /* طلبات الشركات */
  new: { label: "جديد", dot: "bg-brand-600", highlight: true },
  contacted: { label: "تم التواصل", dot: "bg-charcoal-800" },
  "preparing-offer": { label: "تحضير العرض", dot: "bg-charcoal-800" },
  "offer-sent": { label: "أُرسل العرض", dot: "bg-charcoal-500" },
  agreed: { label: "تم الاتفاق", dot: "bg-brand-600" },
  /* النشر الثنائي */
  active: { label: "نشط", dot: "bg-brand-600" },
  hidden: { label: "مخفي", dot: "bg-charcoal-300" },
  /* المستخدمون (Checkpoint 6) */
  invited: { label: "مدعو", dot: "bg-charcoal-800" },
  suspended: { label: "معلّق", dot: "bg-charcoal-400" },
};

export function StatusBadge({
  status,
  className,
}: {
  status: AnyStatus | string;
  className?: string;
}) {
  const config = STATUS_CONFIG[status] ?? { label: status, dot: "bg-charcoal-300" };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-medium",
        config.highlight
          ? "border-brand-200 bg-brand-50 text-brand-700"
          : "border-border bg-surface text-charcoal-700",
        className,
      )}
    >
      <span aria-hidden="true" className={cn("h-1.5 w-1.5 rounded-full", config.dot)} />
      {config.label}
    </span>
  );
}
