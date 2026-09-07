"use client";

/**
 * BlogEditor — محرر المقال (المهمة #15)
 * ---------------------------------------
 * نفس المكوّن للإضافة (new) والتعديل ([id]) — نمط المحررات الموحد:
 * مسودة بعد الترطيب فقط (D-22) + لقطة + Dirty + beforeunload + تأكيد إلغاء
 * + Validation + Toast.
 *
 * قرارات موثقة (Checkpoint 4):
 * - المحتوى كتل منظمة (BlogBlocksEditor) — بلا Rich Text Editor ولا HTML خام.
 * - Slug لاتيني صغير فريد (نفس قرار الدورات/المسارات — SLUG_PATTERN).
 * - readMinutes مشتق عند الحفظ من عدد الكلمات (≈180 كلمة/دقيقة) — لا يُحرَّر يدويًا.
 * - updatedAt يُختم عند كل حفظ (حقل اختياري أُضيف في v4).
 * - التاغز: trim + منع التكرار (حساسًا للمقارنة بعد trim).
 */
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Eye,
  LoaderCircle,
  RefreshCw,
  X,
} from "lucide-react";

import type { AdminBlogPost, PublishStatus } from "@/data/admin/types";
import type { PostInput } from "@/context/admin-store";
import { uniquePostSlug } from "@/data/admin/selectors";
import { useAdminActions, useAdminState } from "@/context/admin-store";
import { Field } from "@/components/admin/ui/field";
import { AdminPageHeader } from "@/components/admin/ui/admin-page-header";
import { ConfirmDialog } from "@/components/admin/ui/confirm-dialog";
import { EmptyState } from "@/components/admin/ui/empty-state";
import { ImageUpload } from "@/components/admin/ui/image-upload";
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
import { useToast } from "@/hooks/use-toast";
import { SLUG_PATTERN } from "@/components/admin/courses/course-meta";
import { BlogBlocksEditor } from "./blog-blocks-editor";

const STATUS_OPTIONS: Array<{ value: PublishStatus; label: string }> = [
  { value: "draft", label: "مسودة" },
  { value: "published", label: "منشور" },
];

function createDraftDefaults(): PostInput {
  return {
    title: "",
    slug: "",
    excerpt: "",
    contentBlocks: [],
    coverImage: "",
    coverImageAlt: "",
    category: "نصائح عملية",
    tags: [],
    author: "فريق بيت المصور",
    publishedAt: new Date().toISOString().slice(0, 10),
    readMinutes: 3,
    status: "draft",
    seo: { title: "", description: "" },
  };
}

function toDraft(post: AdminBlogPost): PostInput {
  const { id: _id, ...rest } = post;
  return { ...rest };
}

/** عدد الكلمات في كل الكتل النصية — أساس readMinutes المشتق */
function countWords(blocks: PostInput["contentBlocks"]): number {
  let words = 0;
  for (const block of blocks) {
    if (block.text) words += block.text.trim().split(/\s+/).filter(Boolean).length;
    if (block.items) {
      for (const item of block.items) {
        words += item.trim().split(/\s+/).filter(Boolean).length;
      }
    }
  }
  return words;
}

interface BlogEditorProps {
  mode: "create" | "edit";
  postId?: string;
}

