/**
 * بيت المصور — Mock Seed لطبقة الإدارة
 * ------------------------------------
 * يُشتق من بيانات Phase 1 المركزية (src/data) بطريقة منظمة — لا نسخ يدوي
 * في أماكن متعددة — ثم يُثرى بحقول الإدارة (حالات، مواعيد، تسعير، SEO...).
 *
 * الضوابط:
 * - Deterministic: بلا `new Date()` أو Math.random — كل القيم ثابتة (2026).
 * - بلا API calls — بيانات محلية فقط.
 * - جاهز للاستبدال بقاعدة بيانات في Phase 3 دون تغيير الواجهة.
 */

import type { Course as PublicCourse, CourseSession as PublicSession } from "@/types";
import { courses as publicCourses } from "@/data/courses";
import { learningPaths as publicPaths } from "@/data/paths";
import { testimonials as publicTestimonials } from "@/data/testimonials";
import { accreditations, blogPosts as publicPosts, partners } from "@/data/content";
import { navLinks, policyLinks, siteConfig, socialLinks } from "@/data/site";
import { categories as publicCategories, stats as publicStats } from "@/data/categories";
import { images } from "@/data/images";

import type {
  AdminBlogPost,
  AdminCourse,
  AdminData,
  AdminModule,
  AdminRoleId,
  AdminTestimonial,
  AdminTrainer,
  AdminUser,
  BlogContentBlock,
  CorporateRequest,
  CourseSession,
  CtaContent,
  FooterSettings,
  HeroContent,
  HomepageContent,
  HomepageSection,
  LegalPage,
  MediaItem,
  OrganizationEntry,
  PaymentProviderSettings,
  PermissionAction,
  RequestTimelineEntry,
  Role,
  RolePermissions,
  SeoSettings,
  StatEntry,
  WhyUsItem,
} from "./types";
import {
  ALL_MODULES,
  MODULE_ACTIONS,
  adminPermissions,
  buildEmptyPermissions,
  contentEditorPermissions,
  courseManagerPermissions,
  defaultSystemRolePermissions,
  financePermissions,
  isSystemRole,
  normalizePermissions,
  ownerPermissions,
} from "./permissions";

/** رقم نسخة مخطط التخزين — أي تغيير شكل AdminData يستلزم رفعه.
 *  v2: دورة مرجعية معدّلة ("ورشة أساسيات التصوير") باسم ومنهج محدّثين من المالك.
 *  v3: العلاقة trainerIds[] ← trainerId? مفرد + shortBio للمدرب + featured للمسار (Checkpoint 3).
 *  v4: HomepageContent v2 (upcomingCourse/categories/featuredCourses/testimonials settings
 *      + whyUs.description + أيقونات العناصر + خلفية CTA) + المدونة بالكتل
 *      contentBlocks[] بدل content النصي — مع ترحيل تلقائي v3→v4 (Checkpoint 4).
 *  v5: طلبات الشركات (timeline + archivedAt) + الوسائط بنموذج جديد (mimeType/size/altText/
 *      caption/source/previewUrl/أبعاد) + FooterLink.enabled + تحقق SEO + displayName
 *      للمدفوعات + slug للصفحات القانونية — مع ترحيل تلقائي v4→v5 (Checkpoint 5).
 *  v6: المستخدمون والأدوار بمصفوفة صلاحيات حقيقية (Checkpoint 6):
 *      Role.kind (system/custom) + RolePermissions (15 وحدة × أفعال) + AdminUser
 *      (avatar/lastActiveAt/createdAt + status suspended بدل disabled) + currentUserId —
 *      مع ترحيل تلقائي v5→v6 يحمي بيانات المالك. */
export const ADMIN_CMS_VERSION = 6;

/** مفتاح localStorage — Mock CMS فقط (Phase 2) */
export const ADMIN_STORAGE_KEY = "bm-admin-cms-v1";

/* ═══════════════════════════ المدربون ═══════════════════════════ */

const TRAINER_SEED: AdminTrainer[] = [
  {
    id: "trainer-001",
    name: "أحمد الشريف",
    image: "",
    title: "مصور فوتوغرافي محترف",
    specialty: "التصوير الفوتوغرافي",
    shortBio: "مصور محترف وخبرة تتجاوز 12 عامًا في تدريب المصورين في جدة.",
    bio: "مصور محترف بخبرة تتجاوز 12 عامًا في تصوير المنتجات والبورتريه والإضاءة الاستوديوهية، درّب مئات المتدربين في جدة على الانتقال من الهواية إلى الاحتراف.",
    yearsOfExperience: 12,
    skills: ["إضاءة الاستوديو", "تصوير المنتجات", "تصوير البورتريه"],
    instagram: "https://instagram.com/baytalmosawer",
    status: "active",
  },
  {
    id: "trainer-002",
    name: "لينا العتيبي",
    image: "",
    title: "مصورة بورتريه",
    specialty: "بورتريه وصناعة المحتوى",
    shortBio: "مصورة بورتريه ومدرّبة صناعة محتوى لأعمال منشورة لعلامات محلية.",
    bio: "مصورة بورتريه ومدرّبة صناعة محتوى، تركز في تدريباتها على لغة التواصل مع الموديل وبناء التكوين الواعي، ولها أعمال منشورة لعدد من العلامات المحلية.",
    yearsOfExperience: 8,
    skills: ["تصوير البورتريه", "التصوير بالجوال", "تحرير الصور"],
    instagram: "https://instagram.com/baytalmosawer",
    status: "active",
  },
  {
    id: "trainer-003",
    name: "خالد الغامدي",
    image: "",
    title: "مخرج ومونتير",
    specialty: "الفيديو والمونتاج",
    shortBio: "مخرج ومونتير بخبرة عشر سنوات في الإنتاج المرئي التجاري.",
    bio: "مخرج ومونتير بخبرة عشر سنوات في الإنتاج المرئي التجاري، متخصص في اللغة السينمائية وإخراج المشاهد القصيرة وتدريب فرق المحتوى.",
    yearsOfExperience: 10,
    skills: ["الإخراج السينمائي", "المونتاج", "تصحيح الألوان"],
    website: "https://baytalmosawer.com",
    status: "active",
  },
];

function trainerIdByName(name: string): string {
  const match = TRAINER_SEED.find((t) => t.name === name);
  return match ? match.id : TRAINER_SEED[0].id;
}

/* ═══════════════════════════ الدورات ═══════════════════════════ */

const AUDIENCE_BY_LEVEL: Record<string, string[]> = {
  beginner: [
    "من يبدأ من الصفر بلا خبرة سابقة في التصوير",
    "أصحاب المتاجر وصنّاع المحتوى الراغبون في تحسين صورهم",
  ],
  intermediate: [
    "من أتمّ أساسيات التصوير أو يمتلك خبرة عملية بسيطة",
    "المصورون الراغبون في تطوير تخصص محدد",
  ],
  advanced: [
    "المصورون المتمرسون الساعون لمستوى الإنتاج التجاري",
    "من يعمل ضمن فرق إنتاج مرئي",
  ],
  "all-levels": ["كل المستويات — يُخصَّص المحتوى حسب هدف المتدرب"],
};

const REQUIREMENTS_BY_TYPE: Record<string, string[]> = {
  default: [
    "كاميرا (أي نوع متاح لديك — ونوفر معدات التدريب داخل المركز)",
    "لا توجد متطلبات معرفية مسبقة",
  ],
  online: [
    "جهاز حاسوب أو جوال بمتصفح حديث",
    "اتصال إنترنت مستقر للجلسات المباشرة",
  ],
  private: ["حضور جلسة تحديد أهداف المجانية قبل بدء البرنامج"],
  corporates: ["لا توجد متطلبات مسبقة — يُبنى البرنامج حول احتياج الجهة"],
};

function requirementsForCourse(course: PublicCourse): string[] {
  if (course.category === "private") return REQUIREMENTS_BY_TYPE.private;
  if (course.category === "in-person-corporates") return REQUIREMENTS_BY_TYPE.corporates;
  if (course.category === "online") return REQUIREMENTS_BY_TYPE.online;
  return REQUIREMENTS_BY_TYPE.default;
}

