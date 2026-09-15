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
import { ENROLLMENT_STATUSES } from "@/lib/learning/access";

const uuid = z.string().uuid("معرّف غير صالح.");

const moduleSchema = z.object({
  courseId: uuid,
  title: z.string().trim().min(1, "أدخل عنوان الوحدة.").max(200, "عنوان الوحدة طويل."),
  summary: z.string().trim().max(2000, "وصف الوحدة طويل.").default(""),
  published: z.boolean().default(false),
});

/**
 * `videoId` اختياري عمدًا وبثلاث دلالات مميزة:
 *   غائب  → لا تمس `video_id` المحفوظ.
 *   ""    → امسحه صراحةً.
 *   قيمة  → استبدله.
 * أزرار التبديل (نشر/معاينة) تُغفله، فلا تمحو فيديو درس بضغطة عَلَم.
 */
const lessonSchema = z.object({
  moduleId: uuid,
  title: z.string().trim().min(1, "أدخل عنوان الدرس.").max(200, "عنوان الدرس طويل."),
  description: z.string().trim().max(4000, "وصف الدرس طويل.").default(""),
  lessonType: z.enum(["video", "text"]).default("video"),
  videoId: z.string().trim().max(64).optional(),
  durationSeconds: z.number().int().min(0).max(86400, "مدة الدرس غير معقولة.").default(0),
  freePreview: z.boolean().default(false),
  published: z.boolean().default(false),
});

const enrollmentStatusSchema = z.enum(ENROLLMENT_STATUSES);

function firstIssue(error: z.ZodError): string {
  return error.issues[0]?.message ?? "بيانات غير صالحة.";
}

/**
 * الفيديو المطلوب بعد هذا التعديل — القيمة الجديدة إن أُرسلت، وإلا المحفوظة.
 * يقابل قيد القاعدة `course_lessons_published_video_required` فيرد الخطأ
 * بالعربية قبل أن تردّه Postgres.
 */
function validateVideo(
  incoming: string | undefined,
  stored: string,
  lessonType: "video" | "text",
  published: boolean,
): string | null {
  const effective = incoming === undefined ? stored : incoming;
  if (effective !== "" && !isValidVideoId(effective)) {
    return "معرّف الفيديو لا يطابق صيغة Bunny (GUID). انسخه من صفحة الفيديو في مكتبتك.";
  }
  if (published && lessonType === "video" && effective === "") {
    return "لا يمكن نشر درس فيديو بلا فيديو. أضف معرّف الفيديو أولًا.";
  }
  return null;
}

function touched() {
  revalidatePath("/admin/courses", "layout");
  revalidatePath("/learn", "layout");
  revalidatePath("/courses", "layout");
}

/**
 * الترتيب التالي في المجموعة — حتمي ومتسلسل.
 * كان `Date.now() % 9999` فيتصادم ويعطي ترتيبًا عشوائيًا بين عنصرين
 * أُنشئا في الملّي ثانية نفسها.
 */
async function nextModuleOrder(courseId: string): Promise<number> {
  const { data } = await getServiceSupabase()
    .from("course_modules")
    .select("sort_order")
    .eq("course_id", courseId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  return Math.min((data?.sort_order ?? -1) + 1, 9999);
}

async function nextLessonOrder(moduleId: string): Promise<number> {
  const { data } = await getServiceSupabase()
    .from("course_lessons")
    .select("sort_order")
    .eq("module_id", moduleId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  return Math.min((data?.sort_order ?? -1) + 1, 9999);
}

/* ─────────────────────────── الوحدات ─────────────────────────── */

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
      published: parsed.data.published,
      sort_order: await nextModuleOrder(parsed.data.courseId),
    })
    .select("id")
    .maybeSingle();
  if (error || !data) return fail(toArabicDbError(error, "إنشاء الوحدة"));
  touched();
  return ok(data.id);
}

