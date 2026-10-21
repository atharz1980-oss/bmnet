"use server";

/**
 * إجراءات الخادم لصفحة هبوط «صمّم موقعك الاحترافي باستخدام الذكاء الاصطناعي»
 *
 * يدعم مسارين متكاملين:
 * 1. الدفع الإلكتروني عبر ميسّر (Fast Guest Checkout) عندما تكون الدورة منشورة ولها سعر معتمد في القاعدة.
 * 2. تسجيل الاهتمام المؤكد عندما لا يكون السعر أو الموعد محددين بعد، دون فتح بوابة دفع ودون ادعاءات وهمية.
 */

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { FORM_HONEYPOT_FIELD } from "@/components/landing/photographer-ai-website/anchors";
import { landingCheckoutTarget, photographySpecialties } from "@/data/landing/photographer-ai-website";
import { checkRateLimit, requesterKey } from "@/lib/cms/rate-limit";
import { UTM_KEYS, pickCampaignParams } from "@/lib/landing/campaign";
import {
  normalizeEmail,
  normalizeInternationalMobile,
  normalizeName,
  normalizeSaudiMobile,
  type GuestContact,
} from "@/lib/landing/guest-validation";
import { resolveLandingCheckout } from "@/lib/landing/checkout-target";
import { GUEST_ERRORS, startGuestCheckout, type Campaign } from "@/lib/payments/guest-orders";

export type AiRegistrationField = "name" | "phone" | "email" | "specialty" | "terms";

export interface AiRegistrationState {
  error: string | null;
  successMessage?: string | null;
  fieldErrors?: Partial<Record<AiRegistrationField, string>>;
}

const SUBMISSION_LIMIT = 8;
const SUBMISSION_WINDOW_MS = 10 * 60 * 1000;

function validateAiCourseForm(form: FormData): {
  ok: true;
  contact: GuestContact;
  specialty: string;
  specialtyLabel: string;
  campaign: Campaign;
  expectedPriceSar: number | null;
} | {
  ok: false;
  errors: Partial<Record<AiRegistrationField, string>>;
  generalError?: string;
} {
  /* فحص حقل الفخ */
  const trap = form.get(FORM_HONEYPOT_FIELD);
  if (typeof trap === "string" && trap.trim() !== "") {
    return { ok: false, errors: {}, generalError: "تعذر إرسال الطلب. يرجى المحاولة لاحقًا." };
  }

  const rawName = form.get("name");
  const rawPhone = form.get("phone");
  const rawCountry = form.get("country_code");
  const countryCode = typeof rawCountry === "string" && rawCountry.trim() ? rawCountry.trim() : "SA";
  const rawEmail = form.get("email");
  const rawSpecialty = form.get("specialty");
  const termsAgreed = form.get("terms") === "on" || form.get("terms") === "true";

  const errors: Partial<Record<AiRegistrationField, string>> = {};

  const name = typeof rawName === "string" ? normalizeName(rawName) : null;
  if (!name) errors.name = "أدخل اسمك الكامل (حرفان على الأقل).";

  const phone =
    typeof rawPhone === "string"
      ? normalizeInternationalMobile(rawPhone, countryCode)
      : null;
  if (!phone) errors.phone = "أدخل رقم جوال صحيح مع مفتاح الدولة.";

  const email = typeof rawEmail === "string" ? normalizeEmail(rawEmail) : null;
  if (!email) errors.email = "أدخل بريدًا إلكترونيًا صحيحًا.";

  const specialtyId = typeof rawSpecialty === "string" ? rawSpecialty.trim() : "";
  const matchedSpecialty = photographySpecialties.find((s) => s.id === specialtyId);
  if (!specialtyId || !matchedSpecialty) {
    errors.specialty = "يرجى اختيار تخصصك الفوتوغرافي.";
  }

  if (!termsAgreed) {
    errors.terms = "يجب الموافقة على الشروط وسياسة الخصوصية للمتابعة.";
  }

  if (Object.keys(errors).length > 0 || !name || !phone || !email || !matchedSpecialty) {
    return { ok: false, errors };
  }

  const rawPrice = form.get("expected_price_sar");
  const expectedPriceSar =
    typeof rawPrice === "string" && rawPrice.trim() !== "" ? Number(rawPrice) : null;

  const search = new URLSearchParams();
  for (const key of UTM_KEYS) {
    const value = form.get(key);
    if (typeof value === "string") search.set(key, value);
  }
  const campaign: Campaign = Object.fromEntries(pickCampaignParams(search.toString()));

  return {
    ok: true,
    contact: { name, phone, email },
    specialty: matchedSpecialty.id,
    specialtyLabel: matchedSpecialty.label,
    campaign,
    expectedPriceSar,
  };
}

/**
 * تسجيل الدورة: يوجه تلقائيًا إما إلى بوابة الدفع المعتمدة (عند توفر السعر)
 * أو إلى تسجيل الاهتمام المباشر وحفظ الطلب.
 */
export async function submitAiCourseRegistrationAction(
  _previous: AiRegistrationState,
  form: FormData,
): Promise<AiRegistrationState> {
  const limit = checkRateLimit(
    requesterKey(await headers(), "ai-course-registration"),
    SUBMISSION_LIMIT,
    SUBMISSION_WINDOW_MS,
  );
  if (!limit.allowed) {
    const minutes = Math.max(1, Math.ceil(limit.retryAfterSeconds / 60));
    return { error: `محاولات كثيرة خلال وقت قصير. انتظر ${minutes} دقيقة ثم أعد المحاولة.` };
  }

  const validated = validateAiCourseForm(form);
  if (!validated.ok) {
    return { error: validated.generalError ?? null, fieldErrors: validated.errors };
  }

  const { decision, pricing } = await resolveLandingCheckout(landingCheckoutTarget);

  /* إذا كانت الدورة مجهزة للدفع الإلكتروني ولديها سعر حقيقي معتمد */
  if (decision.status === "ready" && pricing && pricing.currentSar > 0) {
    const campaignWithSpecialty: Campaign = {
      ...validated.campaign,
      utm_content: `specialty:${validated.specialty}`,
    };

    const checkoutResult = await startGuestCheckout(
      validated.contact,
      campaignWithSpecialty,
      validated.expectedPriceSar,
      undefined,
      {
        target: landingCheckoutTarget,
        successPath: "/lp/photographer-ai-website/success",
        backPath: "/lp/photographer-ai-website#registration",
      },
    );

    if (!checkoutResult.ok) {
      return { error: checkoutResult.error };
    }

    /* تحويل المتصفح إلى صفحة ميسّر المستضافة */
    redirect(checkoutResult.checkoutUrl);
  }

  /* إذا لم تكن إعدادات الدفع أو بيانات الدورة جاهزة، إرجاع رسالة خطأ واضحة بدلاً من التحويل لتسجيل الاهتمام */
  return {
    error:
      "عذرًا، إعدادات الدفع أو حجز المقاعد للدورة غير متاحة حاليًا. يرجى التواصل مع إدارة بيت المصور مباشرة للمساعدة في إتمام الحجز.",
  };
}