function toSession(
  session: PublicSession,
  course: PublicCourse,
  index: number,
): CourseSession {
  const isOnline = course.category === "online";
  return {
    id: session.id,
    batchName: `دفعة ${session.startDate.slice(0, 7).replace("-", "/")}`,
    startDate: session.startDate,
    endDate: session.endDate,
    startTime: isOnline ? "20:00" : "18:00",
    endTime: isOnline ? "22:00" : "21:00",
    location: session.location,
    city: session.location.includes("أونلاين") ? "أونلاين" : "جدة",
    seats: session.seatsTotal,
    registered: session.seatsTotal - session.seatsLeft,
    status: session.seatsLeft === 0 ? "full" : "open",
  };
}

function toAdminCourse(course: PublicCourse, index: number): AdminCourse {
  const createdStamp = `2026-08-${String((index % 20) + 1).padStart(2, "0")}T09:00:00.000Z`;
  const hoursPerDay =
    course.totalHours > 0 && course.durationDays > 0 && course.totalHours % course.durationDays === 0
      ? course.totalHours / course.durationDays
      : undefined;

  return {
    id: course.id,
    name: course.name,
    slug: course.slug,
    excerpt: course.shortDescription,
    description: course.description.join("\n\n"),
    type: course.category,
    level: course.level,
    language: "ar",
    status: course.upcomingSessions.length > 0 ? "registration-open" : "published",
    images: { main: course.image, alt: course.imageAlt },
    pricing: {
      price: course.price,
      showPrice: true,
      isFree: false,
      requestQuote: false,
    },
    duration: {
      days: course.durationDays,
      totalHours: course.totalHours,
      hoursPerDay,
    },
    outcomes: course.learningOutcomes,
    audience: AUDIENCE_BY_LEVEL[course.level] ?? AUDIENCE_BY_LEVEL["all-levels"],
    requirements: requirementsForCourse(course),
    curriculum: course.curriculum.map((module, dayIndex) => ({
      id: `${course.id}-day-${dayIndex + 1}`,
      dayNumber: dayIndex + 1,
      title: module.title,
      items: module.lessons.map((lesson, itemIndex) => ({
        id: `${course.id}-day-${dayIndex + 1}-item-${itemIndex + 1}`,
        title: lesson,
      })),
    })),
    sessions: course.upcomingSessions.map((session, i) => toSession(session, course, i)),
    trainerId: trainerIdByName(course.trainer.name),
    featured: course.featured,
    seo: {},
    createdAt: createdStamp,
    updatedAt: createdStamp,
  };
}

/**
 * الدورة المرجعية الرئيسية — "ورشة أساسيات التصوير" (course-001).
 * بيانات معتمدة من المالك تُطبَّق فوق النسخة المشتقة من بيانات الموقع العام
 * بطريقة منهجية (تجاوز واحد هنا — لا تعديل يدوي في أماكن متعددة)،
 * وتشمل: الاسم الكامل + الاسم المختصر + المنهج (4 أيام بمحاورها) + الموقع.
 * ملاحظة: صفحة الدورة العامة (Phase 1 المجمدة) تحمل اسم "أساسيات التصوير"
 * ونفس الـ slug — المعاينة الإدارية تربط بها دون أي تعديل على الموقع العام.
 */
const REFERENCE_COURSE_ID = "course-001";

const REFERENCE_COURSE_OVERRIDE: Partial<AdminCourse> = {
  name: "ورشة أساسيات التصوير",
  shortName: "أساسيات التصوير",
  curriculum: [
    {
      id: "course-001-day-1",
      dayNumber: 1,
      title: "اليوم الأول",
      items: [
        { id: "course-001-day-1-item-1", title: "مقدمة في التصوير الفوتوغرافي" },
        { id: "course-001-day-1-item-2", title: "تكوين الصورة الفوتوغرافية" },
        { id: "course-001-day-1-item-3", title: "آلية عمل الكاميرا وطريقة استخدامها" },
      ],
    },
    {
      id: "course-001-day-2",
      dayNumber: 2,
      title: "اليوم الثاني",
      items: [
        { id: "course-001-day-2-item-1", title: "الفرق بين أنواع الكاميرات" },
        { id: "course-001-day-2-item-2", title: "الفرق بين العدسات" },
      ],
    },
    {
      id: "course-001-day-3",
      dayNumber: 3,
      title: "اليوم الثالث",
      items: [
        { id: "course-001-day-3-item-1", title: "التعرف على أزرار وأوضاع الكاميرا" },
        {
          id: "course-001-day-3-item-2",
          title: "ضبط التعريض الصحيح في الوضع اليدوي Manual",
        },
      ],
    },
    {
      id: "course-001-day-4",
      dayNumber: 4,
      title: "اليوم الرابع",
      items: [{ id: "course-001-day-4-item-1", title: "عمق الميدان Depth of Field" }],
    },
  ],
};

/** موعد الدورة المرجعية — يُطبَّق على جلساتها بعد الاشتقاق */
const REFERENCE_SESSION_LOCATION = "مركز بيت المصور — حي الشرفية — جدة";

/** دورات Mock خاصة بلوحة التحكم — لتغطية حالات لا تمثّلها بيانات الموقع العام */
const ADMIN_ONLY_COURSES: AdminCourse[] = [
  {
    id: "course-009",
    name: "برنامج تدريب فرق العمل",
    shortName: "برنامج الشركات",
    slug: "corporate-team-program",
    excerpt:
      "برنامج تدريبي مصمم للجهات والشركات: تصوير وصناعة محتوى تُنفَّذ في مقر المركز أو مقر الجهة حسب الاحتياج.",
    description: [
      "برنامج مخصص للجهات يبدأ بجلسة تحليل احتياج الفريق، ثم يُبنى محتوى تدريبي عملي يغطي التصوير وصناعة المحتوى بما يخدم أهداف الجهة.",
      "يُنفَّذ البرنامج بمجموعات من فرق العمل نفسها مع مشاريع تطبيقية من بيئة العمل الفعلية، وتُسلَّم تقارير نتائج بتوصيات تطويرية.",
    ].join("\n\n"),
    type: "in-person-corporates",
    level: "all-levels",
    language: "ar",
    status: "published",
    images: {
      main: "/images/corporate-training.jpg",
      alt: "فريق شركة في برنامج تدريبي على صناعة المحتوى",
    },
    pricing: { price: 0, showPrice: false, isFree: false, requestQuote: true },
    duration: { days: 2, totalHours: 8, hoursPerDay: 4 },
    outcomes: [
      "فريق قادر على إنتاج محتوى بصري يخدم أهداف الجهة",
      "توحيد أسلوب التصوير والهوية البصرية عبر الفريق",
      "تقرير نتائج بتوصيات تطويرية قابلة للتطبيق",
    ],
    audience: ["فرق التسويق والمحتوى في الجهات والشركات", "الموظفون المسؤولون عن التواصل البصري"],
    requirements: REQUIREMENTS_BY_TYPE.corporates,
    curriculum: [
      {
        id: "course-009-day-1",
        dayNumber: 1,
        title: "اليوم الأول: الأساسيات وتحليل الاحتياج",
        items: [
          { id: "course-009-day-1-item-1", title: "جلسة تحليل احتياج الفريق" },
          { id: "course-009-day-1-item-2", title: "أساسيات التصوير العملية للفرق" },
        ],
      },
      {
        id: "course-009-day-2",
        dayNumber: 2,
        title: "اليوم الثاني: التطبيق والتسليم",
        items: [
          { id: "course-009-day-2-item-1", title: "مشروع تطبيقي من بيئة العمل" },
          { id: "course-009-day-2-item-2", title: "تسليم تقرير النتائج والتوصيات" },
        ],
      },
    ],
    sessions: [],
    trainerId: "trainer-001",
    featured: false,
    seo: {},
    createdAt: "2026-08-05T09:00:00.000Z",
    updatedAt: "2026-08-05T09:00:00.000Z",
  },
  {
    id: "course-010",
    name: "ورشة التصوير الليلي",
    shortName: "التصوير الليلي",
    slug: "night-photography-workshop",
    excerpt:
      "ورشة مسائية عملية للتصوير في الإضاءة المنخفضة: التعريض الطويل، الإضاءة الحضرية، وضبط الضوضاء الرقمية.",
    description: [
      "ورشة مسارية مكثفة داخل جدة تشرح تقنيات التصوير الليلي: حامل الثلاثي، التعريض الطويل، والتعامل مع مصادر الضوء الحضري.",
      "تنتهي الورشة بجولة تصوير عملية ومراجعة جماعية لأعمال المتدربين مع توصيات تحرير مخصصة.",
    ].join("\n\n"),
    type: "in-person-individuals",
    level: "intermediate",
    language: "ar",
    status: "draft",
    images: {
      main: "/images/course-lighting.jpg",
      alt: "ورشة تصوير ليلي بإضاءة منخفضة",
    },
    pricing: { price: 850, showPrice: true, isFree: false, requestQuote: false },
    duration: { days: 1, totalHours: 4 },
    outcomes: [
      "التصوير الواثق في الإضاءة المنخفضة",
      "ضبط التعريض الطويل دون اهتزاز",
      "معالجة الضوضاء الرقمية في التحرير",
    ],
    audience: ["من أتمّ أساسيات التصوير", "المهتمون بتصوير المدينة ليلاً"],
    requirements: [
      "كاميرا بوضع Manual وحامل ثلاثي",
      "خبرة بسيطة بإعدادات التعريض",
    ],
    curriculum: [
      {
        id: "course-010-day-1",
        dayNumber: 1,
        title: "الورشة المسارية",
        items: [
          { id: "course-010-day-1-item-1", title: "مقدمة: سلوك الضوء ليلاً" },
          { id: "course-010-day-1-item-2", title: "جولة تصوير عملية في كورنيش جدة" },
          { id: "course-010-day-1-item-3", title: "مراجعة الأعمال وتوصيات التحرير" },
        ],
      },
    ],
    sessions: [],
    trainerId: "trainer-001",
    featured: false,
    seo: {},
    createdAt: "2026-08-10T09:00:00.000Z",
    updatedAt: "2026-08-10T09:00:00.000Z",
  },
];

