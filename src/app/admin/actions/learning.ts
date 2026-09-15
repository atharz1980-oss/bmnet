"use server";

/**
 * محتوى الدورة الأونلاين — إجراءات الإدارة.
 *
 * مستقلة عمدًا عن `save_course_atomic`: تلك معاملة أُغلق بها HIGH بعد أن
 * محا نمطها بيانات دورة على الإنتاج، ولا سبب لتوسيع سطحها بمحتوى تعليمي.
 * نشر درس لا يجب أن يمر بحفظ الدورة كلها.
 *
 * كل إجراء خلف `requirePermission('courses', …)`، والكتابة بعميل الخدمة —
 * فلا جدول من هذه الجداول يقبل كتابة من المتصفح أصلًا.
 */

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requirePermission } from "@/lib/admin/session";
import { fail, ok, toArabicDbError, type ActionResult } from "@/lib/cms/result";
import { getServiceSupabase } from "@/lib/supabase/service";
import { isValidVideoId } from "@/lib/learning/bunny";

const uuid = z.string().uuid("معرّف غير صالح.");

const moduleSchema = z.object({
  courseId: uuid,
  title: z.string().trim().min(1, "أدخل عنوان الوحدة.").max(200, "عنوان الوحدة طويل."),
  summary: z.string().trim().max(2000, "وصف الوحدة طويل.").default(""),
  sortOrder: z.number().int().min(0).max(9999).default(0),
});

const lessonSchema = z.object({
  moduleId: uuid,
  title: z.string().trim().min(1, "أدخل عنوان الدرس.").max(200, "عنوان الدرس طويل."),
  description: z.string().trim().max(4000, "وصف الدرس طويل.").default(""),
  videoId: z.string().trim().max(64).default(""),
  durationSeconds: z.number().int().min(0).max(86400, "مدة الدرس غير معقولة.").default(0),
  freePreview: z.boolean().default(false),
  published: z.boolean().default(false),
  sortOrder: z.number().int().min(0).max(9999).default(0),
});

function firstIssue(error: z.ZodError): string {
  return error.issues[0]?.message ?? "بيانات غير صالحة.";
}

/** نشر درس بلا فيديو يعرض على المتدرب صفحة فارغة — نمنعه عند المصدر. */
function validateVideo(videoId: string, published: boolean): string | null {
  if (videoId !== "" && !isValidVideoId(videoId)) {
    return "معرّف الفيديو لا يطابق صيغة Bunny. انسخه من صفحة الفيديو في مكتبتك.";
  }
  if (published && videoId === "") return "لا يمكن نشر درس بلا فيديو. أضف معرّف الفيديو أولًا.";
  return null;
}

function touched(courseSlug?: string) {
  revalidatePath("/admin/courses", "layout");
  revalidatePath("/learn", "layout");
  if (courseSlug) revalidatePath(`/courses/${courseSlug}`);
}

export async function createModuleAction(input: unknown): Promise<ActionResult<string>> {
  const gate = await requirePermission("courses", "edit");
  if (!gate.ok) return gate;
  const parsed = moduleSchema.safeParse(input);
  if (!parsed.success) return fail(firstIssue(parsed.error));
  const { data, error } = await getServiceSupabase()
    .from("course_modules")
    .insert({
      course_id: parsed.data.courseId,
      title: parsed.data.title,
      summary: parsed.data.summary,
      sort_order: parsed.data.sortOrder,
    })
    .select("id")
    .maybeSingle();
  if (error || !data) return fail(toArabicDbError(error, "إنشاء الوحدة"));
  touched();
  return ok(data.id);
}

export async function updateModuleAction(moduleId: string, input: unknown): Promise<ActionResult<null>> {
  const gate = await requirePermission("courses", "edit");
  if (!gate.ok) return gate;
  if (!uuid.safeParse(moduleId).success) return fail("معرّف الوحدة غير صالح.");
  const parsed = moduleSchema.omit({ courseId: true }).safeParse(input);
  if (!parsed.success) return fail(firstIssue(parsed.error));
  const { error } = await getServiceSupabase()
    .from("course_modules")
    .update({
      title: parsed.data.title,
      summary: parsed.data.summary,
      sort_order: parsed.data.sortOrder,
    })
    .eq("id", moduleId);
  if (error) return fail(toArabicDbError(error, "تعديل الوحدة"));
  touched();
  return ok(null);
}

export async function deleteModuleAction(moduleId: string): Promise<ActionResult<null>> {
  const gate = await requirePermission("courses", "edit");
  if (!gate.ok) return gate;
  if (!uuid.safeParse(moduleId).success) return fail("معرّف الوحدة غير صالح.");
  /* الدروس تسقط مع وحدتها بمفتاح ON DELETE CASCADE — حذف واحد لا اثنان. */
  const { error } = await getServiceSupabase().from("course_modules").delete().eq("id", moduleId);
  if (error) return fail(toArabicDbError(error, "حذف الوحدة"));
  touched();
  return ok(null);
}

