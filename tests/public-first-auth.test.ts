/**
 * عقد «عام أولًا» — الموقع يُتصفَّح بلا حساب، والدخول يُطلب عند الفعل وحده.
 *
 * الحراسة هنا على ثلاثة أشياء تنكسر بصمت:
 *  1. نطاق الـmiddleware — توسيعه يعيد رحلة مصادقة على كل صفحة عامة.
 *  2. وجهة العودة — إسقاط `next` في أي نموذج يجعل الدخول عقوبة على المحاولة.
 *  3. بوابة الإدارة — المصادقة وحدها ليست صلاحية إدارة.
 */
import { describe, expect, test } from "bun:test";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

import { communityLoginHref, communitySignupHref, returnPath } from "../src/lib/community/auth-links";

const read = (p: string) => readFileSync(p, "utf8").replace(/\r\n/g, "\n");

const middleware = read("src/middleware.ts");
const adminAuth = read("src/app/admin/actions/auth.ts");
const loginForm = read("src/app/community/login/login-form.tsx");
const signupForm = read("src/app/community/signup/signup-form.tsx");
const feed = read("src/components/community/feed.tsx");
const postCard = read("src/components/community/post-card.tsx");
const followButton = read("src/components/community/follow-button.tsx");

/** كل ملفات الصفحات تحت src/app. */
function allPages(): string[] {
  const out: string[] = [];
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      if (statSync(full).isDirectory()) walk(full);
      else if (entry === "page.tsx" || entry === "layout.tsx") out.push(full.replace(/\\/g, "/"));
    }
  };
  walk("src/app");
  return out;
}

const PAGES = allPages();
/** المسارات العامة: كل ما ليس تحت admin ولا منطقة أعضاء المجتمع. */
const PUBLIC_PAGES = PAGES.filter(
  (p) => !p.includes("/app/admin/") && !p.includes("/app/community/(member)/"),
);

describe("middleware scope", () => {
  test("it is listed for admin and community only", () => {
    const matcher = middleware.slice(middleware.indexOf("matcher:"));
    const entries = [...matcher.matchAll(/"([^"]+)"/g)].map((m) => m[1]);
    expect(entries.length).toBeGreaterThan(0);
    for (const entry of entries) {
      expect(entry.startsWith("/admin") || entry.startsWith("/community")).toBe(true);
    }
  });

  test("no public route is swept in by a catch-all pattern", () => {
    /* النمط الشامل السابق كان يمرّ كل صفحة عامة عبر auth.getUser(). */
    const matcher = middleware.slice(middleware.indexOf("matcher:"));
    expect(matcher).not.toContain("/((?!");
    for (const route of ["/courses", "/blog", "/about", "/contact", "/paths", "/policies"]) {
      expect(matcher).not.toContain(`"${route}`);
    }
  });

  test("the only redirect it performs is the admin gate", () => {
    const redirects = [...middleware.matchAll(/NextResponse\.redirect\(([^)]*)\)/g)];
    expect(redirects.length).toBe(1);
    /* والوجهة صفحة دخول الإدارة، لا أي شيء آخر. */
    expect(middleware).toContain('new URL("/admin/login", request.url)');
  });
});

