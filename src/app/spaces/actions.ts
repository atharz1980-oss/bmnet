"use server";

/**
 * حجز مساحة استوديو — بلا حساب.
 *
 * يصل من المتصفح: مساحة ويوم ووقت «من — إلى» وبيانات الزائر ونوع الحجز
 * (فرد / شركة / معلن / أي أحد) وحقل فخ. المبلغ والمدة والتوافر يقررها
 * الخادم في `startSpaceBooking`، ولا يُكتب الحجز «مؤكد» إلا بعد تحقق
 * الخادم من ميسر مباشرة.
 */

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { checkRateLimit, requesterKey } from "@/lib/cms/rate-limit";
import { validateGuestContact, type GuestField } from "@/lib/landing/guest-validation";
import {
  SPACE_BOOKING_ERRORS,
  isSpaceCustomerType,
  startSpaceBooking,
  type SpaceBookingInput,
} from "@/lib/spaces/bookings";

export type SpaceBookingField = GuestField | "customerType" | "company";

export interface SpaceBookingState {
  error: string | null;
  fieldErrors?: Partial<Record<SpaceBookingField, string>>;
}

const BOOKING_LIMIT = 8;
const BOOKING_WINDOW_MS = 10 * 60 * 1000;
const HONEYPOT_FIELD = "website";

async function limited(scope: string): Promise<string | null> {
  const limit = checkRateLimit(requesterKey(await headers(), scope), BOOKING_LIMIT, BOOKING_WINDOW_MS);
  if (limit.allowed) return null;
  const minutes = Math.max(1, Math.ceil(limit.retryAfterSeconds / 60));
  return `محاولات كثيرة خلال وقت قصير. انتظر ${minutes} دقيقة ثم أعد المحاولة.`;
}

export async function bookSpaceAction(
  _previous: SpaceBookingState,
  form: FormData,
): Promise<SpaceBookingState> {
  /* فخ الروبوتات: إجابة نجاح صامتة بلا كتابة. */
  if (form.get(HONEYPOT_FIELD)) return { error: null };

  const blocked = await limited("space-booking");
  if (blocked) return { error: blocked };

  const contact = validateGuestContact({
    name: form.get("name"),
    phone: form.get("phone"),
    email: form.get("email"),
  });
  if (!contact.ok) return { error: SPACE_BOOKING_ERRORS.invalidData, fieldErrors: contact.errors };

  const customerType = String(form.get("customerType") ?? "");
  if (!isSpaceCustomerType(customerType)) {
    return { error: SPACE_BOOKING_ERRORS.invalidData, fieldErrors: { customerType: "اختر نوع الحجز." } };
  }

  const companyName = String(form.get("companyName") ?? "").replace(/\s+/g, " ").trim().slice(0, 120);
  if (customerType === "company" && companyName.length < 2) {
    return {
      error: SPACE_BOOKING_ERRORS.invalidData,
      fieldErrors: { company: "أدخل اسم الشركة المختصر (حرفان على الأقل)." },
    };
  }

  const notes = String(form.get("notes") ?? "").trim().slice(0, 2000);
  const displayed = Number(form.get("total"));

  const result = await startSpaceBooking({
    spaceSlug: String(form.get("space") ?? ""),
    date: String(form.get("date") ?? ""),
    start: String(form.get("start") ?? ""),
    end: String(form.get("end") ?? ""),
    displayedTotalSar: Number.isFinite(displayed) ? displayed : null,
    customerType,
    companyName: companyName || null,
    name: contact.contact.name,
    email: contact.contact.email,
    phone: contact.contact.phone,
    notes: notes || null,
  });

  if (!result.ok) return { error: result.error };
  redirect(result.checkoutUrl);
}