export async function createLessonAction(input: unknown): Promise<ActionResult<string>> {
  const gate = await requirePermission("courses", "edit");
  if (!gate.ok) return gate;
  const parsed = lessonSchema.safeParse(input);
  if (!parsed.success) return fail(firstIssue(parsed.error));
  const invalid = validateVideo(parsed.data.videoId, parsed.data.published);
  if (invalid) return fail(invalid);
  const { data, error } = await getServiceSupabase()
    .from("course_lessons")
    .insert({
      module_id: parsed.data.moduleId,
      title: parsed.data.title,
      description: parsed.data.description,
      video_id: parsed.data.videoId,
      duration_seconds: parsed.data.durationSeconds,
      free_preview: parsed.data.freePreview,
      published: parsed.data.published,
      sort_order: parsed.data.sortOrder,
    })
    .select("id")
    .maybeSingle();
  if (error || !data) return fail(toArabicDbError(error, "إنشاء الدرس"));
  touched();
  return ok(data.id);
}

export async function updateLessonAction(lessonId: string, input: unknown): Promise<ActionResult<null>> {
  const gate = await requirePermission("courses", "edit");
  if (!gate.ok) return gate;
  if (!uuid.safeParse(lessonId).success) return fail("معرّف الدرس غير صالح.");
  const parsed = lessonSchema.omit({ moduleId: true }).safeParse(input);
  if (!parsed.success) return fail(firstIssue(parsed.error));
  const invalid = validateVideo(parsed.data.videoId, parsed.data.published);
  if (invalid) return fail(invalid);
  const { error } = await getServiceSupabase()
    .from("course_lessons")
    .update({
      title: parsed.data.title,
      description: parsed.data.description,
      video_id: parsed.data.videoId,
      duration_seconds: parsed.data.durationSeconds,
      free_preview: parsed.data.freePreview,
      published: parsed.data.published,
      sort_order: parsed.data.sortOrder,
    })
    .eq("id", lessonId);
  if (error) return fail(toArabicDbError(error, "تعديل الدرس"));
  touched();
  return ok(null);
}

export async function deleteLessonAction(lessonId: string): Promise<ActionResult<null>> {
  const gate = await requirePermission("courses", "edit");
  if (!gate.ok) return gate;
  if (!uuid.safeParse(lessonId).success) return fail("معرّف الدرس غير صالح.");
  const { error } = await getServiceSupabase().from("course_lessons").delete().eq("id", lessonId);
  if (error) return fail(toArabicDbError(error, "حذف الدرس"));
  touched();
  return ok(null);
}

/* ─────────────────────────── التسجيل ─────────────────────────── */

/**
 * منح وصول يدوي — الباب الوحيد اليوم حتى يصل الشراء.
 * البريد لا المعرّف: الموظف يعرف بريد المتدرب لا uuid حسابه.
 */
export async function grantEnrollmentAction(courseId: string, email: string): Promise<ActionResult<null>> {
  const gate = await requirePermission("courses", "edit");
  if (!gate.ok) return gate;
  if (!uuid.safeParse(courseId).success) return fail("معرّف الدورة غير صالح.");
  const address = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(address)) return fail("أدخل بريدًا إلكترونيًا صالحًا.");

  const svc = getServiceSupabase();
  const { data: users, error: lookupError } = await svc.auth.admin.listUsers({ page: 1, perPage: 200 });
  if (lookupError) return fail("تعذر البحث عن الحساب. حاول مجددًا.");
  const user = users.users.find((candidate) => candidate.email?.toLowerCase() === address);
  if (!user) return fail("لا يوجد حساب بهذا البريد. يسجّل المتدرب أولًا ثم تمنحه الوصول.");

  const { error } = await svc.from("course_enrollments").upsert(
    { user_id: user.id, course_id: courseId, source: "manual", granted_by: gate.data.userId },
    { onConflict: "user_id,course_id" },
  );
  if (error) return fail(toArabicDbError(error, "منح الوصول"));
  touched();
  return ok(null);
}

export async function revokeEnrollmentAction(enrollmentId: string): Promise<ActionResult<null>> {
  const gate = await requirePermission("courses", "edit");
  if (!gate.ok) return gate;
  if (!uuid.safeParse(enrollmentId).success) return fail("معرّف التسجيل غير صالح.");
  const { error } = await getServiceSupabase().from("course_enrollments").delete().eq("id", enrollmentId);
  if (error) return fail(toArabicDbError(error, "سحب الوصول"));
  touched();
  return ok(null);
}
