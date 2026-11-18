"use client";

/**
 * نموذج حجز «ورشة البيوتي» — الاسم والجوال والبريد ثم ميسّر.
 */

import Link from "next/link";
import { useActionState, useId, useState, useSyncExternalStore } from "react";
import { CreditCard, Loader2, Lock } from "lucide-react";

import { cn } from "@/lib/utils";
import { pickCampaignParams } from "@/lib/landing/campaign";
import { type GuestField } from "@/lib/landing/guest-validation";
import {
  BEAUTY_CHECKOUT_ENABLED,
  BEAUTY_FORM_ANCHOR,
  BEAUTY_HONEYPOT_FIELD,
  BEAUTY_PRICING,
} from "@/data/landing/beauty";
import { startBeautyCheckoutAction, type BeautyCheckoutState } from "@/app/lp/beauty/actions";

const noopSubscribe = () => () => {};
const readSearch = () => window.location.search;
const serverSearch = () => "";

const INITIAL: BeautyCheckoutState = { error: null };

/* inputs use the beauty.css .lp-input class applied inline; fallback Tailwind classes kept for SSR */
const inputClass =
  "lp-input w-full rounded-xl px-4 py-3 text-base lg:text-sm disabled:opacity-70";

export const BEAUTY_FIRST_FIELD_ID = "beauty-name";

export function BeautyCheckoutForm({
  checkoutEnabled = BEAUTY_CHECKOUT_ENABLED,
}: {
  checkoutEnabled?: boolean;
}) {
  const id = useId();
  const search = useSyncExternalStore(noopSubscribe, readSearch, serverSearch);
  const campaign = pickCampaignParams(search);
  const [state, formAction, pending] = useActionState(startBeautyCheckoutAction, INITIAL);
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
      label: "الاسم الكامل *",
      type: "text",
      autoComplete: "name",
      placeholder: "مثال: سارة العتيبي",
    },
    {
      key: "phone",
      label: "رقم الواتساب / الجوال *",
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
      label: "البريد الإلكتروني *",
      type: "email",
      autoComplete: "email",
      inputMode: "email",
      placeholder: "your@email.com",
      ltr: true,
    },
  ];

  if (!checkoutEnabled) {
    return (
      <div className="rounded-xl bg-surface border border-border px-4 py-5 text-center text-sm text-muted">
        التسجيل الإلكتروني غير متاح حاليًا. تواصل معنا لمعرفة موعد فتح الحجز.
      </div>
    );
  }

  return (
    <form
      id={BEAUTY_FORM_ANCHOR}
      action={formAction}
      noValidate
      data-lp-beauty-form
      className="space-y-4 scroll-mt-24"
    >
      {fields.map((field) => {
        const error = state.fieldErrors?.[field.key];
        const inputId = field.key === "name" ? BEAUTY_FIRST_FIELD_ID : `beauty-${field.key}`;
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
              className={cn("lp-input", field.ltr && "text-left", error && "lp-input-error")}
            />
            {error && (
              <p id={`${inputId}-error`} className="mt-1.5 text-xs font-medium text-red-600">
                {error}
              </p>
            )}
          </div>
        );
      })}

      {/* حقل الفخ للبرامج الآلية */}
      <div aria-hidden="true" className="sr-only">
        <label htmlFor={`${id}-trap`}>اترك هذا الحقل فارغًا</label>
        <input id={`${id}-trap`} name={BEAUTY_HONEYPOT_FIELD} type="text" tabIndex={-1} autoComplete="off" defaultValue="" />
      </div>

      {/* معاملات الحملة */}
      {campaign.map(([key, value]) => (
        <input key={key} type="hidden" name={key} value={value} />
      ))}

      {/* خطأ عام */}
      {state.error && (
        <p role="alert" className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm leading-relaxed text-red-800">
          {state.error}
        </p>
      )}

      {/* زر التسجيل */}
      <button
        type="submit"
        disabled={pending}
        aria-busy={pending}
        data-lp-checkout="ready"
        className="lp-submit-btn"
      >
        {pending ? (
          <Loader2 aria-hidden="true" className="h-5 w-5 animate-spin" />
        ) : (
          <CreditCard aria-hidden="true" className="h-5 w-5" />
        )}
        {pending
          ? "جارٍ تحويلك إلى صفحة الدفع الآمنة…"
          : `تأكيد التسجيل • ${BEAUTY_PRICING.tier1Sar.toLocaleString("ar-SA")} ريال`}
      </button>

      {/* أمان الدفع */}
      <p className="flex items-center justify-center gap-1.5 text-xs text-muted text-center mt-5">
        <Lock aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-muted" />
        <span>دفع إلكتروني آمن عبر SSL.</span>
      </p>
    </form>
  );
}
