import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Container } from "@/components/shared/container";
import { cancelSpaceBookingCheckout } from "@/lib/spaces/bookings";

export const dynamic = "force-dynamic";
export const metadata = { title: "العودة من الدفع", robots: { index: false, follow: false } };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function SpaceBookingReturnPage({
  searchParams,
}: {
  searchParams: Promise<{ b?: string; t?: string }>;
}) {
  const { b, t } = await searchParams;
  const result =
    b && t && UUID.test(b) && UUID.test(t) ? await cancelSpaceBookingCheckout(b, t) : null;

  return (
    <Container className="py-16 sm:py-24">
      <div className="mx-auto max-w-lg rounded-2xl border border-charcoal-200 bg-white p-8 text-center shadow-soft">
        <h1 className="text-2xl font-bold text-charcoal-900">
          {result?.cancelled ? "تم إلغاء محاولة الدفع" : result?.spaceSlug ? "تم الدفع" : "تعذر التحقق من الحجز"}
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-charcoal-600">
          {result?.cancelled
            ? "أُلغي حجز الموعد وعاد الوقت متاحًا. يمكنك اختيار موعد آخر وإتمام الدفع مباشرة."
            : result?.spaceSlug
              ? "تم التحقق من الدفع؛ لا يلزم إجراء آخر."
              : "الرابط غير صالح. ارجع إلى صفحة المساحات لاختيار موعد من جديد."}
        </p>
        <div className="mt-6 flex justify-center gap-3">
          {result?.spaceSlug ? (
            <Button asChild>
              <Link href={`/spaces/${result.spaceSlug}`}>العودة إلى المساحة</Link>
            </Button>
          ) : null}
          <Button asChild variant="outline">
            <Link href="/spaces">تصفح المساحات</Link>
          </Button>
        </div>
      </div>
    </Container>
  );
}