/** تطبيق منهجي للدورة المرجعية فوق النسخة المشتقة + توحيد موقع جلساتها */
function applyReferenceCourseOverride(courses: AdminCourse[]): AdminCourse[] {
  return courses.map((course) => {
    if (course.id !== REFERENCE_COURSE_ID) return course;
    return {
      ...course,
      ...REFERENCE_COURSE_OVERRIDE,
      sessions: course.sessions.map((session) => ({
        ...session,
        location: REFERENCE_SESSION_LOCATION,
      })),
    };
  });
}

export const courseSeed: AdminCourse[] = applyReferenceCourseOverride([
  ...publicCourses.map((course, index) => toAdminCourse(course, index)),
  ...ADMIN_ONLY_COURSES,
]);

/* ═══════════════════════════ المسارات ═══════════════════════════ */

const EXCERPTS_BY_SLUG: Record<string, string> = {
  "photography-professional": "ثلاث دورات متدرجة من الصفر إلى التحكم الكامل بالكاميرا والضوء.",
  "content-video": "من الجوال إلى السينمائي: مسار متكامل لمهارات الفيديو والمونتاج.",
};

export const pathSeed = publicPaths.map((path) => ({
  id: path.id,
  name: path.name,
  slug: path.slug,
  image: path.image,
  imageAlt: path.imageAlt,
  excerpt:
    EXCERPTS_BY_SLUG[path.slug] ??
    path.description.slice(0, 100),
  description: path.description,
  level: path.level,
  status: "published" as const,
  courseIds: path.courseSlugs
    .map((slug) => courseSeed.find((course) => course.slug === slug)?.id)
    .filter((id): id is string => Boolean(id)),
  discountPercent: path.discountPercent,
  featured: false,
}));

/* ═══════════════════ الصفحة الرئيسية (Homepage CMS) ═══════════════════ */

export const homepageSeed: HomepageContent = {
  sections: [
    { id: "hero", label: "القسم الافتتاحي (Hero)", enabled: true },
    { id: "statistics", label: "شريط الإحصائيات", enabled: true },
    { id: "upcoming-course", label: "الدورة القادمة", enabled: true },
    { id: "course-categories", label: "فئات الدورات", enabled: true },
    { id: "featured-courses", label: "الدورات المميزة", enabled: true },
    { id: "why-us", label: "لماذا نحن", enabled: true },
    { id: "accreditations", label: "الاعتمادات", enabled: true },
    { id: "partners", label: "شركاء النجاح", enabled: true },
    { id: "testimonials", label: "تقييمات المتدربين", enabled: true },
    { id: "cta", label: "دعوة الإجراء الأخيرة", enabled: true },
  ],
  hero: {
    title: "من الشغف إلى الاحتراف",
    description:
      "دورات تدريبية متخصصة في التصوير الفوتوغرافي والفيديو وصناعة المحتوى، يقدمها مدربون محترفون بأسلوب عملي يأخذك من الأساسيات إلى مستوى الاحتراف.",
    primaryCta: { text: "احجز دورتك الآن", url: "/courses" },
    secondaryCta: { text: "استكشف الدورات", url: "/courses" },
    image: images.hero.src,
    imageAlt: images.hero.alt,
  },
  statistics: publicStats.map((stat, index) => ({
    id: `stat-00${index + 1}`,
    label: stat.label,
    value: stat.value,
    suffix: stat.suffix,
    enabled: true,
  })),
  /* قسم الدورة القادمة — تلقائي افتراضيًا: أقرب Session متاحة عبر Selector */
  upcomingCourse: { mode: "automatic" },
  /* بطاقات الفئات الأربع — مشتقة من بيانات Phase 1 (لا يُغيَّر الـ enum) */
  categories: publicCategories.map((category) => ({
    categoryId: category.id,
    enabled: true,
    title: category.name,
    shortDescription: category.description,
    image: category.image,
    imageAlt: category.imageAlt,
    ctaLabel: "استكشف الدورات",
  })),
  /* الدورات المميزة — تلقائي: كل دورة Featured في المخزن */
  featuredCourses: { mode: "automatic", manualCourseIds: [] },
  whyUs: {
    title: "لماذا بيت المصور؟",
    description:
      "ما يميز تجربة التدريب معنا: تفاصيل صغيرة تصنع فرقًا كبيرًا في نتيجتك.",
    items: [
      {
        id: "why-001",
        title: "تطبيق عملي مباشر",
        description: "كل تدريب يعتمد على تنفيذ فعلي بالكاميرا، لا مجرد محاضرات نظرية.",
        iconKey: "lightbulb",
        enabled: true,
      },
      {
        id: "why-002",
        title: "مجموعات صغيرة",
        description: "مقاعد محدودة لكل دفعة لضمان إشراف فردي ووقت كافٍ لكل متدرب.",
        iconKey: "users",
        enabled: true,
      },
      {
        id: "why-003",
        title: "مدربون ممارسون",
        description: "يدربك محترفون يعملون فعليًا في السوق ويشاركون تجربتهم اليومية.",
        iconKey: "graduation",
        enabled: true,
      },
    ],
  },
  accreditations: accreditations.map((org, index) => ({
    id: org.id,
    name: org.name,
    logo: "",
    order: index + 1,
    visible: true,
  })),
  partners: partners.map((org, index) => ({
    id: org.id,
    name: org.name,
    logo: "",
    description: org.note,
    order: index + 1,
    visible: true,
  })),
  /* إعدادات قسم التقييمات في الرئيسية فقط — التقييمات نفسها في /admin/testimonials */
  testimonials: {
    title: "ماذا قالوا عن تجربتهم معنا",
    description:
      "نماذج من تقييمات المتدربين — الوضع التلقائي يعرض التقييمات المميزة (Featured).",
    mode: "automatic",
    manualIds: [],
  },
  cta: {
    title: "جاهز تبدأ رحلتك في عالم التصوير؟",
    description:
      "استعرض الدورات واختر ما يناسب مستواك، أو تواصل معنا عبر واتساب وسنساعدك في تحديد أنسب برنامج تدريبي لك.",
    primaryCta: { text: "استكشف الدورات", url: "/courses" },
    secondaryCta: { text: "تواصل عبر واتساب", url: siteConfig.whatsappLink },
    backgroundImage: "",
  },
};

/* ═══════════════════════════ التقييمات ═══════════════════════════ */

