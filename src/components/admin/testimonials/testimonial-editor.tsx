"use client";

/**
 * TestimonialEditor — محرر التقييم (المهمة #15)
 * ----------------------------------------------
 * نفس المكوّن للإضافة (new) والتعديل ([id]) — نمط المحررات الموحد:
 * مسودة تُهيَّأ بعد الترطيب فقط (D-22) + لقطة + Dirty + beforeunload
 * + تأكيد إلغاء + Validation (الاسم والمراجعة مطلوبة، تقييم 1–5،
 * رابط المصدر URL صالح إن وُجد) + Toast.
 *
 * لا Google Reviews API في هذه المرحلة — المصدر حقول Mock فقط.
 */
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { LoaderCircle, RefreshCw, Star } from "lucide-react";

import type { AdminTestimonial, TestimonialSource } from "@/data/admin/types";
import type { TestimonialInput } from "@/context/admin-store";
import { useAdminActions, useAdminState } from "@/context/admin-store";
import { Field } from "@/components/admin/ui/field";
import { AdminPageHeader } from "@/components/admin/ui/admin-page-header";
import { ConfirmDialog } from "@/components/admin/ui/confirm-dialog";
import { EmptyState } from "@/components/admin/ui/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { todayISO } from "@/lib/format";

/* نمط URL — أي https/http صالح */
const URL_PATTERN = /^https?:\/\/[^\s]+\.[^\s]+$/i;

function createDraftDefaults(): TestimonialInput {
  return {
    name: "",
    role: "",
    rating: 5,
    review: "",
    source: "manual",
    sourceUrl: "",
    featured: false,
    visible: true,
    /* تاريخ اليوم المحلي وقت الإنشاء — في المتصفح فقط (لا فرق SSR) */
    date: todayISO(),
  };
}

function toDraft(testimonial: AdminTestimonial): TestimonialInput {
  const { id: _id, ...rest } = testimonial;
  return { ...rest };
}

const RATING_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "1", label: "نجمة واحدة (1)" },
  { value: "2", label: "نجمتان (2)" },
  { value: "3", label: "ثلاث نجوم (3)" },
  { value: "4", label: "أربع نجوم (4)" },
  { value: "5", label: "خمس نجوم (5)" },
];

interface TestimonialEditorProps {
  mode: "create" | "edit";
  testimonialId?: string;
}

