"use client";

/**
 * باني محتوى الدورة الأونلاين — الوحدات والدروس والوصول.
 *
 * شاشة مستقلة عن محرر الدورة عمدًا: حفظ الدورة يمر بمعاملة
 * `save_course_atomic` التي أُغلق بها HIGH، ولا سبب لربط نشر درس بحفظ
 * الدورة كلها. كل إجراء هنا يحفظ نفسه فورًا ويعيد قراءة الصفحة.
 *
 * معرّف الفيديو يُكتب ولا يُقرأ هنا: القاعدة لا تمنح العمود لـanon، والخادم
 * لا يُرجعه في شكل العرض. ولهذا لا ترسله أزرار التبديل أصلًا — إرسال قيمة
 * فارغة كان يمحوه من القاعدة بضغطة عَلَم.
 *
 * والمعاينة تمر بمسار إداري يفحص الصلاحية على الخادم، لا بمعامل عام في
 * الرابط. لا `?preview=true` ولا ما يشبهه بحال.
 */

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState, useTransition } from "react";
import {
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Clock3,
  Eye,
  FileText,
  GripVertical,
  LayoutList,
  ListVideo,
  Loader2,
  Pencil,
  Plus,
  Trash2,
  Unlock,
  Video,
} from "lucide-react";

import { AdminPageHeader } from "@/components/admin/ui/admin-page-header";
import { ConfirmDialog } from "@/components/admin/ui/confirm-dialog";
import { Field } from "@/components/admin/ui/field";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { formatLessonDuration, formatTotalDuration } from "@/lib/learning/format";
import {
  STATUS_LABEL,
  courseReadiness,
  lessonStatus,
  moduleStatus,
  type ContentStatus,
  type ReadinessReport,
} from "@/lib/learning/readiness";
import { cn } from "@/lib/utils";
import type { ActionResult } from "@/lib/cms/result";
import type { EnrollmentStatus } from "@/lib/learning/access";
import type { ModuleSummary } from "@/lib/learning/content";
import { moveItem } from "@/lib/learning/reorder";
import { LessonForm, type LessonDraft, type LessonFormValue } from "@/components/admin/learning/lesson-form";
import {
  createLessonAction,
  createModuleAction,
  deleteEnrollmentAction,
  deleteLessonAction,
  deleteModuleAction,
  grantEnrollmentAction,
  reorderLessonsAction,
  reorderModulesAction,
  setEnrollmentStatusAction,
  updateLessonAction,
  updateModuleAction,
} from "@/app/admin/actions/learning";

export interface EnrollmentView {
  id: string;
  email: string;
  source: string;
  status: EnrollmentStatus;
  grantedAt: string;
  expiresAt: string | null;
}

/** حقائق الدورة التي تقيسها لوحة الجاهزية — لا تُعدَّل من هنا. */
export interface CourseFacts {
  hasImage: boolean;
  price: number;
  requestQuote: boolean;
  isFree: boolean;
  published: boolean;
}

const STATUS_STYLE: Record<ContentStatus, string> = {
  draft: "bg-charcoal-100 text-charcoal-600",
  ready: "bg-amber-100 text-amber-800",
  published: "bg-emerald-100 text-emerald-800",
};

const ENROLLMENT_LABEL: Record<EnrollmentStatus, string> = {
  pending: "قيد التأكيد",
  active: "فعّال",
  cancelled: "ملغى",
  expired: "منتهٍ",
  refunded: "مسترد",
};

type Runner = (operation: () => Promise<ActionResult<unknown>>, success: string) => void;
type Lesson = ModuleSummary["lessons"][number];

function StatusBadge({ status }: { status: ContentStatus }) {
  return (
    <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold", STATUS_STYLE[status])}>
      {STATUS_LABEL[status]}
    </span>
  );
}

