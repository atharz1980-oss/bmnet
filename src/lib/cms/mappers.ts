/**
 * بيت المصور — محولات قاعدة البيانات ↔ أنواع الـ CMS (CP-G)
 * -----------------------------------------------------------
 * المصدر الوحيد لتحويل صفوف Postgres إلى أنواع لوحة التحكم والعكس.
 * قواعد موثقة:
 *  - D-80: حالة الدورة مفصولة في DB (publish_status + operational_status)
 *    ومدموجة في الواجهة (status) — mergeCourseStatus/splitCourseStatus.
 *  - D-81: مسار الصورة بدءًا بـ «/» = أصل محلي، غير ذلك مسار تخزين
 *    bm-media يُحوَّل إلى Public URL.
 *  - Tolerate (الحمل المتسامح): الجداول المحمية (profiles/roles) قد تفشل
 *    للزائر العام — تعال قائمة فارغة بدل كسر الصفحة.
 */

import type { RolePermissions, AdminModule, PermissionAction } from "@/data/admin/types";

/* ─────────────────── الصلاحيات ─────────────────── */

export interface PermissionRow {
  module: string;
  action: string;
}

/** صفوف role_permissions → مصفوفة صلاحيات RolePermissions (وحدة ← أفعال) */
export function permissionsFromRows(rows: PermissionRow[]): RolePermissions {
  const MODULES: readonly AdminModule[] = [
    "dashboard", "courses", "sessions", "trainers", "paths", "homepage",
    "testimonials", "blog", "corporate-requests", "media", "legal",
    "settings", "payments", "users", "roles",
  ];
  const ACTIONS: readonly PermissionAction[] = [
    "view", "create", "edit", "delete", "publish", "manage",
  ];

  const matrix = {} as RolePermissions;
  for (const moduleKey of MODULES) {
    matrix[moduleKey] = [];
  }
  for (const row of rows) {
    const moduleKey = row.module as AdminModule;
    const action = row.action as PermissionAction;
    if (!MODULES.includes(moduleKey) || !ACTIONS.includes(action)) continue;
    const list = matrix[moduleKey];
    if (!list.includes(action)) list.push(action);
    /* «view» يُلحق تلقائيًا مع أي فعل أعلى (قاعدة Checkpoint 6) */
    if (action !== "view" && !list.includes("view")) list.push("view");
  }
  return matrix;
}

/* ─────────────────── الوسائط (D-81) ─────────────────── */

/**
 * تحويل مسار الصورة المخزّن إلى رابط قابل للعرض:
 * - يبدأ بـ «/» → أصل محلي في public — يُعاد كما هو.
 * - غير ذلك → مسار تخزين bm-media → Public URL كامل.
 * - فارغ → فارغ (المكوّنات تعرض الـ fallback الخاص بها).
 */
export function resolveMediaUrl(path: string | null | undefined): string {
  const value = (path ?? "").trim();
  if (!value) return "";
  if (value.startsWith("/") && !value.startsWith("//")) return value;
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base) return value;
  return `${base.replace(/\/$/, "")}/storage/v1/object/public/bm-media/${value
    .split("/")
    .map(encodeURIComponent)
    .join("/")}`;
}

/** العكس: رابط/مسار معروض → مسار تخزين مختصر للتخزين */
export function toStoragePath(displayUrl: string): string {
  const value = displayUrl.trim();
  if (!value) return "";
  if (value.startsWith("/") && !value.startsWith("//")) return value;
  const marker = "/storage/v1/object/public/bm-media/";
  const index = value.indexOf(marker);
  if (index >= 0) return decodeURIComponent(value.slice(index + marker.length));
  return value;
}

/* ─────────────────── حالة الدورة (D-80) ─────────────────── */

export interface DbCourseStatus {
  publish_status: "draft" | "published";
  operational_status: string | null;
}

/** DB → الواجهة: draft يغلب، وإلا الحالة التشغيلية أو published */
export function mergeCourseStatus(row: DbCourseStatus): string {
  if (row.publish_status === "draft") return "draft";
  return row.operational_status ?? "published";
}

/** الواجهة → DB: التفكيك العكسي مع تطبيع القيم */
export function splitCourseStatus(status: string): DbCourseStatus {
  if (status === "draft") return { publish_status: "draft", operational_status: null };
  if (status === "published") return { publish_status: "published", operational_status: null };
  const OPERATIONAL = ["coming-soon", "registration-open", "full", "completed"];
  return {
    publish_status: "published",
    operational_status: OPERATIONAL.includes(status) ? status : "coming-soon",
  };
}

/* ─────────────────── تطبيع التواريخ والأوقات ─────────────────── */

/** "18:00:00" من time columns → "18:00" للواجهة */
export function normalizeTime(value: string | null | undefined): string {
  if (!value) return "00:00";
  const parts = value.split(":");
  return parts.length >= 2 ? `${parts[0].padStart(2, "0")}:${parts[1].padStart(2, "0")}` : value;
}

/** date column (YYYY-MM-DD) كما هو — و timestamp → ISO كامل */
export function normalizeDate(value: string | null | undefined): string {
  if (!value) return "";
  return value.slice(0, 10);
}

/** نص متعدد الفقرات في الواجهة ↔ نص خام في DB (فصل بأسطر فارغة) */
export function paragraphsToText(paragraphs: string[]): string {
  return paragraphs.map((p) => p.trim()).filter(Boolean).join("\n\n");
}

export function textToParagraphs(text: string): string[] {
  return text
    .split(/\n\n+/)
    .map((p) => p.trim())
    .filter(Boolean);
}