export const testimonialSeed: AdminTestimonial[] = publicTestimonials.map(
  (testimonial, index) => ({
    id: testimonial.id,
    name: testimonial.name,
    role: testimonial.role,
    rating: testimonial.rating,
    review: testimonial.text,
    source: "google" as const,
    featured: index < 3,
    visible: true,
    date: testimonial.date,
  }),
);

/* ═══════════════════════════ المدونة ═══════════════════════════ */

const POST_AUTHORS = ["أحمد الشريف", "لينا العتيبي", "فريق بيت المصور"];

function postContent(title: string, excerpt: string): string {
  return [
    excerpt,
    "في هذا المقال نأخذك خطوة بخطوة عبر أهم النقاط العملية التي تحتاجها، بأمثلة من تدريباتنا المباشرة داخل المركز، وبأسلوب مبسط يركّز على الفهم قبل الأدوات.",
    `طبّق ما تقرأه فورًا بكاميرتك أو جوالك؛ فالتصوير مهارة تُبنى بالتكرار الواعي أكثر من كثرة المعلومات. وإذا أردت التعمق في «${title}» تجد دوراتنا التدريبية المصنفة حسب المستوى في صفحة الدورات، أو تواصل معنا وسنرشدك للأنسب.`,
  ].join("\n\n");
}

/**
 * كتل المحتوى للبذرة — معرفات ثابتة Deterministic (بلا Math.random — D-10).
 * المقال الأول يُثرى بكل أنواع الكتل (فقرة/عنوان/اقتباس/قائمة) لتغطية
 * العرض في المعاينة — والبقية فقرات مشتقة من النص القديم نفسه.
 */
function postBlocks(title: string, excerpt: string, index: number): BlogContentBlock[] {
  const paragraphs = postContent(title, excerpt).split("\n\n");
  if (index === 0) {
    return [
      { id: "post-001-b1", type: "paragraph", text: paragraphs[0] },
      { id: "post-001-b2", type: "heading", text: "ثلاثة أسئلة تحدد كاميرتك المناسبة" },
      { id: "post-001-b3", type: "paragraph", text: paragraphs[1] },
      {
        id: "post-001-b4",
        type: "quote",
        text: "أفضل كاميرا هي التي تحملها فعلًا — اختر ما يخدم استمرارك في التصوير لا ما يبهرك في المواصفات.",
      },
      {
        id: "post-001-b5",
        type: "list",
        items: [
          "حدد ميزانيتك الشاملة مع عدسة إضافية إن أمكن",
          "جرّب الكاميرا بيدك قبل الشراء إن استطعت",
          "تأكد من توفر خدمة الصيانة محليًا",
        ],
      },
      { id: "post-001-b6", type: "paragraph", text: paragraphs[2] },
    ];
  }
  return paragraphs.map((text, blockIndex) => ({
    id: `post-${String(index + 1).padStart(3, "0")}-b${blockIndex + 1}`,
    type: "paragraph" as const,
    text,
  }));
}

export const postSeed: AdminBlogPost[] = publicPosts.map((post, index) => ({
  id: post.id,
  title: post.title,
  slug: post.slug,
  excerpt: post.excerpt,
  contentBlocks: postBlocks(post.title, post.excerpt, index),
  coverImage: post.image,
  coverImageAlt: post.imageAlt,
  category: post.category,
  tags: [post.category, "بيت المصور"],
  author: POST_AUTHORS[index % POST_AUTHORS.length],
  publishedAt: post.date,
  readMinutes: post.readMinutes,
  status: "published" as const,
  seo: { title: post.title, description: post.excerpt },
}));

/* ═══════════════════ طلبات تدريب الشركات ═══════════════════ */

/**
 * مساعد بناء حدث Timeline بثوابت Seed (Deterministic — D-10):
 * الحدث الافتتاحي بوصول الطلب actor = "النظام"، وتغييرات الحالة actor = "المالك".
 */
function tl(
  id: string,
  newStatus: RequestTimelineEntry["newStatus"],
  timestamp: string,
  previousStatus?: RequestTimelineEntry["previousStatus"],
): RequestTimelineEntry {
  return {
    id,
    newStatus,
    previousStatus,
    timestamp,
    actor: previousStatus ? "المالك" : "النظام",
  };
}

export const requestSeed: CorporateRequest[] = [
  {
    id: "req-001",
    company: "مدرسة مسارات العالمية",
    contactPerson: "أمين الأنشطة – سلطان الحربي",
    phone: "+966553120045",
    email: "activities@masarat-schools.sa",
    traineesCount: 20,
    requestedCourse: "برنامج صناعة المحتوى للفرق",
    notes: "يفضّل التنفيذ خلال العطلة الفصلية على دفعتين.",
    createdAt: "2026-08-28T10:30:00.000Z",
    status: "new",
    internalNotes: [],
    timeline: [tl("req-001-t1", "new", "2026-08-28T10:30:00.000Z")],
  },
  {
    id: "req-002",
    company: "متجر لمسة للتصوير",
    contactPerson: "مديرة التسويق – غادة المهيدب",
    phone: "+966564481220",
    email: "marketing@lamsa-store.sa",
    traineesCount: 6,
    requestedCourse: "تصوير المنتجات – برنامج مخصص",
    notes: "الهدف توحيد أسلوب تصوير المنتجات داخل المتجر.",
    createdAt: "2026-08-26T13:10:00.000Z",
    status: "contacted",
    internalNotes: [
      {
        id: "req-002-note-1",
        text: "تم التواصل هاتفيًا وتحديد جلسة لعرض البرنامج يوم الثلاثاء.",
        author: "منى الدوسري",
        createdAt: "2026-08-27T09:15:00.000Z",
      },
    ],
    timeline: [
      tl("req-002-t1", "new", "2026-08-26T13:10:00.000Z"),
      tl("req-002-t2", "contacted", "2026-08-27T09:15:00.000Z", "new"),
    ],
  },
  {
    id: "req-003",
    company: "شركة نسمة للعقارات",
    contactPerson: "مدير العمليات – فارس القاضي",
    phone: "+966550987731",
    email: "ops@nasmah-estate.sa",
    traineesCount: 12,
    requestedCourse: "التصوير الاحترافي للعقارات",
    notes: "يطلبون عرضًا يتضمن تصوير مواقع فعليًا كتدريب تطبيقي.",
    createdAt: "2026-08-22T08:45:00.000Z",
    status: "preparing-offer",
    internalNotes: [
      {
        id: "req-003-note-1",
        text: "أُرسلت الأسئلة التفصيلية وتم استلام رد الجهة.",
        author: "هيا السلمي",
        createdAt: "2026-08-24T11:00:00.000Z",
      },
    ],
    timeline: [
      tl("req-003-t1", "new", "2026-08-22T08:45:00.000Z"),
      tl("req-003-t2", "contacted", "2026-08-23T09:00:00.000Z", "new"),
      tl("req-003-t3", "preparing-offer", "2026-08-24T11:05:00.000Z", "contacted"),
    ],
  },
  {
    id: "req-004",
    company: "وكالة أفق للإعلان",
    contactPerson: "المدير الإبداعي – زياد مرزوق",
    phone: "+966557712098",
    email: "creative@ofoq-agency.sa",
    traineesCount: 8,
    requestedCourse: "الفيديو السينمائي – نسخة الشركات",
    notes: "الوكالة تريد رفع مستوى مخرجات فرق الإنتاج الداخلية.",
    createdAt: "2026-08-18T14:20:00.000Z",
    status: "offer-sent",
    internalNotes: [
      {
        id: "req-004-note-1",
        text: "أُرسل العرض المالي والتدريبي عبر البريد الرسمي.",
        author: "منى الدوسري",
        createdAt: "2026-08-20T10:05:00.000Z",
      },
      {
        id: "req-004-note-2",
        text: "الجهة تدرس الميزانية والرد المتوقع نهاية الشهر.",
        author: "هيا السلمي",
        createdAt: "2026-08-25T16:40:00.000Z",
      },
    ],
    timeline: [
      tl("req-004-t1", "new", "2026-08-18T14:20:00.000Z"),
      tl("req-004-t2", "contacted", "2026-08-19T09:30:00.000Z", "new"),
      tl("req-004-t3", "preparing-offer", "2026-08-19T16:00:00.000Z", "contacted"),
      tl("req-004-t4", "offer-sent", "2026-08-20T10:05:00.000Z", "preparing-offer"),
    ],
  },
  {
    id: "req-005",
    company: "مجموعة الواحة الغذائية",
    contactPerson: "مديرة الموارد البشرية – لمى الجفري",
    phone: "+966553349011",
    email: "hr@waha-group.sa",
    traineesCount: 15,
    requestedCourse: "برنامج تدريب فرق العمل",
    notes: "برنامج على يومين في مقر الشركة شمال جدة.",
    createdAt: "2026-08-12T09:00:00.000Z",
    status: "agreed",
    internalNotes: [
      {
        id: "req-005-note-1",
        text: "تم الاتفاق على البرنامج والتاريخ المقترح: 15–16 سبتمبر.",
        author: "منى الدوسري",
        createdAt: "2026-08-16T12:30:00.000Z",
      },
    ],
    timeline: [
      tl("req-005-t1", "new", "2026-08-12T09:00:00.000Z"),
      tl("req-005-t2", "contacted", "2026-08-13T10:00:00.000Z", "new"),
      tl("req-005-t3", "preparing-offer", "2026-08-14T12:00:00.000Z", "contacted"),
      tl("req-005-t4", "offer-sent", "2026-08-15T11:30:00.000Z", "preparing-offer"),
      tl("req-005-t5", "agreed", "2026-08-16T12:30:00.000Z", "offer-sent"),
    ],
  },
  {
    id: "req-006",
    company: "جمعية جدة الثقافية",
    contactPerson: "منسق البرامج – عمر باجبير",
    phone: "+966551903377",
    email: "programs@jeddah-culture.sa",
    traineesCount: 25,
    requestedCourse: "ورشة مقدمة في التصوير للشباب",
    notes: "طلب مقدم ضمن البرنامج الصيفي، ثم عُلّق لغياب التمويل.",
    createdAt: "2026-07-30T11:50:00.000Z",
    status: "closed",
    internalNotes: [
      {
        id: "req-006-note-1",
        text: "أُبلغت الجهة بإعادة فتح الطلب عند توفر ميزانية الدورة القادمة.",
        author: "منى الدوسري",
        createdAt: "2026-08-08T09:20:00.000Z",
      },
    ],
    timeline: [
      tl("req-006-t1", "new", "2026-07-30T11:50:00.000Z"),
      tl("req-006-t2", "contacted", "2026-08-01T09:00:00.000Z", "new"),
      tl("req-006-t3", "preparing-offer", "2026-08-02T10:30:00.000Z", "contacted"),
      tl("req-006-t4", "offer-sent", "2026-08-03T12:00:00.000Z", "preparing-offer"),
      tl("req-006-t5", "closed", "2026-08-08T09:20:00.000Z", "offer-sent"),
    ],
  },
];