export function TestimonialEditor({ mode, testimonialId }: TestimonialEditorProps) {
  const router = useRouter();
  const { toast } = useToast();
  const { data, hydrated } = useAdminState();
  const { addTestimonial, updateTestimonial } = useAdminActions();

  const testimonial =
    mode === "edit" ? data.testimonials.find((entry) => entry.id === testimonialId) : undefined;

  /* المسودة بعد الترطيب فقط — إصلاح علة blind-save الموثقة (D-22) */
  const [draft, setDraft] = useState<TestimonialInput | null>(() =>
    mode === "create" ? createDraftDefaults() : hydrated && testimonial ? toDraft(testimonial) : null,
  );
  const [snapshot, setSnapshot] = useState<string>(() =>
    mode === "create"
      ? JSON.stringify(createDraftDefaults())
      : hydrated && testimonial
        ? JSON.stringify(toDraft(testimonial))
        : "",
  );

  /* تغيير المعرّف ضمن نفس المسار → إعادة تهيئة (نمط D-19) */
  const [prevId, setPrevId] = useState<string | undefined>(testimonialId);
  if (testimonialId !== prevId) {
    setPrevId(testimonialId);
    if (testimonial) {
      const initial = toDraft(testimonial);
      setSnapshot(JSON.stringify(initial));
      setDraft(initial);
    } else {
      setSnapshot("");
      setDraft(null);
    }
  }

  /* التهيئة المؤجلة بعد الترطيب (D-12) */
  if (mode === "edit" && hydrated && draft === null && testimonial) {
    const initial = toDraft(testimonial);
    setSnapshot(JSON.stringify(initial));
    setDraft(initial);
  }

  const isDirty = useMemo(
    () => draft !== null && JSON.stringify(draft) !== snapshot,
    [draft, snapshot],
  );

  useEffect(() => {
    if (!isDirty) return;
    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false);

  if (mode === "edit" && hydrated && !testimonial) {
    return (
      <div className="mx-auto w-full max-w-4xl">
        <EmptyState
          title="التقييم غير موجود"
          description="ربما حُذف هذا التقييم أو أن الرابط غير صحيح."
        >
          <Button asChild size="sm">
            <Link href="/admin/testimonials">العودة لقائمة التقييمات</Link>
          </Button>
        </EmptyState>
      </div>
    );
  }

  if (!draft) {
    return (
      <div className="mx-auto flex w-full max-w-4xl items-center justify-center py-24 text-charcoal-300">
        <LoaderCircle aria-hidden="true" className="h-6 w-6 animate-spin" />
        <span className="sr-only">جارٍ تحميل بيانات التقييم…</span>
      </div>
    );
  }

  const update = (patch: Partial<TestimonialInput>) =>
    setDraft((prev) => (prev ? { ...prev, ...patch } : prev));

  function validate(): Record<string, string> {
    if (!draft) return {};
    const next: Record<string, string> = {};
    if (!draft.name.trim()) next.name = "اسم صاحب التقييم مطلوب.";
    if (!draft.review.trim()) next.review = "نص المراجعة مطلوب.";
    if (draft.rating < 1 || draft.rating > 5) next.rating = "التقييم بين 1 و5.";
    if (draft.sourceUrl && draft.sourceUrl.trim() && !URL_PATTERN.test(draft.sourceUrl.trim())) {
      next.sourceUrl = "أدخل رابطًا صالحًا يبدأ بـ https://";
    }
    return next;
  }

  async function handleSave() {
    if (!draft) return;
    const validation = validate();
    setErrors(validation);

    const errorKeys = Object.keys(validation);
    if (errorKeys.length > 0) {
      document
        .getElementById(`testimonial-${errorKeys[0]}`)
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
      toast({
        title: "تعذر الحفظ — راجع الحقول",
        description: validation[errorKeys[0]],
        variant: "destructive",
      });
      return;
    }

    const clean: TestimonialInput = {
      ...draft,
      name: draft.name.trim(),
      role: draft.role?.trim() || undefined,
      review: draft.review.trim(),
      sourceUrl: draft.sourceUrl?.trim() || undefined,
      rating: Math.min(5, Math.max(1, Math.round(draft.rating))) as AdminTestimonial["rating"],
    };

    if (mode === "create") {
      const result = await addTestimonial(clean);
      if (!result.ok) {
        toast({ title: "تعذر إنشاء التقييم", description: result.error, variant: "destructive" });
        return;
      }
      toast({
        title: "تم إنشاء التقييم",
        description: `أُضيف تقييم «${clean.name}» إلى القائمة.`,
      });
      router.push(`/admin/testimonials/${result.data}`);
    } else if (testimonialId) {
      const result = await updateTestimonial(testimonialId, clean);
      if (!result.ok) {
        toast({ title: "تعذر الحفظ", description: result.error, variant: "destructive" });
        return;
      }
      toast({ title: "تم حفظ التقييم", description: `حُدّث تقييم «${clean.name}» بنجاح.` });
      router.push("/admin/testimonials");
    }
  }

  function handleCancel() {
    if (isDirty) {
      setCancelConfirmOpen(true);
      return;
    }
    router.push("/admin/testimonials");
  }

  return (
    <div className="mx-auto w-full max-w-4xl pb-24">
      <AdminPageHeader
        title={mode === "create" ? "تقييم جديد" : draft.name || "تعديل التقييم"}
        description={
          mode === "create"
            ? "أضف تقييم متدرب يدويًا — أو انقل تقييمًا من Google بمصدره ورابطه."
            : "عدّل بيانات التقييم — الحقول المميزة والظاهرة تتحكم بظهوره في الرئيسية."
        }
      >
        <Button asChild variant="outline" size="sm">
          <Link href="/admin/testimonials">قائمة التقييمات</Link>
        </Button>
      </AdminPageHeader>

      <div className="space-y-4">
        {/* البيانات الأساسية */}
        <section className="rounded-xl border border-border bg-white p-4 sm:p-6">
          <h2 className="mb-4 text-sm font-semibold text-charcoal-900">البيانات الأساسية</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="testimonial-name" label="الاسم" required error={errors.name}>
              <Input
                id="testimonial-name"
                value={draft.name}
                onChange={(event) => update({ name: event.target.value })}
                placeholder="مثال: سارة الحربي"
                aria-invalid={Boolean(errors.name)}
              />
            </Field>
            <Field id="testimonial-role" label="الصفة / الوظيفة">
              <Input
                id="testimonial-role"
                value={draft.role ?? ""}
                onChange={(event) => update({ role: event.target.value })}
                placeholder="مثال: مصورة بورتريه"
              />
            </Field>
            <Field id="testimonial-rating" label="التقييم (1–5)" required error={errors.rating}>
              <Select
                value={String(draft.rating)}
                onValueChange={(value) => update({ rating: Number(value) as AdminTestimonial["rating"] })}
              >
                <SelectTrigger id="testimonial-rating" aria-label="التقييم بالنجوم">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {RATING_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      <span className="flex items-center gap-1.5">
                        <Star aria-hidden="true" className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                        {option.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field id="testimonial-date" label="تاريخ التقييم" hint="يُعرض بجانب الاسم في بطاقات التقييم">
              <Input
                id="testimonial-date"
                type="date"
                value={draft.date}
                onChange={(event) => update({ date: event.target.value })}
                dir="ltr"
                className="num-ltr"
              />
            </Field>
          </div>

          <Field
            id="testimonial-review"
            label="نص المراجعة"
            required
            error={errors.review}
            className="mt-4"
          >
            <Textarea
              id="testimonial-review"
              value={draft.review}
              onChange={(event) => update({ review: event.target.value })}
              rows={4}
              placeholder="تجربة المتدرب الحقيقية — بلا مبالغة تسويقية…"
              aria-invalid={Boolean(errors.review)}
            />
          </Field>
        </section>

        {/* المصدر */}
        <section className="rounded-xl border border-border bg-white p-4 sm:p-6">
          <h2 className="mb-4 text-sm font-semibold text-charcoal-900">المصدر</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="testimonial-source" label="مصدر التقييم" hint="لا يوجد ربط فعلي بـ Google Reviews في هذه المرحلة">
              <Select
                value={draft.source}
                onValueChange={(value) => update({ source: value as TestimonialSource })}
              >
                <SelectTrigger id="testimonial-source" aria-label="مصدر التقييم">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="manual">يدوي (أدخلته أنت)</SelectItem>
                  <SelectItem value="google">Google</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field id="testimonial-sourceUrl" label="رابط المصدر" error={errors.sourceUrl}>
              <Input
                id="testimonial-sourceUrl"
                value={draft.sourceUrl ?? ""}
                dir="ltr"
                className="font-latin"
                onChange={(event) => update({ sourceUrl: event.target.value })}
                placeholder="https://maps.google.com/…"
                aria-invalid={Boolean(errors.sourceUrl)}
              />
            </Field>
          </div>
        </section>

        {/* الحالة */}
        <section className="rounded-xl border border-border bg-white p-4 sm:p-6">
          <h2 className="mb-4 text-sm font-semibold text-charcoal-900">الحالة</h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-4 rounded-xl border border-border bg-surface/60 p-4">
              <div>
                <p className="text-sm font-medium text-charcoal-800">مميز (Featured)</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  التقييمات المميزة الظاهرة تُستخدم في وضع «تلقائي» بقسم التقييمات في الرئيسية
                </p>
              </div>
              <Switch
                checked={draft.featured}
                onCheckedChange={(checked) => update({ featured: checked })}
                aria-label="تمييز التقييم"
              />
            </div>
            <div className="flex items-center justify-between gap-4 rounded-xl border border-border bg-surface/60 p-4">
              <div>
                <p className="text-sm font-medium text-charcoal-800">ظاهر (Visible)</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  التقييم المخفي لا يظهر في المعاينة ولا في أي وضع عرض — ولا تنكسر قوائم الاختيار القائمة
                </p>
              </div>
              <Switch
                checked={draft.visible}
                onCheckedChange={(checked) => update({ visible: checked })}
                aria-label="إظهار التقييم"
              />
            </div>
          </div>
        </section>
      </div>

      {/* شريط الحفظ الثابت */}
      <div className="sticky bottom-0 -mx-4 mt-6 border-t border-border bg-white px-4 py-3 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
        <div className="mx-auto flex w-full max-w-4xl items-center justify-between gap-3">
          <p aria-live="polite" className="flex items-center gap-2 text-xs text-muted-foreground">
            {isDirty ? (
              <>
                <span aria-hidden="true" className="h-2 w-2 rounded-full bg-brand-500" />
                تغييرات غير محفوظة
              </>
            ) : (
              "لا تغييرات جديدة"
            )}
          </p>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handleCancel}>
              إلغاء
            </Button>
            <Button onClick={handleSave}>حفظ التقييم</Button>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={cancelConfirmOpen}
        onOpenChange={setCancelConfirmOpen}
        title="تجاهل التغييرات؟"
        description="لديك تعديلات غير محفوظة ستُفقد عند المغادرة. هل تريد المتابعة دون حفظ؟"
        confirmLabel="تجاهل التغييرات"
        onConfirm={() => router.push("/admin/testimonials")}
      />
    </div>
  );
}
