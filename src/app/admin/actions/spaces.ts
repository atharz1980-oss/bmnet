"use server";

/**
 * مساحات الاستوديو — إجراءات الإدارة.
 *
 * كلها خلف `requirePermission("spaces", …)` القائمة، والكتابة بعميل الخدمة
 * (لا جدول من هذه الجداول يقبل كتابة متصفح أصلًا). الصور ومواعيد العمل
 * تُحفظ استبدالًا كاملًا للمصفوفة: صفوف مرجعية بسيطة بلا تاريخ يُحرَس،
 * وقواعد الوقت تُتحقق هنا كما تتحقق في القاعدة.
 */

import { revalidatePath } from "next/cache";
import { invalidateCmsCache } from "./cache-invalidate";
import { z } from "zod";

import { requirePermission } from "@/lib/admin/session";
import { fail, ok, toArabicDbError, type ActionResult } from "@/lib/cms/result";
import { toStoragePath } from "@/lib/cms/mappers";
import { cancelSpaceBooking, completeSpaceBooking } from "@/lib/spaces/bookings";
import { DAY_LABELS, durationMinutes, isValidTime, rangesOverlap, type TimeRange } from "@/lib/spaces/schedule";
import { MEDIA_BUCKET } from "@/lib/supabase/media-storage";
import { getServiceSupabase } from "@/lib/supabase/service";

const uuid = z.string().uuid("معرّف غير صالح.");

function touched() {
  /* الإبطال أولًا: إعادة البناء تقرأ من كاش البيانات. */
  invalidateCmsCache();
  revalidatePath("/admin/spaces", "layout");
  revalidatePath("/admin/space-bookings", "layout");
  revalidatePath("/spaces", "layout");
}

function firstIssue(error: z.ZodError): string {
  return error.issues[0]?.message ?? "بيانات غير صالحة.";
}

/* ─────────────────────────── المساحة ─────────────────────────── */

const spaceSchema = z.object({
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .min(2, "أدخل رابطًا للمساحة بالحروف الإنجليزية.")
    .max(80, "الرابط طويل.")
    .regex(/^[a-z0-9][a-z0-9-]{1,79}$/, "الرابط يبدأ بحرف أو رقم ويقبل الحروف الصغيرة والأرقام والشرطة فقط."),
  name: z.string().trim().min(2, "أدخل اسم المساحة.").max(120, "الاسم طويل."),
  shortDescription: z.string().trim().max(300, "الوصف المختصر طويل.").default(""),
  description: z.string().trim().max(5000, "الوصف طويل جدًا.").default(""),
  priceSar: z.coerce
    .number()
    .min(1, "أدخل سعر الساعة بالريال (1 ريال على الأقل).")
    .max(100_000, "السعر كبير جدًا."),
  featured: z.boolean().default(false),
  published: z.boolean().default(false),
});

/** رابط محجوز لمساحة أخرى — يُرفض برسالة عربية قبل قيد الفهرس الفريد. */
async function slugTakenByOther(slug: string, exceptId: string | null): Promise<boolean> {
  const { data } = await getServiceSupabase()
    .from("studio_spaces")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();
  if (!data) return false;
  return data.id !== exceptId;
}

export async function createSpaceAction(input: unknown): Promise<ActionResult<string>> {
  const gate = await requirePermission("spaces", "create");
  if (!gate.ok) return gate;
  const parsed = spaceSchema.safeParse(input);
  if (!parsed.success) return fail(firstIssue(parsed.error));
  if (await slugTakenByOther(parsed.data.slug, null)) {
    return fail("هذا الرابط مستخدم لمساحة أخرى — اختر رابطًا مختلفًا.");
  }
  const { data, error } = await getServiceSupabase()
    .from("studio_spaces")
    .insert({
      slug: parsed.data.slug,
      name: parsed.data.name,
      short_description: parsed.data.shortDescription,
      description: parsed.data.description,
      price_per_hour_halalas: Math.round(parsed.data.priceSar * 100),
      publish_status: parsed.data.published ? "published" : "draft",
      featured: parsed.data.featured,
    })
    .select("id")
    .maybeSingle();
  if (error || !data) return fail(toArabicDbError(error, "إنشاء المساحة"));
  touched();
  return ok(data.id);
}

