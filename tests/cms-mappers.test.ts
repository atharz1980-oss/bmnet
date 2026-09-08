/// <reference types="bun-types" />
/**
 * اختبارات محولات الـ CMS (CP-G) — نقية بلا قاعدة بيانات
 * bun test tests/cms-mappers.test.ts
 */
import { describe, expect, test } from "bun:test";

import {
  mergeCourseStatus,
  splitCourseStatus,
  resolveMediaUrl,
  toStoragePath,
  normalizeTime,
  normalizeDate,
  paragraphsToText,
  textToParagraphs,
  permissionsFromRows,
  deriveReadMinutes,
  sessionsFromDb,
  curriculumFromDb,
  courseFromDb,
  postFromDb,
  requestFromDb,
  mediaFromDb,
  paymentsFromDb,
  trainerFromDb,
  pathFromDb,
  legalFromDb,
  homepageSectionsFromDb,
} from "../src/lib/cms/mappers";
import { sanitizeSlug, isValidEmail, isValidSaudiPhone, safeInternalNext } from "../src/lib/cms/result";

/* ── حالة الدورة (D-80) ── */
describe("mergeCourseStatus / splitCourseStatus", () => {
  test("draft يغلب على أي حالة تشغيلية", () => {
    expect(mergeCourseStatus({ publish_status: "draft", operational_status: "full" })).toBe("draft");
  });

  test("published بلا حالة تشغيلية → published", () => {
    expect(mergeCourseStatus({ publish_status: "published", operational_status: null })).toBe("published");
  });

  test("published مع حالة تشغيلية تعيدها كما هي", () => {
    expect(mergeCourseStatus({ publish_status: "published", operational_status: "registration-open" })).toBe("registration-open");
  });

  test("التفكيك العكسي متماثل للقيم المعروفة", () => {
    expect(splitCourseStatus("draft")).toEqual({ publish_status: "draft", operational_status: null });
    expect(splitCourseStatus("published")).toEqual({ publish_status: "published", operational_status: null });
    expect(splitCourseStatus("coming-soon")).toEqual({ publish_status: "published", operational_status: "coming-soon" });
  });

  test("قيمة تشغيلية غير معروفة → coming-soon (أمان)", () => {
    expect(splitCourseStatus("nonsense")).toEqual({ publish_status: "published", operational_status: "coming-soon" });
  });
});

/* ── الوسائط (D-81) ── */
describe("resolveMediaUrl / toStoragePath", () => {
  test("المسارات المحلية تُعاد كما هي", () => {
    expect(resolveMediaUrl("/images/hero.jpg")).toBe("/images/hero.jpg");
    expect(resolveMediaUrl("//evil.example/x")).toBe("//evil.example/x");
  });

  test("مسار التخزين يحصل على Public URL كامل", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    expect(resolveMediaUrl("courses/abc.jpg")).toBe(
      "https://example.supabase.co/storage/v1/object/public/bm-media/courses/abc.jpg",
    );
  });

  test("الفارغ يبقى فارغًا", () => {
    expect(resolveMediaUrl("")).toBe("");
    expect(resolveMediaUrl(null)).toBe("");
  });

  test("الرابط الكامل يُختصر إلى مسار التخزين", () => {
    expect(
      toStoragePath("https://example.supabase.co/storage/v1/object/public/bm-media/courses/a%20b.jpg"),
    ).toBe("courses/a b.jpg");
    expect(toStoragePath("/images/local.png")).toBe("/images/local.png");
  });
});

