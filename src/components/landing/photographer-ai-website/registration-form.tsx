"use client";

import Link from "next/link";
import { useActionState, useId, useState, useSyncExternalStore } from "react";
import { CreditCard, Loader2, Lock, Sparkles } from "lucide-react";

import {
  FORM_FIRST_FIELD_ID,
  FORM_HONEYPOT_FIELD,
  REGISTRATION_ANCHOR,
} from "./anchors";
import {
  photographySpecialties,
} from "@/data/landing/photographer-ai-website";
import { COUNTRIES, findCountryByDialCode, type CountryMeta } from "./countries";
import { pickCampaignParams } from "@/lib/landing/campaign";
import { cn } from "@/lib/utils";
import {
  submitAiCourseRegistrationAction,
  type AiRegistrationField,
  type AiRegistrationState,
} from "@/app/lp/photographer-ai-website/actions";

const noopSubscribe = () => () => {};
const readSearch = () => window.location.search;
const serverSearch = () => "";

const INITIAL_STATE: AiRegistrationState = {
  error: null,
  successMessage: null,
  fieldErrors: {},
};

const inputBase =
  "h-12 w-full rounded-xl border bg-charcoal-900/80 px-4 text-base lg:text-sm text-white outline-none transition-colors placeholder:text-charcoal-500 focus-visible:border-amber-400 focus-visible:ring-2 focus-visible:ring-amber-400/20 disabled:opacity-60";

