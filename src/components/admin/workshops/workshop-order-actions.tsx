"use client";

/**
 * أزرار إدارة حجز ورشة: رابط سداد المتبقي، والإلغاء (من الأكاديمية أو من
 * المشترك)، وتسجيل الاسترداد اليدوي، واستخدام الرصيد التدريبي. كل إجراء يحرسه
 * الخادم بصلاحية payments:manage؛ هنا تأكيد ونص فقط.
 */

import { useState, useTransition } from "react";

import {
  cancelByAcademyAction,
  cancelToCreditAction,
  createBalanceLinkAction,
  markRefundedAction,
  redeemCreditAction,
  type BalanceLinkView,
} from "@/app/admin/actions/workshops";

const button =
  "inline-flex h-8 items-center rounded-md border border-border bg-background px-2.5 text-xs font-medium hover:bg-surface-muted disabled:opacity-60";

export function WorkshopOrderActions({
  orderId,
  status,
  refundStatus,
  paidSar,
  canBalanceLink,
}: {
  orderId: string;
  status: string;
  refundStatus: string;
  paidSar: number;
  canBalanceLink: boolean;
}) {
  const [pending, start] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [link, setLink] = useState<BalanceLinkView | null>(null);
  const live = status === "pending" || status === "deposit_paid" || status === "paid";

  const run = (confirmText: string | null, action: () => Promise<{ ok: boolean; error?: string }>, done: string) => {
    if (confirmText && !window.confirm(confirmText)) return;
    start(async () => {
      const result = await action();
      setMessage(result.ok ? done : (result.error ?? "تعذر التنفيذ."));
    });
  };

  return (
    <div className="flex min-w-[220px] flex-col gap-2">
      <div className="flex flex-wrap gap-1.5">
        {canBalanceLink && (
          <button
            type="button"
            className={button}
            disabled={pending}
            onClick={() =>
              run(
                "إنشاء رابط سداد جديد؟ أي رابط سابق لهذا الطلب يتوقف عن العمل.",
                async () => {
                  const result = await createBalanceLinkAction(orderId);
                  if (result.ok) setLink(result.data);
                  return result;
                },
                "أُنشئ الرابط. انسخه أو أرسله يدويًا عبر واتساب.",
              )
            }
          >
            رابط سداد المتبقي
          </button>
        )}
        {live && (
          <>
            <button
              type="button"
              className={button}
              disabled={pending}
              onClick={() =>
                run(
                  `إلغاء من الأكاديمية؟ يُسجَّل استرداد مستحق بكامل المدفوع (${paidSar} ريال) — بلا استرداد تلقائي.`,
                  () => cancelByAcademyAction(orderId),
                  "أُلغي الطلب وسُجّل الاسترداد مستحقًا.",
                )
              }
            >
              إلغاء من الأكاديمية
            </button>
            <button
              type="button"
              className={button}
              disabled={pending}
              onClick={() =>
                run(
                  `إلغاء بطلب المشترك؟ يتحول المدفوع (${paidSar} ريال) إلى رصيد تدريبي صالح سنة ميلادية. لا يمكن التراجع.`,
                  () => cancelToCreditAction(orderId),
                  paidSar > 0 ? "أُلغي الطلب وأُصدر الرصيد التدريبي." : "أُلغي الطلب (لا مدفوع ليتحول رصيدًا).",
                )
              }
            >
              إلغاء من المشترك → رصيد
            </button>
          </>
        )}
        {status === "cancelled_by_academy" && refundStatus === "due" && (
          <button
            type="button"
            className={button}
            disabled={pending}
            onClick={() =>
              run(
                "هل نُفِّذ الاسترداد فعلًا من لوحة ميسّر؟ هذا يسجّله فقط.",
                () => markRefundedAction(orderId),
                "سُجّل الاسترداد منفَّذًا.",
              )
            }
          >
            تسجيل الاسترداد منفَّذًا
          </button>
        )}
      </div>
      {link && (
        <div className="space-y-1.5 rounded-md bg-surface p-2 text-xs">
          <input readOnly value={link.url} dir="ltr" className="w-full rounded border border-border bg-background px-2 py-1" onFocus={(event) => event.currentTarget.select()} />
          <div className="flex gap-1.5">
            <button type="button" className={button} onClick={() => void navigator.clipboard?.writeText(link.url)}>
              نسخ الرابط
            </button>
            <a href={link.whatsappHref} target="_blank" rel="noopener noreferrer" className={button}>
              فتح واتساب للإرسال
            </a>
          </div>
        </div>
      )}
      {message && (
        <p role="status" className="text-xs text-charcoal-600">
          {message}
        </p>
      )}
    </div>
  );
}

export function RedeemCreditForm({ creditId }: { creditId: string }) {
  const [pending, start] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  return (
    <form
      className="flex flex-wrap items-center gap-1.5"
      onSubmit={(event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        const amountSar = form.get("amountSar");
        const reference = form.get("reference");
        if (!window.confirm(`خصم ${amountSar} ريال من الرصيد مقابل «${reference}»؟`)) return;
        start(async () => {
          const result = await redeemCreditAction({ creditId, amountSar, reference });
          setMessage(result.ok ? `تم. الرصيد المتبقي ${result.data.balanceSar} ريال.` : result.error);
        });
      }}
    >
      <input name="amountSar" type="number" min="1" step="0.01" required placeholder="المبلغ" className="h-8 w-20 rounded-md border border-border px-2 text-xs" />
      <input name="reference" required placeholder="مرجع (رقم طلب الدورة)" className="h-8 w-40 rounded-md border border-border px-2 text-xs" />
      <button type="submit" className={button} disabled={pending}>
        استخدام
      </button>
      {message && (
        <p role="status" className="w-full text-xs text-charcoal-600">
          {message}
        </p>
      )}
    </form>
  );
}
