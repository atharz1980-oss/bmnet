import "server-only";

/**
 * تحميل المعدات المنشورة للواجهة العامة (عميل anon + RLS).
 * ------------------------------------------------------
 * لا أسرار هنا: السيريال وSKU لا يُعرضان للعميل، وقيمة الاستبدال تُعرض
 * كمعلومة عقدية فقط. المعدات المسحوبة/تحت الصيانة لا تصل أصلًا لأن RLS
 * تمنع غير المنشور، والاستعلام يستبعد غير القابل للتأجير.
 */

import { cache } from "react";

import { getMediaPublicUrl } from "@/lib/supabase/media-storage";
import { getPublicAnonClient } from "@/lib/supabase/service";

export interface PublicEquipmentImage {
  path: string;
  url: string;
  alt: string;
}

export interface PublicEquipmentSpec {
  label: string;
  value: string;
}

export interface PublicEquipmentCategory {
  id: string;
  slug: string;
  name: string;
  description: string;
  iconKey: string;
}

export interface PublicEquipment {
  id: string;
  slug: string;
  categoryId: string;
  categorySlug: string;
  categoryName: string;
  name: string;
  shortDescription: string;
  description: string;
  pricePerDaySar: number;
  replacementValueSar: number;
  quantity: number;
  specs: PublicEquipmentSpec[];
  featured: boolean;
  requiresSecurityNote: boolean;
  images: PublicEquipmentImage[];
}

interface CategoryRow {
  id: string;
  slug: string;
  name: string;
  description: string;
  icon_key: string;
  sort_order: number;
}

interface ItemRow {
  id: string;
  category_id: string;
  slug: string;
  name: string;
  short_description: string;
  description: string;
  price_per_day_halalas: number;
  replacement_value_halalas: number;
  quantity: number;
  specs: unknown;
  featured: boolean;
  requires_security_note: boolean;
}

function normaliseSpecs(value: unknown): PublicEquipmentSpec[] {
  if (!Array.isArray(value)) return [];
  const specs: PublicEquipmentSpec[] = [];
  for (const entry of value) {
    if (!entry || typeof entry !== "object") continue;
    const label = String((entry as { label?: unknown }).label ?? "").trim();
    const val = String((entry as { value?: unknown }).value ?? "").trim();
    if (label && val) specs.push({ label: label.slice(0, 80), value: val.slice(0, 200) });
  }
  return specs.slice(0, 40);
}

/** كل التصنيفات المنشورة — للفلترة في القائمة العامة. */
export const loadPublicEquipmentCategories = cache(async (): Promise<PublicEquipmentCategory[]> => {
  const client = getPublicAnonClient();
  const { data } = await client
    .from("equipment_categories")
    .select("id, slug, name, description, icon_key, sort_order")
    .eq("published", true)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });
  return ((data ?? []) as CategoryRow[]).map((row) => ({
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    iconKey: row.icon_key,
  }));
});

/** كل المعدات المنشورة مع صورها — للقائمة والبحث. */
export const loadPublicEquipment = cache(async (): Promise<PublicEquipment[]> => {
  const client = getPublicAnonClient();
  const [{ data: categories }, { data: items }] = await Promise.all([
    client
      .from("equipment_categories")
      .select("id, slug, name, description, icon_key, sort_order")
      .eq("published", true),
    client
      .from("equipment_items")
      .select(
        "id, category_id, slug, name, short_description, description, price_per_day_halalas, replacement_value_halalas, quantity, specs, featured, requires_security_note",
      )
      .eq("published", true)
      .in("status", ["available", "rented"])
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false }),
  ]);

  const categoryRows = (categories ?? []) as CategoryRow[];
  const itemRows = (items ?? []) as ItemRow[];
  if (itemRows.length === 0) return [];

  const categoryById = new Map(categoryRows.map((row) => [row.id, row] as const));
  const ids = itemRows.map((row) => row.id);
  const { data: imageRows } = await client
    .from("equipment_images")
    .select("item_id, storage_path, alt_text, sort_order")
    .in("item_id", ids)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  const images = new Map<string, PublicEquipmentImage[]>();
  for (const row of (imageRows ?? []) as { item_id: string; storage_path: string; alt_text: string }[]) {
    const list = images.get(row.item_id) ?? [];
    list.push({
      path: row.storage_path,
      url: getMediaPublicUrl(client, row.storage_path),
      alt: row.alt_text,
    });
    images.set(row.item_id, list);
  }

  const result: PublicEquipment[] = [];
  for (const row of itemRows) {
    const category = categoryById.get(row.category_id);
    /* RLS تخفي التصنيف غير المنشور، لكن نكرّر الشرط صراحةً: معدة في تصنيف
       مسودة لا تظهر حتى لو تغيّر شكل الاستعلام لاحقًا. */
    if (!category) continue;
    result.push({
      id: row.id,
      slug: row.slug,
      categoryId: row.category_id,
      categorySlug: category.slug,
      categoryName: category.name,
      name: row.name,
      shortDescription: row.short_description,
      description: row.description,
      pricePerDaySar: row.price_per_day_halalas / 100,
      replacementValueSar: row.replacement_value_halalas / 100,
      quantity: row.quantity,
      specs: normaliseSpecs(row.specs),
      featured: row.featured,
      requiresSecurityNote: row.requires_security_note,
      images: images.get(row.id) ?? [],
    });
  }
  return result;
});

/** معدة واحدة برابطها — أو null. */
export const loadPublicEquipmentItem = cache(async (slug: string): Promise<PublicEquipment | null> => {
  const all = await loadPublicEquipment();
  return all.find((item) => item.slug === slug) ?? null;
});
