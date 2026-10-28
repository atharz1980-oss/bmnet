import type { Metadata } from "next";

import { PageHeader } from "@/components/shared/page-header";
import { Container } from "@/components/shared/container";
import { CartView } from "@/components/cart/cart-view";
import { loadCartPage } from "@/lib/cart/page-view";

/**
 * /cart — سلة الشراء الموحّدة (دورات + مساحات) للمسجّل والضيف.
 *
 * الصفحة قراءة فقط: تنشئ السلة عند أول كتابة لا عند العرض. الدفع والتعديل
 * والحذف والإلغاء إجراءات خادم مستقلة تتحقق من الملكية من الكوكي/الجلسة.
 */
export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "سلة الشراء",
  robots: { index: false, follow: false },
};

const NOTICES: Record<string, string> = {
  added: "أُضيف إلى سلتك.",
  updated: "حُدّث العنصر.",
  removed: "حُذف العنصر من سلتك.",
  cancelled: "أُلغي الطلب المعلق وتم تحرير مواعيده.",
  open_order: "لديك طلب دفع معلق في سلتك. أكمله أو ألغِه من الأسفل.",
};

export default async function CartPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const view = await loadCartPage();
  const params = await searchParams;
  const noticeKey = Array.isArray(params.notice) ? params.notice[0] : params.notice;
  const notice = noticeKey ? (NOTICES[noticeKey] ?? null) : null;

  return (
    <>
      <PageHeader
        title="سلة الشراء"
        description="راجع اختياراتك — دورات ومساحات — ثم أتمم الدفع مرة واحدة أو عنصرًا عنصرًا."
        breadcrumb={[{ label: "الرئيسية", href: "/" }, { label: "السلة" }]}
      />
      <Container className="py-12 sm:py-16">
        <CartView view={view} notice={notice} />
      </Container>
    </>
  );
}
