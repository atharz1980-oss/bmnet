/**
 * وسائط المجتمع لا تمر بمحسِّن الصور.
 *
 * قِيس على الإنتاج أن `/_next/image?url=/community/media/…` ظل يخدم صورة
 * منشور **مخفى** بلا انقطاع طوال 300 ثانية متواصلة، بترويسة
 * `public, max-age=14400` — أربع ساعات في كاش مشترك — بينما المسار
 * المباشر قطعها فورًا. ورابط المحسِّن مكتوب في srcset الصفحة، فلا يحتاج
 * كشفُه شيئًا.
 *
 * الحراسة هنا على ثلاث طبقات:
 *  1. القرار موجود ويصيب: bypassesImageOptimizer.
 *  2. لا مكوّن مجتمع يستورد next/image مباشرة — كلها تمر بـCommunityImage.
 *  3. مسح شامل: لا `<Image>` في المشروع كله يستقبل رابط وسائط مجتمع.
 */
import { describe, expect, test } from "bun:test";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

import { bypassesImageOptimizer, resolveCommunityMediaUrl, COMMUNITY_MEDIA_URL_PREFIX } from "../src/lib/community/mappers";

const read = (p: string) => readFileSync(p, "utf8").replace(/\r\n/g, "\n");

/** كل ملفات tsx تحت src. */
function tsxFiles(dir = "src"): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry).replace(/\\/g, "/");
    if (statSync(full).isDirectory()) out.push(...tsxFiles(full));
    else if (entry.endsWith(".tsx")) out.push(full);
  }
  return out;
}

const FILES = tsxFiles();
const WRAPPER = "src/components/community/community-image.tsx";

/** الحقول التي تحمل روابط وسائط مجتمع — من mappers.ts وloaders.ts. */
const COMMUNITY_URL_FIELDS = [
  "avatarUrl", "coverUrl", "authorAvatarUrl", "actorAvatarUrl", "communityMediaUrl",
];

describe("the bypass decision", () => {
  test("community media URLs bypass the optimizer", () => {
    expect(bypassesImageOptimizer(resolveCommunityMediaUrl("community/u/a.png"))).toBe(true);
    expect(bypassesImageOptimizer(`${COMMUNITY_MEDIA_URL_PREFIX}community/u/a.png`)).toBe(true);
  });

  test("local blob previews bypass it too — they do not exist on the server", () => {
    expect(bypassesImageOptimizer("blob:https://example.test/abc")).toBe(true);
  });

  test("bm-media and static images keep their optimization", () => {
    for (const src of [
      "/images/hero.jpg",
      "/images/logo.png",
      "https://rnzdleotnxznkqfrcwfa.supabase.co/storage/v1/object/public/bm-media/x.jpg",
      "",
    ]) {
      expect(bypassesImageOptimizer(src)).toBe(false);
    }
  });

  test("the prefix is the one the resolver actually produces", () => {
    expect(resolveCommunityMediaUrl("community/u/a.png").startsWith(COMMUNITY_MEDIA_URL_PREFIX)).toBe(true);
  });
});

describe("the wrapper is the only door", () => {
  test("it applies the decision rather than trusting the caller", () => {
    const wrapper = read(WRAPPER);
    expect(wrapper).toContain("unoptimized={bypassesImageOptimizer(value)}");
  });

  test("no community file imports next/image directly", () => {
    const communityFiles = FILES.filter(
      (f) => (f.startsWith("src/components/community/") || f.startsWith("src/app/community/")) && f !== WRAPPER,
    );
    expect(communityFiles.length).toBeGreaterThan(8);
    const offenders = communityFiles.filter((f) => read(f).includes('from "next/image"'));
    expect(offenders).toEqual([]);
  });

  test("every community render site goes through the wrapper", () => {
    const users = FILES.filter((f) => f !== WRAPPER && read(f).includes("<CommunityImage"));
    /* سبعة مواضع وقت الإصلاح: منشور، بورتفوليو ×2، مؤلِّف المنشور،
       محرر الملف ×2، والمحجوبون. */
    const total = users.reduce((n, f) => n + (read(f).match(/<CommunityImage[\s/>]/g) ?? []).length, 0);
    expect(total).toBeGreaterThanOrEqual(7);
  });
});

describe("no community URL can reach the optimizer anywhere in the app", () => {
  test("the sweep sees a real file set", () => {
    expect(FILES.length).toBeGreaterThan(40);
    expect(FILES).toContain("src/components/community/post-card.tsx");
  });

  test("no raw <Image> receives a community media URL", () => {
    const offenders: string[] = [];
    for (const file of FILES) {
      if (file === WRAPPER) continue;
      const source = read(file);
      /* كل وسم <Image …> مع ما بداخله حتى إغلاقه. */
      for (const match of source.matchAll(/<Image\b[^>]*>/g)) {
        const tag = match[0];
        if (tag.includes(COMMUNITY_MEDIA_URL_PREFIX)) offenders.push(`${file}: prefix`);
        for (const field of COMMUNITY_URL_FIELDS) {
          if (new RegExp(`src=\\{[^}]*\\b${field}\\b`).test(tag)) offenders.push(`${file}: ${field}`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  test("no raw <Image> is left inside a file that also renders community media", () => {
    const offenders: string[] = [];
    for (const file of FILES) {
      if (file === WRAPPER) continue;
      const source = read(file);
      const rendersCommunity = source.includes("<CommunityImage") || source.includes(COMMUNITY_MEDIA_URL_PREFIX);
      if (rendersCommunity && /<Image\b/.test(source)) offenders.push(file);
    }
    expect(offenders).toEqual([]);
  });

  test("no file that pulls from the community layer keeps a raw <Image>", () => {
    /* يغلق الثغرة الأخيرة: ملف خارج مجلدي المجتمع يستورد محوّلاته أو
       أنواعه ثم يصيّر صورة بـ<Image> خامة. */
    const offenders: string[] = [];
    for (const file of FILES) {
      if (file === WRAPPER) continue;
      const source = read(file);
      const pullsCommunity = /from "@\/lib\/community\//.test(source) || /from "\.\.?\/.*community\//.test(source);
      if (pullsCommunity && /<Image/.test(source)) offenders.push(file);
    }
    expect(offenders).toEqual([]);
  });

  test("the media route itself is untouched — the check stays per-request", () => {
    const route = read("src/app/community/media/[...path]/route.ts");
    expect(route).toContain('dynamic = "force-dynamic"');
    expect(route).toContain("resolveMediaAccess");
    expect(route).toContain("private, max-age=");
    expect(route).not.toContain("public, max-age=");
  });

  test("no global opt-out was added to next.config", () => {
    const config = read("next.config.ts");
    expect(config).not.toContain("unoptimized");
    expect(config).not.toContain("disableStaticImages");
    /* bm-media يبقى محسَّنًا عبر remotePatterns. */
    expect(config).toContain("remotePatterns");
  });
});
