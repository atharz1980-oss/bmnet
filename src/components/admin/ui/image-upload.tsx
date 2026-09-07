"use client";

/**
 * ImageUpload — رفع صورة Mock (المرحلة الثانية)
 * ----------------------------------------------
 * يختار المستخدم صورة من جهازه فتُعرض معاينة محلية عبر Object URL.
 * لا يُرفع أي شيء إلى السيرفر — والـ Object URL لا يُخزَّن في localStorage
 * (يُعقَّم عند الحفظ — راجع sanitizeForStorage).
 *
 * Accessible: زر فعلي يفتح منتقي الملفات، وAlt نصي قابل للتحرير.
 */
import { useRef } from "react";
import { ImagePlus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface ImageUploadProps {
  id: string;
  label: string;
  value: string;
  onChange: (next: { value: string; alt?: string }) => void;
  alt?: string;
  /** إظهار حقل النص البديل (افتراضيًا نعم) */
  withAlt?: boolean;
  hint?: string;
  /** نسبة عرض المعاينة */
  aspect?: "video" | "square" | "wide";
}

const ASPECT_CLASS: Record<NonNullable<ImageUploadProps["aspect"]>, string> = {
  video: "aspect-video",
  square: "aspect-square",
  wide: "aspect-[21/9]",
};

export function ImageUpload({
  id,
  label,
  value,
  alt = "",
  onChange,
  withAlt = true,
  hint,
  aspect = "video",
}: ImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  function handleFile(file: File | undefined) {
    if (!file) return;
    const url = URL.createObjectURL(file);
    /* الاسم بدون امتداد كبداية معقولة للنص البديل */
    const fallbackAlt = file.name.replace(/\.[^.]+$/, "");
    onChange({ value: url, alt: alt || fallbackAlt });
  }

  return (
    <div className="mb-1 space-y-1.5">
      <span className="text-sm font-medium text-charcoal-800" id={`${id}-label`}>
        {label}
      </span>

      <div
        className={cn(
          "relative w-full overflow-hidden rounded-xl border border-dashed bg-surface",
          value ? "border-input" : "border-charcoal-200",
          ASPECT_CLASS[aspect],
        )}
      >
        {value ? (
          <img
            src={value}
            alt={alt || "معاينة الصورة المختارة"}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-charcoal-400">
            <ImagePlus aria-hidden="true" className="h-8 w-8" />
            <p className="text-xs">لم تُختر صورة بعد</p>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="sr-only"
          id={id}
          aria-labelledby={`${id}-label`}
          onChange={(event) => {
            handleFile(event.target.files?.[0]);
            /* السماح بإعادة اختيار نفس الملف */
            event.target.value = "";
          }}
        />
        <Button type="button" variant="outline" size="sm" onClick={() => inputRef.current?.click()}>
          <ImagePlus aria-hidden="true" className="me-1.5 h-4 w-4" />
          اختر صورة من الجهاز
        </Button>
        {value ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-brand-700 hover:bg-brand-50 hover:text-brand-700"
            onClick={() => onChange({ value: "", alt: "" })}
          >
            <Trash2 aria-hidden="true" className="me-1.5 h-4 w-4" />
            إزالة
          </Button>
        ) : null}
      </div>

      <p className="text-xs text-muted-foreground">
        {hint ?? "رفع تجريبي — تُعرض الصورة محليًا في هذه الجلسة فقط، ولا تُخزَّن في السيرفر."}
      </p>

      {withAlt ? (
        <div className="space-y-1.5 pt-1">
          <label htmlFor={`${id}-alt`} className="text-sm font-medium text-charcoal-800">
            النص البديل (Alt) <span className="ms-2 text-xs font-normal text-muted-foreground">(اختياري)</span>
          </label>
          <Input
            id={`${id}-alt`}
            value={alt}
            onChange={(event) => onChange({ value, alt: event.target.value })}
            placeholder="وصف عربي مختصر للصورة"
          />
        </div>
      ) : null}
    </div>
  );
}
