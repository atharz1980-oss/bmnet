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

export function landingWhatsappHref(settings: ContactSettings | null | undefined): string | null {
  if (!settings?.channels.whatsapp) return null;
  const href = settings.whatsappHref.trim();
  if (!href || href === siteConfig.whatsappLink) return null;
  if (!/^https:\/\/wa\.me\/9665\d{8}(\?|$)/.test(href)) return null;
  return href;
}

export function landingInstagramHref(settings: ContactSettings | null | undefined): string | null {
  if (!settings?.channels.instagram) return null;
  const href = settings.instagram.trim();
  if (!/^https:\/\/(www\.)?instagram\.com\/[A-Za-z0-9._-]+\/?$/.test(href)) return null;
  return href;
}
