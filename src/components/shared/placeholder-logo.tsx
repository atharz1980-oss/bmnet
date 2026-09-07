import { cn } from "@/lib/utils";

interface PlaceholderLogoProps {
  /** الاسم المعروض داخل الشعار المؤقت */
  name: string;
  nameEn?: string;
  note?: string;
  className?: string;
}

/**
 * شعار مؤقت (Placeholder) للاعتمادات وشركاء النجاح
 * حتى توفر الشعارات الرسمية — يكفي استبدال هذا المكوّن بصورة الشعار.
 */
export function PlaceholderLogo({ name, nameEn, note, className }: PlaceholderLogoProps) {
  return (
    <div
      title={note}
      className={cn(
        "group flex h-20 w-full items-center justify-center rounded-lg border border-charcoal-200 bg-white px-4 transition-colors hover:border-charcoal-300",
        className
      )}
    >
      <div className="text-center">
        {nameEn ? (
          <span className="font-latin block text-base font-bold tracking-[0.18em] text-charcoal-700">
            {nameEn}
          </span>
        ) : (
          <span className="block max-w-[11rem] text-sm font-semibold leading-snug text-charcoal-700">
            {name}
          </span>
        )}
        <span className="mt-1 block text-[10px] font-normal text-charcoal-400">
          شعار مؤقت
        </span>
      </div>
    </div>
  );
}
