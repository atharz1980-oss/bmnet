import "server-only";
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import type { Mode, Provider, ProviderSecrets } from "./settings";

function encryptionKey(encoded = process.env.PAYMENTS_ENCRYPTION_KEY): Buffer {
  if (!encoded || !/^[A-Za-z0-9+/]{43}=$/.test(encoded)) throw new Error("يلزم إعداد مفتاح تشفير الدفع في الخادم أولًا.");
  const key = Buffer.from(encoded, "base64");
  if (key.length !== 32 || key.toString("base64") !== encoded) throw new Error("مفتاح تشفير الدفع غير صالح.");
  return key;
}

export function encryptionConfigured(): boolean {
  try { encryptionKey(); return true; } catch { return false; }
}

export function encryptSecrets(value: ProviderSecrets, provider: Provider, mode: Mode, key?: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(key), iv);
  cipher.setAAD(Buffer.from(`bmnet/payments/v1/${provider}/${mode}`));
  const ciphertext = Buffer.concat([cipher.update(JSON.stringify(value), "utf8"), cipher.final()]);
  return ["v1", iv.toString("base64"), cipher.getAuthTag().toString("base64"), ciphertext.toString("base64")].join(".");
}

export function decryptSecrets(payload: string, provider: Provider, mode: Mode, key?: string): ProviderSecrets {
  try {
    const parts = payload.split(".");
    if (parts.length !== 4 || parts[0] !== "v1") throw new Error();
    const iv = Buffer.from(parts[1], "base64");
    const tag = Buffer.from(parts[2], "base64");
    if (iv.length !== 12 || tag.length !== 16) throw new Error();
    const decipher = createDecipheriv("aes-256-gcm", encryptionKey(key), iv);
    decipher.setAAD(Buffer.from(`bmnet/payments/v1/${provider}/${mode}`));
    decipher.setAuthTag(tag);
    const value: unknown = JSON.parse(Buffer.concat([decipher.update(Buffer.from(parts[3], "base64")), decipher.final()]).toString("utf8"));
    if (!value || typeof value !== "object" || !["publishableKey", "secretKey", "merchantCode", "webhookSecret"].every(k => typeof (value as Record<string, unknown>)[k] === "string")) throw new Error();
    return value as ProviderSecrets;
  } catch { throw new Error("تعذر فتح مفاتيح الدفع المحفوظة. تحقق من مفتاح التشفير في الخادم."); }
}
