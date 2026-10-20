"use client";

/**
 * محرر معدة — البيانات والمواصفات والمعرض وصورة البطاقة.
 *
 * لا يكتب هذا المكوّن في القاعدة شيئًا: الحفظ يمر بإجراءات الخادم خلف
 * requirePermission("equipment"، …)، والصور تُرفع أولًا عبر ImageUpload
 * ثم يُحفظ رابطها في saveEquipmentImagesAction. المواصفات تُحفظ كاملة
 * في عمود jsonb: ما في المحرر هو ما في القاعدة بعد الحفظ.
 */

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Loader2, Plus, Save, Sparkles, Trash2 } from "lucide-react";

import {
  createEquipmentItemAction,
  saveEquipmentImagesAction,
  updateEquipmentItemAction,
} from "@/app/admin/actions/equipment";
import { Field } from "@/components/admin/ui/field";
import { ImageUpload } from "@/components/admin/ui/image-upload";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { slugFromName } from "@/lib/spaces/slug";
import { useToast } from "@/hooks/use-toast";

interface EditorImage {
  key: string;
  url: string;
  alt: string;
}

interface EditorSpec {
  key: string;
  label: string;
  value: string;
}

export interface EquipmentEditorInitial {
  id: string;
  categoryId: string;
  slug: string;
  name: string;
  shortDescription: string;
  description: string;
  sku: string;
  serialNumber: string;
  quantity: number;
  pricePerDaySar: number;
  replacementValueSar: number;
  specs: { label: string; value: string }[];
  status: "available" | "rented" | "maintenance" | "retired";
  requiresSecurityNote: boolean;
  featured: boolean;
  published: boolean;
}

interface EquipmentEditorProps {
  /** null = معدة جديدة. */
  item: EquipmentEditorInitial | null;
  categories: { id: string; name: string }[];
  initialImages: EditorImage[];
}

const STATUS_OPTIONS: { value: EquipmentEditorInitial["status"]; label: string }[] = [
  { value: "available", label: "متاحة" },
  { value: "rented", label: "مؤجرة" },
  { value: "maintenance", label: "صيانة" },
  { value: "retired", label: "مسحوبة" },
];

function newKey(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);
}

