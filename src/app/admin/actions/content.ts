"use server";

/**
 * بيت المصور — إجراءات المحتوى (CP-G)
 * ------------------------------------
 * الدورات (مع المنهج والمواعيد) والمدربون والمسارات والمقالات
 * والتقييمات والوسائط والصفحة الرئيسية.
 *
 * كل إجراء: بوابة requirePermission → تحقق مدخلات → كتابة عبر عميل
 * الخدمة → revalidatePath('/','layout') → ActionResult برسائل عربية.
 * الكتابة تحل مكان الجمعيات (curriculum/sessions/blocks/tags) بحذف/إدراج
 * — الكميات صغيرة والاتساق مضمون بمعاملة واحدة منطقية.
 */

import { revalidatePath } from "next/cache";

import { requirePermission } from "@/lib/admin/session";
import {
  fail,
  ok,
  sanitizeSlug,
  isValidSlug,
  toArabicDbError,
  type ActionResult,
} from "@/lib/cms/result";
import { getServiceSupabase } from "@/lib/supabase/service";
import { deleteMedia } from "@/lib/supabase/media-storage";
import { checkPublication } from "@/lib/admin/publishing";
import { splitCourseStatus, toStoragePath } from "@/lib/cms/mappers";
import type { CourseSession, CurriculumDay, HomepageContent } from "@/data/admin/types";

/* ═══════════════════ أنواع المدخلات ═══════════════════ */

/**
 * مدخل الدورة من المحرر — نفس شكل AdminCourse بدون أختام المخزن.
 * ملاحظة موثقة: shortName حقل تجميلي لا عمود له في قاعدة البيانات —
 * يُحفظ في الحالة المحلية فقط ويُفقد مع إعادة التحميل.
 */
export interface CourseInput {
  name: string;
  shortName?: string;
  slug: string;
  excerpt: string;
  description: string;
  type: string;
  level: string;
  language: string;
  status: string;
  images: { main: string; cover?: string; alt: string };
  pricing: {
    price: number;
    originalPrice?: number;
    discountPercent?: number;
    showPrice: boolean;
    isFree: boolean;
    requestQuote: boolean;
  };
  duration: { days: number; totalHours: number; hoursPerDay?: number };
  outcomes: string[];
  audience: string[];
  requirements: string[];
  curriculum: CurriculumDay[];
  sessions: CourseSession[];
  trainerId?: string;
  featured: boolean;
  seo: { title?: string; description?: string };
}

export interface TrainerInput {
  name: string;
  image: string;
  imageAlt?: string;
  title: string;
  specialty: string;
  shortBio: string;
  bio: string;
  yearsOfExperience: number;
  skills: string[];
  instagram?: string;
  linkedin?: string;
  website?: string;
  status: string;
}

export interface PathInput {
  name: string;
  slug: string;
  image: string;
  imageAlt: string;
  excerpt: string;
  description: string;
  level: string;
  status: string;
  courseIds: string[];
  discountPercent: number;
  featured?: boolean;
}

export interface PostBlockInput {
  id?: string;
  type: string;
  text?: string;
  items?: string[];
  image?: string;
  imageAlt?: string;
}

export interface PostInput {
  title: string;
  slug: string;
  excerpt: string;
  contentBlocks: PostBlockInput[];
  coverImage: string;
  coverImageAlt?: string;
  category: string;
  tags: string[];
  author?: string;
  publishedAt: string;
  status: string;
  seo: { title?: string; description?: string };
}

export interface TestimonialInput {
  name: string;
  role?: string;
  rating: number;
  review: string;
  source: string;
  sourceUrl?: string;
  featured: boolean;
  visible: boolean;
  date: string;
}

/* ═══════════════════ مساعدات ═══════════════════ */

function refreshed(): void {
  revalidatePath("/", "layout");
}

async function uniqueCourseSlug(svc: ReturnType<typeof getServiceSupabase>, desired: string, ignoreId?: string): Promise<string> {
  let candidate = desired;
  let suffix = 2;
  for (;;) {
    let query = svc.from("courses").select("id").eq("slug", candidate).limit(1);
    if (ignoreId) query = query.neq("id", ignoreId);
    const { data } = await query;
    if (!data || data.length === 0) return candidate;
    candidate = `${desired}-${suffix++}`;
  }
}

async function uniquePathSlug(svc: ReturnType<typeof getServiceSupabase>, desired: string, ignoreId?: string): Promise<string> {
  let candidate = desired;
  let suffix = 2;
  for (;;) {
    let query = svc.from("learning_paths").select("id").eq("slug", candidate).limit(1);
    if (ignoreId) query = query.neq("id", ignoreId);
    const { data } = await query;
    if (!data || data.length === 0) return candidate;
    candidate = `${desired}-${suffix++}`;
  }
}

async function uniquePostSlug(svc: ReturnType<typeof getServiceSupabase>, desired: string, ignoreId?: string): Promise<string> {
  let candidate = desired;
  let suffix = 2;
  for (;;) {
    let query = svc.from("blog_posts").select("id").eq("slug", candidate).limit(1);
    if (ignoreId) query = query.neq("id", ignoreId);
    const { data } = await query;
    if (!data || data.length === 0) return candidate;
    candidate = `${desired}-${suffix++}`;
  }
}

