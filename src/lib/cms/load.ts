/**
 * بيت المصور — الحمل المتوازي لبيانات الـ CMS (CP-G)
 * ----------------------------------------------------
 * يُنفّذ كل استعلامات الـ CMS دفعة واحدة (Parallel) ويعيد إما نتائج
 * كاملة أو إخفاقات لكل جدول على حدة:
 *
 * - strict (الإدارة): أي فشل يُرفع — اللوحة تعرض خطأ تحميل صريح.
 * - tolerate (الموقع العام): الجداول المحمية (profiles/roles) تفشل
 *   للزائر العام فتُعال قوائم فارغة بدل كسر الصفحة (قرار موثق).
 *
 * عميل واحد يُمرَّر من الأعلى: خدمة (إدارة) أو anon بلا كوكيز (عام — D-86).
 */
import type { SupabaseClient } from "@supabase/supabase-js";

import {
  assembleAdminData,
  contactFromDb,
  courseFromDb,
  footerFromDb,
  generalFromDb,
  homepageFromDb,
  legalFromDb,
  mediaFromDb,
  paymentsFromDb,
  postFromDb,
  requestFromDb,
  rolesFromDb,
  seoFromDb,
  testimonialFromDb,
  trainerFromDb,
  usersFromDb,
  pathFromDb,
  type BlogBlockRow,
  type BlogPostRow,
  type BlogTagRow,
  type CourseRow,
  type CurriculumDayRow,
  type CurriculumItemRow,
  type FooterLinkRow,
  type HomepageCategoryRow,
  type HomepageCtaRow,
  type HomepageFeaturedItemRow,
  type HomepageFeaturedRow,
  type HomepageHeroRow,
  type HomepageOrgRow,
  type HomepageSectionRow,
  type HomepageStatRow,
  type HomepageTestimonialItemRow,
  type HomepageTestimonialsRow,
  type HomepageUpcomingRow,
  type HomepageWhyUsItemRow,
  type HomepageWhyUsRow,
  type LegalPageRow,
  type MediaRow,
  type PathCourseRow,
  type PathRow,
  type PaymentSettingsRow,
  type ProfileDbRow,
  type RequestNoteRow,
  type RequestRow,
  type RequestTimelineRow,
  type RoleDbRow,
  type RolePermissionRow,
  type SessionRow,
  type SeoSettingsRow,
  type SiteSettingsRow,
  type ContactSettingsRow,
  type FooterSettingsRow,
  type TestimonialRow,
  type TrainerRow,
} from "./mappers";
import type { AdminData } from "@/data/admin/types";

/** نتيجة استعلام واحد متسامح */
export interface LoadResult<T> {
  rows: T;
  failed: boolean;
}

const EMPTY = { rows: [], failed: false } as const;

function tolerant<T>(promise: Promise<{ data: T | null; error: unknown }>): Promise<LoadResult<T>> {
  return promise.then(
    (result) =>
      result.error || result.data === null
        ? { rows: [] as unknown as T, failed: true }
        : { rows: result.data, failed: false },
    () => ({ rows: [] as unknown as T, failed: true }),
  );
}

export interface LoadOutcome {
  data: AdminData | null;
  failures: string[];
}

/**
 * الحمل الكامل لبيانات الـ CMS من قاعدة البيانات.
 * mode=strict: أي فشل يعيد data=null + قائمة الأعمدة الفاشلة.
 * mode=tolerate: فشل الجداول المحمية لا يمنع التجميع.
 */