export function EquipmentEditor({ item, categories, initialImages }: EquipmentEditorProps) {
  const router = useRouter();
  const { toast } = useToast();

  const [categoryId, setCategoryId] = useState(item?.categoryId ?? categories[0]?.id ?? "");
  const [name, setName] = useState(item?.name ?? "");
  const [slug, setSlug] = useState(item?.slug ?? "");
  const [shortDescription, setShortDescription] = useState(item?.shortDescription ?? "");
  const [description, setDescription] = useState(item?.description ?? "");
  const [sku, setSku] = useState(item?.sku ?? "");
  const [serialNumber, setSerialNumber] = useState(item?.serialNumber ?? "");
  const [quantity, setQuantity] = useState(item ? String(item.quantity) : "1");
  const [pricePerDaySar, setPricePerDaySar] = useState(item ? String(item.pricePerDaySar) : "");
  const [replacementValueSar, setReplacementValueSar] = useState(item ? String(item.replacementValueSar) : "0");
  const [status, setStatus] = useState<EquipmentEditorInitial["status"]>(item?.status ?? "available");
  const [requiresSecurityNote, setRequiresSecurityNote] = useState(item?.requiresSecurityNote ?? false);
  const [featured, setFeatured] = useState(item?.featured ?? false);
  const [published, setPublished] = useState(item?.published ?? false);

  const [images, setImages] = useState<EditorImage[]>(initialImages);
  const [specs, setSpecs] = useState<EditorSpec[]>(
    (item?.specs ?? []).map((spec) => ({ key: newKey(), label: spec.label, value: spec.value })),
  );

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function updateImage(key: string, next: Partial<EditorImage>) {
    setImages((current) => current.map((image) => (image.key === key ? { ...image, ...next } : image)));
  }

  function generateSlug() {
    const next = slugFromName(name);
    if (next.length < 2) {
      toast({
        title: "تعذّر توليد الرابط",
        description: "اكتب اسمًا يحتوي حروفًا أو أرقامًا ثم أعد المحاولة.",
        variant: "destructive",
      });
      return;
    }
    setSlug(next);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSaving(true);
    try {
      const payload = {
        categoryId,
        slug,
        name,
        shortDescription,
        description,
        sku,
        serialNumber,
        quantity,
        pricePerDaySar,
        replacementValueSar,
        specs: specs.filter((spec) => spec.label.trim() !== "" && spec.value.trim() !== "").map((spec) => ({
          label: spec.label,
          value: spec.value,
        })),
        status,
        requiresSecurityNote,
        featured,
        published,
      };

      let id = item?.id ?? null;
      if (id) {
        const saved = await updateEquipmentItemAction(id, payload);
        if (!saved.ok) {
          setError(saved.error);
          return;
        }
      } else {
        const created = await createEquipmentItemAction(payload);
        if (!created.ok) {
          setError(created.error);
          return;
        }
        id = created.data;
      }

      const imagesResult = await saveEquipmentImagesAction(
        id,
        images.filter((image) => image.url.trim() !== "").map((image) => ({ url: image.url, alt: image.alt })),
      );
      if (!imagesResult.ok) {
        setError(imagesResult.error);
        return;
      }

      toast({
        title: item ? "حُفظت المعدة" : "أُنشئت المعدة",
        description: published ? "المعدة منشورة وتظهر في الكتالوج." : "المعدة مسودة — لن تظهر حتى تنشرها.",
      });
      if (item) {
        router.refresh();
      } else {
        router.push(`/admin/equipment/${id}`);
        router.refresh();
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-charcoal-900">{item ? `تعديل: ${item.name}` : "معدة جديدة"}</h1>
        <Button asChild variant="ghost" size="sm">
          <Link href="/admin/equipment">
            <ArrowRight aria-hidden="true" className="me-1.5 h-4 w-4" />
            عودة للقائمة
          </Link>
        </Button>
      </div>

      {categories.length === 0 ? (
        <p role="alert" className="rounded-xl border border-border bg-white p-6 text-sm text-charcoal-600">
          لا توجد تصنيفات بعد. أنشئ تصنيفًا أولًا من{" "}
          <Link href="/admin/equipment/categories" className="font-medium text-brand-700 underline">
            صفحة التصنيفات
          </Link>
          .
        </p>
      ) : null}

      <form onSubmit={handleSubmit} className="space-y-6">
        <section className="space-y-4 rounded-xl border border-border bg-white p-5">
          <h2 className="font-bold text-charcoal-900">بيانات المعدة</h2>

          <Field id="equipment-category" label="التصنيف" required>
            <select
              id="equipment-category"
              value={categoryId}
              onChange={(event) => setCategoryId(event.target.value)}
              required
              className="h-11 w-full rounded-md border border-charcoal-300 bg-white px-3 text-base lg:text-sm focus:border-brand-500 focus:outline-none"
            >
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="equipment-name" label="اسم المعدة" required hint="اسم يظهر للزبائن: «كانون R6 مارك II».">
              <Input id="equipment-name" value={name} onChange={(event) => setName(event.target.value)} required maxLength={160} />
            </Field>
            <Field
              id="equipment-slug"
              label="الرابط (slug)"
              required
              hint="بالحروف الإنجليزية — يظهر في عنوان صفحة المعدة. اضغط «توليد» ليُشتق من الاسم."
            >
              <div className="flex items-stretch gap-2">
                <Input
                  id="equipment-slug"
                  value={slug}
                  onChange={(event) => setSlug(event.target.value.toLowerCase())}
                  required
                  dir="ltr"
                  maxLength={80}
                  placeholder="canon-r6-mark-ii"
                  className="flex-1"
                />
                <Button type="button" variant="outline" onClick={generateSlug} disabled={name.trim() === ""} aria-label="توليد الرابط">
                  <Sparkles aria-hidden="true" className="me-1.5 h-4 w-4" />
                  توليد
                </Button>
              </div>
            </Field>
          </div>

          <Field id="equipment-short" label="وصف مختصر" hint="سطر أو سطران تظهران في بطاقة المعدة.">
            <Textarea id="equipment-short" value={shortDescription} onChange={(event) => setShortDescription(event.target.value)} rows={2} maxLength={300} />
          </Field>

          <Field id="equipment-description" label="الوصف الكامل" hint="يظهر في صفحة المعدة تحت المعرض.">
            <Textarea id="equipment-description" value={description} onChange={(event) => setDescription(event.target.value)} rows={6} maxLength={5000} />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="equipment-sku" label="رمز الصنف (SKU)" hint="اختياري — للجرد الداخلي لا يُعرض للعميل.">
              <Input id="equipment-sku" value={sku} onChange={(event) => setSku(event.target.value)} dir="ltr" maxLength={60} />
            </Field>
            <Field id="equipment-serial" label="السيريال" hint="اختياري — يُضبط في محضر التسليم لكل وحدة.">
              <Input id="equipment-serial" value={serialNumber} onChange={(event) => setSerialNumber(event.target.value)} dir="ltr" maxLength={120} />
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <Field id="equipment-quantity" label="الكمية القابلة للتأجير" required>
              <Input
                id="equipment-quantity"
                type="number"
                min={0}
                max={9999}
                value={quantity}
                onChange={(event) => setQuantity(event.target.value)}
                required
                dir="ltr"
              />
            </Field>
            <Field id="equipment-price" label="سعر اليوم (ريال)" required>
              <Input
                id="equipment-price"
                type="number"
                min={1}
                max={1_000_000}
                step="0.01"
                value={pricePerDaySar}
                onChange={(event) => setPricePerDaySar(event.target.value)}
                required
                dir="ltr"
              />
            </Field>
            <Field id="equipment-replacement" label="قيمة الاستبدال (ريال)" hint="تُعلن في العقد للتوعية — لا تُحصَّل تلقائيًا.">
              <Input
                id="equipment-replacement"
                type="number"
                min={0}
                max={1_000_000}
                step="0.01"
                value={replacementValueSar}
                onChange={(event) => setReplacementValueSar(event.target.value)}
                dir="ltr"
              />
            </Field>
          </div>

          <Field id="equipment-status" label="الحالة التشغيلية" required hint="المعدة المسحوبة أو في الصيانة لا تُنشر في الكتالوج.">
            <select
              id="equipment-status"
              value={status}
              onChange={(event) => setStatus(event.target.value as EquipmentEditorInitial["status"])}
              className="h-11 w-full rounded-md border border-charcoal-300 bg-white px-3 text-base lg:text-sm focus:border-brand-500 focus:outline-none"
            >
              {STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </Field>

          <div className="space-y-3 pt-1">
            <label className="flex min-h-11 cursor-pointer items-center justify-between gap-3 rounded-lg border border-border px-3 text-sm font-medium">
              يلزم سند ضمان «نافذ» قبل التسليم
              <Switch checked={requiresSecurityNote} onCheckedChange={setRequiresSecurityNote} aria-label="سند ضمان" />
            </label>
            <label className="flex min-h-11 cursor-pointer items-center justify-between gap-3 rounded-lg border border-border px-3 text-sm font-medium">
              مميّزة
              <Switch checked={featured} onCheckedChange={setFeatured} aria-label="معدة مميّزة" />
            </label>
            <label className="flex min-h-11 cursor-pointer items-center justify-between gap-3 rounded-lg border border-border px-3 text-sm font-medium">
              منشورة (تقبل الإيجار)
              <Switch checked={published} onCheckedChange={setPublished} aria-label="نشر المعدة" />
            </label>
          </div>
        </section>

        {/* ── المواصفات ── */}
        <section className="space-y-4 rounded-xl border border-border bg-white p-5">
          <div>
            <h2 className="font-bold text-charcoal-900">المواصفات</h2>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              صفوف «المواصفة / القيمة» تظهر في صفحة المعدة — مثال: «الدقة: 24 ميجابكسل».
            </p>
          </div>

          {specs.map((spec) => (
            <div key={spec.key} className="flex flex-wrap items-center gap-2">
              <Input
                value={spec.label}
                onChange={(event) => setSpecs((current) => current.map((row) => (row.key === spec.key ? { ...row, label: event.target.value } : row)))}
                placeholder="اسم المواصفة"
                maxLength={80}
                aria-label="اسم المواصفة"
                className="w-40"
              />
              <Input
                value={spec.value}
                onChange={(event) => setSpecs((current) => current.map((row) => (row.key === spec.key ? { ...row, value: event.target.value } : row)))}
                placeholder="القيمة"
                maxLength={200}
                aria-label="قيمة المواصفة"
                className="flex-1"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-danger-700 hover:bg-danger-50 hover:text-danger-700"
                aria-label="حذف المواصفة"
                onClick={() => setSpecs((current) => current.filter((row) => row.key !== spec.key))}
              >
                <Trash2 aria-hidden="true" className="h-4 w-4" />
              </Button>
            </div>
          ))}

          <Button type="button" variant="outline" onClick={() => setSpecs((current) => [...current, { key: newKey(), label: "", value: "" }])}>
            <Plus aria-hidden="true" className="me-1.5 h-4 w-4" />
            إضافة مواصفة
          </Button>
        </section>

        {/* ── الصور ── */}
        <section className="space-y-4 rounded-xl border border-border bg-white p-5">
          <div>
            <h2 className="font-bold text-charcoal-900">صور المعدة</h2>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              تُرفع إلى مكتبة الوسائط فور اختيارها. أول صورة هي صورة البطاقة في الكتالوج.
            </p>
          </div>

          {images.map((image, index) => (
            <div key={image.key} className="rounded-lg border border-border p-4">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">الصورة {index + 1}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-danger-700 hover:bg-danger-50 hover:text-danger-700"
                  onClick={() => setImages((current) => current.filter((entry) => entry.key !== image.key))}
                >
                  <Trash2 aria-hidden="true" className="me-1.5 h-4 w-4" />
                  حذف الصورة
                </Button>
              </div>
              <ImageUpload
                id={`equipment-image-${image.key}`}
                label="الصورة"
                folder="equipment"
                value={image.url}
                alt={image.alt}
                aspect="video"
                onChange={(next) => updateImage(image.key, { url: next.value, alt: next.alt ?? image.alt })}
              />
            </div>
          ))}

          <Button
            type="button"
            variant="outline"
            onClick={() => setImages((current) => [...current, { key: newKey(), url: "", alt: "" }])}
          >
            <Plus aria-hidden="true" className="me-1.5 h-4 w-4" />
            إضافة صورة
          </Button>
        </section>

        {error ? (
          <p role="alert" className="rounded-lg bg-danger-50 p-3 text-sm font-medium text-danger-700">
            {error}
          </p>
        ) : null}

        <div className="flex justify-end">
          <Button type="submit" size="lg" disabled={saving || categories.length === 0}>
            {saving ? (
              <Loader2 aria-hidden="true" className="me-1.5 h-5 w-5 animate-spin" />
            ) : (
              <Save aria-hidden="true" className="me-1.5 h-4 w-4" />
            )}
            {saving ? "جارٍ الحفظ…" : "حفظ المعدة"}
          </Button>
        </div>
      </form>
    </div>
  );
}
