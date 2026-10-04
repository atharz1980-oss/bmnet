"use client";

/**
 * أزرار الحجز في صفحة الهبوط (الافتتاحية، النداء الختامي، الشريط الثابت).
 *
 * الجاهز: رابط إلى نموذج الدفع في بطاقة السعر، ثم يضع المؤشر في حقل الاسم.
 * النموذج وحده يرسل — لا منطق دفع هنا ولا مبلغ ولا معرّف دورة.
 * غير الجاهز: زر معطل بنص صريح — مغلق افتراضيًا، لا زر يفشل بالضغط.
 */

import { CreditCard } from "lucide-react";

import { cn } from "@/lib/utils";
import type { LandingCheckout } from "@/lib/landing/checkout";

import { GUEST_FIRST_FIELD_ID, GUEST_FORM_ANCHOR } from "./anchors";

const base =
  "inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-6 text-base font-semibold outline-none transition-colors focus-visible:ring-[3px] focus-visible:ring-brand-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-charcoal-950";

/** ينتقل إلى النموذج ثم يركّز حقل الاسم بعد انتهاء التمرير الناعم. */
function focusGuestForm(event: React.MouseEvent<HTMLAnchorElement>) {
  const field = document.getElementById(GUEST_FIRST_FIELD_ID);
  if (!field) return;
  event.preventDefault();
  document.getElementById(GUEST_FORM_ANCHOR)?.scrollIntoView({ behavior: "smooth", block: "center" });
  window.history.replaceState(window.history.state, "", `#${GUEST_FORM_ANCHOR}`);
  window.setTimeout(() => field.focus({ preventScroll: true }), 450);
}

export function CheckoutCta({
  checkout,
  label,
  className,
  showIcon = true,
  formClassName,
}: {
  checkout: LandingCheckout;
  label: string;
  className?: string;
  showIcon?: boolean;
  /** موضع الزر في تخطيط الأب (عرض، هامش، flex). */
  formClassName?: string;
}) {
  if (checkout.status !== "ready") {
    return (
      <button
        type="button"
        disabled
        data-lp-checkout="unavailable"
        className={cn(base, "cursor-not-allowed bg-charcoal-700 text-charcoal-200", formClassName, className)}
      >
        {showIcon && <CreditCard aria-hidden="true" className="h-5 w-5" />}
        {label}
      </button>
    );
  }

  return (
    <a
      href={`#${GUEST_FORM_ANCHOR}`}
      onClick={focusGuestForm}
      data-lp-checkout="ready"
      className={cn(
        base,
        "bg-brand-600 text-white shadow-lg shadow-brand-900/30 hover:bg-brand-700",
        formClassName,
        className,
      )}
    >
      {showIcon && <CreditCard aria-hidden="true" className="h-5 w-5" />}
      {label}
    </a>
  );
}

/** ملاحظة تحت الزر عند إغلاق الدفع — بلا وعود ولا مواعيد مختلقة. */
export function CheckoutUnavailableNote({
  checkout,
  hasWhatsapp,
  className,
}: {
  checkout: LandingCheckout;
  hasWhatsapp: boolean;
  className?: string;
}) {
  if (checkout.status === "ready") return null;
  return (
    <p className={cn("text-sm leading-relaxed", className)}>
      الدفع الإلكتروني لهذه الورشة غير متاح حاليًا.
      {hasWhatsapp ? " تواصل معنا عبر واتساب لإتمام التسجيل." : ""}
    </p>
  );
}
