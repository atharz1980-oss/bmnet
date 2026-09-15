"use client";

/**
 * QuickActions — إجراءات سريعة في لوحة التحكم
 * الروابط لصفحات لم تُبنَ بعد تظهر Disabled مع تلميح واضح
 * (بدون إنشاء الصفحات — قرار المواصفة) لتفادي أي رابط مكسور.
 */
import Link from "next/link";
import { FileText, Home, Plus, Route, UserCog, type LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

interface QuickAction {
  label: string;
  icon: LucideIcon;
  /** صفحة مبنية → رابط فعلي، وإلا يبقى الإجراء معطلًا */
  href?: string;
  /** سبب التعطيل (يُعرض كتلميح) */
  disabledHint?: string;
}

const ACTIONS: QuickAction[] = [
  { label: "إضافة دورة", icon: Plus, href: "/admin/courses/new" },
  { label: "إضافة مسار", icon: Route, href: "/admin/paths/new" },
  { label: "إضافة مدرب", icon: UserCog, href: "/admin/trainers/new" },
  { label: "إضافة مقال", icon: FileText, href: "/admin/blog/new" },
  {
    label: "تعديل الصفحة الرئيسية",
    icon: Home,
    href: "/admin/content/home",
  },
];

export function QuickActions({ className }: { className?: string }) {
  return (
    <section
      aria-labelledby="quick-actions-heading"
      className={cn("rounded-xl border border-border bg-white p-4 sm:p-5", className)}
    >
      <h2 id="quick-actions-heading" className="mb-3 text-sm font-semibold text-charcoal-900">
        إجراءات سريعة
      </h2>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-5">
        {ACTIONS.map((action) => {
          const Icon = action.icon;
          const disabled = !action.href;
          const content = (
            <>
              <span
                aria-hidden="true"
                className={cn(
                  "flex h-11 w-11 lg:h-8 lg:w-8 shrink-0 items-center justify-center rounded-lg",
                  disabled ? "bg-surface text-charcoal-300" : "bg-brand-50 text-brand-600",
                )}
              >
                <Icon className="h-4 w-4" />
              </span>
              <span className="min-w-0 flex-1 text-start">
                <span
                  className={cn(
                    "block truncate text-sm font-medium",
                    disabled ? "text-charcoal-400" : "text-charcoal-800",
                  )}
                >
                  {action.label}
                </span>
                {action.disabledHint ? (
                  <span className="block truncate text-xs text-charcoal-400">
                    {action.disabledHint}
                  </span>
                ) : null}
              </span>
            </>
          );

          if (disabled || !action.href) {
            return (
              <button
                key={action.label}
                type="button"
                disabled
                aria-disabled="true"
                title={action.disabledHint}
                className="flex w-full cursor-not-allowed items-center gap-3 rounded-lg border border-border bg-surface/50 px-3 py-2.5 text-start opacity-80"
              >
                {content}
              </button>
            );
          }

          return (
            <Link
              key={action.label}
              href={action.href}
              className="flex w-full items-center gap-3 rounded-lg border border-border bg-white px-3 py-2.5 text-start transition-colors hover:border-brand-200 hover:bg-brand-50/40 focus-visible:bg-brand-50/40"
            >
              {content}
            </Link>
          );
        })}
      </div>
    </section>
  );
}
