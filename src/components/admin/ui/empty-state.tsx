/**
 * EmptyState — حالة فراغ موحدة للقوائم الفارغة
 * Server-safe — الأيقونة اختيارية من lucide.
 */
import type { LucideIcon } from "lucide-react";
import { Inbox } from "lucide-react";
import { cn } from "@/lib/utils";

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
        "flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-charcoal-200 bg-white px-6 py-12 text-center",
        className,
      )}
    >
      <span className="mb-1 flex h-12 w-12 items-center justify-center rounded-full bg-surface text-charcoal-400">
        <Icon aria-hidden="true" className="h-6 w-6" />
      </span>
      <p className="text-sm font-semibold text-charcoal-800">{title}</p>
      {description ? (
        <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">{description}</p>
      ) : null}
      {children ? <div className="mt-3 flex flex-wrap justify-center gap-2">{children}</div> : null}
    </div>
  );
}
