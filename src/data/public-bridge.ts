/**
 * بيت المصور — جسر البيانات العامة (Public Data Bridge — Checkpoint 7 #20)
 * --------------------------------------------------------------------
 * وحدة نقية بلا React: تشتق «عرض الموقع العام» من AdminData (المصدر الوحيد)
 * بقواعد العرض العامة (مسودات مخفية، تقييمات غير ظاهرة مخفية، تسعير مشتق...)
 * مع fallbacks آمنة لكل مرجع مفقود — توثيق القرار D-45 في memory.md.
 *
 * الاستراتيجية: SSR يعرض بيانات Phase 1 الثابتة (المتجمدة) والعميل بعد الترطيب
 * يستبدلها بهذا الاشتقاق إن وُجد مخزن الإدارة في localStorage.
 */

import { isDisplayableSocialHref } from "@/lib/cms/social";
import type {
  BlogPost,
  CategoryInfo,
  Course,
  CourseCategory,
  CourseSession as PublicSession,
  LearningPath,
  PartnerOrg,
  SocialLink,
  StatItem,
  Testimonial,
} from "@/types";
import type {
  AdminBlogPost,
  AdminCourse,
  AdminData,
  AdminLearningPath,
  AdminTestimonial,
  AdminTrainer,
  BlogContentBlock,
  CtaContent,
  HeroContent,
  HomepageSection,
  WhyUsItem,
} from "./admin/types";
import { getSessionRemainingSeats, getUpcomingSessions } from "./admin/selectors";
import { categories as staticCategories, stats as staticStats } from "@/data/categories";
import { images } from "@/data/images";
import { siteConfig } from "@/data/site";
import { applyDiscount } from "@/lib/format";

/* ─────────────────── أنواع العرض العام ─────────────────── */

export interface PublicPathView {
  path: LearningPath;
  courses: Course[];
  pricing: { originalTotal: number; discountPercent: number; discountValue: number; finalPrice: number };
}

export interface PublicPostView {
  post: BlogPost;
  contentBlocks: BlogContentBlock[];
}

export interface PublicHomepageUpcoming {
  course: Course;
  session: PublicSession;
}

export interface PublicHomepageView {
  sections: HomepageSection[];
  hero: HeroContent;
  stats: StatItem[];
  upcoming: PublicHomepageUpcoming | null;
  categories: CategoryInfo[];
  featured: Course[];
  whyUs: { title: string; description: string; items: WhyUsItem[] };
  accreditations: PartnerOrg[];
  partners: PartnerOrg[];
  testimonials: { title: string; description: string; items: Testimonial[] };
  cta: CtaContent;
}

export interface PublicSettingsView {
  siteNameAr: string;
  siteNameEn: string;
  logo: string;
  city: string;
  phone: string;
  phoneDisplay: string;
  whatsappHref: string;
  email: string;
  instagram: string;
  tiktok: string;
  address: string;
  mapsUrl: string;
  workingHours: string;
  channels: {
    phone: boolean;
    whatsapp: boolean;
    email: boolean;
    address: boolean;
    workingHours: boolean;
    instagram: boolean;
    tiktok: boolean;
    maps: boolean;
  };
  footer: {
    aboutText: string;
    quickLinks: Array<{ label: string; href: string }>;
    legalLinks: Array<{ label: string; href: string }>;
    socialLinks: SocialLink[];
    copyright: string;
  };
}

export interface PublicLegalView {
  slug: string;
  title: string;
  paragraphs: string[];
  lastUpdated: string;
}

export interface PublicCmsView {
  courses: Course[];
  paths: PublicPathView[];
  posts: PublicPostView[];
  homepage: PublicHomepageView;
  settings: PublicSettingsView;
  legal: PublicLegalView[];
}

/* ─────────────────── مساعدات آمنة ─────────────────── */

