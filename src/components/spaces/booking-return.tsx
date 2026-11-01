"use client";

import { useState } from "react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cancelSpaceBookingReturnAction } from "@/app/spaces/actions";

type ReturnState = "confirm" | "cancelled" | "paid" | "ended" | "invalid";

export function SpaceBookingReturn({
  bookingId,
  returnToken,
  spaceHref,
  checkoutUrl,
  state,
}: {
  bookingId: string;
  returnToken: string;
  spaceHref: string;
  checkoutUrl: string | null;
  state: ReturnState;
}) {
  const [dialogOpen, setDialogOpen] = useState(state === "confirm");
  const cancelled = state === "cancelled";
  const paid = state === "paid";

  return (
    <>
      <section className="mx-auto max-w-lg rounded-2xl border border-charcoal-200 bg-white p-8 text-center shadow-soft">
        <h1 className="text-2xl font-bold text-charcoal-900">
          {cancelled
            ? "تم إلغاء محاولة الدفع"
            : paid
              ? "تم تأكيد الدفع"
              : state === "confirm"
                ? "محاولة الدفع لم تُحسم"
                : state === "ended"
                  ? "لم يكتمل الدفع"
                  : "تعذر التحقق من الحجز"}
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-charcoal-600">
          {cancelled
            ? "أُلغي الحجز المؤقت وعاد الموعد متاحًا. أين ترغب بالذهاب؟"
            : paid
              ? "تم التحقق من الدفع وتأكيد الحجز."
              : state === "confirm"
                ? "يمكنك العودة لإكمال الدفع، أو إلغاء محاولة الحجز وإتاحة الموعد للآخرين."
                : state === "ended"
                  ? "انتهت محاولة الدفع أو أُلغيت من بوابة الدفع، ولم يعد الموعد محجوزًا."
                  : "رابط العودة غير صالح أو انتهت صلاحيته. ارجع إلى صفحة المساحات لاختيار موعد من جديد."}
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          {checkoutUrl && !cancelled && !paid ? (
            <Button asChild>
              <a href={checkoutUrl}>العودة لإكمال الدفع</a>
            </Button>
          ) : null}
          {spaceHref !== "/spaces" ? (
            <Button asChild variant={checkoutUrl && !cancelled && !paid ? "outline" : "default"}>
              <Link href={spaceHref}>العودة إلى المساحة</Link>
            </Button>
          ) : null}
          <Button asChild variant="outline">
            <Link href="/spaces">تصفح المساحات</Link>
          </Button>
          {state === "confirm" && !dialogOpen ? (
            <Button type="button" variant="ghost" onClick={() => setDialogOpen(true)}>
              إلغاء محاولة الدفع
            </Button>
          ) : null}
        </div>
      </section>

      {state === "confirm" ? (
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent showCloseButton={false}>
            <DialogHeader>
              <DialogTitle>هل أنت متأكد من إلغاء الدفع؟</DialogTitle>
              <DialogDescription>
                سيُلغى الحجز المؤقت ويصبح الموعد متاحًا من جديد. لن يُضاف أي طلب إلى السلة.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                لا، سأكمل لاحقًا
              </Button>
              <form action={cancelSpaceBookingReturnAction}>
                <input type="hidden" name="bookingId" value={bookingId} />
                <input type="hidden" name="returnToken" value={returnToken} />
                <Button type="submit" variant="destructive">
                  نعم، ألغِ محاولة الدفع
                </Button>
              </form>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      ) : null}
    </>
  );
}
