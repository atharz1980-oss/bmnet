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

/**
 * حارس عرض: يُعاد تطبيقه على القيمة المخزّنة قبل وضعها في href.
 * الكتابة تمر بـsocialHref، لكن الصف قد يُكتب بطريق آخر (عميل خدمة، SQL
 * مباشر، استعادة نسخة). الثقة بالمخزَّن وحدها تجعل صفًا واحدًا فاسدًا رابطًا
 * فعّالًا في كل صفحة.
 */
export function isDisplayableSocialHref(value: string): boolean {
  const href = value.trim();
  if (!href) return false;
  if (href.toLowerCase().startsWith("mailto:")) {
    return /^mailto:[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(href);
  }
  try {
    const url = new URL(href);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}
