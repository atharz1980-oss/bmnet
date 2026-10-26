import "server-only";

export type NafathMode = "disabled" | "sandbox" | "production";

export interface NafathConfig {
  enabled: boolean;
  mode: NafathMode;
  baseUrl: string | null;
  clientId: string | null;
  clientSecret: string | null;
  redirectUri: string | null;
  scope: string;
  sessionTtlMinutes: number;
}

function readMode(value: string | undefined): NafathMode {
  const v = (value ?? "").toLowerCase().trim();
  if (v === "sandbox" || v === "test") return "sandbox";
  if (v === "production" || v === "prod") return "production";
  return "disabled";
}

export function getNafathConfig(env: NodeJS.ProcessEnv = process.env): NafathConfig {
  const mode = readMode(env.NAFATH_MODE);
  const enabled = mode !== "disabled" && Boolean(env.NAFATH_CLIENT_ID && env.NAFATH_CLIENT_SECRET);
  const baseUrl = env.NAFATH_BASE_URL?.trim() || null;

  return {
    enabled,
    mode,
    baseUrl,
    clientId: env.NAFATH_CLIENT_ID?.trim() || null,
    clientSecret: env.NAFATH_CLIENT_SECRET?.trim() || null,
    redirectUri: env.NAFATH_REDIRECT_URI?.trim() || null,
    scope: env.NAFATH_SCOPE?.trim() || "openid profile",
    sessionTtlMinutes: Number(env.NAFATH_SESSION_TTL_MINUTES ?? "10"),
  };
}

export function nafathConfigured(): boolean {
  return getNafathConfig().enabled;
}
