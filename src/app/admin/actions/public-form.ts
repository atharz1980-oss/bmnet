"use server";

/**
 * بيت المصور — نموذج تدريب الشركات العام (CP-G)
 * -----------------------------------------------
 * إدراج طلب شركة من الزائر عبر عميل anon بلا كوكيز (D-86):
 * RLS يسمح بـ INSERT على corporate_requests للزائر (سياسة موثقة)،
 * والإدارة تراه في اللوحة بعد الإعادة من قاعدة البيانات.
 */

import { revalidatePath } from "next/cache";

import {
  fail,
  ok,
  isValidEmail,
  isValidSaudiPhone,
  toArabicDbError,
  type ActionResult,
} from "@/lib/cms/result";
import { getPublicAnonClient } from "@/lib/supabase/service";

export interface CorporateRequestInput {
  company: string;
  contactPerson: string;
  phone: string;
  email: string;
  traineesCount: number;
  requestedCourse: string;
  notes: string;
}

export async function submitCorporateRequestAction(
  input: CorporateRequestInput,
): Promise<ActionResult<null>> {
  const company = input.company.trim();
  const contactPerson = input.contactPerson.trim();
  const phone = input.phone.trim();
  const email = input.email.trim();
  const requestedCourse = input.requestedCourse.trim();
  const notes = input.notes.trim();

  if (!company) return fail("اسم الشركة مطلوب.");
  if (!contactPerson) return fail("اسم مسؤول التواصل مطلوب.");
  if (!isValidSaudiPhone(phone)) return fail("رقم الجوال غير صالح — مثال: 0501234567.");
  if (!isValidEmail(email)) return fail("البريد الإلكتروني غير صالح.");
  const trainees = Math.round(input.traineesCount);
  if (!Number.isFinite(trainees) || trainees < 1 || trainees > 1000) {
    return fail("عدد المتدربين يجب أن يكون بين 1 و 1000.");
  }

  try {
    const client = getPublicAnonClient();
    const { error } = await client.from("corporate_requests").insert({
      company_name: company.slice(0, 120),
      contact_name: contactPerson.slice(0, 120),
      phone: phone.slice(0, 32),
      email: email.slice(0, 160),
      trainee_count: trainees,
      requested_course: requestedCourse.slice(0, 160),
      notes: notes.slice(0, 2000),
      status: "new",
    });
    if (error) return fail(toArabicDbError(error, "إرسال الطلب"));
    revalidatePath("/", "layout");
    return ok(null);
  } catch (error) {
    return fail(toArabicDbError(error, "إرسال الطلب"));
  }
}
