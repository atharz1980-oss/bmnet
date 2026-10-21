/**
 * حارس عمل الأداء — لا رجوع إلى الوراء.
 * -------------------------------------------
 * عمل الأداء (perf) أصلح البطء: كاش داخل العملية، ورحلة مصادقة واحدة
 * لكل طلب، وإبطالCommunity بدل الشجرة العامة كاملة.
 *
 * هذا الملف يحرس تلك المبادئ أمام أي تعديل لاحق: فلا يعود الموقع
 * إلى ~40 استعلامًا في كل صفحة، ولا يعود تفاعلٌ صغيرٌ في المجتمع إلى
 * إعادة بناء الشجرة العامة كاملة.
 *
 * الفحوص ساكنة (تقرأ المصدر) — لا تحتاج قاعدة ولا شبكة.
 */
import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";

const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n");

/** المصدر بلا تعليقات — فلا يُحسب ذكرٌ في شرحٍ على أنه نداء. */
const code = (path: string) =>
  read(path)
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");

/** كل ملفات إجراءات المجتمع (تُقرأ فقط) */
const COMMUNITY_ACTIONS = [
  "src/app/community/actions/auth.ts",
  "src/app/community/actions/notifications.ts",
  "src/app/community/actions/portfolio.ts",
  "src/app/community/actions/posts.ts",
  "src/app/community/actions/profile.ts",
  "src/app/community/actions/social.ts",
];

describe("the in-process data cache exists and is used", () => {
  test("it is a single-flight TTL cache with prefix invalidation", () => {
    const cache = read("src/lib/cache/data-cache.ts");
    expect(cache).toContain("export async function cachedData");
    expect(cache).toContain("export function invalidateDataCache");
    /* تنفيذ واحد للطلبات المتزامنة على نفس المفتاح. */
    expect(cache).toContain("inflight");
  });

  test("the public CMS view and the admin panel read through it", () => {
    expect(read("src/lib/cms/public-loader.ts")).toContain("cachedData");
    expect(read("src/lib/cms/admin-loader.ts")).toContain("cachedData");
  });

  test("the community feed caches its rows, not the viewer's view", () => {
    const loaders = read("src/lib/community/loaders.ts");
    expect(loaders).toContain("community:feed:");
    /* حالة المشاهد (إعجاب/حفظ/حجب) تُطبَّق بعد الكاش لا داخله. */
    expect(loaders).toContain("loadViewerSets");
  });
});

describe("every admin write invalidates the cache before rebuilding", () => {
  test("the helper invalidates first, then revalidates", () => {
    const helper = code("src/app/admin/actions/cache-invalidate.ts");
    /* جسم الدالة فقط — لا الـimport في الأعلى. */
    const refresh = helper.slice(helper.indexOf("export function refreshCmsPaths"));
    const invalidateAt = refresh.indexOf("invalidateCmsCache()");
    const revalidateAt = refresh.indexOf("revalidatePath(");
    expect(invalidateAt).toBeGreaterThan(-1);
    expect(revalidateAt).toBeGreaterThan(invalidateAt);
    expect(helper).toContain('invalidateDataCache("cms")');
  });

  test("no admin action rebuilds a path before invalidating", () => {
    const offenders: string[] = [];
    for (const file of [
      "src/app/admin/actions/auth.ts",
      "src/app/admin/actions/community.ts",
      "src/app/admin/actions/company.ts",
      "src/app/admin/actions/content.ts",
      "src/app/admin/actions/course-payments.ts",
      "src/app/admin/actions/course-whatsapp.ts",
      "src/app/admin/actions/equipment.ts",
      "src/app/admin/actions/learning.ts",
      "src/app/admin/actions/ops.ts",
      "src/app/admin/actions/payments.ts",
      "src/app/admin/actions/public-form.ts",
      "src/app/admin/actions/spaces.ts",
      "src/app/admin/actions/workshops.ts",
    ]) {
      const source = code(file);
      const invalidations = [...source.matchAll(/invalidateCmsCache\(\)/g)].map((m) => m.index ?? 0);
      const rebuilds = [...source.matchAll(/revalidatePath\(/g)].map((m) => m.index ?? 0);
      for (const rebuild of rebuilds) {
        /* كل إعادة بناء يسبقها إبطال: بلا إفال = بناء من نسخة قديمة. */
        if (!invalidations.some((invalidation) => invalidation < rebuild)) {
          offenders.push(`${file}: revalidatePath بلا إبطال قبله`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });
});

describe("a community interaction never rebuilds the whole public tree", () => {
  test("no community action invalidates the root layout", () => {
    const offenders: string[] = [];
    for (const file of COMMUNITY_ACTIONS) {
      const source = read(file);
      if (/revalidatePath\(\s*["']\/["']\s*,\s*["']layout["']\s*\)/.test(source)) {
        offenders.push(file);
      }
    }
    expect(offenders).toEqual([]);
  });

  test("they use the community-scoped invalidation instead", () => {
    const helper = read("src/lib/community/revalidate.ts");
    expect(helper).toContain("export function revalidateCommunity");
    /* الإبطال ينظّف كاش بيانات المجتمع أيضًا. */
    expect(helper).toContain('invalidateDataCache("community")');
    for (const file of COMMUNITY_ACTIONS) {
      expect(read(file)).toContain("revalidateCommunity()");
    }
  });
});

describe("one authentication round-trip per request", () => {
  test("getCurrentUser is memoised with React cache", () => {
    const server = read("src/lib/supabase/server.ts");
    expect(server).toContain("export const getCurrentUser = cache(");
  });

  test("community loaders do not call auth.getUser() on their own", () => {
    const loaders = read("src/lib/community/loaders.ts");
    /* نداء فعلي لا ذكر في تعليق. */
    expect(loaders).not.toContain(".auth.getUser(");
    expect(read("src/lib/community/member.ts")).not.toContain(".auth.getUser(");
    /* وكلاهما يمرّ بالمساعد الموحّد. */
    expect(loaders).toContain("getCurrentUser()");
    expect(read("src/lib/community/member.ts")).toContain("getCurrentUser()");
  });

  test("the middleware skips the network call when there is no session cookie", () => {
    expect(read("src/lib/supabase/session-cookie.ts")).toContain("hasSupabaseSessionCookie");
    expect(read("src/lib/supabase/middleware.ts")).toContain("hasSupabaseSessionCookie");
    expect(read("src/middleware.ts")).toContain("hasSupabaseSessionCookie");
  });
});

describe("the heavy read paths are batched", () => {
  test("the account dashboard reads its first four queries at once", () => {
    const loader = read("src/lib/account/loader.ts");
    expect(loader).toContain("Promise.all");
    /* أول درس لكل دورة: استعلامان بدل استعلامين لكل دورة. */
    expect(loader).toContain("loadFirstPublishedLessons");
  });

  test("duplicating a course reads only its own curriculum", () => {
    const content = read("src/app/admin/actions/content.ts");
    expect(content).toContain('from("course_curriculum_items")');
    expect(content).toContain('.in("day_id", sourceDayIds)');
  });
});
