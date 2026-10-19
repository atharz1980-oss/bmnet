/**
 * بيت المصور — توليد رابط المساحة من اسمها (2026-10-19)
 * ------------------------------------------------------
 * أسماء المساحات عربية وعناوينها إنجليزية: هذا المساعد ينقل الاسم
 * العربي إلى حروف لاتينية صوتية، ثم يطبّعه بمسطرة `sanitizeSlug` نفسها
 * المستخدمة في بقية الوحدات — فيبقى الناتج مطابقًا لقيد الواجهة والخادم
 * (حروف صغيرة وأرقام وشرطة فقط، بلا شرطات طرفية).
 *
 * نقي وبلا اعتماد على الخادم: تستدعيه واجهة الإدارة (عميل).
 */

import { sanitizeSlug } from "@/lib/cms/result";

/** الحروف العربية → مقابلها الصوتي اللاتيني (المتشابهات تُدمج كما تُنطق) */
const ARABIC_LETTERS: Record<string, string> = {
  ا: "a",
  أ: "a",
  إ: "a",
  آ: "a",
  ٱ: "a",
  ب: "b",
  ت: "t",
  ث: "th",
  ج: "j",
  ح: "h",
  خ: "kh",
  د: "d",
  ذ: "dh",
  ر: "r",
  ز: "z",
  س: "s",
  ش: "sh",
  ص: "s",
  ض: "d",
  ط: "t",
  ظ: "z",
  ع: "a",
  غ: "gh",
  ف: "f",
  ق: "q",
  ك: "k",
  ل: "l",
  م: "m",
  ن: "n",
  ه: "h",
  ة: "a",
  و: "w",
  ؤ: "w",
  ي: "y",
  ئ: "y",
  ى: "a",
  ء: "",
};

/** تشكيل وتطويل — تُحذف قبل النقل */
const ARABIC_MARKS = /[\u064B-\u0652\u0670\u0640]/g;

/** أرقام عربية/فارسية — تُحوَّل إلى 0-9 */
const ARABIC_DIGITS = /[\u0660-\u0669\u06F0-\u06F9]/g;

function toLatin(value: string): string {
  return value
    .replace(ARABIC_MARKS, "")
    .replace(ARABIC_DIGITS, (digit) => {
      const code = digit.charCodeAt(0);
      const base = code >= 0x06f0 ? 0x06f0 : 0x0660;
      return String(code - base);
    })
    /* كل ما ليس ASCII يُنقل من الخريطة أو يسقط (علامات ترقيم عربية...) */
    .replace(/[^\u0000-\u007F]/g, (letter) => ARABIC_LETTERS[letter] ?? "");
}

/**
 * رابط مقترح من اسم المساحة:
 * «استوديو كروما خضراء» → `astwdyw-krwma-khdra`
 * الفارغ (اسم بلا حروف/أرقام) يعني أن على الواجهة التنبيه بلا تغيير.
 */
export function slugFromName(name: string, maxLength = 80): string {
  const latin = toLatin(name.trim().toLowerCase());
  return sanitizeSlug(latin).slice(0, maxLength).replace(/-+$/g, "");
}
