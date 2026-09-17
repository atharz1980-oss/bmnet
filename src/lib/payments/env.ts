import "server-only";

/**
 * مفاتيح الدفع من بيئة الخادم — ولا مكان آخر.
 *
 * قرار المالك: المفاتيح في متغيّرات بيئة الاستضافة، لا في القاعدة ولا في
 * المستودع. وهذا الملف `server-only` فاستيراده من مكوّن عميل خطأ بناء لا
 * تسريب صامت.
 *
 * فشل مغلق في كل مسار: غياب المفتاح يعني **لا دفع**، لا دفعًا بلا تحقق.
 * وغياب سر الإشعارات يعني رفض كل إشعار وارد — لا قبولًا بلا تحقق.
 *
 * البيئة تُقرأ من `PAYMENTS_MODE` وتُقابَل بسابقة المفتاح: مفتاح إنتاج في
 * وضع اختبار (أو العكس) يُرفض، فلا تُحصَّل أموال حقيقية من تدفّق تجريبي.
 */

import { keyMatchesMode, type PaymentMode } from "./moyasar";

export type { PaymentMode };

export interface MoyasarEnvironment {
  secretKey: string;
  webhookSecret: string;
  mode: PaymentMode;
}

/** وضع الدفع الحالي. الافتراض `test` عمدًا: الإنتاج قرار صريح. */
export function paymentsMode(value = process.env.PAYMENTS_MODE): PaymentMode {
  return value === "production" ? "production" : "test";
}

/**
 * إعداد ميسر، أو null إن لم يكتمل.
 * null يعني عند المستدعي «لا تعرض زر دفع» و«ارفض الإشعار» — لا بديلًا.
 */
export function moyasarEnvironment(
  env: NodeJS.ProcessEnv = process.env,
): MoyasarEnvironment | null {
  const mode = paymentsMode(env.PAYMENTS_MODE);
  const secretKey = env.MOYASAR_SECRET_KEY?.trim() ?? "";
  const webhookSecret = env.MOYASAR_WEBHOOK_SECRET?.trim() ?? "";
  if (!secretKey || !keyMatchesMode(secretKey, "sk", mode)) return null;
  /* سر قصير يمكن تخمينه، وهو هنا كلمة السر الوحيدة أمام إشعار مزوَّر. */
  if (webhookSecret.length < 16) return null;
  return { secretKey, webhookSecret, mode };
}

export function moyasarConfigured(): boolean {
  return moyasarEnvironment() !== null;
}

/** مقارنة أسرار بزمن ثابت — لا تكشف طول التطابق لمن يجرّب. */
export function secretsMatch(a: string, b: string): boolean {
  if (typeof a !== "string" || typeof b !== "string") return false;
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
