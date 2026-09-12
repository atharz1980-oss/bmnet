/**
 * بيت المصور — أنواع طبقة إدارة المحتوى (Admin CMS Types)
 * -------------------------------------------------------
 * أنواع مستقلة عن مكوّنات الواجهة، مصممة لتُربط مباشرة بقاعدة بيانات في Phase 3.
 * التعدادات المشتركة مع الموقع العام (فئة الدورة، المستوى) تُستخدم من @/types
 * تفاديًا لأي تكرار — بقية الأنواع خاصة بلوحة التحكم فقط.
 *
 * القواعد: لا `any` — واجهات صغيرة مفصولة — كل التواريخ ISO strings.
 */

import type { CourseCategory, CourseLevel, SocialPlatform } from "@/types";

/* ─────────────────────────── التعدادات ─────────────────────────── */

/** حالة النشر الثنائية (مقالات / مسارات) */
export type PublishStatus = "draft" | "published";

/** حالة الدورة في لوحة التحكم */
export type CourseStatus =
  | "draft"
  | "published"
  | "coming-soon"
  | "registration-open"
  | "full"
  | "completed";

/** حالة جلسة انعقاد (موعد الدورة) */
export type SessionStatus = "upcoming" | "open" | "full" | "closed" | "completed";

/** حالة طلب تدريب الشركات */
export type RequestStatus =
  | "new"
  | "contacted"
  | "preparing-offer"
  | "offer-sent"
  | "agreed"
  | "closed";

export type TestimonialSource = "google" | "manual";

export type PaymentProviderId = "moyasar" | "tabby" | "tamara";
export type PaymentEnvironment = "test" | "production";
/** هذه المرحلة Mock — لا مفاتيح ولا ربط فعلي */
export type PaymentConfigStatus = "not-configured";

/** معرّفات الأدوار النظامية الخمسة (Mock — بلا Authentication).
 *  الأدوار المخصصة تأخذ معرّفات مولّدة — راجع Role.id (Checkpoint 6). */
export type AdminRoleId =
  | "owner"
  | "admin"
  | "content-editor"
  | "course-manager"
  | "finance";

/**
 * فعل الصلاحية — أقل نموذج يحقق تحكمًا فعليًا (Checkpoint 6):
 * view أساس أي فعل آخر، وpublish/manage عند الحاجة فقط.
 * التعريفات والتسميات العربية في ./permissions.ts.
 */
export type PermissionAction = "view" | "create" | "edit" | "delete" | "publish" | "manage";

/** وحدات لوحة التحكم التي تُدار بصلاحيات — 15 وحدة (Checkpoint 6) */
export type AdminModule =
  | "dashboard"
  | "courses"
  | "sessions"
  | "trainers"
  | "paths"
  | "homepage"
  | "testimonials"
  | "blog"
  | "corporate-requests"
  | "media"
  | "legal"
  | "settings"
  | "payments"
  | "users"
  | "roles"
  | "community";

/** مصفوفة الصلاحيات: كل وحدة ← قائمة أفعالها الممنوحة (Checkpoint 6).
 *  تُخزَّن كما هي ولا تُشتق — و«view» يُلحق تلقائيًا مع أي فعل أعلى. */
export type RolePermissions = Record<AdminModule, PermissionAction[]>;

/* ─────────────────────────── SEO ─────────────────────────── */

/** بيانات SEO لكل كيان (تُستخدم داخل محرري الدورة/المسار/المقال) */
export interface SeoMeta {
  title?: string;
  description?: string;
}

/* ─────────────────────────── الدورات ─────────────────────────── */

/** محور داخل يوم تدريبي (Curriculum Builder) */
export interface CurriculumItem {
  id: string;
  title: string;
  description?: string;
}

/** يوم تدريبي كامل */
export interface CurriculumDay {
  id: string;
  dayNumber: number;
  title: string;
  items: CurriculumItem[];
}

/**
 * جلسة انعقاد — منفصلة عن الدورة الثابتة.
 * المقاعد المتبقية تُحسب في الواجهة (selectors) ولا تُخزَّن.
 */
