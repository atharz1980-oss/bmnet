"use client";

/**
 * محتوى الدورة الأونلاين — إدارة الوحدات والدروس والتسجيل.
 *
 * صفحة مستقلة عن محرر الدورة عمدًا: حفظ الدورة يمر بمعاملة
 * `save_course_atomic` التي أُغلق بها HIGH، ولا سبب لربط نشر درس بحفظ
 * الدورة كلها. كل إجراء هنا يحفظ نفسه فورًا ويعيد قراءة الصفحة.
 *
 * معرّف الفيديو يُكتب ولا يُقرأ هنا: القاعدة لا تمنح العمود لـanon، والخادم
 * لا يُرجعه في شكل العرض. ولهذا لا ترسله أزرار التبديل أصلًا — إرسال قيمة
 * فارغة كان يمحوه من القاعدة بضغطة عَلَم.
 */

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState, useTransition } from "react";
import { ArrowRight, ChevronDown, ChevronUp, Plus, Trash2 } from "lucide-react";

import { AdminPageHeader } from "@/components/admin/ui/admin-page-header";
import { ConfirmDialog } from "@/components/admin/ui/confirm-dialog";
import { Field } from "@/components/admin/ui/field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { formatLessonDuration } from "@/lib/learning/format";
import type { ActionResult } from "@/lib/cms/result";
import type { EnrollmentStatus } from "@/lib/learning/access";
import type { ModuleSummary } from "@/lib/learning/content";
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

const STATUS_LABEL: Record<EnrollmentStatus, string> = {
  pending: "قيد التأكيد",
  active: "فعّال",
  cancelled: "ملغى",
  expired: "منتهٍ",
  refunded: "مسترد",
};

type Runner = (operation: () => Promise<ActionResult<unknown>>, success: string) => void;

