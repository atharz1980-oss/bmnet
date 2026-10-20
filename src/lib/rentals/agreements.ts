import "server-only";

import { getServiceSupabase } from "@/lib/supabase/service";

export interface EquipmentAgreement {
  id: string;
  version: number;
  title: string;
  body: string;
  active: boolean;
  createdAt: string;
}

function toAgreement(row: {
  id: string;
  version: number;
  title: string;
  body: string;
  active: boolean;
  created_at: string;
}): EquipmentAgreement {
  return {
    id: row.id,
    version: row.version,
    title: row.title,
    body: row.body,
    active: row.active,
    createdAt: row.created_at,
  };
}

/**
 * الإصدار المفعّل الأعلى رقمًا — هو ما يُعرض ويُوقّع. إن لم يوجد إصدار
 * مفعّل فلا حجز: عقد بلا نص ليس عقدًا.
 */
export async function loadActiveEquipmentAgreement(): Promise<EquipmentAgreement | null> {
  const { data } = await getServiceSupabase()
    .from("equipment_agreements")
    .select("id, version, title, body, active, created_at")
    .eq("active", true)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data ? toAgreement(data) : null;
}

export async function loadEquipmentAgreementVersions(): Promise<EquipmentAgreement[]> {
  const { data } = await getServiceSupabase()
    .from("equipment_agreements")
    .select("id, version, title, body, active, created_at")
    .order("version", { ascending: false });
  return (data ?? []).map(toAgreement);
}

export async function loadEquipmentAgreementById(id: string): Promise<EquipmentAgreement | null> {
  const { data } = await getServiceSupabase()
    .from("equipment_agreements")
    .select("id, version, title, body, active, created_at")
    .eq("id", id)
    .maybeSingle();
  return data ? toAgreement(data) : null;
}
