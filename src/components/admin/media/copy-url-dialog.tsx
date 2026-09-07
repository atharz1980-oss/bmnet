"use client";

/**
 * CopyUrlDialog — نسخ رابط Mock لعنصر وسائط (#17)
 * -------------------------------------------------
 * Clipboard API إن توفر، مع بديل واضح: حقل نصي قابل للتحديد يدويًا.
 */
import { useState } from "react";
import { Check, Copy } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface CopyUrlDialogProps {
  url: string | null;
  onOpenChange: (open: boolean) => void;
}

export function CopyUrlDialog({ url, onOpenChange }: CopyUrlDialogProps) {
  const [copied, setCopied] = useState(false);
  const [fallbackNote, setFallbackNote] = useState("");

  if (!url) return null;

  async function handleCopy() {
    setCopied(false);
    setFallbackNote("");
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(url!);
        setCopied(true);
        return;
      }
      throw new Error("clipboard unavailable");
    } catch {
      /* fallback: يحدد المالك الرابط يدويًا من الحقل */
      setFallbackNote("النسخ التلقائي غير متاح هنا — حدّد الرابط من الحقل وانسخه يدويًا.");
    }
  }

  return (
    <Dialog
      open={url !== null}
      onOpenChange={(open) => {
        if (!open) {
          setCopied(false);
          setFallbackNote("");
        }
        onOpenChange(open);
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>نسخ رابط الصورة (Mock)</DialogTitle>
          <DialogDescription>
            الرابط يخدم واجهات المعاينة في هذه المرحلة — عند ربط Storage لاحقًا سيصبح رابط التخزين الفعلي.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-2">
          <Input
            readOnly
            value={url}
            dir="ltr"
            onFocus={(event) => event.currentTarget.select()}
            aria-label="رابط الصورة"
            className="font-latin text-xs"
          />
          <Button type="button" size="sm" className="shrink-0" onClick={handleCopy}>
            {copied ? (
              <>
                <Check aria-hidden="true" className="me-1.5 h-4 w-4" />
                نُسخ
              </>
            ) : (
              <>
                <Copy aria-hidden="true" className="me-1.5 h-4 w-4" />
                نسخ
              </>
            )}
          </Button>
        </div>
        {fallbackNote ? (
          <p role="status" className="text-xs font-medium leading-relaxed text-brand-700">
            {fallbackNote}
          </p>
        ) : null}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            إغلاق
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
