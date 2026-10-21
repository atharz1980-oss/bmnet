"use server";

/**
 * تأجير المعدات — إجراءات الإدارة.
 *
 * كلها خلف `requirePermission("equipment", …)` القائمة، والكتابة بعميل
 * الخدمة (لا جدول من هذه الجداول يقبل كتابة متصفح أصلًا). التصنيفات
 * والمعدات والصور تُحفظ من اللوحة، وإجراءات الإيجار (التحقق من الهوية،
 * سند الضمان، المحاضر، الإلغاء، الإغلاق) تُفوَّض إلى `lib/rentals/bookings`
 * حيث شروط التسليم بوابات صارمة.
 */

import { revalidatePath } from "next/cache";
import { invalidateCmsCache } from "./cache-invalidate";
import { z } from "zod";

import { requirePermission } from "@/lib/admin/session";
import { toStoragePath } from "@/lib/cms/mappers";
import { fail, ok, toArabicDbError, type ActionResult } from "@/lib/cms/result";
import {
  cancelEquipmentRental,
  closeEquipmentRental,
  failRentalIdentity,
  markRentalCustomerNotified,
  recordEquipmentHandover,
  recordEquipmentReturn,
  updateSecurityNote,
  verifyRentalIdentity,
} from "@/lib/rentals/bookings";
import { MEDIA_BUCKET } from "@/lib/supabase/media-storage";
import { getServiceSupabase } from "@/lib/supabase/service";

const uuid = z.string().uuid("معرّف غير صالح.");

function touched() {
  /* الإبطال أولًا: إعادة البناء تقرأ من كاش البيانات. */
  invalidateCmsCache();
  revalidatePath("/admin/equipment", "layout");
  revalidatePath("/admin/equipment-rentals", "layout");
  revalidatePath("/admin/equipment-agreements", "layout");
  revalidatePath("/rentals", "layout");
}

function firstIssue(error: z.ZodError): string {
  return error.issues[0]?.message ?? "بيانات غير صالحة.";
}

/* ─────────────────────────── التصنيفات ─────────────────────────── */

const categorySchema = z.object({
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .min(2, "أدخل رابطًا للتصنيف بالحروف الإنجليزية.")
    .max(80, "الرابط طويل.")
    .regex(/^[a-z0-9][a-z0-9-]{1,79}$/, "الرابط يبدأ بحرف أو رقم ويقبل الحروف الصغيرة والأرقام والشرطة فقط."),
  name: z.string().trim().min(2, "أدخل اسم التصنيف.").max(120, "الاسم طويل."),
  description: z.string().trim().max(1000, "الوصف طويل.").default(""),
  iconKey: z.string().trim().max(40, "مفتاح الأيقونة طويل.").default(""),
  sortOrder: z.coerce.number().int().min(0).max(9999).default(0),
  published: z.boolean().default(true),
});

async function categorySlugTaken(slug: string, exceptId: string | null): Promise<boolean> {
  const { data } = await getServiceSupabase().from("equipment_categories").select("id").eq("slug", slug).maybeSingle();
  if (!data) return false;
  return data.id !== exceptId;
}

export async function createEquipmentCategoryAction(input: unknown): Promise<ActionResult<string>> {
  const gate = await requirePermission("equipment", "create");
  if (!gate.ok) return gate;
  const parsed = categorySchema.safeParse(input);
  if (!parsed.success) return fail(firstIssue(parsed.error));
  if (await categorySlugTaken(parsed.data.slug, null)) {
    return fail("هذا الرابط مستخدم لتصنيف آخر — اختر رابطًا مختلفًا.");
  }
  const { data, error } = await getServiceSupabase()
    .from("equipment_categories")
    .insert({
      slug: parsed.data.slug,
      name: parsed.data.name,
      description: parsed.data.description,
      icon_key: parsed.data.iconKey,
      sort_order: parsed.data.sortOrder,
      published: parsed.data.published,
    })
    .select("id")
    .maybeSingle();
  if (error || !data) return fail(toArabicDbError(error, "إنشاء التصنيف"));
  touched();
  return ok(data.id);
}

