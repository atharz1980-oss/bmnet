"use client";

/**
 * مدير التصنيفات — إنشاء وتعديل وحذف تصنيفات المعدات في صفحة واحدة.
 *
 * التصنيف بلا معدات يُحذف، والذي له معدات يُرفض حذفه من الخادم برسالة
 * عربية (السجل لا يُمحى عرضًا). لا كتابة مباشرة: كل نداء يمر بإجراءات
 * الخادم خلف requirePermission("equipment"، …).
 */

import { useState, useTransition, type FormEvent } from "react";
import { Loader2, Plus, Save, Trash2 } from "lucide-react";

import {
  createEquipmentCategoryAction,
  deleteEquipmentCategoryAction,
  updateEquipmentCategoryAction,
} from "@/app/admin/actions/equipment";
import { Field } from "@/components/admin/ui/field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { slugFromName } from "@/lib/spaces/slug";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

export interface CategoryRow {
  id: string;
  slug: string;
  name: string;
  description: string;
  iconKey: string;
  sortOrder: number;
  published: boolean;
  itemCount: number;
}

interface DraftState {
  slug: string;
  name: string;
  description: string;
  iconKey: string;
  sortOrder: string;
  published: boolean;
}

const EMPTY_DRAFT: DraftState = {
  slug: "",
  name: "",
  description: "",
  iconKey: "",
  sortOrder: "0",
  published: true,
};

function toPayload(draft: DraftState) {
  return {
    slug: draft.slug,
    name: draft.name,
    description: draft.description,
    iconKey: draft.iconKey,
    sortOrder: draft.sortOrder,
    published: draft.published,
  };
}