export function BlogEditor({ mode, postId }: BlogEditorProps) {
  const router = useRouter();
  const { toast } = useToast();
  const { data, hydrated } = useAdminState();
  const { addPost, updatePost } = useAdminActions();

  const post = mode === "edit" ? data.posts.find((entry) => entry.id === postId) : undefined;

  const [draft, setDraft] = useState<PostInput | null>(() =>
    mode === "create" ? createDraftDefaults() : hydrated && post ? toDraft(post) : null,
  );
  const [snapshot, setSnapshot] = useState<string>(() =>
    mode === "create"
      ? JSON.stringify(createDraftDefaults())
      : hydrated && post
        ? JSON.stringify(toDraft(post))
        : "",
  );

  /* تغيير المعرّف ضمن نفس المسار → إعادة تهيئة (نمط D-19) */
  const [prevId, setPrevId] = useState<string | undefined>(postId);
  if (postId !== prevId) {
    setPrevId(postId);
    if (post) {
      const initial = toDraft(post);
      setSnapshot(JSON.stringify(initial));
      setDraft(initial);
    } else {
      setSnapshot("");
      setDraft(null);
    }
  }

  /* التهيئة المؤجلة بعد الترطيب (D-12/D-22) */
  if (mode === "edit" && hydrated && draft === null && post) {
    const initial = toDraft(post);
    setSnapshot(JSON.stringify(initial));
    setDraft(initial);
  }

  const isDirty = useMemo(
    () => draft !== null && JSON.stringify(draft) !== snapshot,
    [draft, snapshot],
  );

  useEffect(() => {
    if (!isDirty) return;
    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false);
  const [tagInput, setTagInput] = useState("");

  const categories = useMemo(() => {
    /* الفئات الموجودة في المخزن + فئة المسودة الحالية إن كانت جديدة */
    const existing = Array.from(new Set(data.posts.map((entry) => entry.category)));
    const current = draft?.category;
    return current && !existing.includes(current) ? [...existing, current] : existing;
  }, [data.posts, draft?.category]);

  if (mode === "edit" && hydrated && !post) {
    return (
      <div className="mx-auto w-full max-w-5xl">
        <EmptyState title="المقال غير موجود" description="ربما حُذف هذا المقال أو أن الرابط غير صحيح.">
          <Button asChild size="sm">
            <Link href="/admin/blog">العودة لقائمة المدونة</Link>
          </Button>
        </EmptyState>
      </div>
    );
  }

  if (!draft) {
    return (
      <div className="mx-auto flex w-full max-w-5xl items-center justify-center py-24 text-charcoal-300">
        <LoaderCircle aria-hidden="true" className="h-6 w-6 animate-spin" />
        <span className="sr-only">جارٍ تحميل بيانات المقال…</span>
      </div>
    );
  }

  const update = (patch: Partial<PostInput>) =>
    setDraft((prev) => (prev ? { ...prev, ...patch } : prev));

  function addTag(raw: string) {
    const tag = raw.trim().replace(/,+$/, "").trim();
    if (!tag) return;
    if (draft && draft.tags.some((entry) => entry === tag)) {
      setTagInput("");
      return;
    }
    if (draft) update({ tags: [...draft.tags, tag] });
    setTagInput("");
  }

  function removeTag(tag: string) {
    if (draft) update({ tags: draft.tags.filter((entry) => entry !== tag) });
  }

  function generateSlug() {
    if (!draft) return;
    const base = draft.slug.trim() || `post-${Date.now().toString(36)}`;
    update({ slug: uniquePostSlug(base, data.posts, postId) });
  }

  function validate(): Record<string, string> {
    if (!draft) return {};
    const next: Record<string, string> = {};
    if (!draft.title.trim()) next.title = "عنوان المقال مطلوب.";
    const slug = draft.slug.trim();
    if (!slug) {
      next.slug = "الـ Slug مطلوب.";
    } else if (!SLUG_PATTERN.test(slug)) {
      next.slug = "أحرف لاتينية صغيرة وأرقام وشرطات فقط (مثال: my-first-post).";
    } else {
      const taken = data.posts.some((entry) => entry.slug === slug && entry.id !== postId);
      if (taken) next.slug = "هذا الـ Slug مستخدم في مقال آخر — اختر قيمة فريدة.";
    }
    if (!draft.excerpt.trim()) next.excerpt = "المقتطف مطلوب (يظهر في بطاقة المقال).";
    if (!draft.author.trim()) next.author = "اسم الكاتب مطلوب.";
    if (!draft.publishedAt) next.publishedAt = "تاريخ النشر مطلوب.";
    if (draft.contentBlocks.length === 0) {
      next.blocks = "أضف كتلة محتوى واحدة على الأقل.";
    }
    return next;
  }

  function handleSave() {
    if (!draft) return;
    const validation = validate();
    setErrors(validation);

    const errorKeys = Object.keys(validation);
    if (errorKeys.length > 0) {
      document
        .getElementById(`post-${errorKeys[0]}`)
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
      toast({
        title: "تعذر الحفظ — راجع الحقول",
        description: validation[errorKeys[0]],
        variant: "destructive",
      });
      return;
    }

    const words = countWords(draft.contentBlocks);
    const clean: PostInput = {
      ...draft,
      title: draft.title.trim(),
      slug: draft.slug.trim(),
      excerpt: draft.excerpt.trim(),
      category: draft.category.trim() || "عام",
      author: draft.author.trim(),
      tags: draft.tags.map((tag) => tag.trim()).filter(Boolean),
      readMinutes: Math.max(1, Math.round(words / 180)),
      seo: {
        title: draft.seo.title?.trim() || draft.title.trim(),
        description: draft.seo.description?.trim() || draft.excerpt.trim(),
      },
    };

    if (mode === "create") {
      const newId = addPost(clean);
      toast({
        title: "تم إنشاء المقال",
        description: `أُضيف «${clean.title}» — معاينة المحتوى متاحة من زر المعاينة.`,
      });
      router.push(`/admin/blog/${newId}`);
    } else if (postId) {
      updatePost(postId, { ...clean, updatedAt: new Date().toISOString() });
      toast({ title: "تم حفظ المقال", description: `حُدّث «${clean.title}» بنجاح.` });
      router.push("/admin/blog");
    }
  }

  function handleCancel() {
    if (isDirty) {
      setCancelConfirmOpen(true);
      return;
    }
    router.push("/admin/blog");
  }

  return (
    <div className="mx-auto w-full max-w-5xl pb-24">
      <AdminPageHeader
        title={mode === "create" ? "مقال جديد" : draft.title || "تعديل المقال"}
        description={
          mode === "create"
            ? "اكتب مقالًا بكتل منظمة — فقرات وعناوين وصور واقتباسات وقوائم، بلا Rich Text Editor."
            : "عدّل بيانات المقال وكتل محتواه — الحفظ يختم تاريخ التحديث."
        }
      >
        {mode === "edit" && postId ? (
          <Button asChild variant="outline" size="sm">
            <Link href={`/admin/preview/blog/${postId}`}>
              <Eye aria-hidden="true" className="me-1.5 h-4 w-4" />
              معاينة
            </Link>
          </Button>
        ) : null}
      </AdminPageHeader>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* العمود الرئيسي */}
        <div className="space-y-4 lg:col-span-2">
          {/* البيانات الأساسية */}
          <section className="rounded-xl border border-border bg-white p-4 sm:p-6">
            <h2 className="mb-4 text-sm font-semibold text-charcoal-900">البيانات الأساسية</h2>
            <Field id="post-title" label="عنوان المقال" required error={errors.title}>
              <Input
                id="post-title"
                value={draft.title}
                onChange={(event) => update({ title: event.target.value })}
                placeholder="مثال: خمس إضاءة أساسية لتصوير المنتجات"
                aria-invalid={Boolean(errors.title)}
              />
            </Field>

            <Field
              id="post-slug"
              label="الـ Slug (الرابط اللاتيني)"
              required
              error={errors.slug}
              hint="أحرف لاتينية صغيرة وأرقام وشرطات فقط — فريد بين المقالات"
              className="mt-4"
            >
              <div className="flex gap-2">
                <Input
                  id="post-slug"
                  value={draft.slug}
                  dir="ltr"
                  className="font-latin"
                  onChange={(event) => update({ slug: event.target.value })}
                  placeholder="product-lighting-basics"
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

            <Field
              id="post-excerpt"
              label="المقتطف"
              required
              error={errors.excerpt}
              hint="سطر تعريفي يظهر في بطاقة المقال ونتائج البحث"
              className="mt-4"
            >
              <Textarea
                id="post-excerpt"
                value={draft.excerpt}
                onChange={(event) => update({ excerpt: event.target.value })}
                rows={2}
                aria-invalid={Boolean(errors.excerpt)}
              />
            </Field>
          </section>

          {/* كتل المحتوى */}
          <section className="rounded-xl border border-border bg-white p-4 sm:p-6" id="post-blocks">
            <h2 className="mb-1 text-sm font-semibold text-charcoal-900">كتل المحتوى</h2>
            <p className="mb-4 text-xs leading-relaxed text-muted-foreground">
              محرر منظم بلا HTML خام: أضف كتلًا ورتّبها بالأسهم. كل كتلة تُحرَّر في مكانها.
            </p>
            {errors.blocks ? (
              <p role="alert" className="mb-3 text-xs font-medium text-brand-700" id="post-blocks-error">
                {errors.blocks}
              </p>
            ) : null}
            <BlogBlocksEditor
              blocks={draft.contentBlocks}
              onChange={(contentBlocks) => update({ contentBlocks })}
            />
          </section>

          {/* SEO */}
          <section className="rounded-xl border border-border bg-white p-4 sm:p-6">
            <h2 className="mb-4 text-sm font-semibold text-charcoal-900">SEO</h2>
            <div className="space-y-4">
              <Field
                id="post-seo-title"
                label="عنوان SEO"
                hint="افتراضيًا يأخذ عنوان المقال عند الحفظ إن تُرك فارغًا"
              >
                <Input
                  id="post-seo-title"
                  value={draft.seo.title ?? ""}
                  onChange={(event) => update({ seo: { ...draft.seo, title: event.target.value } })}
                />
              </Field>
              <Field
                id="post-seo-description"
                label="الوصف التعريفي (Meta Description)"
                hint="افتراضيًا يأخذ المقتطف عند الحفظ إن تُرك فارغًا"
              >
                <Textarea
                  id="post-seo-description"
                  value={draft.seo.description ?? ""}
                  onChange={(event) =>
                    update({ seo: { ...draft.seo, description: event.target.value } })
                  }
                  rows={2}
                />
              </Field>
            </div>
          </section>
        </div>

        {/* العمود الجانبي */}
        <div className="space-y-4">
          {/* النشر */}
          <section className="rounded-xl border border-border bg-white p-4 sm:p-6">
            <h2 className="mb-4 text-sm font-semibold text-charcoal-900">النشر</h2>
            <div className="space-y-4">
              <Field id="post-status" label="حالة المقال">
                <Select
                  value={draft.status}
                  onValueChange={(value) => update({ status: value as PublishStatus })}
                >
                  <SelectTrigger id="post-status" aria-label="حالة المقال">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field id="post-publishedAt" label="تاريخ النشر" required error={errors.publishedAt}>
                <Input
                  id="post-publishedAt"
                  type="date"
                  value={draft.publishedAt}
                  onChange={(event) => update({ publishedAt: event.target.value })}
                  dir="ltr"
                  className="num-ltr"
                  aria-invalid={Boolean(errors.publishedAt)}
                />
              </Field>
              <Field id="post-author" label="الكاتب" required error={errors.author}>
                <Input
                  id="post-author"
                  value={draft.author}
                  onChange={(event) => update({ author: event.target.value })}
                  aria-invalid={Boolean(errors.author)}
                />
              </Field>
              <p className="rounded-lg bg-surface px-3 py-2 text-xs leading-relaxed text-muted-foreground">
                وقت القراءة مشتق تلقائيًا من عدد الكلمات عند الحفظ —{" "}
                <span className="num-ltr font-medium text-charcoal-700">
                  {Math.max(1, Math.round(countWords(draft.contentBlocks) / 180))}
                </span>{" "}
                دقيقة حاليًا.
              </p>
            </div>
          </section>

          {/* التصنيف */}
          <section className="rounded-xl border border-border bg-white p-4 sm:p-6">
            <h2 className="mb-4 text-sm font-semibold text-charcoal-900">التصنيف</h2>
            <div className="space-y-4">
              <Field id="post-category" label="الفئة" hint="اختر من الموجود أو اكتب فئة جديدة">
                <Input
                  id="post-category"
                  value={draft.category}
                  onChange={(event) => update({ category: event.target.value })}
                  list="post-categories-list"
                />
                <datalist id="post-categories-list">
                  {categories.map((category) => (
                    <option key={category} value={category} />
                  ))}
                </datalist>
              </Field>

              <Field id="post-tags" label="التاغز" hint="اكتب تاغًا واضغط Enter — يُمنع التكرار">
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <Input
                      id="post-tags"
                      value={tagInput}
                      onChange={(event) => setTagInput(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === ",") {
                          event.preventDefault();
                          addTag(tagInput);
                        }
                      }}
                      onBlur={() => tagInput.trim() && addTag(tagInput)}
                      placeholder="مثال: إضاءة"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="shrink-0"
                      onClick={() => addTag(tagInput)}
                    >
                      إضافة
                    </Button>
                  </div>
                  {draft.tags.length > 0 ? (
                    <ul className="flex flex-wrap gap-1.5">
                      {draft.tags.map((tag) => (
                        <li
                          key={tag}
                          className="inline-flex items-center gap-1 rounded-md bg-surface px-2 py-1 text-xs text-charcoal-700"
                        >
                          {tag}
                          <button
                            type="button"
                            onClick={() => removeTag(tag)}
                            aria-label={`إزالة تاغ ${tag}`}
                            className="text-charcoal-400 hover:text-brand-700"
                          >
                            <X aria-hidden="true" className="h-3 w-3" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              </Field>
            </div>
          </section>

          {/* الغلاف */}
          <section className="rounded-xl border border-border bg-white p-4 sm:p-6">
            <h2 className="mb-4 text-sm font-semibold text-charcoal-900">صورة الغلاف</h2>
            <ImageUpload
              id="post-cover"
              label="الغلاف"
              value={draft.coverImage}
              alt={draft.coverImageAlt ?? ""}
              aspect="video"
              onChange={({ value, alt }) => update({ coverImage: value, coverImageAlt: alt })}
              hint="رفع تجريبي — معاينة محلية فقط."
            />
          </section>
        </div>
      </div>

      {/* شريط الحفظ الثابت */}
      <div className="sticky bottom-0 -mx-4 mt-6 border-t border-border bg-white px-4 py-3 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-3">
          <p aria-live="polite" className="flex items-center gap-2 text-xs text-muted-foreground">
            {isDirty ? (
              <>
                <span aria-hidden="true" className="h-2 w-2 rounded-full bg-brand-500" />
                تغييرات غير محفوظة
              </>
            ) : (
              "لا تغييرات جديدة"
            )}
          </p>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handleCancel}>
              إلغاء
            </Button>
            <Button onClick={handleSave}>حفظ المقال</Button>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={cancelConfirmOpen}
        onOpenChange={setCancelConfirmOpen}
        title="تجاهل التغييرات؟"
        description="لديك تعديلات غير محفوظة ستُفقد عند المغادرة. هل تريد المتابعة دون حفظ؟"
        confirmLabel="تجاهل التغييرات"
        onConfirm={() => router.push("/admin/blog")}
      />
    </div>
  );
}
