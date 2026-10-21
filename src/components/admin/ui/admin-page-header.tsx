import { cn } from "@/lib/utils";

/**
 * AdminPageHeader — رأس صفحة موحّد بهوية «البيت الأسود»
 * ---------------------------------------------------------------
 * البنية تتبع ترويسة صفحات ملف الهوية:
 *   تسمية علوية (Eyebrow)  →  عنوان العرض الكبير  →  خط شعري
 * الأفعال على الجهة المقابلة، بلا صناديق ولا أزرار ممتلئة برتقالية.
 */
import { BrandEyebrow } from "@/components/admin/ui/brand-eyebrow";
import { BrandRule } from "@/components/admin/ui/brand-rule";

interface AdminPageHeaderProps {
  title: string;
  description?: string;
  /** تسمية علوية فوق العنوان — عادةً اسم القسم */
  eyebrow?: string;
  /** رقم القسم (01 / 02) */
  index?: string | number;
  /** أزرار الإجراءات (يمكن وضعها في مسار معاكس) */
  children?: React.ReactNode;
  className?: string;
}

export function AdminPageHeader({
  title,
  description,
  eyebrow,
  index,
  children,
  className,
}: AdminPageHeaderProps) {
  return (
    <header className={cn("mb-6", className)}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          {eyebrow || index !== undefined ? (
            <BrandEyebrow index={index} className="mb-3">
              {eyebrow}
            </BrandEyebrow>
          ) : null}

          <h1 className="brand-display-ar text-3xl text-[#111111] sm:text-4xl lg:text-[2.75rem]">
            {title}
          </h1>

          {description ? (
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-charcoal-500">
              {description}
            </p>
          ) : null}
        </div>

        {children ? (
          <div className="flex shrink-0 flex-wrap items-center gap-2">{children}</div>
        ) : null}
      </div>

      <BrandRule className="brand-rule-draw mt-6" />
    </header>
  );
}
