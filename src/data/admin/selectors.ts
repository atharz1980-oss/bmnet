/**
 * بيت المصور — Selectors طبقة الإدارة
 * ------------------------------------
 * دوال حسابية نقية (Pure) فوق بيانات الـ CMS.
 * القيم المحسوبة تُحسب هنا ولا تُخزَّن أبدًا — تفاديًا للتضارب
 * عند تغيير الأسعار أو المقاعد (قرار معماري: memory.md — D-09).
 */

import type {
  AdminBlogPost,
  AdminCourse,
  AdminData,
  AdminModule,
  AdminTestimonial,
  AdminTrainer,
  AdminUser,
  AdminLearningPath,
  CorporateRequest,
  CourseSession,
  MediaItem,
  PermissionAction,
  Role,
  RolePermissions,
  UpcomingCourseSettings,
} from "./types";
import { applyDiscount } from "@/lib/format";

/* ─────────────────────────── الجلسات ─────────────────────────── */

/** المقاعد المتبقية = المقاعد − المسجلون (لا تُخزن) */
export function getSessionRemainingSeats(session: CourseSession): number {
  return Math.max(0, session.seats - session.registered);
}

/** نسبة الامتلاء 0–100 للعرض في Progress Bars */
export function getSessionFillPercent(session: CourseSession): number {
  if (session.seats <= 0) return 100;
  return Math.min(100, Math.round((session.registered / session.seats) * 100));
}

/** السعر الفعلي للجلسة: سعر الدفعة إن وجد وإلا سعر الدورة */
export function getSessionEffectivePrice(session: CourseSession, course: AdminCourse): number {
  return session.price ?? course.pricing.price;
}

/* ─────────────────────────── المسارات ─────────────────────────── */

export interface PathPricingResult {
  coursesCount: number;
  originalTotal: number;
  discountPercent: number;
  discountValue: number;
  finalPrice: number;
}

/**
 * حسابات تسعير المسار — تُحسب من أسعار الدورات المرتبطة لحظيًا:
 * إجمالي الأسعار ← قيمة الخصم ← السعر النهائي.
 */
export function getPathPricing(
  path: Pick<AdminLearningPath, "courseIds" | "discountPercent">,
  courses: AdminCourse[],
): PathPricingResult {
  const linkedCourses = path.courseIds
    .map((id) => courses.find((course) => course.id === id))
    .filter((course): course is AdminCourse => Boolean(course));

  const originalTotal = linkedCourses.reduce((sum, course) => sum + course.pricing.price, 0);
  const finalPrice = applyDiscount(originalTotal, path.discountPercent);

  return {
    coursesCount: linkedCourses.length,
    originalTotal,
    discountPercent: path.discountPercent,
    discountValue: originalTotal - finalPrice,
    finalPrice,
  };
}

/* ─────────────────────────── لوحة القياس ─────────────────────────── */

export interface DashboardStats {
  totalCourses: number;
  upcomingCourses: number;
  traineesCount: number;
  revenue: number;
  newRequestsCount: number;
  pathsCount: number;
  postsCount: number;
  activeTrainersCount: number;
}

export function getDashboardStats(data: AdminData): DashboardStats {
  let traineesCount = 0;
  let revenue = 0;
  let upcomingCourses = 0;

  for (const course of data.courses) {
    const hasUpcoming = course.sessions.some(
      (session) => session.status === "open" || session.status === "upcoming",
    );
    if (hasUpcoming) upcomingCourses += 1;

    for (const session of course.sessions) {
      traineesCount += session.registered;
      if (!course.pricing.requestQuote && !course.pricing.isFree) {
        revenue += session.registered * getSessionEffectivePrice(session, course);
      }
    }
  }

  return {
    totalCourses: data.courses.length,
    upcomingCourses,
    traineesCount,
    revenue,
    /* الطلبات المؤرشفة لا تُحسب «جديدة» — قرار Archive (Checkpoint 5) */
    newRequestsCount: data.requests.filter(
      (request) => !request.archivedAt && request.status === "new",
    ).length,
    pathsCount: data.paths.length,
    postsCount: data.posts.length,
    activeTrainersCount: data.trainers.filter((trainer) => trainer.status === "active").length,
  };
}

