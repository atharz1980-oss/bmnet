"use server";

/**
 * «ادفع الآن» في صفحة الهبوط — Fast Guest Checkout بلا حساب.
 *
 * يصل من المتصفح: الاسم والجوال والبريد ومعاملات الحملة وحقل فخ للبرامج
 * الآلية. لا دورة ولا مبلغ ولا مزود ولا حالة — كلها تُقرر على الخادم في
 * `startGuestCheckout`، ثم يُحوَّل الزائر إلى صفحة ميسّر المستضافة.
 */

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { GUEST_HONEYPOT_FIELD } from "@/components/landing/mobile-content/anchors";
import { checkRateLimit, requesterKey } from "@/lib/cms/rate-limit";
import { UTM_KEYS, pickCampaignParams } from "@/lib/landing/campaign";
import { validateGuestContact, type GuestField } from "@/lib/landing/guest-validation";
import { GUEST_ERRORS, startGuestCheckout, type Campaign } from "@/lib/payments/guest-orders";

export interface GuestCheckoutState {
  error: string | null;
  fieldErrors?: Partial<Record<GuestField, string>>;
}

/** محاولات الدفع لكل عنوان خلال النافذة — يكفي لتصحيح خطأ إدخال، ويوقف الإغراق. */
const GUEST_CHECKOUT_LIMIT = 8;
const GUEST_CHECKOUT_WINDOW_MS = 10 * 60 * 1000;

export async function startGuestCheckoutAction(
  _previous: GuestCheckoutState,
  form: FormData,
): Promise<GuestCheckoutState> {
  const limit = checkRateLimit(
    requesterKey(await headers(), "guest-checkout"),
    GUEST_CHECKOUT_LIMIT,
    GUEST_CHECKOUT_WINDOW_MS,
  );
  if (!limit.allowed) {
    const minutes = Math.max(1, Math.ceil(limit.retryAfterSeconds / 60));
    return { error: `محاولات كثيرة خلال وقت قصير. انتظر ${minutes} دقيقة ثم أعد المحاولة.` };
  }

  /* حقل فخ لا يراه إنسان: امتلاؤه = برنامج آلي. رد عام بلا تفاصيل. */
  const trap = form.get(GUEST_HONEYPOT_FIELD);
  if (typeof trap === "string" && trap.trim() !== "") return { error: GUEST_ERRORS.failed };

  const parsed = validateGuestContact({
    name: form.get("name"),
    phone: form.get("phone"),
    email: form.get("email"),
  });
  if (!parsed.ok) return { error: null, fieldErrors: parsed.errors };

  const search = new URLSearchParams();
  for (const key of UTM_KEYS) {
    const value = form.get(key);
    if (typeof value === "string") search.set(key, value);
  }
  const campaign: Campaign = Object.fromEntries(pickCampaignParams(search.toString()));

  const result = await startGuestCheckout(parsed.contact, campaign);
  if (!result.ok) return { error: result.error };

  /* redirect خارج أي try: يعمل برمي استثناء خاص. */
  redirect(result.checkoutUrl);
}
