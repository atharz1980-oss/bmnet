"use client";

/**
 * MediaUpload — رفع صور حقيقي إلى التخزين (CP-G)
 * ------------------------------------------------
 * الصور فقط: jpg/jpeg/png/webp/avif وبحد أقصى 10 MB.
 * التحقق من النوع والحجم قبل الإرسال، والرفع الفعلي عبر
 * uploadMediaAction (Storage bucket bm-media + سجل في جدول media).
 * نص بديل اختياري عند الرفع — يُستكمل لاحقًا من المكتبة.
 */
import { useRef, useState } from "react";
import { Loader2, TriangleAlert, UploadCloud } from "lucide-react";

import { Button } from "@/components/ui/button";

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // 10 MB
const ACCEPTED_MIME = ["image/jpeg", "image/png", "image/webp", "image/avif"];

interface MediaUploadProps {
  onUpload: (file: File, meta: { altText: string; caption?: string }) => Promise<void> | void;
  uploading?: boolean;
}

export function MediaUpload({ onUpload, uploading = false }: MediaUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState("");

  async function handleFiles(files: FileList | null) {
    setError("");
    if (!files || files.length === 0) return;

    for (const file of Array.from(files)) {
      /* التحقق من النوع قبل الإرسال */
      const isAccepted = ACCEPTED_MIME.includes(file.type);
      if (!isAccepted) {
        setError(`نوع غير مدعوم: «${file.name}» — الصور فقط (JPG / PNG / WEBP / AVIF).`);
        continue;
      }
      /* التحقق من الحجم قبل الإرسال */
      if (file.size > MAX_UPLOAD_BYTES) {
        setError(`الملف «${file.name}» يتجاوز الحد الأقصى 10 MB (${Math.round(file.size / 1024 / 1024)} MB).`);
        continue;
      }
      await onUpload(file, { altText: "" });
    }
  }

  return (
    <div className="rounded-xl border border-dashed border-charcoal-300 bg-white p-4 sm:p-5">
      <div className="flex flex-col items-center justify-center gap-2 py-4 text-center">
        <span
          aria-hidden="true"
          className="flex h-12 w-12 items-center justify-center rounded-full bg-surface text-charcoal-500"
        >
          <UploadCloud className="h-6 w-6" />
        </span>
        <p className="text-sm font-semibold text-charcoal-800">رفع صور إلى المكتبة</p>
        <p className="max-w-md text-xs leading-relaxed text-muted-foreground">
          الصور فقط — JPG / JPEG / PNG / WEBP / AVIF بحد أقصى 10 MB لكل ملف.
        </p>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/avif"
          multiple
          className="sr-only"
          id="media-upload-input"
          onChange={(event) => {
            handleFiles(event.target.files);
            event.target.value = "";
          }}
        />
        <Button type="button" size="sm" onClick={() => inputRef.current?.click()} disabled={uploading}>
          {uploading ? (
            <Loader2 aria-hidden="true" className="me-1.5 h-4 w-4 animate-spin" />
          ) : (
            <UploadCloud aria-hidden="true" className="me-1.5 h-4 w-4" />
          )}
          {uploading ? "جارٍ الرفع…" : "اختر صورًا من الجهاز"}
        </Button>
      </div>

      {error ? (
        <p
          role="alert"
          className="mt-2 flex items-start gap-1.5 rounded-lg border border-brand-200 bg-brand-50 px-3 py-2 text-xs font-medium leading-relaxed text-brand-700"
        >
          <TriangleAlert aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          {error}
        </p>
      ) : null}

      <p className="mt-3 rounded-lg bg-surface px-3 py-2 text-xs leading-relaxed text-muted-foreground">
        تُرفع الصور فعليًا إلى تخزين الموقع (bm-media) وتُحفظ بياناتها في المكتبة —
        النص البديل يمكن استكماله من تحرير العنصر بعد الرفع.
      </p>
    </div>
  );
}