/** مسار صورة صالح للعرض العام: مسار محلي أو رابط وسائط bm-media العام — وإلا الصورة البديلة */
function safeImage(value: string | undefined, fallback: string): string {
  if (value && value.startsWith("/") && !value.startsWith("//")) return value;
  /* صور مكتبة الوسائط تُحلّ إلى رابط عام على مخزن Supabase (resolveMediaUrl) —
     رفضها جعل أي صورة مرفوعة من الإدارة لا تُعرض على الموقع إطلاقًا. */
  if (value && value.includes("/storage/v1/object/public/bm-media/")) return value;
  return fallback;
}

/** أيقونة إحصائية حسب الترتيب (الإدارة لا تدير الأيقونات — تُوالَد دوريًا) */
const STAT_ICON_CYCLE: StatItem["icon"][] = ["users", "book", "award", "handshake"];

function statIcon(index: number): StatItem["icon"] {
  return staticStats[index % staticStats.length]?.icon ?? STAT_ICON_CYCLE[index % 4];
}

/** تحويل وقت 24h إلى صيغة العرض العربية (6:00 – 9:00 مساءً) */
function formatSessionTime(start: string, end: string): string {
  const to12 = (value: string): { label: string; period: string } => {
    const [hRaw, mRaw] = value.split(":");
    const h = Number(hRaw);
    if (!Number.isFinite(h)) return { label: value, period: "" };
    const period = h >= 12 ? "مساءً" : "صباحاً";
    const h12 = h % 12 === 0 ? 12 : h % 12;
    return { label: `${h12}:${mRaw ?? "00"}`, period };
  };
  const s = to12(start);
  const e = to12(end);
  if (s.period === e.period) return `${s.label} – ${e.label} ${s.period}`.trim();
  return `${s.label} ${s.period} – ${e.label} ${e.period}`;
}

/** تطبيع رقم الواتساب وتوليد رابط wa.me (نفس قاعدة الإدارة D-34) */
export function buildWhatsAppHref(number: string, message: string): string {
  const digits = number.replace(/\D/g, "");
  const normalized = digits.startsWith("05") && digits.length === 10
    ? `966${digits.slice(1)}`
    : digits;
  if (!/^9665\d{8}$/.test(normalized)) return siteConfig.whatsappLink;
  const text = message.trim() ? `?text=${encodeURIComponent(message.trim())}` : "";
  return `https://wa.me/${normalized}${text}`;
}

/** تنسيق عرض الهاتف (+966 55 123 4567) — أو القيمة كما كُتبت */
function formatPhoneDisplay(value: string): string {
  const digits = value.replace(/\D/g, "");
  if (/^966\d{9}$/.test(digits)) {
    return `+966 ${digits.slice(3, 5)} ${digits.slice(5, 8)} ${digits.slice(8)}`;
  }
  return value.trim() || siteConfig.phoneDisplay;
}

/* ─────────────────── اشتقاق الدورات ─────────────────── */

/** مدرب الدورة: المرجع بالمعرّف — المخفي يبقى صالحًا للدورات المرتبطة (قرار D-21) */
function resolveTrainer(
  trainerId: string | undefined,
  trainers: AdminTrainer[],
): Course["trainer"] {
  const trainer = trainerId
    ? trainers.find((entry) => entry.id === trainerId)
    : undefined;
  if (!trainer) {
    return { name: "فريق بيت المصور", title: "مدربون معتمدون" };
  }
  return {
    name: trainer.name,
    title: trainer.title,
    avatar: safeImage(trainer.image, "") || undefined,
  };
}

/**
 * الجلسات العامة: القادمة/المفتوحة/الممتلئة فقط.
 * والمغلقة والملغاة والمنتهية لا تُعرض — ولا ما مضى تاريخه: موعد فات ما زال
 * «مفتوحًا» في القاعدة كان يظهر متاحًا، وهو وعد لا يُوفى.
 */
