/**
 * التحقق من بيانات ضيف صفحة الهبوط — دوال نقية يستعملها الخادم (المرجع)
 * والمتصفح (تلميح فوري فقط). ما يقرره الخادم هو ما يُكتب.
 */

const ARABIC_INDIC = "٠١٢٣٤٥٦٧٨٩";
const PERSIAN = "۰۱۲۳۴۵۶۷۸۹";

/** أرقام عربية-هندية وفارسية إلى لاتينية. */
function toLatinDigits(value: string): string {
  return value.replace(/[٠-٩۰-۹]/g, (digit) => {
    const arabic = ARABIC_INDIC.indexOf(digit);
    return String(arabic >= 0 ? arabic : PERSIAN.indexOf(digit));
  });
}

/**
 * جوال سعودي إلى الصيغة المخزنة `9665XXXXXXXX`، أو null.
 * يقبل: 05XXXXXXXX، 5XXXXXXXX، +9665XXXXXXXX، 9665XXXXXXXX، 009665XXXXXXXX
 * بمسافات أو شرطات أو أقواس، وبأرقام عربية.
 */
export function normalizeSaudiMobile(raw: string): string | null {
  let value = toLatinDigits(String(raw ?? "")).replace(/[\s\-()‎‏]/g, "");
  if (value.startsWith("+")) value = value.slice(1);
  else if (value.startsWith("00")) value = value.slice(2);
  if (!/^\d+$/.test(value)) return null;
  const local = /^05(\d{8})$/.exec(value) ?? /^5(\d{8})$/.exec(value) ?? /^9665(\d{8})$/.exec(value);
  return local ? `9665${local[1]}` : null;
}

/** عرض الجوال المخزن: +966 5X XXX XXXX. */
export function formatSaudiMobile(stored: string): string {
  return /^9665\d{8}$/.test(stored)
    ? `+966 ${stored.slice(3, 5)} ${stored.slice(5, 8)} ${stored.slice(8)}`
    : stored;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function normalizeEmail(raw: string): string | null {
  const value = String(raw ?? "").trim().toLowerCase();
  return value.length <= 254 && EMAIL_RE.test(value) ? value : null;
}

/** بريد مقنّع للعرض: a***@gmail.com */
export function maskEmail(email: string): string {
  const at = email.indexOf("@");
  if (at <= 0) return "***";
  return `${email[0]}***${email.slice(at)}`;
}

export function normalizeName(raw: string): string | null {
  const value = String(raw ?? "").replace(/\s+/g, " ").trim();
  if (value.length < 2 || value.length > 80) return null;
  /* محارف تحكم، وسوم، وروابط — اسم شخص لا يحتاج أيًّا منها. */
  if (/[\u0000-\u001f\u007f<>]/.test(value) || /:\/\/|www\./i.test(value)) return null;
  return value;
}

export interface GuestContact {
  name: string;
  email: string;
  phone: string;
}

export type GuestField = "name" | "phone" | "email";

export const GUEST_FIELD_ERRORS: Record<GuestField, string> = {
  name: "أدخل اسمك الكامل (حرفان على الأقل).",
  phone: "أدخل رقم جوال سعودي صحيح مثل 05XXXXXXXX.",
  email: "أدخل بريدًا إلكترونيًا صحيحًا.",
};

export function validateGuestContact(input: {
  name: unknown;
  phone: unknown;
  email: unknown;
}): { ok: true; contact: GuestContact } | { ok: false; errors: Partial<Record<GuestField, string>> } {
  const name = typeof input.name === "string" ? normalizeName(input.name) : null;
  const phone = typeof input.phone === "string" ? normalizeSaudiMobile(input.phone) : null;
  const email = typeof input.email === "string" ? normalizeEmail(input.email) : null;
  const errors: Partial<Record<GuestField, string>> = {};
  if (!name) errors.name = GUEST_FIELD_ERRORS.name;
  if (!phone) errors.phone = GUEST_FIELD_ERRORS.phone;
  if (!email) errors.email = GUEST_FIELD_ERRORS.email;
  if (!name || !phone || !email) return { ok: false, errors };
  return { ok: true, contact: { name, phone, email } };
}
