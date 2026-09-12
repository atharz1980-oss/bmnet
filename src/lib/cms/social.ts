/**
 * تطبيع روابط منصات التواصل قبل الحفظ.
 * الناتج يوضع في href عام، فلا يُقبل إلا http(s) أو رقم واتساب أو بريد —
 * وهذا ما يمنع javascript: وdata: من الوصول إلى صفحة الزائر.
 */
export function socialHref(platform: string, raw: string): string | null {
  const value = raw.trim();
  if (!value) return null;
  if (platform === "email") {
    const email = value.replace(/^mailto:/i, "");
    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) ? `mailto:${email}` : null;
  }
  if (platform === "whatsapp") {
    const digits = value.replace(/\D/g, "");
    return /^\d{8,15}$/.test(digits) ? `https://wa.me/${digits}` : null;
  }
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : null;
  } catch {
    return null;
  }
}