function toPublicSessions(course: AdminCourse): PublicSession[] {
  const today = new Date().toISOString().slice(0, 10);
  return course.sessions
    .filter((session) => ["upcoming", "open", "full"].includes(session.status))
    .filter((session) => (session.endDate ?? session.startDate) >= today)
    .sort((a, b) => a.startDate.localeCompare(b.startDate))
    .map((session) => ({
      id: session.id,
      startDate: session.startDate,
      endDate: session.endDate,
      time: formatSessionTime(session.startTime, session.endTime),
      location: session.location,
      seatsTotal: session.seats,
      seatsLeft: getSessionRemainingSeats(session),
    }));
}

function courseImageFallback(category: CourseCategory): string {
  switch (category) {
    case "in-person-individuals":
      return images.categories.inPersonIndividuals.src;
    case "in-person-corporates":
      return images.categories.inPersonCorporates.src;
    case "online":
      return images.categories.online.src;
    default:
      return images.categories.private.src;
  }
}

function toPublicCourse(course: AdminCourse, trainers: AdminTrainer[]): Course {
  const sessions = toPublicSessions(course);
  return {
    id: course.id,
    name: course.name,
    slug: course.slug,
    shortDescription: course.excerpt,
    description: course.description
      .split(/\n\n+/)
      .map((p) => p.trim())
      .filter(Boolean),
    image: safeImage(course.images.main, courseImageFallback(course.type)),
    imageAlt: course.images.alt || course.name,
    category: course.type,
    level: course.level,
    price: course.pricing.price,
    durationDays: course.duration.days,
    totalHours: course.duration.totalHours,
    location: sessions[0]?.location ?? course.sessions[0]?.location ?? `بيت المصور – ${siteConfig.city}`,
    trainer: resolveTrainer(course.trainerId, trainers),
    curriculum: course.curriculum.map((day) => ({
      title: day.title,
      lessons: day.items.map((item) => item.title),
    })),
    learningOutcomes: course.outcomes,
    audience: course.audience,
    requirements: course.requirements,
    upcomingSessions: sessions,
    featured: course.featured,
    published: course.status !== "draft",
  };
}

/** دورة عامة = غير مسودة (بقية الحالات قابلة للعرض حسب القواعد الموثقة) */
function toPublicCourses(data: AdminData): Course[] {
  return data.courses
    .filter((course) => course.status !== "draft")
    .map((course) => toPublicCourse(course, data.trainers));
}

/* ─────────────────── اشتقاق المسارات ─────────────────── */

function pathImageFallback(slug: string): string {
  if (slug === "photography-professional") return images.paths.photography.src;
  if (slug === "content-video") return images.paths.content.src;
  return images.hero.src;
}

function toPublicPath(
  path: AdminLearningPath,
  publicCourses: Course[],
): PublicPathView {
  /* الدورات تُحل على الدورات العامة فقط — المرجع المفقود/المسودة يُتخطى بأمان */
  const courses = path.courseIds
    .map((id) => publicCourses.find((course) => course.id === id))
    .filter((course): course is Course => Boolean(course));
  const totalDays = courses.reduce((sum, course) => sum + course.durationDays, 0);
  /* التسعير مشتق لحظيًا من أسعار الدورات العامة — لا يُخزَّن أبدًا (قرار D-09) */
  const originalTotal = courses.reduce((sum, course) => sum + course.price, 0);
  const finalPrice = applyDiscount(originalTotal, path.discountPercent);
  return {
    path: {
      id: path.id,
      name: path.name,
      slug: path.slug,
      description: path.description,
      image: safeImage(path.image, pathImageFallback(path.slug)),
      imageAlt: path.imageAlt || path.name,
      level: path.level,
      courseSlugs: courses.map((course) => course.slug),
      /* غير مُدار في الـ CMS — يُشتق: أسبوع تدريبي لكل يومين دراسيين */
      durationWeeks: Math.max(1, Math.ceil(totalDays / 2)),
      discountPercent: path.discountPercent,
    },
    courses,
    pricing: {
      originalTotal,
      discountPercent: path.discountPercent,
      discountValue: originalTotal - finalPrice,
      finalPrice,
    },
  };
}

