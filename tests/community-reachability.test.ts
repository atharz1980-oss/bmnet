/**
 * وصول ميزات المجتمع.
 *
 * فجوتان كانتا في V1: الحفظ والحجب يعملان بلا مكان يُعرض فيه أثرهما.
 *  - الحفظ: لا صفحة لرؤية المحفوظات، فالميزة في اتجاه واحد.
 *  - الحجب: أخطر — الخلاصة تُخفي منشورات المحجوب، وزر فك الحجب داخل بطاقة
 *    المنشور وحدها، فالحجب باب لا رجعة منه.
 *
 * الحراسة هنا على البنية لا على السلوك: كل إجراء يغيّر حالة العضو يجب أن
 * يكون له مسار يصل إليه المستخدم.
 */
import { describe, expect, test } from "bun:test";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const MEMBER_AREA = "src/app/community/(member)";
const NAV = "src/components/community/member-nav.tsx";

function sources(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory()
      ? sources(join(dir, entry.name))
      : /\.tsx?$/.test(entry.name)
        ? [join(dir, entry.name)]
        : [],
  );
}

describe("member pages exist", () => {
  for (const route of ["saved", "blocked", "profile", "notifications"]) {
    test(`/community/${route} has a page`, () => {
      expect(existsSync(join(MEMBER_AREA, route, "page.tsx"))).toBe(true);
    });
  }

  for (const route of ["saved", "blocked"]) {
    test(`/community/${route} redirects anonymous visitors to login`, () => {
      const page = readFileSync(join(MEMBER_AREA, route, "page.tsx"), "utf8");
      expect(page).toContain("getCommunityContext");
      expect(page).toContain(`redirect("/community/login?next=%2Fcommunity%2F${route}")`);
      /* صفحات الأعضاء خارج الفهرسة. */
      expect(page).toContain("robots");
    });
  }
});

describe("member navigation reaches every member page", () => {
  const nav = readFileSync(NAV, "utf8");

  for (const route of ["profile", "notifications", "saved", "blocked"]) {
    test(`the nav links to /community/${route}`, () => {
      expect(nav).toContain(`/community/${route}`);
    });
  }

  test("the nav is rendered by the member layout", () => {
    const layout = readFileSync(join(MEMBER_AREA, "layout.tsx"), "utf8");
    expect(layout).toContain("MemberNav");
  });
});

describe("state-changing actions are reachable from the UI", () => {
  const ui = sources("src/components/community")
    .concat(sources("src/app/community"))
    .map((file) => readFileSync(file, "utf8"))
    .join("\n");

  /* لكل إجراء مسار وصول واحد على الأقل؛ الحجب يحتاج ضده أيضًا. */
  for (const action of [
    "toggleSaveAction",
    "blockUserAction",
    "unblockUserAction",
    "toggleFollowAction",
    "reportContentAction",
    "deletePostAction",
  ]) {
    test(`${action} is wired into a component`, () => {
      expect(ui).toContain(action);
    });
  }

  test("unblock is reachable outside the post card", () => {
    /* بطاقة المنشور وحدها لا تكفي: منشورات المحجوب مُخفاة من الخلاصة. */
    const blockedList = readFileSync("src/components/community/blocked-members.tsx", "utf8");
    expect(blockedList).toContain("unblockUserAction");
  });

  test("saved posts have a page that reads them back", () => {
    const loaders = readFileSync("src/lib/community/loaders.ts", "utf8");
    expect(loaders).toContain("loadSavedPosts");
    expect(loaders).toContain("loadBlockedMembers");
    const savedPage = readFileSync(join(MEMBER_AREA, "saved", "page.tsx"), "utf8");
    expect(savedPage).toContain("loadSavedPosts");
  });
});

describe("blocked list uses the service client for profiles", () => {
  test("a suspended member stays visible in the blocker's list", () => {
    const loaders = readFileSync("src/lib/community/loaders.ts", "utf8");
    const fn = loaders.slice(loaders.indexOf("export async function loadBlockedMembers"));
    /* سياسة العرض العام تُخفي الموقوف؛ من حجبه يجب أن يظل قادرًا على فك الحجب. */
    expect(fn.slice(0, fn.indexOf("\n}\n"))).toContain("getServiceSupabase");
  });
});
