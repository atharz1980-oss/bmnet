"use client";

/**
 * QuickActions — إجراءات سريعة في لوحة التحكم
 * ---------------------------------------------------------------
 * الروابط لصفحات لم تُبنَ بعد تظهر Disabled مع تلميح واضح
 * (بدون إنشاء الصفحات — قرار المواصفة) لتفادي أي رابط مكسور.
 *
 * النمط: صف نصّي داخل لوح أبيض، الفاصل خط شعري، وسهم 45° ينزلق
 * عند المرور (الجهاز البصري المأخوذ من العلامة).
 */
import Link from "next/link";
import { FileText, Home, Plus, Route, UserCog, type LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { BrandEyebrow } from "@/components/admin/ui/brand-eyebrow";

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
    <section aria-labelledby="quick-actions-heading" className={cn("mb-8", className)}>
      <BrandEyebrow index="01" className="mb-3">
        إجراءات سريعة
      </BrandEyebrow>

      <div className="grid grid-cols-1 gap-px bg-border sm:grid-cols-2 lg:grid-cols-5">
        {ACTIONS.map((action) => {
          const Icon = action.icon;
          const disabled = !action.href;

          const inner = (
            <>
              <Icon
                aria-hidden="true"
                className="h-4 w-4 shrink-0 text-charcoal-400"
                strokeWidth={1.5}
              />
              <span className="min-w-0 flex-1 truncate text-sm font-medium text-[#111111]">
                {action.label}
              </span>
              <span
                aria-hidden="true"
                className="brand-chevron text-charcoal-300"
              >
                ↖
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
                className="flex w-full cursor-not-allowed items-center gap-3 bg-white px-4 py-3.5 text-start opacity-60"
              >
                {inner}
              </button>
            );
          }

          return (
            <Link
              key={action.label}
              href={action.href}
              className="group flex w-full items-center gap-3 bg-white px-4 py-3.5 text-start transition-colors hover:bg-[#F3F1EC] focus-visible:bg-[#F3F1EC] focus-visible:outline-none"
            >
              {inner}
            </Link>
          );
        })}
      </div>
    </section>
  );
}