/* ── التطبيع ── */
describe("normalizeTime / normalizeDate / paragraphs", () => {
  test("أوقات DB تُختصر إلى ساعة:دقيقة", () => {
    expect(normalizeTime("18:00:00")).toBe("18:00");
    expect(normalizeTime("9:05")).toBe("09:05");
    expect(normalizeTime(null)).toBe("00:00");
  });

  test("التواريخ تُقتطع إلى YYYY-MM-DD", () => {
    expect(normalizeDate("2026-09-14T10:00:00Z")).toBe("2026-09-14");
    expect(normalizeDate("2026-09-14")).toBe("2026-09-14");
    expect(normalizeDate(null)).toBe("");
  });

  test("الفقرات تُفصل وتُجمع بأسطر فارغة", () => {
    const text = paragraphsToText(["أولى", "ثانية"]);
    expect(text).toBe("أولى\n\nثانية");
    expect(textToParagraphs("أ\n\nب\n\n \n")).toEqual(["أ", "ب"]);
  });
});

/* ── الصلاحيات ── */
describe("permissionsFromRows", () => {
  test("تجميع الأفعال لكل وحدة وإلحاق view تلقائيًا", () => {
    const matrix = permissionsFromRows([
      { module: "courses", action: "edit" },
      { module: "courses", action: "view" },
      { module: "roles", action: "manage" },
      { module: "garbage", action: "hack" },
    ]);
    expect(matrix.courses).toContain("view");
    expect(matrix.courses).toContain("edit");
    expect(matrix.roles).toContain("manage");
    expect(matrix.roles).toContain("view");
    expect(matrix.legal).toEqual([]);
  });
});

/* ── readMinutes ── */
describe("deriveReadMinutes", () => {
  test("حد أدنى دقيقة ونسبة 180 كلمة", () => {
    expect(deriveReadMinutes([{ text: "كلمة" }])).toBe(1);
    const long = { text: Array(360).fill("word").join(" ") };
    expect(deriveReadMinutes([long])).toBe(2);
  });
});

/* ── الجلسات والمنهج ── */
describe("sessionsFromDb / curriculumFromDb", () => {
  test("تحويل جلسة كامل مع تطبيع الوقت وسعر الدفعة", () => {
    const rows = sessionsFromDb([
      {
        id: "s1", course_id: "c1", batch_name: "دفعة سبتمبر",
        start_date: "2026-09-20", end_date: "2026-09-22",
        start_time: "18:00:00", end_time: "21:00:00",
        location: "الاستوديو", city: "جدة", capacity: 12, registered_count: 5,
        price_override: 1500, status: "open",
      },
    ]);
    expect(rows[0]).toMatchObject({
      id: "s1", batchName: "دفعة سبتمبر", startDate: "2026-09-20",
      startTime: "18:00", seats: 12, registered: 5, price: 1500, status: "open",
    });
  });

  test("حالة جلسة غير معروفة → upcoming", () => {
    const rows = sessionsFromDb([{
      id: "s2", course_id: "c1", batch_name: null, start_date: "2026-10-01",
      end_date: null, start_time: "10:00", end_time: "12:00", location: "",
      city: "", capacity: 0, registered_count: 0, price_override: null, status: "weird",
    }]);
    expect(rows[0].status).toBe("upcoming");
    expect(rows[0].price).toBeUndefined();
  });

  test("المنهج: ترتيب الأيام والعناصر", () => {
    const days = curriculumFromDb(
      [
        { id: "d2", course_id: "c1", title: "اليوم الثاني", sort_order: 2 },
        { id: "d1", course_id: "c1", title: "اليوم الأول", sort_order: 1 },
      ],
      [
        { id: "i2", day_id: "d1", title: "الثاني", description: null, sort_order: 2 },
        { id: "i1", day_id: "d1", title: "الأول", description: null, sort_order: 1 },
      ],
    );
    expect(days.map((day) => day.title)).toEqual(["اليوم الأول", "اليوم الثاني"]);
    expect(days[0].items.map((item) => item.title)).toEqual(["الأول", "الثاني"]);
  });
});

