import "server-only";

/**
 * رمز سلة الضيف — سرّ في كوكي httpOnly، وبصمته وحدها في القاعدة.
 *
 * لماذا بصمة: تسريب نسخة القاعدة لا يمنح أحدًا سلة أحد. ولماذا الكوكي
 * httpOnly: لا تحتاجه الشيفرة في المتصفح، فلا يُترك في متناول سكربت.
 * الرمز 32 بايت عشوائية (43 حرفًا base64url) — لا معنى لتخمينه.
 *
 * الكتابة مسموحة من Server Actions وRoute Handlers فقط. القراءة من صفحات
 * الخادم آمنة، و`ensureCartToken` لا تُنادى إلا من أكشن كتابة.
 */

import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";

const COOKIE_NAME = "bm_cart";
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;
const MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

/** بصمة SHA-256 بصيغة hex — نفس الصيغة التي يفرضها قيد الجدول. */
export function hashCartToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function isCartToken(value: string | undefined | null): value is string {
  return typeof value === "string" && TOKEN_PATTERN.test(value);
}

/** يقرأ رمز السلة من الكوكي بلا إنشاء. */
export async function readCartToken(): Promise<string | null> {
  try {
    const store = await cookies();
    const value = store.get(COOKIE_NAME)?.value;
    return isCartToken(value) ? value : null;
  } catch {
    return null;
  }
}

/**
 * يعيد الرمز القائم أو ينشئ واحدًا ويضبط الكوكي.
 * لا تُنادى من Server Component: `cookies().set` ترمي هناك بالتصميم.
 */
export async function ensureCartToken(): Promise<string> {
  const store = await cookies();
  const existing = store.get(COOKIE_NAME)?.value;
  if (isCartToken(existing)) return existing;

  const token = randomBytes(32).toString("base64url");
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
  return token;
}

/** يثبّت رمزًا جديدًا (بعد تدوير السلة إلى حساب مسجّل). */
export async function writeCartToken(token: string): Promise<void> {
  const store = await cookies();
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

/** يقطع ارتباط هذا المتصفح بالسلة (لا يحذف السلة نفسها). */
export async function clearCartToken(): Promise<void> {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}
