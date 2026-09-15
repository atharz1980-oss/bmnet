"use client";

/**
 * محررات أقسام الدورات والتقييمات في الصفحة الرئيسية
 * ---------------------------------------------------
 * - الدورة القادمة: Automatic (Selector) / Manual (Course + Session) مع تحذير
 *   صريح إذا لم يعد الاختيار صالحًا (متطلب المواصفة).
 * - الفئات: النصوص والصور قابلة للتحرير — enum الفئة نفسه لا يُغيَّر من CMS.
 * - الدورات المميزة: Automatic (كل Featured) أو Manual بترتيب وبدون تكرار.
 * - التقييمات: إعدادات القسم فقط — التقييمات نفسها تُدار في /admin/testimonials.
 *
 * لا نسخ لبيانات الدورات داخل الإعدادات — مراجع بالمعرّف فقط (قاعدة Business 7).
 */
import { useMemo } from "react";
import { ArrowDown, ArrowUp, CircleAlert, Plus, X } from "lucide-react";

import type {
  AdminCourse,
  CategorySetting,
  FeaturedCoursesSettings,
  TestimonialsSectionSettings,
  UpcomingCourseSettings,
  AdminData,
} from "@/data/admin/types";
import { Field } from "@/components/admin/ui/field";
import { ImageUpload } from "@/components/admin/ui/image-upload";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

/* ─────────────────── الوضع التلقائي/اليدوي — Switch مزدوج ─────────────────── */

function ModeToggle({
  value,
  onChange,
  idPrefix,
}: {
  value: "automatic" | "manual";
  onChange: (mode: "automatic" | "manual") => void;
  idPrefix: string;
}) {
  return (
    <div
      role="group"
      aria-label="وضع الاختيار"
      className="inline-flex overflow-hidden rounded-lg border border-border"
    >
      <button
        type="button"
        id={`${idPrefix}-automatic`}
        aria-pressed={value === "automatic"}
        onClick={() => onChange("automatic")}
        className={cn(
          "px-4 py-2 text-sm font-medium transition-colors",
          value === "automatic"
            ? "bg-charcoal-900 text-white"
            : "bg-white text-charcoal-600 hover:bg-surface",
        )}
      >
        تلقائي
      </button>
      <button
        type="button"
        id={`${idPrefix}-manual`}
        aria-pressed={value === "manual"}
        onClick={() => onChange("manual")}
        className={cn(
          "px-4 py-2 text-sm font-medium transition-colors",
          value === "manual"
            ? "bg-charcoal-900 text-white"
            : "bg-white text-charcoal-600 hover:bg-surface",
        )}
      >
        يدوي
      </button>
    </div>
  );
}

/* ─────────────────────────── الدورة القادمة ─────────────────────────── */

interface UpcomingCourseEditorProps {
  settings: UpcomingCourseSettings;
  onChange: (settings: UpcomingCourseSettings) => void;
  data: AdminData;
}

