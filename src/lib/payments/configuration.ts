import "server-only";
import { getServiceSupabase } from "@/lib/supabase/service";
import { commerceSchema, defaultCommerce, type Mode, type Provider, type ProviderConfiguration, type ProviderSecrets } from "./settings";
import { decryptSecrets } from "./secrets";
import { keyMatchesMode } from "./moyasar";

export async function loadCommerce() {
  const { data, error } = await getServiceSupabase().from("commerce_settings").select("*").eq("id", true).maybeSingle();
  if (error || !data) return { settings: defaultCommerce, databaseReady: false };
  const parsed = commerceSchema.safeParse(data);
  return { settings: parsed.success ? parsed.data : defaultCommerce, databaseReady: parsed.success };
}

export async function loadCredentialMetadata(): Promise<ProviderConfiguration[]> {
  const { data, error } = await getServiceSupabase().from("payment_credentials")
    .select("provider,environment,merchant_approved,deposit_approved,verified_at,updated_at");
  if (error) return [];
  return (data ?? []).map(row => ({
    provider: row.provider as Provider, environment: row.environment as Mode, configured: true,
    merchantApproved: row.merchant_approved, depositApproved: row.deposit_approved,
    verifiedAt: row.verified_at, updatedAt: row.updated_at,
  }));
}

export async function loadSecrets(provider: Provider, mode: Mode) {
  const { data, error } = await getServiceSupabase().from("payment_credentials")
    .select("encrypted_payload,merchant_approved,deposit_approved,verified_at,updated_at")
    .eq("provider", provider).eq("environment", mode).maybeSingle();
  if (error || !data) throw new Error("لم تُحفظ مفاتيح هذا المزود والبيئة بعد.");
  return { secrets: decryptSecrets(data.encrypted_payload, provider, mode), row: data };
}

export function validateProviderSecrets(provider: Provider, mode: Mode, secrets: ProviderSecrets) {
  if (!secrets.secretKey || /\s/.test(secrets.secretKey)) throw new Error("أدخل المفتاح السري الكامل دون مسافات.");
  if (!secrets.webhookSecret || secrets.webhookSecret.length < 16) throw new Error("أدخل سر الإشعارات بطول 16 حرفًا على الأقل.");
  if (provider === "moyasar" && (!keyMatchesMode(secrets.secretKey, "sk", mode) || !keyMatchesMode(secrets.publishableKey, "pk", mode))) throw new Error("مفاتيح ميسر لا تطابق البيئة المحددة.");
  if (provider === "tabby") {
    const test = mode === "test";
    if (!secrets.secretKey.startsWith("sk_") || !secrets.publishableKey.startsWith("pk_")
      || secrets.secretKey.startsWith("sk_test_") !== test || secrets.publishableKey.startsWith("pk_test_") !== test) throw new Error("مفاتيح تابي لا تطابق البيئة المحددة.");
    if (!/^[A-Za-z0-9_-]{1,128}$/.test(secrets.merchantCode)) throw new Error("أدخل Merchant Code الذي زوّدتك به تابي.");
  }
}

/** Safe, read-only authentication probe. It does not create a payment or register a webhook. */
export async function probeProvider(provider: Provider, mode: Mode, secrets: ProviderSecrets) {
  validateProviderSecrets(provider, mode, secrets);
  const url = provider === "moyasar" ? "https://api.moyasar.com/v1/payments?page=1&per=1"
    : provider === "tabby" ? "https://api.tabby.sa/api/v2/payments?limit=1"
    : `https://${mode === "test" ? "api-sandbox" : "api"}.tamara.co/pre-checkout/v1/eligibility`;
  const authorization = provider === "moyasar" ? `Basic ${Buffer.from(`${secrets.secretKey}:`).toString("base64")}` : `Bearer ${secrets.secretKey}`;
  try {
    const response = await fetch(url, {
      method: provider === "tamara" ? "POST" : "GET",
      headers: { Authorization: authorization, "Content-Type": "application/json" },
      ...(provider === "tamara" ? { body: JSON.stringify({ order: { amount: 100, currency: "SAR" }, customer: {} }) } : {}),
      cache: "no-store", redirect: "error", signal: AbortSignal.timeout(15000),
    });
    await response.body?.cancel();
    if (!response.ok) return false;
    return true;
  } catch { return false; }
}
