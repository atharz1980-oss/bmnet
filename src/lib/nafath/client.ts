import "server-only";

import type { NafathStartResponse, NafathVerifyResponse } from "./types";

export interface NafathStartOptions {
  rentalId?: string | null;
  callbackPath?: string;
  state?: string;
}

export interface NafathClient {
  start(options?: NafathStartOptions): Promise<NafathStartResponse>;
  verify(requestId: string): Promise<NafathVerifyResponse>;
}

class UnavailableNafathClient implements NafathClient {
  async start(): Promise<NafathStartResponse> {
    return { success: false, error: "لم يُفعّل ربط نفاذ بعد؛ يلزم اعتماد مواصفات API الرسمية." };
  }

  async verify(): Promise<NafathVerifyResponse> {
    return {
      success: false,
      status: "failed",
      error: "لم يُفعّل ربط نفاذ بعد؛ يلزم اعتماد مواصفات API الرسمية.",
    };
  }
}

export function getNafathClient(): NafathClient {
  return new UnavailableNafathClient();
}