export async function loadCmsData(
  client: SupabaseClient,
  mode: "strict" | "tolerate",
  emails: Map<string, string> = new Map(),
): Promise<LoadOutcome> {
  const [
    trainersRes,
    coursesRes,
    sessionsRes,
    daysRes,
    itemsRes,
    pathsRes,
    pathCoursesRes,
    testimonialsRes,
    postsRes,
    blocksRes,
    tagLinksRes,
    requestsRes,
    notesRes,
    timelineRes,
    mediaRes,
    sectionsRes,
    heroRes,
    statsRes,
    upcomingRes,
    categoriesRes,
    featuredRes,
    featuredItemsRes,
    whyUsRes,
    whyUsItemsRes,
    accreditationsRes,
    partnersRes,
    hpTestimonialsRes,
    hpTestimonialItemsRes,
    ctaRes,
    siteRes,
    contactRes,
    footerRes,
    footerLinksRes,
    seoRes,
    paymentsRes,
    legalRes,
    rolesRes,
    rolePermissionsRes,
    profilesRes,
  ] = await Promise.all([
    client.from("trainers").select("*").order("created_at", { ascending: true }),
    client.from("courses").select("*").order("created_at", { ascending: false }),
    client.from("course_sessions").select("*").order("start_date", { ascending: true }),
    client.from("course_curriculum_days").select("*").order("sort_order", { ascending: true }),
    client.from("course_curriculum_items").select("*").order("sort_order", { ascending: true }),
    client.from("learning_paths").select("*").order("created_at", { ascending: true }),
    client.from("learning_path_courses").select("*").order("sort_order", { ascending: true }),
    client.from("testimonials").select("*").order("created_at", { ascending: false }),
    client.from("blog_posts").select("*").order("created_at", { ascending: false }),
    client.from("blog_content_blocks").select("*").order("sort_order", { ascending: true }),
    client
      .from("blog_post_tags")
      .select("post_id, blog_tags(name)")
      .order("post_id"),
    client.from("corporate_requests").select("*").order("created_at", { ascending: false }),
    client.from("corporate_request_notes").select("*").order("created_at", { ascending: true }),
    client.from("corporate_request_timeline").select("*").order("created_at", { ascending: true }),
    client.from("media").select("*").order("created_at", { ascending: false }),
    client.from("homepage_sections").select("*").order("sort_order", { ascending: true }),
    client.from("homepage_hero").select("*").maybeSingle(),
    client.from("homepage_statistics").select("*").order("sort_order", { ascending: true }),
    client.from("homepage_upcoming_course").select("*").maybeSingle(),
    client.from("homepage_categories").select("*").order("sort_order", { ascending: true }),
    client.from("homepage_featured_courses").select("*").maybeSingle(),
    client.from("homepage_featured_course_items").select("*").order("sort_order", { ascending: true }),
    client.from("homepage_why_us").select("*").maybeSingle(),
    client.from("homepage_why_us_items").select("*").order("sort_order", { ascending: true }),
    client.from("homepage_accreditations").select("*").order("sort_order", { ascending: true }),
    client.from("homepage_partners").select("*").order("sort_order", { ascending: true }),
    client.from("homepage_testimonials").select("*").maybeSingle(),
    client.from("homepage_testimonial_items").select("*").order("sort_order", { ascending: true }),
    client.from("homepage_cta").select("*").maybeSingle(),
    client.from("site_settings").select("*").maybeSingle(),
    client.from("contact_settings").select("*").maybeSingle(),
    client.from("footer_settings").select("*").maybeSingle(),
    client.from("footer_links").select("*").order("sort_order", { ascending: true }),
    client.from("seo_settings").select("*").maybeSingle(),
    client.from("payment_settings").select("*").order("sort_order", { ascending: true }),
    client.from("legal_pages").select("*").order("created_at", { ascending: true }),
    client.from("roles").select("*").order("created_at", { ascending: true }),
    client.from("role_permissions").select("role_id, module, action"),
    client.from("profiles").select("*").order("created_at", { ascending: true }),
  ]);

  const failures: string[] = [];
  const tableNames = [
    "trainers", "courses", "course_sessions", "course_curriculum_days",
    "course_curriculum_items", "learning_paths", "learning_path_courses",
    "testimonials", "blog_posts", "blog_content_blocks", "blog_post_tags",
    "corporate_requests", "corporate_request_notes", "corporate_request_timeline",
    "media", "homepage_sections", "homepage_hero", "homepage_statistics",
    "homepage_upcoming_course", "homepage_categories", "homepage_featured_courses",
    "homepage_featured_course_items", "homepage_why_us", "homepage_why_us_items",
    "homepage_accreditations", "homepage_partners", "homepage_testimonials",
    "homepage_testimonial_items", "homepage_cta", "site_settings",
    "contact_settings", "footer_settings", "footer_links", "seo_settings",
    "payment_settings", "legal_pages", "roles", "role_permissions", "profiles",
  ];
  const results = [
    trainersRes, coursesRes, sessionsRes, daysRes, itemsRes, pathsRes,
    pathCoursesRes, testimonialsRes, postsRes, blocksRes, tagLinksRes,
    requestsRes, notesRes, timelineRes, mediaRes, sectionsRes, heroRes,
    statsRes, upcomingRes, categoriesRes, featuredRes, featuredItemsRes,
    whyUsRes, whyUsItemsRes, accreditationsRes, partnersRes, hpTestimonialsRes,
    hpTestimonialItemsRes, ctaRes, siteRes, contactRes, footerRes,
    footerLinksRes, seoRes, paymentsRes, legalRes, rolesRes,
    rolePermissionsRes, profilesRes,
  ];

  results.forEach((result, index) => {
    if (result?.error) {
      const name = tableNames[index] ?? `table-${index}`;
      if (mode === "strict") failures.push(name);
      else if (!["profiles", "roles", "role_permissions"].includes(name)) failures.push(name);
    }
  });

  if (mode === "strict" && failures.length > 0) {
    return { data: null, failures };
  }
  /* tolerate: فشل جداول المحتوى الجوهرية يعني صفحة عامة مكسورة — نرفع أيضًا */
  if (mode === "tolerate" && failures.length > 0 && coursesRes?.error) {
    return { data: null, failures };
  }

  /* ── المدونة: وسم الروابط + أسماء المؤلفين ── */
  const postRows = (postsRes?.data ?? []) as BlogPostRow[];
  const tagLinkRows = (tagLinksRes?.data ?? []) as Array<{ post_id: string; blog_tags: { name: string } | { name: string }[] | null }>;
  const blockRows = (blocksRes?.data ?? []) as BlogBlockRow[];
  const profileRows = (profilesRes?.data ?? []) as ProfileDbRow[];
  const profileNames = new Map(profileRows.map((row) => [row.id, row.name]));

  const tagsByPost = new Map<string, string[]>();
  for (const link of tagLinkRows) {
    if (!link) continue;
    const raw = link.blog_tags;
    const name = Array.isArray(raw) ? raw[0]?.name : raw?.name;
    if (!name) continue;
    const list = tagsByPost.get(link.post_id) ?? [];
    list.push(name);
    tagsByPost.set(link.post_id, list);
  }

  /* ── الطلبات: أسماء الملاحظين/الفاعلين ── */
  const requestRows = (requestsRes?.data ?? []) as RequestRow[];

  /* ── الدورات والمسارات ── */
  const courseRows = (coursesRes?.data ?? []) as CourseRow[];
  const sessionRows = (sessionsRes?.data ?? []) as SessionRow[];
  const dayRows = (daysRes?.data ?? []) as CurriculumDayRow[];
  const itemRows = (itemsRes?.data ?? []) as CurriculumItemRow[];
  const pathRows = (pathsRes?.data ?? []) as PathRow[];
  const pathCourseRows = (pathCoursesRes?.data ?? []) as PathCourseRow[];

  const homepage = homepageFromDb({
    rows: (sectionsRes?.data ?? []) as HomepageSectionRow[],
    hero: (heroRes?.data ?? null) as HomepageHeroRow | null,
    stats: (statsRes?.data ?? []) as HomepageStatRow[],
    upcoming: (upcomingRes?.data ?? null) as HomepageUpcomingRow | null,
    categories: (categoriesRes?.data ?? []) as HomepageCategoryRow[],
    featured: (featuredRes?.data ?? null) as HomepageFeaturedRow | null,
    featuredItems: (featuredItemsRes?.data ?? []) as HomepageFeaturedItemRow[],
    whyUs: (whyUsRes?.data ?? null) as HomepageWhyUsRow | null,
    whyUsItems: (whyUsItemsRes?.data ?? []) as HomepageWhyUsItemRow[],
    accreditations: (accreditationsRes?.data ?? []) as HomepageOrgRow[],
    partners: (partnersRes?.data ?? []) as HomepageOrgRow[],
    testimonials: (hpTestimonialsRes?.data ?? null) as HomepageTestimonialsRow | null,
    testimonialItems: (hpTestimonialItemsRes?.data ?? []) as HomepageTestimonialItemRow[],
    cta: (ctaRes?.data ?? null) as HomepageCtaRow | null,
  });

  const data = assembleAdminData({
    courses: courseRows.map((row) => courseFromDb(row, {
      sessions: sessionRows.filter((entry) => entry.course_id === row.id),
      curriculumDays: dayRows.filter((entry) => entry.course_id === row.id),
      curriculumItems: itemRows,
    })),
    trainers: ((trainersRes?.data ?? []) as TrainerRow[]).map(trainerFromDb),
    paths: pathRows.map((row) => pathFromDb(row, pathCourseRows)),
    homepage,
    testimonials: ((testimonialsRes?.data ?? []) as TestimonialRow[]).map(testimonialFromDb),
    posts: postRows.map((row) => postFromDb(row, {
      blocks: blockRows.filter((block) => block.post_id === row.id),
      tags: tagsByPost.get(row.id) ?? [],
      authorName: (row.author_id ? profileNames.get(row.author_id) : undefined) ?? "",
    })),
    requests: requestRows.map((row) => requestFromDb(row, {
      notes: (notesRes?.data ?? []) as RequestNoteRow[],
      timeline: (timelineRes?.data ?? []) as RequestTimelineRow[],
      profileNames,
    })),
    media: ((mediaRes?.data ?? []) as MediaRow[]).map(mediaFromDb),
    general: generalFromDb((siteRes?.data ?? null) as SiteSettingsRow | null),
    contact: contactFromDb((contactRes?.data ?? null) as ContactSettingsRow | null),
    footer: footerFromDb(
      (footerRes?.data ?? null) as FooterSettingsRow | null,
      (footerLinksRes?.data ?? []) as FooterLinkRow[],
    ),
    seo: seoFromDb((seoRes?.data ?? null) as SeoSettingsRow | null),
    payments: paymentsFromDb((paymentsRes?.data ?? []) as PaymentSettingsRow[]),
    legal: legalFromDb((legalRes?.data ?? []) as LegalPageRow[]),
    roles: rolesFromDb(
      (rolesRes?.data ?? []) as RoleDbRow[],
      (rolePermissionsRes?.data ?? []) as RolePermissionRow[],
    ),
    users: usersFromDb(profileRows, emails),
    /* المستخدم الحالي يُشتق من الجلسة في الواجهة — في البيانات نضع أول مالك */
    currentUserId: profileRows[0]?.id ?? "",
  });

  return { data, failures };
}

export { EMPTY as emptyLoadResult, tolerant as loadTolerant };
