/**
 * /admin/equipment/new — إضافة معدة جديدة.
 * تحرسها `equipment:create`؛ المحرر نفسه يحفظ البيانات والمواصفات والصور.
 */

import { EquipmentEditor } from "@/components/admin/equipment/equipment-editor";
import { requirePermission } from "@/lib/admin/session";
import { getServiceSupabase } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";

export default async function NewEquipmentPage() {
  const gate = await requirePermission("equipment", "create");
  if (!gate.ok) {
    return (
      <p className="p-8" role="alert">
        {gate.error}
      </p>
    );
  }

  const { data } = await getServiceSupabase()
    .from("equipment_categories")
    .select("id, name")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });

  return <EquipmentEditor item={null} categories={(data ?? []) as { id: string; name: string }[]} initialImages={[]} />;
}
