"use client";

/**
 * محرر مساحة استوديو — بيانات المساحة + معرض الصور + أيام الحجز «من — إلى».
 *
 * لا يكتب هذا المكوّن في القاعدة شيئًا: الحفظ يمر بإجراءات الخادم خلف
 * requirePermission("spaces"، …)، والصور تُرفع أولًا عبر ImageUpload ثم
 * يُحفظ رابطها في saveSpaceImagesAction. أيام الحجز تُحفظ استبدالًا كاملًا
 * للمصفوفة: ما في المحرر هو ما في القاعدة بعد الحفظ.
 */

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Loader2, Plus, Save, Sparkles, Trash2 } from "lucide-react";

import {
  createSpaceAction,
  saveSpaceHoursAction,
  saveSpaceImagesAction,
  updateSpaceAction,
} from "@/app/admin/actions/spaces";
import { Field } from "@/components/admin/ui/field";
import { ImageUpload } from "@/components/admin/ui/image-upload";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { DAY_LABELS } from "@/lib/spaces/schedule";
import { slugFromName } from "@/lib/spaces/slug";
import { useToast } from "@/hooks/use-toast";

interface EditorImage {
  key: string;
  url: string;
  alt: string;
}

interface EditorHour {
  key: string;
  day: number;
  start: string;
  end: string;
}

export interface SpaceEditorInitial {
  id: string;
  slug: string;
  name: string;
  shortDescription: string;
  description: string;
  priceSar: number;
  featured: boolean;
  published: boolean;
}

interface SpaceEditorProps {
  /** null = مساحة جديدة. */
  space: SpaceEditorInitial | null;
  initialImages: EditorImage[];
  initialHours: EditorHour[];
}

function newKey(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);
}

