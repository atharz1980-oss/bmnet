/**
 * قرار الوصول إلى الدرس — دالة خالصة.
 *
 * أُخرج القرار من الصفحة عمدًا: قاعدة أمان مبعثرة بين شروط JSX لا تُختبر
 * إلا بتشغيل كامل بقاعدة بيانات. هنا تُغذّى بالحقائق وتُعيد حكمًا، فيمكن
 * تغطية كل تركيبة (زائر/عضو/حالات التسجيل الخمس × نشر الدورة والوحدة
 * والدرس × المعاينة) باختبار حتمي بلا شبكة.
 *
 * القواعد بترتيب الأسبقية:
 *  1. النشر بوابة مطلقة على ثلاثة مستويات: الدورة، الوحدة، الدرس. المسودة
 *     لا تُعرض لأحد من هذا المسار — ولا `free_preview` يتجاوزها.
 *  2. `free_preview` تعني «لا يحتاج تسجيلًا»، لا شيء غير ذلك.
 *  3. الوصول المدفوع يلزمه تسجيل حالته `active` غير منتهٍ. وجود الصف وحده
 *     لا يكفي: المعلّق والملغى والمسترد والمنتهي كلها رفض.
 *  4. التسجيل في الموقع وحده لا يمنح شيئًا.
 */

export const ENROLLMENT_STATUSES = [
  "pending",
  "active",
  "cancelled",
  "expired",
  "refunded",
] as const;

export type EnrollmentStatus = (typeof ENROLLMENT_STATUSES)[number];

/** الحالة الوحيدة التي تفتح محتوى مدفوعًا. */
export const ACCESS_GRANTING_STATUS: EnrollmentStatus = "active";

export interface EnrollmentFacts {
  status: EnrollmentStatus;
  /** null = وصول دائم. */
  expiresAt: string | null;
}

export interface LessonAccessFacts {
  coursePublished: boolean;
  modulePublished: boolean;
  lessonPublished: boolean;
  freePreview: boolean;
  /** معرّف العضو، أو null للزائر. */
  viewerId: string | null;
  /** تسجيل هذا العضو في هذه الدورة، أو null إن لم يوجد. */
  enrollment: EnrollmentFacts | null;
}

export type AccessDecision =
  /** غير موجود من منظور هذا الزائر — لا نكشف وجود مسودة. */
  | { outcome: "not-found"; reason: "course-draft" | "module-draft" | "lesson-draft" }
  /** زائر بلا حساب أمام محتوى يحتاج تسجيلًا — يُرسل للدخول ويعود. */
  | { outcome: "sign-in" }
  /** عضو بلا تسجيل فعّال — يُعرض له سبب واضح لا 404 مضلّل. */
  | { outcome: "locked"; reason: "no-enrollment" | EnrollmentStatus }
  | { outcome: "allow"; reason: "free-preview" | "enrolled" };

/** هل هذا التسجيل يفتح المحتوى الآن؟ */
export function enrollmentGrantsAccess(
  enrollment: EnrollmentFacts | null,
  now: Date = new Date(),
): boolean {
  if (!enrollment) return false;
  if (enrollment.status !== ACCESS_GRANTING_STATUS) return false;
  if (enrollment.expiresAt === null) return true;
  const expiry = new Date(enrollment.expiresAt).getTime();
  /* تاريخ غير صالح يُعامل كمنتهٍ — لا نفتح على شك. */
  if (!Number.isFinite(expiry)) return false;
  return expiry > now.getTime();
}

export function decideLessonAccess(
  facts: LessonAccessFacts,
  now: Date = new Date(),
): AccessDecision {
  /* 1. النشر أولًا، وقبل أي اعتبار للهوية أو التسجيل. */
  if (!facts.coursePublished) return { outcome: "not-found", reason: "course-draft" };
  if (!facts.modulePublished) return { outcome: "not-found", reason: "module-draft" };
  if (!facts.lessonPublished) return { outcome: "not-found", reason: "lesson-draft" };

  /* 2. المعاينة تعفي من التسجيل — بعد اجتياز النشر لا قبله. */
  if (facts.freePreview) return { outcome: "allow", reason: "free-preview" };

  /* 3. محتوى يحتاج تسجيلًا. */
  if (!facts.viewerId) return { outcome: "sign-in" };
  if (!facts.enrollment) return { outcome: "locked", reason: "no-enrollment" };
  if (enrollmentGrantsAccess(facts.enrollment, now)) {
    return { outcome: "allow", reason: "enrolled" };
  }
  /* حالة صريحة تُعرض للعضو: «ملغى» أوضح من «لا تملك وصولًا». */
  return { outcome: "locked", reason: facts.enrollment.status };
}

/** نص عربي لسبب الحجب — للعرض، لا للقرار. */
export function lockedMessage(reason: "no-enrollment" | EnrollmentStatus): string {
  switch (reason) {
    case "pending":
      return "تسجيلك في هذه الدورة قيد التأكيد. سيُفتح المحتوى فور اكتماله.";
    case "cancelled":
      return "أُلغي تسجيلك في هذه الدورة.";
    case "refunded":
      return "استُرد مبلغ هذه الدورة، ولذلك أُغلق محتواها.";
    case "expired":
      return "انتهت مدة وصولك إلى هذه الدورة.";
    case "active":
      /* نُخرجها فقط حين تكون active لكن منتهية الصلاحية بالتاريخ. */
      return "انتهت مدة وصولك إلى هذه الدورة.";
    default:
      return "لم يُفتح لك محتوى هذه الدورة بعد.";
  }
}