export function UpcomingCourseEditor({ settings, onChange, data }: UpcomingCourseEditorProps) {
  const selectedCourse = settings.manualCourseId
    ? data.courses.find((course) => course.id === settings.manualCourseId)
    : undefined;
  const selectedSession =
    selectedCourse && settings.manualSessionId
      ? selectedCourse.sessions.find((session) => session.id === settings.manualSessionId)
      : undefined;

  /* الدورة المختارة يدويًا لم تعد موجودة → تحذير فوري في المحرر */
  const courseMissing = settings.mode === "manual" && settings.manualCourseId && !selectedCourse;
  const sessionMissing =
    settings.mode === "manual" && selectedCourse && settings.manualSessionId && !selectedSession;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <ModeToggle
          value={settings.mode}
          onChange={(mode) =>
            onChange({
              ...settings,
              mode,
              /* تغيير الوضع لا يحذف الاختيار اليدوي — يعود إليه عند الرجوع */
            })
          }
          idPrefix="upcoming"
        />
        <p className="text-xs leading-relaxed text-muted-foreground">
          {settings.mode === "automatic"
            ? "يُعرض أقرب موعد متاح (تسجيل مفتوح أو قادم) من كل الدورات مرتبًا بالتاريخ."
            : "تختار الدورة والموعد صراحةً من مخزن لوحة التحكم."}
        </p>
      </div>

      {settings.mode === "manual" ? (
        <div className="space-y-4 rounded-xl border border-border bg-surface/50 p-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="upcoming-course" label="الدورة" required>
              <Select
                value={settings.manualCourseId ?? "none"}
                onValueChange={(value) =>
                  onChange({ ...settings, manualCourseId: value === "none" ? undefined : value, manualSessionId: undefined })
                }
              >
                <SelectTrigger id="upcoming-course" aria-label="الدورة المختارة يدويًا">
                  <SelectValue placeholder="اختر دورة…" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">بلا اختيار</SelectItem>
                  {data.courses.map((course) => (
                    <SelectItem key={course.id} value={course.id}>
                      {course.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field
              id="upcoming-session"
              label="الموعد"
              required
              hint={
                selectedCourse && selectedCourse.sessions.length === 0
                  ? "هذه الدورة بلا مواعيد — أضف موعدًا من محرر الدورة أولًا."
                  : undefined
              }
            >
              <Select
                value={settings.manualSessionId ?? "none"}
                onValueChange={(value) =>
                  onChange({ ...settings, manualSessionId: value === "none" ? undefined : value })
                }
                disabled={!selectedCourse}
              >
                <SelectTrigger id="upcoming-session" aria-label="الموعد المختار يدويًا">
                  <SelectValue placeholder={selectedCourse ? "اختر موعدًا…" : "اختر دورة أولًا"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">بلا اختيار</SelectItem>
                  {(selectedCourse?.sessions ?? []).map((session) => (
                    <SelectItem key={session.id} value={session.id}>
                      {session.batchName ? `${session.batchName} — ` : ""}
                      {session.startDate}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>

          {courseMissing ? (
            <p role="alert" className="flex items-start gap-1.5 rounded-lg border border-brand-200 bg-brand-50 p-3 text-xs leading-relaxed text-brand-700">
              <CircleAlert aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              الدورة المختارة لم تعد موجودة في المخزن — اختر دورة بديلة أو ارجع للوضع التلقائي.
            </p>
          ) : null}
          {sessionMissing ? (
            <p role="alert" className="flex items-start gap-1.5 rounded-lg border border-brand-200 bg-brand-50 p-3 text-xs leading-relaxed text-brand-700">
              <CircleAlert aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              الموعد المختار لم يعد موجودًا في هذه الدورة — اختر موعدًا بديلًا.
            </p>
          ) : null}
          {selectedSession &&
          selectedSession.status !== "open" &&
          selectedSession.status !== "upcoming" ? (
            <p role="alert" className="flex items-start gap-1.5 rounded-lg border border-brand-200 bg-brand-50 p-3 text-xs leading-relaxed text-brand-700">
              <CircleAlert aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              الموعد المختار لم يعد متاحًا للحجز (حالته:{" "}
              {selectedSession.status === "full"
                ? "ممتلئة"
                : selectedSession.status === "closed"
                  ? "مغلقة"
                  : "منتهية"}
              ) — سيبقى معروضًا حتى تغيّر الاختيار.
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

/* ─────────────────────────── فئات الدورات ─────────────────────────── */

interface CategoriesEditorProps {
  categories: CategorySetting[];
  onChange: (categories: CategorySetting[]) => void;
}

export function CategoriesEditor({ categories, onChange }: CategoriesEditorProps) {
  function update(id: string, patch: Partial<CategorySetting>) {
    onChange(categories.map((cat) => (cat.categoryId === id ? { ...cat, ...patch } : cat)));
  }

  return (
    <div className="space-y-3">
      <p className="text-xs leading-relaxed text-muted-foreground">
        الفئات الأربع ثابتة من النظام (لا تُضاف أو تُحذف) — التحكم هنا في إظهارها
        ونصوصها وصورتها وعنوان زرها فقط.
      </p>

      <ul className="space-y-3">
        {categories.map((category, index) => (
          <li key={category.categoryId} className="rounded-xl border border-border bg-white p-3 sm:p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-semibold text-charcoal-900">
                <span aria-hidden="true" className="me-2 num-ltr text-xs text-charcoal-400">
                  {index + 1}
                </span>
                {category.title || "—"}
                <span className="ms-2 rounded-md bg-surface px-1.5 py-0.5 text-[11px] font-normal text-charcoal-500">
                  {category.categoryId}
                </span>
              </p>
              <label className="flex cursor-pointer items-center gap-1.5 text-xs text-charcoal-600">
                <Switch
                  checked={category.enabled}
                  onCheckedChange={(checked) => update(category.categoryId, { enabled: checked })}
                  aria-label={`تفعيل فئة ${category.title}`}
                />
                مُعرَضة
              </label>
            </div>

            <div className="mt-3 grid gap-3 lg:grid-cols-2">
              <div className="space-y-3">
                <Field id={`cat-title-${category.categoryId}`} label="العنوان" compact required>
                  <Input
                    id={`cat-title-${category.categoryId}`}
                    value={category.title}
                    onChange={(event) => update(category.categoryId, { title: event.target.value })}
                    aria-label={`عنوان فئة ${index + 1}`}
                  />
                </Field>
                <Field id={`cat-desc-${category.categoryId}`} label="الوصف المختصر" compact>
                  <Textarea
                    id={`cat-desc-${category.categoryId}`}
                    value={category.shortDescription}
                    onChange={(event) =>
                      update(category.categoryId, { shortDescription: event.target.value })
                    }
                    rows={2}
                    aria-label={`وصف فئة ${index + 1}`}
                  />
                </Field>
                <Field id={`cat-cta-${category.categoryId}`} label="نص زر الفئة" compact>
                  <Input
                    id={`cat-cta-${category.categoryId}`}
                    value={category.ctaLabel}
                    onChange={(event) => update(category.categoryId, { ctaLabel: event.target.value })}
                    aria-label={`زر فئة ${index + 1}`}
                  />
                </Field>
              </div>
              <ImageUpload
              folder="homepage"
                id={`cat-image-${category.categoryId}`}
                label="صورة الفئة"
                value={category.image}
                alt={category.imageAlt ?? ""}
                aspect="video"
                onChange={({ value, alt }) =>
                  update(category.categoryId, { image: value, imageAlt: alt })
                }
                hint="رفع تجريبي — معاينة محلية فقط."
              />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ─────────────────────────── الدورات المميزة ─────────────────────────── */

interface FeaturedCoursesEditorProps {
  settings: FeaturedCoursesSettings;
  onChange: (settings: FeaturedCoursesSettings) => void;
  courses: AdminCourse[];
}

export function FeaturedCoursesEditor({ settings, onChange, courses }: FeaturedCoursesEditorProps) {
  const manualCourses = useMemo(
    () =>
      settings.manualCourseIds
        .map((id) => courses.find((course) => course.id === id))
        .filter((course): course is AdminCourse => Boolean(course)),
    [settings.manualCourseIds, courses],
  );
  const selectable = useMemo(
    () => courses.filter((course) => !settings.manualCourseIds.includes(course.id)),
    [courses, settings.manualCourseIds],
  );

  function addCourse(courseId: string) {
    if (!courseId || settings.manualCourseIds.includes(courseId)) return; /* منع التكرار */
    onChange({ ...settings, manualCourseIds: [...settings.manualCourseIds, courseId] });
  }

  function removeCourse(courseId: string) {
    onChange({ ...settings, manualCourseIds: settings.manualCourseIds.filter((id) => id !== courseId) });
  }

  function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= settings.manualCourseIds.length) return;
    const next = [...settings.manualCourseIds];
    [next[index], next[target]] = [next[target], next[index]];
    onChange({ ...settings, manualCourseIds: next });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <ModeToggle
          value={settings.mode}
          onChange={(mode) => onChange({ ...settings, mode })}
          idPrefix="featured"
        />
        <p className="text-xs leading-relaxed text-muted-foreground">
          {settings.mode === "automatic"
            ? "تُعرض كل الدورات المنشورة المعلّمة «مميزة» في محرر الدورة."
            : "تختار الدورات وترتبها يدويًا — بلا تكرار."}
        </p>
      </div>

      {settings.mode === "manual" ? (
        <div className="space-y-3 rounded-xl border border-border bg-surface/50 p-4">
          <div className="flex flex-wrap items-center gap-2">
            <Select value="none" onValueChange={addCourse}>
              <SelectTrigger aria-label="إضافة دورة مميزة" className="w-full bg-white sm:w-72">
                <SelectValue placeholder="اختر دورة لإضافتها…" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none" disabled>
                  اختر دورة لإضافتها…
                </SelectItem>
                {selectable.map((course) => (
                  <SelectItem key={course.id} value={course.id}>
                    {course.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              <Plus aria-hidden="true" className="me-1 inline h-3.5 w-3.5" />
              الدورات المضافة بالفعل لا تظهر في القائمة — منعًا للتكرار.
            </p>
          </div>

          {manualCourses.length === 0 ? (
            <p className="rounded-lg border border-dashed border-charcoal-200 p-4 text-center text-xs text-muted-foreground">
              لم تُختر دورات يدويًا بعد.
            </p>
          ) : (
            <ul className="space-y-2">
              {manualCourses.map((course, index) => (
                <li
                  key={course.id}
                  className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-white p-2.5"
                >
                  <span
                    aria-hidden="true"
                    className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-surface text-xs font-semibold text-charcoal-500 num-ltr"
                  >
                    {index + 1}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm font-medium text-charcoal-800">
                    {course.name}
                  </span>
                  <div className="flex items-center gap-0.5">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-11 w-11 lg:h-8 lg:w-8 text-charcoal-500"
                      onClick={() => move(index, -1)}
                      disabled={index === 0}
                      aria-label={`نقل ${course.name} للأعلى`}
                    >
                      <ArrowUp aria-hidden="true" className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-11 w-11 lg:h-8 lg:w-8 text-charcoal-500"
                      onClick={() => move(index, 1)}
                      disabled={index === manualCourses.length - 1}
                      aria-label={`نقل ${course.name} للأسفل`}
                    >
                      <ArrowDown aria-hidden="true" className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-11 w-11 lg:h-8 lg:w-8 text-brand-700 hover:bg-brand-50 hover:text-brand-700"
                      onClick={() => removeCourse(course.id)}
                      aria-label={`إزالة ${course.name}`}
                    >
                      <X aria-hidden="true" className="h-4 w-4" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-surface/50 p-4">
          <p className="mb-2 text-xs font-semibold text-charcoal-700">
            الدورات التي ستظهر تلقائيًا ({courses.filter((course) => course.featured && course.status !== "draft").length}):
          </p>
          <ul className="flex flex-wrap gap-1.5">
            {courses
              .filter((course) => course.featured && course.status !== "draft")
              .map((course) => (
                <li
                  key={course.id}
                  className="rounded-md bg-white px-2 py-1 text-xs text-charcoal-600 ring-1 ring-charcoal-100"
                >
                  {course.name}
                </li>
              ))}
          </ul>
        </div>
      )}
    </div>
  );
}

/* ─────────────────── إعدادات قسم التقييمات (الرئيسية) ─────────────────── */

interface TestimonialsSettingsEditorProps {
  settings: TestimonialsSectionSettings;
  onChange: (settings: TestimonialsSectionSettings) => void;
  data: AdminData;
}

export function TestimonialsSettingsEditor({
  settings,
  onChange,
  data,
}: TestimonialsSettingsEditorProps) {
  const featuredCount = data.testimonials.filter(
    (testimonial) => testimonial.featured && testimonial.visible,
  ).length;
  const manualList = settings.manualIds
    .map((id) => data.testimonials.find((testimonial) => testimonial.id === id))
    .filter((testimonial): testimonial is NonNullable<typeof testimonial> => Boolean(testimonial));
  const selectable = data.testimonials.filter(
    (testimonial) => !settings.manualIds.includes(testimonial.id),
  );

  function toggle(id: string) {
    onChange({
      ...settings,
      manualIds: settings.manualIds.includes(id)
        ? settings.manualIds.filter((entry) => entry !== id)
        : [...settings.manualIds, id],
    });
  }

  function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= settings.manualIds.length) return;
    const next = [...settings.manualIds];
    [next[index], next[target]] = [next[target], next[index]];
    onChange({ ...settings, manualIds: next });
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="testimonials-title" label="عنوان القسم" required>
          <Input
            id="testimonials-title"
            value={settings.title}
            onChange={(event) => onChange({ ...settings, title: event.target.value })}
          />
        </Field>
        <Field id="testimonials-desc" label="وصف القسم">
          <Textarea
            id="testimonials-desc"
            value={settings.description}
            onChange={(event) => onChange({ ...settings, description: event.target.value })}
            rows={2}
          />
        </Field>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <ModeToggle
          value={settings.mode}
          onChange={(mode) => onChange({ ...settings, mode })}
          idPrefix="testimonials"
        />
        <p className="text-xs leading-relaxed text-muted-foreground">
          {settings.mode === "automatic"
            ? `الوضع التلقائي يعرض التقييمات المميزة الظاهرة (${featuredCount}) — تُدار من صفحة التقييمات.`
            : "تختار التقييمات وترتبها يدويًا — والمخفية لا تظهر أبدًا (قاعدة Business 4)."}
        </p>
      </div>

      {settings.mode === "manual" ? (
        <div className="space-y-3 rounded-xl border border-border bg-surface/50 p-4">
          <Select value="none" onValueChange={(value) => value !== "none" && toggle(value)}>
            <SelectTrigger aria-label="إضافة تقييم" className="w-full bg-white sm:w-72">
              <SelectValue placeholder="اختر تقييمًا لإضافته…" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none" disabled>
                اختر تقييمًا لإضافته…
              </SelectItem>
              {selectable.map((testimonial) => (
                <SelectItem key={testimonial.id} value={testimonial.id}>
                  {testimonial.name} — {testimonial.rating}★{testimonial.visible ? "" : " (مخفي)"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {manualList.length === 0 ? (
            <p className="rounded-lg border border-dashed border-charcoal-200 p-4 text-center text-xs text-muted-foreground">
              لم تُختر تقييمات يدويًا بعد.
            </p>
          ) : (
            <ul className="space-y-2">
              {manualList.map((testimonial, index) => (
                <li
                  key={testimonial.id}
                  className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-white p-2.5"
                >
                  <span
                    aria-hidden="true"
                    className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-surface text-xs font-semibold text-charcoal-500 num-ltr"
                  >
                    {index + 1}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm font-medium text-charcoal-800">
                    {testimonial.name}
                    {!testimonial.visible ? (
                      <span className="ms-2 text-[11px] font-normal text-brand-700">
                        مخفي — لن يظهر في المعاينة
                      </span>
                    ) : null}
                  </span>
                  <div className="flex items-center gap-0.5">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-11 w-11 lg:h-8 lg:w-8 text-charcoal-500"
                      onClick={() => move(index, -1)}
                      disabled={index === 0}
                      aria-label={`نقل ${testimonial.name} للأعلى`}
                    >
                      <ArrowUp aria-hidden="true" className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-11 w-11 lg:h-8 lg:w-8 text-charcoal-500"
                      onClick={() => move(index, 1)}
                      disabled={index === manualList.length - 1}
                      aria-label={`نقل ${testimonial.name} للأسفل`}
                    >
                      <ArrowDown aria-hidden="true" className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-11 w-11 lg:h-8 lg:w-8 text-brand-700 hover:bg-brand-50 hover:text-brand-700"
                      onClick={() => toggle(testimonial.id)}
                      aria-label={`إزالة ${testimonial.name}`}
                    >
                      <X aria-hidden="true" className="h-4 w-4" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}