/** أقرب الجلسات القادمة مرتبة بتاريخ البداية */
export function getUpcomingSessions(
  data: AdminData,
  limit = 5,
): Array<{ course: AdminCourse; session: CourseSession }> {
  const all = data.courses.flatMap((course) =>
    course.sessions.map((session) => ({ course, session })),
  );
  return all
    .filter(({ session }) => session.status === "open" || session.status === "upcoming")
    .sort((a, b) => a.session.startDate.localeCompare(b.session.startDate))
    .slice(0, limit);
}

/**
 * أقرب موعد متاح لدورة واحدة (يغذي عمود "أقرب موعد" في قائمة الدورات).
 * استراتيجية Mock الوثائقية (Phase 2): "المتاح" = حالته open أو upcoming،
 * والترتيب بتاريخ البداية تصاعديًا — دون أي اعتماد على ساعة النظام،
 * فلا تختفي بيانات الـ Seed (2026) مع مرور الوقت. عند الربط بقاعدة
 * البيانات في Phase 3 يُستبدل هذا بـ: current timestamp + DB query.
 */
export function getCourseNearestSession(
  course: Pick<AdminCourse, "sessions">,
): CourseSession | undefined {
  return course.sessions
    .filter((session) => session.status === "open" || session.status === "upcoming")
    .sort((a, b) => a.startDate.localeCompare(b.startDate))[0];
}

/**
 * الحالة المعروضة للموعد (Derived Status — لا تُخزَّن):
 * إذا بلغ المسجلون سعة المقاعد تُعرض "ممتلئة" بصريًا حتى لو بقيت
 * حالة المخزن "open" — قرار معماري: لا نغيّر الحالة المخزنة تلقائيًا.
 */
export function getDerivedSessionStatus(session: CourseSession): CourseSession["status"] {
  if (session.seats > 0 && session.registered >= session.seats) return "full";
  return session.status;
}

export interface MockRegistration {
  id: string;
  course: AdminCourse;
  session: CourseSession;
  registered: number;
  seats: number;
}

/**
 * "آخر التسجيلات" للوحة التحكم — Mock مشتق بلا كيان جديد في نموذج البيانات:
 * كل جلسة عليها مسجلون تُمثّل سطر تسجيلاتها الإجمالي (course + دفعة + عدد).
 * الترتيب بأقرب تاريخ بداية (الأولوية التشغيلية) — ثابت ولا يعتمد على الوقت.
 * في Phase 3 يُستبدل بجدول Registrations حقيقي بأختام زمنية.
 */
export function getRecentRegistrations(
  data: AdminData,
  limit = 5,
): MockRegistration[] {
  return data.courses
    .flatMap((course) =>
      course.sessions
        .filter((session) => session.registered > 0)
        .map((session) => ({
          id: `${course.id}:${session.id}`,
          course,
          session,
          registered: session.registered,
          seats: session.seats,
        })),
    )
    .sort((a, b) => a.session.startDate.localeCompare(b.session.startDate))
    .slice(0, limit);
}

/* ─────────────────────────── مساعدات التفرد ─────────────────────────── */

/**
 * slug فريد بين الدورات: يضيف لاحقة -copy ثم -2، -3… عند التعارض.
 * تُستخدم في Duplicate وأيضًا في تحقق الـ Editor.
 */
export function uniqueCourseSlug(
  base: string,
  courses: Array<Pick<AdminCourse, "id" | "slug">>,
  excludeId?: string,
): string {
  const taken = new Set(courses.filter((c) => c.id !== excludeId).map((c) => c.slug));
  if (!taken.has(base)) return base;
  let counter = 2;
  while (taken.has(`${base}-${counter}`)) counter += 1;
  return `${base}-${counter}`;
}

