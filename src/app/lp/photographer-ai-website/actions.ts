"use server";

/**
 * إجراءات الخادم لصفحة هبوط «ابنِ موقعك الاحترافي بالذكاء الاصطناعي»
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
  normalizeName,
  normalizeSaudiMobile,
  type GuestContact,
} from "@/lib/landing/guest-validation";
import { resolveLandingCheckout } from "@/lib/landing/checkout-target";
import { GUEST_ERRORS, startGuestCheckout, type Campaign } from "@/lib/payments/guest-orders";
import { getPublicAnonClient } from "@/lib/supabase/service";

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
  const rawEmail = form.get("email");
  const rawSpecialty = form.get("specialty");
  const termsAgreed = form.get("terms") === "on" || form.get("terms") === "true";

  const errors: Partial<Record<AiRegistrationField, string>> = {};

  const name = typeof rawName === "string" ? normalizeName(rawName) : null;
  if (!name) errors.name = "أدخل اسمك الكامل (حرفان على الأقل).";

  const phone = typeof rawPhone === "string" ? normalizeSaudiMobile(rawPhone) : null;
  if (!phone) errors.phone = "أدخل رقم جوال سعودي صحيح مثل 05XXXXXXXX.";

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

  /* إذا لم يكن السعر محددًا أو الدورة في مرحلة تسجيل الاهتمام: حفظ الطلب بأمان */
  try {
    const anonClient = getPublicAnonClient();
    const campaignSummary = Object.entries(validated.campaign)
      .filter(([_, v]) => Boolean(v))
      .map(([k, v]) => `${k}=${v}`)
      .join(", ");

    const note = [
      `[طلب تسجيل اهتمام] دورة: ابنِ موقعك الاحترافي بالذكاء الاصطناعي`,
      `التخصص الفوتوغرافي: ${validated.specialtyLabel} (${validated.specialty})`,
      campaignSummary ? `بيانات الحملة: ${campaignSummary}` : "",
    ]
      .filter(Boolean)
      .join(" — ");

    const { error: insertError } = await anonClient.from("contact_messages").insert({
      name: validated.contact.name.slice(0, 120),
      phone: validated.contact.phone.slice(0, 32),
      email: validated.contact.email.slice(0, 160),
      message: note.slice(0, 2000),
    });

    if (insertError) {
      return { error: "حدث خطأ أثناء حفظ طلبك. يرجى المحاولة مرة أخرى أو التواصل معنا مباشرة." };
    }

    return {
      error: null,
      successMessage:
        "تم تسجيل اهتمامك بنجاح! سنتواصل معك عبر الواتساب والبريد الإلكتروني فور اعتماد موعد الدورة وتفعيل التسجيل.",
    };
  } catch {
    return { error: "تعذر إتمام الطلب في الوقت الحالي. يرجى المحاولة لاحقًا." };
  }
}
