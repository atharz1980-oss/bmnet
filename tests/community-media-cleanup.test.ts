/**
 * تنظيف وسائط المجتمع عند الحذف.
 * الـbucket عام، فحذف صف المنشور وحده يترك الصورة مخدومة بالرابط.
 * هنا نختبر الدالة بعميل تخزين مزيف، ونتحقق نصيًا أن مسارات الحذف
 * الثلاثة تقرأ المسارات قبل حذف الصف ثم تستدعي التنظيف.
 */
import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";

import { isCommunityMediaPath, removeCommunityImages } from "../src/lib/community/storage";

const uid = "123e4567-e89b-42d3-a456-426614174000";
const path = (name: string) => `community/${uid}/${name}`;

interface RemoveCall {
  bucket: string;
  paths: string[];
}

/** عميل تخزين مزيف يسجّل ما طُلب حذفه ويعيد ما قرره الاختبار. */
function fakeClient(result: { data?: unknown[] | null; error?: unknown }) {
  const calls: RemoveCall[] = [];
  const client = {
    storage: {
      from(bucket: string) {
        return {
          remove(paths: string[]) {
            calls.push({ bucket, paths });
            return Promise.resolve({ data: result.data ?? null, error: result.error ?? null });
          },
        };
      },
    },
  };
  return { client: client as never, calls };
}

describe("community media path guard", () => {
  test("accepts a path inside a member folder", () => {
    expect(isCommunityMediaPath(path("a1b2.jpg"))).toBe(true);
  });

  test("rejects traversal, other buckets and absolute paths", () => {
    expect(isCommunityMediaPath(`community/${uid}/../../secret.jpg`)).toBe(false);
    expect(isCommunityMediaPath(`/community/${uid}/a.jpg`)).toBe(false);
    expect(isCommunityMediaPath("bm-media/logo.png")).toBe(false);
    expect(isCommunityMediaPath("community/not-a-uuid/a.jpg")).toBe(false);
    expect(isCommunityMediaPath("")).toBe(false);
  });
});

describe("removeCommunityImages", () => {
  test("removes valid paths once, from the community bucket", async () => {
    const { client, calls } = fakeClient({ data: [{}, {}] });
    const result = await removeCommunityImages(client, [path("a.jpg"), path("b.jpg"), path("a.jpg")]);
    expect(calls).toHaveLength(1);
    expect(calls[0].bucket).toBe("community-media");
    /* التكرار يُطوى: نداء حذف واحد لكل ملف. */
    expect(calls[0].paths).toEqual([path("a.jpg"), path("b.jpg")]);
    expect(result).toEqual({ removed: 2, failed: 0 });
  });

  test("never forwards a path outside a member folder", async () => {
    const { client, calls } = fakeClient({ data: [{}] });
    await removeCommunityImages(client, ["bm-media/logo.png", `community/${uid}/../x.jpg`, path("ok.jpg")]);
    expect(calls[0].paths).toEqual([path("ok.jpg")]);
  });

  test("makes no call at all when nothing is valid", async () => {
    const { client, calls } = fakeClient({ data: [] });
    const result = await removeCommunityImages(client, ["", "bm-media/logo.png"]);
    expect(calls).toHaveLength(0);
    expect(result).toEqual({ removed: 0, failed: 0 });
  });

  test("reports a storage failure instead of throwing", async () => {
    const { client } = fakeClient({ error: { message: "network" } });
    const result = await removeCommunityImages(client, [path("a.jpg")]);
    /* الصف حُذف بالفعل؛ فشل التخزين يُبلّغ ولا يُلغي الحذف. */
    expect(result).toEqual({ removed: 0, failed: 1 });
  });

  test("counts a partial removal", async () => {
    const { client } = fakeClient({ data: [{}] });
    const result = await removeCommunityImages(client, [path("a.jpg"), path("b.jpg")]);
    expect(result).toEqual({ removed: 1, failed: 1 });
  });
});

describe("delete flows clean up storage", () => {
  const flows: Array<{ file: string; mediaTable: string; rowTable: string }> = [
    {
      file: "src/app/community/actions/posts.ts",
      mediaTable: "community_post_media",
      rowTable: "community_posts",
    },
    {
      file: "src/app/community/actions/portfolio.ts",
      mediaTable: "community_portfolio_media",
      rowTable: "community_portfolio_projects",
    },
    {
      file: "src/app/admin/actions/community.ts",
      mediaTable: "community_post_media",
      rowTable: "community_posts",
    },
  ];

  for (const flow of flows) {
    test(`${flow.file} reads media paths before deleting the row`, () => {
      const source = readFileSync(flow.file, "utf8");
      expect(source).toContain("removeCommunityImages");
      const readAt = source.indexOf(`.from("${flow.mediaTable}")`);
      expect(readAt).toBeGreaterThan(-1);

      /* أول .delete() يلي جدول الصف — بصرف النظر عن تنسيق السلسلة. */
      const rowAt = source.indexOf(`.from("${flow.rowTable}")`, readAt);
      expect(rowAt).toBeGreaterThan(-1);
      const deleteAt = source.indexOf(".delete()", rowAt);
      expect(deleteAt).toBeGreaterThan(-1);

      /* لو قُرئت المسارات بعد الحذف لعادت فارغة: الصفوف تختفي بـcascade. */
      expect(readAt).toBeLessThan(deleteAt);
      /* والتنظيف يقع بعد تأكيد الحذف، لا قبله. */
      expect(source.indexOf("removeCommunityImages(", deleteAt)).toBeGreaterThan(deleteAt);
    });
  }
});
