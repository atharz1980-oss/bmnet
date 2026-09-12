/**
 * حرّاس تعدادات القاعدة.
 * إجراءات الخادم تستقبل حقولًا نصية موسّعة، وأعمدة Postgres تعدادات.
 * بلا هذا الحارس تصل قيمة غير صالحة إلى القاعدة فتُرفض برسالة عامة؛
 * هنا تُرفض مبكرًا برسالة عربية تسمّي الحقل.
 *
 * القوائم أدناه مطبوعة بأنواع `Database["public"]["Enums"]`، فأي قيمة
 * مخترَعة لا تُترجم. اكتمال القوائم تحرسه tests/db-enums.test.ts مقابل
 * src/types/database.ts المولّد من القاعدة.
 */
import type { Database } from "@/types/database";

type Enums = Database["public"]["Enums"];

/** المرور بالنوع يمنع القيم المخترعة؛ الاكتمال يحرسه الاختبار. */
function values<K extends keyof Enums>(...items: readonly Enums[K][]): readonly Enums[K][] {
  return items;
}

export const DB_ENUMS = {
  admin_module: values<"admin_module">(
    "dashboard", "courses", "sessions", "trainers", "paths", "homepage",
    "testimonials", "blog", "corporate-requests", "media", "legal",
    "settings", "payments", "users", "roles", "community",
  ),
  blog_block_type: values<"blog_block_type">("paragraph", "heading", "image", "quote", "list"),
  course_category: values<"course_category">(
    "in-person-individuals", "in-person-corporates", "online", "private",
  ),
  course_level: values<"course_level">("beginner", "intermediate", "advanced", "all-levels"),
  course_operational_status: values<"course_operational_status">(
    "coming-soon", "registration-open", "full", "completed",
  ),
  course_publish_status: values<"course_publish_status">("draft", "published"),
  footer_link_group: values<"footer_link_group">("quick", "legal", "social"),
  payment_environment: values<"payment_environment">("test", "production"),
  payment_provider: values<"payment_provider">("moyasar", "tabby", "tamara"),
  permission_action: values<"permission_action">(
    "view", "create", "edit", "delete", "publish", "manage",
  ),
  publish_status: values<"publish_status">("draft", "published"),
  request_status: values<"request_status">(
    "new", "contacted", "preparing-offer", "offer-sent", "agreed", "closed",
  ),
  session_status: values<"session_status">("upcoming", "open", "full", "closed", "completed"),
  social_platform: values<"social_platform">(
    "instagram", "tiktok", "snapchat", "x", "youtube", "facebook", "linkedin",
    "telegram", "pinterest", "threads", "behance", "whatsapp", "email", "website",
  ),
  testimonial_source: values<"testimonial_source">("google", "manual"),
  trainer_status: values<"trainer_status">("active", "hidden"),
  user_status: values<"user_status">("active", "invited", "suspended"),
} as const;

export type DbEnumName = keyof typeof DB_ENUMS;

export function isDbEnum<K extends DbEnumName>(name: K, value: unknown): value is Enums[K] {
  return typeof value === "string" && (DB_ENUMS[name] as readonly string[]).includes(value);
}

/** القيمة مضمونة النوع، أو `null` ليقرر المستدعي رسالته. */
export function toDbEnum<K extends DbEnumName>(name: K, value: unknown): Enums[K] | null {
  return isDbEnum(name, value) ? value : null;
}

/** القيمة أو البديل المعتمد — للحقول التي لها افتراضي واضح. */
export function dbEnumOr<K extends DbEnumName>(
  name: K,
  value: unknown,
  fallback: Enums[K],
): Enums[K] {
  return isDbEnum(name, value) ? value : fallback;
}
