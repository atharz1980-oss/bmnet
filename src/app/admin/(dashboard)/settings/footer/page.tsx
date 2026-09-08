"use client";

/**
 * /admin/settings/footer — إعدادات الفوتر (#18)
 * -----------------------------------------------
 * نبذة قصيرة + روابط سريعة ديناميكية (Label/URL/Enabled/ترتيب ↑↓)
 * + روابط قانونية مربوطة بصفحات /admin/legal (لا نسخ نصوص) + روابط
 * السوشال + نص حقوق النشر.
 */
import Link from "next/link";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";

import { useAdminActions, useAdminState } from "@/context/admin-store";
import type { FooterLink, FooterSettings } from "@/data/admin/types";
import { useSettingsDraft } from "@/components/admin/settings/use-settings-draft";
import {
  SettingsPageLayout,
  SettingsSaveBar,
} from "@/components/admin/settings/settings-shared";
import { AdminPageHeader } from "@/components/admin/ui/admin-page-header";
import { Field } from "@/components/admin/ui/field";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

/** محرر قائمة روابط الفوتر (سريعة أو سوشال) — الترتيب جزء من البيانات */
function LinksEditor({
  title,
  hint,
  links,
  onChange,
}: {
  title: string;
  hint?: string;
  links: FooterLink[];
  onChange: (links: FooterLink[]) => void;
}) {
  function updateLink(index: number, patch: Partial<FooterLink>) {
    onChange(links.map((link, i) => (i === index ? { ...link, ...patch } : link)));
  }

  function moveLink(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= links.length) return;
    const next = [...links];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  }

  return (
    <section className="rounded-xl border border-border bg-white p-4 sm:p-6">
      <h2 className="mb-1 text-sm font-semibold text-charcoal-900">{title}</h2>
      {hint ? <p className="mb-3 text-xs leading-relaxed text-muted-foreground">{hint}</p> : null}
      <ul className="space-y-2.5">
        {links.map((link, index) => (
          <li key={link.id} className="flex flex-col gap-2 rounded-xl border border-border bg-surface/50 p-3 sm:flex-row sm:items-end">
            <div className="flex-1 space-y-2 sm:grid sm:grid-cols-2 sm:gap-2 sm:space-y-0">
              <Field id={`fl-${link.id}-label`} label="النص" compact>
                <Input
                  id={`fl-${link.id}-label`}
                  value={link.label}
                  onChange={(event) => updateLink(index, { label: event.target.value })}
                  aria-label={`نص الرابط ${index + 1}`}
                />
              </Field>
              <Field id={`fl-${link.id}-href`} label="الرابط" compact>
                <Input
                  id={`fl-${link.id}-href`}
                  value={link.href}
                  dir="ltr"
                  className="font-latin"
                  onChange={(event) => updateLink(index, { href: event.target.value })}
                  aria-label={`رابط ${index + 1}`}
                />
              </Field>
            </div>
            <div className="flex items-center justify-between gap-1 sm:justify-end">
              <div className="flex items-center gap-1.5 pe-2">
                <Switch
                  checked={link.enabled !== false}
                  onCheckedChange={(checked) => updateLink(index, { enabled: checked })}
                  aria-label={`تفعيل رابط ${link.label}`}
                />
                <span className="text-[10px] font-medium text-charcoal-500">
                  {link.enabled !== false ? "ظاهر" : "مخفي"}
                </span>
              </div>
              <div className="flex items-center gap-0.5">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-charcoal-500"
                  onClick={() => moveLink(index, -1)}
                  disabled={index === 0}
                  aria-label={`نقل ${link.label} للأعلى`}
                >
                  <ArrowUp aria-hidden="true" className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-charcoal-500"
                  onClick={() => moveLink(index, 1)}
                  disabled={index === links.length - 1}
                  aria-label={`نقل ${link.label} للأسفل`}
                >
                  <ArrowDown aria-hidden="true" className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-brand-700 hover:bg-brand-50 hover:text-brand-700"
                  onClick={() => onChange(links.filter((_, i) => i !== index))}
                  aria-label={`حذف رابط ${link.label}`}
                >
                  <Trash2 aria-hidden="true" className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </li>
        ))}
      </ul>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="mt-3"
        onClick={() =>
          onChange([...links, { id: `fl-${Date.now().toString(36)}`, label: "", href: "", enabled: true }])
        }
      >
        <Plus aria-hidden="true" className="me-1.5 h-4 w-4" />
        إضافة رابط
      </Button>
    </section>
  );
}

