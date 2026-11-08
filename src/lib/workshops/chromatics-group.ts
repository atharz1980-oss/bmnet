import "server-only";

import type { WorkshopReceipt } from "./orders";

/**
 * رابط جروب واتساب لورشة «كروماتيكس — ماستر كلاس إضاءة البورتريه الإبداعية».
 *
 * `server-only`: لا يصل إلى حزم المتصفح، ولا يُقرأ من الرابط أو أي مُدخل.
 * يظهر في صفحة النجاح فقط لدفعة حسمها الخادم «مدفوعة» عبر `loadWorkshopReceipt`.
 * المعلّق والفاشل والمسترد وغير الموجود: لا رابط.
 */
export const CHROMATICS_WHATSAPP_GROUP_URL =
  "https://chat.whatsapp.com/KEx0iC4ck32DJR56xsMctb?s=cl&p=i&mlu=4&ilr=4&iam=2";

/**
 * الرابط لدفعة CHROMATICS مؤكدة — وإلا null.
 */
export function chromaticsGroupLinkFor(
  receipt: Pick<WorkshopReceipt, "outcome" | "kind" | "orderStatus"> | null,
): string | null {
  if (!receipt || receipt.outcome !== "paid") return null;
  if (receipt.kind !== "full" && receipt.kind !== "deposit") return null;
  if (receipt.orderStatus !== "paid" && receipt.orderStatus !== "deposit_paid") return null;
  return CHROMATICS_WHATSAPP_GROUP_URL;
}
