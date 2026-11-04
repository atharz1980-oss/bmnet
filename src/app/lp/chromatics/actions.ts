"use server";

/**
 * حجز «ورشة كروماتيكس — ماستر كلاس إضاءة البورتريه الإبداعية» عبر ميسّر.
 *
 * يصل من المتصفح: الاسم والجوال والبريد ومستوى الخبرة ومعاملات الحملة وحقل
 * فخ. المبلغ (199 SAR) والحالة يقررهما الخادم من كتالوج الورش — لا المتصفح.
 * لا مسار عربون: كروماتيكس بدفع كامل فقط.
 *
 * مستوى الخبرة (service) يُحمَل في utm_content لأن workshop_orders لا يملك
 * حقلًا مستقلًا له، وهذا يوفّر أعمال ترحيل قاعدة البيانات.
 */

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { CHROMATICS_HONEYPOT_FIELD, CHROMATICS_SLUG } from "@/data/landing/chromatics";
import { checkRateLimit, requesterKey } from "@/lib/cms/rate-limit";
import { UTM_KEYS, pickCampaignParams } from "@/lib/landing/campaign";
import { validateGuestContact, type GuestField } from "@/lib/landing/guest-validation";
import type { Campaign } from "@/lib/payments/guest-orders";
import { WORKSHOP_ERRORS, startWorkshopCheckout } from "@/lib/workshops/orders";

export interface ChromaticsCheckoutState {
  error: string | null;
  fieldErrors?: Partial<Record<GuestField | "service", string>>;
}

const CHECKOUT_LIMIT = 8;
const CHECKOUT_WINDOW_MS = 10 * 60 * 1000;

async function limited(scope: string): Promise<string | null> {
  const limit = checkRateLimit(requesterKey(await headers(), scope), CHECKOUT_LIMIT, CHECKOUT_WINDOW_MS);
  if (limit.allowed) return null;
  const minutes = Math.max(1, Math.ceil(limit.retryAfterSeconds / 60));
  return `محاولات كثيرة خلال وقت قصير. انتظر ${minutes} دقيقة ثم أعد المحاولة.`;
}

/** خيارات مستوى الخبرة المقبولة — يتطابق مع قيم <select> في النموذج. */
const VALID_SERVICE_LEVELS = new Set([
  "Portrait Photographer",
  "Studio Owner",
  "Visual Artist / Director",
  "Visual Artist / Creative Director",
  "Enthusiast Learner",
  "Enthusiast / Beginner",
]);

export async function startChromaticsCheckoutAction(
  _previous: ChromaticsCheckoutState,
  form: FormData,
): Promise<ChromaticsCheckoutState> {
  /* تحديد المعدّل */
  const blocked = await limited("chromatics-checkout");
  if (blocked) return { error: blocked };

  /* حقل الفخ */
  const trap = form.get(CHROMATICS_HONEYPOT_FIELD);
  if (typeof trap === "string" && trap.trim() !== "") return { error: WORKSHOP_ERRORS.failed };

  /* التحقق من بيانات التواصل */
  const parsed = validateGuestContact({
    name: form.get("name"),
    phone: form.get("phone"),
    email: form.get("email"),
  });
  if (!parsed.ok) return { error: null, fieldErrors: parsed.errors };

  /* التحقق من مستوى الخبرة */
  const rawService = form.get("service");
  const service = typeof rawService === "string" ? rawService.trim() : "";
  if (!VALID_SERVICE_LEVELS.has(service)) {
    return { error: null, fieldErrors: { service: "اختر مستوى الخبرة." } };
  }

  /* معاملات الحملة + حمل مستوى الخبرة في utm_content (لا ترحيل قاعدة بيانات) */
  const search = new URLSearchParams();
  for (const key of UTM_KEYS) {
    const value = form.get(key);
    if (typeof value === "string") search.set(key, value);
  }
  /* utm_content من النموذج يُكتب فقط إن لم يكن موجودًا — مستوى الخبرة يُضاف */
  if (!search.has("utm_content")) {
    search.set("utm_content", service.slice(0, 200));
  }
  const campaign: Campaign = Object.fromEntries(pickCampaignParams(search.toString()));

  /* بدء الدفع — الخادم يحسم المبلغ من الكتالوج */
  const result = await startWorkshopCheckout(CHROMATICS_SLUG, parsed.contact, "full", campaign);
  if (!result.ok) return { error: result.error };
  redirect(result.checkoutUrl);
}
