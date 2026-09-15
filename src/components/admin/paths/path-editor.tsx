"use client";

/**
 * PathEditor — محرر المسار (المهمة #13)
 * ---------------------------------------
 * نفس المكوّن للإضافة (new) والتعديل ([id]) — نمط محرر الدورة/المدرب:
 * مسودة + لقطة حفظ + Dirty (beforeunload + تأكيد إلغاء) + Validation
 * + Toast (بلا alert).
 *
 * القواعد المعتمدة (موثقة):
 * - المسار يخزّن مراجع الدورات بالمعرّف فقط (courseIds) — لا نسخ لبيانات
 *   الدورات داخل المسار (Path ≠ Course).
 * - التسعير Derived بالكامل: الإجمالي الأصلي وقيمة الخصم والسعر النهائي
 *   تُحسب لحظيًا من أسعار الدورات المرتبطة عبر getPathPricing — لا يُخزَّن
 *   السعر النهائي أبدًا (قرار D-09). تغيّر سعر أي دورة مرتبطة ينعكس فورًا.
 * - الخصم 0–100 فقط — يُقيد عند الإدخال (رفض السالب وأكبر من 100).
 * - الدورة المسودة تُحذَّر داخل المحرر (تبقى في المسار ولا تُنزع قسرًا).
 */
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  CircleAlert,
  LoaderCircle,
  RefreshCw,
  X,
} from "lucide-react";

import type { AdminCourse, AdminLearningPath } from "@/data/admin/types";
import type { PathInput } from "@/context/admin-store";
import { useAdminActions, useAdminData, useAdminState } from "@/context/admin-store";
import { getPathPricing } from "@/data/admin/selectors";
import { formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  COURSE_LEVEL_OPTIONS,
  SLUG_PATTERN,
  courseDurationLabel,
  coursePriceLabel,
  courseTypeLabel,
} from "@/components/admin/courses/course-meta";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { AdminPageHeader } from "@/components/admin/ui/admin-page-header";
import { ConfirmDialog } from "@/components/admin/ui/confirm-dialog";
import { EmptyState } from "@/components/admin/ui/empty-state";
import { Field } from "@/components/admin/ui/field";
import { ImageUpload } from "@/components/admin/ui/image-upload";

const PUBLISH_STATUS_OPTIONS: Array<{ value: AdminLearningPath["status"]; label: string }> = [
  { value: "draft", label: "مسودة" },
  { value: "published", label: "منشور" },
];

/** قيد نسبة الخصم على حدود 0–100 — رفض فوري للسالب وما يتجاوز 100 */
function clampDiscount(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(100, Math.max(0, Math.round(value)));
}

function createDraftDefaults(): PathInput {
  return {
    name: "",
    slug: "",
    image: "",
    imageAlt: "",
    excerpt: "",
    description: "",
    level: "beginner",
    status: "draft",
    courseIds: [],
    discountPercent: 0,
    featured: false,
  };
}

/** إسقاط حقول الهوية لتحويل المسار إلى مسودة قابلة للتعديل */
function toDraft(path: AdminLearningPath): PathInput {
  const { id: _id, ...rest } = path;
  return rest;
}

function validateDraft(
  draft: PathInput,
  existingSlugs: Array<{ id: string; slug: string }>,
  excludeId?: string,
): Record<string, string> {
  const errors: Record<string, string> = {};

  if (!draft.name.trim()) errors.name = "اسم المسار مطلوب";

  const slug = draft.slug.trim();
  if (!slug) {
    errors.slug = "الـ slug مطلوب للرابط الدائم";
  } else if (!SLUG_PATTERN.test(slug)) {
    errors.slug = "صيغة الـ slug غير صحيحة — أحرف لاتينية صغيرة وأرقام وشرطات فقط";
  } else if (existingSlugs.some((path) => path.slug === slug && path.id !== excludeId)) {
    errors.slug = "الـ slug مستخدم مع مسار آخر — اختر قيمة فريدة";
  }

  if (draft.discountPercent < 0 || draft.discountPercent > 100) {
    errors.discountPercent = "نسبة الخصم بين 0 و100";
  }

  return errors;
}