/* ── الدورة ── */
describe("courseFromDb", () => {
  test("دمج الحالة والتسعير والمدرب", () => {
    const course = courseFromDb(
      {
        id: "c1", slug: "basics", name: "أساسيات", short_description: "مختصر",
        description: "نص", category: "online", level: "beginner", language: "ar",
        trainer_id: "t1", image_path: "courses/img.jpg", image_alt: "صورة",
        price: 999.5, original_price: "1200", discount_percent: 10,
        show_price: true, is_free: false, request_quote: false,
        duration_days: 3, duration_hours: 12,
        outcomes: ["أ"], audience: [], requirements: [],
        featured: true, publish_status: "published", operational_status: "registration-open",
        seo_title: null, seo_description: null,
        created_at: "2026-01-01T00:00:00Z", updated_at: "2026-01-02T00:00:00Z",
      },
      { sessions: [], curriculumDays: [], curriculumItems: [] },
    );
    expect(course.status).toBe("registration-open");
    expect(course.pricing.price).toBe(999.5);
    expect(course.pricing.originalPrice).toBe(1200);
    expect(course.images.main).toContain("bm-media/courses/img.jpg");
    expect(course.trainerId).toBe("t1");
  });
});

/* ── المقالات ── */
describe("postFromDb", () => {
  test("الكتل والوسوم والمؤلف", () => {
    const post = postFromDb(
      {
        id: "p1", slug: "post", title: "مقال", excerpt: "مختصر",
        cover_path: "blog/cover.jpg", cover_alt: "غلاف", category: "تقنية",
        author_id: "u1", publish_status: "draft", published_at: null,
        seo_title: null, seo_description: null,
        created_at: "2026-01-01T00:00:00Z", updated_at: "2026-01-02T00:00:00Z",
      },
      {
        blocks: [
          { id: "b1", post_id: "p1", block_type: "paragraph", content: { text: "نص" }, sort_order: 2 },
          { id: "b2", post_id: "p1", block_type: "list", content: { items: ["أ", "ب"] }, sort_order: 1 },
          { id: "b3", post_id: "p1", block_type: "hacked", content: {}, sort_order: 3 },
        ],
        tags: ["تصوير"],
        authorName: "المالك",
      },
    );
    expect(post.status).toBe("draft");
    expect(post.author).toBe("المالك");
    expect(post.tags).toEqual(["تصوير"]);
    /* الكتلة غير الصالحة تُتخطى — الترتيب حسب sort_order */
    expect(post.contentBlocks.map((block) => block.type)).toEqual(["list", "paragraph"]);
    expect(post.publishedAt).toBe("2026-01-01");
  });
});

/* ── الطلبات ── */
describe("requestFromDb", () => {
  test("الملاحظات والـ Timeline بأسماء الأشخاص", () => {
    const request = requestFromDb(
      {
        id: "r1", company_name: "شركة", contact_name: "مسؤول", phone: "0500000000",
        email: "a@b.sa", trainee_count: 10, requested_course: "دورة", notes: "",
        status: "contacted", archived_at: null, created_at: "2026-01-01T00:00:00Z",
      },
      {
        notes: [{ id: "n1", request_id: "r1", note: "ملاحظة", created_at: "2026-01-02T00:00:00Z", author_id: "u1" }],
        timeline: [{
          id: "t1", request_id: "r1", event_type: "status-changed",
          from_status: "new", to_status: "contacted", description: "",
          created_at: "2026-01-03T00:00:00Z", actor_id: "u1",
        }],
        profileNames: new Map([["u1", "سارة"]]),
      },
    );
    expect(request.status).toBe("contacted");
    expect(request.internalNotes[0].author).toBe("سارة");
    expect(request.timeline[0].actor).toBe("سارة");
    expect(request.timeline[0].previousStatus).toBe("new");
  });
});

/* ── الوسائط ── */
describe("mediaFromDb", () => {
  test("الحجم رقم والمعاينة رابط كامل", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    const item = mediaFromDb({
      id: "m1", bucket: "bm-media", storage_path: "misc/x.png", file_name: "x.png",
      mime_type: "image/png", size_bytes: "2048", alt_text: "بديل", caption: null,
      width: 100, height: 50, created_at: "2026-01-01T00:00:00Z", updated_at: "2026-01-01T00:00:00Z",
    });
    expect(item.size).toBe(2048);
    expect(item.previewUrl).toContain("bm-media/misc/x.png");
    expect(item.source).toBe("seed");
  });
});

