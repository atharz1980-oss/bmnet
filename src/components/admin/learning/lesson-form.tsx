"use client";

/**
 * نموذج الدرس — إنشاء وتعديل في مكان واحد.
 *
 * حقل الفيديو يطلب **المعرّف وحده**. لا مفتاح API ولا مفتاح توقيع ولا كود
 * تضمين ولا رابط: المفاتيح لا تُدخَل من شاشة أبدًا، والرابط يبنيه الخادم
 * موقّعًا عند كل مشاهدة.
 *
 * وفي التعديل يبدأ الحقل فارغًا دائمًا — المعرّف المحفوظ لا يغادر الخادم،
 * والفارغ يعني «لا تغيّره». المسح بخيار صريح.
 *
 * البنية تفصل «مصدر الفيديو» عن بقية الحقول، فإضافة «رفع الفيديو» لاحقًا
 * تستبدل هذا القسم وحده بلا مساس بالنموذج — ولا تحتاج مفتاحًا في المتصفح.
 */

import { useState } from "react";
import { CircleAlert, FileText, Video } from "lucide-react";

import { Field } from "@/components/admin/ui/field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export type LessonType = "video" | "text";

export interface LessonDraft {
  title: string;
  description: string;
  lessonType: LessonType;
  /** غائب = لا تغيّر المحفوظ · "" = امسحه · قيمة = استبدله. */
  videoId?: string;
  durationSeconds: number;
  freePreview: boolean;
  published: boolean;
}

export interface LessonFormValue {
  id?: string;
  title: string;
  description: string;
  lessonType: LessonType;
  durationSeconds: number;
  freePreview: boolean;
  published: boolean;
  hasVideo: boolean;
}

const EMPTY: LessonFormValue = {
  title: "",
  description: "",
  lessonType: "video",
  durationSeconds: 0,
  freePreview: false,
  published: false,
  hasVideo: false,
};

/** أين يجد المحرر المعرّف — شرح بصري مختصر بدل إحالة إلى التوثيق. */
function BunnyHint() {
  return (
    <div className="rounded-lg border border-charcoal-200/80 bg-surface p-3 text-xs leading-relaxed text-charcoal-600">
      <p className="font-semibold text-charcoal-800">أين أجد المعرّف؟</p>
      <ol className="mt-1.5 list-decimal space-y-1 ps-4">
        <li>افتح لوحة Bunny ← Stream ← مكتبة الفيديو.</li>
        <li>اضغط على الفيديو المطلوب.</li>
        <li>انسخ <span className="font-latin font-semibold">Video ID</span> — سلسلة مثل <span className="font-latin" dir="ltr">0a1b2c3d-…</span></li>
      </ol>
      <p className="mt-2 text-charcoal-500">لا تنسخ الرابط ولا كود التضمين — المعرّف فقط.</p>
    </div>
  );
}