/* ─────────────────── اشتقاق المدونة والتقييمات ─────────────────── */

function toPublicPosts(posts: AdminBlogPost[]): PublicPostView[] {
  return posts
    .filter((post) => post.status === "published")
    .slice()
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))
    .map((post) => ({
      post: {
        id: post.id,
        slug: post.slug,
        title: post.title,
        excerpt: post.excerpt,
        image: safeImage(post.coverImage, images.upcomingCourse.src),
        imageAlt: post.coverImageAlt ?? post.title,
        category: post.category,
        date: post.publishedAt,
        readMinutes: post.readMinutes,
      },
      contentBlocks: post.contentBlocks,
    }));
}

function toPublicTestimonial(t: AdminTestimonial): Testimonial {
  return {
    id: t.id,
    name: t.name,
    role: t.role ?? "متدرب",
    rating: t.rating,
    text: t.review,
    source: "google",
    date: t.date,
  };
}

/* ─────────────────── اشتقاق الرئيسية ─────────────────── */

function toPublicCategories(data: AdminData): CategoryInfo[] {
  return data.homepage.categories
    .filter((category) => category.enabled)
    .map((category) => {
      const base = staticCategories.find((c) => c.id === category.categoryId);
      return {
        id: category.categoryId,
        name: category.title,
        slug: base?.slug ?? category.categoryId,
        description: category.shortDescription,
        image: safeImage(category.image, base?.image ?? images.hero.src),
        imageAlt: category.imageAlt ?? base?.imageAlt ?? category.title,
        features: base?.features ?? [],
      };
    });
}

function toPublicOrgs(entries: AdminData["homepage"]["accreditations"]): PartnerOrg[] {
  return entries
    .filter((entry) => entry.visible)
    .slice()
    .sort((a, b) => a.order - b.order)
    .map((entry) => ({
      id: entry.id,
      name: entry.name,
      note: entry.description ?? "",
    }));
}

function deriveUpcoming(
  data: AdminData,
  courses: Course[],
): PublicHomepageUpcoming | null {
  const settings = data.homepage.upcomingCourse;
  /* يدوي: صالح فقط باكتمال الدورة والموعد بحالة متاحة — وإلا fallback تلقائي (مواصفة #16) */
  if (settings.mode === "manual" && settings.manualCourseId) {
    const course = courses.find((entry) => entry.id === settings.manualCourseId);
    const session = course?.upcomingSessions.find(
      (entry) => entry.id === settings.manualSessionId,
    );
    if (course && session && session.seatsLeft >= 0) {
      return { course, session };
    }
  }
  const nearest = getUpcomingSessions(data, 1)[0];
  if (!nearest) return null;
  const publicCourse = courses.find((entry) => entry.id === nearest.course.id);
  const publicSession = publicCourse?.upcomingSessions.find(
    (entry) => entry.id === nearest.session.id,
  );
  if (!publicCourse || !publicSession) return null;
  return { course: publicCourse, session: publicSession };
}

function deriveHomepage(data: AdminData, courses: Course[]): PublicHomepageView {
  const homepage = data.homepage;
  const stats: StatItem[] = homepage.statistics
    .filter((entry) => entry.enabled)
    .map((entry, index) => ({
      value: entry.value,
      suffix: entry.suffix ?? entry.prefix ?? "",
      label: entry.label,
      icon: statIcon(index),
    }));
  const featured =
    homepage.featuredCourses.mode === "manual"
      ? homepage.featuredCourses.manualCourseIds
          .map((id) => courses.find((course) => course.id === id))
          .filter((course): course is Course => Boolean(course))
      : courses.filter((course) => course.featured);
  const testimonialItems =
    homepage.testimonials.mode === "manual"
      ? homepage.testimonials.manualIds
          .map((id) => data.testimonials.find((t) => t.id === id))
          .filter(
            (t): t is AdminTestimonial => Boolean(t) && Boolean(t?.visible),
          )
          .map(toPublicTestimonial)
      : data.testimonials
          .filter((t) => t.featured && t.visible)
          .map(toPublicTestimonial);
  return {
    sections: homepage.sections,
    hero: {
      ...homepage.hero,
      image: safeImage(homepage.hero.image, images.hero.src),
    },
    stats,
    upcoming: deriveUpcoming(data, courses),
    categories: toPublicCategories(data),
    featured,
    whyUs: {
      title: homepage.whyUs.title,
      description: homepage.whyUs.description,
      items: homepage.whyUs.items.filter((item) => item.enabled),
    },
    accreditations: toPublicOrgs(homepage.accreditations),
    partners: toPublicOrgs(homepage.partners),
    testimonials: {
      title: homepage.testimonials.title,
      description: homepage.testimonials.description,
      items: testimonialItems,
    },
    cta: homepage.cta,
  };
}