function courseRowFromInput(input: CourseInput, slug: string) {
  const status = splitCourseStatus(input.status);
  return {
    slug,
    name: input.name.trim(),
    short_description: input.excerpt,
    description: input.description,
    category: input.type,
    level: input.level,
    language: input.language || "ar",
    trainer_id: input.trainerId ?? null,
    image_path: toStoragePath(input.images.main),
    image_alt: input.images.alt,
    price: input.pricing.price,
    original_price: input.pricing.originalPrice ?? null,
    discount_percent: input.pricing.discountPercent ?? null,
    show_price: input.pricing.showPrice,
    is_free: input.pricing.isFree,
    request_quote: input.pricing.requestQuote,
    duration_days: input.duration.days,
    duration_hours: input.duration.totalHours,
    outcomes: input.outcomes,
    audience: input.audience,
    requirements: input.requirements,
    featured: input.featured,
    publish_status: status.publish_status,
    operational_status: status.operational_status,
    seo_title: input.seo.title ?? null,
    seo_description: input.seo.description ?? null,
  };
}

/** كتابة المنهج والمواعيد — حذف ثم إدراج داخل الجمعية */
async function writeCourseChildren(
  svc: ReturnType<typeof getServiceSupabase>,
  courseId: string,
  input: Pick<CourseInput, "curriculum" | "sessions">,
): Promise<string | null> {
  const delSessions = await svc.from("course_sessions").delete().eq("course_id", courseId);
  if (delSessions.error) return delSessions.error.message;
  const delDays = await svc.from("course_curriculum_days").delete().eq("course_id", courseId);
  if (delDays.error) return delDays.error.message;

  if (input.curriculum.length > 0) {
    const dayRows = input.curriculum.map((day, index) => ({
      course_id: courseId,
      title: day.title,
      sort_order: index + 1,
    }));
    const { data: insertedDays, error: daysError } = await svc
      .from("course_curriculum_days")
      .insert(dayRows)
      .select("id");
    if (daysError) return daysError.message;
    const items: Array<{ day_id: string; title: string; description: string | null; sort_order: number }> = [];
    input.curriculum.forEach((day, dayIndex) => {
      const dayId = insertedDays?.[dayIndex]?.id;
      day.items.forEach((item, itemIndex) => {
        if (!dayId) return;
        items.push({
          day_id: dayId,
          title: item.title,
          description: item.description ?? null,
          sort_order: itemIndex + 1,
        });
      });
    });
    if (items.length > 0) {
      const { error: itemsError } = await svc.from("course_curriculum_items").insert(items);
      if (itemsError) return itemsError.message;
    }
  }

  if (input.sessions.length > 0) {
    const sessionRows = input.sessions.map((session) => ({
      course_id: courseId,
      batch_name: session.batchName ?? null,
      start_date: session.startDate,
      end_date: session.endDate ?? null,
      start_time: session.startTime,
      end_time: session.endTime,
      location: session.location,
      city: session.city,
      capacity: session.seats,
      registered_count: session.registered,
      price_override: session.price ?? null,
      status: session.status,
    }));
    const { error: sessionsError } = await svc.from("course_sessions").insert(sessionRows);
    if (sessionsError) return sessionsError.message;
  }
  return null;
}

function validateCourseInput(input: CourseInput): string | null {
  if (!input.name.trim()) return "اسم الدورة مطلوب.";
  const slug = sanitizeSlug(input.slug);
  if (!isValidSlug(slug)) return "الرابط (slug) غير صالح — حروف لاتينية وأرقام وشرطات فقط.";
  if (!input.trainerId) return "اختر مدرب الدورة قبل الحفظ.";
  if (input.pricing.price < 0 || input.duration.days < 0 || input.duration.totalHours < 0) {
    return "لا تُقبل القيم السالبة في السعر أو المدة.";
  }
  for (const session of input.sessions) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(session.startDate)) {
      return "تاريخ بداية أحد المواعيد غير صالح.";
    }
    if (!/^\d{2}:\d{2}$/.test(session.startTime) || !/^\d{2}:\d{2}$/.test(session.endTime)) {
      return "وقت أحد المواعيد غير صالح.";
    }
    if (session.seats < 0 || session.registered < 0) return "أعداد مقاعد المواعيد غير صالحة.";
  }
  return null;
}

/* ═══════════════════ الدورات ═══════════════════ */

export async function createCourseAction(input: CourseInput): Promise<ActionResult<string>> {
  const gate = await requirePermission("courses", "create");
  if (!gate.ok) return gate;

  const invalid = validateCourseInput(input);
  if (invalid) return fail(invalid);

  try {
    const svc = getServiceSupabase();
    const publishError = await checkPublication(svc, gate.data, "courses", splitCourseStatus(input.status).publish_status);
    if (publishError) return fail(publishError);
    const slug = await uniqueCourseSlug(svc, sanitizeSlug(input.slug));
    const { data: created, error } = await svc
      .from("courses")
      .insert(courseRowFromInput(input, slug))
      .select("id")
      .single();
    if (error) return fail(toArabicDbError(error, "إنشاء الدورة"));
    const childError = await writeCourseChildren(svc, created.id, input);
    if (childError) return fail(toArabicDbError(new Error(childError), "حفظ المنهج والمواعيد"));
    refreshed();
    return ok(created.id);
  } catch (error) {
    return fail(toArabicDbError(error, "إنشاء الدورة"));
  }
}

