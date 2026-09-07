"use client";

/**
 * BasicInfoTab — تبويب المعلومات الأساسية
 * ملاحظة معمارية: حالة الدورة (status) هي المصدر الوحيد للنشر —
 * لا يوجد Boolean "published" منفصل يتعارض معها (قرار المواصفة).
 *
 * المدرب: Select واحد يكتب trainerId (مرجع بالمعرّف فقط — لا نسخ بيانات).
 * - الاختيارات الجديدة تعرض المدربين النشطين فقط.
 * - إن كان المدرب الحالي مخفيًا يبقى محفوظًا ومعروضًا بتنبيه (لا نكسر علاقة قائمة).
 */
import { RefreshCw, UserCog } from "lucide-react";

import type { CourseInput } from "@/context/admin-store";
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
import { Field } from "@/components/admin/ui/field";
import { useAdminData } from "@/context/admin-store";
import {
  COURSE_LANGUAGE_OPTIONS,
  COURSE_LEVEL_OPTIONS,
  COURSE_STATUS_OPTIONS,
  COURSE_TYPE_OPTIONS,
} from "../course-meta";

interface TabProps {
  draft: CourseInput;
  update: (patch: Partial<CourseInput>) => void;
  errors: Record<string, string>;
}

export function BasicInfoTab({ draft, update, errors }: TabProps) {
  const { trainers } = useAdminData();
  const currentTrainer = trainers.find((trainer) => trainer.id === draft.trainerId);
  /* الاختيارات: النشطون فقط + المدرب الحالي إن كان مخفيًا (حماية علاقة قائمة) */
  const selectableTrainers = trainers.filter(
    (trainer) => trainer.status === "active" || trainer.id === draft.trainerId,
  );

  function generateSlug() {
    update({ slug: `course-${Date.now().toString(36)}` });
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="course-name" label="اسم الدورة" required error={errors.name}>
          <Input
            id="course-name"
            value={draft.name}
            onChange={(event) => update({ name: event.target.value })}
            placeholder="مثال: ورشة أساسيات التصوير"
            aria-invalid={Boolean(errors.name)}
          />
        </Field>

        <Field id="course-short-name" label="الاسم المختصر">
          <Input
            id="course-short-name"
            value={draft.shortName ?? ""}
            onChange={(event) => update({ shortName: event.target.value })}
            placeholder="مثال: أساسيات التصوير"
          />
        </Field>
      </div>

      <Field
        id="course-slug"
        label="الـ Slug (الرابط اللاتيني)"
        required
        error={errors.slug}
        hint="أحرف لاتينية صغيرة وأرقام وشرطات فقط — مثال: photography-fundamentals"
      >
        <div className="flex gap-2">
          <Input
            id="course-slug"
            value={draft.slug}
            onChange={(event) => update({ slug: event.target.value })}
            placeholder="photography-fundamentals"
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

      <Field id="course-excerpt" label="وصف مختصر" hint="سطر تعريفي يظهر في بطاقة الدورة">
        <Textarea
          id="course-excerpt"
          value={draft.excerpt}
          onChange={(event) => update({ excerpt: event.target.value })}
          rows={2}
          placeholder="نقطة البداية الصحيحة لرحلتك في التصوير…"
        />
      </Field>

      <Field
        id="course-description"
        label="الوصف الكامل"
        hint="افصل بين الفقرات بسطر فارغ — تظهر كل فقرة ككتلة مستقلة"
      >
        <Textarea
          id="course-description"
          value={draft.description}
          onChange={(event) => update({ description: event.target.value })}
          rows={6}
          placeholder="فكرة الدورة… ماذا سيتعلم المتدرب… أسلوب التدريب…"
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="course-type" label="نوع الدورة">
          <Select
            value={draft.type}
            onValueChange={(value) => update({ type: value as CourseInput["type"] })}
          >
            <SelectTrigger id="course-type" aria-label="نوع الدورة">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {COURSE_TYPE_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field id="course-level" label="المستوى">
          <Select
            value={draft.level}
            onValueChange={(value) => update({ level: value as CourseInput["level"] })}
          >
            <SelectTrigger id="course-level" aria-label="مستوى الدورة">
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

        <Field id="course-language" label="اللغة">
          <Select
            value={draft.language}
            onValueChange={(value) => update({ language: value })}
          >
            <SelectTrigger id="course-language" aria-label="لغة الدورة">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {COURSE_LANGUAGE_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field id="course-status" label="حالة الدورة" hint="المصدر الوحيد لحالة النشر">
          <Select
            value={draft.status}
            onValueChange={(value) => update({ status: value as CourseInput["status"] })}
          >
            <SelectTrigger id="course-status" aria-label="حالة الدورة">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {COURSE_STATUS_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </div>

      {/* المدرب — مرجع بالمعرّف (trainerId) عبر Select واحد */}
      <Field
        id="course-trainer"
        label="مدرب الدورة"
        hint={
          currentTrainer?.status === "hidden"
            ? "المدرب الحالي مخفي — يبقى مرتبطًا بهذه الدورة ولن يظهر في الاختيارات الجديدة إلا بعد تفعيله."
            : "يُعرض المدربون النشطون فقط في الاختيارات الجديدة."
        }
      >
        <Select
          value={draft.trainerId ?? "none"}
          onValueChange={(value) => update({ trainerId: value === "none" ? undefined : value })}
        >
          <SelectTrigger id="course-trainer" aria-label="مدرب الدورة">
            <SelectValue placeholder="اختر المدرب" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">
              <span className="text-muted-foreground">بدون مدرب</span>
            </SelectItem>
            {selectableTrainers.map((trainer) => (
              <SelectItem key={trainer.id} value={trainer.id}>
                <span className="flex items-center gap-2">
                  {trainer.name}
                  {trainer.status === "hidden" ? (
                    <span className="text-xs text-charcoal-400">(مخفي — الحالي)</span>
                  ) : null}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {currentTrainer ? (
          <p className="mt-1.5 flex items-center gap-1.5 text-xs text-muted-foreground">
            <UserCog aria-hidden="true" className="h-3.5 w-3.5" />
            {currentTrainer.title} — {currentTrainer.specialty}
          </p>
        ) : null}
      </Field>

      <div className="flex items-center justify-between gap-4 rounded-xl border border-border bg-surface/60 p-4">
        <div>
          <p className="text-sm font-medium text-charcoal-800">دورة مميزة</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            تظهر في قسم «الدورات المميزة» بالصفحة الرئيسية
          </p>
        </div>
        <Switch
          checked={draft.featured}
          onCheckedChange={(checked) => update({ featured: checked })}
          aria-label="تمييز الدورة"
        />
      </div>

    </div>
  );
}