export default function FooterSettingsPage() {
  const { updateFooter } = useAdminActions();
  const { data } = useAdminState();

  const { draft, isDirty, patchDraft, handleSave, tryCancel, cancelConfirmOpen, setCancelConfirmOpen, confirmCancel } =
    useSettingsDraft<FooterSettings>({
      select: (store) => store.footer,
      update: updateFooter,
      successToast: { title: "حُفظت إعدادات الفوتر" },
    });

  if (!draft) {
    return (
      <SettingsPageLayout>
        <div className="py-24 text-center text-sm text-charcoal-400">جارٍ تحميل الإعدادات…</div>
      </SettingsPageLayout>
    );
  }

  return (
    <SettingsPageLayout>
      <AdminPageHeader
        title="إعدادات الفوتر"
        description="محتوى تذييل الموقع — الروابط القانونية مربوطة تلقائيًا بصفحات /admin/legal فلا تُكرر نصوصًا."
      />

      <div className="space-y-4 pb-4">
        {/* النبذة وحقوق النشر */}
        <section className="rounded-xl border border-border bg-white p-4 sm:p-6">
          <h2 className="mb-4 text-sm font-semibold text-charcoal-900">النبذة وحقوق النشر</h2>
          <Field id="footer-about" label="نبذة قصيرة عن بيت المصور" hint="تظهر في أعلى تذييل الموقع">
            <Textarea
              id="footer-about"
              value={draft.aboutText}
              onChange={(event) => patchDraft({ aboutText: event.target.value })}
              rows={3}
            />
          </Field>
          <div className="mt-4 max-w-lg">
            <Field id="footer-copyright" label="نص حقوق النشر">
              <Input
                id="footer-copyright"
                value={draft.copyright}
                onChange={(event) => patchDraft({ copyright: event.target.value })}
              />
            </Field>
          </div>
        </section>

        {/* الروابط السريعة */}
        <LinksEditor
          title="الروابط السريعة"
          hint="قائمة ديناميكية — الترتيب جزء من البيانات ويُحفظ معها"
          links={draft.quickLinks}
          onChange={(quickLinks) => patchDraft({ quickLinks })}
        />

        {/* الروابط القانونية — مربوطة بالصفحات القانونية */}
        <section className="rounded-xl border border-border bg-white p-4 sm:p-6">
          <h2 className="mb-1 text-sm font-semibold text-charcoal-900">الروابط القانونية</h2>
          <p className="mb-3 text-xs leading-relaxed text-muted-foreground">
            مربوطة بصفحات «الصفحات القانونية» بدل نسخ النصوص — عدّل عنوان الصفحة هناك ويتحدث الرابط هنا تلقائيًا.
          </p>
          <ul className="space-y-2">
            {data.legal.map((page) => (
              <li
                key={page.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-surface/50 px-3 py-2.5"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-charcoal-800">{page.title}</p>
                  <p className="truncate text-xs text-charcoal-400 num-ltr" dir="ltr">
                    /policies/{page.slug}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge
                    variant="outline"
                    className={
                      page.published
                        ? "border-brand-200 bg-brand-50 text-brand-700"
                        : "border-charcoal-200 bg-surface text-charcoal-500"
                    }
                  >
                    {page.published ? "منشورة" : "غير منشورة"}
                  </Badge>
                  <Button asChild variant="ghost" size="sm">
                    <Link href={`/admin/legal/${page.id}`}>تحرير</Link>
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </section>

        {/* السوشال */}
        <LinksEditor
          title="روابط التواصل الاجتماعي"
          links={draft.socialLinks}
          onChange={(socialLinks) => patchDraft({ socialLinks })}
        />
      </div>

      <SettingsSaveBar
        isDirty={isDirty}
        saveLabel="حفظ إعدادات الفوتر"
        onSave={handleSave}
        onCancel={tryCancel}
        cancelConfirm={{
          open: cancelConfirmOpen,
          onOpenChange: setCancelConfirmOpen,
          onConfirm: confirmCancel,
        }}
      />
    </SettingsPageLayout>
  );
}
