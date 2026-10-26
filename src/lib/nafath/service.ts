import "server-only";

import { getServiceSupabase } from "@/lib/supabase/service";
import { getNafathClient } from "./client";
import { getNafathConfig, nafathConfigured } from "./config";
import type { NafathSession, NafathStartResponse, NafathVerifyResponse } from "./types";

export interface CreateNafathSessionOptions {
  rentalId?: string | null;
}

export async function createNafathSession(
  options: CreateNafathSessionOptions = {},
): Promise<NafathStartResponse & { sessionId?: string }> {
  const config = getNafathConfig();
  if (!nafathConfigured()) {
    return { success: false, error: "Nafath is not configured" };
  }

  const client = getNafathClient();
  const state = crypto.randomUUID();
  const startResult = await client.start({
    rentalId: options.rentalId,
    state,
  });

  if (!startResult.success || !startResult.requestId) {
    return startResult;
  }

  const svc = getServiceSupabase();
  const expiresAt = new Date(Date.now() + config.sessionTtlMinutes * 60_000).toISOString();
  
  const { data, error } = await svc
    .from("nafath_sessions")
    .insert({
      rental_id: options.rentalId ?? null,
      request_id: startResult.requestId,
      status: "pending",
      state,
      expires_at: expiresAt,
    })
    .select("id")
    .maybeSingle();

  if (error || !data) {
    return { success: false, error: "Failed to create Nafath session" };
  }

  return {
    ...startResult,
    sessionId: data.id,
  };
}

function mapNafathSession(data: any): NafathSession {
  return {
    id: data.id,
    rentalId: data.rental_id,
    status: data.status,
    requestId: data.request_id,
    nationalId: data.national_id,
    fullName: data.full_name,
    verifiedAt: data.verified_at,
    expiresAt: data.expires_at,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

export async function getNafathSession(sessionId: string): Promise<NafathSession | null> {
  const svc = getServiceSupabase();
  const { data } = await svc
    .from("nafath_sessions")
    .select("*")
    .eq("id", sessionId)
    .maybeSingle();

  if (!data) return null;
  return mapNafathSession(data);
}

export async function verifyNafathSession(sessionId: string): Promise<NafathVerifyResponse> {
  if (!nafathConfigured()) {
    return { success: false, status: "failed", error: "Nafath is not configured" };
  }

  const svc = getServiceSupabase();
  const session = await getNafathSession(sessionId);
  if (!session) {
    return { success: false, status: "failed", error: "Session not found" };
  }

  if (session.status !== "pending") {
    if (session.status === "completed") {
      return {
        success: true,
        status: "completed",
        nationalId: session.nationalId ?? undefined,
        fullName: session.fullName ?? undefined,
        verifiedAt: session.verifiedAt ?? undefined,
        requestId: session.requestId ?? undefined,
      };
    }
    return { success: false, status: session.status, error: `Session ${session.status}` };
  }

  if (new Date(session.expiresAt).getTime() < Date.now()) {
    await svc
      .from("nafath_sessions")
      .update({ status: "expired", updated_at: new Date().toISOString() })
      .eq("id", sessionId);
    return { success: false, status: "expired", error: "Session expired" };
  }

  if (!session.requestId) {
    return { success: false, status: "failed", error: "Missing request ID" };
  }

  const client = getNafathClient();
  const result = await client.verify(session.requestId);

  if (result.success && result.status === "completed") {
    const { error } = await svc
      .from("nafath_sessions")
      .update({
        status: "completed",
        national_id: result.nationalId ?? null,
        full_name: result.fullName ?? null,
        verified_at: result.verifiedAt ?? new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", sessionId)
      .eq("status", "pending");

    if (error) {
      return { success: false, status: "failed", error: "Failed to update session" };
    }

    // Optionally link to rental if session is associated with one
    if (session.rentalId && result.nationalId) {
      await svc
        .from("equipment_rentals")
        .update({
          identity_status: "verified",
          identity_check_method: "nafath",
          identity_reference: result.requestId ?? session.requestId,
          identity_verified_at: result.verifiedAt ?? new Date().toISOString(),
        })
        .eq("id", session.rentalId);
    }

    return result;
  } else if (result.status === "failed" || result.status === "cancelled") {
    await svc
      .from("nafath_sessions")
      .update({ status: result.status, updated_at: new Date().toISOString() })
      .eq("id", sessionId)
      .eq("status", "pending");
  }

  return result;
}
