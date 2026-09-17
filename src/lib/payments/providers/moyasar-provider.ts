import "server-only";

/**
 * مزوّد ميسر — عبر **الفاتورة المستضافة** لا نموذج بطاقة عندنا.
 *
 * لماذا الفاتورة: صفحة الدفع على نطاق ميسر، فلا يمر رقم بطاقة بخادمنا ولا
 * بمتصفح صفحتنا ولا بسجلاتنا. أقل بيانات حساسة نلمسها = أقل ما يمكن أن
 * يتسرب منا.
 *
 * ── مراجع رسمية ──────────────────────────────────────────────
 *  • الفاتورة:  https://docs.moyasar.com/api/invoices/01-create-invoice
 *      المبلغ عدد صحيح بأصغر وحدة (1.00 ريال = 100)، والرد يحمل `url`
 *      وهي صفحة الدفع، و`callback_url` يستقبل الفاتورة عند السداد.
 *  • الإشعارات: https://docs.moyasar.com/api/other/webhooks/webhook-reference/
 *      الحمولة تحمل `secret_token` يضعه التاجر عند إنشاء الإشعار،
 *      و`live` و`type` و`data`. **لا توقيع HMAC موثّقًا** — لذلك السر
 *      يُقارن بزمن ثابت، ثم **لا يُصدَّق الجسم**: نسأل ميسر مباشرة.
 *
 * ── ما لا يفعله هذا الملف ────────────────────────────────────
 * لا يقرر وصولًا، ولا يكتب في القاعدة، ولا يثق بجسم إشعار. يترجم فقط.
 */

import { createHash } from "node:crypto";

import { moyasarEnvironment, secretsMatch } from "../env";
import {
  PaymentError,
  type CheckoutRequest,
  type CheckoutSession,
  type NormalizedStatus,
  type PaymentProvider,
  type ProviderPaymentState,
  type WebhookInspection,
} from "../provider";

/** مضيف ثابت. لا يُبنى من قيمة واردة في طلب أو إشعار بحال. */
const API = "https://api.moyasar.com/v1";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** حالات الفاتورة والدفع في ميسر إلى مفرداتنا. */
function normalize(status: string): NormalizedStatus {
  switch (status) {
    case "paid":
    case "captured":
    case "verified":
      return "paid";
    case "authorized":
      return "authorized";
    case "failed":
      return "failed";
    case "canceled":
    case "cancelled":
    case "voided":
      return "cancelled";
    case "expired":
      return "expired";
    case "refunded":
      return "refunded";
    /* initiated / on_hold / أي جديد: معلّق حتى يثبت غير ذلك. */
    default:
      return "pending";
  }
}

