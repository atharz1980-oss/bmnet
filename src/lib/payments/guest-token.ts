import crypto from "node:crypto";

/**
 * Returns a secure signing secret for guest tokens.
 * Falls back to GUEST_ORDER_SECRET, SUPABASE_SERVICE_ROLE_KEY, or local salt.
 */
function getSigningSecret(): string {
  const secret =
    process.env.GUEST_ORDER_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXTAUTH_SECRET ||
    "bmnet-guest-order-secret-salt-2026";
  return secret;
}

/**
 * Creates an HMAC-SHA256 signature for a guest order access token.
 * Includes timestamp for optional expiration checking (default: 30 days).
 */
export function createGuestAccessToken(
  orderId: string,
  email: string,
  timestamp: number = Math.floor(Date.now() / 1000)
): string {
  const secret = getSigningSecret();
  const normalizedEmail = email.trim().toLowerCase();
  const payload = `${orderId}:${normalizedEmail}:${timestamp}`;
  const hmac = crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest("hex");
  return `${timestamp}.${hmac}`;
}

/**
 * Verifies a guest order access token.
 * Returns true if valid and not expired (default TTL: 30 days).
 */
export function verifyGuestAccessToken(
  orderId: string,
  email: string,
  token: string | null | undefined,
  maxAgeSeconds: number = 30 * 24 * 60 * 60
): boolean {
  if (!token || typeof token !== "string") {
    return false;
  }

  const parts = token.split(".");
  if (parts.length !== 2) {
    return false;
  }

  const [timestampStr, providedHmac] = parts;
  const timestamp = Number.parseInt(timestampStr, 10);
  if (Number.isNaN(timestamp) || timestamp <= 0) {
    return false;
  }

  const currentSeconds = Math.floor(Date.now() / 1000);
  if (currentSeconds - timestamp > maxAgeSeconds) {
    return false;
  }

  const secret = getSigningSecret();
  const normalizedEmail = email.trim().toLowerCase();
  const payload = `${orderId}:${normalizedEmail}:${timestamp}`;
  const expectedHmac = crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest("hex");

  try {
    return crypto.timingSafeEqual(
      Buffer.from(providedHmac, "hex"),
      Buffer.from(expectedHmac, "hex")
    );
  } catch {
    return false;
  }
}
