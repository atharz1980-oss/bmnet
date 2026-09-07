"use client";

/**
 * MediaEditDialog — تحرير بيانات عنصر وسائط (#17)
 * ------------------------------------------------
 * الاسم للعرض فقط (ملف النظام)، والتحرير: النص البديل + الوصف الاختياري.
 * لا يُسمح بتغيير mimeType يدويًا (يُعرض كنص ثابت).
 */
import { useState } from "react";

import type { MediaItem } from "@/data/admin/types";
import { formatBytes, formatDateTime } from "@/lib/format";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/admin/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

interface MediaEditDialogProps {
  item: MediaItem | null;
  onOpenChange: (open: boolean) => void;
  onSave: (id: string, patch: Pick<MediaItem, "altText" | "caption">) => void;
}

export function MediaEditDialog({ item, onOpenChange, onSave }: MediaEditDialogProps) {
  const [altText, setAltText] = useState("");
  const [caption, setCaption] = useState("");

  /* إعادة تهيئة المسودة عند تغيّر العنصر — بنمط ضبط الحالة أثناء الرسم
     (نمط D-19/D-12) بدل effect (متطلب react-hooks/set-state-in-effect) */
  const [prevItemId, setPrevItemId] = useState<string | null>(null);
  if (item && item.id !== prevItemId) {
    setPrevItemId(item.id);
    setAltText(item.altText);
    setCaption(item.caption ?? "");
  }
  if (!item && prevItemId) {
    setPrevItemId(null);
  }

  if (!item) return null;

  function handleSave() {
    onSave(item!.id, {
      altText: altText.trim(),
      caption: caption.trim() || undefined,
    });
    onOpenChange(false);
  }

  return (
    <Dialog open={item !== null} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>تحرير بيانات الصورة</DialogTitle>
          <DialogDescription>
            بيانات وصفية تُستخدم في الوصولية وSEO — الاسم والنوع بيانات ملف لا تُحرر يدويًا.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex gap-3 rounded-xl border border-border bg-surface/60 p-3">
            <img
              src={item.previewUrl}
              alt={item.altText || `معاينة ${item.name}`}
              className="h-16 w-16 shrink-0 rounded-lg border border-border object-cover"
            />
            <dl className="min-w-0 flex-1 space-y-1 text-xs text-charcoal-600">
              <div className="truncate">
                <dt className="inline text-charcoal-400">الاسم: </dt>
                <dd className="inline font-medium text-charcoal-800">{item.name}</dd>
              </div>
              <div>
                <dt className="inline text-charcoal-400">النوع: </dt>
                <dd className="inline num-ltr">{item.mimeType}</dd>
                <span className="mx-1.5 text-charcoal-300">·</span>
                <span className="num-ltr">{formatBytes(item.size)}</span>
              </div>
              <div>
                <dt className="inline text-charcoal-400">أُضيفت: </dt>
                <dd className="inline">{formatDateTime(item.createdAt)}</dd>
              </div>
            </dl>
          </div>

          <Field id="media-alt" label="النص البديل (Alt Text)" required>
            <Input
              id="media-alt"
              value={altText}
              onChange={(event) => setAltText(event.target.value)}
              placeholder="وصف عربي مختصر لمحتوى الصورة"
            />
          </Field>

          <Field id="media-caption" label="الوصف (Caption)">
            <Textarea
              id="media-caption"
              value={caption}
              onChange={(event) => setCaption(event.target.value)}
              rows={2}
              placeholder="تعليق اختياري يظهر مع الصورة في المواضع التي تدعمه"
            />
          </Field>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            إلغاء
          </Button>
          <Button onClick={handleSave}>حفظ البيانات</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
