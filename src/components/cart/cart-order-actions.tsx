"use client";

/**
 * أزرار صفحة الطلب: استئناف الدفع المعلق أو إلغاؤه.
 * الإلغاء إجراء خادم يتحقق من الملكية، ويعيد إلى `/cart` بعد النجاح.
 */

import Link from "next/link";
import { useActionState } from "react";
import { CreditCard, Loader2, X } from "lucide-react";

import { cancelCartOrderAction, type CartActionState } from "@/app/cart/actions";
import { Button } from "@/components/ui/button";

function Honeypot() {
  return (
    <div aria-hidden="true" className="sr-only">
      <label htmlFor="order-hp">لا تملأ هذا الحقل</label>
      <input id="order-hp" type="text" name="website" tabIndex={-1} autoComplete="off" />
    </div>
  );
}

export function CartOrderActions({
  orderId,
  resumable,
  checkoutUrl,
}: {
  orderId: string;
  resumable: boolean;
  checkoutUrl: string | null;
}) {
  const [state, action, pending] = useActionState<CartActionState, FormData>(cancelCartOrderAction, {
    error: null,
  });

  return (
    <div className="space-y-2">
      {resumable ? (
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
          {checkoutUrl ? (
            <Button asChild className="gap-2">
              <a href={checkoutUrl}>
                <CreditCard aria-hidden="true" className="h-4 w-4" />
                استئناف الدفع
              </a>
            </Button>
          ) : null}
          <form action={action}>
            <Honeypot />
            <input type="hidden" name="orderId" value={orderId} />
            <Button type="submit" variant="outline" disabled={pending} className="w-full gap-2 sm:w-auto">
              {pending ? <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" /> : <X aria-hidden="true" className="h-4 w-4" />}
              إلغاء الطلب
            </Button>
          </form>
        </div>
      ) : null}
      {state.error ? (
        <p role="alert" className="text-center text-xs font-medium text-danger-700">
          {state.error}
        </p>
      ) : null}
      {!resumable && checkoutUrl ? (
        <p className="text-center">
          <Link href={checkoutUrl} className="text-xs text-charcoal-500 underline">
            عرض صفحة الدفع السابقة
          </Link>
        </p>
      ) : null}
    </div>
  );
}
