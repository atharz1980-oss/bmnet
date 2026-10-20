"use client";

/**
 * إجراءات صف إيجار في اللوحة: تسجيل إشعار العميل، وإلغاء الإيجار، وإغلاق
 * الإيجار بعد الاسترجاع — كل بتأكيد على خطوتين. إجراءات التسليم والاسترجاع
 * والتحقق من الهوية وسند الضمان لها نماذج مفصّلة في صفحة تفاصيل الإيجار.
 */

import { useState, useTransition } from "react";
import { Ban, CheckCheck, Send } from "lucide-react";

import {
  cancelEquipmentRentalAction,
  closeEquipmentRentalAction,
  markEquipmentRentalNotifiedAction,
} from "@/app/admin/actions/equipment";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface RentalRowActionsProps {
  rentalId: string;
  status: string;
  notified: boolean;
}

export function RentalRowActions({ rentalId, status, notified }: RentalRowActionsProps) {
  const { toast } = useToast();
  const [confirming, setConfirming] = useState<"cancel" | null>(null);
  const [note, setNote] = useState("");
  const [pending, startTransition] = useTransition();

  const cancellable = status === "pending" || status === "confirmed";
  const closable = status === "returned";

  function run(action: () => Promise<{ ok: boolean; error?: string }>, title: string, description?: string) {
    startTransition(async () => {
      const result = await action();
      if (result.ok) {
        toast({ title, description });
      } else {
        toast({ title: "تعذر التنفيذ", description: result.error, variant: "destructive" });
      }
      setConfirming(null);
      setNote("");
    });
  }

  return (
    <span className="flex flex-col items-start gap-2">
      {confirming === "cancel" ? (
        <>
          <input
            value={note}
            onChange={(event) => setNote(event.target.value)}
            maxLength={1000}
            placeholder="سبب الإلغاء (اختياري)"
            aria-label="سبب الإلغاء"
            className="h-9 w-48 rounded-md border border-charcoal-300 bg-white px-2 text-xs"
          />
          <span className="flex items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant="destructive"
              disabled={pending}
              onClick={() =>
                run(
                  () => cancelEquipmentRentalAction(rentalId, note.trim() || null),
                  "أُلغي الإيجار",
                  "الفترة عادت متاحة. إن كان مدفوعًا فراجع الاسترداد يدويًا.",
                )
              }
            >
              {pending ? "…" : "تأكيد الإلغاء"}
            </Button>
            <Button type="button" variant="ghost" size="sm" disabled={pending} onClick={() => { setConfirming(null); setNote(""); }}>
              تراجع
            </Button>
          </span>
        </>
      ) : (
        <span className="flex flex-wrap items-center gap-1">
          {closable ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={pending}
              onClick={() => run(() => closeEquipmentRentalAction(rentalId), "أُغلق الإيجار")}
            >
              <CheckCheck aria-hidden="true" className="me-1.5 h-4 w-4" />
              إغلاق
            </Button>
          ) : null}
          {!notified && status !== "cancelled" && status !== "expired" ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={pending}
              onClick={() =>
                run(() => markEquipmentRentalNotifiedAction(rentalId), "سُجّل الإشعار", "الإرسال نفسه خارج النظام حاليًا.")
              }
            >
              <Send aria-hidden="true" className="me-1.5 h-4 w-4" />
              سُجّل الإشعار
            </Button>
          ) : null}
          {cancellable ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-danger-700 hover:bg-danger-50 hover:text-danger-700"
              onClick={() => setConfirming("cancel")}
            >
              <Ban aria-hidden="true" className="me-1.5 h-4 w-4" />
              إلغاء
            </Button>
          ) : null}
        </span>
      )}
    </span>
  );
}