/* ═══════════════════════════ الوسائط (Mock) ═══════════════════════════ */

const MEDIA_SEED_INPUT: Array<[name: string, url: string, alt: string, sizeBytes: number, caption?: string]> = [
  ["hero.jpg", "/images/hero.jpg", images.hero.alt, 1_990_000],
  ["about-studio.jpg", "/images/about-studio.jpg", images.about.alt, 1_680_000],
  ["corporate-training.jpg", "/images/corporate-training.jpg", images.corporate.alt, 1_780_000],
  ["course-fundamentals.jpg", "/images/course-fundamentals.jpg", "كاميرا احترافية على طاولة تدريب", 1_470_000],
  ["course-lighting.jpg", "/images/course-lighting.jpg", "معدات إضاءة استوديو", 1_260_000],
  ["course-portrait.jpg", "/images/course-portrait.jpg", "جلسة تصوير بورتريه", 1_150_000],
  ["course-products.jpg", "/images/course-products.jpg", "طاولة تصوير منتجات", 1_360_000],
  ["course-mobile.jpg", "/images/course-mobile.jpg", "تصوير احترافي بالجوال", 940_000],
  ["course-editing.jpg", "/images/course-editing.jpg", "شاشة تحرير فيديو", 1_050_000],
  ["course-video.jpg", "/images/course-video.jpg", "كاميرا سينمائية على ستيدي", 1_570_000],
  ["path-photography.jpg", "/images/path-photography.jpg", images.paths.photography.alt, 1_470_000],
  ["path-content.jpg", "/images/path-content.jpg", images.paths.content.alt, 1_260_000],
  ["category-individuals.jpg", "/images/category-individuals.jpg", images.categories.inPersonIndividuals.alt, 1_360_000],
  ["logo.png", "/images/logo.png", "شعار بيت المصور", 52_000, "الشعار الرسمي للمركز بخلفية شفافة"],
];

export const mediaSeed: MediaItem[] = MEDIA_SEED_INPUT.map(
  ([name, url, alt, sizeBytes, caption], index) => ({
    id: `media-${String(index + 1).padStart(3, "0")}`,
    name,
    type: "image" as const,
    mimeType: name.endsWith(".png") ? "image/png" : "image/jpeg",
    size: sizeBytes,
    altText: alt,
    caption,
    source: "seed" as const,
    previewUrl: url,
    createdAt: `2026-08-${String((index % 25) + 1).padStart(2, "0")}T09:00:00.000Z`,
  }),
);

/* ═══════════════════════════ الإعدادات ═══════════════════════════ */

const generalSeed = {
  siteNameAr: siteConfig.nameAr,
  siteNameEn: siteConfig.nameEn,
  logoDark: images.logo,
  logoLight: images.logo,
  favicon: "/icon.png",
  defaultLanguage: "ar",
  currency: "SAR",
  timezone: "Asia/Riyadh",
  city: siteConfig.city,
  country: "السعودية",
};

const contactSeed = {
  mainMobile: siteConfig.phone,
  whatsappNumber: siteConfig.whatsapp,
  whatsappMessage: "السلام عليكم، أردت الاستفسار عن الدورات",
  email: siteConfig.email,
  instagram: "https://instagram.com/baytalmosawer",
  tiktok: "https://tiktok.com/@baytalmosawer",
  address: siteConfig.address,
  workingHours: siteConfig.workingHours,
  channels: {
    mainMobile: true,
    whatsapp: true,
    secondaryPhone: false,
    email: true,
    instagram: true,
    tiktok: true,
    address: true,
    mapsUrl: false,
    workingHours: true,
  },
};

const footerSeed = {
  aboutText:
    "مركز متخصص في التدريب على التصوير الفوتوغرافي والفيديو وصناعة المحتوى في جدة، ببرامج عملية للأفراد والشركات يقدمها مدربون محترفون.",
  quickLinks: navLinks.map((link) => ({
    id: link.href,
    label: link.label,
    href: link.href,
    enabled: true,
  })),
  legalLinks: policyLinks.map((link) => ({
    id: link.href,
    label: link.label,
    href: link.href,
    enabled: true,
  })),
  socialLinks: socialLinks.map((link) => ({
    id: link.id,
    label: link.label,
    href: link.href,
    enabled: true,
  })),
  copyright: "© 2026 بيت المصور — جميع الحقوق محفوظة",
};

const seoSeed = {
  siteTitle: `${siteConfig.nameAr} | ${siteConfig.tagline} – ${siteConfig.city}`,
  defaultMetaDescription: siteConfig.description,
  ogImage: images.hero.src,
  socialImage: images.hero.src,
  indexSite: true,
};

const paymentsSeed: PaymentProviderSettings[] = [
  {
    id: "moyasar",
    name: "Moyasar",
    enabled: false,
    environment: "test",
    status: "not-configured",
  },
  {
    id: "tabby",
    name: "Tabby",
    enabled: false,
    environment: "test",
    status: "not-configured",
  },
  {
    id: "tamara",
    name: "Tamara",
    enabled: false,
    environment: "test",
    status: "not-configured",
  },
];

/* ═══════════════════════════ الأدوار والمستخدمون (Checkpoint 6) ═══════════════════════════ */

function systemRole(
  id: AdminRoleId,
  name: string,
  description: string,
  permissions: RolePermissions,
): Role {
  return { id, name, description, kind: "system", permissions };
}

