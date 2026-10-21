import { cn } from "@/lib/utils";

/**
 * BrandRule — الخط الشعري
 * ---------------------------------------------------------------
 * في ملف الهوية لا توجد صناديق: الفواصل خطوط شعرية عرض 1px.
 * هذه الوحدة هي الفاصل الوحيد بين الأقسام والصفوف.
 *
 * tone: ink (على الورق) | inverse (على الحبر) | accent (البرتقالي — للحظة واحدة فقط)
 */
export function BrandRule({
  className,
  tone = "ink",
  /** خط برتقالي — يُستخدم لآخر فاصل في القسم فقط */
  accent = false,
}: {
  className?: string;
  tone?: "ink" | "inverse";
  accent?: boolean;
}) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "block h-px w-full",
        accent
          ? "bg-brand-600"
          : tone === "inverse"
            ? "bg-white/15"
            : "bg-border",
        className,
      )}
    />
  );
}
