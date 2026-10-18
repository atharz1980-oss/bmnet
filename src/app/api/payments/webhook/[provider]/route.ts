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
  type PurchaseOutcome,
} from "@/lib/payments/purchase";
import { paymentsMode } from "@/lib/payments/env";
import {
  guestOrderIdByProviderReference,
  verifyGuestOrder,
  type GuestOutcome,
} from "@/lib/payments/guest-orders";
import {
  verifyWorkshopPayment,
  workshopPaymentIdByProviderReference,
  type WorkshopPaymentOutcome,
} from "@/lib/workshops/orders";
import {
  spaceBookingIdByProviderReference,
  verifySpaceBooking,
  type SpaceBookingOutcome,
} from "@/lib/spaces/bookings";

export const dynamic = "force-dynamic";

/* دالة لا ثابت: جسم الاستجابة تيّار يُستهلك مرة واحدة، ومشاركة كائن
   واحد بين الطلبات تُفرغ جسم كل رد بعد الأول. */
function ack(): NextResponse {
  return NextResponse.json({ received: true }, { headers: { "cache-control": "no-store" } });
}

/* فشل تحقق عارض: رد غير 2xx (بلا جسم) ليعيد المزود الإرسال. لا يُعلَّم
   الحدث مكتملًا، والمكرر غير المكتمل يُعاد فحصه عند الإعادة. */
function retry(): NextResponse {
  return new NextResponse(null, { status: 503, headers: { "cache-control": "no-store" } });
}

export async function POST(
  request: Request,
  context: { params: Promise<{ provider: string }> },
): Promise<NextResponse> {
  const { provider: raw } = await context.params;
  const parsed = providerSchema.safeParse(raw);
  if (!parsed.success) return ack();
  const provider = parsed.data;
  if (!providerConfigured(provider)) return ack();

  let body: string;
  try {
    body = await request.text();
  } catch {
    return ack();
  }
  /* حمولة ضخمة ليست إشعارًا — لا تُفحص ولا تُسجَّل. */
  if (body.length > 64_000) return ack();

  let inspection;
  try {
    inspection = providerFor(provider).inspectWebhook(body, request.headers);
  } catch {
    return ack();
  }

  /* فشل قراءة المرجع ≠ «لا شراء بحساب»: رد غير 2xx ليعيد ميسّر الإرسال،
     والحدث يبقى غير مُعلَّم حتى تكتمل القراءة. */
  let paymentId: string | null;
  try {
    paymentId = inspection.providerPaymentId
      ? await paymentIdByProviderReference(provider, inspection.providerPaymentId)
      : null;
  } catch {
    return retry();
  }

  /* يُسجَّل الصالح والمزوَّر معًا: الأثر نفسه دليل عند التحقيق. */
  const { firstTime } = await recordWebhookEvent({
    provider,
    eventId: inspection.eventId,
    eventType: inspection.eventType,
    providerPaymentId: inspection.providerPaymentId,
    paymentId,
    signatureValid: inspection.signatureValid,
  });

  if (!inspection.signatureValid) return ack();
  /* تكرار مقرّر: القيد الفريد ابتلعه، ولا عمل ثانيًا. أما المكرر غير
     المكتمل (تعذّر الحفظ سابقًا) فقد أعاد `recordWebhookEvent` اعتباره
     جديدًا ليُعاد فحصه. */
  if (!firstTime) return ack();
  /* بيئة الإشعار تخالف بيئة الخادم — لا يُعالَج. */
  if (inspection.live !== null && inspection.live !== (paymentsMode() === "production")) return ack();
  if (!paymentId) {
    /* دفعات الورش الحضورية (إضافي): الحراسات نفسها سبقت، والتأكيد يسأل ميسّر.
       فشل قراءة المرجع أو فشل التحقق أو عدم اكتمال تحديث الحجز = رد غير 2xx
       ليعيد ميسّر الإرسال، والحدث يبقى غير مُعلَّم حتى تكتمل كل الخطوات. */
    let workshopPaymentId: string | null;
    try {
      workshopPaymentId = inspection.providerPaymentId
        ? await workshopPaymentIdByProviderReference(provider, inspection.providerPaymentId)
        : null;
    } catch {
      return retry();
    }
    if (workshopPaymentId) {
      let outcome: WorkshopPaymentOutcome;
      try {
        outcome = await verifyWorkshopPayment(workshopPaymentId, undefined, { reportUnverified: true });
      } catch {
        return retry();
      }
      /* `unverified`/`unknown` = لم تكتمل المعالجة: لا تعليم، ويُعاد الإرسال. */
      if (outcome === "unverified" || outcome === "unknown") return retry();
      try {
        await markWebhookProcessed(provider, inspection.eventId);
      } catch {
        return retry();
      }
      return ack();
    }
    /* حجوزات المساحات (إضافي): الحراسات نفسها سبقت، والتأكيد يسأل ميسّر
       — والحجز يُؤكد لحظيًا بمجرد وصول المال المطابق. */
    let spaceBookingId: string | null;
    try {
      spaceBookingId = inspection.providerPaymentId
        ? await spaceBookingIdByProviderReference(provider, inspection.providerPaymentId)
        : null;
    } catch {
      return retry();
    }
    if (spaceBookingId) {
      let spaceOutcome: SpaceBookingOutcome;
      try {
        spaceOutcome = await verifySpaceBooking(spaceBookingId, undefined, { reportUnverified: true });
      } catch {
        return retry();
      }
      if (spaceOutcome === "unverified" || spaceOutcome === "unknown") return retry();
      try {
        await markWebhookProcessed(provider, inspection.eventId);
      } catch {
        return retry();
      }
      return ack();
    }
    /* Fast Guest Checkout (إضافي): لا شراء بحساب بهذا المرجع — أهو طلب ضيف؟
       الحراسات أعلاه (السر والتكرار والبيئة) سبقت هذا الفرع كما هي، والتأكيد
       نفسه يسأل ميسّر مباشرة ولا يثق بجسم الإشعار. */
    /* فشل قراءة مرجع الضيف ≠ «لا طلب ضيف»: رد غير 2xx بدل 200 ليعيد ميسّر. */
    let guestOrderId: string | null;
    try {
      guestOrderId = inspection.providerPaymentId
        ? await guestOrderIdByProviderReference(provider, inspection.providerPaymentId)
        : null;
    } catch {
      return retry();
    }
    if (!guestOrderId) return ack();
    let outcome: GuestOutcome;
    try {
      outcome = await verifyGuestOrder(guestOrderId, undefined, { recheckRefund: true, reportUnverified: true });
    } catch {
      /* الخطأ لا يُسرَّب للمزود؛ وردّ غير 2xx يبقي الحدث غير مُعلَّم. */
      return retry();
    }
    if (outcome === "unverified" || outcome === "unknown") return retry();
    try {
      await markWebhookProcessed(provider, inspection.eventId);
    } catch {
      return retry();
    }
    return ack();
  }

  let outcome: PurchaseOutcome;
  try {
    outcome = await verifyAndFinalize(paymentId, undefined, { recheckRefund: true, reportUnverified: true });
  } catch {
    return retry();
  }
  if (outcome.outcome === "unverified" || outcome.outcome === "unknown") return retry();
  try {
    await markWebhookProcessed(provider, inspection.eventId);
  } catch {
    return retry();
  }
  return ack();
}
