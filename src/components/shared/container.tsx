import { cn } from "@/lib/utils";

/** حاوية موحدة لعرض المحتوى — تضمن اتساق الهوامش في كل الصفحات */
export function Container({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8", className)}
      {...props}
    />
  );
}
