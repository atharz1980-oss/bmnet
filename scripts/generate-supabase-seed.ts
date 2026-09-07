import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";

import { ALL_MODULES, MODULE_ACTIONS } from "../src/data/admin/permissions";
import { seedAdminData } from "../src/data/admin/seed";

const FIXED_AT = "2026-08-31T00:00:00.000Z";

function deterministicUuid(key: string) {
  const bytes = Buffer.from(createHash("sha256").update(`bayt-almosawer:${key}`).digest().subarray(0, 16));
  bytes[6] = (bytes[6] & 0x0f) | 0x50;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function text(value: unknown): string {
  if (value === null || value === undefined) return "null";
  return `'${String(value).replaceAll("'", "''")}'`;
}

function bool(value: unknown): string {
  return value ? "true" : "false";
}

function number(value: unknown): string {
  return value === null || value === undefined ? "null" : String(value);
}

function json(value: unknown): string {
  return `${text(JSON.stringify(value))}::jsonb`;
}

function textArray(values: string[]): string {
  return values.length ? `array[${values.map(text).join(", ")}]::text[]` : "'{}'::text[]";
}

type SqlRow = Record<string, string>;

function insertRows(table: string, rows: SqlRow[], conflict: string[], immutable = ["created_at", "updated_at"]) {
  if (!rows.length) return "";
  const columns = Object.keys(rows[0]);
  const updates = columns.filter((column) => !conflict.includes(column) && !immutable.includes(column));
  const values = rows.map((row) => `  (${columns.map((column) => row[column]).join(", ")})`).join(",\n");
  const conflictSql = conflict.join(", ");
  if (!updates.length) {
    return `insert into public.${table} (${columns.join(", ")}) values\n${values}\non conflict (${conflictSql}) do nothing;\n`;
  }
  const target = updates.map((column) => `${table}.${column}`).join(", ");
  const excluded = updates.map((column) => `excluded.${column}`).join(", ");
  const assignments = updates.map((column) => `${column} = excluded.${column}`).join(", ");
  return `insert into public.${table} (${columns.join(", ")}) values\n${values}\non conflict (${conflictSql}) do update set ${assignments}\nwhere (${target}) is distinct from (${excluded});\n`;
}

function courseState(status: string) {
  if (status === "draft") return { publish: "draft", operational: null };
  if (status === "published") return { publish: "published", operational: null };
  return { publish: "published", operational: status };
}

function tagSlug(name: string) {
  const known: Record<string, string> = {
    "نصائح للمبتدئين": "beginner-tips",
    "بيت المصور": "bayt-almosawer",
    "التكوين": "composition",
    "الإضاءة": "lighting",
    "المسار المهني": "career-path",
    "أساسيات": "fundamentals",
  };
  return known[name] ?? `tag-${deterministicUuid(`blog-tag:${name}`).slice(0, 8)}`;
}

function mediaFolder(name: string) {
  if (name === "hero.jpg" || name.startsWith("category-")) return "homepage";
  if (name === "about-studio.jpg" || name === "logo.png") return "site";
  if (name.startsWith("path-")) return "paths";
  return "courses";
}

function imageDimensions(buffer: Buffer, mimeType: string) {
  if (mimeType === "image/png") {
    if (buffer.toString("ascii", 1, 4) !== "PNG") throw new Error("Invalid PNG seed asset.");
    return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
  }

  if (mimeType === "image/jpeg") {
    let offset = 2;
    while (offset + 8 < buffer.length) {
      if (buffer[offset] !== 0xff) {
        offset += 1;
        continue;
      }
      const marker = buffer[offset + 1];
      if (marker === 0xd8 || marker === 0xd9) {
        offset += 2;
        continue;
      }
      const length = buffer.readUInt16BE(offset + 2);
      if (marker >= 0xc0 && marker <= 0xc3) {
        return { width: buffer.readUInt16BE(offset + 7), height: buffer.readUInt16BE(offset + 5) };
      }
      offset += length + 2;
    }
  }

  throw new Error(`Unable to read dimensions for ${mimeType}.`);
}

const d = seedAdminData;
const statements: string[] = [];
const push = (value: string) => value && statements.push(value);

const mediaRows = await Promise.all(d.media.map(async (item) => {
  const bytes = await readFile(new URL(`../public${item.previewUrl}`, import.meta.url));
  const dimensions = imageDimensions(bytes, item.mimeType);
  const extension = item.name.split(".").at(-1)?.toLowerCase();
  if (!extension) throw new Error(`Missing extension for ${item.name}.`);

  return {
    id: text(deterministicUuid(`media:${item.id}`)),
    bucket: text("bm-media"),
    storage_path: text(`${mediaFolder(item.name)}/${deterministicUuid(`media-object:${item.id}`)}.${extension}`),
    file_name: text(item.name),
    mime_type: text(item.mimeType),
    size_bytes: number(bytes.byteLength),
    alt_text: text(item.altText),
    caption: text(item.caption),
    width: number(dimensions.width),
    height: number(dimensions.height),
    uploaded_by: "null",
    created_at: text(item.createdAt),
    updated_at: text(item.createdAt),
  };
}));

push(insertRows("roles", d.roles.map((role) => ({
  id: text(deterministicUuid(`role:${role.id}`)), key: text(role.id), name: text(role.name),
  description: text(role.description), kind: text(role.kind), created_at: text(FIXED_AT), updated_at: text(FIXED_AT),
})), ["key"]));

push(insertRows("permissions", ALL_MODULES.flatMap((module) => MODULE_ACTIONS[module].map((action) => ({
  module: text(module), action: text(action),
}))), ["module", "action"]));

push(insertRows("role_permissions", d.roles.flatMap((role) => Object.entries(role.permissions).flatMap(([module, actions]) =>
  actions.map((action) => ({ role_id: text(deterministicUuid(`role:${role.id}`)), module: text(module), action: text(action) })))),
  ["role_id", "module", "action"]));

push(insertRows("trainers", d.trainers.map((trainer) => ({
  id: text(deterministicUuid(`trainer:${trainer.id}`)), name: text(trainer.name), image_path: text(trainer.image),
  image_alt: text(trainer.imageAlt), title: text(trainer.title), specialty: text(trainer.specialty),
  short_bio: text(trainer.shortBio), bio: text(trainer.bio), years_experience: number(trainer.yearsOfExperience),
  skills: textArray(trainer.skills), instagram_url: text(trainer.instagram), linkedin_url: text(trainer.linkedin),
  website_url: text(trainer.website), status: text(trainer.status), created_at: text(FIXED_AT), updated_at: text(FIXED_AT),
})), ["id"]));

push(insertRows("courses", d.courses.map((course) => {
  const state = courseState(course.status);
  return {
    id: text(deterministicUuid(`course:${course.id}`)), slug: text(course.slug), name: text(course.name),
    short_description: text(course.excerpt), description: text(course.description), category: text(course.type),
    level: text(course.level), language: text(course.language), trainer_id: text(deterministicUuid(`trainer:${course.trainerId}`)),
    image_path: text(course.images.main), image_alt: text(course.images.alt), price: number(course.pricing.price),
    original_price: number(course.pricing.originalPrice), discount_percent: number(course.pricing.discountPercent),
    show_price: bool(course.pricing.showPrice), is_free: bool(course.pricing.isFree), request_quote: bool(course.pricing.requestQuote),
    duration_days: number(course.duration.days), duration_hours: number(course.duration.totalHours),
    outcomes: textArray(course.outcomes), audience: textArray(course.audience), requirements: textArray(course.requirements),
    featured: bool(course.featured),
    publish_status: text(state.publish), operational_status: text(state.operational), seo_title: text(course.seo.title),
    seo_description: text(course.seo.description), created_at: text(course.createdAt ?? FIXED_AT), updated_at: text(course.updatedAt ?? FIXED_AT),
  };
}), ["id"]));

push(insertRows("course_sessions", d.courses.flatMap((course) => course.sessions.map((session) => ({
  id: text(deterministicUuid(`session:${session.id}`)), course_id: text(deterministicUuid(`course:${course.id}`)),
  batch_name: text(session.batchName), start_date: text(session.startDate), end_date: text(session.endDate),
  start_time: text(session.startTime), end_time: text(session.endTime), location: text(session.location), city: text(session.city),
  capacity: number(session.seats), registered_count: number(session.registered), price_override: "null",
  status: text(session.status), created_at: text(FIXED_AT), updated_at: text(FIXED_AT),
}))), ["id"]));

push(insertRows("course_curriculum_days", d.courses.flatMap((course) => course.curriculum.map((day, index) => ({
  id: text(deterministicUuid(`curriculum-day:${day.id}`)), course_id: text(deterministicUuid(`course:${course.id}`)),
  title: text(day.title), sort_order: number(index), created_at: text(FIXED_AT), updated_at: text(FIXED_AT),
}))), ["id"]));

push(insertRows("course_curriculum_items", d.courses.flatMap((course) => course.curriculum.flatMap((day) => day.items.map((item, index) => ({
  id: text(deterministicUuid(`curriculum-item:${item.id}`)), day_id: text(deterministicUuid(`curriculum-day:${day.id}`)),
  title: text(item.title), description: text(item.description), sort_order: number(index),
  created_at: text(FIXED_AT), updated_at: text(FIXED_AT),
})))), ["id"]));

push(insertRows("learning_paths", d.paths.map((path) => ({
  id: text(deterministicUuid(`path:${path.id}`)), slug: text(path.slug), name: text(path.name),
  short_description: text(path.excerpt), description: text(path.description), image_path: text(path.image), image_alt: text(path.imageAlt),
  level: text(path.level), discount_percent: number(path.discountPercent), publish_status: text(path.status), featured: bool(path.featured),
  created_at: text(FIXED_AT), updated_at: text(FIXED_AT),
})), ["id"]));

push(insertRows("learning_path_courses", d.paths.flatMap((path) => path.courseIds.map((courseId, index) => ({
  path_id: text(deterministicUuid(`path:${path.id}`)), course_id: text(deterministicUuid(`course:${courseId}`)),
  sort_order: number(index), created_at: text(FIXED_AT), updated_at: text(FIXED_AT),
}))), ["path_id", "course_id"]));

push(insertRows("testimonials", d.testimonials.map((item) => ({
  id: text(deterministicUuid(`testimonial:${item.id}`)), name: text(item.name), role: text(item.role), review: text(item.review),
  rating: number(item.rating), source: text(item.source), source_url: text(item.sourceUrl), featured: bool(item.featured),
  visible: bool(item.visible), reviewed_at: text(item.date), created_at: text(FIXED_AT), updated_at: text(FIXED_AT),
})), ["id"]));

push(insertRows("blog_posts", d.posts.map((post) => ({
  id: text(deterministicUuid(`blog-post:${post.id}`)), slug: text(post.slug), title: text(post.title), excerpt: text(post.excerpt),
  cover_path: text(post.coverImage), cover_alt: text(post.coverImageAlt), category: text(post.category), author_id: "null",
  publish_status: text(post.status), published_at: text(post.publishedAt ? `${post.publishedAt}T00:00:00.000Z` : null),
  seo_title: text(post.seo.title), seo_description: text(post.seo.description), created_at: text(FIXED_AT), updated_at: text(FIXED_AT),
})), ["id"]));

push(insertRows("blog_content_blocks", d.posts.flatMap((post) => post.contentBlocks.map((block, index) => {
  const { id, type, ...content } = block;
  return { id: text(deterministicUuid(`blog-block:${id}`)), post_id: text(deterministicUuid(`blog-post:${post.id}`)),
    block_type: text(type), content: json(content), sort_order: number(index), created_at: text(FIXED_AT), updated_at: text(FIXED_AT) };
})), ["id"]));

const tagNames = [...new Set(d.posts.flatMap((post) => post.tags))];
push(insertRows("blog_tags", tagNames.map((name) => ({
  id: text(deterministicUuid(`blog-tag:${name}`)), name: text(name), slug: text(tagSlug(name)),
})), ["id"]));
push(insertRows("blog_post_tags", d.posts.flatMap((post) => post.tags.map((name) => ({
  post_id: text(deterministicUuid(`blog-post:${post.id}`)), tag_id: text(deterministicUuid(`blog-tag:${name}`)), created_at: text(FIXED_AT),
}))), ["post_id", "tag_id"]));

push(insertRows("media", mediaRows, ["id"]));

push(insertRows("homepage_sections", d.homepage.sections.map((section, index) => ({
  section_key: text(section.id), enabled: bool(section.enabled), sort_order: number(index), updated_at: text(FIXED_AT),
})), ["section_key"]));
push(insertRows("homepage_hero", [{ id: "1", title: text(d.homepage.hero.title), description: text(d.homepage.hero.description),
  primary_cta_text: text(d.homepage.hero.primaryCta.text), primary_cta_url: text(d.homepage.hero.primaryCta.url),
  secondary_cta_text: text(d.homepage.hero.secondaryCta.text), secondary_cta_url: text(d.homepage.hero.secondaryCta.url),
  image_path: text(d.homepage.hero.image), image_alt: text(d.homepage.hero.imageAlt), updated_at: text(FIXED_AT) }], ["id"]));
push(insertRows("homepage_statistics", d.homepage.statistics.map((stat, index) => ({
  id: text(deterministicUuid(`homepage-stat:${stat.id}`)), label: text(stat.label), value: number(stat.value), prefix: text(stat.prefix),
  suffix: text(stat.suffix), enabled: bool(stat.enabled), sort_order: number(index), created_at: text(FIXED_AT), updated_at: text(FIXED_AT),
})), ["id"]));
push(insertRows("homepage_upcoming_course", [{ id: "1", mode: text(d.homepage.upcomingCourse.mode),
  manual_course_id: text(d.homepage.upcomingCourse.manualCourseId ? deterministicUuid(`course:${d.homepage.upcomingCourse.manualCourseId}`) : null),
  manual_session_id: text(d.homepage.upcomingCourse.manualSessionId ? deterministicUuid(`session:${d.homepage.upcomingCourse.manualSessionId}`) : null),
  updated_at: text(FIXED_AT) }], ["id"]));
push(insertRows("homepage_categories", d.homepage.categories.map((category, index) => ({
  id: text(deterministicUuid(`homepage-category:${category.categoryId}`)), category_key: text(category.categoryId), title: text(category.title),
  short_description: text(category.shortDescription), image_path: text(category.image), image_alt: text(category.imageAlt),
  cta_label: text(category.ctaLabel), enabled: bool(category.enabled), sort_order: number(index), created_at: text(FIXED_AT), updated_at: text(FIXED_AT),
})), ["id"]));
push(insertRows("homepage_featured_courses", [{ id: "1", mode: text(d.homepage.featuredCourses.mode), updated_at: text(FIXED_AT) }], ["id"]));
push(insertRows("homepage_featured_course_items", d.homepage.featuredCourses.manualCourseIds.map((courseId, index) => ({
  id: text(deterministicUuid(`homepage-featured-course:${courseId}`)), featured_courses_id: "1", course_id: text(deterministicUuid(`course:${courseId}`)),
  sort_order: number(index), created_at: text(FIXED_AT), updated_at: text(FIXED_AT),
})), ["id"]));
push(insertRows("homepage_why_us", [{ id: "1", title: text(d.homepage.whyUs.title), description: text(d.homepage.whyUs.description), updated_at: text(FIXED_AT) }], ["id"]));
push(insertRows("homepage_why_us_items", d.homepage.whyUs.items.map((item, index) => ({
  id: text(deterministicUuid(`homepage-why:${item.id}`)), title: text(item.title), description: text(item.description), icon_key: text(item.iconKey),
  enabled: bool(item.enabled), sort_order: number(index), created_at: text(FIXED_AT), updated_at: text(FIXED_AT),
})), ["id"]));
push(insertRows("homepage_testimonials", [{ id: "1", title: text(d.homepage.testimonials.title), description: text(d.homepage.testimonials.description),
  mode: text(d.homepage.testimonials.mode), updated_at: text(FIXED_AT) }], ["id"]));
push(insertRows("homepage_testimonial_items", d.homepage.testimonials.manualIds.map((testimonialId, index) => ({
  id: text(deterministicUuid(`homepage-testimonial:${testimonialId}`)), testimonials_section_id: "1",
  testimonial_id: text(deterministicUuid(`testimonial:${testimonialId}`)), sort_order: number(index), created_at: text(FIXED_AT), updated_at: text(FIXED_AT),
})), ["id"]));
push(insertRows("homepage_accreditations", d.homepage.accreditations.map((item) => ({
  id: text(deterministicUuid(`homepage-accreditation:${item.id}`)), name: text(item.name), logo_path: text(item.logo), url: text(item.url),
  description: text(item.description), visible: bool(item.visible), sort_order: number(item.order), created_at: text(FIXED_AT), updated_at: text(FIXED_AT),
})), ["id"]));
push(insertRows("homepage_partners", d.homepage.partners.map((item) => ({
  id: text(deterministicUuid(`homepage-partner:${item.id}`)), name: text(item.name), logo_path: text(item.logo), url: text(item.url),
  description: text(item.description), visible: bool(item.visible), sort_order: number(item.order), created_at: text(FIXED_AT), updated_at: text(FIXED_AT),
})), ["id"]));
push(insertRows("homepage_cta", [{ id: "1", title: text(d.homepage.cta.title), description: text(d.homepage.cta.description),
  primary_cta_text: text(d.homepage.cta.primaryCta.text), primary_cta_url: text(d.homepage.cta.primaryCta.url),
  secondary_cta_text: text(d.homepage.cta.secondaryCta.text), secondary_cta_url: text(d.homepage.cta.secondaryCta.url),
  background_image_path: text(d.homepage.cta.backgroundImage), background_image_alt: text(d.homepage.cta.backgroundImageAlt), updated_at: text(FIXED_AT) }], ["id"]));

push(insertRows("site_settings", [{ id: "1", site_name_ar: text(d.general.siteNameAr), site_name_en: text(d.general.siteNameEn),
  logo_dark_path: text(d.general.logoDark), logo_light_path: text(d.general.logoLight), favicon_path: text(d.general.favicon),
  default_language: text(d.general.defaultLanguage), currency: text(d.general.currency), timezone: text(d.general.timezone),
  city: text(d.general.city), country: text(d.general.country), updated_at: text(FIXED_AT) }], ["id"]));
push(insertRows("contact_settings", [{ id: "1", main_mobile: text(d.contact.mainMobile), whatsapp_number: text(d.contact.whatsappNumber),
  whatsapp_message: text(d.contact.whatsappMessage), secondary_phone: text(d.contact.secondaryPhone), email: text(d.contact.email),
  instagram_url: text(d.contact.instagram), tiktok_url: text(d.contact.tiktok), address: text(d.contact.address), maps_url: text(d.contact.mapsUrl),
  working_hours: text(d.contact.workingHours), channel_main_mobile: bool(d.contact.channels.mainMobile), channel_whatsapp: bool(d.contact.channels.whatsapp),
  channel_secondary_phone: bool(d.contact.channels.secondaryPhone), channel_email: bool(d.contact.channels.email), channel_instagram: bool(d.contact.channels.instagram),
  channel_tiktok: bool(d.contact.channels.tiktok), channel_address: bool(d.contact.channels.address), channel_maps: bool(d.contact.channels.mapsUrl),
  channel_working_hours: bool(d.contact.channels.workingHours), updated_at: text(FIXED_AT) }], ["id"]));
push(insertRows("footer_settings", [{ id: "1", about_text: text(d.footer.aboutText), copyright: text(d.footer.copyright), updated_at: text(FIXED_AT) }], ["id"]));
const footerGroups = [["quick", d.footer.quickLinks], ["legal", d.footer.legalLinks], ["social", d.footer.socialLinks]] as const;
push(insertRows("footer_links", footerGroups.flatMap(([group, links]) => links.map((link, index) => ({
  id: text(deterministicUuid(`footer-link:${group}:${link.id}`)), link_group: text(group), label: text(link.label), url: text(link.href),
  enabled: bool(link.enabled), sort_order: number(index), created_at: text(FIXED_AT), updated_at: text(FIXED_AT),
}))), ["id"]));
push(insertRows("seo_settings", [{ id: "1", site_title: text(d.seo.siteTitle), default_meta_description: text(d.seo.defaultMetaDescription),
  og_image_path: text(d.seo.ogImage), social_image_path: text(d.seo.socialImage), index_site: bool(d.seo.indexSite),
  google_verification: text(d.seo.googleVerification), bing_verification: text(d.seo.bingVerification), updated_at: text(FIXED_AT) }], ["id"]));
push(insertRows("payment_settings", d.payments.map((payment, index) => ({
  id: text(deterministicUuid(`payment:${payment.id}`)), provider: text(payment.id), enabled: bool(payment.enabled), environment: text(payment.environment),
  display_name: text(payment.name), sort_order: number(index), created_at: text(FIXED_AT), updated_at: text(FIXED_AT),
})), ["id"]));
push(insertRows("legal_pages", d.legal.map((page) => ({
  id: text(deterministicUuid(`legal:${page.slug}`)), slug: text(page.slug), title: text(page.title), content: text(page.content),
  published: bool(page.published), published_at: text(page.published ? `${page.lastUpdated}T00:00:00.000Z` : null),
  created_at: text(`${page.lastUpdated}T00:00:00.000Z`), updated_at: text(`${page.lastUpdated}T00:00:00.000Z`),
})), ["id"]));

const header = `-- بيت المصور — deterministic, idempotent database seed through CP-E\n-- Generated from src/data/admin/seed.ts, src/data/admin/permissions.ts, and the matching public image files.\n-- UUIDs are SHA-256(namespace + logical key), normalized to RFC 4122 version/variant bits.\n-- profiles and corporate request tables remain empty until Auth/operational data integration.\n-- media mirrors the 14 Mock entries backed by uploaded bm-media objects; byte sizes and dimensions come from the real files.\n-- Upserts update only changed business columns, preserving updated_at on a no-op rerun.\n\nbegin;\n\n`;
const output = `${header}${statements.join("\n")}\ncommit;\n`;
await writeFile(new URL("../supabase/seed.sql", import.meta.url), output, "utf8");
console.log(`Generated supabase/seed.sql (${output.length} bytes).`);
