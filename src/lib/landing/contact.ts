/**
 * قنوات التواصل في صفحة الهبوط — من إعدادات التواصل في لوحة الإدارة فقط.
 *
 * `buildWhatsAppHref` يرجع إلى رابط `siteConfig` التجريبي حين يكون رقم
 * الإدارة غير صالح؛ صفحة إعلانية مدفوعة لا تعرض ذلك الرقم التجريبي أبدًا،
 * فالقناة تُخفى بدل أن تُختلق.
 */

import { siteConfig } from "@/data/site";
import type { PublicSettingsView } from "@/data/public-bridge";

type ContactSettings = Pick<PublicSettingsView, "whatsappHref" | "instagram" | "channels">;

/** رسالة واتساب الافتراضية لهذه الصفحة وحدها — بقية الموقع على رسالة الإعدادات العامة. */
export const LANDING_WHATSAPP_MESSAGE = "السلام عليكم، حاب أستفسر عن ورشة صناعة المحتوى بالموبايل وعرض الـ96 ريال.";

/**
 * رقم الإدارة كما هو، مع رسالة الصفحة بدل رسالة الإعدادات العامة: يُعاد بناء
 * الرابط فتحل الرسالة محل `text` القديم ولا تُضاف إليه.
 */
export function landingWhatsappHref(settings: ContactSettings | null | undefined): string | null {
  if (!settings?.channels.whatsapp) return null;
  const href = settings.whatsappHref.trim();
  if (!href || href === siteConfig.whatsappLink) return null;
  const number = /^https:\/\/wa\.me\/(9665\d{8})(\?|$)/.exec(href)?.[1];
  if (!number) return null;
  return `https://wa.me/${number}?text=${encodeURIComponent(LANDING_WHATSAPP_MESSAGE)}`;
}

export function landingInstagramHref(settings: ContactSettings | null | undefined): string | null {
  if (!settings?.channels.instagram) return null;
  const href = settings.instagram.trim();
  if (!/^https:\/\/(www\.)?instagram\.com\/[A-Za-z0-9._-]+\/?$/.test(href)) return null;
  return href;
}
