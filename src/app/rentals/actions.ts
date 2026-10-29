"use server";

/**
 * إيجار معدة — بلا حساب.
 *
 * يصل من المتصفح: رابط المعدة والفترة والكمية وبيانات المستأجر ورقم الهوية
 * وتاريخ انتهائها والموافقة على العقد والتوقيع بالاسم، مع فخ روبوتات.
 * المبلغ والتوافر وسريان الهوية تُقرَّر في `startEquipmentRental`، ولا
 * يُكتب الإيجار «مؤكد» إلا بعد تحقق الخادم من ميسر مباشرة.
 */

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { checkRateLimit, requesterKey } from "@/lib/cms/rate-limit";
import { validateGuestContact, type GuestField } from "@/lib/landing/guest-validation";
import {
  EQUIPMENT_RENTAL_ERRORS,
  isRentalCustomerType,
  startEquipmentRental,
  type EquipmentRentalInput,
} from "@/lib/rentals/bookings";
import { identityCoversRental, isValidSaudiNationalId } from "@/lib/rentals/identity";

export type EquipmentRentalField =
  | GuestField
  | "customerType"
  | "company"
  | "dates"
  | "quantity"
  | "nationalId"
  | "nationalIdExpiry"
  | "agreement"
  | "signature"
  | "deliveryAddress";

export interface EquipmentRentalState {
  error: string | null;
  fieldErrors?: Partial<Record<EquipmentRentalField, string>>;
}

const RENTAL_LIMIT = 8;
const RENTAL_WINDOW_MS = 10 * 60 * 1000;
const HONEYPOT_FIELD = "website";

async function limited(scope: string): Promise<string | null> {
  const limit = checkRateLimit(requesterKey(await headers(), scope), RENTAL_LIMIT, RENTAL_WINDOW_MS);
  if (limit.allowed) return null;
  const minutes = Math.max(1, Math.ceil(limit.retryAfterSeconds / 60));
  return `محاولات كثيرة خلال وقت قصير. انتظر ${minutes} دقيقة ثم أعد المحاولة.`;
}

/** عنوان الطلب — يُسجَّل في التوقيع (IP المتصل، بلا كشف إضافي). */
function clientIp(value: Headers): string | null {
  const forwarded = value.get("x-forwarded-for");
  const ip = forwarded ? forwarded.split(",")[0]?.trim() : value.get("x-real-ip");
  return ip ? ip.slice(0, 64) : null;
}

export async function rentEquipmentAction(
  _previous: EquipmentRentalState,
  form: FormData,
): Promise<EquipmentRentalState> {
  /* فخ الروبوتات: إجابة نجاح صامتة بلا كتابة. */
  if (form.get(HONEYPOT_FIELD)) return { error: null };

  const blocked = await limited("equipment-rental");
  if (blocked) return { error: blocked };

  const contact = validateGuestContact({
    name: form.get("name"),
    phone: form.get("phone"),
    email: form.get("email"),
  });
  if (!contact.ok) return { error: EQUIPMENT_RENTAL_ERRORS.invalidData, fieldErrors: contact.errors };

  const customerType = String(form.get("customerType") ?? "");
  if (!isRentalCustomerType(customerType)) {
    return { error: EQUIPMENT_RENTAL_ERRORS.invalidData, fieldErrors: { customerType: "اختر نوع المستأجر." } };
  }

  const companyName = String(form.get("companyName") ?? "").replace(/\s+/g, " ").trim().slice(0, 120);
  if ((customerType === "company" || customerType === "advertiser") && companyName.length < 2) {
    return {
      error: EQUIPMENT_RENTAL_ERRORS.invalidData,
      fieldErrors: { company: "أدخل اسم الشركة أو الجهة (حرفان على الأقل)." },
    };
  }

  /* الهوية وتاريخ انتهائها — التحقق الشكلي هنا والقرار في الخادم. */
  const nationalId = String(form.get("nationalId") ?? "").replace(/[\s-]/g, "");
  if (!isValidSaudiNationalId(nationalId)) {
    return { error: EQUIPMENT_RENTAL_ERRORS.identity, fieldErrors: { nationalId: EQUIPMENT_RENTAL_ERRORS.identity } };
  }
  const nationalIdExpiry = String(form.get("nationalIdExpiry") ?? "").trim();
  const endDate = String(form.get("endDate") ?? "").trim();
  if (!identityCoversRental(nationalIdExpiry, endDate)) {
    return {
      error: EQUIPMENT_RENTAL_ERRORS.identityExpiry,
      fieldErrors: { nationalIdExpiry: EQUIPMENT_RENTAL_ERRORS.identityExpiry },
    };
  }

  const agreementAccepted = ["on", "true", "1", "yes"].includes(
    String(form.get("agreementAccepted") ?? "").toLowerCase(),
  );
  if (!agreementAccepted) {
    return { error: EQUIPMENT_RENTAL_ERRORS.agreement, fieldErrors: { agreement: EQUIPMENT_RENTAL_ERRORS.agreement } };
  }

  const signatureName = String(form.get("signatureName") ?? "");
  const cleanSig = signatureName.replace(/\s+/g, " ").trim();
  if (cleanSig.length < 2) {
    return { error: EQUIPMENT_RENTAL_ERRORS.signature, fieldErrors: { signature: EQUIPMENT_RENTAL_ERRORS.signature } };
  }
  const signatureDataUrl = String(form.get("signatureDataUrl") ?? "").trim();
  if (
    signatureDataUrl.length > 512_000 ||
    !/^data:image\/png;base64,[A-Za-z0-9+/]+={0,2}$/.test(signatureDataUrl)
  ) {
    return { error: EQUIPMENT_RENTAL_ERRORS.signature, fieldErrors: { signature: EQUIPMENT_RENTAL_ERRORS.signature } };
  }

  const method = String(form.get("method") ?? "pickup");
  if (method !== "pickup" && method !== "delivery") {
    return { error: EQUIPMENT_RENTAL_ERRORS.invalidData };
  }
  const deliveryAddress = String(form.get("deliveryAddress") ?? "").trim().slice(0, 500);
  if (method === "delivery" && deliveryAddress.length < 5) {
    return {
      error: EQUIPMENT_RENTAL_ERRORS.delivery,
      fieldErrors: { deliveryAddress: "أدخل عنوان التوصيل (خمسة أحرف على الأقل)." },
    };
  }

  const quantity = Number(form.get("quantity"));
  const displayed = Number(form.get("total"));

  const input: EquipmentRentalInput = {
    itemSlug: String(form.get("item") ?? ""),
    startDate: String(form.get("startDate") ?? "").trim(),
    endDate,
    quantity: Number.isInteger(quantity) ? quantity : 0,
    displayedTotalSar: Number.isFinite(displayed) ? displayed : null,
    method,
    deliveryAddress: method === "delivery" ? deliveryAddress : null,
    customerType,
    customerName: contact.contact.name,
    companyName: companyName || null,
    email: contact.contact.email,
    phone: contact.contact.phone,
    notes: String(form.get("notes") ?? "").trim().slice(0, 2000) || null,
    nationalId,
    nationalIdExpiry,
    agreementAccepted,
    signatureName: cleanSig,
    signatureDataUrl,
    signatureIp: clientIp(await headers()),
  };

  const result = await startEquipmentRental(input);
  if (!result.ok) return { error: result.error };
  redirect(result.checkoutUrl);
}
