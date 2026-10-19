/**
 * /admin/spaces — قائمة مساحات الاستوديو.
 *
 * قراءة مباشرة من القاعدة (لا مخزن AdminData): المساحات كلها من الباك اند،
 * تحرسها صلاحية `spaces:view` القائمة. الإجراءات: تعديل / معاينة عامة /
 * حذف بتأكيد (المساحة ذات الحجوزات محجوبة من الحذف في الخادم).
 */

import Link from "next/link";
import Image from "next/image";
import { ExternalLink, Frame, Pencil, Plus } from "lucide-react";

import { DeleteSpaceButton } from "@/components/admin/spaces/delete-space-button";
import { AdminPageHeader } from "@/components/admin/ui/admin-page-header";
import { resolveMediaUrl } from "@/lib/cms/mappers";
import { requirePermission } from "@/lib/admin/session";
import { formatPrice } from "@/lib/format";
import { getServiceSupabase } from "@/lib/supabase/service";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

interface SpaceRow {
  id: string;
  slug: string;
  name: string;
  short_description: string;
  price_per_hour_halalas: number;
  publish_status: string;
  featured: boolean;
}

export default async function AdminSpacesPage() {
  const gate = await requirePermission("spaces", "view");
  if (!gate.ok) {
    return (
      <p className="p-8" role="alert">
        {gate.error}
      </p>
    );
  }

  const svc = getServiceSupabase();
  const [{ data: spaces }, { data: images }] = await Promise.all([
    svc
      .from("studio_spaces")
      .select("id, slug, name, short_description, price_per_hour_halalas, publish_status, featured, sort_order")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false }),
    svc
      .from("studio_space_images")
      .select("space_id, storage_path, sort_order")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true }),
  ]);

  /* أول صورة لكل مساحة = صورة البطاقة. */
  const covers = new Map<string, string>();
  for (const row of (images ?? []) as { space_id: string; storage_path: string }[]) {
    if (!covers.has(row.space_id)) covers.set(row.space_id, row.storage_path);
  }

  const rows = (spaces ?? []) as SpaceRow[];

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <AdminPageHeader
        title="المساحات"
        description={`${rows.length} مساحة استوديو .`}
      >
        <Button asChild>
          <Link href="/admin/spaces/new">
            <Plus aria-hidden="true" className="me-1.5 h-4 w-4" />
            مساحة جديدة
          </Link>
        </Button>
      </AdminPageHeader>

      {rows.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-charcoal-500">
          لا توجد مساحات بعد — أنشئ أول مساحة وأضف صورها وأيام حجزها.
        </p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((space) => {
            const cover = covers.get(space.id);
            const published = space.publish_status === "published";
            return (
              <li key={space.id} className="flex flex-col overflow-hidden rounded-xl border border-border bg-white">
                <div className="relative aspect-video bg-surface">
                  {cover ? (
                    <Image
                      src={resolveMediaUrl(cover)}
                      alt={space.name}
                      fill
                      sizes="(max-width: 640px) 100vw, 33vw"
                      className="object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-charcoal-300" aria-hidden="true">
                      <Frame className="h-9 w-9" />
                    </div>
                  )}
                </div>
                <div className="flex flex-1 flex-col gap-2 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <h2 className="font-bold text-charcoal-900">{space.name}</h2>
                    <span
                      className={
                        published
                          ? "shrink-0 rounded-full bg-brand-50 px-2 py-0.5 text-xs font-semibold text-brand-700"
                          : "shrink-0 rounded-full bg-surface px-2 py-0.5 text-xs font-semibold text-charcoal-600"
                      }
                    >
                      {published ? "منشورة" : "مسودة"}
                    </span>
                  </div>
                  {space.featured ? (
                    <span className="w-fit rounded-full bg-surface px-2 py-0.5 text-xs font-semibold text-charcoal-700">
                      مميّزة
                    </span>
                  ) : null}
                  <p dir="ltr" className="text-start text-xs text-muted-foreground">
                    /spaces/{space.slug}
                  </p>
                  {space.short_description ? (
                    <p className="line-clamp-2 text-sm leading-relaxed text-charcoal-600">{space.short_description}</p>
                  ) : null}
                  <p className="mt-auto pt-1 text-sm font-bold text-brand-700">
                    {formatPrice(space.price_per_hour_halalas / 100)}
                    <span className="ms-1 text-xs font-normal text-charcoal-500">/ الساعة</span>
                  </p>
                  <div className="flex flex-wrap items-center gap-1 border-t border-border pt-2">
                    <Button asChild variant="ghost" size="sm">
                      <Link href={`/admin/spaces/${space.id}`}>
                        <Pencil aria-hidden="true" className="me-1.5 h-4 w-4" />
                        تعديل
                      </Link>
                    </Button>
                    {published ? (
                      <Button asChild variant="ghost" size="sm">
                        <a href={`/spaces/${space.slug}`} target="_blank" rel="noopener noreferrer">
                          <ExternalLink aria-hidden="true" className="me-1.5 h-4 w-4" />
                          معاينة
                        </a>
                      </Button>
                    ) : null}
                    <span className="ms-auto">
                      <DeleteSpaceButton spaceId={space.id} spaceName={space.name} />
                    </span>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