export async function updateCourseAction(
  courseId: string,
  input: CourseInput,
): Promise<ActionResult<string>> {
  const gate = await requirePermission("courses", "edit");
  if (!gate.ok) return gate;

  const invalid = validateCourseInput(input);
  if (invalid) return fail(invalid);

  try {
    const svc = getServiceSupabase();
    const publishError = await checkPublication(svc, gate.data, "courses", splitCourseStatus(input.status).publish_status, courseId);
    if (publishError) return fail(publishError);
    const slug = await uniqueCourseSlug(svc, sanitizeSlug(input.slug), courseId);
    const { error } = await svc
      .from("courses")
      .update(courseRowFromInput(input, slug))
      .eq("id", courseId);
    if (error) return fail(toArabicDbError(error, "تحديث الدورة"));
    const childError = await writeCourseChildren(svc, courseId, input);
    if (childError) return fail(toArabicDbError(new Error(childError), "حفظ المنهج والمواعيد"));
    refreshed();
    return ok(courseId);
  } catch (error) {
    return fail(toArabicDbError(error, "تحديث الدورة"));
  }
}

export async function setCourseStatusAction(
  courseId: string,
  status: string,
): Promise<ActionResult<null>> {
  const gate = await requirePermission("courses", "publish");
  if (!gate.ok) return gate;

  try {
    const svc = getServiceSupabase();
    const split = splitCourseStatus(status);
    const { error } = await svc
      .from("courses")
      .update({ publish_status: split.publish_status, operational_status: split.operational_status })
      .eq("id", courseId);
    if (error) return fail(toArabicDbError(error, "تغيير حالة الدورة"));
    refreshed();
    return ok(null);
  } catch (error) {
    return fail(toArabicDbError(error, "تغيير حالة الدورة"));
  }
}

export async function deleteCourseAction(courseId: string): Promise<ActionResult<null>> {
  const gate = await requirePermission("courses", "delete");
  if (!gate.ok) return gate;

  try {
    const svc = getServiceSupabase();
    /* حماية القيود: المسارات المرتبطة تمنع الحذف (FK restrict) */
    const { data: usedBy } = await svc
      .from("learning_path_courses")
      .select("path_id")
      .eq("course_id", courseId);
    if (usedBy && usedBy.length > 0) {
      return fail("لا يمكن حذف الدورة: وهي مضافة في مسار تعليمي واحد أو أكثر. أزلها من المسار أولًا.");
    }
    const { error } = await svc.from("courses").delete().eq("id", courseId);
    if (error) return fail(toArabicDbError(error, "حذف الدورة"));
    refreshed();
    return ok(null);
  } catch (error) {
    return fail(toArabicDbError(error, "حذف الدورة"));
  }
}

export async function duplicateCourseAction(courseId: string): Promise<ActionResult<string>> {
  const gate = await requirePermission("courses", "create");
  if (!gate.ok) return gate;

  try {
    const svc = getServiceSupabase();
    const { data: source, error } = await svc.from("courses").select("*").eq("id", courseId).maybeSingle();
    if (error || !source) return fail("الدورة الأصلية غير موجودة.");
    const { data: sessions } = await svc.from("course_sessions").select("*").eq("course_id", courseId);
    const { data: days } = await svc.from("course_curriculum_days").select("*").eq("course_id", courseId);
    const { data: items } = await svc.from("course_curriculum_items").select("*");
    if (items === null) {
      return fail("تعذر قراءة منهج الدورة.");
    }

    /* قرار موثق: المواعيد لا تُنسخ — النسخة تبدأ بلا مواعيد؛ والمنهج يُنسخ */
    const { data: copies } = await svc.from("courses").select("name, slug").ilike("name", `${source.name}%`);
    const baseCopyName = `${source.name} (نسخة)`;
    let copyName = baseCopyName;
    let n = 2;
    const names = new Set((copies ?? []).map((row) => row.name));
    while (names.has(copyName)) copyName = `${baseCopyName} ${n++}`;
    const newSlug = await uniqueCourseSlug(
      svc,
      sanitizeSlug(`${source.slug}-copy`) || `${source.slug}-copy`,
    );

    const { data: created, error: insertError } = await svc
      .from("courses")
      .insert({
        ...source,
        id: undefined,
        name: copyName,
        slug: newSlug,
        publish_status: "draft",
        operational_status: null,
        featured: false,
        created_at: undefined,
        updated_at: undefined,
      })
      .select("id")
      .single();
    if (insertError || !created) return fail(toArabicDbError(insertError, "تكرار الدورة"));

    if ((days ?? []).length > 0) {
      const { data: newDays, error: daysError } = await svc
        .from("course_curriculum_days")
        .insert(
          (days ?? [])
            .sort((a, b) => a.sort_order - b.sort_order)
            .map((day) => ({ course_id: created.id, title: day.title, sort_order: day.sort_order })),
        )
        .select("id");
      if (daysError) return fail(toArabicDbError(daysError, "نسخ المنهج"));
      const dayIdMap = (days ?? [])
        .sort((a, b) => a.sort_order - b.sort_order)
        .map((day, index) => ({ oldId: day.id, newId: newDays?.[index]?.id }));
      const itemRows = (items ?? [])
        .filter((item) => dayIdMap.some((entry) => entry.oldId === item.day_id))
        .sort((a, b) => a.sort_order - b.sort_order)
        .map((item) => ({
          day_id: dayIdMap.find((entry) => entry.oldId === item.day_id)?.newId,
          title: item.title,
          description: item.description,
          sort_order: item.sort_order,
        }))
        .filter((row) => Boolean(row.day_id));
      if (itemRows.length > 0) {
        const { error: itemsError } = await svc.from("course_curriculum_items").insert(itemRows);
        if (itemsError) return fail(toArabicDbError(itemsError, "نسخ عناصر المنهج"));
      }
    }
    void sessions; /* المواعيد لا تُنسخ */
    refreshed();
    return ok(created.id);
  } catch (error) {
    return fail(toArabicDbError(error, "تكرار الدورة"));
  }
}

