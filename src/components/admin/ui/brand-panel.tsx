import { cn } from "@/lib/utils";

/**
 * BrandPanel — اللوح الأبيض
 * ---------------------------------------------------------------
 * الوحدة السطحية الوحيدة في لوحة التحكم: سطح أبيض ناصع (PURE WHITE)
 * على أرضية ورقية (PAPER)، يفصله خط شعري 1px. بلا زوايا مستديرة
 * وبلا ظل — كما في ملف الهوية تمامًا.
 */
export function BrandPanel({
  children,
  className,
  tone = "paper",
  as: Tag = "section",
}: {
  children: React.ReactNode;
  className?: string;
  /** paper = أبيض على أرضية ورقية | ink = حبر داكن | flat = بلا حد */
  tone?: "paper" | "ink" | "flat";
  as?: "section" | "div" | "article" | "aside";
}) {
  return (
    <Tag
      className={cn(
        "relative",
        tone === "paper" && "border border-border bg-white",
        tone === "ink" && "border border-white/10 bg-[#111111] text-[#F3F1EC]",
        tone === "flat" && "bg-white",
        className,
      )}
    >
      {children}
    </Tag>
  );
}
