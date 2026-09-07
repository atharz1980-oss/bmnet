/**
 * AdminPageHeader — رأس صفحة موحد: عنوان + وصف + منطقة إجراءات
 * Server-safe.
 */
import { cn } from "@/lib/utils";

interface AdminPageHeaderProps {
  title: string;
  description?: string;
  /** أزرار الإجراءات (يمكن وضعها في مسار معاكس) */
  children?: React.ReactNode;
  className?: string;
}

export function AdminPageHeader({ title, description, children, className }: AdminPageHeaderProps) {
  return (
    <div
      className={cn(
        "mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between",
        className,
      )}
    >
      <div className="min-w-0">
        <h1 className="text-xl font-bold tracking-tight text-charcoal-900 sm:text-2xl">{title}</h1>
        {description ? (
          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            {description}
          </p>
        ) : null}
      </div>
      {children ? (
        <div className="flex shrink-0 flex-wrap items-center gap-2">{children}</div>
      ) : null}
    </div>
  );
}
