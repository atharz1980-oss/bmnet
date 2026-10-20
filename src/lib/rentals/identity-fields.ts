/**
 * تحقق حقول الهوية — دوال نقية بلا أي اعتماد خادمي (بلا node:crypto).
 * ----------------------------------------------------------------
 * تُستورد في نموذج المستأجر (مكوّن عميل) وفي الخادم معًا، فيتطابق ما يفحصه
 * المتصفح لحظيًا مع ما يفرضه الخادم. التحقق شكلي محلي (خانة تحقق Luhn +
 * سريان التاريخ) و**لا** يدّعي تحققًا حكوميًا أو تكاملًا مع نفاذ.
 */

/** رقم هوية/إقامة سعودي بعشرة أرقام وخانة تحقق صحيحة. */
export function isValidSaudiNationalId(value: unknown): boolean {
  const id = String(value ?? "").replace(/[\s-]/g, "");
  if (!/^[12]\d{9}$/.test(id)) return false;

  /* خوارزمية Luhn: كل رقم في موضع فردي (من اليسار) يُضاعف، ثم تُجمع
     أرقام الناتج. المجموع الكلي يجب أن يقبل القسمة على 10. */
  let total = 0;
  for (let index = 0; index < id.length; index += 1) {
    let digit = Number(id[index]);
    if (index % 2 === 0) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    total += digit;
  }
  return total % 10 === 0;
}

/** تاريخ ISO صالح فعلًا (لا 2026-02-30). */
export function isIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

/** هل تغطي الهوية آخر يوم إيجار؟ (تاريخ الانتهاء نفسه صالح). */
export function identityCoversRental(expiry: string, endDate: string): boolean {
  return isIsoDate(expiry) && isIsoDate(endDate) && expiry >= endDate;
}

/** عرض آمن للهوية: 1********9. */
export function maskNationalId(value: string): string {
  const id = String(value ?? "");
  if (id.length !== 10) return "**********";
  return `${id[0]}********${id[9]}`;
}

/**
 * تصنيف الرقم (مواطن/مقيم) للتوثيق الداخلي فقط — لا يُخزَّن ولا يُعرض،
 * ولا يترتب عليه أي قرار تحقق.
 */
export function nationalIdKind(value: string): "citizen" | "resident" | "unknown" {
  if (!/^\d{10}$/.test(value)) return "unknown";
  if (value.startsWith("1")) return "citizen";
  if (value.startsWith("2")) return "resident";
  return "unknown";
}
