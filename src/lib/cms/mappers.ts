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
 *  - readMinutes غير مخزنة — تُشتق من طول المحتوى (نفس قاعدة الموقع العام).
 */

import type {
  AdminBlogPost,
  AdminCourse,
  AdminData,
  AdminLearningPath,
  AdminModule,
  AdminTestimonial,
  AdminTrainer,
  AdminUser,
  BlogContentBlock,
  BlogBlockType,
  ContactChannels,
  ContactSettings,
  CorporateRequest,
  CourseSession,
  CurriculumDay,
  FooterLink,
  FooterSettings,
  GeneralSettings,
  HomepageContent,
  LegalPage,
  MediaItem,
  PaymentProviderSettings,
  PermissionAction,
  RequestNote,
  RequestStatus,
  RequestTimelineEntry,
  Role,
  RolePermissions,
  SeoSettings,
  SessionStatus,
  TestimonialSource,
  PublishStatus,
  HomepageSection,
  HomepageSectionId,
  SocialLinkSetting,
} from "@/data/admin/types";
import { isSocialPlatform, type CourseCategory, type CourseLevel, type SocialPlatform } from "@/types";
import { dbEnumOr, toDbEnum } from "./enums";
import type { Database } from "@/types/database";

/* ─────────────────── الصلاحيات ─────────────────── */

export interface PermissionRow {
  module: string;
  action: string;
}

export interface RolePermissionRow extends PermissionRow {
  role_id: string;
}

const ALL_MODULES: readonly AdminModule[] = [
  "dashboard", "courses", "sessions", "trainers", "paths", "homepage",
  "testimonials", "blog", "corporate-requests", "media", "legal",
  "settings", "payments", "users", "roles",
];
const ALL_ACTIONS: readonly PermissionAction[] = [
  "view", "create", "edit", "delete", "publish", "manage",
];

