import type { LucideIcon } from "lucide-react";
import { Inbox } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * EmptyState — حالة فراغ موحّدة
 * ---------------------------------------------------------------
 * بلا صندوق متقطّع ولا دائرة ممتلئة. الأيقونة أحادية الخط داخل
 * إطار مشطوف 45° (الزاوية المأخوذة من العلامة)، والعنوان بخط العرض.
 */
interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
  /** أزرار إجراء (إضافة جديد...) */
  children?: React.ReactNode;
  className?: string;
}

export function EmptyState({
  title,
  description,
  icon: Icon = Inbox,
  children,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 border border-dashed border-charcoal-200 bg-white px-6 py-14 text-center",
        className,
      )}
    >
      <span
        aria-hidden="true"
        className="brand-crop flex h-12 w-12 items-center justify-center border border-charcoal-200 bg-[#F3F1EC]"
      >
        <Icon className="h-5 w-5 text-charcoal-400" strokeWidth={1.5} />
      </span>
      <p className="brand-display-ar text-base font-semibold text-[#111111]">{title}</p>
      {description ? (
        <p className="max-w-sm text-sm leading-relaxed text-charcoal-500">{description}</p>
      ) : null}
      {children ? (
        <div className="mt-2 flex flex-wrap justify-center gap-2">{children}</div>
      ) : null}
    </div>
  );
}
