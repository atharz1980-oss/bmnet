/// <reference types="bun-types" />
/**
 * اختبارات المجتمع (CP-H V1) — نقية بلا قاعدة بيانات.
 * تغطي: المدققات، محولات الوسائط/الإعجابات، مسارات التخزين الآمنة.
 * bun test tests/community.test.ts
 */
import { describe, expect, test, afterAll } from "bun:test";

import {
  validateUsername, validateDisplayName, validateBio, validateCaption,
  validateCommentBody, validateSpecialties, validateInstagramUrl, validateYoutubeUrl,
  validateWebsiteUrl, validateExperienceLevel, validatePortfolioTitle,
  validateProjectDate, validateOwnedMediaPath, validateMediaCount,
  validateReportReason, MAX_POST_MEDIA, MAX_PORTFOLIO_MEDIA, FEED_PAGE_SIZE,
} from "../src/lib/community/validation";
import {
  resolveCommunityMediaUrl, memberFromDb, feedPostFromDb, postMediaFromDb,
  portfolioProjectFromDb, type CommunityProfileDbRow, type FeedPostDbRow,
} from "../src/lib/community/mappers";
import { communityMediaPathFor, validateCommunityFile } from "../src/lib/community/storage";

// ملاحظة: لا نضبط env على مستوى الملف — cms-mappers.test.ts يفترض بيئة نظيفة أولًا.
// نضبطها داخل الاختبار الذي يحتاجها فقط ونعيدها بعد كل الاختبارات.
afterAll(() => {
  delete process.env.NEXT_PUBLIC_SUPABASE_URL;
});

describe("validateUsername", () => {
  test("يقبل الأسماء الصالحة", () => {
    expect(validateUsername("ahmed_photography")).toBeNull();
    expect(validateUsername("a1b2c3")).toBeNull();
  });
  test("يرفض الأحجام والعربي والرموز والمحجوز", () => {
    expect(validateUsername("ab")).not.toBeNull();
    expect(validateUsername("أحمد")).not.toBeNull();
    expect(validateUsername("Ahmed!")).not.toBeNull();
    expect(validateUsername("a".repeat(25))).not.toBeNull();
    expect(validateUsername("admin")).not.toBeNull();
    expect(validateUsername("")).not.toBeNull();
  });
});

describe("مدققات النصوص", () => {
  test("الاسم الظاهر مطلوب ومحدود", () => {
    expect(validateDisplayName("محمد زغلول")).toBeNull();
    expect(validateDisplayName("  ")).not.toBeNull();
    expect(validateDisplayName("ا".repeat(81))).not.toBeNull();
  });
  test("النبذة والتعليق المصاحب", () => {
    expect(validateBio("نبذة قصيرة")).toBeNull();
    expect(validateBio("ا".repeat(1001))).not.toBeNull();
    expect(validateCaption("قصة الصورة")).toBeNull();
    expect(validateCaption("ا".repeat(2201))).not.toBeNull();
  });
  test("جسم التعليق", () => {
    expect(validateCommentBody("تعليق جميل")).toBeNull();
    expect(validateCommentBody("   ")).not.toBeNull();
    expect(validateCommentBody("ا".repeat(1001))).not.toBeNull();
  });
  test("التخصصات: حتى 8 وكل تخصص حتى 40", () => {
    expect(validateSpecialties(["بورتريه", "منظر"])).toBeNull();
    expect(validateSpecialties(Array.from({ length: 9 }, (_, i) => `ت${i}`))).not.toBeNull();
    expect(validateSpecialties(["ا".repeat(41)])).not.toBeNull();
  });
  test("روابط التواصل الاجتماعي", () => {
    expect(validateWebsiteUrl("https://example.com")).toBeNull();
    expect(validateWebsiteUrl("http://example.com")).not.toBeNull();
    expect(validateInstagramUrl("https://instagram.com/ahmed")).toBeNull();
    expect(validateInstagramUrl("https://facebook.com/ahmed")).not.toBeNull();
    expect(validateYoutubeUrl("https://youtube.com/@channel")).toBeNull();
    expect(validateYoutubeUrl("https://youtube.evil.com")).not.toBeNull();
  });
  test("مستوى الخبرة وعنوان المشروع والتاريخ", () => {
    expect(validateExperienceLevel("professional")).toBeNull();
    expect(validateExperienceLevel("wizard")).not.toBeNull();
    expect(validatePortfolioTitle("رحلة في العلا")).toBeNull();
    expect(validatePortfolioTitle(" ")).not.toBeNull();
    expect(validateProjectDate("2026-01-15")).toBeNull();
    expect(validateProjectDate("15-01-2026")).not.toBeNull();
  });
  test("أسباب البلاغ المحددة مسبقًا فقط", () => {
    expect(validateReportReason("spam")).toBeNull();
    expect(validateReportReason("revenge")).not.toBeNull();
  });
});

