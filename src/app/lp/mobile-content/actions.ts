"use server";

/**
 * زر «ادفع الآن» في صفحة الهبوط — غلاف رفيع حول `startCheckoutAction`.
 *
 * لا منطق دفع هنا: لا مبلغ ولا مزود يُحسب ولا نداء لميسّر. ما يضيفه الغلاف:
 *   1. معرّف الدورة من إعداد الخادم لا من المتصفح.
 *   2. إعادة التحقق لحظة الضغط (السعر في القاعدة = المعلن، مدفوعة، ميسّر
 *      جاهز، بلا دفعات) — الصفحة قد تكون مخزّنة قبل تعديل في الإدارة.
 *   3. العودة إلى صفحة الهبوط بعد الدخول، مع معاملات الحملة، لاستئناف الدفع.
 * ثم يمضي التدفق القائم كما هو: صفحة ميسّر المستضافة ← العودة والإشعار.
 */

import { redirect } from "next/navigation";

import { startCheckoutAction } from "@/app/courses/actions/enrollment";
import { LANDING_PATH, RESUME_CHECKOUT, RESUME_PARAM } from "@/components/landing/mobile-content/anchors";
import { landingCheckoutTarget } from "@/data/landing/mobile-content";
import { communityLoginHref } from "@/lib/community/auth-links";
import { UTM_KEYS, pickCampaignParams, withCampaignParams } from "@/lib/landing/campaign";
import { resolveLandingCheckout } from "@/lib/landing/checkout-target";

export interface LandingCheckoutState {
  error: string | null;
}

const UNAVAILABLE = "الدفع الإلكتروني لهذه الورشة غير متاح حاليًا.";

export async function landingCheckoutAction(
  _previous: LandingCheckoutState,
  form: FormData,
): Promise<LandingCheckoutState> {
  const search = new URLSearchParams();
  for (const key of UTM_KEYS) {
    const value = form.get(key);
    if (typeof value === "string") search.set(key, value);
  }
  const campaign = pickCampaignParams(search.toString());

  const decision = await resolveLandingCheckout(landingCheckoutTarget);
  if (decision.status !== "ready") return { error: UNAVAILABLE };

  const result = await startCheckoutAction(decision.courseId, "moyasar");
  if (!result.ok) return { error: result.error };

  /* redirect خارج أي try: يعمل برمي استثناء خاص. */
  if (result.data.kind === "checkout") redirect(result.data.href);
  if (result.data.kind === "sign-in") {
    const resume = withCampaignParams(`${LANDING_PATH}?${RESUME_PARAM}=${RESUME_CHECKOUT}`, campaign);
    redirect(communityLoginHref(resume));
  }
  return { error: "تعذر بدء عملية الدفع. حاول مرة أخرى." };
}
