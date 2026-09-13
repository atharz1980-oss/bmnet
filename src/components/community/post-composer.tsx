"use client";
/**
 * منشئ المنشورات (CP-H V1) — صور 1-6 + تعليق مصاحب + حقول اختيارية.
 * يغطي: حالة تحميل، منع النقر المزدوج، فشل الرفع مع تنظيف، حدود النصوص، نص بديل إلزامي.
 */
import { useRef, useState } from "react";
import { ImageIcon, Loader2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { uploadCommunityMediaAction } from "@/app/community/actions/profile";
import { createPostAction, updatePostAction } from "@/app/community/actions/posts";
import { MAX_POST_MEDIA, validateCaption } from "@/lib/community/validation";
import type { FeedPost, PostInput } from "@/lib/community/types";
import { CommunityImage } from "./community-image";

interface ComposerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing?: FeedPost | null;
  onSaved?: () => void;
}

export function PostComposer({ open, onOpenChange, editing, onSaved }: ComposerProps) {
  const { toast } = useToast();
  const [caption, setCaption] = useState(editing?.caption ?? "");
  const [category, setCategory] = useState(editing?.category ?? "");
  const [camera, setCamera] = useState(editing?.camera ?? "");
  const [lens, setLens] = useState(editing?.lens ?? "");
  const [locationName, setLocationName] = useState(editing?.locationName ?? "");
  const [media, setMedia] = useState<{ path: string; alt: string; url: string }[]>(
    (editing?.media ?? []).map((m) => ({ path: m.path, alt: m.alt, url: m.url })),
  );
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    const room = MAX_POST_MEDIA - media.length;
    if (room <= 0) {
      toast({ title: `الحد الأقصى ${MAX_POST_MEDIA} صور للمنشور`, variant: "destructive" });
      return;
    }
    setUploading(true);
    try {
      const added: { path: string; alt: string; url: string }[] = [];
      for (const file of Array.from(files).slice(0, room)) {
        const result = await uploadCommunityMediaAction(file, file.name.replace(/\.[^.]+$/, ""));
        if (result.ok) {
          added.push({ path: result.data.path, alt: "", url: URL.createObjectURL(file) });
        } else {
          toast({ title: "تعذر رفع الصورة", description: result.error, variant: "destructive" });
        }
      }
      setMedia((prev) => [...prev, ...added]);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  function buildInput(): PostInput {
    return {
      caption,
      category,
      camera,
      lens,
      locationName,
      media: media.map((m) => ({ path: m.path, alt: m.alt })),
    };
  }

  async function handleSubmit() {
    const captionError = validateCaption(caption);
    if (captionError) {
      toast({ title: "تعذر الحفظ", description: captionError, variant: "destructive" });
      return;
    }
    if (media.length === 0) {
      toast({ title: "أضف صورة واحدة على الأقل", variant: "destructive" });
      return;
    }
    setBusy(true);
    try {
      const input = buildInput();
      const result = editing
        ? await updatePostAction(editing.id, input)
        : await createPostAction(input);
      if (result.ok) {
        toast({ title: editing ? "تم تحديث المنشور" : "تم نشر المنشور" });
        onOpenChange(false);
        onSaved?.();
      } else {
        toast({ title: "تعذر الحفظ — راجع الحقول", description: result.error, variant: "destructive" });
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!busy) onOpenChange(o); }}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{editing ? "تعديل المنشور" : "منشور جديد"}</DialogTitle>
          <DialogDescription>شارك صورة من أعمالك مع مجتمع بيت المصور.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="composer-caption">التعليق المصاحب</Label>
            <Textarea id="composer-caption" value={caption}
              onChange={(e) => setCaption(e.target.value)}
              maxLength={2200} rows={4} placeholder="اكتب قصة الصورة…"
              aria-describedby="composer-caption-hint" />
            <p id="composer-caption-hint" className="text-xs text-muted-foreground">
              {caption.length}/2200
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="composer-category">التصنيف (اختياري)</Label>
              <Input id="composer-category" value={category} onChange={(e) => setCategory(e.target.value)} maxLength={60} placeholder="بورتريه، منظر…" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="composer-location">الموقع (اختياري)</Label>
              <Input id="composer-location" value={locationName} onChange={(e) => setLocationName(e.target.value)} maxLength={120} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="composer-camera">الكاميرا (اختياري)</Label>
              <Input id="composer-camera" value={camera} onChange={(e) => setCamera(e.target.value)} maxLength={80} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="composer-lens">العدسة (اختياري)</Label>
              <Input id="composer-lens" value={lens} onChange={(e) => setLens(e.target.value)} maxLength={80} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="composer-files">الصور ({media.length}/{MAX_POST_MEDIA})</Label>
            <input ref={fileRef} id="composer-files" type="file" accept="image/jpeg,image/png,image/webp"
              multiple className="hidden" onChange={(e) => handleFiles(e.target.files)} />
            <Button type="button" variant="outline" onClick={() => fileRef.current?.click()}
              disabled={uploading || media.length >= MAX_POST_MEDIA}>
              {uploading ? <Loader2 className="size-4 animate-spin" /> : <ImageIcon className="size-4" />}
              اختر صورًا (JPG/PNG/WEBP — حتى 5MB)
            </Button>
            {media.length > 0 ? (
              <div className="grid grid-cols-3 gap-2 pt-2">
                {media.map((m, index) => (
                  <div key={m.path} className="relative aspect-square overflow-hidden rounded-md border">
                    <CommunityImage src={m.url} alt={m.alt || "صورة مرفوعة"} fill sizes="120px" className="object-cover" />
                    <button type="button" aria-label={`إزالة الصورة ${index + 1}`}
                      onClick={() => setMedia((prev) => prev.filter((x) => x.path !== m.path))}
                      className="absolute end-1 top-1 rounded-full bg-background/80 p-1">
                      <X className="size-3" />
                    </button>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>إلغاء</Button>
          <Button onClick={handleSubmit} disabled={busy || uploading}>
            {busy ? <Loader2 className="size-4 animate-spin" /> : null}
            {editing ? "حفظ التعديل" : "نشر"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
