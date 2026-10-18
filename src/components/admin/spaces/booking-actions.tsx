"use client";

/**
 * إجراءات صف حجز في اللوحة: إنهاء حجز مؤكد بعد انتهاء الموعد، أو إلغاء
 * حجز بانتظار الدفع أو مؤكد — بتأكيد على خطوتين وملاحظة إدارية اختيارية.
 * الإلغاء يحرّر الوقت فورًا؛ الاسترداد إن وُجد مسؤولية يدوية للمال.
 */

import { useState, useTransition } from "react";
import { Ban, CheckCheck } from "lucide-react";

import { cancelSpaceBookingAction, completeSpaceBookingAction } from "@/app/admin/actions/spaces";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface BookingActionsProps {
  bookingId: string;
  /** pending أو confirmed فقط تقبل إجراءات. */
  status: string;
}

export function BookingActions({ bookingId, status }: BookingActionsProps) {
  const { toast } = useToast();
  const [confirming, setConfirming] = useState<"cancel" | "complete" | null>(null);
  const [note, setNote] = useState("");
  const [pending, startTransition] = useTransition();

  if (status !== "pending" && status !== "confirmed") return null;

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

  if (confirming === null) {
    return (
      <span className="flex items-center gap-1">
        {status === "confirmed" ? (
          <Button type="button" variant="ghost" size="sm" onClick={() => setConfirming("complete")}>
            <CheckCheck aria-hidden="true" className="me-1.5 h-4 w-4" />
            تم الاستخدام
          </Button>
        ) : null}
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
      </span>
    );
  }

  return (
    <span className="flex flex-col items-start gap-2">
      {confirming === "cancel" ? (
        <input
          value={note}
          onChange={(event) => setNote(event.target.value)}
          maxLength={1000}
          placeholder="ملاحظة إدارية (اختياري)"
          aria-label="ملاحظة الإلغاء"
          className="h-9 w-40 rounded-md border border-charcoal-300 bg-white px-2 text-xs"
        />
      ) : null}
      <span className="flex items-center gap-2">
        <Button
          type="button"
          size="sm"
          variant={confirming === "cancel" ? "destructive" : "default"}
          disabled={pending}
          onClick={() => {
            if (confirming === "cancel") {
              run(
                () => cancelSpaceBookingAction(bookingId, note.trim() || null),
                "أُلغي الحجز",
                "الوقت عاد متاحًا للحجز. إن كان قد دُفع مبلغ فراجع الاسترداد يدويًا.",
              );
            } else {
              run(() => completeSpaceBookingAction(bookingId), "سُجّل الحجز كمكتمل");
            }
          }}
        >
          {pending ? "…" : confirming === "cancel" ? "تأكيد الإلغاء" : "تأكيد الإنهاء"}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={pending}
          onClick={() => {
            setConfirming(null);
            setNote("");
          }}
        >
          تراجع
        </Button>
      </span>
    </span>
  );
}
