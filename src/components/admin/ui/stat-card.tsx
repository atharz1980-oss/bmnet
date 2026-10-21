import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * StatCard — بطاقة إحصائية بهوية الملف
 * ---------------------------------------------------------------
 * بدل الصندوق المستدير: لوح أبيض ناصع بخط شعري، والتسمية العلوية
 * بحروف متباعدة، والرقم بخط العرض الكبير. الأيقونة أحادية الخط
 * (monoline) كأنظمة الملف.
 */
interface StatCardProps {
  label: string;
  /** القيمة منسقة كنص جاهز للعرض */
  value: string;
  icon: LucideIcon;
  hint?: string;
  href?: string;
  className?: string;
  /** رقم الإطار أعلى البطاقة (01 / 02 …) — بصيغة contact sheet */
  index?: string | number;
}

export function StatCard({
  label,
  value,
  icon: Icon,
  hint,
  href,
  className,
  index,
}: StatCardProps) {
  const body = (
    <>
      <div className="flex items-start justify-between gap-3">
        <span className="brand-micro text-charcoal-400">{label}</span>
        {index !== undefined ? (
          <span className="brand-micro num-ltr text-charcoal-300" dir="ltr">
            {String(index).padStart(2, "0")}
          </span>
        ) : null}
      </div>

      <p className="brand-figure mt-4 text-4xl text-[#111111]">
        <span className="num-ltr" dir="ltr">
          {value}
        </span>
      </p>

      <div className="mt-4 flex items-end justify-between gap-3">
        {hint ? (
          <p className="text-xs leading-relaxed text-charcoal-400">{hint}</p>
        ) : (
          <span />
        )}
        <Icon
          aria-hidden="true"
          className="h-4 w-4 shrink-0 text-charcoal-300"
          strokeWidth={1.5}
        />
      </div>
    </>
  );

  const baseClass = cn(
    "group relative block border border-border bg-white p-5 transition-colors",
    href &&
      "hover:border-charcoal-900 focus-visible:border-charcoal-900 focus-visible:outline-none",
    className,
  );

  if (href) {
    return (
      <Link href={href} className={baseClass}>
        {body}
        <ChevronLeft
          aria-hidden="true"
          className="brand-chevron absolute end-5 top-5 hidden h-4 w-4 text-charcoal-300 group-hover:text-[#111111] lg:block"
        />
      </Link>
    );
  }

  return <div className={baseClass}>{body}</div>;
}