export function RegistrationForm({
  pricingSar,
  isCheckoutReady,
}: {
  pricingSar: number | null;
  isCheckoutReady: boolean;
}) {
  const formId = useId();
  const search = useSyncExternalStore(noopSubscribe, readSearch, serverSearch);
  const campaign = pickCampaignParams(search);
  const [state, formAction, pending] = useActionState(
    submitAiCourseRegistrationAction,
    INITIAL_STATE,
  );

  const [name, setName] = useState("");
  const [selectedCountry, setSelectedCountry] = useState<CountryMeta>(COUNTRIES[0]);
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [terms, setTerms] = useState(false);

  const handlePhoneChange = (val: string) => {
    // إمكانية لصق رقم دولي كامل وتحديد الدولة بشكل صحيح
    const trimmed = val.trim();
    if (trimmed.startsWith("+")) {
      const matched = findCountryByDialCode(trimmed);
      if (matched) {
        setSelectedCountry(matched);
        setPhone(trimmed.slice(matched.dialCode.length).trim());
        return;
      }
    } else if (trimmed.startsWith("00")) {
      const withPlus = `+${trimmed.slice(2)}`;
      const matched = findCountryByDialCode(withPlus);
      if (matched) {
        setSelectedCountry(matched);
        setPhone(withPlus.slice(matched.dialCode.length).trim());
        return;
      }
    }
    setPhone(val);
  };

  const effectivePrice = pricingSar ?? 249;
  const submitButtonLabel = "احجز مقعدك الآن";

  return (
    <form
      id={REGISTRATION_ANCHOR}
      action={formAction}
      noValidate
      className="scroll-mt-24 space-y-5 rounded-2xl border border-white/10 bg-charcoal-950/80 p-6 shadow-2xl backdrop-blur-md sm:p-8"
      aria-describedby={`${formId}-privacy-note`}
    >
      <div className="border-b border-white/10 pb-4">
        <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-300">
          <Sparkles className="h-3.5 w-3.5" />
          <span>حجز مقعد — انطلاق 15 نوفمبر 2026</span>
        </div>
        <h3 className="mt-3 text-xl font-bold text-white sm:text-2xl">
          احجز مقعدك في الدورة ({effectivePrice} ر.س)
        </h3>
        <p className="mt-1 text-sm text-charcoal-400">
          أدخل بياناتك للانتقال إلى صفحة الدفع الآمنة عبر ميسّر وتأكيد مقعدك فورًا.
        </p>
      </div>

      {/* حقل الاسم الكامل */}
      <div>
        <label htmlFor={FORM_FIRST_FIELD_ID} className="mb-1.5 block text-sm font-medium text-charcoal-200">
          الاسم الكامل <span className="text-amber-400">*</span>
        </label>
        <input
          id={FORM_FIRST_FIELD_ID}
          name="name"
          type="text"
          autoComplete="name"
          placeholder="مثل: مشاعل السعد"
          required
          value={name}
          disabled={pending}
          onChange={(e) => setName(e.target.value)}
          aria-invalid={Boolean(state.fieldErrors?.name)}
          aria-describedby={state.fieldErrors?.name ? `${formId}-name-error` : undefined}
          className={cn(
            inputBase,
            state.fieldErrors?.name ? "border-rose-500" : "border-white/10",
          )}
        />
        {state.fieldErrors?.name && (
          <p id={`${formId}-name-error`} className="mt-1.5 text-xs text-rose-400">
            {state.fieldErrors.name}
          </p>
        )}
      </div>

      {/* حقل الجوال الدولي */}
      <div>
        <label htmlFor={`${formId}-phone`} className="mb-1.5 block text-sm font-medium text-charcoal-200">
          رقم الجوال <span className="text-amber-400">*</span>
        </label>
        <div className="flex items-center gap-2" dir="ltr">
          {/* اختيار الدولة والمفتاح الدولي */}
          <div className="relative shrink-0 w-32 sm:w-36">
            <select
              aria-label="مفتاح الدولة"
              disabled={pending}
              value={selectedCountry.code}
              onChange={(e) => {
                const found = COUNTRIES.find((c) => c.code === e.target.value);
                if (found) setSelectedCountry(found);
              }}
              className="h-12 w-full cursor-pointer appearance-none rounded-xl border border-white/10 bg-charcoal-900/90 px-3 text-xs sm:text-sm font-medium text-white outline-none transition-colors hover:border-amber-400/40 focus-visible:border-amber-400 focus-visible:ring-2 focus-visible:ring-amber-400/20 disabled:opacity-60 pe-6"
            >
              {COUNTRIES.map((c) => (
                <option key={c.code} value={c.code} className="bg-charcoal-900 text-white py-1">
                  {c.flag} {c.dialCode} ({c.nameAr})
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute end-2 top-1/2 -translate-y-1/2 text-charcoal-400 text-xs">
              ▼
            </div>
          </div>

          {/* حقل إدخال رقم الهاتف المحلي */}
          <div className="relative flex-1">
            <input
              id={`${formId}-phone`}
              name="phone_input"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              dir="ltr"
              placeholder={selectedCountry.placeholder}
              required
              value={phone}
              disabled={pending}
              onChange={(e) => handlePhoneChange(e.target.value)}
              aria-invalid={Boolean(state.fieldErrors?.phone)}
              aria-describedby={state.fieldErrors?.phone ? `${formId}-phone-error` : undefined}
              className={cn(
                inputBase,
                "text-left font-mono",
                state.fieldErrors?.phone ? "border-rose-500" : "border-white/10",
              )}
            />
          </div>
        </div>

        {/* حقل الخادم المخفي الذي يجمع الرقم بالكامل مع كود الدولة */}
        <input
          type="hidden"
          name="phone"
          value={phone ? (phone.trim().startsWith("+") ? phone.trim() : `${selectedCountry.dialCode}${phone.trim()}`) : ""}
        />
        <input type="hidden" name="country_code" value={selectedCountry.code} />

        {state.fieldErrors?.phone && (
          <p id={`${formId}-phone-error`} className="mt-1.5 text-xs text-rose-400">
            {state.fieldErrors.phone}
          </p>
        )}
      </div>

      {/* حقل البريد الإلكتروني */}
      <div>
        <label htmlFor={`${formId}-email`} className="mb-1.5 block text-sm font-medium text-charcoal-200">
          البريد الإلكتروني <span className="text-amber-400">*</span>
        </label>
        <input
          id={`${formId}-email`}
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          dir="ltr"
          placeholder="name@example.com"
          required
          value={email}
          disabled={pending}
          onChange={(e) => setEmail(e.target.value)}
          aria-invalid={Boolean(state.fieldErrors?.email)}
          aria-describedby={state.fieldErrors?.email ? `${formId}-email-error` : undefined}
          className={cn(
            inputBase,
            "text-left font-mono",
            state.fieldErrors?.email ? "border-rose-500" : "border-white/10",
          )}
        />
        {state.fieldErrors?.email && (
          <p id={`${formId}-email-error`} className="mt-1.5 text-xs text-rose-400">
            {state.fieldErrors.email}
          </p>
        )}
      </div>

      {/* حقل التخصص الفوتوغرافي */}
      <div>
        <label htmlFor={`${formId}-specialty`} className="mb-1.5 block text-sm font-medium text-charcoal-200">
          التخصص الفوتوغرافي <span className="text-amber-400">*</span>
        </label>
        <select
          id={`${formId}-specialty`}
          name="specialty"
          required
          value={specialty}
          disabled={pending}
          onChange={(e) => setSpecialty(e.target.value)}
          aria-invalid={Boolean(state.fieldErrors?.specialty)}
          aria-describedby={state.fieldErrors?.specialty ? `${formId}-specialty-error` : undefined}
          className={cn(
            inputBase,
            "cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20width%3D%2220%22%20height%3D%2220%22%20viewBox%3D%220%200%2020%2020%22%20fill%3D%22none%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cpath%20d%3D%22M5%207.5L10%2012.5L15%207.5%22%20stroke%3D%22%239CA3AF%22%20stroke-width%3D%221.66667%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%2F%3E%3C%2Fsvg%3E')] bg-[position:left_1rem_center] bg-no-repeat pe-4 ps-10",
            state.fieldErrors?.specialty ? "border-rose-500" : "border-white/10",
          )}
        >
          <option value="" disabled className="bg-charcoal-900 text-charcoal-400">
            اختر تخصصك الرئيسي في التصوير…
          </option>
          {photographySpecialties.map((item) => (
            <option key={item.id} value={item.id} className="bg-charcoal-900 text-white">
              {item.label}
            </option>
          ))}
        </select>
        {state.fieldErrors?.specialty && (
          <p id={`${formId}-specialty-error`} className="mt-1.5 text-xs text-rose-400">
            {state.fieldErrors.specialty}
          </p>
        )}
      </div>

      {/* الموافقة على الشروط وسياسة الخصوصية */}
      <div className="pt-1">
        <label className="flex items-start gap-3 cursor-pointer select-none">
          <input
            name="terms"
            type="checkbox"
            checked={terms}
            disabled={pending}
            onChange={(e) => setTerms(e.target.checked)}
            className="mt-1 h-4 w-4 shrink-0 rounded border-white/20 bg-charcoal-900 text-amber-500 accent-amber-500 focus:ring-amber-400"
          />
          <span className="text-xs leading-relaxed text-charcoal-300">
            أوافق على{" "}
            <Link
              href="/policies/terms"
              target="_blank"
              rel="noopener noreferrer"
              className="text-amber-300 underline underline-offset-2 hover:text-amber-200"
            >
              شروط الخدمة
            </Link>{" "}
            و{" "}
            <Link
              href="/policies/privacy"
              target="_blank"
              rel="noopener noreferrer"
              className="text-amber-300 underline underline-offset-2 hover:text-amber-200"
            >
              سياسة الخصوصية
            </Link>
            ، واستخدام بياناتي للتواصل معي بشأن الدورة وتأكيد التسجيل.
          </span>
        </label>
        {state.fieldErrors?.terms && (
          <p className="mt-1.5 text-xs text-rose-400">
            {state.fieldErrors.terms}
          </p>
        )}
      </div>

      {/* حقل فخ لمنع البوتات */}
      <div aria-hidden="true" className="sr-only">
        <label htmlFor={`${formId}-trap`}>اترك هذا الحقل فارغًا</label>
        <input
          id={`${formId}-trap`}
          name={FORM_HONEYPOT_FIELD}
          type="text"
          tabIndex={-1}
          autoComplete="off"
          defaultValue=""
        />
      </div>

      {/* السعر المتوقع لمقارنة الخادم عند الدفع */}
      <input type="hidden" name="expected_price_sar" value={pricingSar ?? ""} />

      {/* حملات التسويق */}
      {campaign.map(([key, value]) => (
        <input key={key} type="hidden" name={key} value={value} />
      ))}

      {/* رسالة الخطأ العامة */}
      {state.error && (
        <div role="alert" className="rounded-xl border border-rose-500/30 bg-rose-950/40 p-3 text-sm text-rose-300">
          {state.error}
        </div>
      )}

      {/* زر الإرسال والحجز */}
      <button
        type="submit"
        disabled={pending}
        aria-busy={pending}
        className="group relative inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#DC2626] px-6 py-3.5 text-base font-bold text-white shadow-lg shadow-red-950/40 outline-none transition-all duration-200 hover:bg-[#B91C1C] hover:scale-[1.01] active:scale-[0.99] focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 focus-visible:ring-offset-charcoal-950 disabled:cursor-wait disabled:opacity-75"
      >
        {pending ? (
          <Loader2 aria-hidden="true" className="h-5 w-5 animate-spin" />
        ) : (
          <CreditCard aria-hidden="true" className="h-5 w-5" />
        )}
        <span>
          {pending
            ? "جارٍ تحويلك إلى صفحة الدفع الآمنة…"
            : submitButtonLabel}
        </span>
      </button>

      <p id={`${formId}-privacy-note`} className="flex items-center justify-center gap-1.5 text-center text-xs text-charcoal-400">
        <Lock aria-hidden="true" className="h-3.5 w-3.5 text-charcoal-500" />
        <span>بياناتك محمية ولن تُشارك مع أي طرف ثالث خارج إطار الدورة.</span>
      </p>
    </form>
  );
}
