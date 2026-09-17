/**
 * الحالة التجارية للدورة ووسمها المعروض — مصدر واحد لكل سطر سعر.
 *
 * الوسم كان يُشتق من السعر وحده (`formatPrice(0)` ⇒ «حسب الطلب»)، فكانت
 * الدورة المجانية تُعرض «حسب الطلب» ثم «مجانية» تحتها في البطاقة نفسها.
 * السعر رقم، وكونها مجانية قرار — والقرار في `is_free` لا في الصفر.
 *
 * هذا الملف نقيّ بلا `server-only` عمدًا: البطاقة والصفحة والرئيسية كلها
 * تستعمله، وتكرار السلّم في كل واجهة هو ما يعيد التناقض.
 */

import { formatPrice } from "@/lib/format";
import type { CourseCommercialState } from "@/types";

/** تصنيف الشركات — طريقه التواصل المباشر لا التسجيل الذاتي. */
export const CORPORATE_CATEGORY = "in-person-corporates";

/**
 * السلّم المعتمد، بالترتيب نفسه الذي يقرر به الخادم (`commercialMode`):
 * الشركات أولًا، ثم علَم المجانية، ثم السعر. ولا شيء بعد ذلك يُخمَّن.
 */
export function courseCommercialState(course: {
  category: string;
  isFree: boolean;
  requestQuote: boolean;
  price: number;
}): CourseCommercialState {
  if (course.requestQuote || course.category === CORPORATE_CATEGORY) return "quote";
  if (course.isFree) return "free";
  if (course.price > 0) return "paid";
  /* سعر صفر بلا علَم مجانية: بيانات ناقصة — تُعامل كطلب سعر لا كهديّة. */
  return "unavailable";
}

export interface CoursePriceDisplay {
  /** السطر الأول: السعر أو «مجانية» أو «حسب الطلب». */
  label: string;
  /** سطر توضيحي تحته، أو null. يظهر حيث تتسع المساحة. */
  note: string | null;
  /** لتلوين الوسم دون إعادة فحص الحالة في الواجهة. */
  tone: "price" | "free" | "quote";
}

/**
 * وسم السعر كما يُعرض للزائر. مخرَج واحد لا مخرجين، فلا يمكن لواجهة أن
 * تجمع «مجانية» مع «حسب الطلب».
 */
export function coursePriceDisplay(course: {
  commercial: CourseCommercialState;
  price: number;
}): CoursePriceDisplay {
  switch (course.commercial) {
    case "free":
      return { label: "مجانية", note: null, tone: "free" };
    case "paid":
      return {
        label: formatPrice(course.price),
        note: "شامل ضريبة القيمة المضافة",
        tone: "price",
      };
    default:
      /* الشركات والناقصة معًا: لا سعر يُعرض، والطريق التواصل. */
      return { label: "حسب الطلب", note: null, tone: "quote" };
  }
}