export function CategoryManager({ categories }: { categories: CategoryRow[] }) {
  const { toast } = useToast();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<DraftState>(EMPTY_DRAFT);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [confirmingDelete, setConfirmingDelete] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function startCreate() {
    setEditingId(null);
    setDraft(EMPTY_DRAFT);
    setError("");
  }

  function startEdit(category: CategoryRow) {
    setEditingId(category.id);
    setDraft({
      slug: category.slug,
      name: category.name,
      description: category.description,
      iconKey: category.iconKey,
      sortOrder: String(category.sortOrder),
      published: category.published,
    });
    setError("");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSaving(true);
    try {
      if (editingId) {
        const result = await updateEquipmentCategoryAction(editingId, toPayload(draft));
        if (!result.ok) {
          setError(result.error);
          return;
        }
        toast({ title: "حُفظ التصنيف" });
      } else {
        const result = await createEquipmentCategoryAction(toPayload(draft));
        if (!result.ok) {
          setError(result.error);
          return;
        }
        toast({ title: "أُنشئ التصنيف" });
      }
      startCreate();
    } finally {
      setSaving(false);
    }
  }

  function handleDelete(category: CategoryRow) {
    startTransition(async () => {
      const result = await deleteEquipmentCategoryAction(category.id);
      if (result.ok) {
        toast({ title: "حُذف التصنيف" });
        if (editingId === category.id) startCreate();
      } else {
        toast({ title: "تعذر الحذف", description: result.error, variant: "destructive" });
      }
      setConfirmingDelete(null);
    });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
      <section className="space-y-3">
        <h2 className="font-bold text-charcoal-900">التصنيفات القائمة</h2>
        {categories.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border p-6 text-sm text-charcoal-500">
            لا توجد تصنيفات بعد — أنشئ أول تصنيف من النموذج.
          </p>
        ) : (
          <ul className="divide-y divide-border rounded-xl border border-border bg-white">
            {categories.map((category) => (
              <li key={category.id} className="flex flex-wrap items-center gap-3 p-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-charcoal-900">{category.name}</span>
                    <span
                      className={cn(
                        "inline-flex items-center gap-2 text-xs font-medium",
                        category.published ? "text-brand-700" : "text-charcoal-500",
                      )}
                    >
                      <span
                        aria-hidden="true"
                        className={cn(
                          "h-1.5 w-1.5 rounded-full",
                          category.published ? "bg-brand-600" : "bg-charcoal-300",
                        )}
                      />
                      {category.published ? "منشور" : "مخفي"}
                    </span>
                  </div>
                  <p dir="ltr" className="text-start text-xs text-muted-foreground">
                    /rentals?category={category.slug}
                  </p>
                  <p className="mt-0.5 text-xs text-charcoal-500">
                    {category.itemCount} معدة — ترتيب {category.sortOrder}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <Button type="button" variant="ghost" size="sm" onClick={() => startEdit(category)}>
                    تعديل
                  </Button>
                  {confirmingDelete === category.id ? (
                    <span className="flex items-center gap-1">
                      <Button
                        type="button"
                        size="sm"
                        variant="destructive"
                        disabled={pending}
                        onClick={() => handleDelete(category)}
                      >
                        تأكيد
                      </Button>
                      <Button type="button" variant="ghost" size="sm" disabled={pending} onClick={() => setConfirmingDelete(null)}>
                        تراجع
                      </Button>
                    </span>
                  ) : (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-danger-700 hover:bg-danger-50 hover:text-danger-700"
                      onClick={() => setConfirmingDelete(category.id)}
                    >
                      <Trash2 aria-hidden="true" className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-4 rounded-xl border border-border bg-white p-5">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-charcoal-900">{editingId ? "تعديل تصنيف" : "تصنيف جديد"}</h2>
          {editingId ? (
            <Button type="button" variant="ghost" size="sm" onClick={startCreate}>
              <Plus aria-hidden="true" className="me-1.5 h-4 w-4" />
              جديد
            </Button>
          ) : null}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Field id="category-name" label="اسم التصنيف" required hint="مثال: كاميرات، إضاءة، مايكات.">
            <Input
              id="category-name"
              value={draft.name}
              onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))}
              required
              maxLength={120}
            />
          </Field>

          <Field id="category-slug" label="الرابط (slug)" required hint="بالحروف الإنجليزية — جزء من رابط الكتالوج.">
            <div className="flex items-stretch gap-2">
              <Input
                id="category-slug"
                value={draft.slug}
                onChange={(event) => setDraft((current) => ({ ...current, slug: event.target.value.toLowerCase() }))}
                required
                dir="ltr"
                maxLength={80}
                placeholder="cameras"
                className="flex-1"
              />
              <Button
                type="button"
                variant="outline"
                disabled={draft.name.trim() === ""}
                onClick={() => setDraft((current) => ({ ...current, slug: slugFromName(current.name) }))}
              >
                توليد
              </Button>
            </div>
          </Field>

          <Field id="category-description" label="وصف مختصر">
            <Textarea
              id="category-description"
              value={draft.description}
              onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))}
              rows={3}
              maxLength={1000}
            />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field id="category-icon" label="مفتاح الأيقونة" hint="اختياري.">
              <Input
                id="category-icon"
                value={draft.iconKey}
                onChange={(event) => setDraft((current) => ({ ...current, iconKey: event.target.value }))}
                dir="ltr"
                maxLength={40}
              />
            </Field>
            <Field id="category-order" label="الترتيب">
              <Input
                id="category-order"
                type="number"
                min={0}
                max={9999}
                value={draft.sortOrder}
                onChange={(event) => setDraft((current) => ({ ...current, sortOrder: event.target.value }))}
                dir="ltr"
              />
            </Field>
          </div>

          <label className="flex min-h-11 cursor-pointer items-center justify-between gap-3 rounded-lg border border-border px-3 text-sm font-medium">
            منشور في الكتالوج
            <Switch
              checked={draft.published}
              onCheckedChange={(checked) => setDraft((current) => ({ ...current, published: checked }))}
              aria-label="نشر التصنيف"
            />
          </label>

          {error ? (
            <p role="alert" className="rounded-lg bg-danger-50 p-3 text-sm font-medium text-danger-700">
              {error}
            </p>
          ) : null}

          <div className="flex justify-end">
            <Button type="submit" disabled={saving}>
              {saving ? (
                <Loader2 aria-hidden="true" className="me-1.5 h-4 w-4 animate-spin" />
              ) : (
                <Save aria-hidden="true" className="me-1.5 h-4 w-4" />
              )}
              {editingId ? "حفظ التعديل" : "إنشاء التصنيف"}
            </Button>
          </div>
        </form>
      </section>
    </div>
  );
}