export async function updateEquipmentCategoryAction(categoryId: string, input: unknown): Promise<ActionResult<null>> {
  const gate = await requirePermission("equipment", "edit");
  if (!gate.ok) return gate;
  if (!uuid.safeParse(categoryId).success) return fail("معرّف التصنيف غير صالح.");
  const parsed = categorySchema.safeParse(input);
  if (!parsed.success) return fail(firstIssue(parsed.error));
  if (await categorySlugTaken(parsed.data.slug, categoryId)) {
    return fail("هذا الرابط مستخدم لتصنيف آخر — اختر رابطًا مختلفًا.");
  }
  const { error } = await getServiceSupabase()
    .from("equipment_categories")
    .update({
      slug: parsed.data.slug,
      name: parsed.data.name,
      description: parsed.data.description,
      icon_key: parsed.data.iconKey,
      sort_order: parsed.data.sortOrder,
      published: parsed.data.published,
    })
    .eq("id", categoryId);
  if (error) return fail(toArabicDbError(error, "تعديل التصنيف"));
  touched();
  return ok(null);
}

export async function deleteEquipmentCategoryAction(categoryId: string): Promise<ActionResult<null>> {
  const gate = await requirePermission("equipment", "delete");
  if (!gate.ok) return gate;
  if (!uuid.safeParse(categoryId).success) return fail("معرّف التصنيف غير صالح.");
  const { data: items } = await getServiceSupabase()
    .from("equipment_items")
    .select("id")
    .eq("category_id", categoryId)
    .limit(1);
  if ((items ?? []).length > 0) {
    return fail("لهذا التصنيف معدات قائمة. انقل المعدات أو أخفِ التصنيف بدل حذفه.");
  }
  const { error } = await getServiceSupabase().from("equipment_categories").delete().eq("id", categoryId);
  if (error) return fail(toArabicDbError(error, "حذف التصنيف"));
  touched();
  return ok(null);
}

/* ─────────────────────────── المعدات ─────────────────────────── */

const specSchema = z.object({
  label: z.string().trim().min(1, "اسم المواصفة فارغ.").max(80, "اسم المواصفة طويل."),
  value: z.string().trim().min(1, "قيمة المواصفة فارغة.").max(200, "قيمة المواصفة طويلة."),
});

const itemSchema = z.object({
  categoryId: uuid,
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .min(2, "أدخل رابطًا للمعدة بالحروف الإنجليزية.")
    .max(80, "الرابط طويل.")
    .regex(/^[a-z0-9][a-z0-9-]{1,79}$/, "الرابط يبدأ بحرف أو رقم ويقبل الحروف الصغيرة والأرقام والشرطة فقط."),
  name: z.string().trim().min(2, "أدخل اسم المعدة.").max(160, "الاسم طويل."),
  shortDescription: z.string().trim().max(300, "الوصف المختصر طويل.").default(""),
  description: z.string().trim().max(5000, "الوصف طويل جدًا.").default(""),
  sku: z.string().trim().max(60, "رمز الصنف طويل.").default(""),
  serialNumber: z.string().trim().max(120, "السيريال طويل.").default(""),
  quantity: z.coerce.number().int().min(0, "الكمية لا تكون سالبة.").max(9999, "الكمية كبيرة جدًا."),
  pricePerDaySar: z.coerce.number().min(1, "أدخل سعر اليوم بالريال (1 ريال على الأقل).").max(1_000_000, "السعر كبير جدًا."),
  replacementValueSar: z.coerce.number().min(0, "قيمة الاستبدال لا تكون سالبة.").max(1_000_000, "القيمة كبيرة جدًا.").default(0),
  specs: z.array(specSchema).max(40, "عدد المواصفات كبير جدًا.").default([]),
  status: z.enum(["available", "rented", "maintenance", "retired"], { message: "حالة غير صالحة." }),
  requiresSecurityNote: z.boolean().default(false),
  featured: z.boolean().default(false),
  published: z.boolean().default(false),
});