/* ─────────────────── صف دورة داخل المسار ─────────────────── */

interface CourseRowProps {
  course: AdminCourse;
  index: number;
  total: number;
  onMove: (index: number, direction: -1 | 1) => void;
  onRemove: (courseId: string) => void;
}

function CourseRow({ course, index, total, onMove, onRemove }: CourseRowProps) {
  const price = coursePriceLabel(course);
  const isDraft = course.status === "draft";

  return (
    <li className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-white p-3">
      <span
        aria-hidden="true"
        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-surface text-xs font-semibold text-charcoal-500 num-ltr"
      >
        {index + 1}
      </span>

      <span className="h-11 w-16 shrink-0 overflow-hidden rounded-lg border border-border bg-surface">
        {course.images.main ? (
          <img
            src={course.images.main}
            alt=""
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : (
          <span className="flex h-full w-full items-center justify-center text-[10px] text-charcoal-300">
            بلا صورة
          </span>
        )}
      </span>

      <div className="min-w-0 flex-1">
        <Link
          href={`/admin/courses/${course.id}`}
          className="block max-w-[260px] truncate text-sm font-medium text-charcoal-800 hover:text-brand-700"
        >
          {course.name}
        </Link>
        <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
          <span>{courseTypeLabel(course.type)}</span>
          <span aria-hidden="true">•</span>
          <span>{courseDurationLabel(course)}</span>
          <span aria-hidden="true">•</span>
          <span className={cn(price.muted ? "text-charcoal-400" : "text-charcoal-700")}>
            {price.text}
          </span>
          {isDraft ? (
            <span className="inline-flex items-center gap-1 font-medium text-brand-700">
              <AlertTriangle aria-hidden="true" className="h-3 w-3" />
              مسودة — غير منشورة بعد
            </span>
          ) : null}
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-0.5">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-11 w-11 lg:h-8 lg:w-8 text-charcoal-500"
          onClick={() => onMove(index, -1)}
          disabled={index === 0}
          aria-label={`نقل الدورة ${course.name} للأعلى`}
        >
          <ArrowUp aria-hidden="true" className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-11 w-11 lg:h-8 lg:w-8 text-charcoal-500"
          onClick={() => onMove(index, 1)}
          disabled={index === total - 1}
          aria-label={`نقل الدورة ${course.name} للأسفل`}
        >
          <ArrowDown aria-hidden="true" className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-11 w-11 lg:h-8 lg:w-8 text-brand-700 hover:bg-brand-50 hover:text-brand-700"
          onClick={() => onRemove(course.id)}
          aria-label={`إزالة الدورة ${course.name} من المسار`}
        >
          <X aria-hidden="true" className="h-4 w-4" />
        </Button>
      </div>
    </li>
  );
}

/* ─────────────────── المكون الرئيسي ─────────────────── */

interface PathEditorProps {
  mode: "create" | "edit";
  pathId?: string;
}

export function PathEditor({ mode, pathId }: PathEditorProps) {
  const router = useRouter();
  const { toast } = useToast();
  const { data, hydrated } = useAdminState();
  const { addPath, updatePath } = useAdminActions();

  const path = mode === "edit" ? data.paths.find((entry) => entry.id === pathId) : undefined;

  /* المسودة تُهيّأ من بيانات المخزن بعد الترطيب فقط — لا من الـ Seed
     (إصلاح علة التحميل المباشر الموثقة في memory.md — نفس إصلاح محرر المدرب) */
  const [draft, setDraft] = useState<PathInput | null>(() =>
    mode === "create" ? createDraftDefaults() : hydrated && path ? toDraft(path) : null,
  );
  const [snapshot, setSnapshot] = useState<string>(() =>
    mode === "create"
      ? JSON.stringify(createDraftDefaults())
      : hydrated && path
        ? JSON.stringify(toDraft(path))
        : "",
  );

  /* تغيير المعرّف ضمن نفس المسار → إعادة تهيئة المسودة (نمط D-19) */
  const [prevId, setPrevId] = useState<string | undefined>(pathId);
  if (pathId !== prevId) {
    setPrevId(pathId);
    if (path) {
      const initial = toDraft(path);
      setSnapshot(JSON.stringify(initial));
      setDraft(initial);
    } else {
      setSnapshot("");
      setDraft(null);
    }
  }

  /* التهيئة المؤجلة بعد الترطيب (نمط ضبط أثناء الرسم — D-12).
     الشرط يشمل hydrated: بدونها تُهيَّأ المسودة من الـ Seed في أول رسم. */
  if (mode === "edit" && hydrated && draft === null && path) {
    const initial = toDraft(path);
    setSnapshot(JSON.stringify(initial));
    setDraft(initial);
  }

  const update = (patch: Partial<PathInput>) =>
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

  /* دورات المسار بالترتيب المخزَّن — مراجع حية (لا نسخ) */
  const coursesInPath = useMemo(
    () =>
      draft
        ? draft.courseIds
            .map((id) => data.courses.find((course) => course.id === id))
            .filter((course): course is AdminCourse => Boolean(course))
        : [],
    [draft, data.courses],
  );

  /* الدورات المتاحة للإضافة: من المخزن فقط، وما لم تُضف مسبقًا (منع التكرار) */
  const selectableCourses = useMemo(
    () =>
      draft
        ? data.courses.filter((course) => !draft.courseIds.includes(course.id))
        : [],
    [draft, data.courses],
  );

  /* التسعير Derived — يُحسب لحظيًا ولا يُخزَّن (قرار D-09) */
  const pricing = useMemo(
    () =>
      draft
        ? getPathPricing({ courseIds: draft.courseIds, discountPercent: draft.discountPercent }, data.courses)
        : { coursesCount: 0, originalTotal: 0, discountPercent: 0, discountValue: 0, finalPrice: 0 },
    [draft, data.courses],
  );

  const draftCourses = coursesInPath.filter((course) => course.status === "draft");

  if (mode === "edit" && hydrated && !path) {
    return (
      <div className="mx-auto w-full max-w-6xl">
        <EmptyState title="المسار غير موجود" description="ربما حُذف هذا المسار أو أن الرابط غير صحيح.">
          <Button asChild size="sm">
            <Link href="/admin/paths">العودة لقائمة المسارات</Link>
          </Button>
        </EmptyState>
      </div>
    );
  }

  if (!draft) {
    return (
      <div className="mx-auto flex w-full max-w-6xl items-center justify-center py-24 text-charcoal-300">
        <LoaderCircle aria-hidden="true" className="h-6 w-6 animate-spin" />
        <span className="sr-only">جارٍ تحميل بيانات المسار…</span>
      </div>
    );
  }

  function addCourseToPath(courseId: string) {
    if (!draft || !courseId) return;
    if (draft.courseIds.includes(courseId)) return; /* منع التكرار */
    update({ courseIds: [...draft.courseIds, courseId] });
  }

  function removeCourseFromPath(courseId: string) {
    if (!draft) return;
    update({ courseIds: draft.courseIds.filter((id) => id !== courseId) });
  }

  function moveCourseInPath(index: number, direction: -1 | 1) {
    if (!draft) return;
    const target = index + direction;
    if (target < 0 || target >= draft.courseIds.length) return;
    const next = [...draft.courseIds];
    [next[index], next[target]] = [next[target], next[index]];
    update({ courseIds: next });
  }

  function generateSlug() {
    update({ slug: `path-${Date.now().toString(36)}` });
  }

  async function handleSave() {
    if (!draft) return;
    const validation = validateDraft(
      draft,
      data.paths.map((entry) => ({ id: entry.id, slug: entry.slug })),
      pathId,
    );
    setErrors(validation);

    const errorKeys = Object.keys(validation);
    if (errorKeys.length > 0) {
      document
        .getElementById(`path-${errorKeys[0]}`)
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
      toast({
        title: "تعذر الحفظ — راجع الحقول",
        description: validation[errorKeys[0]],
        variant: "destructive",
      });
      return;
    }

    const clean: PathInput = {
      ...draft,
      name: draft.name.trim(),
      slug: draft.slug.trim(),
    };

    if (mode === "create") {
      const result = await addPath(clean);
      if (!result.ok) {
        toast({ title: "تعذر إنشاء المسار", description: result.error, variant: "destructive" });
        return;
      }
      toast({
        title: "تم إنشاء المسار",
        description: `أُضيف «${clean.name}» إلى قائمة المسارات.`,
      });
      router.push(`/admin/paths/${result.data}`);
    } else if (pathId) {
      const result = await updatePath(pathId, clean);
      if (!result.ok) {
        toast({ title: "تعذر الحفظ", description: result.error, variant: "destructive" });
        return;
      }
      toast({ title: "تم حفظ المسار", description: `حُدّث «${clean.name}» بنجاح.` });
      router.push("/admin/paths");
    }
  }

  function handleCancel() {
    if (isDirty) {
      setCancelConfirmOpen(true);
      return;
    }
    router.push("/admin/paths");
  }

  return (
    <div className="mx-auto w-full max-w-6xl pb-24">
      <AdminPageHeader
        title={mode === "create" ? "مسار جديد" : draft.name || "تعديل المسار"}
        description={
          mode === "create"
            ? "اجمع دورات متدرجة في مسار واحد — يُحسب سعر المسار تلقائيًا من أسعار دوراته."
            : "عدّل بيانات المسار — سعره النهائي يُحسب تلقائيًا من أسعار دوراته المرتبطة."
        }
      >
        {mode === "edit" && path ? (
          <Button asChild variant="outline" size="sm">
            <Link href="/admin/paths">قائمة المسارات</Link>
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
              <Field id="path-name" label="اسم المسار" required error={errors.name}>
                <Input
                  id="path-name"
                  value={draft.name}
                  onChange={(event) => update({ name: event.target.value })}
                  placeholder="مثال: مسار التصوير الفوتوغرافي الاحترافي"
                  aria-invalid={Boolean(errors.name)}
                />
              </Field>
              <Field id="path-level" label="المستوى">
                <Select
                  value={draft.level}
                  onValueChange={(value) => update({ level: value as PathInput["level"] })}
                >
                  <SelectTrigger id="path-level" aria-label="مستوى المسار">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {COURSE_LEVEL_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </div>

            <Field
              id="path-slug"
              label="الـ Slug (الرابط اللاتيني)"
              required
              error={errors.slug}
              hint="أحرف لاتينية صغيرة وأرقام وشرطات فقط — مثال: photography-professional"
              className="mt-4"
            >
              <div className="flex gap-2">
                <Input
                  id="path-slug"
                  value={draft.slug}
                  onChange={(event) => update({ slug: event.target.value })}
                  placeholder="photography-professional"
                  dir="ltr"
                  className="font-latin"
                  aria-invalid={Boolean(errors.slug)}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="shrink-0"
                  onClick={generateSlug}
                >
                  <RefreshCw aria-hidden="true" className="me-1.5 h-3.5 w-3.5" />
                  توليد
                </Button>
              </div>
            </Field>

            <div className="mt-4 flex items-center justify-between gap-4 rounded-xl border border-border bg-surface/60 p-4">
              <div>
                <p className="text-sm font-medium text-charcoal-800">مسار مميز</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  يُبرز المسار في واجهات التسويق عند توفرها
                </p>
              </div>
              <Switch
                checked={Boolean(draft.featured)}
                onCheckedChange={(checked) => update({ featured: checked })}
                aria-label="تمييز المسار"
              />
            </div>
          </section>

          {/* الأوصاف */}
          <section className="rounded-xl border border-border bg-white p-4 sm:p-6">
            <h2 className="mb-4 text-sm font-semibold text-charcoal-900">الأوصاف</h2>
            <div className="space-y-4">
              <Field id="path-excerpt" label="وصف مختصر" hint="سطر تعريفي يظهر في بطاقة المسار">
                <Textarea
                  id="path-excerpt"
                  value={draft.excerpt}
                  onChange={(event) => update({ excerpt: event.target.value })}
                  rows={2}
                  placeholder="مسار متدرج يأخذك من الأساسيات إلى الاحتراف…"
                />
              </Field>
              <Field
                id="path-description"
                label="الوصف الكامل"
                hint="افصل بين الفقرات بسطر فارغ — تظهر كل فقرة ككتلة مستقلة"
              >
                <Textarea
                  id="path-description"
                  value={draft.description}
                  onChange={(event) => update({ description: event.target.value })}
                  rows={5}
                  placeholder="فكرة المسار… لمن صُمم… ماذا يحقق للمتدرب…"
                />
              </Field>
            </div>
          </section>

          {/* دورات المسار — مراجع بالمعرّف فقط */}
          <section className="rounded-xl border border-border bg-white p-4 sm:p-6">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-charcoal-900">
                دورات المسار
                <span className="ms-2 text-xs font-normal text-muted-foreground num-ltr">
                  ({formatNumber(draft.courseIds.length)})
                </span>
              </h2>
              <p className="text-xs text-muted-foreground">الترتيب هنا هو ترتيب التعلم</p>
            </div>

            <Field
              id="path-add-course"
              label="إضافة دورة من المخزن"
              hint={
                selectableCourses.length === 0
                  ? "كل دورات المخزن مضافة بالفعل — أنشئ دورة جديدة لإضافتها."
                  : "تظهر الدورات غير المضافة فقط — لا يمكن تكرار دورة داخل المسار."
              }
            >
              <Select
                value=""
                onValueChange={(value) => {
                  addCourseToPath(value);
                }}
                disabled={selectableCourses.length === 0}
              >
                <SelectTrigger id="path-add-course" aria-label="إضافة دورة إلى المسار">
                  <SelectValue placeholder="+ اختر دورة لإضافتها…" />
                </SelectTrigger>
                <SelectContent>
                  {selectableCourses.map((course) => (
                    <SelectItem key={course.id} value={course.id}>
                      <span className="flex items-center gap-2">
                        {course.name}
                        <span className="text-xs text-charcoal-400 num-ltr">
                          {formatNumber(course.pricing.price)} ريال
                        </span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            {coursesInPath.length === 0 ? (
              <p className="mt-4 rounded-xl border border-dashed border-charcoal-200 bg-surface/40 p-4 text-center text-xs text-muted-foreground">
                لا دورات في هذا المسار بعد — أضف دورتين أو أكثر ليصبح للمسار سعر.
              </p>
            ) : (
              <ul className="mt-4 space-y-2">
                {coursesInPath.map((course, index) => (
                  <CourseRow
                    key={course.id}
                    course={course}
                    index={index}
                    total={coursesInPath.length}
                    onMove={moveCourseInPath}
                    onRemove={removeCourseFromPath}
                  />
                ))}
              </ul>
            )}
          </section>

          {/* التسعير — Derived بالكامل */}
          <section className="rounded-xl border border-border bg-white p-4 sm:p-6">
            <h2 className="mb-1 text-sm font-semibold text-charcoal-900">تسعير المسار</h2>
            <p className="mb-4 text-xs leading-relaxed text-muted-foreground">
              يُحسب تلقائيًا من أسعار الدورات المرتبطة — تغيّر سعر أي دورة ينعكس هنا فورًا.
              السعر النهائي قيمة مشتقة ولا تُخزَّن.
            </p>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                id="path-discountPercent"
                label="نسبة خصم المسار %"
                error={errors.discountPercent}
                hint="بين 0 و100 — مثال: 20 تعني وفّر خُمس الإجمالي"
              >
                <Input
                  id="path-discountPercent"
                  type="number"
                  min={0}
                  max={100}
                  step={5}
                  inputMode="numeric"
                  value={draft.discountPercent}
                  onChange={(event) =>
                    update({ discountPercent: clampDiscount(Number(event.target.value)) })
                  }
                  className="num-ltr bg-white"
                  aria-invalid={Boolean(errors.discountPercent)}
                />
              </Field>
              <div className="rounded-xl border border-border bg-surface/60 p-4">
                <p className="text-xs font-medium text-charcoal-800">توفير المتدرب</p>
                <p className="mt-1 text-xl font-bold text-brand-600 num-ltr">
                  {formatNumber(pricing.discountValue)} ريال
                </p>
                <p className="mt-1 text-xs text-muted-foreground num-ltr">
                  {formatNumber(pricing.originalTotal)} − {formatNumber(pricing.discountPercent)}% ={" "}
                  {formatNumber(pricing.finalPrice)} ريال
                </p>
              </div>
            </div>

            {/* ملخص التسعير الحي */}
            <dl className="mt-4 overflow-hidden rounded-xl border border-border text-sm">
              <div className="flex items-center justify-between gap-3 border-b border-border bg-surface/40 px-4 py-2.5">
                <dt className="text-muted-foreground">
                  إجمالي أسعار الدورات
                  <span className="ms-1 num-ltr">({formatNumber(pricing.coursesCount)})</span>
                </dt>
                <dd className="font-medium text-charcoal-800 num-ltr">
                  {formatNumber(pricing.originalTotal)} ريال
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-2.5">
                <dt className="text-muted-foreground">نسبة الخصم</dt>
                <dd className="font-medium text-charcoal-800 num-ltr">
                  {formatNumber(pricing.discountPercent)}%
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-2.5">
                <dt className="text-muted-foreground">قيمة الخصم</dt>
                <dd className="font-medium text-brand-700 num-ltr">
                  − {formatNumber(pricing.discountValue)} ريال
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3 bg-brand-50/60 px-4 py-3">
                <dt className="font-semibold text-charcoal-900">السعر النهائي للمسار</dt>
                <dd className="text-lg font-bold text-brand-700 num-ltr">
                  {formatNumber(pricing.finalPrice)} ريال
                </dd>
              </div>
            </dl>
          </section>
        </div>

        {/* العمود الجانبي */}
        <div className="space-y-4">
          <section className="rounded-xl border border-border bg-white p-4 sm:p-6">
            <h2 className="mb-4 text-sm font-semibold text-charcoal-900">صورة المسار</h2>
            <ImageUpload
              folder="paths"
              id="path-image"
              label="الصورة"
              value={draft.image}
              alt={draft.imageAlt}
              aspect="video"
              onChange={({ value, alt }) => update({ image: value, imageAlt: alt })}
              hint="رفع تجريبي — المعاينة محلية في هذه الجلسة فقط."
            />
          </section>

          <section className="rounded-xl border border-border bg-white p-4 sm:p-6">
            <h2 className="mb-4 text-sm font-semibold text-charcoal-900">حالة النشر</h2>
            <Field
              id="path-status"
              label="حالة المسار"
              hint="الحالة المصدر الوحيد للنشر — المسار المنشور يظهر على الموقع عند الربط"
            >
              <Select
                value={draft.status}
                onValueChange={(value) =>
                  update({ status: value as AdminLearningPath["status"] })
                }
              >
                <SelectTrigger id="path-status" aria-label="حالة المسار">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PUBLISH_STATUS_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            {draft.status === "published" && draft.courseIds.length === 0 ? (
              <p className="mt-3 flex items-start gap-1.5 rounded-lg border border-brand-200 bg-brand-50 p-3 text-xs leading-relaxed text-brand-700">
                <CircleAlert aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                مسار منشور بلا دورات — أضف دورات قبل اعتماده على الموقع.
              </p>
            ) : null}
          </section>

          {/* تنبيهات المحرر */}
          {draftCourses.length > 0 ? (
            <section className="rounded-xl border border-brand-200 bg-brand-50/60 p-4 sm:p-6">
              <h2 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-brand-700">
                <AlertTriangle aria-hidden="true" className="h-4 w-4" />
                تنبيهات
              </h2>
              <p className="text-xs leading-relaxed text-brand-700">
                <span className="num-ltr font-semibold">{formatNumber(draftCourses.length)}</span>{" "}
                من دورات هذا المسار ما زالت <strong>مسودة</strong>:{" "}
                {draftCourses.map((course) => `«${course.name}»`).join("، ")}. تبقى في المسار
                ولا تُنزع قسرًا — انشرها أو استبدلها حسب خطة المسار.
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
            <Button onClick={handleSave}>حفظ المسار</Button>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={cancelConfirmOpen}
        onOpenChange={setCancelConfirmOpen}
        title="تجاهل التغييرات؟"
        description="لديك تعديلات غير محفوظة ستُفقد عند المغادرة. هل تريد المتابعة دون حفظ؟"
        confirmLabel="تجاهل التغييرات"
        onConfirm={() => router.push("/admin/paths")}
      />
    </div>
  );
}
