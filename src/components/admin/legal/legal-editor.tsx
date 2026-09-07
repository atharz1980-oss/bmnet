"use client";

/**
 * LegalEditor — محرر صفحة قانونية (#18)
 * ---------------------------------------
 * العنوان + Slug (نمط لاتيني موحد) + محتوى textarea منظم (فقرات
 * مفصولة بسطر فارغ — بلا Rich Text) + تاريخ آخر تحديث + نشر.
 * المعاينة داخل نفس الصفحة (تبديل تحرير/معاينة) — وLast updated
 * يُقترح اليوم عند الحفظ مع تغيّر المحتوى (قرار موثق).
 */
import { useMemo, useState } from "react";
import Link from "next/link";
import { Eye, LoaderCircle, Pencil } from "lucide-react";

import { useAdminActions, useAdminState } from "@/context/admin-store";
import type { LegalPage } from "@/data/admin/types";
import { formatDate, todayISO } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useSettingsDraft } from "@/components/admin/settings/use-settings-draft";
import { ConfirmDialog } from "@/components/admin/ui/confirm-dialog";
import { AdminPageHeader } from "@/components/admin/ui/admin-page-header";
import { Field } from "@/components/admin/ui/field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

/** نمط slug لاتيني موحد — نفس قرار المدونة (D-29) */
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

interface LegalEditorProps {
  pageId: string;
}

