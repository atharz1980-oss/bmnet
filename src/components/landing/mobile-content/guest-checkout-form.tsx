"use client";

/**
 * نموذج Fast Guest Checkout داخل بطاقة السعر: الاسم والجوال والبريد ثم
 * صفحة ميسّر المستضافة. بلا حساب ولا كلمة مرور ولا تأكيد بريد.
 *
 * المتصفح يرسل بيانات التواصل ومعاملات الحملة فقط. الدورة والمبلغ والضريبة
 * والمزود والحالة يقررها الخادم. التحقق هنا تلميح، والمرجع هو الخادم.
 * الحقول مضبوطة الحالة: React يعيد ضبط النماذج بعد كل إرسال، ومن أخطأ في
 * رقمه لا يُعاد إليه نموذج فارغ.
 */

import Link from "next/link";
import { useActionState, useId, useState, useSyncExternalStore } from "react";
import { CreditCard, Loader2, Lock } from "lucide-react";

import { cn } from "@/lib/utils";
import { pickCampaignParams } from "@/lib/landing/campaign";
import { validateGuestContact, type GuestField } from "@/lib/landing/guest-validation";
import { trackInitiateCheckout } from "@/lib/landing/meta-pixel";
import { startGuestCheckoutAction, type GuestCheckoutState } from "@/app/lp/mobile-content/actions";

import { GUEST_FIRST_FIELD_ID, GUEST_FORM_ANCHOR, GUEST_HONEYPOT_FIELD } from "./anchors";

const noopSubscribe = () => () => {};
const readSearch = () => window.location.search;
const serverSearch = () => "";

const INITIAL: GuestCheckoutState = { error: null };

const input =
  "h-12 w-full rounded-xl border bg-white px-4 text-base text-charcoal-950 outline-none transition-colors placeholder:text-charcoal-400 focus-visible:border-brand-600 focus-visible:ring-[3px] focus-visible:ring-brand-600/20 disabled:opacity-70";

export function GuestCheckoutForm({ payLabel }: { payLabel: string }) {
  const id = useId();
  const search = useSyncExternalStore(noopSubscribe, readSearch, serverSearch);
  const campaign = pickCampaignParams(search);
  const [state, formAction, pending] = useActionState(startGuestCheckoutAction, INITIAL);
  const [values, setValues] = useState<Record<GuestField, string>>({ name: "", phone: "", email: "" });

  const fields: Array<{
    key: GuestField;
    label: string;
    type: string;
    autoComplete: string;
    inputMode?: "tel" | "email";
    placeholder?: string;
    ltr?: boolean;
  }> = [
    { key: "name", label: "الاسم", type: "text", autoComplete: "name" },
    { key: "phone", label: "رقم الجوال", type: "tel", autoComplete: "tel", inputMode: "tel", placeholder: "05XXXXXXXX", ltr: true },
    { key: "email", label: "البريد الإلكتروني", type: "email", autoComplete: "email", inputMode: "email", placeholder: "name@example.com", ltr: true },
  ];

  return (
    <form
      id={GUEST_FORM_ANCHOR}
      action={formAction}
      onSubmit={(event) => {
        /* قياس فقط — الإرسال إلى الخادم يمضي كما هو. بيانات صالحة وحقل الفخ فارغ. */
        const trap = new FormData(event.currentTarget).get(GUEST_HONEYPOT_FIELD);
        if (validateGuestContact(values).ok && !trap) trackInitiateCheckout();
      }}
      noValidate
      data-lp-guest-form
      className="scroll-mt-24 space-y-4"
      aria-describedby={`${id}-privacy`}
    >
      {fields.map((field) => {
        const error = state.fieldErrors?.[field.key];
        const inputId = field.key === "name" ? GUEST_FIRST_FIELD_ID : `guest-${field.key}`;
        return (
          <div key={field.key}>
            <label htmlFor={inputId} className="mb-1.5 block text-sm font-semibold text-charcoal-900">
              {field.label}
            </label>
            <input
              id={inputId}
              name={field.key}
              type={field.type}
              autoComplete={field.autoComplete}
              inputMode={field.inputMode}
              placeholder={field.placeholder}
              dir={field.ltr ? "ltr" : undefined}
              required
              value={values[field.key]}
              disabled={pending}
              onChange={(event) => setValues((current) => ({ ...current, [field.key]: event.target.value }))}
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? `${inputId}-error` : undefined}
              className={cn(
                input,
                field.ltr && "text-left",
                error ? "border-brand-600" : "border-charcoal-300",
              )}
            />
            {error && (
              <p id={`${inputId}-error`} className="mt-1.5 text-sm text-brand-700">
                {error}
              </p>
            )}
          </div>
        );
      })}

      {/* حقل فخ: لا يراه الإنسان ولا تقرؤه قارئات الشاشة، ويملؤه البرنامج الآلي. */}
      <div aria-hidden="true" className="sr-only">
        <label htmlFor={`${id}-trap`}>اترك هذا الحقل فارغًا</label>
        <input id={`${id}-trap`} name={GUEST_HONEYPOT_FIELD} type="text" tabIndex={-1} autoComplete="off" defaultValue="" />
      </div>

      {campaign.map(([key, value]) => (
        <input key={key} type="hidden" name={key} value={value} />
      ))}

      {state.error && (
        <p role="alert" className="rounded-lg bg-brand-50 px-3 py-2 text-sm leading-relaxed text-brand-800">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        aria-busy={pending}
        data-lp-checkout="ready"
        className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-brand-600 px-6 py-3 text-center text-base font-semibold leading-snug text-white shadow-lg shadow-brand-900/30 outline-none transition-colors hover:bg-brand-700 focus-visible:ring-[3px] focus-visible:ring-brand-400/70 focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-80"
      >
        {pending ? (
          <Loader2 aria-hidden="true" className="h-5 w-5 animate-spin" />
        ) : (
          <CreditCard aria-hidden="true" className="h-5 w-5" />
        )}
        {pending ? "جارٍ تحويلك إلى صفحة الدفع الآمنة…" : payLabel}
      </button>

      <p id={`${id}-privacy`} className="flex items-start gap-1.5 text-xs leading-relaxed text-charcoal-600">
        <Lock aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 shrink-0 text-charcoal-400" />
        <span>
          بالضغط على «ادفع الآن» توافق على{" "}
          <Link
            href="/policies/privacy"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-charcoal-800 underline underline-offset-2"
          >
            سياسة الخصوصية
          </Link>
          . نستخدم بياناتك لتأكيد حجزك والتواصل معك بشأن الورشة فقط.
        </span>
      </p>
    </form>
  );
}