/* ═══════════════════ المدربون ═══════════════════ */

function trainerRowFromInput(input: TrainerInput) {
  return {
    name: input.name.trim(),
    image_path: toStoragePath(input.image),
    image_alt: input.imageAlt ?? null,
    title: input.title,
    specialty: input.specialty,
    short_bio: input.shortBio,
    bio: input.bio,
    years_experience: input.yearsOfExperience,
    skills: input.skills,
    instagram_url: input.instagram ?? null,
    linkedin_url: input.linkedin ?? null,
    website_url: input.website ?? null,
    status: input.status === "hidden" ? "hidden" : "active",
  };
}

export async function createTrainerAction(input: TrainerInput): Promise<ActionResult<string>> {
  const gate = await requirePermission("trainers", "create");
  if (!gate.ok) return gate;
  if (!input.name.trim() || !input.title.trim()) return fail("اسم المدرب ومسماه مطلوبان.");
  try {
    const svc = getServiceSupabase();
    const { data, error } = await svc.from("trainers").insert(trainerRowFromInput(input)).select("id").single();
    if (error) return fail(toArabicDbError(error, "إضافة المدرب"));
    refreshed();
    return ok(data.id);
  } catch (error) {
    return fail(toArabicDbError(error, "إضافة المدرب"));
  }
}

export async function updateTrainerAction(id: string, input: TrainerInput): Promise<ActionResult<string>> {
  const gate = await requirePermission("trainers", "edit");
  if (!gate.ok) return gate;
  if (!input.name.trim() || !input.title.trim()) return fail("اسم المدرب ومسماه مطلوبان.");
  try {
    const svc = getServiceSupabase();
    const { error } = await svc.from("trainers").update(trainerRowFromInput(input)).eq("id", id);
    if (error) return fail(toArabicDbError(error, "تحديث المدرب"));
    refreshed();
    return ok(id);
  } catch (error) {
    return fail(toArabicDbError(error, "تحديث المدرب"));
  }
}

export async function deleteTrainerAction(id: string): Promise<ActionResult<null>> {
  const gate = await requirePermission("trainers", "delete");
  if (!gate.ok) return gate;
  try {
    const svc = getServiceSupabase();
    const { data: usedBy } = await svc.from("courses").select("id").eq("trainer_id", id).limit(1);
    if (usedBy && usedBy.length > 0) {
      return fail("لا يمكن حذف المدرب: مرتبط بدورات قائمة. انقل الدورات إلى مدرب آخر أولًا.");
    }
    const { error } = await svc.from("trainers").delete().eq("id", id);
    if (error) return fail(toArabicDbError(error, "حذف المدرب"));
    refreshed();
    return ok(null);
  } catch (error) {
    return fail(toArabicDbError(error, "حذف المدرب"));
  }
}

/* ═══════════════════ المسارات ═══════════════════ */

function pathRowFromInput(input: PathInput, slug: string) {
  return {
    slug,
    name: input.name.trim(),
    short_description: input.excerpt,
    description: input.description,
    image_path: toStoragePath(input.image),
    image_alt: input.imageAlt,
    level: input.level,
    discount_percent: Math.min(100, Math.max(0, input.discountPercent)),
    publish_status: input.status === "published" ? "published" : "draft",
    featured: input.featured ?? false,
  };
}

async function writePathCourses(
  svc: ReturnType<typeof getServiceSupabase>,
  pathId: string,
  courseIds: string[],
): Promise<string | null> {
  const { error } = await svc.from("learning_path_courses").delete().eq("path_id", pathId);
  if (error) return error.message;
  if (courseIds.length > 0) {
    const { error: insertError } = await svc.from("learning_path_courses").insert(
      courseIds.map((courseId, index) => ({ path_id: pathId, course_id: courseId, sort_order: index + 1 })),
    );
    if (insertError) return insertError.message;
  }
  return null;
}

export async function createPathAction(input: PathInput): Promise<ActionResult<string>> {
  const gate = await requirePermission("paths", "create");
  if (!gate.ok) return gate;
  if (!input.name.trim()) return fail("اسم المسار مطلوب.");
  const slug = sanitizeSlug(input.slug);
  if (!isValidSlug(slug)) return fail("الرابط (slug) غير صالح.");
  try {
    const svc = getServiceSupabase();
    const publishError = await checkPublication(svc, gate.data, "paths", input.status === "published" ? "published" : "draft");
    if (publishError) return fail(publishError);
    const unique = await uniquePathSlug(svc, slug);
    const { data, error } = await svc.from("learning_paths").insert(pathRowFromInput(input, unique)).select("id").single();
    if (error) return fail(toArabicDbError(error, "إنشاء المسار"));
    const childError = await writePathCourses(svc, data.id, input.courseIds);
    if (childError) return fail(toArabicDbError(new Error(childError), "حفظ دورات المسار"));
    refreshed();
    return ok(data.id);
  } catch (error) {
    return fail(toArabicDbError(error, "إنشاء المسار"));
  }
}