/** اسم نسخة فريد: "X (نسخة)" ثم "X (نسخة 2)"… */
export function uniqueCopyName(
  name: string,
  courses: Array<Pick<AdminCourse, "id" | "name">>,
  excludeId?: string,
): string {
  const taken = new Set(courses.filter((c) => c.id !== excludeId).map((c) => c.name));
  const first = `${name} (نسخة)`;
  if (!taken.has(first)) return first;
  let counter = 2;
  while (taken.has(`${name} (نسخة ${counter})`)) counter += 1;
  return `${name} (نسخة ${counter})`;
}

/**
 * slug فريد بين المسارات — نفس خوارزمية الدورات (البنية {id, slug} مشتركة
 * بنيويًا في TypeScript فتقبل مصفوفة المسارات مباشرة).
 */
export function uniquePathSlug(
  base: string,
  paths: Array<Pick<AdminLearningPath, "id" | "slug">>,
  excludeId?: string,
): string {
  return uniqueCourseSlug(base, paths, excludeId);
}

/** أكثر الدورات طلبًا حسب عدد المسجلين (Mock) */
export function getMostRequestedCourses(
  courses: AdminCourse[],
  limit = 5,
): Array<{ course: AdminCourse; registered: number }> {
  return courses
    .map((course) => ({
      course,
      registered: course.sessions.reduce((sum, session) => sum + session.registered, 0),
    }))
    .filter((entry) => entry.registered > 0)
    .sort((a, b) => b.registered - a.registered)
    .slice(0, limit);
}

/* ─────────────────── علاقات المدربين والمسارات (Checkpoint 3) ─────────────────── */

/** الدورات المرتبطة بمدرب معيّن (مرجع trainerId — لا نسخ بيانات) */
export function getTrainerCourses(
  trainerId: string,
  courses: AdminCourse[],
): AdminCourse[] {
  return courses.filter((course) => course.trainerId === trainerId);
}

/** المسارات التي تستخدم دورة معيّنة — أساس حماية حذف الدورة (قاعدة المسارات 4) */
export function getPathsUsingCourse(
  courseId: string,
  paths: AdminLearningPath[],
): AdminLearningPath[] {
  return paths.filter((path) => path.courseIds.includes(courseId));
}

/** دورات المسار بالترتيب المخزَّن — مراجع حية تتحدث تلقائيًا مع أسعار الدورات */
export function getCoursesInPath(
  path: Pick<AdminLearningPath, "courseIds">,
  courses: AdminCourse[],
): AdminCourse[] {
  return path.courseIds
    .map((id) => courses.find((course) => course.id === id))
    .filter((course): course is AdminCourse => Boolean(course));
}

/* ─────────────── طلبات الشركات (Checkpoint 5) ─────────────── */

/** الطلبات النشطة (غير المؤرشفة) — أساس القوائم والعدادات */
export function getActiveRequests(requests: CorporateRequest[]): CorporateRequest[] {
  return requests.filter((request) => !request.archivedAt);
}

/** الطلبات المؤرشفة */
export function getArchivedRequests(requests: CorporateRequest[]): CorporateRequest[] {
  return requests.filter((request) => Boolean(request.archivedAt));
}

/* ─────────────── مكتبة الوسائط (Checkpoint 5) ─────────────── */

export type MediaReferenceLocation =
  | { entityType: "course"; label: string; detail: string }
  | { entityType: "trainer"; label: string; detail: string }
  | { entityType: "path"; label: string; detail: string }
  | { entityType: "homepage"; label: string; detail: string }
  | { entityType: "post"; label: string; detail: string }
  | { entityType: "settings"; label: string; detail: string };

