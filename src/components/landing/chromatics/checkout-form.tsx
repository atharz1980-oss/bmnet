"use client";

/**
 * نموذج حجز «كروماتيكس» — الاسم والجوال والبريد ومستوى الخبرة ثم ميسّر.
 *
 * المتصفح لا يرسل مبلغًا: الخادم يحسبه من كتالوج الورش (199 SAR شامل الضريبة).
 * التحقق هنا تلميح مرئي فوري، والمرجع هو الخادم.
 * لا مسار عربون: كروماتيكس بدفع كامل فقط.
 */

import Link from "next/link";
import { useActionState, useId, useState, useSyncExternalStore } from "react";
import { CreditCard, Loader2, Lock } from "lucide-react";

import { cn } from "@/lib/utils";
import { pickCampaignParams } from "@/lib/landing/campaign";
import { type GuestField } from "@/lib/landing/guest-validation";
import {
  CHROMATICS_CHECKOUT_ENABLED,
  CHROMATICS_FORM_ANCHOR,
  CHROMATICS_HONEYPOT_FIELD,
  CHROMATICS_PRICING,
} from "@/data/landing/chromatics";
import { startChromaticsCheckoutAction, type ChromaticsCheckoutState } from "@/app/lp/chromatics/actions";

const noopSubscribe = () => () => {};
const readSearch = () => window.location.search;
const serverSearch = () => "";

const INITIAL: ChromaticsCheckoutState = { error: null };

const inputClass =
  "w-full bg-white/[0.05] border border-white/15 rounded-xl px-4 py-3 text-white placeholder:text-neutral-500 focus:outline-none focus:border-[#E65A2E] focus:ring-2 focus:ring-[#E65A2E]/25 transition-colors text-base lg:text-sm disabled:opacity-70";

const SERVICE_OPTIONS = [
  { value: "Portrait Photographer", label: "Portrait Photographer" },
  { value: "Studio Owner", label: "Studio Owner" },
  { value: "Visual Artist / Director", label: "Visual Artist / Creative Director" },
  { value: "Enthusiast Learner", label: "Enthusiast / Beginner" },
] as const;

export const CHROMATICS_FIRST_FIELD_ID = "chromatics-name";

