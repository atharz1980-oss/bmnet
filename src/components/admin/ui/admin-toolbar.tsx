import { cn } from "@/lib/utils";

/**
 * AdminToolbar — شريط أدوات القوائم: بحث + فلاتر + إجراءات
 * ---------------------------------------------------------------
 * سطر واحد بلا صندوق: خلفية ورقية، فاصل شعري علوي، والمحتوى
 * على خط واحد. يتحول عموديًا على الموبايل.
 */
interface AdminToolbarProps {
  children: React.ReactNode;
  className?: string;
}

export function AdminToolbar({ children, className }: AdminToolbarProps) {
  return (
    <div
      className={cn(
        "mb-5 flex flex-col gap-3 border-t border-border bg-[#F3F1EC] py-3 lg:flex-row lg:items-center lg:justify-between",
        className,
      )}
    >
      {children}
    </div>
  );
}
