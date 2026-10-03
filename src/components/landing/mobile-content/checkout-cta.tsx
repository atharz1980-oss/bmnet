"use client";

/**
 * زر الدفع في صفحة الهبوط — نموذج يرسل إلى `landingCheckoutAction`.
 *
 * لا منطق دفع هنا ولا مبلغ ولا معرّف دورة: الإجراء على الخادم يتحقق ثم
 * ينادي `startCheckoutAction` القائم، فيُحوَّل الزائر إلى صفحة ميسّر
 * المستضافة (أو إلى الدخول أولًا ثم يعود هنا). يعمل النموذج بلا جافاسكربت
 * أيضًا. معاملات UTM تُضاف حقولًا مخفية بعد الترطيب ولا تُرسل لأي جهة.
 *
 * غير الجاهز: زر معطل بنص صريح — مغلق افتراضيًا، لا زر يفشل بالضغط.
 */

import { startTransition, useActionState, useEffect, useRef, useSyncExternalStore } from "react";
import { CreditCard, Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";
import { pickCampaignParams } from "@/lib/landing/campaign";
import type { LandingCheckout } from "@/lib/landing/checkout";
import { landingCheckoutAction, type LandingCheckoutState } from "@/app/lp/mobile-content/actions";

import { RESUME_CHECKOUT, RESUME_PARAM } from "./anchors";

const noopSubscribe = () => () => {};
const readSearch = () => window.location.search;
const serverSearch = () => "";

/** معاملات الحملة من رابط الصفحة — فارغة في الخادم وأول ترطيب، ثم تكتمل. */
function useCampaign(): Array<[string, string]> {
  const search = useSyncExternalStore(noopSubscribe, readSearch, serverSearch);
  return pickCampaignParams(search);
}

const INITIAL: LandingCheckoutState = { error: null };

const base =
  "inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-6 text-base font-semibold outline-none transition-colors focus-visible:ring-[3px] focus-visible:ring-brand-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-charcoal-950";

export function CheckoutCta({
  checkout,
  label,
  className,
  showIcon = true,
  formClassName,
  errorClassName,
}: {
  checkout: LandingCheckout;
  label: string;
  className?: string;
  showIcon?: boolean;
  /** موضع النموذج في تخطيط الأب (عرض، هامش، flex). */
  formClassName?: string;
  errorClassName?: string;
}) {
  const campaign = useCampaign();
  const [state, formAction, pending] = useActionState(landingCheckoutAction, INITIAL);

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
    <form action={formAction} data-lp-checkout-form className={cn("flex flex-col gap-2", formClassName)}>
      {campaign.map(([key, value]) => (
        <input key={key} type="hidden" name={key} value={value} />
      ))}
      <button
        type="submit"
        disabled={pending}
        aria-busy={pending}
        data-lp-checkout="ready"
        className={cn(
          base,
          "bg-brand-600 text-white shadow-lg shadow-brand-900/30 hover:bg-brand-700 disabled:cursor-wait disabled:opacity-80",
          className,
        )}
      >
        {pending ? (
          <Loader2 aria-hidden="true" className="h-5 w-5 animate-spin" />
        ) : (
          showIcon && <CreditCard aria-hidden="true" className="h-5 w-5" />
        )}
        {label}
      </button>
      {state.error && (
        <p role="alert" className={cn("text-sm leading-relaxed text-brand-200", errorClassName)}>
          {state.error}
        </p>
      )}
    </form>
  );
}

/**
 * استئناف الدفع بعد تسجيل الدخول: صفحة الدخول تعيد الزائر إلى
 * `?resume=checkout`، فيُحذف المعامل من الرابط أولًا (فلا يتكرر عند
 * التحديث) ثم يُستأنف الإجراء نفسه مرة واحدة.
 */
export function CheckoutResume({ checkout }: { checkout: LandingCheckout }) {
  const [state, formAction, pending] = useActionState(landingCheckoutAction, INITIAL);
  const fired = useRef(false);

  useEffect(() => {
    if (fired.current || checkout.status !== "ready") return;
    const url = new URL(window.location.href);
    if (url.searchParams.get(RESUME_PARAM) !== RESUME_CHECKOUT) return;
    fired.current = true;
    url.searchParams.delete(RESUME_PARAM);
    window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
    const form = new FormData();
    for (const [key, value] of pickCampaignParams(url.search)) form.set(key, value);
    startTransition(() => formAction(form));
  }, [checkout.status, formAction]);

  if (!pending && !state.error) return null;
  return (
    <p
      role={state.error ? "alert" : "status"}
      className="mt-3 flex items-center gap-2 text-sm leading-relaxed text-charcoal-200"
    >
      {pending && <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />}
      {pending ? "جارٍ تحويلك إلى صفحة الدفع الآمنة…" : state.error}
    </p>
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