export function ChromaticsCheckoutForm({
  checkoutEnabled = CHROMATICS_CHECKOUT_ENABLED,
}: {
  checkoutEnabled?: boolean;
}) {
  const id = useId();
  const search = useSyncExternalStore(noopSubscribe, readSearch, serverSearch);
  const campaign = pickCampaignParams(search);
  const [state, formAction, pending] = useActionState(startChromaticsCheckoutAction, INITIAL);
  const [values, setValues] = useState<Record<GuestField, string>>({ name: "", phone: "", email: "" });

  const fields: Array<{
    key: GuestField;
    label: string;
    type: string;
    autoComplete: string;
    inputMode?: "tel" | "email";
    placeholder?: string;
    pattern?: string;
    title?: string;
    ltr?: boolean;
  }> = [
    {
      key: "name",
      label: "Full Name *",
      type: "text",
      autoComplete: "name",
      placeholder: "e.g. Sarah Al-Otaibi",
    },
    {
      key: "phone",
      label: "WhatsApp / Phone Number *",
      type: "tel",
      autoComplete: "tel",
      inputMode: "tel",
      placeholder: "+966 5X XXX XXXX",
      pattern: "(\\+?966|0)?5[0-9]{8}|[0-9\\s+]{9,16}",
      title: "05XXXXXXXX or +9665XXXXXXXX",
      ltr: true,
    },
    {
      key: "email",
      label: "Email Address *",
      type: "email",
      autoComplete: "email",
      inputMode: "email",
      placeholder: "your@email.com",
      ltr: true,
    },
  ];

  if (!checkoutEnabled) {
    return (
      <div className="rounded-xl bg-white/[0.04] border border-white/10 px-4 py-5 text-center text-sm text-neutral-400">
        التسجيل الإلكتروني غير متاح حاليًا لهذه الورشة. تواصل معنا لمعرفة موعد فتح الحجز.
      </div>
    );
  }

  return (
    <form
      id={CHROMATICS_FORM_ANCHOR}
      action={formAction}
      noValidate
      data-lp-chromatics-form
      className="space-y-4 scroll-mt-24"
    >
      {fields.map((field) => {
        const error = state.fieldErrors?.[field.key];
        const inputId = field.key === "name" ? CHROMATICS_FIRST_FIELD_ID : `chromatics-${field.key}`;
        return (
          <div key={field.key}>
            <label
              htmlFor={inputId}
              className="block text-xs font-semibold uppercase tracking-wider text-dark mb-1.5"
            >
              {field.label}
            </label>
            <input
              id={inputId}
              name={field.key}
              type={field.type}
              autoComplete={field.autoComplete}
              inputMode={field.inputMode}
              placeholder={field.placeholder}
              pattern={field.pattern}
              title={field.title}
              dir={field.ltr ? "ltr" : undefined}
              required
              value={values[field.key]}
              disabled={pending}
              onChange={(e) => setValues((cur) => ({ ...cur, [field.key]: e.target.value }))}
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? `${inputId}-error` : undefined}
              className={cn(inputClass, field.ltr && "text-left", error && "border-red-500")}
            />
            {error && (
              <p id={`${inputId}-error`} className="mt-1.5 text-xs font-medium text-red-600">
                {error}
              </p>
            )}
          </div>
        );
      })}

      {/* مستوى الخبرة */}
      <div>
        <label
          htmlFor={`${id}-service`}
          className="block text-xs font-semibold uppercase tracking-wider text-dark mb-1.5"
        >
          Your Primary Experience Level
        </label>
        <select
          id={`${id}-service`}
          name="service"
          disabled={pending}
          defaultValue="Portrait Photographer"
          aria-invalid={state.fieldErrors?.service ? true : undefined}
          aria-describedby={state.fieldErrors?.service ? `${id}-service-error` : undefined}
          className={cn(
            inputClass,
            "cursor-pointer text-left",
            state.fieldErrors?.service && "border-red-500",
          )}
        >
          {SERVICE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        {state.fieldErrors?.service && (
          <p id={`${id}-service-error`} className="mt-1.5 text-xs font-medium text-red-600">
            {state.fieldErrors.service}
          </p>
        )}
      </div>

      {/* حقل الفخ للبرامج الآلية */}
      <div aria-hidden="true" className="sr-only">
        <label htmlFor={`${id}-trap`}>اترك هذا الحقل فارغًا</label>
        <input id={`${id}-trap`} name={CHROMATICS_HONEYPOT_FIELD} type="text" tabIndex={-1} autoComplete="off" defaultValue="" />
      </div>

      {/* معاملات الحملة */}
      {campaign.map(([key, value]) => (
        <input key={key} type="hidden" name={key} value={value} />
      ))}

      {/* خطأ عام إن وجد */}
      {state.error && (
        <p role="alert" className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm leading-relaxed text-red-800">
          {state.error}
        </p>
      )}

      {/* زر تأكيد الحجز والانتقال لبوابة ميسّر */}
      <button
        type="submit"
        disabled={pending}
        aria-busy={pending}
        data-lp-checkout="ready"
        className="inline-flex min-h-[56px] w-full items-center justify-center gap-2 rounded-xl bg-[#E65A2E] hover:bg-[#C84E27] px-6 py-4 text-center text-lg font-bold leading-snug text-white shadow-lg shadow-[#E65A2E]/20 outline-none transition-all hover:brightness-95 focus-visible:ring-[3px] focus-visible:ring-[#E65A2E]/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[#15151A] disabled:cursor-wait disabled:opacity-80 mt-2"
      >
        {pending ? (
          <Loader2 aria-hidden="true" className="h-5 w-5 animate-spin" />
        ) : (
          <CreditCard aria-hidden="true" className="h-5 w-5" />
        )}
        {pending
          ? "جارٍ تحويلك إلى صفحة الدفع الآمنة…"
          : `Confirm Registration • ${CHROMATICS_PRICING.tier1Sar} SAR`}
      </button>

      {/* إشعار أمان الدفع عبر SSL */}
      <p className="flex items-center justify-center gap-1.5 text-xs text-neutral-400 text-center mt-5">
        <Lock aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-neutral-400" />
        <span>Secure SSL checkout. Zoom links delivered instantly to email.</span>
      </p>
    </form>
  );
}
