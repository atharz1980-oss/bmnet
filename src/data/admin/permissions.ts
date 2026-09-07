/**
 * بيت المصور — نموذج الصلاحيات (Permission Model — Checkpoint 6)
 * ---------------------------------------------------------------
 * «أقل نموذج يحقق تحكمًا فعليًا»: كل وحدة لها قائمة أفعال منطقية عليها
 * (view/create/edit/delete + publish/manage عند الحاجة)، والدور يملك
 * مصفوفة Record<AdminModule, PermissionAction[]> تُخزَّن وتُرحَّل.
 *
 * ⚠️ حد أمني موثق: هذه المرحلة Mock UI فقط — إخفاء الصلاحيات في الواجهة
 * ليس أمنًا. التحقق الحقيقي سيتم Server-side بعد إضافة Authentication
 * والـ Backend في Phase 3. لا تُقدَّم لوحة التحكم كأداة محمية.
 */

import type {
  AdminModule,
  AdminRoleId,
  PermissionAction,
  RolePermissions,
} from "./types";

/* ─────────────────── تعريف الوحدات (15 وحدة) ─────────────────── */

/** ترتيب عرض الوحدات في المصفوفة والقوائم */
export const ALL_MODULES: AdminModule[] = [
  "dashboard",
  "courses",
  "sessions",
  "trainers",
  "paths",
  "homepage",
  "testimonials",
  "blog",
  "corporate-requests",
  "media",
  "legal",
  "settings",
  "payments",
  "users",
  "roles",
];

/** الأفعال المتاحة لكل وحدة — قائمة مقصودة البساطة (لا مزايدات) */
export const MODULE_ACTIONS: Record<AdminModule, PermissionAction[]> = {
  dashboard: ["view"],
  courses: ["view", "create", "edit", "delete", "publish"],
  sessions: ["view", "create", "edit", "delete"],
  trainers: ["view", "create", "edit", "delete"],
  paths: ["view", "create", "edit", "delete", "publish"],
  homepage: ["view", "edit"],
  testimonials: ["view", "create", "edit", "delete", "publish"],
  blog: ["view", "create", "edit", "delete", "publish"],
  "corporate-requests": ["view", "edit", "manage"],
  media: ["view", "create", "edit", "delete"],
  legal: ["view", "edit", "publish"],
  settings: ["view", "edit"],
  payments: ["view", "manage"],
  users: ["view", "create", "edit", "delete"],
  roles: ["view", "create", "edit", "delete"],
};

/** أسماء الوحدات بالعربية — تُستخدم في المصفوفة والقوائم ومعاينة الصلاحيات */
export const MODULE_LABELS: Record<AdminModule, string> = {
  dashboard: "لوحة التحكم",
  courses: "الدورات",
  sessions: "مواعيد الدورات",
  trainers: "المدربون",
  paths: "المسارات التعليمية",
  homepage: "الصفحة الرئيسية",
  testimonials: "التقييمات",
  blog: "المدونة",
  "corporate-requests": "طلبات الشركات",
  media: "مكتبة الوسائط",
  legal: "الصفحات القانونية",
  settings: "الإعدادات",
  payments: "المدفوعات",
  users: "المستخدمون",
  roles: "الأدوار والصلاحيات",
};

/** أسماء الأفعال بالعربية */
export const ACTION_LABELS: Record<PermissionAction, string> = {
  view: "عرض",
  create: "إضافة",
  edit: "تعديل",
  delete: "حذف",
  publish: "نشر",
  manage: "إدارة",
};

/** أعمدة المصفوفة بترتيب ثابت للعرض */
export const ALL_ACTIONS: PermissionAction[] = [
  "view",
  "create",
  "edit",
  "delete",
  "publish",
  "manage",
];

/* ─────────────────── الأدوار النظامية ─────────────────── */

/** معرفات الأدوار الخمسة النظامية — لا تُحذف أبدًا */
export const SYSTEM_ROLE_IDS: AdminRoleId[] = [
  "owner",
  "admin",
  "content-editor",
  "course-manager",
  "finance",
];

export function isSystemRole(roleId: string): boolean {
  return (SYSTEM_ROLE_IDS as string[]).includes(roleId);
}

/* ─────────────────── بنّائو المصفوفات ─────────────────── */

/** مصفوفة فارغة — لا صلاحيات على أي وحدة */
export function buildEmptyPermissions(): RolePermissions {
  const permissions = {} as RolePermissions;
  for (const adminModule of ALL_MODULES) {
    permissions[adminModule] = [];
  }
  return permissions;
}