/* المصفوفات الافتراضية معرّفة مركزيًا في ./permissions.ts (Defaults قابلة للتعديل
 * من اللوحة عدا المالك — المقفول كامل الوصول). */
const rolesSeed: Role[] = [
  systemRole(
    "owner",
    "المالك",
    "صلاحية كاملة على كل وحدات لوحة التحكم — دور نظامي مقفول لا يُعدَّل ولا يُحذف",
    ownerPermissions(),
  ),
  systemRole(
    "admin",
    "مسؤول النظام",
    "إدارة شاملة لكل الوحدات عدا صلاحيات المالك الحساسة: إدارة الأدوار نفسها وإعدادات الدفع",
    adminPermissions(),
  ),
  systemRole(
    "content-editor",
    "محرر محتوى",
    "الصفحة الرئيسية والمدونة والتقييمات ومكتبة الوسائط",
    contentEditorPermissions(),
  ),
  systemRole(
    "course-manager",
    "مدير الدورات",
    "الدورات ومواعيدها والمدربون والمسارات التعليمية",
    courseManagerPermissions(),
  ),
  systemRole(
    "finance",
    "المالية",
    "متابعة إعدادات الدفع وعرض بيانات طلبات الشركات ذات الصلة المالية",
    financePermissions(),
  ),
];

/* طوابع حتمية ثابتة (قاعدة D-10) — عمليات الجلسة الحية فقط تأخذ وقت التنفيذ */
const usersSeed: AdminUser[] = [
  {
    id: "user-001",
    name: "سعود الشريف",
    email: "saud@baytalmosawer.com",
    roleId: "owner",
    status: "active",
    lastActiveAt: "2026-08-30T14:20:00.000Z",
    createdAt: "2026-01-10",
  },
  {
    id: "user-002",
    name: "منى الدوسري",
    email: "mona@baytalmosawer.com",
    roleId: "admin",
    status: "active",
    lastActiveAt: "2026-08-29T11:05:00.000Z",
    createdAt: "2026-02-15",
  },
  {
    id: "user-003",
    name: "هيا السلمي",
    email: "haya@baytalmosawer.com",
    roleId: "content-editor",
    status: "active",
    lastActiveAt: "2026-08-28T09:40:00.000Z",
    createdAt: "2026-03-02",
  },
  {
    id: "user-004",
    name: "عبدالعزيز الفيصل",
    email: "aziz@baytalmosawer.com",
    roleId: "course-manager",
    status: "invited",
    lastActiveAt: undefined,
    createdAt: "2026-07-21",
  },
  {
    id: "user-005",
    name: "نواف البقمي",
    email: "nawaf@baytalmosawer.com",
    roleId: "finance",
    status: "active",
    lastActiveAt: "2026-08-25T16:55:00.000Z",
    createdAt: "2026-04-18",
  },
];

/* ═══════════════════════════ الصفحات القانونية ═══════════════════════════ */

const legalSeed: LegalPage[] = [
  {
    id: "privacy",
    title: "سياسة الخصوصية",
    slug: "privacy",
    lastUpdated: "2026-08-01",
    published: true,
    content: [
      "نحترم خصوصية زوار بيت المصور ونلتزم بحماية بياناتهم الشخصية. نجمع فقط البيانات اللازمة لإتمام التسجيل والتواصل: الاسم، رقم الجوال، البريد الإلكتروني، وبيانات الدورة المطلوبة.",
      "تُستخدم البيانات حصراً لإدارة التسجيلات وإرسال التذكيرات والتواصل بشأن البرامج التدريبية، ولا تُشارك مع أي طرف ثالث لأغراض تسويقية.",
      "يمكنك طلب تعديل بياناتك أو حذفها في أي وقت بالتواصل معنا عبر القنوات الرسمية الموضحة في صفحة التواصل.",
    ].join("\n\n"),
  },
  {
    id: "terms",
    title: "الشروط والأحكام",
    slug: "terms",
    lastUpdated: "2026-08-01",
    published: true,
    content: [
      "باستخدامك موقع بيت المصور والتسجيل في أي برنامج تدريبي، فإنك توافق على هذه الشروط. المحتوى التدريبي وأصوله مملوكة للمركز ولا يجوز إعادة نشرها أو بيعها دون إذن كتابي.",
      "المقاعد محدودة وتُثبَّت باستقبال رسوم الدورة. يحتفظ المركز بحق تعديل مواعيد أو مدربي الدورات لأسباب تشغيلية مع إشعار مسبق وبدائل مناسبة.",
      "يتحمل المتدرب مسؤولية الالتزام بنظام المركز واحترام المعدات والمرافق، وتُطبق تعويضات المعدات التالفة عمداً وفق تقييم المركز.",
    ].join("\n\n"),
  },
  {
    id: "refund",
    title: "سياسة الاسترجاع",
    slug: "refund",
    lastUpdated: "2026-08-01",
    published: true,
    content: [
      "يُسترد كامل المبلغ إذا أُلغيت الدورة من طرف المركز أو لم تتحقق الحد الأدنى من المسجلين.",
      "يُسترد 100% من المبلغ عند الإلغاء قبل 7 أيام من بداية الدورة، و50% عند الإلغاء خلال 3–6 أيام، ولا يُسترد المبلغ عند الإلغاء قبل الانعقاد بأقل من 48 ساعة.",
      "تُعالج مبالغ الاسترجاع على نفس وسيلة الدفع خلال 5–10 أيام عمل من اعتماد الطلب.",
    ].join("\n\n"),
  },
  {
    id: "registration-cancellation",
    title: "سياسة التسجيل والإلغاء",
    slug: "registration-cancellation",
    lastUpdated: "2026-08-01",
    published: true,
    content: [
      "يُتم التسجيل عبر الموقع أو قنوات التواصل الرسمية، ويفضل الحجز المبكر نظراً لمحدودية المقاعد في كل دفعة.",
      "للمتدرب نقل حجزه إلى دفعة لاحقة مرة واحدة مجاناً بشرط إخطارنا قبل 5 أيام من بداية الدورة، شريطة توفر مقاعد في الدفعة المقصودة.",
      "في حال عدم حضور الدورة دون إخطار مسبق تُعامل الحالة كإلغاء متأخر وفق سياسة الاسترجاع المعتمدة.",
    ].join("\n\n"),
  },
];

/* ═══════════════════════════ الجذر ═══════════════════════════ */

/** البيانات الأولية (Seed) — تُستخدم عند أول تشغيل وعند فقدان التخزين المحلي */
export const seedAdminData: AdminData = {
  version: ADMIN_CMS_VERSION,
  courses: courseSeed,
  trainers: TRAINER_SEED,
  paths: pathSeed,
  homepage: homepageSeed,
  testimonials: testimonialSeed,
  posts: postSeed,
  requests: requestSeed,
  media: mediaSeed,
  general: generalSeed,
  contact: contactSeed,
  footer: footerSeed,
  seo: seoSeed,
  payments: paymentsSeed,
  legal: legalSeed,
  roles: rolesSeed,
  users: usersSeed,
  /* المستخدم الحالي (Mock): المالك — بديل Authentication في هذه المرحلة */
  currentUserId: "user-001",
};

/* ═══════════════ ترحيل النسخ السابقة (v3 → v4 → v5) ═══════════════ */

/**
 * شكل v3 القديم للصفحة الرئيسية — كل الحقول الجديدة اختيارية هنا.
 * يُستخدم للترحيل فقط، ولا يُعرض على الواجهات الجديدة.
 */
type LegacyHomepageContent = Omit<Partial<HomepageContent>, "whyUs"> & {
  sections?: HomepageSection[];
  hero?: HeroContent;
  statistics?: StatEntry[];
  whyUs?: { title?: string; description?: string; items?: Array<Partial<WhyUsItem>> };
  accreditations?: OrganizationEntry[];
  partners?: OrganizationEntry[];
  cta?: Partial<CtaContent>;
};

/** شكل v3 القديم للمقال: content نص خام بدل contentBlocks */
type LegacyBlogPost = Omit<AdminBlogPost, "contentBlocks"> & {
  content?: string;
  contentBlocks?: BlogContentBlock[];
};

