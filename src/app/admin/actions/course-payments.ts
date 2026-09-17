"use server";

/**
 * وسائل الدفع المتاحة لدورة — تُحفظ فورًا ومستقلة عن حفظ الدورة.
 *
 * لماذا مستقلة: حفظ الدورة يمر بـ`save_course_atomic` بقائمة أعمدة ثابتة،
 * وهذه وسائل في جدول آخر. خلطهما يعني توسيع أخطر دالة في المشروع لأجل
 * ثلاثة مربّعات اختيار.
 *
 * لا مفاتيح هنا ولا أسرار: المفاتيح في بيئة الخادم وحدها، وهذه الشاشة
 * تقول «أيّ وسيلة تُعرض» لا «بأي مفتاح».
 */

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requirePermission } from "@/lib/admin/session";
import { fail, ok, toArabicDbError, type ActionResult } from "@/lib/cms/result";
import { getServiceSupabase } from "@/lib/supabase/service";
import { providerSchema, type Provider } from "@/lib/payments/settings";
import { isCorporateCourse, providerConfigured } from "@/lib/payments/purchase";

/** المزودون الجاهزون فعلًا. تابي وتمارا في النموذج لا في الإنتاج بعد. */
const AVAILABLE: Provider[] = ["moyasar"];

const uuid = z.string().uuid("معرّف الدورة غير صالح.");
const selectionSchema = z.array(providerSchema).max(3);

export interface CoursePaymentMethodsView {
  providers: Provider[];
  /** المزودون الذين تعمل واجهتهم وإعدادهم مكتمل على الخادم. */
  available: Provider[];
  /** مفعّل في الشاشة لكن إعداده ناقص على الخادم — يُعرض للمحرر لا للطالب. */
  unconfigured: Provider[];
}

export async function loadCoursePaymentMethodsAction(
  courseId: unknown,
): Promise<ActionResult<CoursePaymentMethodsView>> {
  const gate = await requirePermission("courses", "view");
  if (!gate.ok) return gate;
  const parsed = uuid.safeParse(courseId);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "معرّف غير صالح.");

  const { data, error } = await getServiceSupabase()
    .from("course_payment_methods")
    .select("provider, enabled, sort_order")
    .eq("course_id", parsed.data)
    .order("sort_order", { ascending: true });
  if (error) return fail(toArabicDbError(error, "قراءة وسائل الدفع"));

  const providers = (data ?? []).filter((row) => row.enabled).map((row) => row.provider as Provider);
  return ok({
    providers,
    available: AVAILABLE.filter((provider) => providerConfigured(provider)),
    unconfigured: providers.filter((provider) => !providerConfigured(provider)),
  });
}

/**
 * يستبدل قائمة الوسائل المفعّلة للدورة.
 * الاستبدال الكامل مقصود: الشاشة تعرض الحالة النهائية، فتُحفظ كما تُرى.
 */
export async function saveCoursePaymentMethodsAction(
  courseId: unknown,
  providers: unknown,
): Promise<ActionResult<null>> {
  const gate = await requirePermission("courses", "edit");
  if (!gate.ok) return gate;
  const parsedId = uuid.safeParse(courseId);
  if (!parsedId.success) return fail(parsedId.error.issues[0]?.message ?? "معرّف غير صالح.");
  const parsedProviders = selectionSchema.safeParse(providers);
  if (!parsedProviders.success) return fail("وسيلة دفع غير معروفة.");

  const selected = [...new Set(parsedProviders.data)];
  const unavailable = selected.filter((provider) => !AVAILABLE.includes(provider));
  if (unavailable.length > 0) return fail("هذه الوسيلة لم تُفعَّل بعد على المنصة.");

  const svc = getServiceSupabase();

  /* حالة متناقضة تُمنع في الخادم لا في الشاشة: دورة شركات بوسيلة دفع مفعّلة
     تعني زر شراء لبرنامج لا يُشترى ذاتيًا. القرار يُقرأ من الصف المحفوظ،
     لا من مسودة المحرر. */
  const { data: course, error: courseError } = await svc
    .from("courses")
    .select("category, request_quote")
    .eq("id", parsedId.data)
    .maybeSingle();
  if (courseError || !course) return fail("لم يُعثر على الدورة.");
  if (selected.length > 0 && isCorporateCourse(course)) {
    return fail("تدريب الشركات لا يقبل وسائل دفع ذاتية — التسجيل بالتواصل المباشر.");
  }
  const { error: deleteError } = await svc
    .from("course_payment_methods")
    .delete()
    .eq("course_id", parsedId.data);
  if (deleteError) return fail(toArabicDbError(deleteError, "حفظ وسائل الدفع"));

  if (selected.length > 0) {
    const { error } = await svc.from("course_payment_methods").insert(
      selected.map((provider, index) => ({
        course_id: parsedId.data,
        provider,
        enabled: true,
        sort_order: index,
      })),
    );
    if (error) return fail(toArabicDbError(error, "حفظ وسائل الدفع"));
  }

  revalidatePath("/courses", "layout");
  revalidatePath("/admin/courses", "layout");
  return ok(null);
}
