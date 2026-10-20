/**
 * /admin/equipment/categories — إدارة تصنيفات المعدات.
 * العرض بـ`equipment:view` والإجراءات بـ`equipment:create/edit/delete`،
 * وكلها تُفحص في الخادم داخل إجراءات المستخدم.
 */

import { CategoryManager, type CategoryRow } from "@/components/admin/equipment/category-manager";
import { AdminPageHeader } from "@/components/admin/ui/admin-page-header";
import { requirePermission } from "@/lib/admin/session";
import { getServiceSupabase } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";

interface CategoryRecord {
  id: string;
  slug: string;
  name: string;
  description: string;
  icon_key: string;
  sort_order: number;
  published: boolean;
}

export default async function EquipmentCategoriesPage() {
  const gate = await requirePermission("equipment", "view");
  if (!gate.ok) {
    return (
      <p className="p-8" role="alert">
        {gate.error}
      </p>
    );
  }

  const svc = getServiceSupabase();
  const [{ data: categories }, { data: items }] = await Promise.all([
    svc
      .from("equipment_categories")
      .select("id, slug, name, description, icon_key, sort_order, published")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false }),
    svc.from("equipment_items").select("category_id"),
  ]);

  const counts = new Map<string, number>();
  for (const row of (items ?? []) as { category_id: string }[]) {
    counts.set(row.category_id, (counts.get(row.category_id) ?? 0) + 1);
  }

  const rows: CategoryRow[] = ((categories ?? []) as CategoryRecord[]).map((category) => ({
    id: category.id,
    slug: category.slug,
    name: category.name,
    description: category.description,
    iconKey: category.icon_key,
    sortOrder: category.sort_order,
    published: category.published,
    itemCount: counts.get(category.id) ?? 0,
  }));

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <AdminPageHeader
        title="تصنيفات المعدات"
        description="التصنيف المنشور يظهر في كتالوج التأجير. التصنيف الذي له معدات لا يُحذف — أخفه أو انقل معداته."
      />
      <CategoryManager categories={rows} />
    </div>
  );
}
