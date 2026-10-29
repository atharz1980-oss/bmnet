import "server-only";

import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { z } from "zod";

import { getServiceSupabase } from "@/lib/supabase/service";

export const identityProviderSchema = z.enum(["nafath", "nafith"]);
export const identityEnvironmentSchema = z.enum(["sandbox", "production"]);

export type IdentityProvider = z.infer<typeof identityProviderSchema>;
export type IdentityEnvironment = z.infer<typeof identityEnvironmentSchema>;

const optionalHttpsUrl = z.string().trim().max(500).refine(
  (value) => value === "" || (URL.canParse(value) && new URL(value).protocol === "https:"),
  "يجب أن يكون الرابط فارغًا أو يبدأ بـ HTTPS.",
);

export const identityCredentialInputSchema = z.object({
  provider: identityProviderSchema,
  environment: identityEnvironmentSchema,
  baseUrl: optionalHttpsUrl,
  clientId: z.string().trim().max(500),
  clientSecret: z.string().trim().max(4096),
  apiKey: z.string().trim().max(4096),
  redirectUri: optionalHttpsUrl,
  scope: z.string().trim().max(500),
});

export type IdentityCredentialInput = z.infer<typeof identityCredentialInputSchema>;

export interface IdentityCredentialMetadata {
  provider: IdentityProvider;
  environment: IdentityEnvironment;
  baseUrl: string;
  clientId: string;
  redirectUri: string;
  scope: string;
  configured: boolean;
  updatedAt: string;
}

interface IdentitySecretPayload {
  clientSecret: string;
  apiKey: string;
}

function encryptionKey(encoded = process.env.PAYMENTS_ENCRYPTION_KEY): Buffer {
  if (!encoded || !/^[A-Za-z0-9+/]{43}=$/.test(encoded)) {
    throw new Error("يلزم إعداد PAYMENTS_ENCRYPTION_KEY لحفظ بيانات الربط.");
  }
  const key = Buffer.from(encoded, "base64");
  if (key.length !== 32 || key.toString("base64") !== encoded) {
    throw new Error("مفتاح تشفير بيانات الربط غير صالح.");
  }
  return key;
}

function associatedData(provider: IdentityProvider, environment: IdentityEnvironment): Buffer {
  return Buffer.from(`bmnet/identity/v1/${provider}/${environment}`);
}

export function encryptIdentitySecrets(
  value: IdentitySecretPayload,
  provider: IdentityProvider,
  environment: IdentityEnvironment,
): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  cipher.setAAD(associatedData(provider, environment));
  const ciphertext = Buffer.concat([cipher.update(JSON.stringify(value), "utf8"), cipher.final()]);
  return ["v1", iv.toString("base64"), cipher.getAuthTag().toString("base64"), ciphertext.toString("base64")].join(".");
}

export function decryptIdentitySecrets(
  payload: string,
  provider: IdentityProvider,
  environment: IdentityEnvironment,
): IdentitySecretPayload {
  try {
    const parts = payload.split(".");
    if (parts.length !== 4 || parts[0] !== "v1") throw new Error();
    const iv = Buffer.from(parts[1], "base64");
    const tag = Buffer.from(parts[2], "base64");
    if (iv.length !== 12 || tag.length !== 16) throw new Error();
    const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), iv);
    decipher.setAAD(associatedData(provider, environment));
    decipher.setAuthTag(tag);
    const value: unknown = JSON.parse(
      Buffer.concat([decipher.update(Buffer.from(parts[3], "base64")), decipher.final()]).toString("utf8"),
    );
    if (
      !value ||
      typeof value !== "object" ||
      typeof (value as Record<string, unknown>).clientSecret !== "string" ||
      typeof (value as Record<string, unknown>).apiKey !== "string"
    ) {
      throw new Error();
    }
    return value as IdentitySecretPayload;
  } catch {
    throw new Error("تعذر فتح بيانات الربط المحفوظة. تحقق من مفتاح التشفير في الخادم.");
  }
}

export async function loadIdentityCredentialMetadata(): Promise<{
  configurations: IdentityCredentialMetadata[];
  databaseReady: boolean;
}> {
  const { data, error } = await getServiceSupabase()
    .from("identity_provider_credentials")
    .select("provider, environment, base_url, client_id, redirect_uri, scope, updated_at");
  if (error) return { configurations: [], databaseReady: false };
  return {
    configurations: (data ?? []).map((row) => ({
      provider: row.provider as IdentityProvider,
      environment: row.environment as IdentityEnvironment,
      baseUrl: row.base_url,
      clientId: row.client_id,
      redirectUri: row.redirect_uri,
      scope: row.scope,
      configured: true,
      updatedAt: row.updated_at,
    })),
    databaseReady: true,
  };
}