/* ─────────────────── اشتقاق الإعدادات والقانون ─────────────────── */

/**
 * روابط المنصات تأتي من جدول social_links المفتاحه المنصة. الاشتقاق القديم
 * كان يقارن uuid صف الفوتر باسم المنصة فيسقط كل رابط — أُزيل بالكامل.
 */
function deriveSocial(data: AdminData): SocialLink[] {
  return data.social
    .filter((link) => link.enabled && isDisplayableSocialHref(link.url))
    .map((link) => ({ id: link.platform, label: link.label, href: link.url.trim() }));
}

function deriveSettings(data: AdminData): PublicSettingsView {
  const general = data.general;
  const contact = data.contact;
  const footer = data.footer;
  const channels = contact.channels;
  return {
    siteNameAr: general.siteNameAr || siteConfig.nameAr,
    siteNameEn: general.siteNameEn || siteConfig.nameEn,
    logo: safeImage(general.logoLight, images.logo),
    city: general.city || siteConfig.city,
    phone: contact.mainMobile || siteConfig.phone,
    phoneDisplay: formatPhoneDisplay(contact.mainMobile),
    whatsappHref: buildWhatsAppHref(contact.whatsappNumber, contact.whatsappMessage),
    email: contact.email || siteConfig.email,
    instagram: contact.instagram,
    tiktok: contact.tiktok,
    address: contact.address || siteConfig.address,
    mapsUrl: contact.mapsUrl ?? "",
    workingHours: contact.workingHours || siteConfig.workingHours,
    channels: {
      phone: channels.mainMobile,
      whatsapp: channels.whatsapp,
      email: channels.email,
      address: channels.address,
      workingHours: channels.workingHours,
      instagram: channels.instagram,
      tiktok: channels.tiktok,
      maps: channels.mapsUrl,
    },
    footer: {
      aboutText: footer.aboutText,
      quickLinks: footer.quickLinks
        .filter((link) => link.enabled !== false)
        .map((link) => ({ label: link.label, href: link.href })),
      legalLinks: footer.legalLinks
        .filter((link) => link.enabled !== false)
        .map((link) => ({ label: link.label, href: link.href })),
      socialLinks: deriveSocial(data),
      copyright: footer.copyright,
    },
  };
}

function deriveLegal(data: AdminData): PublicLegalView[] {
  return data.legal
    .filter((page) => page.published)
    .map((page) => ({
      slug: page.slug || page.id,
      title: page.title,
      paragraphs: page.content
        .split(/\n\n+/)
        .map((p) => p.trim())
        .filter(Boolean),
      lastUpdated: page.lastUpdated,
    }));
}

/* ─────────────────── الجذر: الاشتقاق الكامل ─────────────────── */

export function derivePublicCms(data: AdminData): PublicCmsView {
  const courses = toPublicCourses(data);
  return {
    courses,
    paths: data.paths
      .filter((path) => path.status === "published")
      .map((path) => toPublicPath(path, courses)),
    posts: toPublicPosts(data.posts),
    homepage: deriveHomepage(data, courses),
    settings: deriveSettings(data),
    legal: deriveLegal(data),
  };
}
