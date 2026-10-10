"use server";

/**
 * حجز «ورشة أساسيات التصوير» وسداد المتبقي — بلا حساب.
 *
 * يصل من المتصفح: الاسم والجوال والبريد وخيار الدفع (كامل/عربون) ومعاملات
 * الحملة وحقل فخ. المبلغ والحالة يقررهما الخادم في `startWorkshopCheckout`.
 * سداد المتبقي يصل برمز الرابط فقط، والمبلغ = الإجمالي ناقص المدفوع المؤكد.
 */

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { PHOTOGRAPHY_BASICS_SLUG, WORKSHOP_HONEYPOT_FIELD } from "@/data/landing/photography-basics";
import { checkRateLimit, requesterKey } from "@/lib/cms/rate-limit";
import { UTM_KEYS, pickCampaignParams } from "@/lib/landing/campaign";
import { validateGuestContact, type GuestField } from "@/lib/landing/guest-validation";
import type { Campaign } from "@/lib/payments/guest-orders";
import { WORKSHOP_ERRORS, startBalancePayment, startWorkshopCheckout } from "@/lib/workshops/orders";

export interface WorkshopCheckoutState {
  error: string | null;
  fieldErrors?: Partial<Record<GuestField | "plan", string>>;
}

const CHECKOUT_LIMIT = 8;
const CHECKOUT_WINDOW_MS = 10 * 60 * 1000;

async function limited(scope: string): Promise<string | null> {
  const limit = checkRateLimit(requesterKey(await headers(), scope), CHECKOUT_LIMIT, CHECKOUT_WINDOW_MS);
  if (limit.allowed) return null;
  const minutes = Math.max(1, Math.ceil(limit.retryAfterSeconds / 60));
  return `محاولات كثيرة خلال وقت قصير. انتظر ${minutes} دقيقة ثم أعد المحاولة.`;
}

export async function startPhotographyCheckoutAction(
  _previous: WorkshopCheckoutState,
  form: FormData,
): Promise<WorkshopCheckoutState> {
  const blocked = await limited("workshop-checkout");
  if (blocked) return { error: blocked };

  const trap = form.get(WORKSHOP_HONEYPOT_FIELD);
  if (typeof trap === "string" && trap.trim() !== "") return { error: WORKSHOP_ERRORS.failed };

  const plan = form.get("plan");
  const parsed = validateGuestContact({ name: form.get("name"), phone: form.get("phone"), email: form.get("email") });
  if (plan !== "full" && plan !== "deposit") {
    return { error: null, fieldErrors: { ...(parsed.ok ? {} : parsed.errors), plan: "اختر طريقة الدفع." } };
  }
  if (!parsed.ok) return { error: null, fieldErrors: parsed.errors };

  const search = new URLSearchParams();
  for (const key of UTM_KEYS) {
    const value = form.get(key);
    if (typeof value === "string") search.set(key, value);
  }
  const campaign: Campaign = Object.fromEntries(pickCampaignParams(search.toString()));

  const result = await startWorkshopCheckout(PHOTOGRAPHY_BASICS_SLUG, parsed.contact, plan, campaign);
  if (!result.ok) return { error: result.error };
  redirect(result.checkoutUrl);
}

export async function startBalancePaymentAction(
  _previous: WorkshopCheckoutState,
  form: FormData,
): Promise<WorkshopCheckoutState> {
  const blocked = await limited("workshop-balance");
  if (blocked) return { error: blocked };
  const token = form.get("token");
  if (typeof token !== "string") return { error: WORKSHOP_ERRORS.linkInvalid };
  const result = await startBalancePayment(token);
  if (!result.ok) return { error: result.error };
  redirect(result.checkoutUrl);
}