export async function updateSpaceAction(spaceId: string, input: unknown): Promise<ActionResult<null>> {
  const gate = await requirePermission("spaces", "edit");
  if (!gate.ok) return gate;
  if (!uuid.safeParse(spaceId).success) return fail("معرّف المساحة غير صالح.");
  const parsed = spaceSchema.safeParse(input);
  if (!parsed.success) return fail(firstIssue(parsed.error));
  if (await slugTakenByOther(parsed.data.slug, spaceId)) {
    return fail("هذا الرابط مستخدم لمساحة أخرى — اختر رابطًا مختلفًا.");
  }
  const { error } = await getServiceSupabase()
    .from("studio_spaces")
    .update({
      slug: parsed.data.slug,
      name: parsed.data.name,
      short_description: parsed.data.shortDescription,
      description: parsed.data.description,
      price_per_hour_halalas: Math.round(parsed.data.priceSar * 100),
      publish_status: parsed.data.published ? "published" : "draft",
      featured: parsed.data.featured,
    })
    .eq("id", spaceId);
  if (error) return fail(toArabicDbError(error, "تعديل المساحة"));
  touched();
  return ok(null);
}

/**
 * حذف مساحة نهائيًا. لها حجوزات؟ تُرفض: السجل المالي لا يمحى ولا تُمحى
 * جذوره. بلا حجوزات تُحذف صفوفها (الصور والمواعيد بـ cascade) وتُزال
 * ملفاتها من bm-media بأفضل جهد — وبقايا البيانات تُنظَّف بحاسبة القجانات.
 */
export async function deleteSpaceAction(spaceId: string): Promise<ActionResult<null>> {
  const gate = await requirePermission("spaces", "delete");
  if (!gate.ok) return gate;
  if (!uuid.safeParse(spaceId).success) return fail("معرّف المساحة غير صالح.");
  const svc = getServiceSupabase();

  const { data: bookings } = await svc
    .from("studio_space_bookings")
    .select("id")
    .eq("space_id", spaceId)
    .limit(1);
  if ((bookings ?? []).length > 0) {
    return fail("لهذه المساحة حجوزات قائمة. أخفِها بدل حذفها — السجلات المالية تبقى ولا تُمحى.");
  }

  const { data: images } = await svc
    .from("studio_space_images")
    .select("storage_path")
    .eq("space_id", spaceId);
  const paths = (images ?? []).map((row) => row.storage_path);

  const { error } = await svc.from("studio_spaces").delete().eq("id", spaceId);
  if (error) return fail(toArabicDbError(error, "حذف المساحة"));

  if (paths.length > 0) {
    try {
      await svc.storage.from(MEDIA_BUCKET).remove(paths);
    } catch {
      /* أفضل جهد: بقايا الملفات تُلحق بحاسبة القجانات ولا تكسر الحذف. */
    }
  }
  touched();
  return ok(null);
}

/* ─────────────────────────── الصور ─────────────────────────── */

const imageListSchema = z
  .array(
    z.object({
      /* رابط العرض كما يعيده ImageUpload — يُحوَّل إلى مسار bm-media هنا. */
      url: z.string().trim().min(1, "مسار الصورة فارغ.").max(1024, "مسار الصورة طويل."),
      alt: z.string().trim().max(200, "النص البديل طويل.").default(""),
    }),
  )
  .max(20, "معرض المساحة يقبل 20 صورة كحد أقصى.");

export async function saveSpaceImagesAction(spaceId: string, input: unknown): Promise<ActionResult<null>> {
  const gate = await requirePermission("spaces", "edit");
  if (!gate.ok) return gate;
  if (!uuid.safeParse(spaceId).success) return fail("معرّف المساحة غير صالح.");
  const parsed = imageListSchema.safeParse(input);
  if (!parsed.success) return fail(firstIssue(parsed.error));

  const seen = new Set<string>();
  const rows: { space_id: string; storage_path: string; alt_text: string; sort_order: number }[] = [];
  for (const [index, image] of parsed.data.entries()) {
    const path = toStoragePath(image.url);
    if (!path || seen.has(path)) continue;
    seen.add(path);
    rows.push({ space_id: spaceId, storage_path: path, alt_text: image.alt, sort_order: index });
  }

  const svc = getServiceSupabase();
  /* استبدال كامل: تحذير يسبق إدراجًا بترتيب جديد — قيد الفهرس الفريد
     لا يتصادم لأن كل شيء قديمًا قد سقط أولًا. */
  const { error: clearError } = await svc.from("studio_space_images").delete().eq("space_id", spaceId);
  if (clearError) return fail(toArabicDbError(clearError, "حفظ صور المساحة"));
  if (rows.length > 0) {
    const { error } = await svc.from("studio_space_images").insert(rows);
    if (error) return fail(toArabicDbError(error, "حفظ صور المساحة"));
  }
  touched();
  return ok(null);
}

