/**
 * تدفق استعادة كلمة المرور.
 *
 * ثلاثة أشياء تنكسر بصمت لو لم تُحرَس:
 *  1. رابط البريد يُبنى على ترويسة الطلب فيخرج من الإنتاج إلى نطاق غريب
 *     أو إلى localhost.
 *  2. الرد يميّز «أُرسل» من «لا حساب» فيصير النموذج أداة تعداد حسابات.
 *  3. التحديث يمر بعميل الخدمة فيصير تغيير كلمة مرور أي أحد ممكنًا.
 */
import { describe, expect, test } from "bun:test";
import { readFileSync, existsSync } from "node:fs";

import {
  buildRecoveryRedirectUrl,
  DEFAULT_LOGIN_PATH,
  isValidRecoveryEmail,
  LOGIN_PATHS,
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  RECOVERY_CALLBACK_PATH,
  RECOVERY_GENERIC_MESSAGE,
  RECOVERY_REQUEST_PATH,
  RECOVERY_UPDATE_PATH,
  resolveRecoveryOrigin,
  safeLoginReturn,
  validateNewPassword,
} from "../src/lib/auth/recovery";
import { siteConfig } from "../src/data/site";

const read = (p: string) => readFileSync(p, "utf8").replace(/\r\n/g, "\n");

const ACTIONS = "src/app/community/actions/password-reset.ts";
const CALLBACK = "src/app/community/reset-password/callback/route.ts";
const REQUEST_PAGE = "src/app/community/reset-password/page.tsx";
const REQUEST_FORM = "src/app/community/reset-password/reset-password-form.tsx";
const UPDATE_PAGE = "src/app/community/reset-password/update/page.tsx";
const UPDATE_FORM = "src/app/community/reset-password/update/update-password-form.tsx";

describe("the recovery redirect can never leave the site", () => {
  test("in production it is the canonical domain, whatever the request claims", () => {
    for (const hostile of ["http://localhost:3000", "https://evil.test", "//evil.test", null, ""]) {
      expect(resolveRecoveryOrigin(hostile, true)).toBe(siteConfig.url);
    }
    const url = buildRecoveryRedirectUrl("/admin/login", "https://evil.test", true);
    expect(url.startsWith(`${siteConfig.url}${RECOVERY_CALLBACK_PATH}`)).toBe(true);
    expect(url).not.toContain("evil.test");
    expect(url).not.toContain("localhost");
    expect(url).toContain("next=%2Fadmin%2Flogin");
  });

  test("the canonical domain is the production one", () => {
    expect(siteConfig.url).toBe("https://baytalmosawer.net");
  });

  test("outside production a well-formed local origin is allowed, a malformed one is not", () => {
    expect(resolveRecoveryOrigin("http://localhost:3000", false)).toBe("http://localhost:3000");
    expect(resolveRecoveryOrigin("https://evil.test/path", false)).toBe(siteConfig.url);
    expect(resolveRecoveryOrigin("javascript:alert(1)", false)).toBe(siteConfig.url);
  });

  test("the redirect carries only an allow-listed login destination", () => {
    for (const hostile of ["https://evil.test", "/admin", "//evil.test", "/community/profile", "", null]) {
      expect(safeLoginReturn(hostile)).toBe(DEFAULT_LOGIN_PATH);
    }
    for (const good of LOGIN_PATHS) expect(safeLoginReturn(good)).toBe(good);
    expect(safeLoginReturn(["/admin/login"])).toBe("/admin/login");
  });
});

