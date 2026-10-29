import { afterEach, describe, expect, mock, test } from "bun:test";

mock.module("server-only", () => ({}));

import {
  decryptIdentitySecrets,
  encryptIdentitySecrets,
  identityCredentialInputSchema,
} from "../src/lib/identity/configuration";

const previousEncryptionKey = process.env.PAYMENTS_ENCRYPTION_KEY;

afterEach(() => {
  if (previousEncryptionKey === undefined) delete process.env.PAYMENTS_ENCRYPTION_KEY;
  else process.env.PAYMENTS_ENCRYPTION_KEY = previousEncryptionKey;
});

describe("identity provider credentials", () => {
  test("encrypts secrets and only decrypts them for the matching provider and environment", () => {
    process.env.PAYMENTS_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString("base64");
    const secrets = { clientSecret: "client-secret-value", apiKey: "activation-code-value" };
    const encrypted = encryptIdentitySecrets(secrets, "nafath", "sandbox");

    expect(encrypted).not.toContain(secrets.clientSecret);
    expect(encrypted).not.toContain(secrets.apiKey);
    expect(decryptIdentitySecrets(encrypted, "nafath", "sandbox")).toEqual(secrets);
    expect(() => decryptIdentitySecrets(encrypted, "nafith", "sandbox")).toThrow();
    expect(() => decryptIdentitySecrets(encrypted, "nafath", "production")).toThrow();
  });

  test("accepts only HTTPS provider and callback URLs", () => {
    const input = {
      provider: "nafath",
      environment: "sandbox",
      baseUrl: "https://api.example.sa",
      clientId: "client-id",
      clientSecret: "secret",
      apiKey: "",
      redirectUri: "https://baytalmosawer.net/api/nafath/callback",
      scope: "openid",
    };
    expect(identityCredentialInputSchema.safeParse(input).success).toBe(true);
    expect(identityCredentialInputSchema.safeParse({ ...input, baseUrl: "http://api.example.sa" }).success).toBe(
      false,
    );
  });
});
