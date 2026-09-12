import "server-only";

/** Payment verification primitives. Only server code may supply the secret key. */
export type PaymentMode = "test" | "production";

export interface MoyasarPayment {
  id: string;
  status: string;
  amount: number;
  currency: string;
  refunded: number;
  metadata: Record<string, unknown>;
}

const PAYMENT_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function validPaymentId(value: unknown): value is string {
  return typeof value === "string" && PAYMENT_ID.test(value);
}

export function keyMatchesMode(key: string, kind: "pk" | "sk", mode: PaymentMode): boolean {
  const prefix = `${kind}_${mode === "production" ? "live" : "test"}_`;
  return key.startsWith(prefix) && /^[A-Za-z0-9_-]+$/.test(key) && key.length > prefix.length + 12;
}

/** Avoid rounding a changed or imprecise price into a different charge. */
export function toHalalas(price: string | number): number {
  const value = String(price);
  if (!/^\d{1,8}(?:\.\d{1,2})?$/.test(value)) throw new Error("سعر الدفع غير صالح.");
  const [whole, fraction = ""] = value.split(".");
  const amount = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  if (!Number.isSafeInteger(amount) || amount < 100) throw new Error("الحد الأدنى للدفع ريال واحد.");
  return amount;
}

function object(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function parseMoyasarPayment(value: unknown): MoyasarPayment {
  if (!object(value) || !validPaymentId(value.id) || typeof value.status !== "string"
    || !Number.isSafeInteger(value.amount) || Number(value.amount) < 100
    || typeof value.currency !== "string" || !Number.isSafeInteger(value.refunded)
    || Number(value.refunded) < 0 || (value.metadata !== null && !object(value.metadata))) {
    throw new Error("تعذر التحقق من بيانات عملية الدفع.");
  }
  return {
    id: value.id,
    status: value.status,
    amount: value.amount as number,
    currency: value.currency,
    refunded: value.refunded as number,
    metadata: (value.metadata ?? {}) as Record<string, unknown>,
  };
}

/** Fetch from the fixed provider host; never accept a callback URL as an API endpoint. */
export async function fetchMoyasarPayment(
  id: string,
  secretKey: string,
  mode: PaymentMode,
  request: (input: string, init: RequestInit) => Promise<Response> = fetch,
): Promise<MoyasarPayment> {
  if (!validPaymentId(id)) throw new Error("معرّف عملية الدفع غير صالح.");
  if (!keyMatchesMode(secretKey, "sk", mode)) throw new Error("مفتاح ميسر لا يطابق بيئة الدفع.");
  let response: Response;
  try {
    response = await request(`https://api.moyasar.com/v1/payments/${id}`, {
      headers: { Authorization: `Basic ${Buffer.from(`${secretKey}:`).toString("base64")}` },
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(15_000),
    });
  } catch {
    // Provider/network errors can contain request headers. Never forward them to clients/logs.
    throw new Error("تعذر الاتصال بميسر للتحقق من الدفع. حاول لاحقًا.");
  }
  if (!response.ok) throw new Error("تعذر التحقق من عملية الدفع لدى ميسر.");
  let body: unknown;
  try { body = await response.json(); } catch { throw new Error("استجابة ميسر غير صالحة."); }
  const payment = parseMoyasarPayment(body);
  if (payment.id !== id) throw new Error("عملية الدفع لا تطابق الطلب.");
  return payment;
}

/** This is necessary, but fulfillment still requires an atomic, idempotent order transaction. */
export function paymentMatchesOrder(
  payment: MoyasarPayment,
  order: { id: string; amount: number; currency: "SAR"; mode: PaymentMode },
): boolean {
  return Number.isSafeInteger(order.amount) && order.amount >= 100
    && payment.status === "paid" && payment.refunded === 0
    && payment.amount === order.amount && payment.currency === order.currency
    && payment.metadata.order_id === order.id
    && payment.metadata.environment === order.mode;
}