/** شكل v4 القديم لعنصر الوسائط (قبل Checkpoint 5) */
interface LegacyMediaItem {
  id: string;
  name: string;
  /** في v4 كان type يحمل الـ MIME مباشرة */
  type?: string;
  sizeLabel?: string;
  url?: string;
  alt?: string;
  uploadedAt?: string;
  /* حقول v5 — موجودة في البيانات الحديثة */
  previewUrl?: string;
  size?: number;
}

/** "1.9 MB" → 1990000 (لترحيل وسائط v4) */
function parseLegacySize(label: string | undefined): number {
  if (!label) return 0;
  const match = label.match(/([\d.]+)\s*(KB|MB|GB|B)?/i);
  if (!match) return 0;
  const value = Number.parseFloat(match[1]);
  if (Number.isNaN(value)) return 0;
  const unit = (match[2] ?? "B").toUpperCase();
  const factor = unit === "GB" ? 1e9 : unit === "MB" ? 1e6 : unit === "KB" ? 1e3 : 1;
  return Math.round(value * factor);
}

/** ترحيل عنصر وسائط v4 → v5 (mimeType/size/altText/previewUrl/source…) */
function migrateMediaItem(item: LegacyMediaItem): MediaItem {
  const legacy = !item.previewUrl;
  const mimeType =
    item.type && item.type.startsWith("image/") ? item.type : "image/jpeg";
  return {
    id: item.id,
    name: item.name,
    type: "image",
    mimeType,
    size: legacy ? parseLegacySize(item.sizeLabel) : (item.size ?? 0),
    altText: legacy ? (item.alt ?? "") : "",
    source: "seed",
    previewUrl: legacy ? (item.url ?? "") : (item.previewUrl ?? ""),
    createdAt: legacy
      ? `${item.uploadedAt ?? "2026-08-01"}T09:00:00.000Z`
      : "2026-08-01T09:00:00.000Z",
  };
}

/** ترحيل الطلب: توثيق الحالة الحالية كحدث افتتاحي إذا كان بلا Timeline */
function migrateRequest(request: CorporateRequest): CorporateRequest {
  if (Array.isArray(request.timeline) && request.timeline.length > 0) {
    return request;
  }
  return {
    ...request,
    timeline: [
      {
        id: `${request.id}-m1`,
        newStatus: request.status,
        timestamp: request.createdAt,
        actor: "النظام",
      },
    ],
  };
}

const LEGAL_SLUG_BY_ID: Record<string, string> = {
  privacy: "privacy",
  terms: "terms",
  refund: "refund",
  "registration-cancellation": "registration-cancellation",
};

/** ترحيل رابط Footer: إضافة enabled:true حيث غاب (v4 → v5) */
function migrateFooterLink(link: { id: string; label: string; href: string; enabled?: boolean }) {
  return { ...link, enabled: link.enabled ?? true };
}

/* ── v6: المستخدمون والأدوار ── */

/** شكل v5 القديم للدور: مستوى واحد (full/edit/view/none) لكل وحدة من 8 */
type LegacyRole = Omit<Role, "permissions" | "kind"> & {
  kind?: Role["kind"];
  permissions: Record<string, string> | Partial<Record<AdminModule, PermissionAction[]>>;
};

/** شكل v5 القديم للمستخدم: بلا avatar/lastActiveAt/createdAt وحالة disabled */
type LegacyUser = Omit<AdminUser, "createdAt" | "avatar" | "status"> & {
  avatar?: string;
  createdAt?: string;
  lastActiveAt?: string;
  status?: AdminUser["status"] | "disabled";
};

/**
 * ترحيل دور واحد إلى نموذج v6:
 * - الأدوار النظامية الخمسة: تُستبدل بالمصفوفة القانونية الافتراضية —
 *   لم يكن بإمكان المالك تعديلها قبل v6 (لا واجهة)، فلا فقدان فعلي،
 *   والافتراضيات موثقة وقابلة للتعديل من اللوحة بعد الترحيل.
 * - أدوار مخصصة (احتياطي لم يكن ممكنًا قبل v6): مستويات قديمة ← أفعال.
 * - مصفوفة v6 أصلًا (قيم مصفوفات): تمر عبر normalize فقط.
 */
function migrateRole(role: LegacyRole): Role {
  const kind: Role["kind"] = isSystemRole(role.id)
    ? "system"
    : (role.kind ?? "custom");

  /* بيانات v6 أصلًا؟ (قيم المصفوفات) — تطبيع فقط */
  const firstValue = Object.values(role.permissions ?? {})[0];
  if (Array.isArray(firstValue)) {
    return {
      ...role,
      kind,
      permissions: normalizePermissions(
        role.permissions as Partial<Record<AdminModule, PermissionAction[]>>,
      ),
    };
  }

  /* الأدوار النظامية: المصفوفة القانونية (لا خسارة — لا واجهة تعديل قبل v6) */
  if (kind === "system" && isSystemRole(role.id)) {
    const canonical = defaultSystemRolePermissions(role.id);
    return { ...role, kind, permissions: canonical };
  }

  /* احتياطي — أدوار مخصصة قديمة: تحويل المستويات إلى أفعال */
  const legacy = (role.permissions ?? {}) as Record<string, string>;
  const permissions = buildEmptyPermissions();
  for (const adminModule of ALL_MODULES) {
    const level = legacy[adminModule];
    const available = MODULE_ACTIONS[adminModule];
    if (level === "full") {
      permissions[adminModule] = [...available];
    } else if (level === "edit") {
      permissions[adminModule] = available.filter(
        (action) => action === "view" || action === "edit",
      );
    } else if (level === "view") {
      permissions[adminModule] = available.includes("view") ? ["view"] : [];
    } else {
      permissions[adminModule] = [];
    }
  }
  return { ...role, kind, permissions };
}

/** ترحيل مستخدم واحد: الحالة disabled ← suspended + الطوابع الحتمية الغائبة */
function migrateUser(user: LegacyUser): AdminUser {
  const status =
    user.status === "disabled"
      ? "suspended"
      : (user.status ?? "active");
  return {
    ...user,
    status,
    avatar: user.avatar,
    createdAt: user.createdAt ?? "2026-08-01",
    lastActiveAt: user.lastActiveAt ?? (status === "invited" ? undefined : "2026-08-30T14:20:00.000Z"),
  };
}

/**
 * ترحيل بيانات النسخ المخزنة محليًا إلى الشكل الحالي — بسيط وموثق:
 * 1) v3 → v4 (Checkpoint 4): الصفحة الرئيسية تُكمّل أقسامها الجديدة بقيم
 *    افتراضية آمنة مع الحفاظ على تعديلات المالك، والمدونة content النصي
 *    يُفصل عند الفقرات المزدوجة إلى كتل paragraph بلا فقد أي نص.
 * 2) v4 → v5 (Checkpoint 5): الطلبات تبدأ Timeline يوحّد حالتها، الوسائط
 *    تُحوَّل للنموذج الجديد، روابط الفوتر تأخذ enabled:true، وصفحات
 *    القانون تأخذ slug الموقع العام.
 * 3) v5 → v6 (Checkpoint 6): الأدوار بمصفوفة الصلاحيات الجديدة (15 وحدة ×
 *    أفعال) — النظامية بمصفوفاتها القانونية والمخصصة بتحويل مستويات —
 *    والمستخدمون بحقولهم الجديدة (suspended/createdAt/lastActiveAt/avatar)
 *    مع تثبيت currentUserId (المالك افتراضيًا).
 * يُرجع null إذا كانت البيانات غير قابلة للترحيل (نبقى على الـ Seed).
 */