export async function updatePathAction(id: string, input: PathInput): Promise<ActionResult<string>> {
  const gate = await requirePermission("paths", "edit");
  if (!gate.ok) return gate;
  if (!input.name.trim()) return fail("اسم المسار مطلوب.");
  const slug = sanitizeSlug(input.slug);
  if (!isValidSlug(slug)) return fail("الرابط (slug) غير صالح.");
  try {
    const svc = getServiceSupabase();
    const publishError = await checkPublication(svc, gate.data, "paths", input.status === "published" ? "published" : "draft", id);
    if (publishError) return fail(publishError);
    const unique = await uniquePathSlug(svc, slug, id);
    const { error } = await svc.from("learning_paths").update(pathRowFromInput(input, unique)).eq("id", id);
    if (error) return fail(toArabicDbError(error, "تحديث المسار"));
    const childError = await writePathCourses(svc, id, input.courseIds);
    if (childError) return fail(toArabicDbError(new Error(childError), "حفظ دورات المسار"));
    refreshed();
    return ok(id);
  } catch (error) {
    return fail(toArabicDbError(error, "تحديث المسار"));
  }
}

export async function deletePathAction(id: string): Promise<ActionResult<null>> {
  const gate = await requirePermission("paths", "delete");
  if (!gate.ok) return gate;
  try {
    const svc = getServiceSupabase();
    const { error } = await svc.from("learning_paths").delete().eq("id", id);
    if (error) return fail(toArabicDbError(error, "حذف المسار"));
    refreshed();
    return ok(null);
  } catch (error) {
    return fail(toArabicDbError(error, "حذف المسار"));
  }
}

/* ═══════════════════ المدونة ═══════════════════ */

function postRowFromInput(input: PostInput, slug: string, authorId: string | null) {
  return {
    slug,
    title: input.title.trim(),
    excerpt: input.excerpt,
    cover_path: toStoragePath(input.coverImage),
    cover_alt: input.coverImageAlt ?? null,
    category: input.category,
    author_id: authorId,
    publish_status: input.status === "published" ? "published" : "draft",
    published_at: input.publishedAt ? new Date(input.publishedAt).toISOString() : null,
    seo_title: input.seo.title ?? null,
    seo_description: input.seo.description ?? null,
  };
}

async function writePostChildren(
  svc: ReturnType<typeof getServiceSupabase>,
  postId: string,
  input: PostInput,
): Promise<string | null> {
  const { error: delBlocks } = await svc.from("blog_content_blocks").delete().eq("post_id", postId);
  if (delBlocks) return delBlocks.message;
  const validBlocks = input.contentBlocks.filter((block) =>
    ["paragraph", "heading", "image", "quote", "list"].includes(block.type),
  );
  if (validBlocks.length > 0) {
    const { error: insertBlocks } = await svc.from("blog_content_blocks").insert(
      validBlocks.map((block, index) => ({
        post_id: postId,
        block_type: block.type,
        content: {
          text: block.text ?? null,
          items: block.items ?? null,
          image: block.image ? toStoragePath(block.image) : null,
          imageAlt: block.imageAlt ?? null,
        },
        sort_order: index + 1,
      })),
    );
    if (insertBlocks) return insertBlocks.message;
  }

  const { error: delTags } = await svc.from("blog_post_tags").delete().eq("post_id", postId);
  if (delTags) return delTags.message;
  const tagNames = [...new Set(input.tags.map((tag) => tag.trim()).filter(Boolean))];
  for (const name of tagNames) {
    const tagSlug = sanitizeSlug(name) || `tag-${Date.now()}`;
    const { data: existing } = await svc.from("blog_tags").select("id").eq("name", name).maybeSingle();
    let tagId = existing?.id;
    if (!tagId) {
      const { data: createdTag, error: tagError } = await svc
        .from("blog_tags")
        .insert({ name, slug: tagSlug })
        .select("id")
        .single();
      if (tagError) return tagError.message;
      tagId = createdTag.id;
    }
    const { error: linkError } = await svc.from("blog_post_tags").insert({ post_id: postId, tag_id: tagId });
    if (linkError) return linkError.message;
  }
  return null;
}

export async function createPostAction(input: PostInput): Promise<ActionResult<string>> {
  const gate = await requirePermission("blog", "create");
  if (!gate.ok) return gate;
  if (!input.title.trim()) return fail("عنوان المقال مطلوب.");
  const slug = sanitizeSlug(input.slug);
  if (!isValidSlug(slug)) return fail("الرابط (slug) غير صالح.");
  try {
    const svc = getServiceSupabase();
    const publishError = await checkPublication(svc, gate.data, "blog", input.status === "published" ? "published" : "draft");
    if (publishError) return fail(publishError);
    const unique = await uniquePostSlug(svc, slug);
    /* المؤلف: أول ملف شخصي يملك صلاحية blog (تقريب مقبول — المراجعة لاحقًا) */
    const { data: author } = await svc.from("profiles").select("id").limit(1).maybeSingle();
    const { data, error } = await svc
      .from("blog_posts")
      .insert(postRowFromInput(input, unique, author?.id ?? null))
      .select("id")
      .single();
    if (error) return fail(toArabicDbError(error, "إنشاء المقال"));
    const childError = await writePostChildren(svc, data.id, input);
    if (childError) return fail(toArabicDbError(new Error(childError), "حفظ محتوى المقال"));
    refreshed();
    return ok(data.id);
  } catch (error) {
    return fail(toArabicDbError(error, "إنشاء المقال"));
  }
}

