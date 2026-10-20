/**
 * /admin/equipment/[id] — تعديل معدة: البيانات والمواصفات والمعرض.
 * تحرسها `equipment:edit`؛ القراءة بعميل الخدمة.
 */

import { notFound } from "next/navigation";

import { EquipmentEditor, type EquipmentEditorInitial } from "@/components/admin/equipment/equipment-editor";
import { requirePermission } from "@/lib/admin/session";
import { resolveMediaUrl } from "@/lib/cms/mappers";
import { getServiceSupabase } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";

interface EquipmentDetailRow {
  id: string;
  category_id: string;
  slug: string;
  name: string;
  short_description: string;
  description: string;
  sku: string;
  serial_number: string;
  quantity: number;
  price_per_day_halalas: number;
  replacement_value_halalas: number;
  specs: { label: string; value: string }[] | null;
  status: EquipmentEditorInitial["status"];
  requires_security_note: boolean;
  featured: boolean;
  published: boolean;
}

export default async function EditEquipmentPage({ params }: { params: Promise<{ id: string }> }) {
  const gate = await requirePermission("equipment", "edit");
  if (!gate.ok) {
    return (
      <p className="p-8" role="alert">
        {gate.error}
      </p>
    );
  }

  const { id } = await params;
  const svc = getServiceSupabase();
  const [item, images, categories] = await Promise.all([
    svc
      .from("equipment_items")
      .select(
        "id, category_id, slug, name, short_description, description, sku, serial_number, quantity, price_per_day_halalas, replacement_value_halalas, specs, status, requires_security_note, featured, published",
      )
      .eq("id", id)
      .maybeSingle(),
    svc
      .from("equipment_images")
      .select("storage_path, alt_text, sort_order")
      .eq("item_id", id)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true }),
    svc
      .from("equipment_categories")
      .select("id, name")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false }),
  ]);

  if (item.error || !item.data) notFound();
  const row = item.data as unknown as EquipmentDetailRow;

  const initial: EquipmentEditorInitial = {
    id: row.id,
    categoryId: row.category_id,
    slug: row.slug,
    name: row.name,
    shortDescription: row.short_description,
    description: row.description,
    sku: row.sku,
    serialNumber: row.serial_number,
    quantity: row.quantity,
    pricePerDaySar: row.price_per_day_halalas / 100,
    replacementValueSar: row.replacement_value_halalas / 100,
    specs: Array.isArray(row.specs) ? row.specs : [],
    status: row.status,
    requiresSecurityNote: row.requires_security_note,
    featured: row.featured,
    published: row.published,
  };

  const initialImages = ((images.data ?? []) as { storage_path: string; alt_text: string }[]).map((image) => ({
    key: image.storage_path,
    url: resolveMediaUrl(image.storage_path),
    alt: image.alt_text,
  }));

  return (
    <EquipmentEditor
      item={initial}
      categories={(categories.data ?? []) as { id: string; name: string }[]}
      initialImages={initialImages}
    />
  );
}
