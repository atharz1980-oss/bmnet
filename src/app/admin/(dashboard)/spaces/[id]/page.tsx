/**
 * /admin/spaces/[id] — تعديل مساحة استوديو: البيانات والصور والمواعيد.
 * تحرسها `spaces:edit`؛ القراءة بعميل الخدمة (RLS تخفي المساحات غير
 * المنشورة عن المتصفح أصلًا).
 */

import { notFound } from "next/navigation";

import { SpaceEditor, type SpaceEditorInitial } from "@/components/admin/spaces/space-editor";
import { resolveMediaUrl } from "@/lib/cms/mappers";
import { requirePermission } from "@/lib/admin/session";
import { normalizeDbTime } from "@/lib/spaces/schedule";
import { getServiceSupabase } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";

interface SpaceDetailRow {
  id: string;
  slug: string;
  name: string;
  short_description: string;
  description: string;
  price_per_hour_halalas: number;
  publish_status: string;
  featured: boolean;
  sort_order: number;
}

export default async function EditSpacePage({ params }: { params: Promise<{ id: string }> }) {
  const gate = await requirePermission("spaces", "edit");
  if (!gate.ok) {
    return (
      <p className="p-8" role="alert">
        {gate.error}
      </p>
    );
  }

  const { id } = await params;
  const svc = getServiceSupabase();
  const [space, images, hours] = await Promise.all([
    svc
      .from("studio_spaces")
      .select(
        "id, slug, name, short_description, description, price_per_hour_halalas, publish_status, featured, sort_order",
      )
      .eq("id", id)
      .maybeSingle(),
    svc
      .from("studio_space_images")
      .select("storage_path, alt_text, sort_order")
      .eq("space_id", id)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true }),
    svc
      .from("studio_space_hours")
      .select("day_of_week, start_time, end_time")
      .eq("space_id", id)
      .order("day_of_week", { ascending: true })
      .order("start_time", { ascending: true }),
  ]);

  if (space.error || !space.data) notFound();
  const row = space.data as unknown as SpaceDetailRow;

  const initial: SpaceEditorInitial = {
    id: row.id,
    slug: row.slug,
    name: row.name,
    shortDescription: row.short_description,
    description: row.description,
    priceSar: row.price_per_hour_halalas / 100,
    featured: row.featured,
    published: row.publish_status === "published",
  };

  const initialImages = ((images.data ?? []) as { storage_path: string; alt_text: string }[]).map((image) => ({
    key: image.storage_path,
    url: resolveMediaUrl(image.storage_path),
    alt: image.alt_text,
  }));

  const initialHours = (
    (hours.data ?? []) as { day_of_week: number; start_time: string; end_time: string }[]
  ).map((hour) => ({
    key: `${hour.day_of_week}-${hour.start_time}-${hour.end_time}`,
    day: hour.day_of_week,
    start: normalizeDbTime(hour.start_time),
    end: normalizeDbTime(hour.end_time),
  }));

  return <SpaceEditor space={initial} initialImages={initialImages} initialHours={initialHours} />;
}