/** صفوف role_permissions → مصفوفة صلاحيات (وحدة ← أفعال) */
export function permissionsFromRows(rows: PermissionRow[]): RolePermissions {
  const matrix = {} as RolePermissions;
  for (const moduleKey of ALL_MODULES) matrix[moduleKey] = [];
  for (const row of rows) {
    if (!ALL_MODULES.includes(row.module as AdminModule) || !ALL_ACTIONS.includes(row.action as PermissionAction)) continue;
    const list = matrix[row.module as AdminModule];
    const action = row.action as PermissionAction;
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
  publish_status: Database["public"]["Enums"]["course_publish_status"];
  operational_status: Database["public"]["Enums"]["course_operational_status"] | null;
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
  return {
    publish_status: "published",
    /* حالة غير معروفة تعود إلى «قادمة» بدل أن يرفضها عمود التعداد. */
    operational_status: dbEnumOr("course_operational_status", status, "coming-soon"),
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

/* ═══════════════════ صفوف DB (قراءة) ═══════════════════ */

export interface TrainerRow {
  id: string;
  name: string;
  image_path: string | null;
  image_alt: string | null;
  title: string;
  specialty: string;
  short_bio: string;
  bio: string;
  years_experience: number;
  skills: string[] | null;
  instagram_url: string | null;
  linkedin_url: string | null;
  website_url: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

export function trainerFromDb(row: TrainerRow): AdminTrainer {
  return {
    id: row.id,
    name: row.name,
    image: resolveMediaUrl(row.image_path),
    imageAlt: row.image_alt ?? undefined,
    title: row.title,
    specialty: row.specialty,
    shortBio: row.short_bio,
    bio: row.bio,
    yearsOfExperience: row.years_experience,
    skills: row.skills ?? [],
    instagram: row.instagram_url ?? undefined,
    linkedin: row.linkedin_url ?? undefined,
    website: row.website_url ?? undefined,
    status: row.status === "hidden" ? "hidden" : "active",
  };
}

export interface CourseRow {
  id: string;
  slug: string;
  name: string;
  short_description: string;
  description: string;
  category: string;
  level: string;
  language: string;
  trainer_id: string | null;
  image_path: string | null;
  image_alt: string | null;
  price: string | number;
  original_price: string | number | null;
  discount_percent: number | null;
  show_price: boolean;
  is_free: boolean;
  request_quote: boolean;
  duration_days: number;
  duration_hours: number;
  outcomes: string[] | null;
  audience: string[] | null;
  requirements: string[] | null;
  featured: boolean;
  publish_status: string;
  operational_status: string | null;
  seo_title: string | null;
  seo_description: string | null;
  created_at: string;
  updated_at: string;
}

export interface SessionRow {
  id: string;
  course_id: string;
  batch_name: string | null;
  start_date: string;
  end_date: string | null;
  start_time: string;
  end_time: string;
  location: string;
  city: string;
  capacity: number;
  registered_count: number;
  price_override: string | number | null;
  status: string;
}

export interface CurriculumDayRow {
  id: string;
  course_id: string;
  title: string;
  sort_order: number;
}

export interface CurriculumItemRow {
  id: string;
  day_id: string;
  title: string;
  description: string | null;
  sort_order: number;
}

function toNumber(value: string | number | null | undefined, fallback = 0): number {
  if (value === null || value === undefined) return fallback;
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

const VALID_SESSION_STATUS: SessionStatus[] = ["upcoming", "open", "full", "closed", "completed"];

export function sessionsFromDb(rows: SessionRow[]): CourseSession[] {
  return rows.map((row) => ({
    id: row.id,
    batchName: row.batch_name ?? undefined,
    startDate: normalizeDate(row.start_date),
    endDate: row.end_date ? normalizeDate(row.end_date) : undefined,
    startTime: normalizeTime(row.start_time),
    endTime: normalizeTime(row.end_time),
    location: row.location,
    city: row.city,
    seats: row.capacity,
    registered: row.registered_count,
    price: row.price_override !== null ? toNumber(row.price_override) : undefined,
    status: VALID_SESSION_STATUS.includes(row.status as SessionStatus)
      ? (row.status as SessionStatus)
      : "upcoming",
  }));
}

export function curriculumFromDb(
  dayRows: CurriculumDayRow[],
  itemRows: CurriculumItemRow[],
): CurriculumDay[] {
  return [...dayRows]
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((day, dayIndex) => ({
      id: day.id,
      dayNumber: day.sort_order > 0 ? day.sort_order : dayIndex + 1,
      title: day.title,
      items: itemRows
        .filter((item) => item.day_id === day.id)
        .sort((a, b) => a.sort_order - b.sort_order)
        .map((item) => ({
          id: item.id,
          title: item.title,
          description: item.description ?? undefined,
        })),
    }));
}

export function courseFromDb(
  row: CourseRow,
  related: { sessions: SessionRow[]; curriculumDays: CurriculumDayRow[]; curriculumItems: CurriculumItemRow[] },
): AdminCourse {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    excerpt: row.short_description,
    description: row.description,
    type: row.category as CourseCategory,
    level: row.level as CourseLevel,
    language: row.language || "ar",
    status: mergeCourseStatus({
      publish_status: row.publish_status === "published" ? "published" : "draft",
      operational_status: toDbEnum("course_operational_status", row.operational_status),
    }) as AdminCourse["status"],
    images: {
      main: resolveMediaUrl(row.image_path),
      alt: row.image_alt ?? row.name,
    },
    pricing: {
      price: toNumber(row.price),
      originalPrice: row.original_price !== null ? toNumber(row.original_price) : undefined,
      discountPercent: row.discount_percent ?? undefined,
      showPrice: row.show_price,
      isFree: row.is_free,
      requestQuote: row.request_quote,
    },
    duration: { days: row.duration_days, totalHours: row.duration_hours },
    outcomes: row.outcomes ?? [],
    audience: row.audience ?? [],
    requirements: row.requirements ?? [],
    curriculum: curriculumFromDb(related.curriculumDays, related.curriculumItems),
    sessions: sessionsFromDb(related.sessions),
    trainerId: row.trainer_id ?? undefined,
    featured: row.featured,
    seo: {
      title: row.seo_title ?? undefined,
      description: row.seo_description ?? undefined,
    },
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export interface PathRow {
  id: string;
  slug: string;
  name: string;
  short_description: string;
  description: string;
  image_path: string | null;
  image_alt: string | null;
  level: string;
  discount_percent: number;
  publish_status: string;
  featured: boolean;
}

export interface PathCourseRow {
  path_id: string;
  course_id: string;
  sort_order: number;
}

export function pathFromDb(
  row: PathRow,
  pathCourses: PathCourseRow[],
): AdminLearningPath {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    image: resolveMediaUrl(row.image_path),
    imageAlt: row.image_alt ?? row.name,
    excerpt: row.short_description,
    description: row.description,
    level: row.level as CourseLevel,
    status: (row.publish_status === "published" ? "published" : "draft") as PublishStatus,
    courseIds: pathCourses
      .filter((entry) => entry.path_id === row.id)
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((entry) => entry.course_id),
    discountPercent: row.discount_percent,
    featured: row.featured,
  };
}

export interface TestimonialRow {
  id: string;
  name: string;
  role: string | null;
  review: string;
  rating: number;
  source: string;
  source_url: string | null;
  featured: boolean;
  visible: boolean;
  reviewed_at: string | null;
}

export function testimonialFromDb(row: TestimonialRow): AdminTestimonial {
  const rating = Math.min(5, Math.max(1, Math.round(row.rating))) as 1 | 2 | 3 | 4 | 5;
  return {
    id: row.id,
    name: row.name,
    role: row.role ?? undefined,
    rating,
    review: row.review,
    source: (row.source === "google" ? "google" : "manual") as TestimonialSource,
    sourceUrl: row.source_url ?? undefined,
    featured: row.featured,
    visible: row.visible,
    date: normalizeDate(row.reviewed_at),
  };
}

export interface BlogPostRow {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  cover_path: string | null;
  cover_alt: string | null;
  category: string;
  author_id: string | null;
  publish_status: string;
  published_at: string | null;
  seo_title: string | null;
  seo_description: string | null;
  created_at: string;
  updated_at: string;
}

export interface BlogBlockRow {
  id: string;
  post_id: string;
  block_type: string;
  content: {
    text?: string;
    items?: string[];
    image?: string;
    imageAlt?: string;
  } | null;
  sort_order: number;
}

export interface BlogTagRow {
  post_id: string;
  tag_name: string;
}

const VALID_BLOCK_TYPES: BlogBlockType[] = ["paragraph", "heading", "image", "quote", "list"];

/** readMinutes مشتقة: ~180 كلمة/دقيقة — حد أدنى دقيقة واحدة */
export function deriveReadMinutes(blocks: Array<{ text?: string; items?: string[] }>): number {
  const words = blocks.reduce((sum, block) => {
    const text = [block.text ?? "", ...(block.items ?? [])].join(" ");
    return sum + text.split(/\s+/).filter(Boolean).length;
  }, 0);
  return Math.max(1, Math.round(words / 180));
}

export function postFromDb(
  row: BlogPostRow,
  related: { blocks: BlogBlockRow[]; tags: string[]; authorName: string },
): AdminBlogPost {
  const blocks: BlogContentBlock[] = related.blocks
    .filter((block) => VALID_BLOCK_TYPES.includes(block.block_type as BlogBlockType))
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((block) => ({
      id: block.id,
      type: block.block_type as BlogBlockType,
      text: block.content?.text,
      items: block.content?.items,
      image: block.content?.image ? resolveMediaUrl(block.content.image) : undefined,
      imageAlt: block.content?.imageAlt,
    }));
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    excerpt: row.excerpt,
    contentBlocks: blocks,
    coverImage: resolveMediaUrl(row.cover_path),
    coverImageAlt: row.cover_alt ?? undefined,
    category: row.category,
    tags: related.tags,
    author: related.authorName,
    publishedAt: normalizeDate(row.published_at ?? row.created_at),
    updatedAt: row.updated_at,
    readMinutes: deriveReadMinutes(blocks),
    status: (row.publish_status === "published" ? "published" : "draft") as PublishStatus,
    seo: {
      title: row.seo_title ?? undefined,
      description: row.seo_description ?? undefined,
    },
  };
}

export interface RequestRow {
  id: string;
  company_name: string;
  contact_name: string;
  phone: string;
  email: string;
  trainee_count: number;
  requested_course: string;
  notes: string;
  status: string;
  archived_at: string | null;
  created_at: string;
}

export interface RequestNoteRow {
  id: string;
  request_id: string;
  note: string;
  created_at: string;
  author_id: string | null;
}

export interface RequestTimelineRow {
  id: string;
  request_id: string;
  event_type: string;
  from_status: string | null;
  to_status: string | null;
  description: string | null;
  created_at: string;
  actor_id: string | null;
}

const VALID_REQUEST_STATUS: RequestStatus[] = [
  "new", "contacted", "preparing-offer", "offer-sent", "agreed", "closed",
];

export function requestFromDb(
  row: RequestRow,
  related: {
    notes: RequestNoteRow[];
    timeline: RequestTimelineRow[];
    profileNames: Map<string, string>;
  },
): CorporateRequest {
  const notes: RequestNote[] = related.notes
    .filter((entry) => entry.request_id === row.id)
    .sort((a, b) => a.created_at.localeCompare(b.created_at))
    .map((entry) => ({
      id: entry.id,
      text: entry.note,
      author: (entry.author_id ? related.profileNames.get(entry.author_id) : undefined) ?? "—",
      createdAt: entry.created_at,
    }));
  const timeline: RequestTimelineEntry[] = related.timeline
    .filter((entry) => entry.request_id === row.id)
    .sort((a, b) => a.created_at.localeCompare(b.created_at))
    .map((entry) => ({
      id: entry.id,
      previousStatus: (entry.from_status && VALID_REQUEST_STATUS.includes(entry.from_status as RequestStatus)
        ? entry.from_status
        : undefined) as RequestStatus | undefined,
      newStatus: (VALID_REQUEST_STATUS.includes(entry.to_status as RequestStatus)
        ? entry.to_status
        : row.status) as RequestStatus,
      timestamp: entry.created_at,
      actor: (entry.actor_id ? related.profileNames.get(entry.actor_id) : undefined) ?? "النظام",
    }));
  return {
    id: row.id,
    company: row.company_name,
    contactPerson: row.contact_name,
    phone: row.phone,
    email: row.email,
    traineesCount: row.trainee_count,
    requestedCourse: row.requested_course,
    notes: row.notes,
    createdAt: row.created_at,
    status: (VALID_REQUEST_STATUS.includes(row.status as RequestStatus)
      ? row.status
      : "new") as RequestStatus,
    internalNotes: notes,
    timeline,
    archivedAt: row.archived_at ?? undefined,
  };
}

export interface MediaRow {
  id: string;
  bucket: string;
  storage_path: string;
  file_name: string;
  mime_type: string;
  size_bytes: string | number;
  alt_text: string;
  caption: string | null;
  width: number | null;
  height: number | null;
  created_at: string;
  updated_at: string;
}

export function mediaFromDb(row: MediaRow): MediaItem {
  return {
    id: row.id,
    name: row.file_name,
    type: "image",
    mimeType: row.mime_type,
    size: toNumber(row.size_bytes),
    altText: row.alt_text,
    caption: row.caption ?? undefined,
    source: "seed",
    previewUrl: resolveMediaUrl(row.storage_path),
    width: row.width ?? undefined,
    height: row.height ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/* ═══════════════════ الإعدادات ═══════════════════ */

export interface SiteSettingsRow {
  site_name_ar: string;
  site_name_en: string;
  logo_dark_path: string | null;
  logo_light_path: string | null;
  favicon_path: string | null;
  default_language: string;
  currency: string;
  timezone: string;
  city: string;
  country: string;
}

export function generalFromDb(row: SiteSettingsRow | null): GeneralSettings {
  return {
    siteNameAr: row?.site_name_ar ?? "",
    siteNameEn: row?.site_name_en ?? "",
    logoDark: resolveMediaUrl(row?.logo_dark_path),
    logoLight: resolveMediaUrl(row?.logo_light_path),
    favicon: resolveMediaUrl(row?.favicon_path),
    defaultLanguage: row?.default_language ?? "ar",
    currency: row?.currency ?? "SAR",
    timezone: row?.timezone ?? "Asia/Riyadh",
    city: row?.city ?? "",
    country: row?.country ?? "",
  };
}

export interface ContactSettingsRow {
  main_mobile: string;
  whatsapp_number: string;
  whatsapp_message: string;
  secondary_phone: string | null;
  email: string;
  instagram_url: string;
  tiktok_url: string;
  address: string;
  maps_url: string | null;
  working_hours: string;
  channel_main_mobile: boolean;
  channel_whatsapp: boolean;
  channel_secondary_phone: boolean;
  channel_email: boolean;
  channel_instagram: boolean;
  channel_tiktok: boolean;
  channel_address: boolean;
  channel_maps: boolean;
  channel_working_hours: boolean;
}

export function contactFromDb(row: ContactSettingsRow | null): ContactSettings {
  const channels: ContactChannels = {
    mainMobile: row?.channel_main_mobile ?? true,
    whatsapp: row?.channel_whatsapp ?? true,
    secondaryPhone: row?.channel_secondary_phone ?? true,
    email: row?.channel_email ?? true,
    instagram: row?.channel_instagram ?? true,
    tiktok: row?.channel_tiktok ?? true,
    address: row?.channel_address ?? true,
    mapsUrl: row?.channel_maps ?? true,
    workingHours: row?.channel_working_hours ?? true,
  };
  return {
    mainMobile: row?.main_mobile ?? "",
    whatsappNumber: row?.whatsapp_number ?? "",
    whatsappMessage: row?.whatsapp_message ?? "",
    secondaryPhone: row?.secondary_phone ?? undefined,
    email: row?.email ?? "",
    instagram: row?.instagram_url ?? "",
    tiktok: row?.tiktok_url ?? "",
    address: row?.address ?? "",
    mapsUrl: row?.maps_url ?? undefined,
    workingHours: row?.working_hours ?? "",
    channels,
  };
}

export interface FooterSettingsRow {
  about_text: string;
  copyright: string;
}

export interface FooterLinkRow {
  id: string;
  link_group: string;
  label: string;
  url: string;
  enabled: boolean;
  sort_order: number;
}

export interface SocialLinkRow {
  platform: string;
  url: string;
  label: string;
  enabled: boolean;
  sort_order: number;
}

/**
 * صفوف social_links → قائمة المنصات. الصف بمنصة غير معروفة يُتجاهل
 * بدل كسر الأيقونات، والترتيب من sort_order ثم اسم المنصة لثبات العرض.
 */
export function socialFromDb(rows: SocialLinkRow[]): SocialLinkSetting[] {
  return rows
    .filter((row) => isSocialPlatform(row.platform))
    .sort((a, b) => a.sort_order - b.sort_order || a.platform.localeCompare(b.platform))
    .map((row) => ({
      platform: row.platform as SocialPlatform,
      label: row.label,
      url: row.url,
      enabled: row.enabled,
    }));
}

export function footerFromDb(
  settings: FooterSettingsRow | null,
  links: FooterLinkRow[],
): FooterSettings {
  const group = (name: string): FooterLink[] =>
    links
      .filter((link) => link.link_group === name)
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((link) => ({
        id: link.id,
        label: link.label,
        href: link.url,
        enabled: link.enabled,
      }));
  return {
    aboutText: settings?.about_text ?? "",
    quickLinks: group("quick"),
    legalLinks: group("legal"),
    socialLinks: group("social"),
    copyright: settings?.copyright ?? "",
  };
}

export interface SeoSettingsRow {
  site_title: string;
  default_meta_description: string;
  og_image_path: string | null;
  social_image_path: string | null;
  index_site: boolean;
  google_verification: string | null;
  bing_verification: string | null;
}

export function seoFromDb(row: SeoSettingsRow | null): SeoSettings {
  return {
    siteTitle: row?.site_title ?? "",
    defaultMetaDescription: row?.default_meta_description ?? "",
    ogImage: resolveMediaUrl(row?.og_image_path),
    socialImage: resolveMediaUrl(row?.social_image_path),
    indexSite: row?.index_site ?? true,
    googleVerification: row?.google_verification ?? undefined,
    bingVerification: row?.bing_verification ?? undefined,
  };
}

export interface PaymentSettingsRow {
  provider: string;
  enabled: boolean;
  environment: string;
  display_name: string | null;
  sort_order: number;
}

const PROVIDER_NAMES: Record<string, string> = {
  moyasar: "موياسر",
  tabby: "تابي",
  tamara: "تمارا",
};

export function paymentsFromDb(rows: PaymentSettingsRow[]): PaymentProviderSettings[] {
  const ORDER = ["moyasar", "tabby", "tamara"];
  return [...rows]
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((row) => ({
      id: row.provider as PaymentProviderSettings["id"],
      name: PROVIDER_NAMES[row.provider] ?? row.provider,
      enabled: row.enabled,
      environment: (row.environment === "production" ? "production" : "test") as PaymentProviderSettings["environment"],
      status: "not-configured" as const,
      displayName: row.display_name ?? undefined,
    }))
    .sort(
      (a, b) =>
        ORDER.indexOf(a.id ?? "") - ORDER.indexOf(b.id ?? ""),
    );
}

export interface LegalPageRow {
  id: string;
  slug: string;
  title: string;
  content: string;
  published: boolean;
  published_at: string | null;
  updated_at: string;
}

export function legalFromDb(rows: LegalPageRow[]): LegalPage[] {
  return rows.map((row) => ({
    /* id مشتق من الـ slug — يطابق معرفات النظام الأربعة المعروفة */
    id: row.slug as LegalPage["id"],
    title: row.title,
    slug: row.slug,
    content: row.content,
    lastUpdated: normalizeDate(row.updated_at),
    published: row.published,
  }));
}

/* ═══════════════════ المستخدمون والأدوار ═══════════════════ */

export interface RoleDbRow {
  id: string;
  key: string | null;
  name: string;
  description: string;
  kind: string;
}

export interface ProfileDbRow {
  id: string;
  name: string;
  avatar_path: string | null;
  role_id: string;
  status: string;
  last_active_at: string | null;
  created_at: string;
}

export function rolesFromDb(roleRows: RoleDbRow[], permissionRows: RolePermissionRow[]): Role[] {
  return roleRows.map((row) => ({
    id: row.id,
    name: row.name,
    description: row.description,
    kind: row.kind === "system" ? ("system" as const) : ("custom" as const),
    permissions: permissionsFromRows(
      permissionRows.filter((entry) => entry.role_id === row.id),
    ),
  }));
}

export function usersFromDb(
  profileRows: ProfileDbRow[],
  emails: Map<string, string>,
): AdminUser[] {
  return profileRows.map((row) => ({
    id: row.id,
    name: row.name,
    email: emails.get(row.id) ?? "",
    avatar: resolveMediaUrl(row.avatar_path) || undefined,
    roleId: row.role_id,
    status: row.status as AdminUser["status"],
    lastActiveAt: row.last_active_at ?? undefined,
    createdAt: row.created_at,
  }));
}

/* ═══════════════════ الصفحة الرئيسية ═══════════════════ */

export interface HomepageSectionRow {
  section_key: string;
  enabled: boolean;
  sort_order: number;
}

const SECTION_LABELS: Record<string, string> = {
  hero: "القسم الرئيسي",
  statistics: "الإحصائيات",
  "upcoming-course": "الدورة القادمة",
  "course-categories": "فئات الدورات",
  "featured-courses": "الدورات المميزة",
  "why-us": "لماذا نحن",
  accreditations: "الاعتمادات",
  partners: "الشركاء",
  testimonials: "آراء المتدربين",
  cta: "دعوة لاتخاذ إجراء",
};

export function homepageSectionsFromDb(rows: HomepageSectionRow[]): HomepageSection[] {
  return [...rows]
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((row) => ({
      id: row.section_key as HomepageSectionId,
      label: SECTION_LABELS[row.section_key] ?? row.section_key,
      enabled: row.enabled,
    }));
}

export interface HomepageHeroRow {
  title: string;
  description: string;
  primary_cta_text: string;
  primary_cta_url: string;
  secondary_cta_text: string;
  secondary_cta_url: string;
  image_path: string | null;
  image_alt: string | null;
}

export interface HomepageStatRow {
  id: string;
  label: string;
  value: string | number;
  prefix: string | null;
  suffix: string | null;
  enabled: boolean;
  sort_order: number;
}

export interface HomepageUpcomingRow {
  mode: string;
  manual_course_id: string | null;
  manual_session_id: string | null;
}

export interface HomepageCategoryRow {
  category_key: string;
  title: string;
  short_description: string;
  image_path: string | null;
  image_alt: string | null;
  cta_label: string;
  enabled: boolean;
  sort_order: number;
}

export interface HomepageFeaturedRow {
  mode: string;
}

export interface HomepageFeaturedItemRow {
  course_id: string;
  sort_order: number;
}

export interface HomepageWhyUsRow {
  title: string;
  description: string;
}

export interface HomepageWhyUsItemRow {
  id: string;
  title: string;
  description: string;
  icon_key: string | null;
  enabled: boolean;
  sort_order: number;
}

export interface HomepageOrgRow {
  id: string;
  name: string;
  logo_path: string | null;
  url: string | null;
  description: string | null;
  visible: boolean;
  sort_order: number;
}

export interface HomepageTestimonialsRow {
  title: string;
  description: string;
  mode: string;
}

export interface HomepageTestimonialItemRow {
  testimonial_id: string;
  sort_order: number;
}

export interface HomepageCtaRow {
  title: string;
  description: string;
  primary_cta_text: string;
  primary_cta_url: string;
  secondary_cta_text: string;
  secondary_cta_url: string;
  background_image_path: string | null;
  background_image_alt: string | null;
}

export function homepageFromDb(sections: {
  rows: HomepageSectionRow[];
  hero: HomepageHeroRow | null;
  stats: HomepageStatRow[];
  upcoming: HomepageUpcomingRow | null;
  categories: HomepageCategoryRow[];
  featured: HomepageFeaturedRow | null;
  featuredItems: HomepageFeaturedItemRow[];
  whyUs: HomepageWhyUsRow | null;
  whyUsItems: HomepageWhyUsItemRow[];
  accreditations: HomepageOrgRow[];
  partners: HomepageOrgRow[];
  testimonials: HomepageTestimonialsRow | null;
  testimonialItems: HomepageTestimonialItemRow[];
  cta: HomepageCtaRow | null;
}): HomepageContent {
  return {
    sections: homepageSectionsFromDb(sections.rows),
    hero: {
      title: sections.hero?.title ?? "",
      description: sections.hero?.description ?? "",
      primaryCta: {
        text: sections.hero?.primary_cta_text ?? "",
        url: sections.hero?.primary_cta_url ?? "",
      },
      secondaryCta: {
        text: sections.hero?.secondary_cta_text ?? "",
        url: sections.hero?.secondary_cta_url ?? "",
      },
      image: resolveMediaUrl(sections.hero?.image_path),
      imageAlt: sections.hero?.image_alt ?? "",
    },
    statistics: [...sections.stats]
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((row) => ({
        id: row.id,
        label: row.label,
        value: toNumber(row.value),
        prefix: row.prefix ?? undefined,
        suffix: row.suffix ?? undefined,
        enabled: row.enabled,
      })),
    upcomingCourse: {
      mode: sections.upcoming?.mode === "manual" ? "manual" : "automatic",
      manualCourseId: sections.upcoming?.manual_course_id ?? undefined,
      manualSessionId: sections.upcoming?.manual_session_id ?? undefined,
    },
    categories: [...sections.categories]
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((row) => ({
        categoryId: row.category_key as CourseCategory,
        enabled: row.enabled,
        title: row.title,
        shortDescription: row.short_description,
        image: resolveMediaUrl(row.image_path),
        imageAlt: row.image_alt ?? undefined,
        ctaLabel: row.cta_label,
      })),
    featuredCourses: {
      mode: sections.featured?.mode === "manual" ? "manual" : "automatic",
      manualCourseIds: [...sections.featuredItems]
        .sort((a, b) => a.sort_order - b.sort_order)
        .map((entry) => entry.course_id),
    },
    whyUs: {
      title: sections.whyUs?.title ?? "",
      description: sections.whyUs?.description ?? "",
      items: [...sections.whyUsItems]
        .sort((a, b) => a.sort_order - b.sort_order)
        .map((row) => ({
          id: row.id,
          title: row.title,
          description: row.description,
          iconKey: row.icon_key ?? undefined,
          enabled: row.enabled,
        })),
    },
    accreditations: orgsFromDb(sections.accreditations),
    partners: orgsFromDb(sections.partners),
    testimonials: {
      title: sections.testimonials?.title ?? "",
      description: sections.testimonials?.description ?? "",
      mode: sections.testimonials?.mode === "manual" ? "manual" : "automatic",
      manualIds: [...sections.testimonialItems]
        .sort((a, b) => a.sort_order - b.sort_order)
        .map((entry) => entry.testimonial_id),
    },
    cta: {
      title: sections.cta?.title ?? "",
      description: sections.cta?.description ?? "",
      primaryCta: {
        text: sections.cta?.primary_cta_text ?? "",
        url: sections.cta?.primary_cta_url ?? "",
      },
      secondaryCta: {
        text: sections.cta?.secondary_cta_text ?? "",
        url: sections.cta?.secondary_cta_url ?? "",
      },
      backgroundImage: sections.cta?.background_image_path
        ? resolveMediaUrl(sections.cta.background_image_path)
        : undefined,
      backgroundImageAlt: sections.cta?.background_image_alt ?? undefined,
    },
  };
}

function orgsFromDb(rows: HomepageOrgRow[]) {
  return [...rows]
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((row) => ({
      id: row.id,
      name: row.name,
      logo: resolveMediaUrl(row.logo_path),
      url: row.url ?? undefined,
      description: row.description ?? undefined,
      order: row.sort_order,
      visible: row.visible,
    }));
}

/* ═══════════════════ جذر AdminData ═══════════════════ */

/**
 * تجميع AdminData من نتائج الاستعلامات — الواجهة تستهلك نفس النوع
 * سواء المصدر localStorage (قديم) أو قاعدة البيانات (CP-G).
 */
export function assembleAdminData(parts: {
  courses: AdminCourse[];
  trainers: AdminTrainer[];
  paths: AdminLearningPath[];
  homepage: HomepageContent;
  testimonials: AdminTestimonial[];
  posts: AdminBlogPost[];
  requests: CorporateRequest[];
  media: MediaItem[];
  general: GeneralSettings;
  contact: ContactSettings;
  social: SocialLinkSetting[];
  footer: FooterSettings;
  seo: SeoSettings;
  payments: PaymentProviderSettings[];
  legal: LegalPage[];
  roles: Role[];
  users: AdminUser[];
  currentUserId: string;
}): AdminData {
  return {
    version: 7,
    ...parts,
  };
}
