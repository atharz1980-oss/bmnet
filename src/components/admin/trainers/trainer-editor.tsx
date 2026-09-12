"use client";

/**
 * TrainerEditor — محرر المدرب (المهمة #12)
 * ------------------------------------------
 * نفس المكوّن للإضافة (new) والتعديل ([id]) — نمط محرر الدورة نفسه:
 * مسودة + لقطة حفظ + Dirty (beforeunload + تأكيد إلغاء) + Validation
 * يقفز لأول حقل خاطئ + Toast (بلا alert).
 *
 * الحقول: الاسم*، الصورة+Alt، المسمى، التخصص، نبذة قصيرة، نبذة كاملة،
 * سنوات الخبرة* (>= 0)، Skills (Repeater)، روابط اختيارية بصيغة URL صحيحة،
 * Active / Hidden (Switch — الحالة مصدر واحد).
 *
 * القرار المعماري: نموذج ذو صفحة واحدة (بلا Tabs) — 14 حقلًا مقسمة بطاقات
 * أوضح من تبويبات في هذا الحجم.
 */
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LoaderCircle } from "lucide-react";

import type { AdminTrainer } from "@/data/admin/types";
import type { TrainerInput } from "@/context/admin-store";
import { useAdminActions, useAdminData, useAdminState } from "@/context/admin-store";
import { formatNumber } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { AdminPageHeader } from "@/components/admin/ui/admin-page-header";
import { ConfirmDialog } from "@/components/admin/ui/confirm-dialog";
import { EmptyState } from "@/components/admin/ui/empty-state";
import { Field } from "@/components/admin/ui/field";
import { ImageUpload } from "@/components/admin/ui/image-upload";
import { Repeater } from "@/components/admin/ui/repeater";

/** رابط صحيح = يُحلّ كـ URL وبروتوكول http/https */
function isValidUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function createDraftDefaults(): TrainerInput {
  return {
    name: "",
    image: "",
    imageAlt: "",
    title: "",
    specialty: "",
    shortBio: "",
    bio: "",
    yearsOfExperience: 0,
    skills: [],
    instagram: "",
    linkedin: "",
    website: "",
    status: "active",
  };
}

/** إسقاط حقول الهوية لتحويل المدرب إلى مسودة قابلة للتعديل */
function toDraft(trainer: AdminTrainer): TrainerInput {
  const { id: _id, ...rest } = trainer;
  return {
    ...rest,
    instagram: rest.instagram ?? "",
    linkedin: rest.linkedin ?? "",
    website: rest.website ?? "",
  };
}

function validateDraft(draft: TrainerInput): Record<string, string> {
  const errors: Record<string, string> = {};

  if (!draft.name.trim()) errors.name = "اسم المدرب مطلوب";
  if (!Number.isFinite(draft.yearsOfExperience) || draft.yearsOfExperience < 0) {
    errors.yearsOfExperience = "سنوات الخبرة يجب أن تكون 0 أو أكثر";
  }

  for (const key of ["instagram", "linkedin", "website"] as const) {
    const value = (draft[key] ?? "").trim();
    if (value && !isValidUrl(value)) {
      errors[key] = "أدخل رابطًا صحيحًا يبدأ بـ https://";
    }
  }

  return errors;
}

/* ─────────────────── المكون الرئيسي ─────────────────── */

interface TrainerEditorProps {
  mode: "create" | "edit";
  trainerId?: string;
}

