"use server";

/**
 * تسجيل الطالب في دورة — مجانًا أو بالشراء.
 *
 * ما يصل من المتصفح: معرّف دورة، واسم وسيلة دفع. لا مبلغ ولا عملة ولا
 * حالة ولا «مجانية». كل حقيقة تجارية تُقرأ من القاعدة على الخادم.
 *
 * لا تُفعّل هذه الإجراءات وصولًا مدفوعًا أبدًا: `startCheckoutAction` تنشئ
 * عملية وتُعيد رابط صفحة الدفع، والتفعيل لا يحدث إلا بعد تحقق خادمي من
 * المزود في `verifyAndFinalize`.
 */

import { z } from "zod";

import { communityLoginHref } from "@/lib/community/auth-links";
import { getCommunityViewerId } from "@/lib/community/member";
import { fail, ok, type ActionResult } from "@/lib/cms/result";
import { providerSchema } from "@/lib/payments/settings";
import { enrollFree, loadCourseCommerce, startCheckout } from "@/lib/payments/purchase";

const courseIdSchema = z.string().uuid("معرّف الدورة غير صالح.");
const sessionIdSchema = z.string().uuid("معرّف الموعد غير صالح.").optional();

export type EnrollStep =
  /** يحتاج حسابًا أولًا — `href` صفحة الدخول مع وجهة العودة. */
  | { kind: "sign-in"; href: string }
  /** الوصول مفتوح الآن — `href` أول درس. */
  | { kind: "enrolled"; href: string }
  /** انتقل إلى صفحة الدفع المستضافة. */
  | { kind: "checkout"; href: string };

/** وجهة العودة بعد الدخول: صفحة الدورة نفسها. */
async function courseReturnHref(courseId: string): Promise<string> {
  const course = await loadCourseCommerce(courseId);
  return course ? `/courses/${course.slug}` : "/courses";
}

export async function startFreeEnrollmentAction(
  courseId: unknown,
  sessionId?: unknown,
): Promise<ActionResult<EnrollStep>> {
  const parsed = courseIdSchema.safeParse(courseId);
  if (!parsed.success) return fail("معرّف الدورة غير صالح.");
  const parsedSession = sessionIdSchema.safeParse(sessionId ?? undefined);
  if (!parsedSession.success) return fail("معرّف الموعد غير صالح.");

  const viewerId = await getCommunityViewerId();
  if (!viewerId) {
    return ok({ kind: "sign-in", href: communityLoginHref(await courseReturnHref(parsed.data)) });
  }

  const result = await enrollFree(viewerId, parsed.data, parsedSession.data);
  if (!result.ok) return fail(result.error);
  return ok({ kind: "enrolled", href: result.href });
}

export async function startCheckoutAction(
  courseId: unknown,
  provider: unknown,
  sessionId?: unknown,
): Promise<ActionResult<EnrollStep>> {
  const parsedCourse = courseIdSchema.safeParse(courseId);
  if (!parsedCourse.success) return fail("معرّف الدورة غير صالح.");
  const parsedProvider = providerSchema.safeParse(provider);
  if (!parsedProvider.success) return fail("وسيلة الدفع غير معروفة.");
  const parsedSession = sessionIdSchema.safeParse(sessionId ?? undefined);
  if (!parsedSession.success) return fail("معرّف الموعد غير صالح.");

  const viewerId = await getCommunityViewerId();
  if (!viewerId) {
    return ok({ kind: "sign-in", href: communityLoginHref(await courseReturnHref(parsedCourse.data)) });
  }

  const result = await startCheckout(
    viewerId,
    parsedCourse.data,
    parsedProvider.data,
    parsedSession.data,
  );
  if (!result.ok) return fail(result.error);
  return ok({ kind: "checkout", href: result.checkoutUrl });
}
