import "server-only";

/**
 * رابط جروب واتساب لورشة «أساسيات التصوير الفوتوغرافي».
 *
 * `server-only`: لا يصل إلى حزم المتصفح، ولا يُقرأ من الرابط أو أي مُدخل.
 * يظهر في صفحة النجاح فقط لدفعة حسمها الخادم «مدفوعة» بعد سؤال ميسّر
 * (`loadWorkshopReceipt` → `verifyWorkshopPayment`). منفصل تمامًا عن جروب
 * ورشة الجوال ولا يمسه.
 */

import type { WorkshopReceipt } from "./orders";

export const PHOTOGRAPHY_WHATSAPP_GROUP_URL = "https://chat.whatsapp.com/FMGrrSnxG8EGPy5nkLaCxq?mode=gi_t";

/**
 * الرابط لدفعة مؤكدة من نوع «كامل» أو «عربون» على حجز قائم — وإلا null.
 * المعلّق والفاشل والمسترد وغير الموجود والطلب الملغى: لا رابط.
 */
export function photographyGroupLinkFor(
  receipt: Pick<WorkshopReceipt, "outcome" | "kind" | "orderStatus"> | null,
): string | null {
  if (!receipt || receipt.outcome !== "paid") return null;
  if (receipt.kind !== "full" && receipt.kind !== "deposit") return null;
  if (receipt.orderStatus !== "paid" && receipt.orderStatus !== "deposit_paid") return null;
  return PHOTOGRAPHY_WHATSAPP_GROUP_URL;
}
