"use client";
/**
 * مدير مشاريع الأعمال (CP-H V1) — إنشاء/تعديل/حذف/نشر-إلغاء + وسائط + غلاف.
 * يظهر في صفحة ملفي تحت المحرر؛ القوائم العامة تعرض المنشور فقط (عبر RLS).
 */
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Loader2, Pencil, Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { uploadCommunityMediaAction } from "@/app/community/actions/profile";
import {
  createPortfolioProjectAction,
  deletePortfolioProjectAction,
  updatePortfolioProjectAction,
} from "@/app/community/actions/portfolio";
import { MAX_PORTFOLIO_MEDIA } from "@/lib/community/validation";
import type { PortfolioProjectView } from "@/lib/community/types";
import { CommunityImage } from "./community-image";

interface ProjectForm {
  id?: string;
  title: string;
  description: string;
  category: string;
  locationName: string;
  projectDate: string;
  coverPath: string;
  published: boolean;
  media: { path: string; alt: string }[];
}

const EMPTY: ProjectForm = {
  title: "", description: "", category: "", locationName: "",
  projectDate: "", coverPath: "", published: false, media: [],
};

export function PortfolioManager({ initialProjects }: { initialProjects: PortfolioProjectView[] }) {
  const router = useRouter();
  const { toast } = useToast();
  const [projects, setProjects] = useState(initialProjects);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<ProjectForm>(EMPTY);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const mediaRef = useRef<HTMLInputElement>(null);
  const coverRef = useRef<HTMLInputElement>(null);

  function openCreate() {
    setForm(EMPTY);
    setOpen(true);
  }

  function openEdit(project: PortfolioProjectView) {
    setForm({
      id: project.id,
      title: project.title,
      description: project.description,
      category: project.category,
      locationName: project.locationName,
      projectDate: project.projectDate,
      coverPath: project.coverUrl.includes("community-media/")
        ? decodeURIComponent(project.coverUrl.split("community-media/")[1] ?? "")
        : "",
      published: project.published,
      media: project.media.map((m) => ({
        path: decodeURIComponent(m.url.split("community-media/")[1] ?? m.path),
        alt: m.alt,
      })),
    });
    setOpen(true);
  }

  async function uploadMedia(files: FileList | null, kind: "media" | "cover") {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        if (kind === "media" && form.media.length >= MAX_PORTFOLIO_MEDIA) {
          toast({ title: `الحد الأقصى ${MAX_PORTFOLIO_MEDIA} صورة للمشروع`, variant: "destructive" });
          break;
        }
        const result = await uploadCommunityMediaAction(file, file.name.replace(/\.[^.]+$/, ""));
        if (result.ok) {
          if (kind === "cover") setForm((f) => ({ ...f, coverPath: result.data.path }));
          else setForm((f) => ({ ...f, media: [...f.media, { path: result.data.path, alt: "" }] }));
        } else {
          toast({ title: "تعذر رفع الصورة", description: result.error, variant: "destructive" });
        }
      }
    } finally {
      setUploading(false);
      if (mediaRef.current) mediaRef.current.value = "";
      if (coverRef.current) coverRef.current.value = "";
    }
  }

  async function handleSave() {
    if (!form.title.trim()) {
      toast({ title: "عنوان المشروع مطلوب", variant: "destructive" });
      return;
    }
    setBusy(true);
    try {
      const input = {
        title: form.title,
        description: form.description,
        category: form.category,
        locationName: form.locationName,
        projectDate: form.projectDate,
        coverPath: form.coverPath,
        published: form.published,
        media: form.media,
      };
      const result = form.id
        ? await updatePortfolioProjectAction(form.id, input)
        : await createPortfolioProjectAction(input);
      if (result.ok) {
        toast({ title: form.id ? "تم تحديث المشروع" : "تم إنشاء المشروع" });
        setOpen(false);
        router.refresh();
      } else {
        toast({ title: "تعذر الحفظ — راجع الحقول", description: result.error, variant: "destructive" });
      }
    } finally {
      setBusy(false);
    }
  }

  async function togglePublished(project: PortfolioProjectView) {
    const target = !project.published;
    setBusy(true);
    try {
      const result = await updatePortfolioProjectAction(project.id, {
        title: project.title,
        description: project.description,
        category: project.category,
        locationName: project.locationName,
        projectDate: project.projectDate,
        coverPath: project.coverUrl.includes("community-media/")
          ? decodeURIComponent(project.coverUrl.split("community-media/")[1] ?? "")
          : "",
        published: target,
        media: project.media.map((m) => ({
          path: decodeURIComponent(m.url.split("community-media/")[1] ?? m.path),
          alt: m.alt,
        })),
      });
      if (result.ok) {
        setProjects((prev) => prev.map((p) => (p.id === project.id ? { ...p, published: target } : p)));
        toast({ title: target ? "نُشر المشروع" : "أُلغي نشر المشروع" });
        router.refresh();
      } else {
        toast({ title: "تعذر التغيير", description: result.error, variant: "destructive" });
      }
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(project: PortfolioProjectView) {
    setBusy(true);
    try {
      const result = await deletePortfolioProjectAction(project.id);
      if (result.ok) {
        setProjects((prev) => prev.filter((p) => p.id !== project.id));
        toast({ title: "تم حذف المشروع" });
        router.refresh();
      } else {
        toast({ title: "تعذر الحذف", description: result.error, variant: "destructive" });
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">مشاريع أعمالي</h2>
        <Button onClick={openCreate} size="sm">
          <Plus className="size-4" /> مشروع جديد
        </Button>
      </div>

      {projects.length === 0 ? (
        <p className="rounded-xl border bg-card p-6 text-center text-sm text-muted-foreground">
          لا مشاريع بعد — أنشئ مشروعك الأول ليعرض في ملفك العام.
        </p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2" aria-label="قائمة مشاريعي">
          {projects.map((project) => (
            <li key={project.id} className="overflow-hidden rounded-xl border bg-card">
              {project.coverUrl ? (
                <div className="relative aspect-[3/2] bg-muted">
                  <CommunityImage src={project.coverUrl} alt={`غلاف ${project.title}`} fill sizes="320px" className="object-cover" />
                </div>
              ) : null}
              <div className="space-y-2 p-3">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-semibold truncate">{project.title}</h3>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs ${project.published ? "bg-brand-50 text-brand-800" : "bg-muted text-muted-foreground"}`}>
                    {project.published ? "منشور" : "مسودة"}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <Button size="sm" variant="outline" onClick={() => openEdit(project)}>
                    <Pencil className="size-3.5" /> تعديل
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => togglePublished(project)} disabled={busy}>
                    {project.published ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                    {project.published ? "إلغاء النشر" : "نشر"}
                  </Button>
                  <Button size="sm" variant="ghost" className="text-destructive" onClick={() => handleDelete(project)} disabled={busy}>
                    <Trash2 className="size-3.5" /> حذف
                  </Button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Dialog open={open} onOpenChange={(o) => { if (!busy) setOpen(o); }}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{form.id ? "تعديل المشروع" : "مشروع جديد"}</DialogTitle>
            <DialogDescription>مجموعة صور تحكي مشروعًا واحدًا.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="pf-title">العنوان</Label>
              <Input id="pf-title" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} maxLength={120} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pf-desc">الوصف</Label>
              <Textarea id="pf-desc" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} rows={3} maxLength={2000} />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="pf-cat">التصنيف</Label>
                <Input id="pf-cat" value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))} maxLength={60} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pf-loc">الموقع</Label>
                <Input id="pf-loc" value={form.locationName} onChange={(e) => setForm((f) => ({ ...f, locationName: e.target.value }))} maxLength={120} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pf-date">التاريخ</Label>
                <Input id="pf-date" type="date" value={form.projectDate} onChange={(e) => setForm((f) => ({ ...f, projectDate: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pf-media">صور المشروع ({form.media.length}/{MAX_PORTFOLIO_MEDIA})</Label>
              <input ref={mediaRef} id="pf-media" type="file" accept="image/jpeg,image/png,image/webp" multiple className="hidden"
                onChange={(e) => uploadMedia(e.target.files, "media")} />
              <input ref={coverRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden"
                onChange={(e) => uploadMedia(e.target.files, "cover")} />
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => mediaRef.current?.click()} disabled={uploading}>
                  {uploading ? <Loader2 className="size-4 animate-spin" /> : null} إضافة صور
                </Button>
                <Button type="button" variant="outline" onClick={() => coverRef.current?.click()} disabled={uploading}>
                  اختيار غلاف
                </Button>
              </div>
              {form.media.length > 0 ? (
                <div className="grid grid-cols-4 gap-2 pt-2">
                  {form.media.map((m, index) => (
                    <button key={m.path} type="button"
                      onClick={() => setForm((f) => ({ ...f, coverPath: m.path }))}
                      className={`relative aspect-square overflow-hidden rounded-md border ${form.coverPath === m.path ? "ring-2 ring-brand-600" : ""}`}
                      aria-label={`تعيين الصورة ${index + 1} كغلاف`}>
                      <CommunityImage src={communityMediaUrl(m.path)} alt="" fill sizes="90px" className="object-cover" />
                    </button>
                  ))}
                </div>
              ) : null}
              <p className="text-xs text-muted-foreground">انقر على صورة لجعلها غلافًا.</p>
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <Label htmlFor="pf-pub" className="text-sm">منشور في ملفي العام</Label>
              <Switch id="pf-pub" checked={form.published} onCheckedChange={(v) => setForm((f) => ({ ...f, published: v }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={busy}>إلغاء</Button>
            <Button onClick={handleSave} disabled={busy}>
              {busy ? <Loader2 className="size-4 animate-spin" /> : null} حفظ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/** نفس صيغة resolveCommunityMediaUrl — للعرض الفوري بعد الرفع */
function communityMediaUrl(path: string): string {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  return path ? `${base}/storage/v1/object/public/community-media/${path}` : "";
}