function asObject(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function readString(source: Record<string, unknown>, key: string): string | null {
  const value = source[key];
  return typeof value === "string" && value.length > 0 ? value : null;
}

export type Fetcher = (input: string, init: RequestInit) => Promise<Response>;

export function createMoyasarProvider(fetcher: Fetcher = fetch): PaymentProvider {
  const environment = moyasarEnvironment();
  if (!environment) throw new PaymentError("الدفع غير مهيأ على الخادم.", "provider_unconfigured");
  const authorization = `Basic ${Buffer.from(`${environment.secretKey}:`).toString("base64")}`;

  /** كل نداء إلى ميسر يمر من هنا: مضيف ثابت، بلا تحويلات، بمهلة. */
  async function call(path: string, init: RequestInit = {}): Promise<unknown> {
    let response: Response;
    try {
      response = await fetcher(`${API}${path}`, {
        ...init,
        headers: { ...(init.headers ?? {}), Authorization: authorization, "Content-Type": "application/json" },
        cache: "no-store",
        redirect: "error",
        signal: AbortSignal.timeout(15_000),
      });
    } catch {
      /* رسائل الشبكة قد تحمل ترويسة الطلب — لا تُمرَّر ولا تُسجَّل. */
      throw new PaymentError("تعذر الاتصال ببوابة الدفع. حاول لاحقًا.", "provider_unreachable");
    }
    if (!response.ok) {
      await response.body?.cancel();
      throw new PaymentError("تعذر إتمام الطلب لدى بوابة الدفع.", "provider_rejected");
    }
    try {
      return await response.json();
    } catch {
      throw new PaymentError("رد بوابة الدفع غير مفهوم.", "provider_bad_response");
    }
  }

  return {
    id: "moyasar",

    async createCheckout(request: CheckoutRequest): Promise<CheckoutSession> {
      if (request.mode !== environment.mode) {
        throw new PaymentError("بيئة الدفع لا تطابق إعداد الخادم.", "environment_mismatch");
      }
      if (!Number.isSafeInteger(request.amount) || request.amount < 100) {
        throw new PaymentError("مبلغ غير صالح للدفع.", "invalid_amount");
      }
      const body = await call("/invoices", {
        method: "POST",
        body: JSON.stringify({
          amount: request.amount,
          currency: request.currency,
          description: request.description,
          callback_url: request.callbackUrl,
          success_url: request.successUrl,
          back_url: request.backUrl,
          expired_at: request.expiresAt.toISOString(),
          /* يعود إلينا في كل قراءة لاحقة، فيربط عملية المزود بصفّنا. */
          metadata: {
            payment_id: request.paymentId,
            idempotency_key: request.idempotencyKey,
            environment: request.mode,
          },
        }),
      });
      const invoice = asObject(body);
      const id = invoice ? readString(invoice, "id") : null;
      const url = invoice ? readString(invoice, "url") : null;
      if (!id || !url || !url.startsWith("https://")) {
        throw new PaymentError("لم تُنشأ صفحة الدفع.", "provider_bad_response");
      }
      return { providerPaymentId: id, checkoutUrl: url };
    },

    async fetchState(providerPaymentId: string): Promise<ProviderPaymentState> {
      if (!UUID.test(providerPaymentId)) {
        throw new PaymentError("مرجع العملية غير صالح.", "invalid_reference");
      }
      const body = await call(`/invoices/${providerPaymentId}`, { method: "GET" });
      const invoice = asObject(body);
      if (!invoice) throw new PaymentError("رد بوابة الدفع غير مفهوم.", "provider_bad_response");

      const id = readString(invoice, "id");
      const status = readString(invoice, "status");
      const currency = readString(invoice, "currency");
      const amount = invoice.amount;
      if (id !== providerPaymentId || !status || !currency || !Number.isSafeInteger(amount)) {
        throw new PaymentError("بيانات العملية غير مكتملة.", "provider_bad_response");
      }

      /* الاسترداد قد يأتي على الفاتورة أو على الدفعة داخلها. */
      const payments = Array.isArray(invoice.payments) ? invoice.payments : [];
      const inner = asObject(payments[0]);
      const refundedRaw = Number.isSafeInteger(invoice.refunded)
        ? (invoice.refunded as number)
        : inner && Number.isSafeInteger(inner.refunded)
          ? (inner.refunded as number)
          : 0;

      const metadata = asObject(invoice.metadata) ?? (inner ? asObject(inner.metadata) : null) ?? {};
      return {
        providerPaymentId: id,
        status: normalize(status),
        amount: amount as number,
        currency,
        refunded: refundedRaw,
        metadataPaymentId: readString(metadata, "payment_id"),
        metadataEnvironment: readString(metadata, "environment"),
      };
    },

    inspectWebhook(rawBody: string, headers: Headers): WebhookInspection {
      void headers;
      const fingerprint = createHash("sha256").update(rawBody).digest("hex").slice(0, 48);
      let parsed: unknown;
      try {
        parsed = JSON.parse(rawBody);
      } catch {
        return { signatureValid: false, eventId: fingerprint, eventType: "", providerPaymentId: null, live: null };
      }
      const event = asObject(parsed) ?? {};
      const token = readString(event, "secret_token") ?? "";
      const signatureValid = secretsMatch(token, environment.webhookSecret);

      /* المرجع من `data.invoice_id` أو `data.id` — ما يصلح للسؤال عنه. */
      const data = asObject(event.data) ?? {};
      const invoiceId = readString(data, "invoice_id") ?? readString(data, "id");
      return {
        signatureValid,
        eventId: readString(event, "id") ?? fingerprint,
        eventType: readString(event, "type") ?? "",
        providerPaymentId: invoiceId && UUID.test(invoiceId) ? invoiceId : null,
        live: typeof event.live === "boolean" ? event.live : null,
      };
    },
  };
}
