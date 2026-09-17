import "server-only";

/**
 * عقد مزوّد الدفع — واحد لكل المزودين.
 *
 * الغرض ألا يتسرب منطق ميسر إلى بقية التطبيق: من يضيف تابي أو تمارا لاحقًا
 * يكتب ملفًا يحقق هذا العقد ويسجّله، ولا يلمس تدفّق الشراء ولا قاعدة
 * البيانات ولا الواجهة.
 *
 * ثلاث مسؤوليات لا غير:
 *   1. `createCheckout` — ينشئ صفحة دفع مستضافة ويعيد رابطها ومرجعها.
 *   2. `fetchState`     — يسأل المزود عن الحقيقة، ويعيدها بمفردات موحّدة.
 *   3. `parseWebhook`   — يتحقق من أصالة الإشعار ويستخرج المرجع منه.
 *
 * ما **ليس** من مسؤولياته: تفعيل الوصول. لا دالة هنا تلمس تسجيلًا ولا
 * تكتب «مدفوع». الإشعار يقول «انظر إلى العملية X» ولا يقول «X مدفوعة»؛
 * القول الفصل لـ`fetchState` ثم للمعاملة في القاعدة.
 */

import type { Provider } from "./settings";

export type { Provider };

/** حالات موحّدة — ترجمة مفردات كل مزود إلى مفرداتنا. */
export type NormalizedStatus =
  | "pending"
  | "authorized"
  | "paid"
  | "failed"
  | "cancelled"
  | "expired"
  | "refunded";

export interface CheckoutRequest {
  /** معرّف صف الشراء عندنا — يُرسل في البيانات الوصفية ويعود منها. */
  paymentId: string;
  idempotencyKey: string;
  /** بالهللات، شامل الضريبة: هو ما يُخصم حرفيًا. */
  amount: number;
  currency: "SAR";
  description: string;
  successUrl: string;
  backUrl: string;
  callbackUrl: string;
  expiresAt: Date;
  mode: "test" | "production";
}

export interface CheckoutSession {
  providerPaymentId: string;
  checkoutUrl: string;
}

export interface ProviderPaymentState {
  providerPaymentId: string;
  status: NormalizedStatus;
  /** بالهللات كما يراها المزود. */
  amount: number;
  currency: string;
  /** المبلغ المسترد لدى المزود، بالهللات. */
  refunded: number;
  /** ما وضعناه في البيانات الوصفية عند الإنشاء — يُقارن ولا يُصدَّق وحده. */
  metadataPaymentId: string | null;
  metadataEnvironment: string | null;
}

export interface WebhookInspection {
  /** هل التوقيع/السر صحيح. غير الصحيح لا يُعالَج بحال. */
  signatureValid: boolean;
  /** معرّف الحدث لمنع التكرار؛ بصمة الجسم حين لا يرسل المزود معرّفًا. */
  eventId: string;
  eventType: string;
  providerPaymentId: string | null;
  /** بيئة الإشعار كما يعلنها المزود، إن أعلنها. */
  live: boolean | null;
}

export interface PaymentProvider {
  readonly id: Provider;
  createCheckout(request: CheckoutRequest): Promise<CheckoutSession>;
  fetchState(providerPaymentId: string): Promise<ProviderPaymentState>;
  inspectWebhook(rawBody: string, headers: Headers): WebhookInspection;
}

/** خطأ يصلح لعرضه للمستخدم — بلا تفاصيل مزوّد ولا ترويسات طلب. */
export class PaymentError extends Error {
  readonly code: string;
  constructor(message: string, code = "payment_error") {
    super(message);
    this.name = "PaymentError";
    this.code = code;
  }
}