/* ───────────────────── أيام الحجز والوقت «من — إلى» ───────────────────── */

const hoursListSchema = z
  .array(
    z.object({
      day: z.coerce.number().int().min(0).max(6, "اليوم من 0 (الأحد) إلى 6 (السبت)."),
      start: z.string().trim(),
      end: z.string().trim(),
    }),
  )
  .max(35, "عدد نطاقات المواعيد كبير جدًا.");

/** كل نطاق صالح (وقت صحيح وطول ≥ 30 دقيقة) — والسبب بالعربية عند الرفض. */
function invalidHourReason(start: string, end: string): string | null {
  if (!isValidTime(start) || !isValidTime(end)) return "وقت غير صالح — الصيغة HH:MM.";
  const minutes = durationMinutes(start, end);
  if (minutes === null) return "نهاية الوقت يجب أن تكون بعد بدايته.";
  if (minutes < 30) return "أقصر نطاق للحجز هو 30 دقيقة.";
  return null;
}

export async function saveSpaceHoursAction(spaceId: string, input: unknown): Promise<ActionResult<null>> {
  const gate = await requirePermission("spaces", "edit");
  if (!gate.ok) return gate;
  if (!uuid.safeParse(spaceId).success) return fail("معرّف المساحة غير صالح.");
  const parsed = hoursListSchema.safeParse(input);
  if (!parsed.success) return fail(firstIssue(parsed.error));

  const byDay = new Map<number, TimeRange[]>();
  for (const row of parsed.data) {
    const reason = invalidHourReason(row.start, row.end);
    if (reason) return fail(`${DAY_LABELS[row.day] ?? "يوم"}: ${reason}`);
    const list = byDay.get(row.day) ?? [];
    list.push({ start: row.start, end: row.end });
    byDay.set(row.day, list);
  }
  /* نطاقان متداخلان في اليوم الواحد مضلّلان: اللوح يعرضهما مندمجين
     والحجز يقع في أوسعهما. يُمنع التداخل هنا ويُسمح بالتلاصق. */
  for (const [day, ranges] of byDay) {
    const sorted = [...ranges].sort((a, b) => a.start.localeCompare(b.start));
    for (let index = 1; index < sorted.length; index += 1) {
      if (rangesOverlap(sorted[index - 1], sorted[index])) {
        return fail(`${DAY_LABELS[day] ?? "يوم"}: نطاقا وقت متداخلان — اجعلهما متلاصقين أو في يومين.`);
      }
    }
  }

  const rows = parsed.data
    .map((row) => ({ space_id: spaceId, day_of_week: row.day, start_time: row.start, end_time: row.end }))
    .sort((a, b) => a.day_of_week - b.day_of_week || a.start_time.localeCompare(b.start_time));

  const svc = getServiceSupabase();
  const { error: clearError } = await svc.from("studio_space_hours").delete().eq("space_id", spaceId);
  if (clearError) return fail(toArabicDbError(clearError, "حفظ مواعيد العمل"));
  if (rows.length > 0) {
    const { error } = await svc.from("studio_space_hours").insert(rows);
    if (error) return fail(toArabicDbError(error, "حفظ مواعيد العمل"));
  }
  touched();
  return ok(null);
}

/* ─────────────────────────── الحجوزات ─────────────────────────── */

const cancelNoteSchema = z.string().trim().max(1000, "الملاحظة طويلة.").nullable();

export async function cancelSpaceBookingAction(
  bookingId: string,
  note: unknown,
): Promise<ActionResult<null>> {
  const gate = await requirePermission("spaces", "edit");
  if (!gate.ok) return gate;
  if (!uuid.safeParse(bookingId).success) return fail("معرّف الحجز غير صالح.");
  const parsed = cancelNoteSchema.safeParse(note ?? null);
  const result = await cancelSpaceBooking(bookingId, gate.data.userId, parsed.success ? parsed.data : null);
  if (!result.ok) return fail(result.error);
  touched();
  return ok(null);
}

export async function completeSpaceBookingAction(bookingId: string): Promise<ActionResult<null>> {
  const gate = await requirePermission("spaces", "edit");
  if (!gate.ok) return gate;
  if (!uuid.safeParse(bookingId).success) return fail("معرّف الحجز غير صالح.");
  const result = await completeSpaceBooking(bookingId);
  if (!result.ok) return fail(result.error);
  touched();
  return ok(null);
}