export interface CourseSession {
  id: string;
  batchName?: string;
  /** ISO "2026-09-14" */
  startDate: string;
  endDate?: string;
  /** "18:00" (24h) */
  startTime: string;
  endTime: string;
  location: string;
  city: string;
  seats: number;
  /** عدد المسجلين فعليًا (Mock) */
  registered: number;
  /** سعر خاص بالدفعة — إن غاب يُستخدم سعر الدورة */
  price?: number;
  status: SessionStatus;
}

export interface CourseImages {
  main: string;
  cover?: string;
  alt: string;
}

export interface CoursePricing {
  /** 0 = حسب الطلب (ما لم يكن isFree) */
  price: number;
  originalPrice?: number;
  discountPercent?: number;
  showPrice: boolean;
  isFree: boolean;
  /** شركات: "اطلب عرض سعر" بدل السعر */
  requestQuote: boolean;
}

export interface CourseDuration {
  days: number;
  totalHours: number;
  hoursPerDay?: number;
}

export interface AdminCourse {
  id: string;
  name: string;
  shortName?: string;
  slug: string;
  excerpt: string;
  /** نص كامل متعدد الفقرات (يُفصل بينها سطر فارغ) */
  description: string;
  type: CourseCategory;
  level: CourseLevel;
  /** ISO 639 — "ar" | "en" */
  language: string;
  status: CourseStatus;
  images: CourseImages;
  pricing: CoursePricing;
  duration: CourseDuration;
  outcomes: string[];
  audience: string[];
  requirements: string[];
  curriculum: CurriculumDay[];
  sessions: CourseSession[];
  /**
   * المدرب المرتبط — مرجع بالمعرّف فقط (لا نسخ لبيانات المدرب داخل الدورة).
   * المدرب المخفي يبقى صالحًا للدورات المرتبطة به مسبقًا.
   */
  trainerId?: string;
  featured: boolean;
  seo: SeoMeta;
  /** ISO datetime */
  createdAt: string;
  updatedAt: string;
}

/* ─────────────────────────── المدربون ─────────────────────────── */

export interface AdminTrainer {
  id: string;
  name: string;
  /** مسار صورة أو Object URL مؤقت — قد يكون فارغًا (يُعرض Initials) */
  image: string;
  imageAlt?: string;
  /** المسمى المعروض */
  title: string;
  specialty: string;
  /** نبذة قصيرة — سطر واحد للبطاقات */
  shortBio: string;
  /** نبذة كاملة */
  bio: string;
  yearsOfExperience: number;
  skills: string[];
  instagram?: string;
  linkedin?: string;
  website?: string;
  status: "active" | "hidden";
}

/* ─────────────────────────── المسارات ─────────────────────────── */

export interface AdminLearningPath {
  id: string;
  name: string;
  slug: string;
  image: string;
  imageAlt: string;
  excerpt: string;
  description: string;
  level: CourseLevel;
  status: PublishStatus;
  /** معرّفات الدورات مرتبة — الترتيب هو المصدر */
  courseIds: string[];
  discountPercent: number;
  /** تمييز المسار في واجهات التسويق (اختياري) */
  featured?: boolean;
}

/* ─────────────────── الصفحة الرئيسية (Homepage CMS) ─────────────────── */

export type HomepageSectionId =
  | "hero"
  | "statistics"
  | "upcoming-course"
  | "course-categories"
  | "featured-courses"
  | "why-us"
  | "accreditations"
  | "partners"
  | "testimonials"
  | "cta";

export interface HomepageSection {
  id: HomepageSectionId;
  label: string;
  enabled: boolean;
}

/* ════ إعدادات أقسام الصفحة الرئيسية (Checkpoint 4 — #14) ════ */

/**
 * قسم «الدورة القادمة» — تلقائي (أقرب Session متاحة عبر Selector)
 * أو تجاوز يدوي (Course + Session من المخزن).
 * لا تُنسخ بيانات الدورة هنا — مراجع بالمعرّف فقط (قاعدة Business 7).
 */
export interface UpcomingCourseSettings {
  mode: "automatic" | "manual";
  /** يُستخدم في Manual فقط */
  manualCourseId?: string;
  manualSessionId?: string;
}

/**
 * إعدادات بطاقة فئة واحدة (لا تغيّر الـ CourseCategory enum نفسه).
 * المعرف ثابت من فئات النظام — والنصوص والصورة قابلة للتحرير.
 */
