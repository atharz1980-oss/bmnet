import { NextResponse } from "next/server";

/**
 * مهبط إشعارات المزودين.
 *
 * الإشعار **لا يفعّل شيئًا**. أقصى ما يقوله: «انظر إلى العملية X». وهذا
 * المعالج يتحقق من أصالته، يسجّله، ثم ينادي التحقق الذي يسأل المزود
 * مباشرة عبر مضيفه الثابت ومفتاحنا السري. لو زُوّر الجسم كاملًا فلن ينتج
 * عنه إلا سؤال عن عملية لا تخص أحدًا.
 *
 * ترتيب مقصود: نرد 200 مبكرًا للحالات التي لا عمل فيها (تكرار، توقيع
 * خاطئ) — ميسر يعيد المحاولة ست مرات على ما ليس 2xx، وإعادة المحاولة على
 * إشعار مزوَّر ضجيج لا فائدة فيه.
 *
 * ولا يُرجع هذا المسار تفاصيل: كل رد `{ received: true }`. الفرق بين
 * «سر خاطئ» و«عملية غير موجودة» معلومة تفيد المهاجم وحده.
 */

import { providerSchema } from "@/lib/payments/settings";
import { providerConfigured, providerFor } from "@/lib/payments/purchase";
import {
  markWebhookProcessed,
  paymentIdByProviderReference,
  recordWebhookEvent,
  verifyAndFinalize,
} from "@/lib/payments/purchase";
import { paymentsMode } from "@/lib/payments/env";

export const dynamic = "force-dynamic";

const ACK = NextResponse.json({ received: true }, { headers: { "cache-control": "no-store" } });

export async function POST(
  request: Request,
  context: { params: Promise<{ provider: string }> },
): Promise<NextResponse> {
  const { provider: raw } = await context.params;
  const parsed = providerSchema.safeParse(raw);
  if (!parsed.success) return ACK;
  const provider = parsed.data;
  if (!providerConfigured(provider)) return ACK;

  let body: string;
  try {
    body = await request.text();
  } catch {
    return ACK;
  }
  /* حمولة ضخمة ليست إشعارًا — لا تُفحص ولا تُسجَّل. */
  if (body.length > 64_000) return ACK;

  let inspection;
  try {
    inspection = providerFor(provider).inspectWebhook(body, request.headers);
  } catch {
    return ACK;
  }

  const paymentId = inspection.providerPaymentId
    ? await paymentIdByProviderReference(provider, inspection.providerPaymentId)
    : null;

  /* يُسجَّل الصالح والمزوَّر معًا: الأثر نفسه دليل عند التحقيق. */
  const { firstTime } = await recordWebhookEvent({
    provider,
    eventId: inspection.eventId,
    eventType: inspection.eventType,
    providerPaymentId: inspection.providerPaymentId,
    paymentId,
    signatureValid: inspection.signatureValid,
  });

  if (!inspection.signatureValid) return ACK;
  /* تكرار: القيد الفريد ابتلعه، ولا عمل ثانيًا. */
  if (!firstTime) return ACK;
  /* بيئة الإشعار تخالف بيئة الخادم — لا يُعالَج. */
  if (inspection.live !== null && inspection.live !== (paymentsMode() === "production")) return ACK;
  if (!paymentId) return ACK;

  try {
    await verifyAndFinalize(paymentId);
    await markWebhookProcessed(provider, inspection.eventId);
  } catch {
    /* الخطأ لا يُسرَّب للمزود؛ إعادة المحاولة ستمر بالمسار نفسه. */
  }
  return ACK;
}