async function itemSlugTaken(slug: string, exceptId: string | null): Promise<boolean> {
  const { data } = await getServiceSupabase().from("equipment_items").select("id").eq("slug", slug).maybeSingle();
  if (!data) return false;
  return data.id !== exceptId;
}

function itemColumns(input: z.infer<typeof itemSchema>) {
  return {
    category_id: input.categoryId,
    slug: input.slug,
    name: input.name,
    short_description: input.shortDescription,
    description: input.description,
    sku: input.sku,
    serial_number: input.serialNumber,
    quantity: input.quantity,
    price_per_day_halalas: Math.round(input.pricePerDaySar * 100),
    replacement_value_halalas: Math.round(input.replacementValueSar * 100),
    specs: input.specs,
    status: input.status,
    requires_security_note: input.requiresSecurityNote,
    featured: input.featured,
    published: input.published,
  };
}

export async function createEquipmentItemAction(input: unknown): Promise<ActionResult<string>> {
  const gate = await requirePermission("equipment", "create");
  if (!gate.ok) return gate;
  const parsed = itemSchema.safeParse(input);
  if (!parsed.success) return fail(firstIssue(parsed.error));
  if (await itemSlugTaken(parsed.data.slug, null)) {
    return fail("هذا الرابط مستخدم لمعدة أخرى — اختر رابطًا مختلفًا.");
  }
  const { data, error } = await getServiceSupabase()
    .from("equipment_items")
    .insert(itemColumns(parsed.data))
    .select("id")
    .maybeSingle();
  if (error || !data) return fail(toArabicDbError(error, "إنشاء المعدة"));
  touched();
  return ok(data.id);
}

export async function updateEquipmentItemAction(itemId: string, input: unknown): Promise<ActionResult<null>> {
  const gate = await requirePermission("equipment", "edit");
  if (!gate.ok) return gate;
  if (!uuid.safeParse(itemId).success) return fail("معرّف المعدة غير صالح.");
  const parsed = itemSchema.safeParse(input);
  if (!parsed.success) return fail(firstIssue(parsed.error));
  if (await itemSlugTaken(parsed.data.slug, itemId)) {
    return fail("هذا الرابط مستخدم لمعدة أخرى — اختر رابطًا مختلفًا.");
  }
  const { error } = await getServiceSupabase().from("equipment_items").update(itemColumns(parsed.data)).eq("id", itemId);
  if (error) return fail(toArabicDbError(error, "تعديل المعدة"));
  touched();
  return ok(null);
}