export interface CategorySetting {
  categoryId: CourseCategory;
  enabled: boolean;
  title: string;
  shortDescription: string;
  image: string;
  imageAlt?: string;
  ctaLabel: string;
}

/** قسم «الدورات المميزة» — تلقائي (كل دورة Featured) أو اختيار يدوي مرتب */
export interface FeaturedCoursesSettings {
  mode: "automatic" | "manual";
  /** معرّفات الدورات المختارة يدويًا بالترتيب — لا تكرار */
  manualCourseIds: string[];
}

export interface WhyUsItem {
  id: string;
  title: string;
  description: string;
  /** مفتاح أيقونة معروف فقط (WHY_US_ICON_KEYS) — لا رفع SVG من المستخدم */
  iconKey?: string;
  enabled: boolean;
}

/** إعدادات قسم التقييمات في الرئيسية — التقييمات نفسها تُدار في #15 */
export interface TestimonialsSectionSettings {
  title: string;
  description: string;
  /** تلقائي = التقييمات المميزة (Featured) فقط، يدوي = اختيار صريح */
  mode: "automatic" | "manual";
  /** يُستخدم في Manual فقط — مراجع بالمعرّف */
  manualIds: string[];
}

export interface CtaLink {
  text: string;
  url: string;
}

export interface HeroContent {
  title: string;
  description: string;
  primaryCta: CtaLink;
  secondaryCta: CtaLink;
  image: string;
  imageAlt: string;
}

export interface StatEntry {
  id: string;
  label: string;
  value: number;
  /** مثال: "+" قبل الرقم */
  prefix?: string;
  suffix?: string;
  enabled: boolean;
}

/** اعتماد أو شريك — شكل موحد (شعار Placeholder في هذه المرحلة) */
export interface OrganizationEntry {
  id: string;
  name: string;
  /** فارغ = يُعرض Placeholder Logo الموجود حاليًا */
  logo: string;
  url?: string;
  description?: string;
  order: number;
  visible: boolean;
}

export interface CtaContent {
  title: string;
  description: string;
  primaryCta: CtaLink;
  secondaryCta: CtaLink;
  /** صورة خلفية اختيارية — Mock upload */
  backgroundImage?: string;
  backgroundImageAlt?: string;
}

export interface HomepageContent {
  /** ترتيب الأقسام كما تظهر — ترتيب المصفوفة هو المصدر (Business 2) */
  sections: HomepageSection[];
  hero: HeroContent;
  statistics: StatEntry[];
  /** قسم الدورة القادمة — إعدادات الوضع فقط، البيانات من المخزن */
  upcomingCourse: UpcomingCourseSettings;
  /** بطاقات فئات الدورات الأربع — النصوص والصور قابلة للتحرير */
  categories: CategorySetting[];
  featuredCourses: FeaturedCoursesSettings;
  whyUs: { title: string; description: string; items: WhyUsItem[] };
  accreditations: OrganizationEntry[];
  partners: OrganizationEntry[];
  testimonials: TestimonialsSectionSettings;
  cta: CtaContent;
}

/* ─────────────────────────── التقييمات ─────────────────────────── */

export interface AdminTestimonial {
  id: string;
  name: string;
  role?: string;
  rating: 1 | 2 | 3 | 4 | 5;
  review: string;
  source: TestimonialSource;
  sourceUrl?: string;
  featured: boolean;
  visible: boolean;
  /** ISO date */
  date: string;
}

/* ─────────────────────────── المدونة ─────────────────────────── */

/**
 * كتلة محتوى مقال — محرر منظم بلا Rich Text Editor ولا HTML خام
 * (قرار معماري Checkpoint 4): كل كتلة معرّفها ونوعها ومحتواها،
 * والترتيب هو موقعها في مصفوفة contentBlocks.
 */
export type BlogBlockType = "paragraph" | "heading" | "image" | "quote" | "list";

export interface BlogContentBlock {
  id: string;
  type: BlogBlockType;
  /** نص الكتلة — للـ paragraph/heading/quote */
  text?: string;
  /** عناصر القائمة — للـ list */
  items?: string[];
  /** مسار الصورة — للـ image (قد يكون Object URL مؤقتًا يُعقَّم عند الحفظ) */
  image?: string;
  imageAlt?: string;
}