export async function updateModuleAction(
  moduleId: string,
  input: unknown,
): Promise<ActionResult<null>> {
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
      published: parsed.data.published,
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

/* ─────────────────────────── الدروس ──────────────────────────── */

export async function createLessonAction(input: unknown): Promise<ActionResult<string>> {
  const gate = await requirePermission("courses", "edit");
  if (!gate.ok) return gate;
  const parsed = lessonSchema.safeParse(input);
  if (!parsed.success) return fail(firstIssue(parsed.error));
  const invalid = validateVideo(
    parsed.data.videoId,
    "",
    parsed.data.lessonType,
    parsed.data.published,
  );
  if (invalid) return fail(invalid);
  const { data, error } = await getServiceSupabase()
    .from("course_lessons")
    .insert({
      module_id: parsed.data.moduleId,
      title: parsed.data.title,
      description: parsed.data.description,
      lesson_type: parsed.data.lessonType,
      video_id: parsed.data.videoId ?? "",
      duration_seconds: parsed.data.durationSeconds,
      free_preview: parsed.data.freePreview,
      published: parsed.data.published,
      sort_order: await nextLessonOrder(parsed.data.moduleId),
    })
    .select("id")
    .maybeSingle();
  if (error || !data) return fail(toArabicDbError(error, "إنشاء الدرس"));
  touched();
  return ok(data.id);
}

export async function updateLessonAction(
  lessonId: string,
  input: unknown,
): Promise<ActionResult<null>> {
  const gate = await requirePermission("courses", "edit");
  if (!gate.ok) return gate;
  if (!uuid.safeParse(lessonId).success) return fail("معرّف الدرس غير صالح.");
  const parsed = lessonSchema.omit({ moduleId: true }).safeParse(input);
  if (!parsed.success) return fail(firstIssue(parsed.error));

  const svc = getServiceSupabase();
  /* المحفوظ لازم للتحقق: نشر درس دون تغيير فيديوه يجب أن يرى فيديوه. */
  const { data: current, error: readError } = await svc
    .from("course_lessons")
    .select("video_id")
    .eq("id", lessonId)
    .maybeSingle();
  if (readError || !current) return fail("لم يُعثر على الدرس.");

  const invalid = validateVideo(
    parsed.data.videoId,
    current.video_id,
    parsed.data.lessonType,
    parsed.data.published,
  );
  if (invalid) return fail(invalid);

  const base = {
    title: parsed.data.title,
    description: parsed.data.description,
    lesson_type: parsed.data.lessonType,
    duration_seconds: parsed.data.durationSeconds,
    free_preview: parsed.data.freePreview,
    published: parsed.data.published,
  };
  /* المفتاح يُضاف فقط حين أُرسل — غيابه يعني «لا تمسّه». */
  const patch =
    parsed.data.videoId === undefined ? base : { ...base, video_id: parsed.data.videoId };

  const { error } = await svc.from("course_lessons").update(patch).eq("id", lessonId);
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

/* ─────────────────────────── الترتيب ─────────────────────────── */

const reorderSchema = z.array(uuid).min(1).max(500);

/** يُعاد كتابة `sort_order` من الترتيب المُرسل: 0،1،2… فلا تصادم ممكن. */
async function applyOrder(
  table: "course_modules" | "course_lessons",
  ids: string[],
): Promise<string | null> {
  const svc = getServiceSupabase();
  for (const [index, id] of ids.entries()) {
    const { error } = await svc.from(table).update({ sort_order: index }).eq("id", id);
    if (error) return toArabicDbError(error, "إعادة الترتيب");
  }
  return null;
}

export async function reorderModulesAction(orderedIds: unknown): Promise<ActionResult<null>> {
  const gate = await requirePermission("courses", "edit");
  if (!gate.ok) return gate;
  const parsed = reorderSchema.safeParse(orderedIds);
  if (!parsed.success) return fail("ترتيب غير صالح.");
  const error = await applyOrder("course_modules", parsed.data);
  if (error) return fail(error);
  touched();
  return ok(null);
}

export async function reorderLessonsAction(orderedIds: unknown): Promise<ActionResult<null>> {
  const gate = await requirePermission("courses", "edit");
  if (!gate.ok) return gate;
  const parsed = reorderSchema.safeParse(orderedIds);
  if (!parsed.success) return fail("ترتيب غير صالح.");
  const error = await applyOrder("course_lessons", parsed.data);
  if (error) return fail(error);
  touched();
  return ok(null);
}

/* ─────────────────────────── التسجيل ─────────────────────────── */

/**
 * منح وصول يدوي — الباب الوحيد اليوم حتى يصل الشراء.
 *
 * البحث بالبريد يمر بدالة تبحث بفهرس `auth.users` ولا تُرجع إلا معرّفًا
 * واحدًا. كان تنزيل صفحة من كل المستخدمين إلى الخادم ثم البحث فيها —
 * لا يتوسّع ويحمّل ما لا يلزم.
 */
export async function grantEnrollmentAction(
  courseId: string,
  email: string,
): Promise<ActionResult<null>> {
  const gate = await requirePermission("courses", "edit");
  if (!gate.ok) return gate;
  if (!uuid.safeParse(courseId).success) return fail("معرّف الدورة غير صالح.");
  const address = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(address)) return fail("أدخل بريدًا إلكترونيًا صالحًا.");

  const svc = getServiceSupabase();
  const { data: userId, error: lookupError } = await svc.rpc("admin_user_id_by_email", {
    p_email: address,
  });
  if (lookupError) return fail("تعذر البحث عن الحساب. حاول مجددًا.");
  if (!userId) return fail("لا يوجد حساب بهذا البريد. يسجّل المتدرب أولًا ثم تمنحه الوصول.");

  /* المنح اليدوي فعّال فورًا. الشراء لاحقًا يبدأ `pending` ولا يصير
     `active` إلا بتأكيد موثوق من الخادم. */
  const { error } = await svc.from("course_enrollments").upsert(
    {
      user_id: userId,
      course_id: courseId,
      source: "manual",
      status: "active",
      granted_by: gate.data.userId,
    },
    { onConflict: "user_id,course_id" },
  );
  if (error) return fail(toArabicDbError(error, "منح الوصول"));
  touched();
  return ok(null);
}

/** تغيير حالة تسجيل — الإلغاء يُبقي السجل ولا يمحوه. */
export async function setEnrollmentStatusAction(
  enrollmentId: string,
  status: unknown,
): Promise<ActionResult<null>> {
  const gate = await requirePermission("courses", "edit");
  if (!gate.ok) return gate;
  if (!uuid.safeParse(enrollmentId).success) return fail("معرّف التسجيل غير صالح.");
  const parsed = enrollmentStatusSchema.safeParse(status);
  if (!parsed.success) return fail("حالة تسجيل غير معروفة.");
  const { error } = await getServiceSupabase()
    .from("course_enrollments")
    .update({ status: parsed.data })
    .eq("id", enrollmentId);
  if (error) return fail(toArabicDbError(error, "تحديث حالة التسجيل"));
  touched();
  return ok(null);
}

/**
 * حذف صف التسجيل نهائيًا.
 * الإلغاء المعتاد يمر بـ`setEnrollmentStatusAction` ويُبقي الأثر؛ هذا
 * للتنظيف الإداري وحده، وسيُمنع على المشتريات حين يصل الدفع.
 */
export async function deleteEnrollmentAction(enrollmentId: string): Promise<ActionResult<null>> {
  const gate = await requirePermission("courses", "edit");
  if (!gate.ok) return gate;
  if (!uuid.safeParse(enrollmentId).success) return fail("معرّف التسجيل غير صالح.");
  const svc = getServiceSupabase();
  const { data: row } = await svc
    .from("course_enrollments")
    .select("source")
    .eq("id", enrollmentId)
    .maybeSingle();
  if (row?.source === "purchase") {
    return fail("لا يُحذف تسجيل ناتج عن شراء. غيّر حالته إلى «ملغى» أو «مسترد» ليبقى السجل.");
  }
  const { error } = await svc.from("course_enrollments").delete().eq("id", enrollmentId);
  if (error) return fail(toArabicDbError(error, "حذف التسجيل"));
  touched();
  return ok(null);
}
