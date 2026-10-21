"use server";

import { revalidatePath } from "next/cache";
import { invalidateCmsCache } from "./cache-invalidate";
import { z } from "zod";

import { requirePermission } from "@/lib/admin/session";
import { fail, ok, type ActionResult } from "@/lib/cms/result";
import { setCourseWhatsAppGroup, isWhatsAppGroupUrlValid } from "@/lib/courses/whatsapp-group";

const updateWhatsAppSchema = z.object({
  courseId: z.string().uuid("معرّف الدورة غير صالح."),
  whatsappUrl: z.string().trim(),
});

/**
 * تحديث رابط مجموعة واتساب للدورة من لوحة الإدارة — محمي بصلاحية courses.edit.
 */
export async function updateCourseWhatsAppGroupAction(
  input: z.infer<typeof updateWhatsAppSchema>
): Promise<ActionResult<{ whatsappUrl: string }>> {
  const gate = await requirePermission("courses", "edit");
  if (!gate.ok) {
    return fail(gate.error);
  }

  const parsed = updateWhatsAppSchema.safeParse(input);
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "بيانات غير صالحة.");
  }

  const { courseId, whatsappUrl } = parsed.data;

  if (whatsappUrl && !isWhatsAppGroupUrlValid(whatsappUrl)) {
    return fail("رابط واتساب غير صالح. يجب أن يبدأ بـ https://chat.whatsapp.com/ أو https://wa.me/");
  }

  const result = await setCourseWhatsAppGroup(courseId, whatsappUrl);
  if (!result.ok) {
    return fail(result.error ?? "تعذر حفظ رابط مجموعة واتساب.");
  }

  /* الإبطال أولًا: إعادة البناء تقرأ من كاش البيانات. */
  invalidateCmsCache();
  revalidatePath(`/admin/courses/${courseId}/content`);
  revalidatePath(`/admin/courses`);

  return ok({ whatsappUrl });
}
