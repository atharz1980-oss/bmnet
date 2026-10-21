/**
 * /admin/equipment — قائمة معدات التأجير.
 *
 * قراءة مباشرة من القاعدة (نمط قائمة المساحات): تحرسها صلاحية
 * `equipment:view`. تعرض الحالة التشغيلية والنشر والكمية والسعر، مع
 * إجراءات: تعديل / معاينة عامة / حذف بتأكيد (المعدة ذات الإيجارات
 * محجوبة من الحذف في الخادم).
 */

import Link from "next/link";
import Image from "next/image";
import { ExternalLink, Package, Pencil, Plus, Tags } from "lucide-react";

import { DeleteEquipmentButton } from "@/components/admin/equipment/delete-equipment-button";
import { AdminPageHeader } from "@/components/admin/ui/admin-page-header";
import { Button } from "@/components/ui/button";
import { requirePermission } from "@/lib/admin/session";
import { resolveMediaUrl } from "@/lib/cms/mappers";
import { formatPrice } from "@/lib/format";
import { EQUIPMENT_STATUS_LABELS } from "@/lib/rentals/labels";
import { getServiceSupabase } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";

interface EquipmentListRow {
  id: string;
  slug: string;
  name: string;
  category_id: string;
  short_description: string;
  quantity: number;
  price_per_day_halalas: number;
  status: string;
  requires_security_note: boolean;
  featured: boolean;
  published: boolean;
}

function statusChipClass(status: string): string {
  if (status === "available") return "rounded-full bg-brand-50 px-2 py-0.5 text-xs font-semibold text-brand-700";
  if (status === "rented") return "rounded-full bg-charcoal-800 px-2 py-0.5 text-xs font-semibold text-white";
  return "rounded-full bg-surface px-2 py-0.5 text-xs font-semibold text-charcoal-600";
}

export default async function AdminEquipmentPage() {
  const gate = await requirePermission("equipment", "view");
  if (!gate.ok) {
    return (
      <p className="p-8" role="alert">
        {gate.error}
      </p>
    );
  }

  const svc = getServiceSupabase();
  const [{ data: items }, { data: images }, { data: categories }] = await Promise.all([
    svc
      .from("equipment_items")
      .select(
        "id, slug, name, category_id, short_description, quantity, price_per_day_halalas, status, requires_security_note, featured, published",
      )
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false }),
    svc
      .from("equipment_images")
      .select("item_id, storage_path, sort_order")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true }),
    svc.from("equipment_categories").select("id, name"),
  ]);

  /* أول صورة لكل معدة = صورة البطاقة. */
  const covers = new Map<string, string>();
  for (const row of (images ?? []) as { item_id: string; storage_path: string }[]) {
    if (!covers.has(row.item_id)) covers.set(row.item_id, row.storage_path);
  }
  const categoryNames = new Map<string, string>(
    ((categories ?? []) as { id: string; name: string }[]).map((row) => [row.id, row.name]),
  );

  const rows = (items ?? []) as EquipmentListRow[];

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <AdminPageHeader
        eyebrow="المحتوى"
        index="02"
        title="المعدات" description={`${rows.length} معدة في الكتالوج — كل معدة بسعر يومها وكميتها المتاحة.`}>
        <Button asChild variant="outline">
          <Link href="/admin/equipment/categories">
            <Tags aria-hidden="true" className="me-1.5 h-4 w-4" />
            التصنيفات
          </Link>
        </Button>
        <Button asChild>
          <Link href="/admin/equipment/new">
            <Plus aria-hidden="true" className="me-1.5 h-4 w-4" />
            معدة جديدة
          </Link>
        </Button>
      </AdminPageHeader>

      {rows.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-charcoal-500">
          لا توجد معدات بعد — أنشئ تصنيفًا أولًا ثم أضف المعدات وصورها ومواصفاتها.
        </p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((item) => {
            const cover = covers.get(item.id);
            return (
              <li key={item.id} className="flex flex-col overflow-hidden rounded-xl border border-border bg-white">
                <div className="relative aspect-video bg-surface">
                  {cover ? (
                    <Image
                      src={resolveMediaUrl(cover)}
                      alt={item.name}
                      fill
                      sizes="(max-width: 640px) 100vw, 33vw"
                      className="object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-charcoal-300" aria-hidden="true">
                      <Package className="h-9 w-9" />
                    </div>
                  )}
                </div>
                <div className="flex flex-1 flex-col gap-2 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <h2 className="font-bold text-charcoal-900">{item.name}</h2>
                    <span className={statusChipClass(item.status)}>
                      {EQUIPMENT_STATUS_LABELS[item.status] ?? item.status}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    <span
                      className={
                        item.published
                          ? "rounded-full bg-brand-50 px-2 py-0.5 text-xs font-semibold text-brand-700"
                          : "rounded-full bg-surface px-2 py-0.5 text-xs font-semibold text-charcoal-600"
                      }
                    >
                      {item.published ? "منشورة" : "مسودة"}
                    </span>
                    {item.featured ? (
                      <span className="rounded-full bg-surface px-2 py-0.5 text-xs font-semibold text-charcoal-700">مميّزة</span>
                    ) : null}
                    {item.requires_security_note ? (
                      <span className="rounded-full bg-surface px-2 py-0.5 text-xs font-semibold text-charcoal-700">سند ضمان</span>
                    ) : null}
                  </div>
                  <p className="text-xs text-charcoal-500">
                    {categoryNames.get(item.category_id) ?? "بلا تصنيف"} — الكمية {item.quantity}
                  </p>
                  {item.short_description ? (
                    <p className="line-clamp-2 text-sm leading-relaxed text-charcoal-600">{item.short_description}</p>
                  ) : null}
                  <p className="mt-auto pt-1 text-sm font-bold text-brand-700">
                    {formatPrice(item.price_per_day_halalas / 100)}
                    <span className="ms-1 text-xs font-normal text-charcoal-500">/ اليوم</span>
                  </p>
                  <div className="flex flex-wrap items-center gap-1 border-t border-border pt-2">
                    <Button asChild variant="ghost" size="sm">
                      <Link href={`/admin/equipment/${item.id}`}>
                        <Pencil aria-hidden="true" className="me-1.5 h-4 w-4" />
                        تعديل
                      </Link>
                    </Button>
                    {item.published ? (
                      <Button asChild variant="ghost" size="sm">
                        <a href={`/rentals/${item.slug}`} target="_blank" rel="noopener noreferrer">
                          <ExternalLink aria-hidden="true" className="me-1.5 h-4 w-4" />
                          معاينة
                        </a>
                      </Button>
                    ) : null}
                    <span className="ms-auto">
                      <DeleteEquipmentButton itemId={item.id} itemName={item.name} />
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
