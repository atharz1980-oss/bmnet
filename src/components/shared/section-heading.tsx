import { cn } from "@/lib/utils";
import { Reveal } from "./reveal";

interface SectionHeadingProps {
  /** كلمة تمهيدية صغيرة فوق العنوان */
  eyebrow?: string;
  title: string;
  description?: string;
  align?: "start" | "center";
  className?: string;
  dark?: boolean;
  /** معرّف العنوان — يربطه بـ aria-labelledby في القسم الأب (Checkpoint 7: إصلاح مراجع معلقة) */
  titleId?: string;
}

/** عنوان قسم موحد: تمهيد + عنوان + وصف */
export function SectionHeading({
  eyebrow,
  title,
  description,
  align = "center",
  className,
  dark = false,
  titleId,
}: SectionHeadingProps) {
  return (
    <Reveal
      className={cn(
        "max-w-2xl",
        align === "center" ? "mx-auto text-center" : "text-start",
        className
      )}
    >
      {eyebrow ? (
        <p
          className={cn(
            "mb-3 flex items-center gap-2 text-sm font-semibold tracking-wide text-brand-600",
            align === "center" && "justify-center"
          )}
        >
          <span aria-hidden="true" className="inline-block h-px w-6 bg-brand-600" />
          {eyebrow}
          {align === "center" && (
            <span aria-hidden="true" className="inline-block h-px w-6 bg-brand-600" />
          )}
        </p>
      ) : null}
      <h2
        id={titleId}
        className={cn(
          "text-2xl font-bold leading-snug tracking-tight sm:text-3xl lg:text-4xl",
          dark ? "text-white" : "text-charcoal-900"
        )}
      >
        {title}
      </h2>
      {description ? (
        <p
          className={cn(
            "mt-4 text-base leading-relaxed sm:text-lg",
            dark ? "text-charcoal-300" : "text-charcoal-500"
          )}
        >
          {description}
        </p>
      ) : null}
    </Reveal>
  );
}