export function TrainerEditor({ mode, trainerId }: TrainerEditorProps) {
  const router = useRouter();
  const { toast } = useToast();
  const { data, hydrated } = useAdminState();
  const { addTrainer, updateTrainer } = useAdminActions();

  const trainer =
    mode === "edit" ? data.trainers.find((entry) => entry.id === trainerId) : undefined;

  /* الدورات المرتبطة (للعرض فقط في وضع التعديل — العلاقة بمرجع trainerId) */
  const linkedCourses = useMemo(
    () =>
      mode === "edit" && trainerId
        ? data.courses.filter((course) => course.trainerId === trainerId)
        : [],
    [data.courses, mode, trainerId],
  );

  /* المسودة تُهيّأ من بيانات المخزن بعد الترطيب فقط — لا من الـ Seed:
     التحميل المباشر لرابط المحرر يبدأ بالمخزون الافتراضي قبل قراءة
     localStorage، وتهيئة المسودة منه كانت تُصفّر تعديلات المالك المحفوظة
     عند أول حفظ (علة مكتشفة بالاختبار — إصلاح موثق في memory.md). */
  const [draft, setDraft] = useState<TrainerInput | null>(() =>
    mode === "create" ? createDraftDefaults() : hydrated && trainer ? toDraft(trainer) : null,
  );
  const [snapshot, setSnapshot] = useState<string>(() =>
    mode === "create"
      ? JSON.stringify(createDraftDefaults())
      : hydrated && trainer
        ? JSON.stringify(toDraft(trainer))
        : "",
  );

  /* تغيير المعرّف ضمن نفس المسار → إعادة تهيئة المسودة (نمط D-19) */
  const [prevId, setPrevId] = useState<string | undefined>(trainerId);
  if (trainerId !== prevId) {
    setPrevId(trainerId);
    if (trainer) {
      const initial = toDraft(trainer);
      setSnapshot(JSON.stringify(initial));
      setDraft(initial);
    } else {
      setSnapshot("");
      setDraft(null);
    }
  }

  /* التهيئة المؤجلة بعد الترطيب (نمط ضبط أثناء الرسم — D-12).
     الشرط يشمل hydrated: بدونها تُهيَّأ المسودة من الـ Seed في أول رسم. */
  if (mode === "edit" && hydrated && draft === null && trainer) {
    const initial = toDraft(trainer);
    setSnapshot(JSON.stringify(initial));
    setDraft(initial);
  }

  const update = (patch: Partial<TrainerInput>) =>
    setDraft((prev) => (prev ? { ...prev, ...patch } : prev));

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

  if (mode === "edit" && hydrated && !trainer) {
    return (
      <div className="mx-auto w-full max-w-6xl">
        <EmptyState
          title="المدرب غير موجود"
          description="ربما حُذف هذا المدرب أو أن الرابط غير صحيح."
        >
          <Button asChild size="sm">
            <Link href="/admin/trainers">العودة لقائمة المدربين</Link>
          </Button>
        </EmptyState>
      </div>
    );
  }

  if (!draft) {
    return (
      <div className="mx-auto flex w-full max-w-6xl items-center justify-center py-24 text-charcoal-300">
        <LoaderCircle aria-hidden="true" className="h-6 w-6 animate-spin" />
        <span className="sr-only">جارٍ تحميل بيانات المدرب…</span>
      </div>
    );
  }

  async function handleSave() {
    if (!draft) return;
    const validation = validateDraft(draft);
    setErrors(validation);

    const errorKeys = Object.keys(validation);
    if (errorKeys.length > 0) {
      document
        .getElementById(`trainer-${errorKeys[0]}`)
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
      toast({
        title: "تعذر الحفظ — راجع الحقول",
        description: validation[errorKeys[0]],
        variant: "destructive",
      });
      return;
    }

    const clean: TrainerInput = {
      ...draft,
      name: draft.name.trim(),
      instagram: draft.instagram?.trim() || undefined,
      linkedin: draft.linkedin?.trim() || undefined,
      website: draft.website?.trim() || undefined,
    };

    if (mode === "create") {
      const result = await addTrainer(clean);
      if (!result.ok) {
        toast({ title: "تعذر إضافة المدرب", description: result.error, variant: "destructive" });
        return;
      }
      toast({
        title: "تم إضافة المدرب",
        description: `أُضيف «${clean.name}» إلى قائمة المدربين.`,
      });
      router.push(`/admin/trainers/${result.data}`);
    } else if (trainerId) {
      const result = await updateTrainer(trainerId, clean);
      if (!result.ok) {
        toast({ title: "تعذر الحفظ", description: result.error, variant: "destructive" });
        return;
      }
      toast({ title: "تم حفظ المدرب", description: `حُدّثت بيانات «${clean.name}» بنجاح.` });
      router.push("/admin/trainers");
    }
  }

  function handleCancel() {
    if (isDirty) {
      setCancelConfirmOpen(true);
      return;
    }
    router.push("/admin/trainers");
  }

  return (
    <div className="mx-auto w-full max-w-6xl pb-24">
      <AdminPageHeader
        title={mode === "create" ? "مدرب جديد" : draft.name || "تعديل بيانات المدرب"}
        description={
          mode === "create"
            ? "أدخل بيانات المدرب الجديد — تُحفظ كل الحقول معًا عند الضغط على «حفظ المدرب»."
            : "عدّل بيانات المدرب — الحفظ يجمع كل التغييرات دفعة واحدة."
        }
      >
        {mode === "edit" && trainer ? (
          <Button asChild variant="outline" size="sm">
            <Link href="/admin/trainers">قائمة المدربين</Link>
          </Button>
        ) : null}
      </AdminPageHeader>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* العمود الرئيسي */}
        <div className="space-y-4 lg:col-span-2">
          {/* البيانات الأساسية */}
          <section className="rounded-xl border border-border bg-white p-4 sm:p-6">
            <h2 className="mb-4 text-sm font-semibold text-charcoal-900">البيانات الأساسية</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field id="trainer-name" label="اسم المدرب" required error={errors.name}>
                <Input
                  id="trainer-name"
                  value={draft.name}
                  onChange={(event) => update({ name: event.target.value })}
                  placeholder="مثال: أحمد الشريف"
                  aria-invalid={Boolean(errors.name)}
                />
              </Field>
              <Field id="trainer-title" label="المسمى المعروض">
                <Input
                  id="trainer-title"
                  value={draft.title}
                  onChange={(event) => update({ title: event.target.value })}
                  placeholder="مثال: مصور فوتوغرافي محترف"
                />
              </Field>
              <Field id="trainer-specialty" label="التخصص">
                <Input
                  id="trainer-specialty"
                  value={draft.specialty}
                  onChange={(event) => update({ specialty: event.target.value })}
                  placeholder="مثال: الإضاءة الاستوديوهية"
                />
              </Field>
              <Field
                id="trainer-yearsOfExperience"
                label="سنوات الخبرة"
                required
                error={errors.yearsOfExperience}
              >
                <Input
                  id="trainer-yearsOfExperience"
                  type="number"
                  min={0}
                  step={1}
                  value={Number.isFinite(draft.yearsOfExperience) ? draft.yearsOfExperience : 0}
                  onChange={(event) =>
                    update({ yearsOfExperience: Math.max(0, Math.floor(Number(event.target.value) || 0)) })
                  }
                  className="num-ltr"
                  aria-invalid={Boolean(errors.yearsOfExperience)}
                />
              </Field>
            </div>
          </section>

          {/* النبذة */}
          <section className="rounded-xl border border-border bg-white p-4 sm:p-6">
            <h2 className="mb-4 text-sm font-semibold text-charcoal-900">النبذة</h2>
            <div className="space-y-4">
              <Field id="trainer-shortBio" label="نبذة قصيرة" hint="سطر واحد يظهر في البطاقات">
                <Textarea
                  id="trainer-shortBio"
                  value={draft.shortBio}
                  onChange={(event) => update({ shortBio: event.target.value })}
                  rows={2}
                  placeholder="مصور محترف بخبرة تتجاوز 12 عامًا…"
                />
              </Field>
              <Field
                id="trainer-bio"
                label="نبذة كاملة"
                hint="افصل بين الفقرات بسطر فارغ"
              >
                <Textarea
                  id="trainer-bio"
                  value={draft.bio}
                  onChange={(event) => update({ bio: event.target.value })}
                  rows={5}
                  placeholder="المسيرة المهنية… التخصصات… أسلوب التدريب…"
                />
              </Field>
            </div>
          </section>

          {/* المهارات */}
          <section className="rounded-xl border border-border bg-white p-4 sm:p-6">
            <h2 className="mb-4 text-sm font-semibold text-charcoal-900">المهارات</h2>
            <Repeater
              label="مهارات المدرب"
              items={draft.skills}
              onChange={(skills) => update({ skills })}
              addLabel="إضافة مهارة"
              placeholder="مثال: إضاءة الاستوديو"
            />
          </section>

          {/* الروابط */}
          <section className="rounded-xl border border-border bg-white p-4 sm:p-6">
            <h2 className="mb-4 text-sm font-semibold text-charcoal-900">
              روابط التواصل <span className="text-xs font-normal text-muted-foreground">(اختيارية)</span>
            </h2>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field id="trainer-instagram" label="Instagram" error={errors.instagram}>
                <Input
                  id="trainer-instagram"
                  value={draft.instagram ?? ""}
                  onChange={(event) => update({ instagram: event.target.value })}
                  placeholder="https://instagram.com/…"
                  dir="ltr"
                  className="font-latin"
                  inputMode="url"
                  aria-invalid={Boolean(errors.instagram)}
                />
              </Field>
              <Field id="trainer-linkedin" label="LinkedIn" error={errors.linkedin}>
                <Input
                  id="trainer-linkedin"
                  value={draft.linkedin ?? ""}
                  onChange={(event) => update({ linkedin: event.target.value })}
                  placeholder="https://linkedin.com/in/…"
                  dir="ltr"
                  className="font-latin"
                  inputMode="url"
                  aria-invalid={Boolean(errors.linkedin)}
                />
              </Field>
              <Field id="trainer-website" label="الموقع الشخصي" error={errors.website}>
                <Input
                  id="trainer-website"
                  value={draft.website ?? ""}
                  onChange={(event) => update({ website: event.target.value })}
                  placeholder="https://example.com"
                  dir="ltr"
                  className="font-latin"
                  inputMode="url"
                  aria-invalid={Boolean(errors.website)}
                />
              </Field>
            </div>
          </section>
        </div>

        {/* العمود الجانبي: الصورة + الحالة */}
        <div className="space-y-4">
          <section className="rounded-xl border border-border bg-white p-4 sm:p-6">
            <h2 className="mb-4 text-sm font-semibold text-charcoal-900">صورة المدرب</h2>
            <ImageUpload
              folder="trainers"
              id="trainer-image"
              label="الصورة"
              value={draft.image}
              alt={draft.imageAlt ?? ""}
              aspect="square"
              onChange={({ value, alt }) => update({ image: value, imageAlt: alt })}
              hint="رفع تجريبي — المعاينة محلية في هذه الجلسة فقط."
            />
          </section>

          <section className="rounded-xl border border-border bg-white p-4 sm:p-6">
            <h2 className="mb-4 text-sm font-semibold text-charcoal-900">الحالة</h2>
            <div className="flex items-center justify-between gap-4 rounded-xl border border-border bg-surface/60 p-4">
              <div>
                <p className="text-sm font-medium text-charcoal-800">
                  {draft.status === "active" ? "نشط" : "مخفي"}
                </p>
                <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                  المخفي لا يظهر في اختيار مدربي الدورات الجديدة، وتبقى علاقاته القائمة محفوظة.
                </p>
              </div>
              <Switch
                checked={draft.status === "active"}
                onCheckedChange={(checked) => update({ status: checked ? "active" : "hidden" })}
                aria-label="حالة المدرب (نشط / مخفي)"
              />
            </div>
          </section>

          {/* الدورات المرتبطة — عرض فقط */}
          {mode === "edit" ? (
            <section className="rounded-xl border border-border bg-white p-4 sm:p-6">
              <h2 className="mb-3 text-sm font-semibold text-charcoal-900">الدورات المرتبطة</h2>
              {linkedCourses.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  لا توجد دورات مرتبطة بهذا المدرب حاليًا — يمكن حذفه بأمان عند الحاجة.
                </p>
              ) : (
                <ul className="space-y-2">
                  {linkedCourses.map((course) => (
                    <li key={course.id}>
                      <Link
                        href={`/admin/courses/${course.id}`}
                        className="flex items-center justify-between gap-2 rounded-lg border border-border px-3 py-2 text-sm text-charcoal-700 transition-colors hover:border-brand-200 hover:text-brand-700"
                      >
                        <span className="truncate">{course.name}</span>
                        <span className="num-ltr shrink-0 text-xs text-charcoal-400">
                          {formatNumber(course.pricing.price)} ريال
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
              <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                حذف مدرب مرتبط بدورات محجوب من القائمة — البديل الآمن هو التحويل إلى مخفي.
              </p>
            </section>
          ) : null}
        </div>
      </div>

      {/* شريط الحفظ الثابت */}
      <div className="sticky bottom-0 -mx-4 mt-6 border-t border-border bg-white px-4 py-3 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3">
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
            <Button onClick={handleSave}>حفظ المدرب</Button>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={cancelConfirmOpen}
        onOpenChange={setCancelConfirmOpen}
        title="تجاهل التغييرات؟"
        description="لديك تعديلات غير محفوظة ستُفقد عند المغادرة. هل تريد المتابعة دون حفظ؟"
        confirmLabel="تجاهل التغييرات"
        onConfirm={() => router.push("/admin/trainers")}
      />
    </div>
  );
}
