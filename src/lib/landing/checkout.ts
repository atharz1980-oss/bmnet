/**
 * قرار زر الدفع في صفحة الهبوط — يُغلق عند أي شك.
 *
 * صفحة الهبوط لا تملك منطق دفع: الزر الجاهز ينادي `startCheckoutAction`
 * القائم نفسه بمعرّف دورة يقرره الخادم. هذه الدالة تقرر فقط هل يُعرض الزر،
 * وتتحقق أن ما في القاعدة يطابق ما تعد به الصفحة: دورة منشورة مدفوعة،
 * سعرها في القاعدة يساوي السعر المعلن، ميسّر مفعّل وجاهز، وبلا دفعات
 * مفتوحة — الورشة أونلاين بلا اختيار موعد أو مقعد قبل الدفع.
 */

export type LandingCheckoutReason =
  | "unmapped"
  | "course-not-found"
  | "not-paid"
  | "price-mismatch"
  | "provider-not-ready"
  | "requires-session";

/** القرار على الخادم — يحمل معرّف الدورة ولا يخرج إلى المتصفح. */
export type LandingCheckoutDecision =
  | { status: "ready"; courseId: string }
  | { status: "unavailable"; reason: LandingCheckoutReason };

/** ما تحتاجه الواجهة فقط: هل الدفع متاح. */
export type LandingCheckout = { status: "ready" } | { status: "unavailable"; reason: LandingCheckoutReason };

export interface LandingCommerceFacts {
  id: string;
  slug: string;
  mode: string;
  price: string | number;
  providers: string[];
}

export function decideLandingCheckout(input: {
  courseSlug: string | null;
  expectedPriceSar: number;
  commerce: LandingCommerceFacts | null;
  moyasarReady: boolean;
  hasOpenSessions: boolean;
}): LandingCheckoutDecision {
  const { courseSlug, expectedPriceSar, commerce, moyasarReady, hasOpenSessions } = input;
  if (!courseSlug) return { status: "unavailable", reason: "unmapped" };
  if (!commerce || commerce.slug !== courseSlug) return { status: "unavailable", reason: "course-not-found" };
  if (commerce.mode !== "paid") return { status: "unavailable", reason: "not-paid" };
  if (Number(commerce.price) !== expectedPriceSar) return { status: "unavailable", reason: "price-mismatch" };
  if (!commerce.providers.includes("moyasar") || !moyasarReady) {
    return { status: "unavailable", reason: "provider-not-ready" };
  }
  /* دفعة مفتوحة تجعل التدفق القائم يطلب اختيار موعد وحجز مقعد —
     وهذا ما لا تعرضه صفحة الهبوط، فيُغلق بدل أن يفشل عند الضغط. */
  if (hasOpenSessions) return { status: "unavailable", reason: "requires-session" };
  return { status: "ready", courseId: commerce.id };
}

/** يُسقط معرّف الدورة قبل تمرير القرار إلى مكوّنات المتصفح. */
export function toLandingView(decision: LandingCheckoutDecision): LandingCheckout {
  return decision.status === "ready" ? { status: "ready" } : decision;
}