/** حذف معدة نهائيًا: تُرفض إن كانت لها إيجارات (السجل المالي لا يُمحى). */
export async function deleteEquipmentItemAction(itemId: string): Promise<ActionResult<null>> {
  const gate = await requirePermission("equipment", "delete");
  if (!gate.ok) return gate;
  if (!uuid.safeParse(itemId).success) return fail("معرّف المعدة غير صالح.");
  const svc = getServiceSupabase();
  const { data: rentals } = await svc.from("equipment_rentals").select("id").eq("item_id", itemId).limit(1);
  if ((rentals ?? []).length > 0) {
    return fail("لهذه المعدة إيجارات قائمة. أخفِها بدل حذفها — السجلات المالية تبقى ولا تُمحى.");
  }
  const { data: images } = await svc.from("equipment_images").select("storage_path").eq("item_id", itemId);
  const paths = (images ?? []).map((row) => row.storage_path);
  const { error } = await svc.from("equipment_items").delete().eq("id", itemId);
  if (error) return fail(toArabicDbError(error, "حذف المعدة"));
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

/* ─────────────────────────── صور المعدة ─────────────────────────── */

const imageListSchema = z
  .array(
    z.object({
      url: z.string().trim().min(1, "مسار الصورة فارغ.").max(1024, "مسار الصورة طويل."),
      alt: z.string().trim().max(200, "النص البديل طويل.").default(""),
    }),
  )
  .max(20, "معرض المعدة يقبل 20 صورة كحد أقصى.");

export async function saveEquipmentImagesAction(itemId: string, input: unknown): Promise<ActionResult<null>> {
  const gate = await requirePermission("equipment", "edit");
  if (!gate.ok) return gate;
  if (!uuid.safeParse(itemId).success) return fail("معرّف المعدة غير صالح.");
  const parsed = imageListSchema.safeParse(input);
  if (!parsed.success) return fail(firstIssue(parsed.error));

  const seen = new Set<string>();
  const rows: { item_id: string; storage_path: string; alt_text: string; sort_order: number }[] = [];
  for (const [index, image] of parsed.data.entries()) {
    const path = toStoragePath(image.url);
    if (!path || seen.has(path)) continue;
    seen.add(path);
    rows.push({ item_id: itemId, storage_path: path, alt_text: image.alt, sort_order: index });
  }

  const svc = getServiceSupabase();
  const { error: clearError } = await svc.from("equipment_images").delete().eq("item_id", itemId);
  if (clearError) return fail(toArabicDbError(clearError, "حفظ صور المعدة"));
  if (rows.length > 0) {
    const { error } = await svc.from("equipment_images").insert(rows);
    if (error) return fail(toArabicDbError(error, "حفظ صور المعدة"));
  }
  touched();
  return ok(null);
}

/* ─────────────────────────── عقود الإيجار ─────────────────────────── */

const agreementSchema = z.object({
  version: z.coerce.number().int().min(1, "رقم الإصدار يبدأ من 1.").max(100000, "رقم الإصدار كبير."),
  title: z.string().trim().min(2, "أدخل عنوان العقد.").max(200, "العنوان طويل."),
  body: z.string().trim().min(20, "نص العقد قصير جدًا.").max(40000, "نص العقد طويل جدًا."),
  active: z.boolean().default(true),
});

export async function createEquipmentAgreementAction(input: unknown): Promise<ActionResult<string>> {
  const gate = await requirePermission("equipment", "create");
  if (!gate.ok) return gate;
  const parsed = agreementSchema.safeParse(input);
  if (!parsed.success) return fail(firstIssue(parsed.error));
  const { data, error } = await getServiceSupabase()
    .from("equipment_agreements")
    .insert({ version: parsed.data.version, title: parsed.data.title, body: parsed.data.body, active: parsed.data.active })
    .select("id")
    .maybeSingle();
  if (error || !data) return fail(toArabicDbError(error, "إنشاء إصدار العقد"));
  touched();
  return ok(data.id);
}

export async function updateEquipmentAgreementAction(agreementId: string, input: unknown): Promise<ActionResult<null>> {
  const gate = await requirePermission("equipment", "edit");
  if (!gate.ok) return gate;
  if (!uuid.safeParse(agreementId).success) return fail("معرّف العقد غير صالح.");
  const parsed = agreementSchema.safeParse(input);
  if (!parsed.success) return fail(firstIssue(parsed.error));
  /* نص العقد في إصدار مقبول لا يُعاد كتابته: الإصدار سجل قانوني ثابت.
     التعديل يقتصر على العنوان والتفعيل؛ التغيير الجوهري يُنشئ إصدارًا جديدًا. */
  const { data: existing } = await getServiceSupabase()
    .from("equipment_agreements")
    .select("id, body")
    .eq("id", agreementId)
    .maybeSingle();
  if (!existing) return fail("الإصدار غير موجود.");
  if (existing.body !== parsed.data.body) {
    return fail("لا يُعدَّل نص إصدار مقبول — أنشئ إصدارًا جديدًا بالنص المعدّل.");
  }
  const { error } = await getServiceSupabase()
    .from("equipment_agreements")
    .update({ version: parsed.data.version, title: parsed.data.title, active: parsed.data.active })
    .eq("id", agreementId);
  if (error) return fail(toArabicDbError(error, "تعديل العقد"));
  touched();
  return ok(null);
}

/** تفعيل إصدار واحد وإلغاء تفعيل البقية — يُعرض ويُوقَّع إصدار واحد فقط. */
export async function activateEquipmentAgreementAction(agreementId: string): Promise<ActionResult<null>> {
  const gate = await requirePermission("equipment", "edit");
  if (!gate.ok) return gate;
  if (!uuid.safeParse(agreementId).success) return fail("معرّف العقد غير صالح.");
  const svc = getServiceSupabase();
  const { data: target } = await svc.from("equipment_agreements").select("id").eq("id", agreementId).maybeSingle();
  if (!target) return fail("الإصدار غير موجود.");
  const { error: clearError } = await svc.from("equipment_agreements").update({ active: false }).eq("active", true);
  if (clearError) return fail(toArabicDbError(clearError, "تفعيل العقد"));
  const { error } = await svc.from("equipment_agreements").update({ active: true }).eq("id", agreementId);
  if (error) return fail(toArabicDbError(error, "تفعيل العقد"));
  touched();
  return ok(null);
}

/* ─────────────────────────── إجراءات الإيجار ─────────────────────────── */

const identitySchema = z.object({
  reference: z.string().trim().min(1, "أدخل مرجع التحقق (رقم الطلب أو صورة الهوية).").max(200, "المرجع طويل."),
  note: z.string().trim().max(1000, "الملاحظة طويلة.").nullable().default(null),
});

export async function verifyEquipmentIdentityAction(rentalId: string, input: unknown): Promise<ActionResult<null>> {
  const gate = await requirePermission("equipment", "manage");
  if (!gate.ok) return gate;
  if (!uuid.safeParse(rentalId).success) return fail("معرّف الإيجار غير صالح.");
  const parsed = identitySchema.safeParse(input);
  if (!parsed.success) return fail(firstIssue(parsed.error));
  const result = await verifyRentalIdentity(rentalId, gate.data.userId, {
    reference: parsed.data.reference,
    note: parsed.data.note,
  });
  if (!result.ok) return fail(result.error);
  touched();
  return ok(null);
}

export async function failEquipmentIdentityAction(rentalId: string, note: unknown): Promise<ActionResult<null>> {
  const gate = await requirePermission("equipment", "manage");
  if (!gate.ok) return gate;
  if (!uuid.safeParse(rentalId).success) return fail("معرّف الإيجار غير صالح.");
  const parsed = z.string().trim().min(1, "أدخل سبب تعذّر التحقق.").max(1000, "الملاحظة طويلة.").safeParse(note);
  if (!parsed.success) return fail(firstIssue(parsed.error));
  const result = await failRentalIdentity(rentalId, gate.data.userId, parsed.data);
  if (!result.ok) return fail(result.error);
  touched();
  return ok(null);
}

const securityNoteSchema = z.object({
  status: z.enum(["requested", "approved", "rejected", "expired", "released"], { message: "حالة سند غير صالحة." }),
  providerReference: z.string().trim().min(1, "أدخل مرجع عملية نافذ.").max(200, "المرجع طويل."),
  providerStatusText: z.string().trim().max(300, "النص طويل.").default(""),
  note: z.string().trim().max(2000, "الملاحظة طويلة.").nullable().default(null),
});

export async function updateEquipmentSecurityNoteAction(rentalId: string, input: unknown): Promise<ActionResult<null>> {
  const gate = await requirePermission("equipment", "manage");
  if (!gate.ok) return gate;
  if (!uuid.safeParse(rentalId).success) return fail("معرّف الإيجار غير صالح.");
  const parsed = securityNoteSchema.safeParse(input);
  if (!parsed.success) return fail(firstIssue(parsed.error));
  const result = await updateSecurityNote(rentalId, gate.data.userId, {
    status: parsed.data.status,
    providerReference: parsed.data.providerReference,
    providerStatusText: parsed.data.providerStatusText,
    note: parsed.data.note,
  });
  if (!result.ok) return fail(result.error);
  touched();
  return ok(null);
}

const inspectionSchema = z.object({
  serialNumber: z.string().trim().max(120, "السيريال طويل.").default(""),
  checklist: z
    .array(
      z.object({
        label: z.string().trim().min(1, "بند التحقق فارغ.").max(80, "بند التحقق طويل."),
        ok: z.boolean().default(true),
        note: z.string().trim().max(300, "الملاحظة طويلة.").default(""),
      }),
    )
    .max(60, "عدد بنود التحقق كبير.")
    .default([]),
  accessories: z.string().trim().max(2000, "قائمة الملحقات طويلة.").default(""),
  media: z
    .array(
      z.object({
        path: z.string().trim().min(1, "مسار الوسيط فارغ.").max(1024, "مسار الوسيط طويل."),
        kind: z.enum(["image", "video"], { message: "نوع وسيط غير صالح." }),
      }),
    )
    .max(30, "عدد الوسائط كبير.")
    .default([]),
  acknowledgedByName: z.string().trim().min(2, "أدخل اسم المستلم.").max(120, "الاسم طويل."),
  acknowledgedById: z.string().trim().regex(/^[0-9]{10}$/, "رقم هوية المستلم عشرة أرقام."),
  damageNote: z.string().trim().max(2000, "ملاحظة التلف طويلة.").nullable().default(null),
});

export async function recordEquipmentHandoverAction(rentalId: string, input: unknown): Promise<ActionResult<null>> {
  const gate = await requirePermission("equipment", "manage");
  if (!gate.ok) return gate;
  if (!uuid.safeParse(rentalId).success) return fail("معرّف الإيجار غير صالح.");
  const parsed = inspectionSchema.safeParse(input);
  if (!parsed.success) return fail(firstIssue(parsed.error));
  const result = await recordEquipmentHandover(rentalId, gate.data.userId, parsed.data);
  if (!result.ok) return fail(result.error);
  touched();
  return ok(null);
}

export async function recordEquipmentReturnAction(rentalId: string, input: unknown): Promise<ActionResult<null>> {
  const gate = await requirePermission("equipment", "manage");
  if (!gate.ok) return gate;
  if (!uuid.safeParse(rentalId).success) return fail("معرّف الإيجار غير صالح.");
  const parsed = inspectionSchema.safeParse(input);
  if (!parsed.success) return fail(firstIssue(parsed.error));
  const result = await recordEquipmentReturn(rentalId, gate.data.userId, parsed.data);
  if (!result.ok) return fail(result.error);
  touched();
  return ok(null);
}

export async function closeEquipmentRentalAction(rentalId: string): Promise<ActionResult<null>> {
  const gate = await requirePermission("equipment", "manage");
  if (!gate.ok) return gate;
  if (!uuid.safeParse(rentalId).success) return fail("معرّف الإيجار غير صالح.");
  const result = await closeEquipmentRental(rentalId, gate.data.userId);
  if (!result.ok) return fail(result.error);
  touched();
  return ok(null);
}

export async function cancelEquipmentRentalAction(rentalId: string, note: unknown): Promise<ActionResult<null>> {
  const gate = await requirePermission("equipment", "manage");
  if (!gate.ok) return gate;
  if (!uuid.safeParse(rentalId).success) return fail("معرّف الإيجار غير صالح.");
  const parsed = z.string().trim().max(1000, "الملاحظة طويلة.").nullable().safeParse(note ?? null);
  const result = await cancelEquipmentRental(rentalId, gate.data.userId, parsed.success ? parsed.data : null);
  if (!result.ok) return fail(result.error);
  touched();
  return ok(null);
}

export async function markEquipmentRentalNotifiedAction(rentalId: string): Promise<ActionResult<null>> {
  const gate = await requirePermission("equipment", "manage");
  if (!gate.ok) return gate;
  if (!uuid.safeParse(rentalId).success) return fail("معرّف الإيجار غير صالح.");
  const result = await markRentalCustomerNotified(rentalId, gate.data.userId);
  if (!result.ok) return fail(result.error);
  touched();
  return ok(null);
}
