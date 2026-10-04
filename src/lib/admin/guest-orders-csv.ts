/**
 * تصدير حجوزات صفحة الهبوط إلى CSV — دالة نقية.
 *
 * الأسماء تأتي من نموذج عام، فخلية تبدأ بـ = أو + أو - أو @ قد تُنفَّذ صيغةً
 * في برامج الجداول (حقن CSV). تُسبق بعلامة اقتباس مفردة فتُقرأ نصًا.
 * لا مرجع مزود ولا رابط دفع في التصدير.
 */

import type { GuestOrderListItem } from "@/lib/payments/guest-orders";
import { formatSaudiMobile } from "@/lib/landing/guest-validation";

export const GUEST_STATUS_LABELS: Record<string, string> = {
  created: "قيد الإنشاء",
  pending: "بانتظار الدفع",
  authorized: "بانتظار الدفع",
  paid: "مدفوع",
  failed: "فشل",
  cancelled: "ملغى",
  expired: "منتهي",
  refunded: "مسترد",
};

export function riyadhDateTime(iso: string | null): string {
  if (!iso) return "";
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Riyadh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })
    .format(new Date(iso))
    .replace(",", "");
}

export function guestOrderFlags(order: Pick<GuestOrderListItem, "duplicateOf" | "failureCode">): string {
  const flags: string[] = [];
  if (order.duplicateOf) flags.push("حجز مكرر — راجع للاسترداد");
  if (order.failureCode === "late_payment") flags.push("دفع متأخر");
  return flags.join("، ");
}

/** خلية آمنة: اقتباس مزدوج دائمًا، ومنع تفسير الصيغ. */
export function csvCell(value: string | number | null | undefined): string {
  let text = value === null || value === undefined ? "" : String(value);
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

const HEADER = [
  "الاسم",
  "الجوال",
  "البريد الإلكتروني",
  "الحالة",
  "المبلغ (ر.س)",
  "تاريخ الدفع (الرياض)",
  "تاريخ الطلب (الرياض)",
  "utm_source",
  "utm_campaign",
  "ملاحظات",
];

export function guestOrdersCsv(orders: GuestOrderListItem[]): string {
  const lines = [HEADER.map(csvCell).join(",")];
  for (const order of orders) {
    lines.push(
      [
        order.customerName,
        /* بلا «+» (لا تحتاج اقتباسًا) وبمسافات (فلا يحذف Excel الأصفار): 966 5X XXX XXXX */
        formatSaudiMobile(order.phone).replace(/^\+/, ""),
        order.email,
        GUEST_STATUS_LABELS[order.status] ?? order.status,
        (order.totalAmount / 100).toFixed(2),
        riyadhDateTime(order.paidAt),
        riyadhDateTime(order.createdAt),
        order.utmSource,
        order.utmCampaign,
        guestOrderFlags(order),
      ]
        .map(csvCell)
        .join(","),
    );
  }
  /* BOM: ليقرأ Excel العربية صحيحة. */
  return `﻿${lines.join("\r\n")}\r\n`;
}
