"use client";

/** زر سداد المتبقي — يرسل رمز الرابط فقط؛ المبلغ يحسبه الخادم من الطلب. */

import { useActionState } from "react";
import { CreditCard, Loader2 } from "lucide-react";

import { startBalancePaymentAction, type WorkshopCheckoutState } from "@/app/lp/photography-basics/actions";

const INITIAL: WorkshopCheckoutState = { error: null };

export function BalancePaymentForm({ token, label }: { token: string; label: string }) {
  const [state, formAction, pending] = useActionState(startBalancePaymentAction, INITIAL);
  return (
    <form action={formAction} className="space-y-3" data-lp-balance-form>
      <input type="hidden" name="token" value={token} />
      {state.error && (
        <p role="alert" className="rounded-lg bg-brand-50 px-3 py-2 text-sm leading-relaxed text-brand-800">
          {state.error}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        aria-busy={pending}
        className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-brand-600 px-6 py-3 text-base font-semibold text-white outline-none transition-colors hover:bg-brand-700 focus-visible:ring-[3px] focus-visible:ring-brand-400/70 focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-80"
      >
        {pending ? <Loader2 aria-hidden="true" className="h-5 w-5 animate-spin" /> : <CreditCard aria-hidden="true" className="h-5 w-5" />}
        {pending ? "جارٍ تحويلك إلى صفحة الدفع الآمنة…" : label}
      </button>
    </form>
  );
}