export function CourseContentManager({
  courseId,
  courseName,
  courseSlug,
  isOnline,
  course,
  modules,
  enrollments,
  streamingReady,
  canEdit,
  backHref,
}: {
  courseId: string;
  courseName: string;
  courseSlug: string;
  isOnline: boolean;
  course: CourseFacts;
  modules: ModuleSummary[];
  enrollments: EnrollmentView[];
  streamingReady: boolean;
  canEdit: boolean;
  backHref: string;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, start] = useTransition();
  const [creatingModule, setCreatingModule] = useState(false);

  const run: Runner = (operation, success) =>
    start(async () => {
      const result = await operation();
      if (result.ok) {
        toast({ title: success });
        router.refresh();
      } else {
        toast({ title: "لم يكتمل الإجراء", description: result.error, variant: "destructive" });
      }
    });

  const disabled = !canEdit || pending;
  const moduleIds = modules.map((module) => module.id);
  const lessons = modules.flatMap((module) => module.lessons);
  const totalSeconds = lessons.reduce((sum, lesson) => sum + lesson.durationSeconds, 0);
  const freeCount = lessons.filter((lesson) => lesson.freePreview).length;
  const readiness = courseReadiness({
    courseName,
    hasImage: course.hasImage,
    price: course.price,
    requestQuote: course.requestQuote,
    isFree: course.isFree,
    coursePublished: course.published,
    modules: modules.map((module) => ({
      published: module.published,
      lessons: module.lessons.map((lesson) => ({
        published: lesson.published,
        freePreview: lesson.freePreview,
        lessonType: lesson.lessonType,
        hasVideo: lesson.hasVideo,
        durationSeconds: lesson.durationSeconds,
      })),
    })),
  });

  /* المعاينة تبدأ من أول درس منشور في وحدة منشورة — وهو ما يراه الطالب
     فعلًا — وإلا من أول درس موجود. */
  const previewLesson =
    modules.filter((module) => module.published).flatMap((module) => module.lessons).find((lesson) => lesson.published) ??
    lessons[0];
  const previewHref = (lessonId: string) => `/admin/courses/${courseId}/content/preview/${lessonId}`;

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      <Link
        href={backHref}
        className="inline-flex min-h-11 items-center gap-1.5 text-sm text-brand-700 hover:underline lg:min-h-0"
      >
        <ArrowRight aria-hidden="true" className="h-4 w-4" />
        عودة إلى محرر الدورة
      </Link>

      <AdminPageHeader title="محتوى الدورة" description="أنشئ وحدات الدورة وأضف الدروس ورتبها بسهولة.">
        {previewLesson ? (
          <Button asChild variant="outline" size="sm" className="gap-1.5">
            <Link href={previewHref(previewLesson.id)}>
              <Eye aria-hidden="true" className="h-4 w-4" />
              معاينة كطالب
            </Link>
          </Button>
        ) : null}
      </AdminPageHeader>

      <p className="-mt-4 flex flex-wrap items-center gap-2 text-sm font-medium text-charcoal-500">
        {courseName}
        {/* حالة الحفظ معلنة، لا مستنتَجة من أزرار رمادية. */}
        {pending ? (
          <span role="status" className="inline-flex items-center gap-1.5 text-xs font-normal text-brand-700">
            <Loader2 aria-hidden="true" className="h-3.5 w-3.5 animate-spin" />
            جارٍ الحفظ…
          </span>
        ) : null}
      </p>

      {!isOnline ? (
        <Notice>
          تصنيف هذه الدورة ليس «أونلاين». يمكنك تجهيز المحتوى الآن، لكنه لن يظهر كدورة أونلاين
          للزائر حتى تغيّر التصنيف من محرر الدورة.
        </Notice>
      ) : null}

      {!streamingReady ? (
        <Notice>
          إعداد بث الفيديو غير مضبوط على الخادم. يمكنك إدخال الدروس ومعرّفات الفيديو الآن، لكن
          المشغّل لن يعمل قبل ضبطه — ولا يُعرض فيديو بلا رابط موقّع بحال.
        </Notice>
      ) : null}

      {!canEdit ? (
        <p
          role="note"
          className="rounded-xl border border-charcoal-200 bg-surface px-4 py-3 text-xs leading-relaxed text-charcoal-600"
        >
          العرض فقط — تعديل المحتوى يحتاج صلاحية تحرير الدورات.
        </p>
      ) : null}

      {modules.length > 0 ? (
        <section aria-label="ملخص المحتوى" className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat icon={LayoutList} label="عدد الوحدات" value={String(modules.length)} />
          <Stat icon={ListVideo} label="عدد الدروس" value={String(lessons.length)} />
          <Stat
            icon={Clock3}
            label="إجمالي المدة"
            value={totalSeconds > 0 ? formatTotalDuration(totalSeconds) : "—"}
          />
          <Stat icon={Unlock} label="دروس مجانية" value={String(freeCount)} />
        </section>
      ) : null}

      <ReadinessPanel report={readiness} />

      {modules.length === 0 ? (
        <section className="rounded-xl border border-dashed border-charcoal-200 bg-surface p-8 text-center sm:p-10">
          <LayoutList aria-hidden="true" className="mx-auto h-9 w-9 text-charcoal-300" />
          <h2 className="mt-3 text-base font-bold text-charcoal-900">ابدأ ببناء محتوى دورتك</h2>
          <p className="mx-auto mt-1.5 max-w-sm text-sm leading-relaxed text-charcoal-500">
            أنشئ الوحدة الأولى، ثم أضف الدروس إليها.
          </p>
          <Button className="mt-5 gap-1.5" disabled={disabled} onClick={() => setCreatingModule(true)}>
            <Plus aria-hidden="true" className="h-4 w-4" />
            إنشاء الوحدة الأولى
          </Button>
        </section>
      ) : (
        <div className="space-y-4">
          {modules.map((module, index) => (
            <ModuleCard
              key={module.id}
              index={index}
              total={modules.length}
              module={module}
              previewHref={previewHref}
              disabled={disabled}
              run={run}
              onReorder={(to) =>
                run(() => reorderModulesAction(moveItem(moduleIds, index, to)), "تم تغيير ترتيب الوحدات")
              }
            />
          ))}
          <Button
            variant="outline"
            className="w-full gap-1.5"
            disabled={disabled}
            onClick={() => setCreatingModule(true)}
          >
            <Plus aria-hidden="true" className="h-4 w-4" />
            إضافة وحدة جديدة
          </Button>
        </div>
      )}

      <ModuleDialog
        open={creatingModule}
        onOpenChange={setCreatingModule}
        title="وحدة جديدة"
        disabled={disabled}
        onSubmit={(draft) => {
          run(() => createModuleAction({ courseId, title: draft.title, summary: draft.summary }), "تم إنشاء الوحدة");
          setCreatingModule(false);
        }}
      />

      <EnrollmentPanel courseId={courseId} enrollments={enrollments} disabled={disabled} run={run} />

      <p className="text-center text-xs text-charcoal-400">
        صفحة الدورة العامة:{" "}
        <Link href={`/courses/${courseSlug}`} className="text-brand-700 hover:underline">
          /courses/{courseSlug}
        </Link>
      </p>
    </div>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-white p-3">
      <p className="flex items-center gap-1.5 text-xs text-charcoal-500">
        <Icon aria-hidden className="h-3.5 w-3.5 text-brand-500" />
        {label}
      </p>
      <p className="num-ltr mt-1 text-lg font-bold text-charcoal-900">{value}</p>
    </div>
  );
}