describe("مسارات الوسائط المملوكة", () => {
  const uid = "123e4567-e89b-42d3-a456-426614174000";
  test("يقبل مسار مجلد المالك", () => {
    expect(validateOwnedMediaPath(`community/${uid}/img-1.jpg`, uid, 3)).toBeNull();
  });
  test("يرفض مسار عضو آخر أو شكلًا خاطئًا", () => {
    expect(validateOwnedMediaPath("community/other-uid/img.jpg", uid, 3)).not.toBeNull();
    expect(validateOwnedMediaPath("../../etc/passwd", uid, 3)).not.toBeNull();
    expect(validateOwnedMediaPath("", uid, 3)).not.toBeNull();
  });
  test("حدود عدد الوسائط", () => {
    expect(validateMediaCount(6, MAX_POST_MEDIA, "المنشور")).toBeNull();
    expect(validateMediaCount(7, MAX_POST_MEDIA, "المنشور")).not.toBeNull();
    expect(validateMediaCount(20, MAX_PORTFOLIO_MEDIA, "المشروع")).toBeNull();
    expect(validateMediaCount(21, MAX_PORTFOLIO_MEDIA, "المشروع")).not.toBeNull();
  });
});

describe("محولات الوسائط والملفات", () => {
  test("resolveCommunityMediaUrl يبني رابط bucket المجتمع", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    expect(resolveCommunityMediaUrl("community/abc/a.jpg"))
      .toBe("https://example.supabase.co/storage/v1/object/public/community-media/community/abc/a.jpg");
    expect(resolveCommunityMediaUrl("")).toBe("");
  });
  test("memberFromDb يعيّن الافتراضات الآمنة", () => {
    const row = {
      user_id: "u1", username: "ahmed", display_name: "أحمد", bio: null,
      city: null, country: null, specialties: null, experience_level: "beginner",
      avatar_path: null, cover_path: null, available_for_work: null,
      website_url: null, instagram_url: null, youtube_url: null,
      created_at: "2026-01-01T00:00:00Z",
    } as CommunityProfileDbRow;
    const member = memberFromDb(row);
    expect(member.specialties).toEqual([]);
    expect(member.bio).toBe("");
    expect(member.availableForWork).toBe(false);
    expect(member.avatarUrl).toBe("");
  });
  test("feedPostFromDb يقرأ عدادات التجميع من شكل PostgREST", () => {
    const row = {
      id: "p1", author_id: "u1", caption: "مرحبا", category: null, camera: null,
      lens: null, location_name: null, created_at: "2026-01-01T00:00:00Z",
      author: { user_id: "u1", username: "ahmed", display_name: "أحمد" } as unknown as CommunityProfileDbRow,
      like_count: [{ count: 5 }],
      comment_count: [{ count: 2 }],
    } as unknown as FeedPostDbRow;
    const post = feedPostFromDb(row);
    expect(post.likeCount).toBe(5);
    expect(post.commentCount).toBe(2);
    expect(post.likedByMe).toBe(false);
    expect(post.authorDisplayName).toBe("أحمد");
  });
  test("feedPostFromDb مع مجموعات المشاهد", () => {
    const row = { id: "p1", author_id: "u1", created_at: "2026-01-01T00:00:00Z" } as unknown as FeedPostDbRow;
    const post = feedPostFromDb(row, { liked: new Set(["p1"]), saved: new Set() });
    expect(post.likedByMe).toBe(true);
    expect(post.savedByMe).toBe(false);
  });
  test("postMediaFromDb يرتب حسب sort_order", () => {
    const media = postMediaFromDb([
      { storage_path: "community/u/b.jpg", alt_text: "ب", sort_order: 1 },
      { storage_path: "community/u/a.jpg", alt_text: "أ", sort_order: 0 },
    ]);
    expect(media[0].alt).toBe("أ");
    expect(media[1].alt).toBe("ب");
  });
  test("portfolioProjectFromDb يعيّن الحقول", () => {
    const view = portfolioProjectFromDb({
      id: "pr1", user_id: "u1", title: "مشروع", description: null, category: null,
      location_name: null, project_date: null, cover_path: null, published: null,
    });
    expect(view.published).toBe(false);
    expect(view.title).toBe("مشروع");
  });
});

describe("تخزين المجتمع", () => {
  const uid = "123e4567-e89b-42d3-a456-426614174000";
  test("مسار الرفع داخل مجلد العضو حصرًا", () => {
    const path = communityMediaPathFor(uid, "photo.jpeg");
    expect(path.startsWith(`community/${uid}/`)).toBe(true);
    expect(path.endsWith(".jpeg")).toBe(true);
  });
  test("امتداد غير معروف يسقط إلى jpg آمن", () => {
    const path = communityMediaPathFor(uid, "file.exe");
    expect(path.endsWith(".jpg")).toBe(true);
  });
  test("رفض الملفات الكبيرة وغير المدعومة", () => {
    const bigFile = new File([new ArrayBuffer(6 * 1024 * 1024)], "big.jpg", { type: "image/jpeg" });
    expect(validateCommunityFile(bigFile)).not.toBeNull();
    const badType = new File([new ArrayBuffer(10)], "doc.pdf", { type: "application/pdf" });
    expect(validateCommunityFile(badType)).not.toBeNull();
  });
});

describe("ثوابت الخلاصة", () => {
  test("حجم صفحة الخلاصة ثابت وآمن", () => {
    expect(FEED_PAGE_SIZE).toBe(12);
    expect(MAX_POST_MEDIA).toBe(6);
  });
});