const MEDIA_ENTITY_LABELS = {
  course: "دورة",
  trainer: "مدرب",
  path: "مسار",
  homepage: "الصفحة الرئيسية",
  post: "مقال",
  settings: "إعدادات الموقع",
} as const;

export function getMediaEntityLabel(entityType: MediaReferenceLocation["entityType"]): string {
  return MEDIA_ENTITY_LABELS[entityType];
}

/**
 * ماسح مراجع الوسائط (بسيط ومقصود البساطة — لا Architecture معقد):
 * يفحص كل حقول الصور في الكيانات ويُرجع المواضع التي تستخدم نفس المسار.
 * مطابقة المسار العام كافية للبذور (نفس الملف يمكن أن يُستخدم في مواضع
 * متعددة) — وصور local-preview (blob:) لن تُطابق إلا بنفس URL الجلسة.
 */
export function getMediaReferences(
  item: Pick<MediaItem, "id" | "previewUrl">,
  data: AdminData,
): MediaReferenceLocation[] {
  const url = item.previewUrl;
  if (!url) return [];
  const refs: MediaReferenceLocation[] = [];

  for (const course of data.courses) {
    if (course.images.main === url) {
      refs.push({ entityType: "course", label: course.name, detail: "الصورة الرئيسية" });
    }
    if (course.images.cover === url) {
      refs.push({ entityType: "course", label: course.name, detail: "صورة الغلاف" });
    }
  }

  for (const trainer of data.trainers) {
    if (trainer.image && trainer.image === url) {
      refs.push({ entityType: "trainer", label: trainer.name, detail: "صورة المدرب" });
    }
  }

  for (const path of data.paths) {
    if (path.image === url) {
      refs.push({ entityType: "path", label: path.name, detail: "صورة المسار" });
    }
  }

  const hp = data.homepage;
  if (hp) {
    if (hp.hero?.image === url) {
      refs.push({ entityType: "homepage", label: "الصفحة الرئيسية", detail: "صورة الـ Hero" });
    }
    for (const category of hp.categories ?? []) {
      if (category.image === url) {
        refs.push({
          entityType: "homepage",
          label: "الصفحة الرئيسية",
          detail: `بطاقة فئة «${category.title}»`,
        });
      }
    }
    for (const org of [...(hp.accreditations ?? []), ...(hp.partners ?? [])]) {
      if (org.logo && org.logo === url) {
        refs.push({
          entityType: "homepage",
          label: "الصفحة الرئيسية",
          detail: `شعار «${org.name}»`,
        });
      }
    }
    if (hp.cta?.backgroundImage === url) {
      refs.push({
        entityType: "homepage",
        label: "الصفحة الرئيسية",
        detail: "خلفية قسم CTA",
      });
    }
  }

  for (const post of data.posts) {
    if (post.coverImage === url) {
      refs.push({ entityType: "post", label: post.title, detail: "صورة الغلاف" });
    }
    for (const block of post.contentBlocks ?? []) {
      if (block.type === "image" && block.image === url) {
        refs.push({ entityType: "post", label: post.title, detail: "كتلة صورة داخل المقال" });
      }
    }
  }

  const seo = data.seo;
  if (seo) {
    if (seo.ogImage === url) {
      refs.push({ entityType: "settings", label: "إعدادات SEO", detail: "صورة Open Graph" });
    }
    if (seo.socialImage === url) {
      refs.push({ entityType: "settings", label: "إعدادات SEO", detail: "صورة المشاركة الاجتماعية" });
    }
  }
  const general = data.general;
  if (general) {
    for (const [field, detail] of [
      [general.logoDark, "الشعار الداكن"],
      [general.logoLight, "الشعار الفاتح"],
      [general.favicon, "الأيقونة المفضلة (Favicon)"],
    ] as const) {
      if (field === url) {
        refs.push({ entityType: "settings", label: "الإعدادات العامة", detail });
      }
    }
  }

  return refs;
}

