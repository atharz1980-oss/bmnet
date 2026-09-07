/**
 * AdminToolbar — شريط أدوات القوائم: بحث + فلاتر + إجراءات
 * يتحول عموديًا على الموبايل وأفقيًا على الشاشات الكبيرة.
 */
import { cn } from "@/lib/utils";

interface AdminToolbarProps {
  children: React.ReactNode;
  className?: string;
}

export function AdminToolbar({ children, className }: AdminToolbarProps) {
  return (
    <div
      className={cn(
        "mb-4 flex flex-col gap-3 rounded-xl border border-border bg-white p-3 lg:flex-row lg:items-center lg:justify-between",
        className,
      )}
    >
      {children}
    </div>
  );
}
