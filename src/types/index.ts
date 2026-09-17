/**
 * Bayt Almosawer — Shared domain types
 * ------------------------------------
 * هذه الأنواع مصممة بحيث تكون جاهزة للربط مستقبلاً بقاعدة بيانات
 * (مثلاً Prisma/Supabase) دون تغيير مكوّنات الواجهة.
 * جميع البيانات الحالية Mock Data موجودة في src/data.
 */

/** فئات الدورات الأربع المعتمدة في الموقع */
export type CourseCategory =
  | "in-person-individuals" // حضوري أفراد
  | "in-person-corporates" // حضوري شركات
  | "online" // أونلاين
  | "private"; // برايفت

export type CourseLevel = "beginner" | "intermediate" | "advanced" | "all-levels";

/**
 * الحالة التجارية للدورة — مصدر واحد لكل وسم سعر في الموقع.
 *
 * تُشتق مرة واحدة من الحقول المعتمدة (`is_free` و`request_quote` والتصنيف)،
 * ولا تُستنتج من السعر. استنتاجها من `price === 0` هو ما جعل دورة مجانية
 * تُعرض «حسب الطلب» و«مجانية» معًا في البطاقة نفسها.
 *
 * - `free`: مجانية بقرار، لا بسعر صفر.
 * - `paid`: لها سعر معروض شامل الضريبة.
 * - `quote`: شركات أو طلب عرض سعر — لا تسجيل ذاتي، والتواصل عبر واتساب.
 * - `unavailable`: سعر غير مضبوط ولا علَم مجانية — ناقصة، لا تُباع ولا تُمنح.
 */
export type CourseCommercialState = "free" | "paid" | "quote" | "unavailable";

export interface Trainer {
  name: string;
  title: string;
  /** صورة المدرب (اختيارية حالياً) */
  avatar?: string;
}

export interface CourseSession {
  id: string;
  /** تاريخ بداية الدورة بصيغة ISO — Mock */
  startDate: string;
  /** تاريخ النهاية (اختياري) */
  endDate?: string;
  time: string;
  location: string;
  seatsTotal: number;
  seatsLeft: number;
}

export interface CurriculumModule {
  title: string;
  lessons: string[];
}

export interface Course {
  id: string;
  name: string;
  slug: string;
  shortDescription: string;
  /** فقرات الوصف الكامل */
  description: string[];
  image: string;
  imageAlt: string;
  category: CourseCategory;
  level: CourseLevel;
  /** السعر بالريال شاملًا الضريبة. لا يُقرأ وحده — انظر `commercial`. */
  price: number;
  /** الحالة التجارية المعتمدة — هي التي تقرر الوسم المعروض. */
  commercial: CourseCommercialState;
  durationDays: number;
  totalHours: number;
  location: string;
  trainer: Trainer;
  curriculum: CurriculumModule[];
  learningOutcomes: string[];
  /** الفئة المستهدفة — Checkpoint 7: يملؤه جسر بيانات الإدارة (اختياري) */
  audience?: string[];
  /** المتطلبات — Checkpoint 7: يملؤه جسر بيانات الإدارة (اختياري) */
  requirements?: string[];
  upcomingSessions: CourseSession[];
  featured: boolean;
  published: boolean;
}

export interface LearningPath {
  id: string;
  name: string;
  slug: string;
  description: string;
  image: string;
  imageAlt: string;
  level: CourseLevel;
  /** slugs الدورات المكوّنة للمسار */
  courseSlugs: string[];
  durationWeeks: number;
  /** نسبة خصم المسار % */
  discountPercent: number;
}

export interface Testimonial {
  id: string;
  name: string;
  role: string;
  /** تقييم من 1 إلى 5 */
  rating: 1 | 2 | 3 | 4 | 5;
  text: string;
  source: "google";
  /** تاريخ التقييم بصيغة ISO — Mock */
  date: string;
}

export interface BlogPost {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  image: string;
  imageAlt: string;
  category: string;
  date: string;
  readMinutes: number;
}

export interface CategoryInfo {
  id: CourseCategory;
  name: string;
  slug: string;
  description: string;
  image: string;
  imageAlt: string;
  features: string[];
}

export interface StatItem {
  /** القيمة الرقمية */
  value: number;
  suffix: string;
  label: string;
  icon: "users" | "book" | "award" | "handshake";
}

export interface PartnerOrg {
  id: string;
  name: string;
  nameEn?: string;
  /** وصف مختصر يظهر في الـ title فقط */
  note: string;
}

/** منصات التواصل المدعومة — المفتاح يحدد الأيقونة وصيغة الرابط. */
export const SOCIAL_PLATFORMS = [
  "instagram", "tiktok", "snapchat", "x", "youtube", "facebook",
  "linkedin", "telegram", "pinterest", "threads", "behance",
  "whatsapp", "email", "website",
] as const;

export type SocialPlatform = (typeof SOCIAL_PLATFORMS)[number];

export function isSocialPlatform(value: string): value is SocialPlatform {
  return (SOCIAL_PLATFORMS as readonly string[]).includes(value);
}

export interface SocialLink {
  id: SocialPlatform;
  label: string;
  href: string;
}
