import { cn } from "@/lib/utils";

/**
 * BrandEyebrow — التسمية العلوية الموحّدة
 * ---------------------------------------------------------------
 * العنصر التوقيع في ملف الهوية: تسمية صغيرة بحروف كبيرة متباعدة
 * (+0.24em) تعلو العناوين وتصنّف الأقسام. تستخدم الأرقام Patience
 * للترقيم (01 / 02) كما في صفحات الملف.
 *
 *latin: تُعرض بحروف لاتينية (للأرقام واللاتينية)،
 * Otherwise: تبقى ضمن خط الواجهة العربي.
 */
export function BrandEyebrow({
  children,
  className,
  /** إظهار الترقيم قبل النص (مثل «01 / FOUNDATION») */
  index,
  /** تسمية إضافية بعد خط مائل — العلامة */
  tone = "default",
}: {
  children: React.ReactNode;
  className?: string;
  index?: string | number;
  tone?: "default" | "muted" | "accent" | "inverse";
}) {
  return (
    <p
      className={cn(
        "brand-eyebrow flex items-center gap-2",
        tone === "muted" && "text-charcoal-400",
        tone === "accent" && "text-brand-600",
        tone === "inverse" && "text-white/55",
        tone === "default" && "text-charcoal-500",
        className,
      )}
    >
      {index !== undefined ? (
        <span className="num-ltr text-brand-600" dir="ltr">
          {String(index).padStart(2, "0")}
        </span>
      ) : null}
      {index !== undefined ? (
        <span aria-hidden="true" className={cn("h-px w-4", tone === "inverse" ? "bg-white/30" : "bg-charcoal-300")} />
      ) : null}
      <span>{children}</span>
    </p>
  );
}
