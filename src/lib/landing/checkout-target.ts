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

import { decideLandingCheckout, pricingFromCommerce, type LandingCheckoutDecision, type LandingPricing } from "./checkout";

export interface LandingResolved {
  decision: LandingCheckoutDecision;
  pricing: LandingPricing | null;
}

export async function resolveLandingCheckout(target: {
  courseSlug: string | null;
}): Promise<LandingResolved> {
  if (!target.courseSlug) {
    return {
      decision: decideLandingCheckout({
        courseSlug: null,
        expectedPriceSar: Number.NaN,
        commerce: null,
        moyasarReady: false,
        hasOpenSessions: false,
      }),
      pricing: null,
    };
  }
  try {
    const view = await loadPublicView();
    const course = view?.courses.find((item) => item.slug === target.courseSlug);
    let courseId = course?.id;
    if (!courseId && target.courseSlug) {
      try {
        const { getServiceSupabase } = await import("@/lib/supabase/service");
        const { data } = await getServiceSupabase()
          .from("courses")
          .select("id")
          .eq("slug", target.courseSlug)
          .maybeSingle();
        courseId = data?.id;
      } catch {
        courseId = undefined;
      }
    }
    const commerce = courseId ? await loadCourseCommerce(courseId) : null;
    const moyasarReady = commerce ? await checkoutReady("moyasar") : false;
    const hasOpenSessions = commerce ? (await sessionRequirement(commerce.id)).hasSessions : false;
    const pricing = commerce ? pricingFromCommerce(commerce.price, commerce.originalPrice ?? null) : null;
    return {
      decision: decideLandingCheckout({
        courseSlug: target.courseSlug,
        /* بلا سعر صالح في القاعدة تفشل المقارنة فيغلق القرار. */
        expectedPriceSar: pricing?.currentSar ?? Number.NaN,
        commerce,
        moyasarReady,
        hasOpenSessions,
      }),
      pricing,
    };
  } catch {
    return { decision: { status: "unavailable", reason: "course-not-found" }, pricing: null };
  }
}
