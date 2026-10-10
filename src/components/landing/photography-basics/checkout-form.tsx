"use client";

/**
 * نموذج حجز «ورشة أساسيات التصوير»: الاسم والجوال والبريد وخيار الدفع
 * (كامل أو عربون) ثم صفحة ميسّر المستضافة. بلا حساب.
 *
 * المتصفح يرسل خيار الدفع فقط، لا مبلغ: الخادم يحسب المبلغ من إعداد الورشة.
 * التحقق هنا تلميح، والمرجع هو الخادم.
 */

import Link from "next/link";
import { useActionState, useId, useState, useSyncExternalStore } from "react";
import { CreditCard, Loader2, Lock } from "lucide-react";

import { cn } from "@/lib/utils";
import { pickCampaignParams } from "@/lib/landing/campaign";
import { validateGuestContact, type GuestField } from "@/lib/landing/guest-validation";
import { trackInitiateCheckout } from "@/lib/landing/meta-pixel";
import {
  PHOTOGRAPHY_FORM_ANCHOR,
  PHOTOGRAPHY_PIXEL_CONTENT,
  WORKSHOP_HONEYPOT_FIELD,
  photographyPaymentOptions,
  photographyPricing,
} from "@/data/landing/photography-basics";
import { startPhotographyCheckoutAction, type WorkshopCheckoutState } from "@/app/lp/photography-basics/actions";

type Plan = "full" | "deposit";

const noopSubscribe = () => () => {};
const readSearch = () => window.location.search;
const serverSearch = () => "";

const INITIAL: WorkshopCheckoutState = { error: null };

const input =
  "h-12 w-full rounded-xl border bg-white px-4 text-base text-charcoal-950 outline-none transition-colors placeholder:text-charcoal-400 focus-visible:border-brand-600 focus-visible:ring-[3px] focus-visible:ring-brand-600/20 disabled:opacity-70";

export const PHOTOGRAPHY_FIRST_FIELD_ID = "workshop-name";

/** المبلغ الذي سيُدفع الآن لكل خيار — للعرض والقياس فقط؛ الخادم يحسبه مستقلًا. */
export function amountNowSar(plan: Plan): number {
  return plan === "deposit" ? photographyPricing.depositSar : photographyPricing.currentSar;
}

export function PhotographyCheckoutForm() {
  const id = useId();
  const search = useSyncExternalStore(noopSubscribe, readSearch, serverSearch);
  const campaign = pickCampaignParams(search);
  const [state, formAction, pending] = useActionState(startPhotographyCheckoutAction, INITIAL);
  const [values, setValues] = useState<Record<GuestField, string>>({ name: "", phone: "", email: "" });
  const [plan, setPlan] = useState<Plan>("full");

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

  const payLabel = `ادفع الآن ${amountNowSar(plan)} ريال`;

  return (
    <form
      id={PHOTOGRAPHY_FORM_ANCHOR}
      action={formAction}
      onSubmit={(event) => {
        /* قياس فقط — الإرسال يمضي كما هو. القيمة = ما سيُدفع الآن حسب الخيار. */
        const trap = new FormData(event.currentTarget).get(WORKSHOP_HONEYPOT_FIELD);
        if (validateGuestContact(values).ok && !trap) trackInitiateCheckout(PHOTOGRAPHY_PIXEL_CONTENT, amountNowSar(plan));
      }}
      noValidate
      data-lp-workshop-form
      className="scroll-mt-24 space-y-4"
      aria-describedby={`${id}-privacy`}
    >
      <fieldset>
        <legend className="mb-2 block text-sm font-semibold text-charcoal-900">طريقة الدفع</legend>
        <div className="grid gap-3">
          {(["full", "deposit"] as const).map((option) => {
            const info = photographyPaymentOptions[option];
            const checked = plan === option;
            return (
              <label
                key={option}
                data-plan-option={option}
                className={cn(
                  "flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition-colors has-[:focus-visible]:ring-[3px] has-[:focus-visible]:ring-brand-600/20",
                  checked ? "border-brand-600 bg-brand-50/60" : "border-charcoal-200 bg-white hover:bg-surface",
                )}
              >
                <input
                  type="radio"
                  name="plan"
                  value={option}
                  checked={checked}
                  disabled={pending}
                  onChange={() => setPlan(option)}
                  className="mt-1 h-4 w-4 shrink-0 accent-brand-600"
                />
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-baseline justify-between gap-x-3">
                    <span className="text-base font-bold text-charcoal-950">{info.title}</span>
                    <span className="type-price text-base text-charcoal-950">{info.amountLabel}</span>
                  </span>
                  <span className="mt-1 block text-sm leading-relaxed text-charcoal-600">{info.note}</span>
                </span>
              </label>
            );
          })}
        </div>
        {state.fieldErrors?.plan && <p className="mt-1.5 text-sm text-brand-700">{state.fieldErrors.plan}</p>}
      </fieldset>

      {fields.map((field) => {
        const error = state.fieldErrors?.[field.key];
        const inputId = field.key === "name" ? PHOTOGRAPHY_FIRST_FIELD_ID : `workshop-${field.key}`;
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
              className={cn(input, field.ltr && "text-left", error ? "border-brand-600" : "border-charcoal-300")}
            />
            {error && (
              <p id={`${inputId}-error`} className="mt-1.5 text-sm text-brand-700">
                {error}
              </p>
            )}
          </div>
        );
      })}

      <div aria-hidden="true" className="sr-only">
        <label htmlFor={`${id}-trap`}>اترك هذا الحقل فارغًا</label>
        <input id={`${id}-trap`} name={WORKSHOP_HONEYPOT_FIELD} type="text" tabIndex={-1} autoComplete="off" defaultValue="" />
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
        {pending ? <Loader2 aria-hidden="true" className="h-5 w-5 animate-spin" /> : <CreditCard aria-hidden="true" className="h-5 w-5" />}
        {pending ? "جارٍ تحويلك إلى صفحة الدفع الآمنة…" : payLabel}
      </button>

      <p id={`${id}-privacy`} className="flex items-start gap-1.5 text-xs leading-relaxed text-charcoal-600">
        <Lock aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 shrink-0 text-charcoal-400" />
        <span>
          بالضغط على «ادفع الآن» توافق على{" "}
          <Link href="/policies/privacy" target="_blank" rel="noopener noreferrer" className="font-medium text-charcoal-800 underline underline-offset-2">
            سياسة الخصوصية
          </Link>{" "}
          وسياسة الإلغاء الموضحة في هذه الصفحة. نستخدم بياناتك لتأكيد حجزك والتواصل معك بشأن الورشة فقط.
        </span>
      </p>
    </form>
  );
}