/** مصفوفة كاملة — كل وحدة بكل أفعالها (دور المالك) */
export function buildFullPermissions(): RolePermissions {
  const permissions = {} as RolePermissions;
  for (const adminModule of ALL_MODULES) {
    permissions[adminModule] = [...MODULE_ACTIONS[adminModule]];
  }
  return permissions;
}

/**
 * تطبيع المصفوفة قادمة من تخزين/مُدخل مستخدم:
 * - تُقيّد أفعال كل وحدة بقائمة أفعالها المتاحة فقط.
 * - «عرض» شرط أساسي لأي فعل آخر (لا تعديل بلا مشاهدة) —
 *   فإذا وُجد فعل أعلى بلا view أُلحق view تلقائيًا.
 */
export function normalizePermissions(
  input: Partial<Record<AdminModule, PermissionAction[]>>,
): RolePermissions {
  const permissions = buildEmptyPermissions();
  for (const adminModule of ALL_MODULES) {
    const allowed = MODULE_ACTIONS[adminModule];
    const raw = Array.isArray(input[adminModule]) ? input[adminModule] : [];
    const cleaned = allowed.filter((action) => raw.includes(action));
    const hasHigher = cleaned.some((action) => action !== "view");
    permissions[adminModule] = hasHigher && !cleaned.includes("view")
      ? ["view", ...cleaned]
      : cleaned;
  }
  return permissions;
}

/* ─────────────────── مصفوفات الأدوار النظامية الافتراضية ─────────────────── */
/* «مجرد Defaults» — قابلة للتعديل من لوحة التحكم عدا المالك (مقفول كامل الوصول) */

/** المالك: كل الوحدات بكل أفعالها — لا يُعدَّل ولا يُصفَّر أبدًا */
export function ownerPermissions(): RolePermissions {
  return buildFullPermissions();
}

/** مسؤول النظام: كل شيء تقريبًا عدا صلاحيات المالك الحساسة */
export function adminPermissions(): RolePermissions {
  return normalizePermissions({
    dashboard: ["view"],
    courses: ["view", "create", "edit", "delete", "publish"],
    sessions: ["view", "create", "edit", "delete"],
    trainers: ["view", "create", "edit", "delete"],
    paths: ["view", "create", "edit", "delete", "publish"],
    homepage: ["view", "edit"],
    testimonials: ["view", "create", "edit", "delete", "publish"],
    blog: ["view", "create", "edit", "delete", "publish"],
    "corporate-requests": ["view", "edit", "manage"],
    media: ["view", "create", "edit", "delete"],
    legal: ["view", "edit", "publish"],
    settings: ["view", "edit"],
    /* حساسيات المالك: إدارة الأدوار نفسها + مفاتيح مجال الدفع */
    payments: ["view"],
    users: ["view", "create", "edit", "delete"],
    roles: ["view"],
  });
}

/** محرر محتوى: الرئيسية + المدونة + التقييمات + الوسائط */
export function contentEditorPermissions(): RolePermissions {
  return normalizePermissions({
    dashboard: ["view"],
    homepage: ["view", "edit"],
    blog: ["view", "create", "edit", "delete", "publish"],
    testimonials: ["view", "create", "edit", "delete", "publish"],
    media: ["view", "create", "edit", "delete"],
  });
}

/** مدير الدورات: الدورات والمواعيد والمدربون والمسارات */
export function courseManagerPermissions(): RolePermissions {
  return normalizePermissions({
    dashboard: ["view"],
    courses: ["view", "create", "edit", "delete", "publish"],
    sessions: ["view", "create", "edit", "delete"],
    trainers: ["view", "create", "edit", "delete"],
    paths: ["view", "create", "edit", "delete", "publish"],
    media: ["view"],
  });
}

/** المالية: المدفوعات + عرض بيانات مالية ذات صلة (طلبات الشركات) */
export function financePermissions(): RolePermissions {
  return normalizePermissions({
    dashboard: ["view"],
    payments: ["view", "manage"],
    "corporate-requests": ["view"],
  });
}

/**
 * مصفوفات النظام الافتراضية بالمعرف — تُستخدم في الـ Seed والترحيل:
 * للوحدات الجديدة (v6) عند ترحيل أدوار مخزنة بنموذج قديم.
 */
export function defaultSystemRolePermissions(roleId: string): RolePermissions {
  switch (roleId) {
    case "owner":
      return ownerPermissions();
    case "admin":
      return adminPermissions();
    case "content-editor":
      return contentEditorPermissions();
    case "course-manager":
      return courseManagerPermissions();
    case "finance":
      return financePermissions();
    default:
      return buildEmptyPermissions();
  }
}
