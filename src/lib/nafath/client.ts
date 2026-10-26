import "server-only";

import { getNafathConfig } from "./config";
import type { NafathStartResponse, NafathStatus, NafathVerifyResponse } from "./types";

export interface NafathStartOptions {
  rentalId?: string | null;
  callbackPath?: string;
  state?: string;
}

export interface NafathClient {
  start(options?: NafathStartOptions): Promise<NafathStartResponse>;
  verify(requestId: string): Promise<NafathVerifyResponse>;
}

class DisabledNafathClient implements NafathClient {
  async start(): Promise<NafathStartResponse> {
    return { success: false, error: "Nafath is not configured" };
  }

  async verify(): Promise<NafathVerifyResponse> {
    return { success: false, status: "failed", error: "Nafath is not configured" };
  }
}

class HttpNafathClient implements NafathClient {
  private config = getNafathConfig();

  async start(options?: NafathStartOptions): Promise<NafathStartResponse> {
    if (!this.config.enabled || !this.config.baseUrl) {
      return { success: false, error: "Nafath is not configured" };
    }

    // Placeholder implementation - to be replaced with actual Nafath API integration
    // when API credentials and endpoints are provided by the authority
    try {
      const response = await fetch(`${this.config.baseUrl}/auth/start`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.config.clientSecret}`,
        },
        body: JSON.stringify({
          client_id: this.config.clientId,
          redirect_uri: this.config.redirectUri,
          scope: this.config.scope,
          state: options?.state,
          rental_id: options?.rentalId,
          callback_path: options?.callbackPath,
        }),
        cache: "no-store",
      });

      if (!response.ok) {
        return { success: false, error: `Nafath request failed: ${response.status}` };
      }

      const data = await response.json();
      return {
        success: true,
        authUrl: data.auth_url || data.authUrl,
        requestId: data.request_id || data.requestId,
      };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
    }
  }

  async verify(requestId: string): Promise<NafathVerifyResponse> {
    if (!this.config.enabled || !this.config.baseUrl) {
      return { success: false, status: "failed", error: "Nafath is not configured" };
    }

    try {
      const response = await fetch(`${this.config.baseUrl}/auth/verify/${requestId}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${this.config.clientSecret}`,
        },
        cache: "no-store",
      });

      if (!response.ok) {
        return { success: false, status: "failed", error: `Nafath verify failed: ${response.status}` };
      }

      const data = await response.json();
      const status = (data.status as NafathStatus) || "failed";
      
      return {
        success: status === "completed",
        status,
        nationalId: data.national_id || data.nationalId,
        fullName: data.full_name || data.fullName,
        verifiedAt: data.verified_at || data.verifiedAt,
        requestId: data.request_id || requestId,
      };
    } catch (error) {
      return { success: false, status: "failed", error: error instanceof Error ? error.message : "Unknown error" };
    }
  }
}

export function getNafathClient(): NafathClient {
  const config = getNafathConfig();
  if (!config.enabled) {
    return new DisabledNafathClient();
  }
  return new HttpNafathClient();
}
