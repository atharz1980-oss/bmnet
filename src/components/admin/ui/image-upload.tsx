"use client";

/**
 * ImageUpload — رفع صورة فعلي إلى bm-media.
 * ------------------------------------------
 * كان معاينة blob محلية لا تُرفع، فتبدو الصورة محفوظة وتختفي عند التحديث.
 * الآن: الملف يُرفع عبر uploadMedia فور اختياره، ولا تتغير قيمة الحقل إلا
 * بعد نجاح الرفع، فما يراه المحرر هو ما في التخزين فعلًا.
 *
 * Accessible: زر فعلي يفتح منتقي الملفات، وحالة الرفع والخطأ معلنتان.
 */
import { useRef, useState } from "react";
import { ImagePlus, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useAdminActions } from "@/context/admin-store";

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
  /** مجلد التخزين في bm-media — يحدد مكان الملف ولا يؤثر على الرابط المعروض. */
  folder?: "courses" | "trainers" | "paths" | "blog" | "homepage" | "testimonials" | "site" | "misc";
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
  folder = "misc",
}: ImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const { uploadMedia } = useAdminActions();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const ACCEPTED = ["image/jpeg", "image/png", "image/webp", "image/avif"];
  const MAX_BYTES = 10 * 1024 * 1024;

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setError("");
    if (!ACCEPTED.includes(file.type)) {
      setError("صيغة غير مدعومة — JPG أو PNG أو WebP أو AVIF.");
      return;
    }
    if (file.size > MAX_BYTES) {
      setError("حجم الصورة يتجاوز 10 ميجابايت.");
      return;
    }
    /* الاسم بدون امتداد كبداية معقولة للنص البديل */
    const fallbackAlt = alt || file.name.replace(/\.[^.]+$/, "");
    setUploading(true);
    try {
      const result = await uploadMedia(file, folder, { altText: fallbackAlt });
      /* الحقل لا يتغير إلا بعد نجاح الرفع: لا معاينة تكذب على المحرر. */
      if (result.ok && typeof result.data === "string") {
        onChange({ value: result.data, alt: fallbackAlt });
      } else {
        setError(result.ok ? "تعذر قراءة رابط الصورة بعد الرفع." : result.error);
      }
    } finally {
      setUploading(false);
    }
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
            <ImagePlus aria-hidden="true" className="h-11 w-11 lg:h-8 lg:w-8" />
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
          disabled={uploading}
          onChange={(event) => {
            const file = event.target.files?.[0];
            /* السماح بإعادة اختيار نفس الملف */
            event.target.value = "";
            void handleFile(file);
          }}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
        >
          {uploading ? (
            <Loader2 aria-hidden="true" className="me-1.5 h-4 w-4 animate-spin" />
          ) : (
            <ImagePlus aria-hidden="true" className="me-1.5 h-4 w-4" />
          )}
          {uploading ? "جارٍ الرفع…" : "اختر صورة من الجهاز"}
        </Button>
        {value ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-brand-700 hover:bg-brand-50 hover:text-brand-700"
            disabled={uploading}
            onClick={() => {
              setError("");
              onChange({ value: "", alt: "" });
            }}
          >
            <Trash2 aria-hidden="true" className="me-1.5 h-4 w-4" />
            إزالة
          </Button>
        ) : null}
      </div>

      <p aria-live="polite" className="text-xs text-muted-foreground">
        {uploading ? "جارٍ رفع الصورة إلى مكتبة الوسائط…" : hint ?? "تُرفع الصورة إلى مكتبة الوسائط فور اختيارها. JPG أو PNG أو WebP أو AVIF، حتى 10 ميجابايت."}
      </p>

      {error ? (
        <p role="alert" className="text-xs font-medium leading-relaxed text-brand-700">
          {error}
        </p>
      ) : null}

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