function Notice({ children }: { children: React.ReactNode }) {
  return (
    <p
      role="note"
      className="rounded-xl border border-brand-200 bg-brand-50 px-4 py-3 text-xs leading-relaxed text-brand-800"
    >
      {children}
    </p>
  );
}

/**
 * لوحة الجاهزية — إرشاد للمحرر لا قاعدة أمان.
 * لا تمنع شيئًا ولا تسمح بشيء؛ تقيس ما تراه القاعدة أصلًا.
 */
function ReadinessPanel({ report }: { report: ReadinessReport }) {
  return (
    <section aria-labelledby="readiness-title" className="rounded-xl border border-border bg-white p-4 sm:p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="readiness-title" className="text-sm font-bold text-charcoal-900">
          جاهزية الدورة
        </h2>
        <p className="num-ltr text-lg font-bold text-brand-700">{report.percent}%</p>
      </div>
      <div
        role="progressbar"
        aria-valuenow={report.percent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-labelledby="readiness-title"
        className="mt-2 h-2 overflow-hidden rounded-full bg-charcoal-100"
      >
        <div className="h-full rounded-full bg-brand-600 transition-all" style={{ width: `${report.percent}%` }} />
      </div>
      <ul className="mt-4 space-y-2">
        {report.items.map((item) => (
          <li key={item.id} className="flex items-start gap-2 text-sm">
            <span
              aria-hidden="true"
              className={cn(
                "mt-0.5 shrink-0 text-base leading-none",
                item.tone === "done"
                  ? "text-emerald-600"
                  : item.tone === "warn"
                    ? "text-amber-600"
                    : "text-charcoal-300",
              )}
            >
              {item.tone === "done" ? "✓" : item.tone === "warn" ? "⚠" : "○"}
            </span>
            <span className="min-w-0">
              <span className={item.tone === "done" ? "text-charcoal-600" : "text-charcoal-900"}>{item.label}</span>
              {item.detail ? (
                <span className="mt-0.5 block text-xs leading-relaxed text-charcoal-500">{item.detail}</span>
              ) : null}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

interface ModuleDraft {
  title: string;
  summary: string;
  published: boolean;
}

function ModuleDialog({
  open,
  onOpenChange,
  title,
  disabled,
  initial,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  disabled: boolean;
  initial?: ModuleDraft;
  onSubmit: (draft: ModuleDraft) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        {/* المفتاح يعيد بناء النموذج عند كل فتح، فلا تبقى قيمة سابقة. */}
        {open ? <ModuleFields key={String(open)} disabled={disabled} initial={initial} onSubmit={onSubmit} onCancel={() => onOpenChange(false)} /> : null}
      </DialogContent>
    </Dialog>
  );
}

function ModuleFields({
  disabled,
  initial,
  onSubmit,
  onCancel,
}: {
  disabled: boolean;
  initial?: ModuleDraft;
  onSubmit: (draft: ModuleDraft) => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [summary, setSummary] = useState(initial?.summary ?? "");
  const [published, setPublished] = useState(initial?.published ?? false);

  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        if (disabled || title.trim() === "") return;
        onSubmit({ title, summary, published });
      }}
    >
      <Field id="module-title" label="عنوان الوحدة" required>
        <Input
          id="module-title"
          value={title}
          disabled={disabled}
          autoFocus
          placeholder="مثال: أساسيات الإضاءة"
          onChange={(event) => setTitle(event.target.value)}
        />
      </Field>
      <Field id="module-summary" label="وصف مختصر" hint="يظهر تحت عنوان الوحدة في صفحة الدورة.">
        <Textarea
          id="module-summary"
          rows={3}
          value={summary}
          disabled={disabled}
          onChange={(event) => setSummary(event.target.value)}
        />
      </Field>
      {initial ? (
        <label className="flex min-h-11 items-center justify-between gap-3 rounded-lg border border-border p-3 text-sm text-charcoal-800 lg:min-h-0">
          <span>
            نشر الوحدة
            <span className="mt-0.5 block text-xs font-normal text-charcoal-500">
              الوحدة المسودة لا تظهر، ولا تظهر دروسها معها.
            </span>
          </span>
          <Switch checked={published} disabled={disabled} onCheckedChange={setPublished} />
        </label>
      ) : (
        <p className="rounded-lg border border-border bg-surface p-3 text-xs leading-relaxed text-charcoal-600">
          تُنشأ الوحدة مسودة. انشرها بعد أن تضيف دروسها.
        </p>
      )}
      <div className="flex flex-wrap justify-end gap-2 border-t border-border pt-3">
        <Button type="button" variant="ghost" disabled={disabled} onClick={onCancel}>
          إلغاء
        </Button>
        <Button type="submit" disabled={disabled || title.trim() === ""}>
          حفظ
        </Button>
      </div>
    </form>
  );
}

/** ConfirmDialog محكوم بالحالة — نغلّفه بزر يملك فتحه ليبقى الاستدعاء سطرًا. */
function DestructiveAction({
  label,
  title,
  description,
  confirmLabel,
  disabled,
  onConfirm,
  variant = "icon",
}: {
  label: string;
  title: string;
  description: string;
  confirmLabel: string;
  disabled: boolean;
  onConfirm: () => void;
  variant?: "icon" | "text";
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      {variant === "icon" ? (
        <Button
          variant="ghost"
          size="icon"
          disabled={disabled}
          aria-label={label}
          className="text-charcoal-500 hover:text-brand-700"
          onClick={() => setOpen(true)}
        >
          <Trash2 aria-hidden="true" className="h-4 w-4" />
        </Button>
      ) : (
        <Button
          variant="ghost"
          size="sm"
          disabled={disabled}
          aria-label={label}
          className="shrink-0 text-charcoal-500 hover:text-brand-700"
          onClick={() => setOpen(true)}
        >
          {confirmLabel}
        </Button>
      )}
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title={title}
        description={description}
        confirmLabel={confirmLabel}
        onConfirm={() => {
          setOpen(false);
          onConfirm();
        }}
      />
    </>
  );
}

/** بديل السحب: زرّان يعملان باللمس ولوحة المفاتيح وقارئ الشاشة. */
function ReorderButtons({
  label,
  index,
  total,
  disabled,
  onReorder,
}: {
  label: string;
  index: number;
  total: number;
  disabled: boolean;
  onReorder: (to: number) => void;
}) {
  return (
    <div className="flex shrink-0 items-center">
      <Button
        variant="ghost"
        size="icon"
        disabled={disabled || index === 0}
        aria-label={`تقديم ${label}`}
        className="text-charcoal-400 hover:text-charcoal-800"
        onClick={() => onReorder(index - 1)}
      >
        <ChevronUp aria-hidden="true" className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        disabled={disabled || index === total - 1}
        aria-label={`تأخير ${label}`}
        className="text-charcoal-400 hover:text-charcoal-800"
        onClick={() => onReorder(index + 1)}
      >
        <ChevronDown aria-hidden="true" className="h-4 w-4" />
      </Button>
    </div>
  );
}

function ModuleCard({
  index,
  total,
  module,
  previewHref,
  disabled,
  run,
  onReorder,
}: {
  index: number;
  total: number;
  module: ModuleSummary;
  previewHref: (lessonId: string) => string;
  disabled: boolean;
  run: Runner;
  onReorder: (to: number) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [addingLesson, setAddingLesson] = useState(false);
  const [editingLesson, setEditingLesson] = useState<Lesson | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const lessonIds = module.lessons.map((lesson) => lesson.id);
  const seconds = module.lessons.reduce((sum, lesson) => sum + lesson.durationSeconds, 0);

  const reorderLessons = (from: number, to: number) =>
    run(() => reorderLessonsAction(moveItem(lessonIds, from, to)), "تم تغيير ترتيب الدروس");

  return (
    <section className="overflow-hidden rounded-xl border border-border bg-white">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-border p-4 sm:px-5">
        <div className="min-w-0">
          <p className="num-ltr text-xs text-charcoal-400">الوحدة {index + 1}</p>
          <h2 className="mt-0.5 flex flex-wrap items-center gap-2 text-base font-bold text-charcoal-900">
            {module.title}
            <StatusBadge status={moduleStatus(module)} />
          </h2>
          <p className="num-ltr mt-1 text-xs text-charcoal-500">
            {module.lessons.length} درسًا{seconds > 0 ? ` · ${formatTotalDuration(seconds)}` : ""}
          </p>
          {module.summary ? (
            <p className="mt-1 max-w-xl text-xs leading-relaxed text-charcoal-500">{module.summary}</p>
          ) : null}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <ReorderButtons
            label={`وحدة ${module.title}`}
            index={index}
            total={total}
            disabled={disabled}
            onReorder={onReorder}
          />
          <Button
            variant="ghost"
            size="icon"
            disabled={disabled}
            aria-label={`تعديل وحدة ${module.title}`}
            className="text-charcoal-500 hover:text-charcoal-900"
            onClick={() => setEditing(true)}
          >
            <Pencil aria-hidden="true" className="h-4 w-4" />
          </Button>
          <DestructiveAction
            label={`حذف وحدة ${module.title}`}
            title="حذف الوحدة"
            description="سيُحذف معها كل دروسها. لا يمكن التراجع."
            confirmLabel="حذف"
            disabled={disabled}
            onConfirm={() => run(() => deleteModuleAction(module.id), "تم حذف الوحدة")}
          />
        </div>
      </header>

      {module.lessons.length === 0 ? (
        <p className="p-5 text-center text-xs text-charcoal-400">لا دروس في هذه الوحدة بعد.</p>
      ) : (
        <ul className="divide-y divide-border">
          {module.lessons.map((lesson, lessonIndex) => (
            <li
              key={lesson.id}
              draggable={!disabled}
              onDragStart={() => setDragIndex(lessonIndex)}
              onDragOver={(event) => {
                if (dragIndex !== null) event.preventDefault();
              }}
              onDrop={() => {
                if (dragIndex !== null && dragIndex !== lessonIndex) reorderLessons(dragIndex, lessonIndex);
                setDragIndex(null);
              }}
              onDragEnd={() => setDragIndex(null)}
              className={cn(
                "flex flex-wrap items-center gap-2 p-3 sm:gap-3 sm:px-5",
                dragIndex === lessonIndex && "opacity-50",
              )}
            >
              <GripVertical
                aria-hidden="true"
                className="hidden h-4 w-4 shrink-0 cursor-grab text-charcoal-300 lg:block"
              />
              <ReorderButtons
                label={`درس ${lesson.title}`}
                index={lessonIndex}
                total={module.lessons.length}
                disabled={disabled}
                onReorder={(to) => reorderLessons(lessonIndex, to)}
              />
              <span aria-hidden="true" className="num-ltr shrink-0 text-xs text-charcoal-400">
                {lessonIndex + 1}.
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-charcoal-800">{lesson.title}</p>
                <p className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-charcoal-400">
                  <span className="inline-flex items-center gap-1">
                    {lesson.lessonType === "video" ? (
                      <Video aria-hidden="true" className="h-3 w-3" />
                    ) : (
                      <FileText aria-hidden="true" className="h-3 w-3" />
                    )}
                    {lesson.lessonType === "video" ? "فيديو" : "نصي"}
                  </span>
                  {lesson.durationSeconds > 0 ? (
                    <span className="num-ltr">{formatLessonDuration(lesson.durationSeconds)}</span>
                  ) : null}
                  {lesson.freePreview ? <span className="text-brand-600">معاينة مجانية</span> : null}
                  {lesson.lessonType === "video" && !lesson.hasVideo ? (
                    <span className="text-amber-700">بلا فيديو</span>
                  ) : null}
                </p>
              </div>
              <StatusBadge status={lessonStatus(lesson)} />
              <div className="flex shrink-0 items-center">
                <Button asChild variant="ghost" size="icon" className="text-charcoal-500 hover:text-charcoal-900">
                  <Link href={previewHref(lesson.id)} aria-label={`معاينة درس ${lesson.title}`}>
                    <Eye aria-hidden="true" className="h-4 w-4" />
                  </Link>
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  disabled={disabled}
                  aria-label={`تعديل درس ${lesson.title}`}
                  className="text-charcoal-500 hover:text-charcoal-900"
                  onClick={() => setEditingLesson(lesson)}
                >
                  <Pencil aria-hidden="true" className="h-4 w-4" />
                </Button>
                <DestructiveAction
                  label={`حذف درس ${lesson.title}`}
                  title="هل تريد حذف هذا الدرس؟"
                  description="لا يمكن التراجع عن هذا الإجراء."
                  confirmLabel="حذف"
                  disabled={disabled}
                  onConfirm={() => run(() => deleteLessonAction(lesson.id), "تم حذف الدرس")}
                />
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="border-t border-border p-3 sm:px-5">
        <Button variant="ghost" className="w-full gap-1.5" disabled={disabled} onClick={() => setAddingLesson(true)}>
          <Plus aria-hidden="true" className="h-4 w-4" />
          إضافة درس
        </Button>
      </div>

      <ModuleDialog
        open={editing}
        onOpenChange={setEditing}
        title="تعديل الوحدة"
        disabled={disabled}
        initial={{ title: module.title, summary: module.summary, published: module.published }}
        onSubmit={(draft) => {
          run(
            () => updateModuleAction(module.id, draft),
            draft.published === module.published
              ? "تم حفظ الوحدة"
              : draft.published
                ? "تم نشر الوحدة"
                : "تم إلغاء النشر",
          );
          setEditing(false);
        }}
      />

      <LessonDialog
        open={addingLesson}
        onOpenChange={setAddingLesson}
        title="درس جديد"
        submitLabel="إضافة الدرس"
        disabled={disabled}
        onSubmit={(draft) => {
          run(
            () =>
              createLessonAction({
                moduleId: module.id,
                title: draft.title,
                description: draft.description,
                lessonType: draft.lessonType,
                videoId: draft.videoId ?? "",
                durationSeconds: draft.durationSeconds,
                freePreview: draft.freePreview,
                published: draft.published,
              }),
            "تم إنشاء الدرس",
          );
          setAddingLesson(false);
        }}
      />

      <LessonDialog
        open={editingLesson !== null}
        onOpenChange={(next) => {
          if (!next) setEditingLesson(null);
        }}
        title="تعديل الدرس"
        submitLabel="حفظ الدرس"
        disabled={disabled}
        value={editingLesson ? toFormValue(editingLesson) : undefined}
        onSubmit={(draft) => {
          const id = editingLesson?.id;
          if (!id) return;
          run(() => updateLessonAction(id, draft), "تم حفظ الدرس");
          setEditingLesson(null);
        }}
      />
    </section>
  );
}

function toFormValue(lesson: Lesson): LessonFormValue {
  return {
    id: lesson.id,
    title: lesson.title,
    description: lesson.description,
    lessonType: lesson.lessonType,
    durationSeconds: lesson.durationSeconds,
    freePreview: lesson.freePreview,
    published: lesson.published,
    hasVideo: lesson.hasVideo,
  };
}

function LessonDialog({
  open,
  onOpenChange,
  title,
  submitLabel,
  disabled,
  value,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  submitLabel: string;
  disabled: boolean;
  value?: LessonFormValue;
  onSubmit: (draft: LessonDraft) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        {open ? (
          <LessonForm
            key={value?.id ?? "new"}
            value={value}
            disabled={disabled}
            submitLabel={submitLabel}
            onSubmit={onSubmit}
            onCancel={() => onOpenChange(false)}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function EnrollmentPanel({
  courseId,
  enrollments,
  disabled,
  run,
}: {
  courseId: string;
  enrollments: EnrollmentView[];
  disabled: boolean;
  run: Runner;
}) {
  const [email, setEmail] = useState("");

  return (
    <section aria-label="الوصول إلى الدورة" className="rounded-xl border border-border bg-white p-4 sm:p-5">
      <h2 className="text-sm font-bold text-charcoal-900">من يملك الوصول</h2>
      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
        الوصول تفتحه حالة «فعّال» وحدها. الإلغاء يغيّر الحالة ويُبقي السجل — لا يمحوه. وحين يعمل
        الشراء ستُضاف التسجيلات «قيد التأكيد» ثم تصير فعّالة بعد تأكيد الدفع على الخادم.
      </p>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
        <Field
          id="grant-email"
          label="بريد المتدرب"
          className="flex-1"
          hint="يسجّل المتدرب حسابًا أولًا ثم تمنحه الوصول."
        >
          <Input
            id="grant-email"
            type="email"
            dir="ltr"
            autoComplete="off"
            value={email}
            disabled={disabled}
            onChange={(event) => setEmail(event.target.value)}
          />
        </Field>
        <Button
          className="sm:mb-4"
          disabled={disabled || email.trim() === ""}
          onClick={() => {
            run(() => grantEnrollmentAction(courseId, email), "تم منح الوصول");
            setEmail("");
          }}
        >
          منح الوصول
        </Button>
      </div>

      {enrollments.length === 0 ? (
        <p className="mt-2 text-xs text-charcoal-400">لا أحد مسجّل في هذه الدورة بعد.</p>
      ) : (
        <ul className="mt-4 divide-y divide-border border-t border-border">
          {enrollments.map((row) => (
            <li key={row.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
              <div className="min-w-0 flex-1">
                <p className="truncate font-latin text-sm text-charcoal-800" dir="ltr">
                  {row.email}
                </p>
                <p className="text-xs text-charcoal-400">
                  {ENROLLMENT_LABEL[row.status]} · {row.source === "purchase" ? "شراء" : "منح يدوي"}
                  {row.expiresAt ? " · بمدة" : " · دائم"}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {row.status === "active" ? (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={disabled}
                    onClick={() => run(() => setEnrollmentStatusAction(row.id, "cancelled"), "تم إلغاء التسجيل")}
                  >
                    إلغاء
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={disabled}
                    onClick={() => run(() => setEnrollmentStatusAction(row.id, "active"), "تم تفعيل التسجيل")}
                  >
                    تفعيل
                  </Button>
                )}
                <DestructiveAction
                  label={`حذف تسجيل ${row.email}`}
                  title="حذف سجل التسجيل"
                  description="الإلغاء يكفي لقطع الوصول ويُبقي الأثر. الحذف يمحو السجل نهائيًا."
                  confirmLabel="حذف"
                  variant="text"
                  disabled={disabled}
                  onConfirm={() => run(() => deleteEnrollmentAction(row.id), "تم حذف السجل")}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
