import "server-only";

/**
 * بيت المصور — تحميل المساحات للواجهة العامة (وضع متسامح)
 * ----------------------------------------------------------
 * عميل anon بلا كوكيز (D-86): جلسة إدارة لا يمكن أن تتسرب للقراءات
 * العامة، وRLS يخفي المساحات غير المنشورة فعليًا على مستوى القاعدة.
 */

import { cache } from "react";

import { getMediaPublicUrl } from "@/lib/supabase/media-storage";
import { getPublicAnonClient } from "@/lib/supabase/service";

import { normalizeDbTime } from "./schedule";

export interface PublicSpaceImage {
  path: string;
  url: string;
  alt: string;
}

export interface PublicSpaceHours {
  /** 0=الأحد … 6=السبت */
  day: number;
  start: string;
  end: string;
}

export interface PublicSpace {
  id: string;
  slug: string;
  name: string;
  shortDescription: string;
  description: string;
  /** بالريال لكل ساعة. */
  pricePerHourSar: number;
  featured: boolean;
  images: PublicSpaceImage[];
  hours: PublicSpaceHours[];
}

interface SpaceRow {
  id: string;
  slug: string;
  name: string;
  short_description: string;
  description: string;
  price_per_hour_halalas: number;
  featured: boolean;
}

function toPublicSpace(
  row: SpaceRow,
  images: Map<string, PublicSpaceImage[]>,
  hours: Map<string, PublicSpaceHours[]>,
): PublicSpace {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    shortDescription: row.short_description,
    description: row.description,
    pricePerHourSar: row.price_per_hour_halalas / 100,
    featured: row.featured,
    images: images.get(row.id) ?? [],
    hours: hours.get(row.id) ?? [],
  };
}

/** كل المساحات المنشورة مع صورها ومواعيدها — للقائمة العامة. */
export const loadPublicSpaces = cache(async (): Promise<PublicSpace[]> => {
  const client = getPublicAnonClient();
  const { data: spaces } = await client
    .from("studio_spaces")
    .select("id, slug, name, short_description, description, price_per_hour_halalas, featured")
    .eq("publish_status", "published")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });
  const rows = (spaces ?? []) as SpaceRow[];
  if (rows.length === 0) return [];

  const ids = rows.map((row) => row.id);
  const [{ data: imageRows }, { data: hourRows }] = await Promise.all([
    client
      .from("studio_space_images")
      .select("space_id, storage_path, alt_text, sort_order")
      .in("space_id", ids)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true }),
    client
      .from("studio_space_hours")
      .select("space_id, day_of_week, start_time, end_time")
      .in("space_id", ids)
      .order("day_of_week", { ascending: true })
      .order("start_time", { ascending: true }),
  ]);

  const images = new Map<string, PublicSpaceImage[]>();
  for (const row of (imageRows ?? []) as { space_id: string; storage_path: string; alt_text: string }[]) {
    const list = images.get(row.space_id) ?? [];
    list.push({ path: row.storage_path, url: getMediaPublicUrl(client, row.storage_path), alt: row.alt_text });
    images.set(row.space_id, list);
  }

  const hours = new Map<string, PublicSpaceHours[]>();
  for (const row of (hourRows ?? []) as {
    space_id: string;
    day_of_week: number;
    start_time: string;
    end_time: string;
  }[]) {
    const list = hours.get(row.space_id) ?? [];
    list.push({ day: row.day_of_week, start: normalizeDbTime(row.start_time), end: normalizeDbTime(row.end_time) });
    hours.set(row.space_id, list);
  }

  return rows.map((row) => toPublicSpace(row, images, hours));
});

/** مساحة واحدة برابطها — أو null. */
export const loadPublicSpace = cache(async (slug: string): Promise<PublicSpace | null> => {
  const client = getPublicAnonClient();
  const { data: space } = await client
    .from("studio_spaces")
    .select("id, slug, name, short_description, description, price_per_hour_halalas, featured")
    .eq("slug", slug)
    .eq("publish_status", "published")
    .maybeSingle();
  if (!space) return null;
  const all = await loadPublicSpaces();
  return all.find((item) => item.id === (space as SpaceRow).id) ?? null;
});