export interface AdminBlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  /** كتل المحتوى المرتبة — بديل النص الخام (v4) */
  contentBlocks: BlogContentBlock[];
  coverImage: string;
  coverImageAlt?: string;
  category: string;
  tags: string[];
  author: string;
  /** ISO date */
  publishedAt: string;
  /** ISO datetime — يُختم عند كل حفظ من المحرر (v4) */
  updatedAt?: string;
  readMinutes: number;
  status: PublishStatus;
  seo: SeoMeta;
}

/* ─────────────────── طلبات تدريب الشركات ─────────────────── */

/** ملاحظة داخلية على الطلب — لا تظهر للعميل أبدًا (Mock) */
export interface RequestNote {
  id: string;
  text: string;
  author: string;
  /** ISO datetime */
  createdAt: string;
}

/**
 * حدث في سجل حالة الطلب (Timeline Mock):
 * يُنشأ تلقائيًا عند كل تغيير حالة من لوحة التحكم.
 * بذور الـ Seed تستخدم طوابع زمنية ثابتة (Deterministic) —
 * والأحداث التي ينشئها المستخدم تأخذ وقت التنفيذ الحالي.
 */
export interface RequestTimelineEntry {
  id: string;
  /** الحالة السابقة — غائبة في الحدث الافتتاحي */
  previousStatus?: RequestStatus;
  newStatus: RequestStatus;
  /** ISO datetime */
  timestamp: string;
  /** Mock — "المالك" في هذه المرحلة */
  actor: string;
}

export interface CorporateRequest {
  id: string;
  company: string;
  contactPerson: string;
  phone: string;
  email: string;
  traineesCount: number;
  requestedCourse: string;
  notes: string;
  /** ISO datetime */
  createdAt: string;
  status: RequestStatus;
  internalNotes: RequestNote[];
  /**
   * سجل تغيّر الحالات (Timeline Mock) — Checkpoint 5.
   * الطلبات القديمة المهاجرة تبدأ بسجل يوحّد حالتها الحالية.
   */
  timeline: RequestTimelineEntry[];
  /**
   * Archive بدل الحذف (قرار Checkpoint 5): الطلبات بيانات تشغيلية
   * لا تُحذف بصمت — التأريخ يخفيها من القوائم النشطة ويحفظها.
   */
  archivedAt?: string;
}

/* ─────────────────────────── الوسائط (Mock) ─────────────────────────── */

/** مصدر عنصر الوسائط: بذرة النظام أو معاينة محلية من جهاز المالك */
export type MediaSource = "seed" | "local-preview";

/**
 * عنصر وسائط (Mock — الصور فقط في Checkpoint 5):
 * لا يُخزن File أو Blob في localStorage — المعاينة المحلية عبر
 * previewUrl مؤقت (blob:) تُعقّم عند الحفظ وتفقد بعد التحديث.
 */
export interface MediaItem {
  id: string;
  /** اسم الملف المعروض */
  name: string;
  /** نوع الوسائط العام — "image" فقط في هذه المرحلة */
  type: "image";
  /** "image/jpeg" | "image/png" | "image/webp" | "image/avif" — لا يُحرر يدويًا */
  mimeType: string;
  /** الحجم بالبايت (يُعرض عبر formatBytes) */
  size: number;
  /** النص البديل — حالة إلزامية للعرض (فارغ = تنبيه في البطاقة) */
  altText: string;
  /** وصف اختياري */
  caption?: string;
  source: MediaSource;
  /** مسار عام أو Object URL مؤقت — لا يُخزَّن blob أبدًا */
  previewUrl: string;
  /** الأبعاد تُلتقط عند الرفع المحلي فقط — بذور النظام بلا أبعاد */
  width?: number;
  height?: number;
  /** ISO datetime */
  createdAt: string;
  /** ISO datetime — يُختم عند تعديل البيانات الوصفية */
  updatedAt?: string;
}

/* ─────────────────────────── الإعدادات ─────────────────────────── */

export interface GeneralSettings {
  siteNameAr: string;
  siteNameEn: string;
  logoDark: string;
  logoLight: string;
  favicon: string;
  defaultLanguage: string;
  currency: string;
  timezone: string;
  city: string;
  country: string;
}