/** تبديل موضع عنصرين في قائمة معرّفات — أساس إعادة الترتيب. */
function swapped(ids: string[], index: number, delta: number): string[] {
  const target = index + delta;
  if (target < 0 || target >= ids.length) return ids;
  const next = [...ids];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

export function CourseContentManager({
  courseId,
  courseName,
  courseSlug,
  isOnline,
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
  modules: ModuleSummary[];
  enrollments: EnrollmentView[];
  streamingReady: boolean;
  canEdit: boolean;
  backHref: string;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, start] = useTransition();

  const run: Runner = (operation, success) =>
    start(async () => {
      const result = await operation();
      if (result.ok) {
        toast({ title: success });
        router.refresh();
      } else {
        toast({ title: "لم يكتمل الإجراء", description: result.error });
      }
    });

  const moduleIds = modules.map((module) => module.id);
  const disabled = !canEdit || pending;

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      <Link
        href={backHref}
        className="inline-flex min-h-11 items-center gap-1.5 text-sm text-brand-700 hover:underline lg:min-h-0"
      >
        <ArrowRight aria-hidden="true" className="h-4 w-4" />
        عودة إلى محرر الدورة
      </Link>

      <AdminPageHeader
        title={`محتوى الدورة الأونلاين — ${courseName}`}
        description="وحدات ودروس تُشاهَد بعد التسجيل. الحفظ فوري ومستقل عن حفظ الدورة."
      />

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

      <ModuleCreator courseId={courseId} disabled={disabled} run={run} />

      {modules.length === 0 ? (
        <p className="rounded-xl border border-dashed border-charcoal-200 p-8 text-center text-sm text-charcoal-500">
          لا وحدات بعد. ابدأ بإضافة الوحدة الأولى — تُنشأ مسودة حتى تنشرها.
        </p>
      ) : (
        <div className="space-y-4">
          {modules.map((module, index) => (
            <ModuleCard
              key={module.id}
              index={index}
              total={modules.length}
              module={module}
              courseSlug={courseSlug}
              disabled={disabled}
              run={run}
              onMove={(delta) =>
                run(
                  () => reorderModulesAction(swapped(moduleIds, index, delta)),
                  "أُعيد ترتيب الوحدات",
                )
              }
            />
          ))}
        </div>
      )}

      <EnrollmentPanel courseId={courseId} enrollments={enrollments} disabled={disabled} run={run} />
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

function MoveButtons({
  label,
  index,
  total,
  disabled,
  onMove,
}: {
  label: string;
  index: number;
  total: number;
  disabled: boolean;
  onMove: (delta: number) => void;
}) {
  return (
    <div className="flex shrink-0 items-center">
      <Button
        variant="ghost"
        size="icon"
        disabled={disabled || index === 0}
        aria-label={`تقديم ${label}`}
        className="text-charcoal-400 hover:text-charcoal-800"
        onClick={() => onMove(-1)}
      >
        <ChevronUp aria-hidden="true" className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        disabled={disabled || index === total - 1}
        aria-label={`تأخير ${label}`}
        className="text-charcoal-400 hover:text-charcoal-800"
        onClick={() => onMove(1)}
      >
        <ChevronDown aria-hidden="true" className="h-4 w-4" />
      </Button>
    </div>
  );
}

function ModuleCreator({
  courseId,
  disabled,
  run,
}: {
  courseId: string;
  disabled: boolean;
  run: Runner;
}) {
  const [title, setTitle] = useState("");

  return (
    <section aria-label="إضافة وحدة" className="rounded-xl border border-border bg-white p-4 sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <Field
          id="new-module"
          label="وحدة جديدة"
          className="flex-1"
          hint="تُنشأ مسودة — تنشرها بعد تعبئة دروسها."
        >
          <Input
            id="new-module"
            value={title}
            disabled={disabled}
            placeholder="مثال: أساسيات الإضاءة"
            onChange={(event) => setTitle(event.target.value)}
          />
        </Field>
        <Button
          className="gap-1.5 sm:mb-4"
          disabled={disabled || title.trim() === ""}
          onClick={() => {
            run(() => createModuleAction({ courseId, title, summary: "" }), "أُضيفت الوحدة");
            setTitle("");
          }}
        >
          <Plus aria-hidden="true" className="h-4 w-4" />
          إضافة
        </Button>
      </div>
    </section>
  );
}

function ModuleCard({
  index,
  total,
  module,
  courseSlug,
  disabled,
  run,
  onMove,
}: {
  index: number;
  total: number;
  module: ModuleSummary;
  courseSlug: string;
  disabled: boolean;
  run: Runner;
  onMove: (delta: number) => void;
}) {
  const [adding, setAdding] = useState(false);
  const lessonIds = module.lessons.map((lesson) => lesson.id);

  return (
    <section className="rounded-xl border border-border bg-white">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-4 sm:px-5">
        <h2 className="flex items-baseline gap-2 text-sm font-bold text-charcoal-900">
          <span className="num-ltr text-charcoal-400">{index + 1}.</span>
          {module.title}
          {!module.published ? (
            <span className="rounded-full bg-charcoal-100 px-2 py-0.5 text-[11px] font-medium text-charcoal-600">
              مسودة
            </span>
          ) : null}
        </h2>
        <div className="flex items-center gap-2">
          <MoveButtons
            label={`وحدة ${module.title}`}
            index={index}
            total={total}
            disabled={disabled}
            onMove={onMove}
          />
          <label className="flex min-h-11 items-center gap-2 text-xs text-charcoal-700 lg:min-h-0">
            منشورة
            <Switch
              checked={module.published}
              disabled={disabled}
              onCheckedChange={(checked) =>
                run(
                  () =>
                    updateModuleAction(module.id, {
                      title: module.title,
                      summary: module.summary,
                      published: checked,
                    }),
                  checked ? "نُشرت الوحدة" : "أُعيدت الوحدة مسودة",
                )
              }
            />
          </label>
          <Button
            variant="outline"
            size="sm"
            disabled={disabled}
            onClick={() => setAdding((value) => !value)}
          >
            {adding ? "إخفاء" : "إضافة درس"}
          </Button>
          <DestructiveAction
            label={`حذف وحدة ${module.title}`}
            title="حذف الوحدة"
            description="سيُحذف معها كل دروسها. لا يمكن التراجع."
            confirmLabel="حذف"
            disabled={disabled}
            onConfirm={() => run(() => deleteModuleAction(module.id), "حُذفت الوحدة")}
          />
        </div>
      </header>

      {adding ? (
        <LessonForm
          moduleId={module.id}
          disabled={disabled}
          run={run}
          onDone={() => setAdding(false)}
        />
      ) : null}

      {module.lessons.length === 0 ? (
        <p className="p-5 text-center text-xs text-charcoal-400">لا دروس في هذه الوحدة بعد.</p>
      ) : (
        <ul className="divide-y divide-border">
          {module.lessons.map((lesson, lessonIndex) => (
            <li key={lesson.id} className="flex flex-wrap items-center gap-3 p-4 sm:px-5">
              <MoveButtons
                label={`درس ${lesson.title}`}
                index={lessonIndex}
                total={module.lessons.length}
                disabled={disabled}
                onMove={(delta) =>
                  run(
                    () => reorderLessonsAction(swapped(lessonIds, lessonIndex, delta)),
                    "أُعيد ترتيب الدروس",
                  )
                }
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-charcoal-800">{lesson.title}</p>
                <p className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-charcoal-400">
                  <span>{lesson.published ? "منشور" : "مسودة"}</span>
                  {lesson.freePreview ? <span className="text-brand-600">معاينة مجانية</span> : null}
                  {lesson.hasVideo ? (
                    <span>فيديو مرتبط</span>
                  ) : (
                    <span className="text-brand-700">بلا فيديو</span>
                  )}
                  {lesson.durationSeconds > 0 ? (
                    <span className="num-ltr">{formatLessonDuration(lesson.durationSeconds)}</span>
                  ) : null}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {lesson.published && module.published ? (
                  <Button variant="outline" size="sm" asChild>
                    <Link
                      href={`/learn/${courseSlug}/${lesson.id}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      معاينة
                    </Link>
                  </Button>
                ) : null}
                <DestructiveAction
                  label={`حذف درس ${lesson.title}`}
                  title="حذف الدرس"
                  description="لا يمكن التراجع عن هذا الإجراء."
                  confirmLabel="حذف"
                  disabled={disabled}
                  onConfirm={() => run(() => deleteLessonAction(lesson.id), "حُذف الدرس")}
                />
              </div>
              <LessonToggles lesson={lesson} disabled={disabled} run={run} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function LessonToggles({
  lesson,
  disabled,
  run,
}: {
  lesson: ModuleSummary["lessons"][number];
  disabled: boolean;
  run: Runner;
}) {
  /**
   * تبديلان سريعان. **لا `videoId` في الحمولة إطلاقًا** — غيابه يعني
   * «لا تمسّه» في الإجراء. إرساله فارغًا كان يمحو فيديو الدرس من القاعدة.
   */
  const save = (patch: { published?: boolean; freePreview?: boolean }) =>
    run(
      () =>
        updateLessonAction(lesson.id, {
          title: lesson.title,
          description: lesson.description,
          lessonType: lesson.lessonType,
          durationSeconds: lesson.durationSeconds,
          freePreview: patch.freePreview ?? lesson.freePreview,
          published: patch.published ?? lesson.published,
        }),
      "حُدّث الدرس",
    );

  return (
    <div className="flex w-full items-center justify-between gap-4 border-t border-border pt-3 sm:w-auto sm:border-0 sm:pt-0">
      <label className="flex min-h-11 items-center gap-2 text-xs text-charcoal-700 lg:min-h-0">
        منشور
        <Switch
          checked={lesson.published}
          disabled={disabled || (lesson.lessonType === "video" && !lesson.hasVideo)}
          onCheckedChange={(checked) => save({ published: checked })}
        />
      </label>
      <label className="flex min-h-11 items-center gap-2 text-xs text-charcoal-700 lg:min-h-0">
        معاينة مجانية
        <Switch
          checked={lesson.freePreview}
          disabled={disabled}
          onCheckedChange={(checked) => save({ freePreview: checked })}
        />
      </label>
    </div>
  );
}

function LessonForm({
  moduleId,
  disabled,
  run,
  onDone,
}: {
  moduleId: string;
  disabled: boolean;
  run: Runner;
  onDone: () => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [videoId, setVideoId] = useState("");
  const [minutes, setMinutes] = useState("");

  return (
    <div className="space-y-3 border-b border-border bg-surface p-4 sm:px-5">
      <Field id={`${moduleId}-title`} label="عنوان الدرس" required>
        <Input
          id={`${moduleId}-title`}
          value={title}
          disabled={disabled}
          onChange={(event) => setTitle(event.target.value)}
        />
      </Field>
      <Field id={`${moduleId}-desc`} label="وصف مختصر">
        <Textarea
          id={`${moduleId}-desc`}
          value={description}
          disabled={disabled}
          onChange={(event) => setDescription(event.target.value)}
        />
      </Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field
          id={`${moduleId}-video`}
          label="معرّف الفيديو في Bunny"
          hint="GUID من صفحة الفيديو في مكتبتك. لا يصل المتصفح إطلاقًا."
        >
          <Input
            id={`${moduleId}-video`}
            dir="ltr"
            autoComplete="off"
            value={videoId}
            disabled={disabled}
            onChange={(event) => setVideoId(event.target.value)}
          />
        </Field>
        <Field id={`${moduleId}-minutes`} label="المدة بالدقائق">
          <Input
            id={`${moduleId}-minutes`}
            dir="ltr"
            inputMode="numeric"
            value={minutes}
            disabled={disabled}
            onChange={(event) => setMinutes(event.target.value)}
          />
        </Field>
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="ghost" disabled={disabled} onClick={onDone}>
          إلغاء
        </Button>
        <Button
          disabled={disabled || title.trim() === ""}
          onClick={() => {
            const trimmed = minutes.trim();
            const seconds = trimmed === "" ? 0 : Math.round(Number(trimmed) * 60);
            if (!Number.isFinite(seconds) || seconds < 0) return;
            run(
              () =>
                createLessonAction({
                  moduleId,
                  title,
                  description,
                  lessonType: "video",
                  videoId: videoId.trim(),
                  durationSeconds: seconds,
                  freePreview: false,
                  published: false,
                }),
              "أُضيف الدرس",
            );
            setTitle("");
            setDescription("");
            setVideoId("");
            setMinutes("");
            onDone();
          }}
        >
          إضافة الدرس
        </Button>
      </div>
    </div>
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
    <section
      aria-label="الوصول إلى الدورة"
      className="rounded-xl border border-border bg-white p-4 sm:p-5"
    >
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
            run(() => grantEnrollmentAction(courseId, email), "مُنح الوصول");
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
                  {STATUS_LABEL[row.status]} · {row.source === "purchase" ? "شراء" : "منح يدوي"}
                  {row.expiresAt ? " · بمدة" : " · دائم"}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {row.status === "active" ? (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={disabled}
                    onClick={() =>
                      run(() => setEnrollmentStatusAction(row.id, "cancelled"), "أُلغي التسجيل")
                    }
                  >
                    إلغاء
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={disabled}
                    onClick={() =>
                      run(() => setEnrollmentStatusAction(row.id, "active"), "فُعّل التسجيل")
                    }
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
                  onConfirm={() => run(() => deleteEnrollmentAction(row.id), "حُذف السجل")}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
