/**
 * عقد الوصول إلى صور المجتمع (Medium #9).
 *
 * كان community-media عامًا، فرابط الصورة دائم: إخفاء المنشور إشرافيًا لا
 * يخفي صورته، والحذف يبقى مخدومًا من CDN حتى ساعة — كلاهما مؤكد حيًا.
 *
 * الحل: bucket خاص + مسار خادمي يفحص الظهور عند كل طلب. الحراسة هنا على
 * العقد: لا عودة للرابط العام، والمسار يفحص قبل أن يبثّ.
 */
import { describe, expect, test, mock } from "bun:test";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";

mock.module("server-only", () => ({}));

const { ownerFromPath, contentTypeFor } = await import("../src/lib/community/media-access");
const mappers = readFileSync("src/lib/community/mappers.ts", "utf8");
const route = readFileSync(join("src", "app", "community", "media", "[...path]", "route.ts"), "utf8");
const access = readFileSync("src/lib/community/media-access.ts", "utf8");
const sql = readdirSync("supabase/migrations")
  .filter((f) => f.endsWith(".sql")).sort()
  .map((f) => readFileSync(join("supabase/migrations", f), "utf8")).join("\n");

describe("no permanent public URL remains", () => {
  test("the resolver no longer builds a Supabase public object URL", () => {
    expect(mappers).not.toContain("/storage/v1/object/public/community-media");
    expect(mappers).not.toMatch(/object\/public\/\$\{COMMUNITY_BUCKET\}/);
  });

  test("it returns a same-origin app path instead", () => {
    expect(mappers).toContain("/community/media/");
  });

  test("the bucket is flipped to private and the blanket read policy is dropped", () => {
    expect(sql).toContain("update storage.buckets set public = false where id = 'community-media'");
    expect(sql).toContain("drop policy if exists community_media_public_read on storage.objects");
  });

  test("bm-media is untouched by the community migration", () => {
    const migration = readFileSync("supabase/migrations/20260912190000_community_media_private.sql", "utf8");
    /* التعليقات تذكر bm-media لتوضيح أنه خارج النطاق؛ العبرة بالبيانات
       التنفيذية وحدها. */
    const executable = migration
      .split(/\r?\n/)
      .filter((line) => !line.trimStart().startsWith("--"))
      .join("\n");
    expect(executable).not.toContain("bm-media");
    expect(executable).toContain("community-media");
    for (const forbidden of [/drop table/i, /truncate/i, /delete from/i]) {
      expect(executable).not.toMatch(forbidden);
    }
  });

  test("upload, update and delete storage policies survive", () => {
    for (const policy of [
      "community_media_upload_own_folder",
      "community_media_update_own_folder",
      "community_media_delete_own_folder",
    ]) {
      expect(sql).toContain(`create policy ${policy}`);
      expect(sql).not.toContain(`drop policy if exists ${policy}`);
    }
  });
});

describe("the route checks before it serves", () => {
  test("the route file exists at the path the resolver points to", () => {
    expect(existsSync(join("src", "app", "community", "media", "[...path]", "route.ts"))).toBe(true);
  });

  test("access is resolved before any download happens", () => {
    const check = route.indexOf("resolveMediaAccess");
    const download = route.indexOf(".download(");
    expect(check).toBeGreaterThan(-1);
    expect(download).toBeGreaterThan(check);
  });

  test("a refused request gets 404, never the bytes", () => {
    const refusal = route.slice(route.indexOf("if (!verdict.allowed)"));
    expect(refusal.slice(0, 200)).toContain("404");
  });

  test("it is dynamic and short-cached, never shared-cached", () => {
    expect(route).toContain('dynamic = "force-dynamic"');
    expect(route).toContain("private, max-age=");
    expect(route).not.toContain("public, max-age=");
  });

  test("a failed session read cannot raise privilege", () => {
    /* كل catch يعيد القيمة الأدنى: لا مشاهد ولا إشراف. */
    expect(route).toContain("viewerId = null");
    expect(route).toContain("isStaff = false");
  });
});

describe("visibility rules", () => {
  test("every allowed branch names a concrete condition", () => {
    /* المالك، الإشراف، منشور منشور بصاحب نشط، مشروع منشور، ملف نشط. */
    for (const reason of ['"owner"', '"staff"', '"post"', '"portfolio"', '"profile"']) {
      expect(access).toContain(reason);
    }
    expect(access).toContain('status === "published"');
    expect(access).toContain('published === true');
    expect(access).toContain('.eq("status", "active")');
  });

  test("hidden or suspended content has no allowing branch", () => {
    expect(access).not.toContain('"hidden"');
    expect(access).not.toContain('"suspended"');
  });
});

describe("ownerFromPath", () => {
  const uid = "123e4567-e89b-42d3-a456-426614174000";

  test("reads the owner out of a valid path", () => {
    expect(ownerFromPath(`community/${uid}/a.jpg`)).toBe(uid);
  });

  test("refuses anything that is not a member media path", () => {
    for (const bad of [
      `community/${uid}/../../etc/passwd`,
      `/community/${uid}/a.jpg`,
      "bm-media/logo.png",
      "community/not-a-uuid/a.jpg",
      "",
    ]) {
      expect(ownerFromPath(bad)).toBeNull();
    }
  });
});

describe("contentTypeFor", () => {
  test("maps the three formats the bucket accepts", () => {
    expect(contentTypeFor("community/x/a.png")).toBe("image/png");
    expect(contentTypeFor("community/x/a.webp")).toBe("image/webp");
    expect(contentTypeFor("community/x/a.jpg")).toBe("image/jpeg");
    expect(contentTypeFor("community/x/a.jpeg")).toBe("image/jpeg");
  });

  test("an unknown extension never becomes an executable type", () => {
    for (const name of ["a.html", "a.svg", "a.js", "a"]) {
      expect(contentTypeFor(`community/x/${name}`)).toBe("image/jpeg");
    }
  });
});