/** slug فريد بين المقالات — نفس خوارزمية الدورات/المسارات */
export function uniquePostSlug(
  base: string,
  posts: Array<Pick<AdminBlogPost, "id" | "slug">>,
  excludeId?: string,
): string {
  return uniqueCourseSlug(base, posts, excludeId);
}

export interface HomepageUpcomingResult {
  course?: AdminCourse;
  session?: CourseSession;
  /**
   * تحذير «الاختيار لم يعد صالحًا» — في Manual فقط:
   * الدورة/الجلسة حُذفت، أو الجلسة لم تعد متاحة (ممتلئة/مغلقة/منتهية).
   */
  warning?: string;
}

/**
 * قسم «الدورة القادمة» من إعدادات الرئيسية:
 * - Automatic: أقرب Session متاحة (open/upcoming) عبر نفس منطق D-15
 *   (ترتيب بتاريخ البداية، بلا اعتماد على ساعة النظام).
 * - Manual: الدورة والجلسة المختارتان من المخزن — مع تحذير واضح
 *   إذا لم يعد الاختيار صالحًا (متطلب المواصفة).
 */
export function getHomepageUpcoming(
  settings: UpcomingCourseSettings,
  data: Pick<AdminData, "courses">,
): HomepageUpcomingResult {
  if (settings.mode === "manual") {
    const course = settings.manualCourseId
      ? data.courses.find((entry) => entry.id === settings.manualCourseId)
      : undefined;
    if (!course) {
      return {
        warning: "الدورة المختارة يدويًا لم تعد موجودة — اختر دورة بديلة أو ارجع للوضع التلقائي.",
      };
    }
    const session = settings.manualSessionId
      ? course.sessions.find((entry) => entry.id === settings.manualSessionId)
      : undefined;
    if (!session) {
      return {
        course,
        warning: "الموعد المختار لم يعد موجودًا في هذه الدورة — اختر موعدًا بديلًا.",
      };
    }
    if (session.status !== "open" && session.status !== "upcoming") {
      const statusLabel =
        session.status === "full"
          ? "ممتلئة"
          : session.status === "closed"
            ? "مغلقة"
            : "منتهية";
      return {
        course,
        session,
        warning: `الموعد المختار لم يعد متاحًا للحجز (حالته: ${statusLabel}) — سيبقى معروضًا حتى تغيّر الاختيار.`,
      };
    }
    return { course, session };
  }

  /* Automatic — أقرب موعد متاح عبر كل الدورات */
  const nearest = getUpcomingSessions(data as AdminData, 1)[0];
  if (!nearest) return {};
  return { course: nearest.course, session: nearest.session };
}

/**
 * الدورات المميزة للعرض في الرئيسية:
 * - Automatic: كل دورة Published عليها Featured (القاعدة Business 6 روحها نفسه).
 * - Manual: الدورات المختارة بترتيبها المخزَّن — مع تجاهل المحدوف.
 */
export function getHomepageFeaturedCourses(
  mode: "automatic" | "manual",
  manualCourseIds: string[],
  courses: AdminCourse[],
): AdminCourse[] {
  if (mode === "manual") {
    return manualCourseIds
      .map((id) => courses.find((course) => course.id === id))
      .filter((course): course is AdminCourse => Boolean(course));
  }
  return courses.filter(
    (course) => course.featured && course.status !== "draft",
  );
}

/**
 * التقييمات المعروضة في قسم الرئيسية:
 * - Automatic (Featured mode): المميز الظاهر فقط — القاعدة Business 6.
 * - Manual: المختار بالترتيب — والظاهر فقط (القاعدة Business 4).
 */
export function getHomepageTestimonials(
  mode: "automatic" | "manual",
  manualIds: string[],
  testimonials: AdminTestimonial[],
): AdminTestimonial[] {
  if (mode === "manual") {
    return manualIds
      .map((id) => testimonials.find((testimonial) => testimonial.id === id))
      .filter(
        (testimonial): testimonial is AdminTestimonial =>
          Boolean(testimonial) && Boolean(testimonial?.visible),
      );
  }
  return testimonials.filter((testimonial) => testimonial.featured && testimonial.visible);
}

