import { cn } from "@/lib/utils";
import type { CourseStatus, RequestStatus, SessionStatus, PublishStatus } from "@/data/admin/types";

/**
 * StatusBadge — حالة موحّدة بلا «شارة»
 * ---------------------------------------------------------------
 * في ملف الهوية الحالة تُكتب كنص: نقطة + كلمة، بنفس النمط الطباعي.
 * لا شارة ممتلئة ولا حدود ولا زوايا مستديرة. البرتقالي (= ACCENT)
 * محجوز للحالة القابلة للتصرّف فقط: متاح/مفتوح/جديد/متفق عليه.
 */
type AnyStatus = CourseStatus | SessionStatus | RequestStatus | PublishStatus | "active" | "hidden";

/** البرتقالي = حالة قابلة للتصرّف */
const TONE_ACCENT = "text-brand-600";
/** الحبر = نشط/جارٍ */
const TONE_INK = "text-charcoal-800";
/** محايد = مكتمل/مغلق */
const TONE_MUTED = "text-charcoal-400";
/** خافت = مسودة/مخفي */
const TONE_FAINT = "text-charcoal-300";

const STATUS_CONFIG: Record<string, { label: string; tone: string; dot: string }> = {
  /* الدورات */
  draft: { label: "مسودة", tone: TONE_FAINT, dot: "bg-charcoal-300" },
  published: { label: "منشورة", tone: TONE_ACCENT, dot: "bg-brand-600" },
  "coming-soon": { label: "قريبًا", tone: TONE_INK, dot: "bg-charcoal-800" },
  "registration-open": { label: "التسجيل مفتوح", tone: TONE_ACCENT, dot: "bg-brand-600" },
  full: { label: "مكتملة المقاعد", tone: TONE_MUTED, dot: "bg-charcoal-400" },
  completed: { label: "منتهية", tone: TONE_MUTED, dot: "bg-charcoal-400" },
  /* المواعيد */
  upcoming: { label: "قادمة", tone: TONE_INK, dot: "bg-charcoal-800" },
  open: { label: "التسجيل مفتوح", tone: TONE_ACCENT, dot: "bg-brand-600" },
  closed: { label: "مغلق", tone: TONE_MUTED, dot: "bg-charcoal-400" },
  /* طلبات الشركات */
  new: { label: "جديد", tone: TONE_ACCENT, dot: "bg-brand-600" },
  contacted: { label: "تم التواصل", tone: TONE_INK, dot: "bg-charcoal-800" },
  "preparing-offer": { label: "تحضير العرض", tone: TONE_INK, dot: "bg-charcoal-800" },
  "offer-sent": { label: "أُرسل العرض", tone: TONE_MUTED, dot: "bg-charcoal-500" },
  agreed: { label: "تم الاتفاق", tone: TONE_ACCENT, dot: "bg-brand-600" },
  /* النشر الثنائي */
  active: { label: "نشط", tone: TONE_ACCENT, dot: "bg-brand-600" },
  hidden: { label: "مخفي", tone: TONE_FAINT, dot: "bg-charcoal-300" },
  /* المستخدمون */
  invited: { label: "مدعو", tone: TONE_INK, dot: "bg-charcoal-800" },
  suspended: { label: "معلّق", tone: TONE_MUTED, dot: "bg-charcoal-400" },
};

export function StatusBadge({
  status,
  className,
}: {
  status: AnyStatus | string;
  className?: string;
}) {
  const config = STATUS_CONFIG[status] ?? {
    label: status,
    tone: TONE_MUTED,
    dot: "bg-charcoal-300",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 whitespace-nowrap text-xs font-medium",
        config.tone,
        className,
      )}
    >
      <span aria-hidden="true" className={cn("h-1.5 w-1.5 rounded-full", config.dot)} />
      {config.label}
    </span>
  );
}