export function LegalEditor({ pageId }: LegalEditorProps) {
  const { toast } = useToast();
  const { data, hydrated } = useAdminState();
  const { updateLegal } = useAdminActions();

  const page = data.legal.find((entry) => entry.id === pageId);
  const [viewMode, setViewMode] = useState<"edit" | "preview">("edit");
  const [slugError, setSlugError] = useState("");

  const { draft, isDirty, patchDraft, handleSave, tryCancel, cancelConfirmOpen, setCancelConfirmOpen, confirmCancel } =
    useSettingsDraft<LegalPage>({
      select: (store) => {
        const found = store.legal.find((entry) => entry.id === pageId);
        if (!found) throw new Error(`legal page not found: ${pageId}`);
        return found;
      },
      update: (value) => updateLegal(pageId, value),
      successToast: { title: "حُفظت الصفحة القانونية" },
    });

  const paragraphs = useMemo(
    () =>
      (draft?.content ?? "")
        .split(/\n\n+/)
        .map((paragraph) => paragraph.trim())
        .filter(Boolean),
    [draft?.content],
  );

  if (hydrated && !page) {
    return (
      <div className="mx-auto w-full max-w-4xl py-12 text-center">
        <p className="text-sm text-charcoal-500">الصفحة القانونية غير موجودة.</p>
        <Button asChild size="sm" variant="outline" className="mt-3">
          <Link href="/admin/legal">العودة للقائمة</Link>
        </Button>
      </div>
    );
  }

  if (!draft) {
    return (
      <div className="py-24 text-center text-sm text-charcoal-400">
        <span className="sr-only">جارٍ تحميل الصفحة…</span>
        <LoaderCircle aria-hidden="true" className="mx-auto h-6 w-6 animate-spin text-charcoal-300" />
      </div>
    );
  }

  function validateSlug(slug: string): string {
    if (!slug.trim()) return "الـ slug مطلوب.";
    if (!SLUG_PATTERN.test(slug)) return "أحرف لاتينية صغيرة وأرقام وشرطات فقط (مثل refund-policy).";
    const duplicate = data.legal.some((entry) => entry.slug === slug && entry.id !== pageId);
    if (duplicate) return "هذا الـ slug مستخدم في صفحة قانونية أخرى.";
    return "";
  }

  function handleSaveWithValidation() {
    const error = validateSlug(draft!.slug);
    setSlugError(error);
    if (error) {
      toast({ title: "تعذر الحفظ — راجع الحقول", description: error, variant: "destructive" });
      return;
    }
    /* آخر تحديث = اليوم عند تعديل المحتوى فعليًا */
    const contentChanged = draft!.content !== page?.content;
    const next: LegalPage = contentChanged
      ? { ...draft!, lastUpdated: todayISO() }
      : draft!;
    patchDraft(next);
    handleSave(next);
  }

  return (
    <div className="mx-auto w-full max-w-4xl">
      <AdminPageHeader
        title={draft.title || "صفحة قانونية"}
        description={`آخر تحديث منشور: ${formatDate(draft.lastUpdated)} — الرابط العام: /policies/${draft.slug}`}
      >
        <Button asChild variant="outline" size="sm">
          <Link href="/admin/legal">قائمة الصفحات</Link>
        </Button>
      </AdminPageHeader>

      {/* تبديل تحرير/معاينة */}
      <div
        role="group"
        aria-label="عرض المحرر أو المعاينة"
        className="mb-4 inline-flex items-center gap-1 rounded-lg border border-border bg-white p-1"
      >
        <button
          type="button"
          onClick={() => setViewMode("edit")}
          aria-pressed={viewMode === "edit"}
          className={cn(
            "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
            viewMode === "edit"
              ? "bg-brand-50 text-brand-700"
              : "text-charcoal-500 hover:text-charcoal-800",
          )}
        >
          <Pencil aria-hidden="true" className="h-3.5 w-3.5" />
          تحرير
        </button>
        <button
          type="button"
          onClick={() => setViewMode("preview")}
          aria-pressed={viewMode === "preview"}
          className={cn(
            "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
            viewMode === "preview"
              ? "bg-brand-50 text-brand-700"
              : "text-charcoal-500 hover:text-charcoal-800",
          )}
        >
          <Eye aria-hidden="true" className="h-3.5 w-3.5" />
          معاينة
        </button>
      </div>

      {viewMode === "edit" ? (
        <div className="space-y-4 pb-4">
          <section className="rounded-xl border border-border bg-white p-4 sm:p-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field id="legal-title" label="العنوان" required>
                <Input
                  id="legal-title"
                  value={draft.title}
                  onChange={(event) => patchDraft({ title: event.target.value })}
                />
              </Field>
              <Field
                id="legal-slug"
                label="Slug"
                required
                error={slugError}
                hint="يحدد رابط الصفحة العامة — تغييره بعد النشر يغيّر الرابط"
              >
                <Input
                  id="legal-slug"
                  value={draft.slug}
                  dir="ltr"
                  className="font-latin"
                  onChange={(event) => {
                    patchDraft({ slug: event.target.value });
                    if (slugError) setSlugError("");
                  }}
                  aria-invalid={Boolean(slugError)}
                />
              </Field>
            </div>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Field id="legal-updated" label="آخر تحديث" hint="يُحدَّث تلقائيًا عند حفظ محتوى معدّل">
                <Input
                  id="legal-updated"
                  type="date"
                  value={draft.lastUpdated}
                  onChange={(event) => patchDraft({ lastUpdated: event.target.value })}
                  dir="ltr"
                  className="num-ltr"
                />
              </Field>
              <div className="flex items-center justify-between gap-4 rounded-xl border border-border bg-surface/60 px-4 py-3 sm:justify-between">
                <div>
                  <p className="text-sm font-medium text-charcoal-800">منشورة</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    غير المنشورة لا تعامل كمحتوى عام معتمد
                  </p>
                </div>
                <Switch
                  checked={draft.published}
                  onCheckedChange={(checked) => patchDraft({ published: checked })}
                  aria-label="نشر الصفحة القانونية"
                />
              </div>
            </div>
          </section>

          <section className="rounded-xl border border-border bg-white p-4 sm:p-6">
            <Field
              id="legal-content"
              label="المحتوى"
              hint="اكتب كل فقرة ثم اترك سطرًا فارغًا قبل الفقرة التالية — تُعرض الفقرات متباعدة كما في الموقع العام"
            >
              <Textarea
                id="legal-content"
                value={draft.content}
                onChange={(event) => patchDraft({ content: event.target.value })}
                rows={14}
                className="leading-loose"
                placeholder="الفقرة الأولى…\n\nالفقرة الثانية…"
              />
            </Field>
          </section>
        </div>
      ) : (
        /* المعاينة داخل نفس الصفحة — بنفس نمط عرض policies/[slug] */
        <article className="rounded-xl border border-border bg-white p-5 sm:p-8">
          <header className="mb-6 border-b border-border pb-4">
            <p className="text-xs font-medium text-brand-600">معاينة — {draft.published ? "منشورة" : "غير منشورة"}</p>
            <h1 className="mt-1 text-xl font-bold text-charcoal-900 sm:text-2xl">{draft.title}</h1>
            <p className="mt-1 text-xs text-charcoal-400">آخر تحديث: {formatDate(draft.lastUpdated)}</p>
          </header>
          {paragraphs.length === 0 ? (
            <p className="rounded-lg border border-dashed border-charcoal-200 bg-surface/50 px-4 py-6 text-center text-sm text-charcoal-400">
              لا محتوى بعد — عد إلى وضع التحرير واكتب الفقرات.
            </p>
          ) : (
            <div className="space-y-4">
              {paragraphs.map((paragraph, index) => (
                <p key={index} className="leading-loose text-charcoal-700">
                  {paragraph}
                </p>
              ))}
            </div>
          )}
        </article>
      )}

      {/* شريط الحفظ */}
      <div className="sticky bottom-0 -mx-4 mt-6 border-t border-border bg-white px-4 py-3 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
        <div className="flex items-center justify-between gap-3">
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
            <Button variant="outline" onClick={tryCancel}>
              إلغاء
            </Button>
            <Button onClick={handleSaveWithValidation}>حفظ الصفحة</Button>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={cancelConfirmOpen}
        onOpenChange={setCancelConfirmOpen}
        title="تجاهل التغييرات؟"
        description="لديك تعديلات غير محفوظة على هذه الصفحة القانونية ستُفقد. هل تريد المتابعة دون حفظ؟"
        confirmLabel="تجاهل التغييرات"
        onConfirm={confirmCancel}
      />
    </div>
  );
}
