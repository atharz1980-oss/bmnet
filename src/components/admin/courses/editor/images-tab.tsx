"use client";

/**
 * ImagesTab — تبويب الصور (رفع Mock: معاينة محلية فقط)
 * تنبيه ظاهر للمستخدم: الـ Object URL لا يُخزَّن في localStorage —
 * بعد التحديث تعود الصورة المرفوعة إلى Placeholder/Seed (مقبول في هذه المرحلة).
 */
import { Info } from "lucide-react";

import type { CourseInput } from "@/context/admin-store";
import { ImageUpload } from "@/components/admin/ui/image-upload";

interface TabProps {
  draft: CourseInput;
  update: (patch: Partial<CourseInput>) => void;
  errors: Record<string, string>;
}

export function ImagesTab({ draft, update, errors }: TabProps) {
  return (
    <div className="space-y-6">
      <ImageUpload
              folder="courses"
        id="course-main-image"
        label="الصورة الرئيسية"
        value={draft.images.main}
        alt={draft.images.alt}
        aspect="video"
        onChange={({ value, alt }) =>
          update({ images: { ...draft.images, main: value, alt: alt ?? draft.images.alt } })
        }
        hint="رفع تجريبي — تُعرض الصورة محليًا في هذه الجلسة فقط، وبعد التحديث تعود إلى قيمتها المخزنة."
      />
      {errors["images.alt"] ? (
        <p role="alert" className="text-xs font-medium text-brand-700">
          {errors["images.alt"]}
        </p>
      ) : null}

      <ImageUpload
              folder="courses"
        id="course-cover-image"
        label="صورة الغلاف"
        value={draft.images.cover ?? ""}
        withAlt={false}
        aspect="wide"
        onChange={({ value }) =>
          update({ images: { ...draft.images, cover: value || undefined } })
        }
        hint="اختيارية — تُستخدم كغلاف في بعض التصاميم بدل الصورة الرئيسية."
      />

      <div className="flex items-start gap-2 rounded-lg border border-border bg-surface/60 p-3 text-xs leading-relaxed text-muted-foreground">
        <Info aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-charcoal-400" />
        <p>
          المرحلة الحالية Mock: لا يُرفع أي ملف إلى السيرفر، ولا تُخزَّن معاينات الصور المرفوعة
          في التخزين المحلي (يُعقَّم الحفظ تلقائيًا) — سيُربط الرفع الفعلي بقاعدة البيانات في
          مرحلة الـ Backend.
        </p>
      </div>
    </div>
  );
}