export function SpaceEditor({ space, initialImages, initialHours }: SpaceEditorProps) {
  const router = useRouter();
  const { toast } = useToast();

  const [name, setName] = useState(space?.name ?? "");
  const [slug, setSlug] = useState(space?.slug ?? "");
  const [shortDescription, setShortDescription] = useState(space?.shortDescription ?? "");
  const [description, setDescription] = useState(space?.description ?? "");
  const [priceSar, setPriceSar] = useState(space ? String(space.priceSar) : "");
  const [featured, setFeatured] = useState(space?.featured ?? false);
  const [published, setPublished] = useState(space?.published ?? false);

  const [images, setImages] = useState<EditorImage[]>(initialImages);
  const [hours, setHours] = useState<EditorHour[]>(initialHours);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function updateImage(key: string, next: Partial<EditorImage>) {
    setImages((current) => current.map((image) => (image.key === key ? { ...image, ...next } : image)));
  }

  function addHour(day: number) {
    setHours((current) => [...current, { key: newKey(), day, start: "09:00", end: "12:00" }]);
  }

  /** زر التوليد: يشتق الرابط من الاسم العربي (بعد نقله للاتينية) بقيد الحفظ نفسه. */
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
        slug,
        name,
        shortDescription,
        description,
        priceSar,
        featured,
        published,
      };

      let id = space?.id ?? null;
      if (id) {
        const saved = await updateSpaceAction(id, payload);
        if (!saved.ok) {
          setError(saved.error);
          return;
        }
      } else {
        const created = await createSpaceAction(payload);
        if (!created.ok) {
          setError(created.error);
          return;
        }
        id = created.data;
      }

      const imagesResult = await saveSpaceImagesAction(
        id,
        images
          .filter((image) => image.url.trim() !== "")
          .map((image) => ({ url: image.url, alt: image.alt })),
      );
      if (!imagesResult.ok) {
        setError(imagesResult.error);
        return;
      }

      const hoursResult = await saveSpaceHoursAction(
        id,
        hours
          .filter((hour) => hour.start !== "" && hour.end !== "")
          .map((hour) => ({ day: hour.day, start: hour.start, end: hour.end })),
      );
      if (!hoursResult.ok) {
        setError(hoursResult.error);
        return;
      }

      toast({
        title: space ? "حُفظت المساحة" : "أُنشئت المساحة",
        description: published ? "المساحة منشورة وتظهر للحجز في الواجهة." : "المساحة مسودة — لن تظهر للحجز حتى تنشرها.",
      });
      if (space) {
        router.refresh();
      } else {
        router.push(`/admin/spaces/${id}`);
        router.refresh();
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-charcoal-900">{space ? `تعديل: ${space.name}` : "مساحة جديدة"}</h1>
        <Button asChild variant="ghost" size="sm">
          <Link href="/admin/spaces">
            <ArrowRight aria-hidden="true" className="me-1.5 h-4 w-4" />
            عودة للقائمة
          </Link>
        </Button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* ── بيانات المساحة ── */}
        <section className="space-y-4 rounded-xl border border-border bg-white p-5">
          <h2 className="font-bold text-charcoal-900">بيانات المساحة</h2>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="space-name" label="اسم المساحة" required hint="اسم يظهر للزبائن: «استوديو كروما خضراء» مثلًا.">
              <Input id="space-name" value={name} onChange={(event) => setName(event.target.value)} required maxLength={120} />
            </Field>
            <Field
              id="space-slug"
              label="الرابط (slug)"
              required
              hint="بالحروف الإنجليزية الصغيرة والأرقام والشرطة — يظهر في عنوان الصفحة. اضغط «توليد» ليُشتق تلقائيًا من الاسم."
            >
              <div className="flex items-stretch gap-2">
                <Input
                  id="space-slug"
                  value={slug}
                  onChange={(event) => setSlug(event.target.value.toLowerCase())}
                  required
                  dir="ltr"
                  maxLength={80}
                  placeholder="green-screen-studio"
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={generateSlug}
                  disabled={name.trim() === ""}
                  aria-label="توليد الرابط من الاسم"
                  title="توليد الرابط من الاسم"
                >
                  <Sparkles aria-hidden="true" className="me-1.5 h-4 w-4" />
                  توليد
                </Button>
              </div>
            </Field>
          </div>

          <Field id="space-short" label="وصف مختصر" hint="سطر أو سطران تظهران في بطاقة المساحة.">
            <Textarea id="space-short" value={shortDescription} onChange={(event) => setShortDescription(event.target.value)} rows={2} maxLength={300} />
          </Field>

          <Field id="space-description" label="الوصف الكامل" hint="يظهر في صفحة المساحة تحت المعرض.">
            <Textarea id="space-description" value={description} onChange={(event) => setDescription(event.target.value)} rows={6} maxLength={5000} />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="space-price" label="سعر الساعة (ريال)" required hint="يشمل حساب الضريبة عند الحجز بحسب الإعدادات المعتمدة.">
              <Input
                id="space-price"
                type="number"
                min={1}
                max={100_000}
                step="0.01"
                value={priceSar}
                onChange={(event) => setPriceSar(event.target.value)}
                required
                dir="ltr"
              />
            </Field>
            <div className="space-y-3 pt-1">
              <label className="flex min-h-11 cursor-pointer items-center justify-between gap-3 rounded-lg border border-border px-3 text-sm font-medium">
                مميّزة
                <Switch checked={featured} onCheckedChange={setFeatured} aria-label="مساحة مميّزة" />
              </label>
              <label className="flex min-h-11 cursor-pointer items-center justify-between gap-3 rounded-lg border border-border px-3 text-sm font-medium">
                منشورة (تقبل الحجز)
                <Switch checked={published} onCheckedChange={setPublished} aria-label="نشر المساحة" />
              </label>
            </div>
          </div>
        </section>

        {/* ── الصور ── */}
        <section className="space-y-4 rounded-xl border border-border bg-white p-5">
          <div>
            <h2 className="font-bold text-charcoal-900">صور المساحة</h2>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              الصور تُرفع إلى مكتبة الوسائط فور اختيارها. أول صورة هي صورة البطاقة في قائمة المساحات.
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
                  onClick={() => setImages((current) => current.filter((item) => item.key !== image.key))}
                >
                  <Trash2 aria-hidden="true" className="me-1.5 h-4 w-4" />
                  حذف الصورة
                </Button>
              </div>
              <ImageUpload
                id={`space-image-${image.key}`}
                label="الصورة"
                folder="spaces"
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

        {/* ── أيام الحجز ── */}
        <section className="space-y-4 rounded-xl border border-border bg-white p-5">
          <div>
            <h2 className="font-bold text-charcoal-900">أيام الحجز والوقت «من — إلى»</h2>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              لكل يوم واحد أو أكثر من النطاقات. الأيام بلا نطاقات تكون مغلقة، والزبون يختار من الأوقات الحرّة التي لم
              تُحجز بعد.
            </p>
          </div>

          <div className="space-y-4">
            {DAY_LABELS.map((label, day) => {
              const dayHours = hours
                .filter((hour) => hour.day === day)
                .sort((a, b) => a.start.localeCompare(b.start));
              return (
                <div key={day} className="rounded-lg border border-border p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-medium text-charcoal-900">{label}</span>
                    {dayHours.length === 0 ? (
                      <span className="text-xs text-muted-foreground">مغلق</span>
                    ) : null}
                  </div>

                  {dayHours.length > 0 ? (
                    <ul className="mt-3 space-y-2">
                      {dayHours.map((hour) => (
                        <li key={hour.key} className="flex flex-wrap items-center gap-2">
                          <input
                            type="time"
                            value={hour.start}
                            onChange={(event) =>
                              setHours((current) =>
                                current.map((item) => (item.key === hour.key ? { ...item, start: event.target.value } : item)),
                              )
                            }
                            aria-label={`${label}: من`}
                            dir="ltr"
                            className="h-11 rounded-lg border border-charcoal-300 bg-white px-3 text-base lg:text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                          />
                          <span className="text-sm text-charcoal-500">إلى</span>
                          <input
                            type="time"
                            value={hour.end}
                            onChange={(event) =>
                              setHours((current) =>
                                current.map((item) => (item.key === hour.key ? { ...item, end: event.target.value } : item)),
                              )
                            }
                            aria-label={`${label}: إلى`}
                            dir="ltr"
                            className="h-11 rounded-lg border border-charcoal-300 bg-white px-3 text-base lg:text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="text-danger-700 hover:bg-danger-50 hover:text-danger-700"
                            aria-label="حذف النطاق"
                            onClick={() => setHours((current) => current.filter((item) => item.key !== hour.key))}
                          >
                            <Trash2 aria-hidden="true" className="h-4 w-4" />
                          </Button>
                        </li>
                      ))}
                    </ul>
                  ) : null}

                  <Button type="button" variant="ghost" size="sm" className="mt-2" onClick={() => addHour(day)}>
                    <Plus aria-hidden="true" className="me-1.5 h-4 w-4" />
                    إضافة نطاق لـ{label}
                  </Button>
                </div>
              );
            })}
          </div>
        </section>

        {error ? (
          <p role="alert" className="rounded-lg bg-danger-50 p-3 text-sm font-medium text-danger-700">
            {error}
          </p>
        ) : null}

        <div className="flex justify-end">
          <Button type="submit" size="lg" disabled={saving}>
            {saving ? (
              <Loader2 aria-hidden="true" className="me-1.5 h-5 w-5 animate-spin" />
            ) : (
              <Save aria-hidden="true" className="me-1.5 h-4 w-4" />
            )}
            {saving ? "جارٍ الحفظ…" : "حفظ المساحة"}
          </Button>
        </div>
      </form>
    </div>
  );
}
