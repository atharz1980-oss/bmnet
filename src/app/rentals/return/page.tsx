import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Container } from "@/components/shared/container";
import { cancelEquipmentRentalCheckout } from "@/lib/rentals/bookings";

export const dynamic = "force-dynamic";
export const metadata = { title: "العودة من الدفع", robots: { index: false, follow: false } };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function EquipmentRentalReturnPage({
  searchParams,
}: {
  searchParams: Promise<{ r?: string; t?: string }>;
}) {
  const { r, t } = await searchParams;
  const result =
    r && t && UUID.test(r) && UUID.test(t) ? await cancelEquipmentRentalCheckout(r, t) : null;

  return (
    <Container className="py-16 sm:py-24">
      <div className="mx-auto max-w-lg rounded-2xl border border-charcoal-200 bg-white p-8 text-center shadow-soft">
        <h1 className="text-2xl font-bold text-charcoal-900">
          {result?.cancelled ? "تم إلغاء محاولة الدفع" : result?.itemSlug ? "تم الدفع" : "تعذر التحقق من الطلب"}
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-charcoal-600">
          {result?.cancelled
            ? result.cartSaved
              ? "أُلغيت محاولة الإيجار وعادت المعدة متاحة. حفظنا الاختيار في سلتك لتعديله أو إكمال الدفع."
              : "أُلغيت محاولة الإيجار وعادت المعدة متاحة، لكن تعذر حفظ الاختيار في السلة. افتح صفحة المعدة لإعادة المحاولة."
            : result?.itemSlug
              ? "تم التحقق من الدفع؛ لا يلزم إجراء آخر."
              : "الرابط غير صالح. ارجع إلى صفحة المعدات لاختيار معدة من جديد."}
        </p>
        <div className="mt-6 flex justify-center gap-3">
          {result?.itemSlug ? (
            <Button asChild>
              <Link href={`/rentals/${result.itemSlug}#booking`}>العودة إلى المعدة</Link>
            </Button>
          ) : null}
          <Button asChild variant="outline">
            <Link href="/rentals">تصفح المعدات</Link>
          </Button>
        </div>
      </div>
    </Container>
  );
}