describe("public pages never gate on a session", () => {
  test("the page set under test is real, not an empty sweep", () => {
    expect(PUBLIC_PAGES.length).toBeGreaterThan(10);
    expect(PUBLIC_PAGES).toContain("src/app/page.tsx");
    expect(PUBLIC_PAGES).toContain("src/app/courses/[slug]/page.tsx");
  });

  test("none of them redirects a visitor to a login screen", () => {
    const offenders: string[] = [];
    for (const page of PUBLIC_PAGES) {
      const source = read(page);
      /* صفحتا الدخول والتسجيل نفسهما مستثناتان: وجودهما هو الغرض. */
      if (page.includes("/login/") || page.includes("/signup/")) continue;
      if (/redirect\(\s*["'`][^"'`]*login/.test(source)) offenders.push(page);
    }
    expect(offenders).toEqual([]);
  });

  test("none of them reads an admin session", () => {
    for (const page of PUBLIC_PAGES) {
      expect(read(page)).not.toContain("getAdminSession");
    }
  });
});

describe("admin stays fully protected", () => {
  test("every admin page sits under the guarded dashboard group or is the login page", () => {
    /* الاستثناء الوحيد src/app/admin/layout.tsx: metadata فقط (noindex)،
       لا يصيّر محتوى ولا يقرأ جلسة — البوابة تحته في (dashboard). */
    const rootLayout = "src/app/admin/layout.tsx";
    const adminPages = PAGES.filter((p) => p.includes("/app/admin/") && p !== rootLayout);
    expect(adminPages.length).toBeGreaterThan(20);
    for (const page of adminPages) {
      const guarded = page.includes("/(dashboard)/") || page.includes("/admin/login/");
      expect(guarded).toBe(true);
    }
    const root = read(rootLayout);
    expect(root).toContain("index: false");
    expect(root).not.toContain("getAdminSession");
  });

  test("the dashboard layout re-checks the session itself", () => {
    const layout = read("src/app/admin/(dashboard)/layout.tsx");
    expect(layout).toContain("getAdminSession()");
    expect(layout).toContain('redirect("/admin/login?next=/admin")');
  });

  test("authenticating is not enough — the login action verifies an admin profile", () => {
    /* أي عضو مجتمع يملك حسابًا صالحًا على نفس مشروع Supabase. */
    const signIn = adminAuth.indexOf("signInWithPassword");
    const profileCheck = adminAuth.indexOf('.from("profiles")', signIn);
    const success = adminAuth.indexOf('ok({ redirect: target })');
    expect(signIn).toBeGreaterThan(-1);
    expect(profileCheck).toBeGreaterThan(signIn);
    expect(success).toBeGreaterThan(profileCheck);
    expect(adminAuth).toContain("ليس حساب إدارة");
  });

  test("a rejected non-admin does not keep the session it just opened", () => {
    const between = adminAuth.slice(adminAuth.indexOf("if (!profile)"), adminAuth.indexOf("revalidatePath", adminAuth.indexOf("if (!profile)")));
    expect((between.match(/signOut\(\)/g) ?? []).length).toBe(3);
  });
});

describe("return-after-login", () => {
  test("the helper builds an internal path and encodes it", () => {
    expect(communityLoginHref("/community/u/sara")).toBe("/community/login?next=%2Fcommunity%2Fu%2Fsara");
    expect(communitySignupHref("/community")).toBe("/community/signup?next=%2Fcommunity");
  });

  test("it refuses an external destination rather than carrying it", () => {
    for (const hostile of ["https://evil.test", "//evil.test", "/\\evil.test", "javascript:alert(1)", ""]) {
      expect(returnPath(hostile)).toBeNull();
      expect(communityLoginHref(hostile)).toBe("/community/login");
    }
  });

  test("no client navigation hook is used to build a return path", () => {
    /* usePathname/useSearchParams داخل الخلاصة يؤجّلان حدّ Suspense فلا
       تظهر للزائر إطلاقًا — عطل وقع وأُثبت حيًا. الوجهة تأتي من الخادم. */
    for (const source of [feed, postCard, followButton]) {
      /* الاستدعاء لا الذِّكر: التعليق أعلاه يسمّي الخطافين ليحذّر منهما. */
      expect(source).not.toMatch(/use(Pathname|SearchParams)\s*\(/);
    }
    expect(read("src/lib/community/auth-links.ts")).not.toContain("export function currentPathAsNext");
  });

  test("the community page hands the feed both destinations", () => {
    const page = read("src/app/community/page.tsx");
    expect(page).toContain('loginHref={communityLoginHref("/community")}');
    expect(page).toContain('signupHref={communitySignupHref("/community")}');
  });

  test("both auth pages read next on the server and pass it down", () => {
    /* قراءته بخطاف داخل النموذج كانت تُخرج النموذج كله إلى تصيير العميل،
       فلا تصل الصفحة إلا هيكل تحميل — نموذج دخول لا يظهر بلا JS. */
    for (const page of ["src/app/community/login/page.tsx", "src/app/community/signup/page.tsx"]) {
      const source = read(page);
      expect(source).toContain("await searchParams");
      expect(source).toContain("returnPath(");
      expect(source).toContain("next={target}");
    }
    for (const form of [loginForm, signupForm]) {
      expect(form).not.toMatch(/useSearchParams\s*\(/);
      expect(form).toContain("{ next }: { next: string | null }");
    }
  });

  test("the login form uses next and hands it to the signup link", () => {
    expect(loginForm).toContain("communityLoginAction(email, password, next ?? undefined)");
    expect(loginForm).toContain("router.replace(next ?? result.data.redirect)");
    expect(loginForm).toContain("communitySignupHref(next)");
  });

  test("the signup form no longer drops next", () => {
    /* كان يتجاهله تمامًا، فيضيع ما جاء الزائر ليفعله. */
    expect(signupForm).toContain("router.replace(next ?? result.data.redirect)");
    expect(signupForm).not.toContain('href="/community/login"');
    expect((signupForm.match(/communityLoginHref\(next\)/g) ?? []).length).toBe(2);
  });

  test("the feed's guest CTAs use the destinations it was handed", () => {
    expect(feed).toContain("<Link href={signupHref}>");
    expect(feed).toContain("<Link href={loginHref}>");
    expect(feed).not.toContain('href="/community/signup"');
    expect(feed).not.toContain('href="/community/login"');
  });
});

describe("protected actions send a guest to login instead of a dead end", () => {
  test("a guest interaction routes to the login href, it does not stop at a toast", () => {
    const guard = postCard.slice(postCard.indexOf("if (!isMember) {"));
    expect(guard.slice(0, 320)).toContain("router.push(loginHref)");
  });

  test("the card cannot be rendered without a return destination", () => {
    expect(postCard).toContain("loginHref: string;");
    const usages = [...feed.matchAll(/<PostCard/g)].length + [...read("src/components/community/saved-posts.tsx").matchAll(/<PostCard/g)].length;
    expect(usages).toBe(2);
    expect(feed).toContain("loginHref={loginHref}");
    expect(read("src/components/community/saved-posts.tsx")).toContain("loginHref=");
  });

  test("a guest sees a way to comment rather than a silent gap", () => {
    expect(postCard).toContain("سجّل الدخول للتعليق");
  });

  test("follow is offered to guests and routes them to login first", () => {
    expect(followButton).toContain("loginHref?: string;");
    const handler = followButton.slice(followButton.indexOf("async function handleClick"));
    expect(handler.indexOf("router.push(loginHref)")).toBeLessThan(handler.indexOf("toggleFollowAction"));
    const profile = read("src/app/community/u/[username]/page.tsx");
    expect(profile).toContain("loginHref={viewerId ? undefined : communityLoginHref(");
  });
});