export function migrateAdminData(raw: unknown): AdminData | null {
  if (!raw || typeof raw !== "object") return null;
  const prev = raw as AdminData & { homepage?: Partial<HomepageContent> };
  if (!Array.isArray(prev.courses) || !Array.isArray(prev.trainers)) return null;

  const base = homepageSeed;
  const legacyHp = (prev.homepage ?? {}) as LegacyHomepageContent;
  const legacyPosts = Array.isArray(prev.posts)
    ? (prev.posts as LegacyBlogPost[])
    : undefined;

  /* v4 كامل؟ يُحفظ موجودًا: الأقسام الأربعة المميزة لـ v4 كلها موجودة */
  const isV4Homepage = Boolean(legacyHp.upcomingCourse && legacyHp.categories);

  const migratedHomepage: HomepageContent = isV4Homepage
    ? /* v4/v5 — يمر كما هو مع تعبئة أي فجوة من الـ Seed */
      { ...base, ...legacyHp } as HomepageContent
    : /* v3 — نفس منطق Checkpoint 4 مع الحفاظ على الوصف وخلفية CTA */
      {
        sections: legacyHp.sections?.length ? legacyHp.sections : base.sections,
        hero: { ...base.hero, ...(legacyHp.hero ?? {}) },
        statistics: legacyHp.statistics ?? base.statistics,
        /* أقسام v4 الجديدة — تبدأ من الافتراض الآمن (تلقائي) */
        upcomingCourse: { mode: "automatic" },
        categories: base.categories,
        featuredCourses: { mode: "automatic", manualCourseIds: [] },
        whyUs: {
          title: legacyHp.whyUs?.title ?? base.whyUs.title,
          description: legacyHp.whyUs?.description ?? "",
          items: legacyHp.whyUs?.items?.length
            ? legacyHp.whyUs.items.map((item) => ({
                id: item.id ?? `why-${Math.abs(hashString(item.title ?? ""))}`,
                title: item.title ?? "",
                description: item.description ?? "",
                iconKey: item.iconKey,
                enabled: item.enabled ?? true,
              }))
            : base.whyUs.items,
        },
        accreditations: legacyHp.accreditations ?? base.accreditations,
        partners: legacyHp.partners ?? base.partners,
        testimonials: { ...base.testimonials, mode: "automatic", manualIds: [] },
        cta: {
          title: legacyHp.cta?.title ?? base.cta.title,
          description: legacyHp.cta?.description ?? base.cta.description,
          primaryCta: legacyHp.cta?.primaryCta ?? base.cta.primaryCta,
          secondaryCta: legacyHp.cta?.secondaryCta ?? base.cta.secondaryCta,
          backgroundImage: legacyHp.cta?.backgroundImage ?? "",
        },
      };

  const migratedPosts: AdminBlogPost[] = (legacyPosts ?? postSeed).map((post) => ({
    ...post,
    contentBlocks: migratePostBlocks(post),
  }));

  /* ── v5: طلبات الشركات ── */
  const migratedRequests: CorporateRequest[] = Array.isArray(prev.requests)
    ? prev.requests.map((request) => migrateRequest(request))
    : requestSeed;

  /* ── v5: الوسائط ── */
  const migratedMedia: MediaItem[] = Array.isArray(prev.media)
    ? prev.media.map((item) => migrateMediaItem(item as LegacyMediaItem))
    : mediaSeed;

  /* ── v5: الفوتر (enabled) ── */
  const legacyFooter = (prev.footer ?? {}) as Partial<FooterSettings>;
  const migratedFooter: FooterSettings = {
    ...footerSeed,
    ...legacyFooter,
    quickLinks: legacyFooter.quickLinks?.map(migrateFooterLink) ?? footerSeed.quickLinks,
    legalLinks: legacyFooter.legalLinks?.map(migrateFooterLink) ?? footerSeed.legalLinks,
    socialLinks: legacyFooter.socialLinks?.map(migrateFooterLink) ?? footerSeed.socialLinks,
  };

  /* ── v5: SEO (حقول تحقق نصية اختيارية — لا يلزم ترحيل) ── */
  const migratedSeo: SeoSettings = { ...seoSeed, ...(prev.seo ?? {}) };

  /* ── v5: الصفحات القانونية (slug) ── */
  const migratedLegal: LegalPage[] = Array.isArray(prev.legal)
    ? prev.legal.map((page) => ({
        ...page,
        slug: page.slug ?? LEGAL_SLUG_BY_ID[page.id] ?? page.id,
      }))
    : legalSeed;

  /* ── v6: الأدوار والمستخدمون ── */
  const migratedRoles: Role[] =
    Array.isArray(prev.roles) && prev.roles.length > 0
      ? prev.roles.map((role) => migrateRole(role as LegacyRole))
      : rolesSeed;
  const migratedUsers: AdminUser[] =
    Array.isArray(prev.users) && prev.users.length > 0
      ? prev.users.map((user) => migrateUser(user as LegacyUser))
      : usersSeed;
  const migratedCurrentUserId: string =
    prev.currentUserId && migratedUsers.some((user) => user.id === prev.currentUserId)
      ? prev.currentUserId
      : (migratedUsers.find((user) => user.roleId === "owner")?.id ??
        migratedUsers[0]?.id ??
        "user-001");

  return {
    ...prev,
    version: ADMIN_CMS_VERSION,
    homepage: migratedHomepage,
    posts: migratedPosts,
    requests: migratedRequests,
    media: migratedMedia,
    footer: migratedFooter,
    seo: migratedSeo,
    legal: migratedLegal,
    roles: migratedRoles,
    users: migratedUsers,
    currentUserId: migratedCurrentUserId,
  };
}

/** كتل محتوى المقال: إما الموجودة أو ترحيل النص الخام إلى فقرات */
function migratePostBlocks(post: LegacyBlogPost): BlogContentBlock[] {
  if (Array.isArray(post.contentBlocks) && post.contentBlocks.length > 0) {
    return post.contentBlocks;
  }
  const raw = typeof post.content === "string" ? post.content : "";
  return raw
    .split(/\n\n+/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .map((text, index) => ({
      id: `${post.id}-m${index + 1}`,
      type: "paragraph" as const,
      text,
    }));
}

/** Hash بسيط Deterministic لمعرفات عناصر whyUs المهاجرة */
function hashString(value: string): number {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) | 0;
  }
  return hash;
}

/* ═══════════════ تعقيم التخزين — منع حفظ Object URLs ═══════════════ */

/** تعقيم حقل صورة مفرد: blob: يُستبدل بالقيمة البديلة الممررة */
function safeImage(value: string | undefined, fallback = ""): string | undefined {
  if (value === undefined) return undefined;
  return value.startsWith("blob:") ? fallback : value;
}

/**
 * Object URLs (blob:) صالحة للجلسة الحالية فقط — يُمنع تخزينها في
 * localStorage. تُحذف عناصر الوسائط المحلية المرفوعة (local-preview)
 * وتُصفَّر حقول الصور المرفوعة إلى قيمها الافتراضية عند الحفظ.
 */
export function sanitizeForStorage(data: AdminData): AdminData {
  return {
    ...data,
    media: data.media.filter((item) => !item.previewUrl.startsWith("blob:")),
    courses: data.courses.map((course) => ({
      ...course,
      images: {
        ...course.images,
        main: course.images.main.startsWith("blob:") ? "" : course.images.main,
        cover: course.images.cover?.startsWith("blob:") ? undefined : course.images.cover,
      },
    })),
    posts: data.posts.map((post) => ({
      ...post,
      coverImage: post.coverImage.startsWith("blob:") ? "" : post.coverImage,
      /* كتل الصور: يُصفَّر مسار الصورة المؤقت وتبقى الكتلة بموضعها */
      contentBlocks: post.contentBlocks.map((block) =>
        block.type === "image"
          ? { ...block, image: safeImage(block.image) }
          : block,
      ),
    })),
    trainers: data.trainers.map((trainer) => ({
      ...trainer,
      image: trainer.image.startsWith("blob:") ? "" : trainer.image,
    })),
    /* Checkpoint 6: صور المستخدمين — نفس قاعدة تعقيم Object URLs (D-32) */
    users: data.users.map((user) => ({
      ...user,
      avatar:
        user.avatar && user.avatar.startsWith("blob:") ? undefined : user.avatar,
    })),
    homepage: {
      ...data.homepage,
      hero: {
        ...data.homepage.hero,
        image: data.homepage.hero.image.startsWith("blob:")
          ? images.hero.src
          : data.homepage.hero.image,
      },
      categories: data.homepage.categories.map((category) => ({
        ...category,
        image: safeImage(category.image) ?? "",
      })),
      accreditations: data.homepage.accreditations.map((org) => ({
        ...org,
        logo: safeImage(org.logo) ?? "",
      })),
      partners: data.homepage.partners.map((org) => ({
        ...org,
        logo: safeImage(org.logo) ?? "",
      })),
      cta: {
        ...data.homepage.cta,
        backgroundImage: safeImage(data.homepage.cta.backgroundImage),
      },
    },
  };
}