/* ── متفرقات ── */
describe("trainers/paths/legal/payments/sections", () => {
  test("المدرب من DB", () => {
    const trainer = trainerFromDb({
      id: "t1", name: "أحمد", image_path: null, image_alt: null, title: "مدرب",
      specialty: "تصوير", short_bio: "قصير", bio: "طويل", years_experience: 8,
      skills: ["إضاءة"], instagram_url: null, linkedin_url: "https://li/x",
      website_url: null, status: "active", created_at: "", updated_at: "",
    });
    expect(trainer.image).toBe("");
    expect(trainer.linkedin).toBe("https://li/x");
    expect(trainer.status).toBe("active");
  });

  test("المسار يحل الدورات بالترتيب", () => {
    const path = pathFromDb(
      {
        id: "p1", slug: "pro", name: "احترافي", short_description: "", description: "",
        image_path: "", image_alt: "", level: "advanced", discount_percent: 15,
        publish_status: "published", featured: false,
      },
      [
        { path_id: "p1", course_id: "c2", sort_order: 2 },
        { path_id: "p1", course_id: "c1", sort_order: 1 },
        { path_id: "p9", course_id: "c3", sort_order: 0 },
      ],
    );
    expect(path.courseIds).toEqual(["c1", "c2"]);
    expect(path.status).toBe("published");
  });

  test("الصفحات القانونية: id من الـ slug", () => {
    const pages = legalFromDb([{
      id: "l1", slug: "privacy", title: "الخصوصية", content: "نص",
      published: true, published_at: null, updated_at: "2026-02-01T00:00:00Z",
    }]);
    expect(pages[0].id).toBe("privacy");
    expect(pages[0].lastUpdated).toBe("2026-02-01");
  });

  test("المدفوعات بترتيب ثابت وأسماء عربية", () => {
    const providers = paymentsFromDb([
      { provider: "tamara", enabled: false, environment: "test", display_name: null, sort_order: 1 },
      { provider: "moyasar", enabled: true, environment: "production", display_name: "موياسر", sort_order: 0 },
    ]);
    expect(providers.map((provider) => provider.id)).toEqual(["moyasar", "tamara"]);
    expect(providers[0].name).toBe("موياسر");
  });

  test("أقسام الرئيسية: ترتيب وتسميات عربية", () => {
    const sections = homepageSectionsFromDb([
      { section_key: "cta", enabled: true, sort_order: 2 },
      { section_key: "hero", enabled: true, sort_order: 1 },
      { section_key: "bogus", enabled: false, sort_order: 3 },
    ]);
    expect(sections[0].id).toBe("hero");
    expect(sections[0].label).toBe("القسم الرئيسي");
    expect(sections[2].label).toBe("bogus");
  });
});

/* ── المدققات ── */
describe("validators", () => {
  test("sanitizeSlug يطبّع الـ slug", () => {
    expect(sanitizeSlug("  Hello World  ")).toBe("hello-world");
    expect(sanitizeSlug("multi--dash")).toBe("multi-dash");
    expect(sanitizeSlug("بالعربية")).toBe("");
  });

  test("البريد والهاتف", () => {
    expect(isValidEmail("a@b.sa")).toBe(true);
    expect(isValidEmail("not-an-email")).toBe(false);
    expect(isValidSaudiPhone("0501234567")).toBe(true);
    expect(isValidSaudiPhone("+966501234567")).toBe(true);
    expect(isValidSaudiPhone("12345")).toBe(false);
  });

  test("safeInternalNext يمنع open-redirect", () => {
    expect(safeInternalNext("/admin/courses")).toBe("/admin/courses");
    expect(safeInternalNext("//evil.com")).toBeNull();
    expect(safeInternalNext("https://evil.com")).toBeNull();
    expect(safeInternalNext(null)).toBeNull();
  });
});