export interface ContactChannels {
  mainMobile: boolean;
  whatsapp: boolean;
  secondaryPhone: boolean;
  email: boolean;
  instagram: boolean;
  tiktok: boolean;
  address: boolean;
  mapsUrl: boolean;
  workingHours: boolean;
}

export interface ContactSettings {
  mainMobile: string;
  whatsappNumber: string;
  whatsappMessage: string;
  secondaryPhone?: string;
  email: string;
  instagram: string;
  tiktok: string;
  address: string;
  mapsUrl?: string;
  workingHours: string;
  channels: ContactChannels;
}

/**
 * رابط منصة تواصل اجتماعي — المنصة هي المفتاح، فلا تكرار ولا التباس
 * في الأيقونة. تُدار من «بيانات التواصل» وتُعرض في الهيدر والفوتر وصفحة التواصل.
 */
export interface SocialLinkSetting {
  platform: SocialPlatform;
  label: string;
  url: string;
  enabled: boolean;
}

export interface FooterLink {
  id: string;
  label: string;
  href: string;
  /** Checkpoint 5 — إخفاء الرابط دون حذفه (افتراضي true للمهاجرات) */
  enabled?: boolean;
}

export interface FooterSettings {
  aboutText: string;
  quickLinks: FooterLink[];
  legalLinks: FooterLink[];
  socialLinks: FooterLink[];
  copyright: string;
}

export interface SeoSettings {
  siteTitle: string;
  defaultMetaDescription: string;
  ogImage: string;
  socialImage: string;
  indexSite: boolean;
  /** نص فقط في هذه المرحلة — لا ربط فعلي بـ Google Search Console */
  googleVerification?: string;
  /** نص فقط في هذه المرحلة — لا ربط فعلي بـ Bing */
  bingVerification?: string;
}

export interface PaymentProviderSettings {
  id: PaymentProviderId;
  name: string;
  enabled: boolean;
  environment: PaymentEnvironment;
  status: PaymentConfigStatus;
  /** اسم معروض اختياري يظهر للعميل لاحقًا (لا مفاتيح هنا أبدًا) */
  displayName?: string;
}

export type LegalPageId =
  | "privacy"
  | "terms"
  | "refund"
  | "registration-cancellation";

export interface LegalPage {
  id: LegalPageId;
  title: string;
  /** Checkpoint 5 — يطابق slug الموقع العام في Phase 1 (/policies/[slug]) */
  slug: string;
  /** فقرات مفصولة بسطر فارغ — textarea منظم بلا Rich Text (قرار D-06 نفسه) */
  content: string;
  /** ISO date */
  lastUpdated: string;
  published: boolean;
}

/* ─────────────────── المستخدمون والأدوار (Mock) ─────────────────── */

export interface Role {
  /** معرّف حر: الأدوار النظامية بخمسة معرّفات ثابتة والمخصصة بمعرّف مولّد */
  id: string;
  name: string;
  description: string;
  /** نظامية (لا تُحذف) أو مخصصة (تُحذف متى لم يُسند إليها مستخدم) — Checkpoint 6 */
  kind: "system" | "custom";
  /** مصفوفة الصلاحيات: وحدة ← أفعال ممنوحة */
  permissions: RolePermissions;
}

export type AdminUserStatus = "active" | "invited" | "suspended";

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  /** مسار صورة أو Object URL مؤقت (Mock) — غائب = Initials */
  avatar?: string;
  /** مرجع بالمعرّف فقط — الصلاحيات مشتقة من الدور ولا تُنسخ للمستخدم */
  roleId: string;
  status: AdminUserStatus;
  /** ISO datetime — آخر نشاط (Mock) */
  lastActiveAt?: string;
  /** ISO date */
  createdAt: string;
}

/* ─────────────────── جذر حالة الـ CMS ─────────────────── */

/**
 * الحالة الكاملة لطبقة الإدارة — تُحفظ في localStorage (بعد تعقيم
 * Object URLs) وتُستبدل مستقبلًا بمصدر قاعدة البيانات دون تغيير الواجهة.
 */
export interface AdminData {
  version: number;
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
  /** المستخدم الحالي (Mock — بلا Authentication): افتراضيًا المالك — Checkpoint 6 */
  currentUserId: string;
}