export async function updatePostAction(id: string, input: PostInput): Promise<ActionResult<string>> {
  const gate = await requirePermission("blog", "edit");
  if (!gate.ok) return gate;
  if (!input.title.trim()) return fail("عنوان المقال مطلوب.");
  const slug = sanitizeSlug(input.slug);
  if (!isValidSlug(slug)) return fail("الرابط (slug) غير صالح.");
  try {
    const svc = getServiceSupabase();
    const publishError = await checkPublication(svc, gate.data, "blog", input.status === "published" ? "published" : "draft", id);
    if (publishError) return fail(publishError);
    const unique = await uniquePostSlug(svc, slug, id);
    const { data: current } = await svc.from("blog_posts").select("author_id").eq("id", id).maybeSingle();
    const { error } = await svc
      .from("blog_posts")
      .update(postRowFromInput(input, unique, current?.author_id ?? null))
      .eq("id", id);
    if (error) return fail(toArabicDbError(error, "تحديث المقال"));
    const childError = await writePostChildren(svc, id, input);
    if (childError) return fail(toArabicDbError(new Error(childError), "حفظ محتوى المقال"));
    refreshed();
    return ok(id);
  } catch (error) {
    return fail(toArabicDbError(error, "تحديث المقال"));
  }
}

export async function deletePostAction(id: string): Promise<ActionResult<null>> {
  const gate = await requirePermission("blog", "delete");
  if (!gate.ok) return gate;
  try {
    const svc = getServiceSupabase();
    const { error } = await svc.from("blog_posts").delete().eq("id", id);
    if (error) return fail(toArabicDbError(error, "حذف المقال"));
    refreshed();
    return ok(null);
  } catch (error) {
    return fail(toArabicDbError(error, "حذف المقال"));
  }
}

/* ═══════════════════ التقييمات ═══════════════════ */

function testimonialRowFromInput(input: TestimonialInput) {
  return {
    name: input.name.trim(),
    role: input.role ?? null,
    review: input.review,
    rating: Math.min(5, Math.max(1, Math.round(input.rating))),
    source: input.source === "google" ? "google" : "manual",
    source_url: input.sourceUrl ?? null,
    featured: input.featured,
    visible: input.visible,
    reviewed_at: input.date || null,
  };
}

export async function createTestimonialAction(input: TestimonialInput): Promise<ActionResult<string>> {
  const gate = await requirePermission("testimonials", "create");
  if (!gate.ok) return gate;
  if (!input.name.trim() || !input.review.trim()) return fail("اسم المتدرب ونص التقييم مطلوبان.");
  try {
    const svc = getServiceSupabase();
    const { data, error } = await svc.from("testimonials").insert(testimonialRowFromInput(input)).select("id").single();
    if (error) return fail(toArabicDbError(error, "إضافة التقييم"));
    refreshed();
    return ok(data.id);
  } catch (error) {
    return fail(toArabicDbError(error, "إضافة التقييم"));
  }
}

export async function updateTestimonialAction(id: string, input: TestimonialInput): Promise<ActionResult<string>> {
  const gate = await requirePermission("testimonials", "edit");
  if (!gate.ok) return gate;
  if (!input.name.trim() || !input.review.trim()) return fail("اسم المتدرب ونص التقييم مطلوبان.");
  try {
    const svc = getServiceSupabase();
    const { error } = await svc.from("testimonials").update(testimonialRowFromInput(input)).eq("id", id);
    if (error) return fail(toArabicDbError(error, "تحديث التقييم"));
    refreshed();
    return ok(id);
  } catch (error) {
    return fail(toArabicDbError(error, "تحديث التقييم"));
  }
}

export async function deleteTestimonialAction(id: string): Promise<ActionResult<null>> {
  const gate = await requirePermission("testimonials", "delete");
  if (!gate.ok) return gate;
  try {
    const svc = getServiceSupabase();
    const { error } = await svc.from("testimonials").delete().eq("id", id);
    if (error) return fail(toArabicDbError(error, "حذف التقييم"));
    refreshed();
    return ok(null);
  } catch (error) {
    return fail(toArabicDbError(error, "حذف التقييم"));
  }
}

/* ═══════════════════ الوسائط ═══════════════════ */