export function LessonForm({
  value,
  disabled,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  value?: LessonFormValue;
  disabled: boolean;
  submitLabel: string;
  onSubmit: (draft: LessonDraft) => void;
  onCancel: () => void;
}) {
  const initial = value ?? EMPTY;
  const editing = Boolean(value?.id);
  const [title, setTitle] = useState(initial.title);
  const [description, setDescription] = useState(initial.description);
  const [lessonType, setLessonType] = useState<LessonType>(initial.lessonType);
  const [videoId, setVideoId] = useState("");
  const [clearVideo, setClearVideo] = useState(false);
  const [minutes, setMinutes] = useState(
    initial.durationSeconds > 0 ? String(Math.round(initial.durationSeconds / 60)) : "",
  );
  const [freePreview, setFreePreview] = useState(initial.freePreview);
  const [published, setPublished] = useState(initial.published);

  const key = value?.id ?? "new";
  const videoKnown = editing ? initial.hasVideo && !clearVideo : videoId.trim() !== "";
  const videoReady = lessonType === "text" || videoKnown || videoId.trim() !== "";
  const blockedReason = !videoReady ? "أضف فيديو الدرس قبل النشر." : null;

  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        if (disabled || title.trim() === "") return;
        const trimmed = minutes.trim();
        const seconds = trimmed === "" ? 0 : Math.round(Number(trimmed) * 60);
        if (!Number.isFinite(seconds) || seconds < 0) return;
        const video = lessonType === "text" ? undefined : clearVideo ? "" : videoId.trim() === "" ? undefined : videoId.trim();
        onSubmit({
          title,
          description,
          lessonType,
          ...(video === undefined ? {} : { videoId: video }),
          durationSeconds: seconds,
          freePreview,
          published: published && videoReady,
        });
      }}
    >
      <Field id={`${key}-title`} label="عنوان الدرس" required>
        <Input
          id={`${key}-title`}
          value={title}
          disabled={disabled}
          autoFocus
          placeholder="مثال: إعداد الكاميرا"
          onChange={(event) => setTitle(event.target.value)}
        />
      </Field>

      <fieldset>
        <legend className="mb-2 text-sm font-medium text-charcoal-800">نوع الدرس</legend>
        <div className="grid grid-cols-2 gap-2">
          {([
            { id: "video" as const, label: "فيديو", icon: Video },
            { id: "text" as const, label: "نص", icon: FileText },
          ]).map((option) => (
            <button
              key={option.id}
              type="button"
              disabled={disabled}
              aria-pressed={lessonType === option.id}
              onClick={() => setLessonType(option.id)}
              className={cn(
                "flex min-h-11 items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors",
                lessonType === option.id
                  ? "border-brand-600 bg-brand-50 text-brand-700"
                  : "border-charcoal-200 bg-white text-charcoal-600 hover:border-charcoal-400",
              )}
            >
              <option.icon aria-hidden="true" className="h-4 w-4" />
              {option.label}
            </button>
          ))}
        </div>
      </fieldset>

      {lessonType === "video" ? (
        <section aria-label="فيديو الدرس" className="space-y-3 rounded-lg border border-border p-3">
          <h4 className="text-sm font-semibold text-charcoal-900">فيديو الدرس</h4>
          {editing && initial.hasVideo ? (
            <p className="text-xs text-charcoal-500">
              هذا الدرس مرتبط بفيديو. اترك الحقل فارغًا للإبقاء عليه.
            </p>
          ) : null}
          <Field
            id={`${key}-video`}
            label="Bunny Video ID"
            hint="الصق معرّف الفيديو من مكتبة Bunny Stream، وليس رابط الفيديو."
          >
            <Input
              id={`${key}-video`}
              dir="ltr"
              autoComplete="off"
              spellCheck={false}
              placeholder="00000000-0000-0000-0000-000000000000"
              value={videoId}
              disabled={disabled || clearVideo}
              onChange={(event) => setVideoId(event.target.value)}
            />
          </Field>
          <BunnyHint />
          {editing && initial.hasVideo ? (
            <label className="flex min-h-11 items-center gap-2 text-xs text-charcoal-700 lg:min-h-0">
              <input
                type="checkbox"
                checked={clearVideo}
                disabled={disabled}
                onChange={(event) => setClearVideo(event.target.checked)}
                className="size-5 accent-[var(--primary)] lg:size-4"
              />
              إزالة الفيديو المرتبط (يُعيد الدرس مسودة)
            </label>
          ) : null}
        </section>
      ) : (
        <Field
          id={`${key}-body`}
          label="محتوى الدرس"
          hint="عناوين بـ ## · قوائم بـ - · غامق بـ **نص** · روابط [النص](الرابط)"
        >
          <Textarea
            id={`${key}-body`}
            rows={10}
            value={description}
            disabled={disabled}
            placeholder={"## مقدمة\n\nاكتب شرح الدرس هنا.\n\n- نقطة أولى\n- نقطة ثانية"}
            onChange={(event) => setDescription(event.target.value)}
          />
        </Field>
      )}

      {lessonType === "video" ? (
        <Field id={`${key}-desc`} label="وصف مختصر" hint="يظهر تحت المشغّل.">
          <Textarea
            id={`${key}-desc`}
            rows={3}
            value={description}
            disabled={disabled}
            onChange={(event) => setDescription(event.target.value)}
          />
        </Field>
      ) : null}

      <Field id={`${key}-minutes`} label="مدة الدرس بالدقائق">
        <Input
          id={`${key}-minutes`}
          dir="ltr"
          inputMode="numeric"
          placeholder="10"
          value={minutes}
          disabled={disabled}
          onChange={(event) => setMinutes(event.target.value)}
        />
      </Field>

      <div className="space-y-1 rounded-lg border border-border p-3">
        <label className="flex min-h-11 items-center justify-between gap-3 text-sm text-charcoal-800 lg:min-h-0">
          <span>
            معاينة مجانية
            <span className="mt-0.5 block text-xs font-normal text-charcoal-500">
              يُفتح لأي زائر بلا اشتراك.
            </span>
          </span>
          <Switch checked={freePreview} disabled={disabled} onCheckedChange={setFreePreview} />
        </label>
        <label className="flex min-h-11 items-center justify-between gap-3 border-t border-border pt-2 text-sm text-charcoal-800 lg:min-h-0">
          <span>
            نشر الدرس
            <span className="mt-0.5 block text-xs font-normal text-charcoal-500">
              المسودة لا يراها الطالب.
            </span>
          </span>
          <Switch
            checked={published && videoReady}
            disabled={disabled || !videoReady}
            onCheckedChange={setPublished}
          />
        </label>
        {blockedReason ? (
          <p role="note" className="flex items-start gap-1.5 pt-1 text-xs leading-relaxed text-brand-700">
            <CircleAlert aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            {blockedReason}
          </p>
        ) : null}
      </div>

      <div className="flex flex-wrap justify-end gap-2 border-t border-border pt-3">
        <Button type="button" variant="ghost" disabled={disabled} onClick={onCancel}>
          إلغاء
        </Button>
        <Button type="submit" disabled={disabled || title.trim() === ""}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
