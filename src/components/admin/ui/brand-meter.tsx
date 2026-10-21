import { cn } from "@/lib/utils";

/**
 * BrandMeter — مؤشّر نسبة بخط شعري
 * ---------------------------------------------------------------
 * الملف لا يستخدم أشرطة ممتلئة مستديرة — النسبة تُقرأ من خط.
 * الملء يأتي من جهة البداية (يمين في RTL).
 */
export function BrandMeter({
  value,
  max = 100,
  className,
  label,
}: {
  /** القيمة الحالية */
  value: number;
  /** الحد الأقصى (الافتراضي 100) */
  max?: number;
  className?: string;
  /** نص بديل لقارئ الشاشة */
  label?: string;
}) {
  const pct = Math.max(0, Math.min(100, (value / (max || 1)) * 100));

  return (
    <div
      className={cn("brand-meter w-full", className)}
      role="progressbar"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
    >
      <span style={{ width: `${pct}%` }} />
    </div>
  );
}
