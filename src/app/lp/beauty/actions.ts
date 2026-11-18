"use server";

/**
 * حجز «ورشة البيوتي بحلّتها الجديدة» عبر ميسّر.
 *
 * يصل من المتصفح: الاسم والجوال والبريد وحقل فخ.
 * المبلغ والحالة يقررهما الخادم من كتالوج الورش.
 */

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { BEAUTY_HONEYPOT_FIELD, BEAUTY_SLUG } from "@/data/landing/beauty";
import { checkRateLimit, requesterKey } from "@/lib/cms/rate-limit";
import { UTM_KEYS, pickCampaignParams } from "@/lib/landing/campaign";
import { validateGuestContact, type GuestField } from "@/lib/landing/guest-validation";
import type { Campaign } from "@/lib/payments/guest-orders";
import { WORKSHOP_ERRORS, startWorkshopCheckout } from "@/lib/workshops/orders";

export interface BeautyCheckoutState {
  error: string | null;
  fieldErrors?: Partial<Record<GuestField, string>>;
}

const CHECKOUT_LIMIT = 8;
const CHECKOUT_WINDOW_MS = 10 * 60 * 1000;

async function limited(scope: string): Promise<string | null> {
  const limit = checkRateLimit(requesterKey(await headers(), scope), CHECKOUT_LIMIT, CHECKOUT_WINDOW_MS);
  if (limit.allowed) return null;
  const minutes = Math.max(1, Math.ceil(limit.retryAfterSeconds / 60));
  return `محاولات كثيرة خلال وقت قصير. انتظر ${minutes} دقيقة ثم أعد المحاولة.`;
}

export async function startBeautyCheckoutAction(
  _previous: BeautyCheckoutState,
  form: FormData,
): Promise<BeautyCheckoutState> {
  /* تحديد المعدّل */
  const blocked = await limited("beauty-checkout");
  if (blocked) return { error: blocked };

  /* حقل الفخ */
  const trap = form.get(BEAUTY_HONEYPOT_FIELD);
  if (typeof trap === "string" && trap.trim() !== "") return { error: WORKSHOP_ERRORS.failed };

  /* التحقق من بيانات التواصل */
  const parsed = validateGuestContact({
    name: form.get("name"),
    phone: form.get("phone"),
    email: form.get("email"),
  });
  if (!parsed.ok) return { error: null, fieldErrors: parsed.errors };

  /* معاملات الحملة */
  const search = new URLSearchParams();
  for (const key of UTM_KEYS) {
    const value = form.get(key);
    if (typeof value === "string") search.set(key, value);
  }
  const campaign: Campaign = Object.fromEntries(pickCampaignParams(search.toString()));

  /* بدء الدفع — الخادم يحسم المبلغ من الكتالوج */
  const result = await startWorkshopCheckout(BEAUTY_SLUG, parsed.contact, "full", campaign);
  if (!result.ok) return { error: result.error };
  redirect(result.checkoutUrl);
}
