"use server";

import { revalidatePath } from "next/cache";
import { invalidateCmsCache } from "./cache-invalidate";
import { requirePermission } from "@/lib/admin/session";
import { fail, ok } from "@/lib/cms/result";
import { getServiceSupabase } from "@/lib/supabase/service";
import { credentialInputSchema, depositSchema, modeSchema, providerSchema, type Mode, type Provider } from "@/lib/payments/settings";
import { encryptSecrets } from "@/lib/payments/secrets";
import { loadSecrets, probeProvider, validateProviderSecrets } from "@/lib/payments/configuration";
import {
  decryptIdentitySecrets,
  encryptIdentitySecrets,
  identityCredentialInputSchema,
} from "@/lib/identity/configuration";

async function ownerGate() {
  const gate = await requirePermission("payments", "manage");
  if (!gate.ok) return gate;
  return gate.data.role.key === "owner" ? gate : fail("إعداد الضريبة والعربون والمفاتيح متاح للمالك فقط.");
}

/** يكتب أعمدة السداد والسياسات فقط؛ هوية المنشأة لها إجراؤها المستقل. */
export async function saveDepositAction(input: unknown) {
  const gate = await ownerGate();
  if (!gate.ok) return gate;
  const parsed = depositSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "إعدادات غير صالحة.");
  const { error } = await getServiceSupabase().from("commerce_settings")
    .update({ ...parsed.data, updated_at: new Date().toISOString() }).eq("id", true);
  if (error) return fail("تعذر حفظ إعدادات السداد. تحقق من تجهيز قاعدة الدفع.");
  invalidateCmsCache();
  revalidatePath("/", "layout");
  return ok(null);
}

export async function saveCredentialsAction(input: unknown) {
  const gate = await ownerGate();
  if (!gate.ok) return gate;
  const parsed = credentialInputSchema.safeParse(input);
  if (!parsed.success) return fail("حقول المفاتيح غير صالحة.");
  const value = parsed.data;
  try {
    // Blank fields preserve existing secrets. Deletion is a separate explicit operation.
    const old = await loadSecrets(value.provider, value.environment).catch(() => null);
    const secrets = {
      publishableKey: value.publishableKey || old?.secrets.publishableKey || "",
      secretKey: value.secretKey || old?.secrets.secretKey || "",
      merchantCode: value.merchantCode || old?.secrets.merchantCode || "",
      webhookSecret: value.webhookSecret || old?.secrets.webhookSecret || "",
    };
    validateProviderSecrets(value.provider, value.environment, secrets);
    const encrypted = encryptSecrets(secrets, value.provider, value.environment);
    const { error } = await getServiceSupabase().from("payment_credentials").upsert({
      provider: value.provider, environment: value.environment, encrypted_payload: encrypted,
      merchant_approved: value.merchantApproved, deposit_approved: value.depositApproved,
      verified_at: null, updated_at: new Date().toISOString(),
    }, { onConflict: "provider,environment" });
    if (error) return fail("تعذر حفظ المفاتيح. تحقق من تجهيز قاعدة الدفع.");
    invalidateCmsCache();
    revalidatePath("/admin/settings/payments");
    return ok(null);
  } catch (error) { return fail(error instanceof Error ? error.message : "تعذر حفظ مفاتيح الدفع."); }
}

export async function testCredentialsAction(provider: Provider, mode: Mode) {
  const gate = await ownerGate();
  if (!gate.ok) return gate;
  if (!providerSchema.safeParse(provider).success || !modeSchema.safeParse(mode).success) return fail("مزود أو بيئة غير صالحة.");
  try {
    const { secrets, row } = await loadSecrets(provider, mode);
    const success = await probeProvider(provider, mode, secrets);
    const { data, error } = await getServiceSupabase().from("payment_credentials")
      .update({ verified_at: success ? new Date().toISOString() : null })
      .eq("provider", provider).eq("environment", mode).eq("updated_at", row.updated_at).select("provider");
    if (error || data?.length !== 1) return fail("تغيرت المفاتيح أثناء الاختبار أو تعذر حفظ النتيجة. أعد المحاولة.");
    if (!success) return fail("لم ينجح اتصال المزود. تحقق من المفاتيح والبيئة وصلاحية الحساب.");
    invalidateCmsCache();
    revalidatePath("/admin/settings/payments");
    return ok(null);
  } catch { return fail("تعذر اختبار المفاتيح المحفوظة. تحقق من إعداد التشفير."); }
}

export async function deleteCredentialsAction(provider: Provider, mode: Mode) {
  const gate = await ownerGate();
  if (!gate.ok) return gate;
  if (!providerSchema.safeParse(provider).success || !modeSchema.safeParse(mode).success) return fail("مزود أو بيئة غير صالحة.");
  const svc = getServiceSupabase();
  // Disabling first means a failed deletion cannot leave collection switched on.
  const { error: disableError } = await svc.from("payment_settings").update({ enabled: false }).eq("provider", provider);
  if (disableError) return fail("تعذر تعطيل المزود؛ لم تُحذف المفاتيح.");
  const { error } = await svc.from("payment_credentials").delete().eq("provider", provider).eq("environment", mode);
  if (error) return fail("تعذر حذف المفاتيح.");
  invalidateCmsCache();
  revalidatePath("/admin/settings/payments");
  return ok(null);
}

export async function saveIdentityProviderCredentialsAction(input: unknown) {
  const gate = await ownerGate();
  if (!gate.ok) return gate;
  const parsed = identityCredentialInputSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "إعدادات الربط غير صالحة.");
  const value = parsed.data;
  if (!value.baseUrl || !value.clientId) {
    return fail("أدخل عنوان API ومعرّف التطبيق.");
  }

  const svc = getServiceSupabase();
  const { data: existing, error: readError } = await svc
    .from("identity_provider_credentials")
    .select("encrypted_payload")
    .eq("provider", value.provider)
    .eq("environment", value.environment)
    .maybeSingle();
  if (readError) return fail("تعذر قراءة إعداد الربط الحالي.");

  try {
    const old = existing
      ? decryptIdentitySecrets(existing.encrypted_payload, value.provider, value.environment)
      : { clientSecret: "", apiKey: "" };
    const clientSecret = value.clientSecret || old.clientSecret;
    const apiKey = value.apiKey || old.apiKey;
    if (!clientSecret && !apiKey) {
      return fail("أدخل أحد مفاتيح التفعيل الرسمية على الأقل.");
    }
    const encryptedPayload = encryptIdentitySecrets(
      {
        clientSecret,
        apiKey,
      },
      value.provider,
      value.environment,
    );
    const { error } = await svc.from("identity_provider_credentials").upsert(
      {
        provider: value.provider,
        environment: value.environment,
        base_url: value.baseUrl,
        client_id: value.clientId,
        redirect_uri: value.redirectUri,
        scope: value.scope,
        encrypted_payload: encryptedPayload,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "provider,environment" },
    );
    if (error) return fail("تعذر حفظ إعداد الربط. تحقق من تطبيق ترحيل قاعدة البيانات.");
  } catch (error) {
    return fail(error instanceof Error ? error.message : "تعذر حفظ بيانات الربط.");
  }

  invalidateCmsCache();
  revalidatePath("/admin/settings/payments");
  return ok(null);
}
