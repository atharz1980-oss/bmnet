"use client";

/**
 * SettingsNav — قائمة التنقل بين صفحات الإعدادات (#18)
 * -----------------------------------------------------
 * Sidebar عمودي على الشاشات الكبيرة وصف أفقي قابل للتمرير على الموبايل —
 * يعرف المالك أين يجد: عامة / التواصل / الفوتر / SEO / الدفع.
 * نشط بـ aria-current — والتمرير الأفقي لا يسبب page overflow.
 */
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CreditCard, Globe, LayoutList, MessageSquare, Tag } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/admin/ui/confirm-dialog";

const SETTINGS_NAV = [
  { href: "/admin/settings/general", label: "الإعدادات العامة", icon: Globe },
  { href: "/admin/settings/contact", label: "بيانات التواصل", icon: MessageSquare },
  { href: "/admin/settings/footer", label: "الفوتر", icon: LayoutList },
  { href: "/admin/settings/seo", label: "إعدادات SEO", icon: Tag },
  { href: "/admin/settings/payments", label: "إعدادات الدفع", icon: CreditCard },
] as const;

export function SettingsNav() {
  const pathname = usePathname() ?? "";

  return (
    <nav aria-label="أقسام الإعدادات" className="mb-6">
      {/* Desktop: قائمة عمودية */}
      <ul className="hidden w-52 shrink-0 flex-col gap-1 rounded-xl border border-border bg-white p-2 md:flex">
        {SETTINGS_NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-brand-50 text-brand-700"
                    : "text-charcoal-600 hover:bg-accent hover:text-charcoal-900",
                )}
              >
                <Icon aria-hidden="true" className="h-4 w-4 shrink-0" />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>

      {/* Mobile: صف أفقي قابل للتمرير داخليًا */}
      <ul className="flex gap-1.5 overflow-x-auto rounded-xl border border-border bg-white p-2 scrollbar-thin md:hidden">
        {SETTINGS_NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <li key={href} className="shrink-0">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-2 text-xs font-medium transition-colors",
                  active
                    ? "bg-brand-50 text-brand-700"
                    : "text-charcoal-600 hover:bg-accent hover:text-charcoal-900",
                )}
              >
                <Icon aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/** SettingsPageLayout — تخطيط موحد لصفحات الإعدادات (nav + محتوى) */
export function SettingsPageLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-6xl">
      <div className="md:flex md:gap-6">
        <div className="md:w-52 md:shrink-0">
          <SettingsNav />
        </div>
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  );
}

/** SettingsSaveBar — شريط الحفظ الثابت الموحد (Dirty + Save + Cancel) */
export function SettingsSaveBar({
  isDirty,
  dirtyLabel = "تغييرات غير محفوظة",
  saveLabel = "حفظ الإعدادات",
  onSave,
  onCancel,
  cancelConfirm,
}: {
  isDirty: boolean;
  dirtyLabel?: string;
  saveLabel?: string;
  onSave: () => void;
  onCancel: () => void;
  cancelConfirm: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onConfirm: () => void;
  };
}) {
  return (
    <>
      <div className="sticky bottom-0 -mx-4 mt-6 border-t border-border bg-white px-4 py-3 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
        <div className="flex items-center justify-between gap-3">
          <p aria-live="polite" className="flex items-center gap-2 text-xs text-muted-foreground">
            {isDirty ? (
              <>
                <span aria-hidden="true" className="h-2 w-2 rounded-full bg-brand-500" />
                {dirtyLabel}
              </>
            ) : (
              "لا تغييرات جديدة"
            )}
          </p>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => onCancel()}>
              إلغاء
            </Button>
            {/* عزل حدث النقر: handleSave(explicit?) يقبل قيمة صريحة — لا يجوز
                أن يتسرب الحدث إليها عبر onClick المباشر (علة Settings CP7) */}
            <Button onClick={() => onSave()}>{saveLabel}</Button>
          </div>
        </div>
      </div>

      <ConfirmCancelDialog {...cancelConfirm} />
    </>
  );
}

function ConfirmCancelDialog({
  open,
  onOpenChange,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}) {
  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title="تجاهل التغييرات؟"
      description="لديك تعديلات غير محفوظة في هذه الصفحة سيُلغى إثرها بالعودة إلى آخر حالة محفوظة. هل تريد المتابعة؟"
      confirmLabel="تجاهل التغييرات"
      onConfirm={onConfirm}
    />
  );
}
