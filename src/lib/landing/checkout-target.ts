import "server-only";

/**
 * يقرأ حقائق الدورة المربوطة بصفحة الهبوط من المصادر القائمة نفسها التي
 * تستخدمها صفحة الدورة: العرض العام لإيجاد المعرّف، و`loadCourseCommerce`
 * و`checkoutReady` من تدفق الشراء، و`sessionRequirement` للدفعات. لا كتابة
 * ولا حساب مبالغ هنا.
 */

import { loadPublicView } from "@/lib/cms/public-loader";
import { checkoutReady, loadCourseCommerce } from "@/lib/payments/purchase";
import { sessionRequirement } from "@/lib/sessions/availability";

import { decideLandingCheckout, type LandingCheckoutDecision } from "./checkout";

export async function resolveLandingCheckout(target: {
  courseSlug: string | null;
  expectedPriceSar: number;
}): Promise<LandingCheckoutDecision> {
  if (!target.courseSlug) {
    return decideLandingCheckout({ ...target, commerce: null, moyasarReady: false, hasOpenSessions: false });
  }
  try {
    const view = await loadPublicView();
    const course = view?.courses.find((item) => item.slug === target.courseSlug);
    const commerce = course ? await loadCourseCommerce(course.id) : null;
    const moyasarReady = commerce ? await checkoutReady("moyasar") : false;
    const hasOpenSessions = commerce ? (await sessionRequirement(commerce.id)).hasSessions : false;
    return decideLandingCheckout({ ...target, commerce, moyasarReady, hasOpenSessions });
  } catch {
    return { status: "unavailable", reason: "course-not-found" };
  }
}