export async function uploadMediaAction(
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  const gate = await requirePermission("media", "create");
  if (!gate.ok) return gate;

  const file = formData.get("file");
  const folder = String(formData.get("folder") ?? "misc");
  const altText = String(formData.get("altText") ?? "").trim();
  const caption = String(formData.get("caption") ?? "").trim();

  if (!(file instanceof File)) return fail("لم يُرفق أي ملف.");
  if (!["courses", "trainers", "paths", "blog", "homepage", "testimonials", "site", "misc"].includes(folder)) {
    return fail("مجلد الوسائط غير صالح.");
  }
  if (file.size <= 0) return fail("الملف فارغ.");
  if (!["image/jpeg", "image/png", "image/webp", "image/avif"].includes(file.type)) {
    return fail("نوع الصورة غير مدعوم (JPG/PNG/WebP/AVIF فقط).");
  }
  if (file.size > 10 * 1024 * 1024) return fail("حجم الصورة يتجاوز 10 MB.");

  try {
    const svc = getServiceSupabase();
    const extension = file.type === "image/jpeg" ? "jpg" : file.type.split("/")[1] ?? "bin";
    const safeName = file.name.replace(/[^\w\u0600-\u06FF.-]+/g, "-").slice(-80) || "image";
    const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${safeName}.${extension}`;
    const buffer = new Uint8Array(await file.arrayBuffer());

    const { error: uploadError } = await svc.storage
      .from("bm-media")
      .upload(path, buffer, { contentType: file.type, upsert: false });
    if (uploadError) return fail(toArabicDbError(uploadError, "رفع الصورة"));

    /* نص بديل غير إلزامي عند الرفع — يُستكمل لاحقًا من المكتبة (نمط موثق) */
    const { data: row, error: rowError } = await svc
      .from("media")
      .insert({
        bucket: "bm-media",
        storage_path: path,
        file_name: safeName,
        mime_type: file.type,
        size_bytes: file.size,
        alt_text: altText,
        caption: caption || null,
      })
      .select("id")
      .single();
    if (rowError) {
      /* نظّف الكائن اليتيم إن فشل سجل البيانات */
      await svc.storage.from("bm-media").remove([path]);
      return fail(toArabicDbError(rowError, "حفظ بيانات الصورة"));
    }
    refreshed();
    return ok({ id: row.id });
  } catch (error) {
    return fail(toArabicDbError(error, "رفع الصورة"));
  }
}

export async function updateMediaAction(
  id: string,
  patch: { altText?: string; caption?: string },
): Promise<ActionResult<null>> {
  const gate = await requirePermission("media", "edit");
  if (!gate.ok) return gate;
  try {
    const svc = getServiceSupabase();
    const update: Record<string, string | null> = {};
    if (patch.altText !== undefined) update.alt_text = patch.altText.trim();
    if (patch.caption !== undefined) update.caption = patch.caption.trim() || null;
    const { error } = await svc.from("media").update(update).eq("id", id);
    if (error) return fail(toArabicDbError(error, "تحديث بيانات الصورة"));
    refreshed();
    return ok(null);
  } catch (error) {
    return fail(toArabicDbError(error, "تحديث بيانات الصورة"));
  }
}

export async function deleteMediaAction(id: string): Promise<ActionResult<null>> {
  const gate = await requirePermission("media", "delete");
  if (!gate.ok) return gate;
  try {
    const svc = getServiceSupabase();
    const result = await deleteMedia(svc, id);
    if (!result.ok) {
      return fail(result.reason === "referenced"
        ? "لا يمكن حذف الصورة لأنها مستخدمة في محتوى الموقع."
        : "تعذر حذف الصورة — أعد المحاولة.");
    }
    refreshed();
    return ok(null);
  } catch (error) {
    return fail(toArabicDbError(error, "حذف الصورة"));
  }
}

/* ═══════════════════ الصفحة الرئيسية ═══════════════════ */

export async function saveHomepageAction(content: HomepageContent): Promise<ActionResult<null>> {
  const gate = await requirePermission("homepage", "edit");
  if (!gate.ok) return gate;

  try {
    const svc = getServiceSupabase();

    /* الأقسام: upsert بمفتاح القسم */
    for (const [index, section] of content.sections.entries()) {
      const { error } = await svc.from("homepage_sections").upsert(
        { section_key: section.id, enabled: section.enabled, sort_order: index + 1 },
        { onConflict: "section_key" },
      );
      if (error) return fail(toArabicDbError(error, `حفظ قسم ${section.label}`));
    }

    const { error: heroError } = await svc.from("homepage_hero").upsert({
      id: 1,
      title: content.hero.title,
      description: content.hero.description,
      primary_cta_text: content.hero.primaryCta.text,
      primary_cta_url: content.hero.primaryCta.url,
      secondary_cta_text: content.hero.secondaryCta.text,
      secondary_cta_url: content.hero.secondaryCta.url,
      image_path: toStoragePath(content.hero.image),
      image_alt: content.hero.imageAlt,
    });
    if (heroError) return fail(toArabicDbError(heroError, "حفظ القسم الرئيسي"));

    const { error: delStats } = await svc.from("homepage_statistics").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    if (delStats) return fail(toArabicDbError(delStats, "تحديث الإحصائيات"));
    const enabledStats = content.statistics;
    if (enabledStats.length > 0) {
      const { error: statsError } = await svc.from("homepage_statistics").insert(
        enabledStats.map((stat, index) => ({
          label: stat.label,
          value: stat.value,
          prefix: stat.prefix ?? null,
          suffix: stat.suffix ?? null,
          enabled: stat.enabled,
          sort_order: index + 1,
        })),
      );
      if (statsError) return fail(toArabicDbError(statsError, "حفظ الإحصائيات"));
    }

    const { error: upcomingError } = await svc.from("homepage_upcoming_course").upsert({
      id: 1,
      mode: content.upcomingCourse.mode,
      manual_course_id: content.upcomingCourse.manualCourseId ?? null,
      manual_session_id: content.upcomingCourse.manualSessionId ?? null,
    });
    if (upcomingError) return fail(toArabicDbError(upcomingError, "حفظ الدورة القادمة"));

    for (const [index, category] of content.categories.entries()) {
      const { error } = await svc.from("homepage_categories").upsert(
        {
          category_key: category.categoryId,
          title: category.title,
          short_description: category.shortDescription,
          image_path: toStoragePath(category.image),
          image_alt: category.imageAlt ?? null,
          cta_label: category.ctaLabel,
          enabled: category.enabled,
          sort_order: index + 1,
        },
        { onConflict: "category_key" },
      );
      if (error) return fail(toArabicDbError(error, "حفظ بطاقات الفئات"));
    }

    const { error: featuredError } = await svc.from("homepage_featured_courses").upsert({
      id: 1,
      mode: content.featuredCourses.mode,
    });
    if (featuredError) return fail(toArabicDbError(featuredError, "حفظ الدورات المميزة"));
    const { error: delFeatured } = await svc.from("homepage_featured_course_items").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    if (delFeatured) return fail(toArabicDbError(delFeatured, "تحديث الدورات المميزة"));
    if (content.featuredCourses.manualCourseIds.length > 0) {
      const { error: itemsError } = await svc.from("homepage_featured_course_items").insert(
        content.featuredCourses.manualCourseIds.map((courseId, index) => ({
          featured_courses_id: 1,
          course_id: courseId,
          sort_order: index + 1,
        })),
      );
      if (itemsError) return fail(toArabicDbError(itemsError, "حفظ اختيار الدورات المميزة"));
    }

    const { error: whyUsError } = await svc.from("homepage_why_us").upsert({
      id: 1,
      title: content.whyUs.title,
      description: content.whyUs.description,
    });
    if (whyUsError) return fail(toArabicDbError(whyUsError, "حفظ قسم لماذا نحن"));
    const { error: delWhyItems } = await svc.from("homepage_why_us_items").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    if (delWhyItems) return fail(toArabicDbError(delWhyItems, "تحديث عناصر لماذا نحن"));
    if (content.whyUs.items.length > 0) {
      const { error: whyItemsError } = await svc.from("homepage_why_us_items").insert(
        content.whyUs.items.map((item, index) => ({
          title: item.title,
          description: item.description,
          icon_key: item.iconKey ?? null,
          enabled: item.enabled,
          sort_order: index + 1,
        })),
      );
      if (whyItemsError) return fail(toArabicDbError(whyItemsError, "حفظ عناصر لماذا نحن"));
    }

    for (const [group, rows] of [["accreditations", content.accreditations], ["partners", content.partners]] as const) {
      const table = group === "accreditations" ? "homepage_accreditations" : "homepage_partners";
      const { error: delOrgs } = await svc.from(table).delete().neq("id", "00000000-0000-0000-0000-000000000000");
      if (delOrgs) return fail(toArabicDbError(delOrgs, `تحديث ${group === "accreditations" ? "الاعتمادات" : "الشركاء"}`));
      if (rows.length > 0) {
        const { error: orgsError } = await svc.from(table).insert(
          rows.map((org, index) => ({
            name: org.name,
            logo_path: toStoragePath(org.logo),
            url: org.url ?? null,
            description: org.description ?? null,
            visible: org.visible,
            sort_order: index + 1,
          })),
        );
        if (orgsError) return fail(toArabicDbError(orgsError, `حفظ ${group === "accreditations" ? "الاعتمادات" : "الشركاء"}`));
      }
    }

    const { error: hpTestimonialsError } = await svc.from("homepage_testimonials").upsert({
      id: 1,
      title: content.testimonials.title,
      description: content.testimonials.description,
      mode: content.testimonials.mode,
    });
    if (hpTestimonialsError) return fail(toArabicDbError(hpTestimonialsError, "حفظ قسم التقييمات"));
    const { error: delHpTestimonials } = await svc.from("homepage_testimonial_items").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    if (delHpTestimonials) return fail(toArabicDbError(delHpTestimonials, "تحديث اختيار التقييمات"));
    if (content.testimonials.manualIds.length > 0) {
      const { error: hpItemsError } = await svc.from("homepage_testimonial_items").insert(
        content.testimonials.manualIds.map((testimonialId, index) => ({
          testimonials_section_id: 1,
          testimonial_id: testimonialId,
          sort_order: index + 1,
        })),
      );
      if (hpItemsError) return fail(toArabicDbError(hpItemsError, "حفظ اختيار التقييمات"));
    }

    const { error: ctaError } = await svc.from("homepage_cta").upsert({
      id: 1,
      title: content.cta.title,
      description: content.cta.description,
      primary_cta_text: content.cta.primaryCta.text,
      primary_cta_url: content.cta.primaryCta.url,
      secondary_cta_text: content.cta.secondaryCta.text,
      secondary_cta_url: content.cta.secondaryCta.url,
      background_image_path: content.cta.backgroundImage ? toStoragePath(content.cta.backgroundImage) : null,
      background_image_alt: content.cta.backgroundImageAlt ?? null,
    });
    if (ctaError) return fail(toArabicDbError(ctaError, "حفظ قسم دعوة الإجراء"));

    refreshed();
    return ok(null);
  } catch (error) {
    return fail(toArabicDbError(error, "حفظ الصفحة الرئيسية"));
  }
}
