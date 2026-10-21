/**
 * بيت المصور — إبطال مسارات المجتمع
 * -----------------------------------
 * تفاعلات المجتمع (إعجاب، تعليق، حفظ، متابعة، حجب) كانت تُنادي
 * `revalidatePath("/", "layout")` — أي تُبطل **الشجرة العامة كاملة**
 * (الرئيسية، الدورات، المدونة، المساحات، التأجير…) بعد كل نقرة.
 *
 * النتيجة: أول زائر يطّلع على أي صفحة عامة بعد أي تفاعل في المجتمع
 * يدفع كلفة إعادة بناء الصفحة كاملة — وهو ما بدا «بطئًا في تحديث
 * البيانات» وسوء استجابة للموقع كله بسبب فعل صغير في/community.
 *
 * الآن: يُبطل المجتمع وحده. بيانات الموقع العام (CMS) لا تتأثر
 * بتفاعل عضو، فبطلانها بلا فائدة — ويزيد الضغط على الخادم فقط.
 *
 * كما يُبطل كاش بيانات المجتمع (الصفوف الخام للخلاصة) حتى تظهر
 * الإعجابات والتعليقات والمنشورات الجديدة فورًا بدل انتظار مدّة
 * الكاش (20 ثانية).
 */
import { revalidatePath } from "next/cache";

import { invalidateDataCache } from "@/lib/cache/data-cache";

/** يبطل مسارات المجتمع التي يعرض تفاعلات العضو فيها */
export function revalidateCommunity(): void {
  /* الإبطال أولًا: إعادة البناء تقرأ من كاش البيانات. */
  invalidateDataCache("community");
  revalidatePath("/community");
  revalidatePath("/community/photographers");
  revalidatePath("/community/notifications");
  revalidatePath("/community/saved");
  revalidatePath("/community/blocked");
  revalidatePath("/community/profile");
  revalidatePath("/community/u/[username]", "page");
}