/* ─────────────── المستخدمون والأدوار (Checkpoint 6) ─────────────── */

/** الدور بالمعرّف (نظامي أو مخصص) */
export function getRoleById(data: AdminData, roleId: string): Role | undefined {
  return data.roles.find((role) => role.id === roleId);
}

/**
 * مصفوفة صلاحيات دور معيّن — المصدر الوحيد لاكتساق الصلاحيات:
 * كل مستخدمي الدور يتحدثون تلقائيًا لأن الصلاحيات مشتقة لا منسوخة.
 */
export function getRolePermissions(
  data: AdminData,
  roleId: string,
): RolePermissions | null {
  return getRoleById(data, roleId)?.permissions ?? null;
}

/** فحص فعل واحد على وحدة واحدة لدور معيّن */
export function roleCan(
  data: AdminData,
  roleId: string,
  adminModule: AdminModule,
  action: PermissionAction,
): boolean {
  const permissions = getRolePermissions(data, roleId);
  if (!permissions) return false;
  return (permissions[adminModule] ?? []).includes(action);
}

/**
 * فحص صلاحية مستخدم (يُشتق من دوره — لا صلاحيات مباشرة على المستخدم).
 * واجهة المرحلة القادمة: can(currentUser, "courses", "edit").
 * ⚠️ Mock UI فقط — التحكم الفعلي سيكون Server-side في Phase 3.
 */
export function can(
  data: AdminData,
  user: Pick<AdminUser, "roleId"> | undefined | null,
  adminModule: AdminModule,
  action: PermissionAction,
): boolean {
  if (!user) return false;
  return roleCan(data, user.roleId, adminModule, action);
}

/** المستخدمون المسندون إلى دور معيّن */
export function getUsersByRole(data: AdminData, roleId: string): AdminUser[] {
  return data.users.filter((user) => user.roleId === roleId);
}

/** عدد مستخدمي دور معيّن — أساس حماية حذف الدور المستخدم */
export function getRoleUserCount(data: AdminData, roleId: string): number {
  return getUsersByRole(data, roleId).length;
}

/** المستخدم الحالي (Mock — بديل Authentication في هذه المرحلة) */
export function getCurrentUser(data: AdminData): AdminUser | undefined {
  return data.users.find((user) => user.id === data.currentUserId);
}

/**
 * هل هذا المستخدم هو «آخر مالك»؟ أساس قواعد الحماية الثلاث:
 * لا حذف له ولا تعليق ولا تغيير دوره — يبقى Owner واحد على الأقل دائمًا.
 */
export function isLastOwner(data: AdminData, user: Pick<AdminUser, "id" | "roleId">): boolean {
  if (user.roleId !== "owner") return false;
  const ownerUsers = data.users.filter((owner) => owner.roleId === "owner");
  return ownerUsers.length === 1 && ownerUsers[0].id === user.id;
}

/** عدد الوحدات التي يملك الدور عليها أي فعل — ملخص سريع في القوائم */
export function countModulesWithAccess(permissions: RolePermissions): number {
  return Object.values(permissions).filter((actions) => actions.length > 0).length;
}

/** اسم نسخة دور فريد: «X (نسخة)» ثم «X (نسخة 2)»… */
export function uniqueRoleCopyName(name: string, roles: Array<Pick<Role, "id" | "name">>): string {
  const taken = new Set(roles.map((role) => role.name));
  const first = `${name} (نسخة)`;
  if (!taken.has(first)) return first;
  let counter = 2;
  while (taken.has(`${name} (نسخة ${counter})`)) counter += 1;
  return `${name} (نسخة ${counter})`;
}