describe("no account enumeration", () => {
  test("one message covers sent, unknown and provider failure", () => {
    const source = read(ACTIONS);
    const successes = [...source.matchAll(/return ok\(/g)].length;
    expect(successes).toBe(2); // طلب + تحديث
    expect(source).toContain("RECOVERY_GENERIC_MESSAGE");
    /* لا فرع يخبر المستخدم أن البريد غير مسجل. */
    expect(source).not.toMatch(/غير مسجل|لا يوجد حساب|not found/i);
  });

  test("a provider error is swallowed for the browser, not surfaced", () => {
    const source = read(ACTIONS);
    const request = source.slice(source.indexOf("requestPasswordResetAction"), source.indexOf("updatePasswordAction"));
    /* الخطأ يُسجَّل ثم يُعاد النجاح العام — لا fail بعد استدعاء المزود. */
    const afterProvider = request.slice(request.indexOf("resetPasswordForEmail"));
    expect(afterProvider).not.toContain("return fail(");
    expect(afterProvider).toContain("return ok(");
  });

  test("the message itself commits to nothing", () => {
    expect(RECOVERY_GENERIC_MESSAGE).toContain("إذا كان البريد مسجلًا");
  });

  test("email shape is still rejected — it reveals no account", () => {
    expect(isValidRecoveryEmail("not-an-email")).toBe(false);
    expect(isValidRecoveryEmail("a@b.co")).toBe(true);
    expect(isValidRecoveryEmail("  A@B.CO  ")).toBe(true);
  });
});

describe("password policy", () => {
  test("it matches the signup policy and requires a matching confirmation", () => {
    expect(PASSWORD_MIN_LENGTH).toBe(8);
    expect(validateNewPassword("short", "short")).toContain("8 أحرف");
    expect(validateNewPassword("longenough", "different")).toContain("غير متطابقتين");
    expect(validateNewPassword("", "")).toContain("أدخل كلمة المرور");
    expect(validateNewPassword("longenough", "longenough")).toBeNull();
  });

  test("it stops at the limit the provider enforces", () => {
    expect(PASSWORD_MAX_LENGTH).toBe(72);
    const tooLong = "a".repeat(PASSWORD_MAX_LENGTH + 1);
    expect(validateNewPassword(tooLong, tooLong)).toContain("طويلة جدًا");
  });

  test("the signup action still uses the same minimum — the policy did not fork", () => {
    const signup = read("src/app/community/actions/auth.ts");
    expect(signup).toContain(`password.length < ${PASSWORD_MIN_LENGTH}`);
  });
});

describe("the update runs as the user, never as the service", () => {
  test("no service client anywhere in the flow", () => {
    for (const file of [ACTIONS, CALLBACK, UPDATE_PAGE, UPDATE_FORM, REQUEST_PAGE, REQUEST_FORM]) {
      const source = read(file);
      expect(source).not.toContain("getServiceSupabase");
      expect(source).not.toContain("SUPABASE_SECRET_KEY");
      expect(source).not.toContain("service_role");
      expect(source).not.toContain("auth.admin");
    }
  });

  test("it updates through the session client and closes the session after", () => {
    const source = read(ACTIONS);
    const update = source.slice(source.indexOf("updatePasswordAction"));
    expect(update).toContain("createSupabaseServerClient()");
    expect(update).toContain("auth.updateUser({ password })");
    const signOut = update.indexOf("auth.signOut()");
    const updated = update.indexOf("auth.updateUser");
    expect(signOut).toBeGreaterThan(updated);
  });

  test("it refuses when there is no recovery session", () => {
    const update = read(ACTIONS).slice(read(ACTIONS).indexOf("updatePasswordAction"));
    expect(update).toContain("if (!user)");
    expect(update).toContain("انتهت صلاحية رابط الاستعادة");
  });

  test("neither token nor password is ever logged", () => {
    for (const file of [ACTIONS, CALLBACK, UPDATE_FORM]) {
      const source = read(file);
      for (const call of source.matchAll(/console\.\w+\(([^;]*)\)/g)) {
        /* النصوص الثابتة وسوم للسجل؛ العبرة بما يُمرَّر من قيم. */
        const values = call[1].replace(/"[^"]*"/g, "").replace(/'[^']*'/g, "");
        expect(values).not.toMatch(/password|token|code|email|secret/i);
      }
    }
  });
});

describe("the callback establishes the session where cookies can be written", () => {
  test("it is a route handler, not a page", () => {
    expect(existsSync(CALLBACK)).toBe(true);
    expect(existsSync("src/app/community/reset-password/callback/page.tsx")).toBe(false);
    expect(read(CALLBACK)).toContain('dynamic = "force-dynamic"');
  });

  test("it handles both query shapes Supabase may send", () => {
    const source = read(CALLBACK);
    expect(source).toContain("exchangeCodeForSession");
    expect(source).toContain("verifyOtp");
    expect(source).toContain('"recovery"');
  });

  test("its redirect target is the canonical origin, not the request URL nor the link", () => {
    const source = read(CALLBACK);
    /* خلف وسيط الاستضافة يحمل request.url الأصل الداخلي 0.0.0.0:3000،
       فالبناء عليه يرمي المستخدم إلى عنوان لا يُفتح — وقع على الإنتاج. */
    expect(source).toContain("resolveRecoveryOrigin(url.origin)");
    expect(source).not.toContain("new URL(path, url.origin)");
    expect(source).toContain('safeLoginReturn(url.searchParams.get("next"))');
    expect(source).not.toMatch(/redirect\(\s*url\.searchParams\.get/);
  });

  test("a production callback cannot redirect to an internal or foreign origin", () => {
    for (const internal of ["http://0.0.0.0:3000", "http://127.0.0.1:3000", "http://localhost:3000", "https://evil.test"]) {
      expect(resolveRecoveryOrigin(internal, true)).toBe(siteConfig.url);
    }
  });

  test("a rejected link lands on the request page with an Arabic notice", () => {
    expect(read(CALLBACK)).toContain('RECOVERY_REQUEST_PATH, { expired: "1" }');
    expect(read(REQUEST_PAGE)).toContain('expired === "1"');
  });
});

describe("the pages exist, are noindex, and are wired to the login screens", () => {
  test("all three routes exist", () => {
    for (const file of [REQUEST_PAGE, REQUEST_FORM, UPDATE_PAGE, UPDATE_FORM, CALLBACK]) {
      expect(existsSync(file)).toBe(true);
    }
    expect(RECOVERY_REQUEST_PATH).toBe("/community/reset-password");
    expect(RECOVERY_CALLBACK_PATH).toBe("/community/reset-password/callback");
    expect(RECOVERY_UPDATE_PATH).toBe("/community/reset-password/update");
  });

  test("recovery pages are not indexed", () => {
    for (const page of [REQUEST_PAGE, UPDATE_PAGE]) {
      expect(read(page)).toContain("robots: { index: false, follow: false }");
    }
  });

  test("both login screens offer the link", () => {
    for (const form of ["src/app/community/login/login-form.tsx", "src/app/admin/login/login-form.tsx"]) {
      const source = read(form);
      expect(source).toContain("نسيت كلمة المرور؟");
      expect(source).toContain("RECOVERY_REQUEST_PATH");
    }
  });

  test("both forms guard against a double submit and show a busy state", () => {
    for (const form of [REQUEST_FORM, UPDATE_FORM]) {
      const source = read(form);
      expect(source).toContain("if (busy) return;");
      expect(source).toContain("animate-spin");
      expect(source).toContain("disabled={busy");
    }
  });

  test("the update form clears the fragment so no token lingers in the URL bar", () => {
    const source = read(UPDATE_FORM);
    expect(source).toContain("window.history.replaceState");
    const clear = source.indexOf("window.history.replaceState");
    const setSession = source.indexOf("auth.setSession");
    expect(clear).toBeLessThan(setSession);
  });

  test("success sends the user to an allow-listed login page", () => {
    const source = read(UPDATE_FORM);
    expect(source).toContain('setStage("done")');
    expect(source).toContain("router.replace(loginPath)");
    expect(read(UPDATE_PAGE)).toContain("safeLoginReturn(next)");
  });
});

describe("existing authentication is untouched", () => {
  test("the middleware scope did not change", () => {
    const middleware = read("src/middleware.ts");
    const matcher = middleware.slice(middleware.indexOf("matcher:"));
    const entries = [...matcher.matchAll(/"([^"]+)"/g)].map((m) => m[1]);
    for (const entry of entries) {
      /* /learn انضم مع الدورات الأونلاين: يقرأ الجلسة ليقرر الوصول. */
      expect(["/admin", "/community", "/account", "/learn"].some((p) => entry.startsWith(p))).toBe(true);
    }
    /* المسارات الجديدة تحت /community فيغطيها النطاق القائم بلا توسيع. */
    expect(RECOVERY_REQUEST_PATH.startsWith("/community")).toBe(true);
  });

  test("login and signup actions are unchanged in shape", () => {
    const auth = read("src/app/community/actions/auth.ts");
    expect(auth).toContain("export async function communityLoginAction");
    expect(auth).toContain("export async function communitySignupAction");
    expect(auth).toContain("signInWithPassword");
  });

  test("the admin gate still verifies an admin profile after authenticating", () => {
    const adminAuth = read("src/app/admin/actions/auth.ts");
    expect(adminAuth).toContain("ليس حساب إدارة");
    const signIn = adminAuth.indexOf("signInWithPassword");
    expect(adminAuth.indexOf('.from("profiles")', signIn)).toBeGreaterThan(signIn);
  });

  test("no Supabase or RLS configuration was added for this flow", () => {
    const actions = read(ACTIONS);
    expect(actions).not.toContain("grant ");
    expect(actions).not.toContain("create policy");
    expect(read("next.config.ts")).not.toContain("supabase.auth");
  });
});
