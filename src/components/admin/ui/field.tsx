/**
 * Field — غلاف موحد لحقول النماذج في لوحة التحكم
 * Label فوق الحقل + نص مساعد + حالة خطأ (Mock) — RTL وAccessible.
 */
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface FieldProps {
  /** معرّف الحقل — يُربط تلقائيًا بالـ Label (htmlFor) */
  id: string;
  label: string;
  children: React.ReactNode;
  hint?: string;
  error?: string;
  required?: boolean;
  /** إخفاء الهامش السفلي عند دمج الحقول */
  compact?: boolean;
  className?: string;
}

export function Field({
  id,
  label,
  children,
  hint,
  error,
  required,
  compact,
  className,
}: FieldProps) {
  return (
    <div className={cn("space-y-1.5", !compact && "mb-1", className)}>
      <Label htmlFor={id} className="text-sm font-medium text-charcoal-800">
        {label}
        {required ? (
          <span aria-hidden="true" className="ms-1 text-brand-600">
            *
          </span>
        ) : (
          <span className="ms-2 text-xs font-normal text-muted-foreground">(اختياري)</span>
        )}
      </Label>
      {children}
      {hint && !error ? (
        <p id={`${id}-hint`} className="text-xs leading-relaxed text-muted-foreground">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p
          id={`${id}-error`}
          role="alert"
          className="text-xs font-medium leading-relaxed text-brand-700"
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}
