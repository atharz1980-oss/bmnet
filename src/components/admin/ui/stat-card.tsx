/**
 * StatCard — بطاقة إحصائية موحدة للوح القياس
 * Server-safe (بلا حالة) — الأيقونة lucide تُمرَّر كمكوّن.
 */
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  /** القيمة منسقة كنص جاهز للعرض */
  value: string;
  icon: LucideIcon;
  hint?: string;
  href?: string;
  className?: string;
}

export function StatCard({ label, value, icon: Icon, hint, href, className }: StatCardProps) {
  const body = (
    <>
      <span className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
        <Icon aria-hidden="true" className="h-5 w-5" />
      </span>
      <p className="text-2xl font-bold tracking-tight text-charcoal-900">
        <span className="num-ltr" dir="ltr">
          {value}
        </span>
      </p>
      <p className="mt-0.5 text-sm text-muted-foreground">{label}</p>
      {hint ? <p className="mt-1 text-xs text-charcoal-400">{hint}</p> : null}
    </>
  );

  const baseClass = cn(
    "block rounded-xl border border-border bg-white p-5 transition-colors",
    href && "hover:border-brand-200 hover:bg-brand-50/40 focus-visible:bg-brand-50/40",
    className,
  );

  if (href) {
    return (
      <Link href={href} className={baseClass}>
        <span className="flex items-start justify-between">
          <span className="block">{body}</span>
          <ChevronLeft aria-hidden="true" className="mt-1 h-4 w-4 text-charcoal-300" />
        </span>
      </Link>
    );
  }

  return <div className={baseClass}>{body}</div>;
}
