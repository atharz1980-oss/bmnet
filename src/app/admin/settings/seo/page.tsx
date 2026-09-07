"use client";

/**
 * /admin/settings/seo — إعدادات SEO العامة (#18)
 * ------------------------------------------------
 * عنوان الموقع ووصف الـ Meta الافتراضي وصور OG والمشاركة + مفتاح
 * فهرسة الموقع + حقول تحقق Google/Bing كنص فقط (لا أي Integration).
 */
import { useAdminActions, useAdminState } from "@/context/admin-store";
import type { SeoSettings } from "@/data/admin/types";
import { useSettingsDraft } from "@/components/admin/settings/use-settings-draft";
import {
  SettingsPageLayout,
  SettingsSaveBar,
} from "@/components/admin/settings/settings-shared";
import { AdminPageHeader } from "@/components/admin/ui/admin-page-header";
import { Field } from "@/components/admin/ui/field";
import { ImageUpload } from "@/components/admin/ui/image-upload";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

export default function SeoSettingsPage() {
  const { updateSeo } = useAdminActions();
  const { data } = useAdminState();

  const { draft, isDirty, patchDraft, handleSave, tryCancel, cancelConfirmOpen, setCancelConfirmOpen, confirmCancel } =
    useSettingsDraft<SeoSettings>({
      select: (store) => store.seo,
      update: updateSeo,
      successToast: { title: "حُفظت إعدادات SEO" },
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
        title="إعدادات SEO العامة"
        description="القيم الافتراضية لعناوين ووصف الموقع في نتائج البحث والمشاركة — لكل صفحة تفاصيلها الخاصة داخل محرريها."
      />

      <div className="space-y-4 pb-4">
        {/* الأساسيات */}
        <section className="rounded-xl border border-border bg-white p-4 sm:p-6">
          <h2 className="mb-4 text-sm font-semibold text-charcoal-900">الأساسيات</h2>
          <div className="space-y-4">
            <Field id="seo-title" label="عنوان الموقع (Site Title)" hint="يظهر في تبويب المتصفح ونتائج البحث">
              <Input
                id="seo-title"
                value={draft.siteTitle}
                onChange={(event) => patchDraft({ siteTitle: event.target.value })}
                placeholder="بيت المصور | مركز التدريب على التصوير – جدة"
              />
            </Field>
            <Field
              id="seo-description"
              label="وصف Meta الافتراضي"
              hint={`${draft.defaultMetaDescription.length} حرفًا — يُنصح بـ 120–160 حرفًا`}
            >
              <Textarea
                id="seo-description"
                value={draft.defaultMetaDescription}
                onChange={(event) => patchDraft({ defaultMetaDescription: event.target.value })}
                rows={3}
              />
            </Field>
            <div className="flex items-center justify-between gap-4 rounded-xl border border-border bg-surface/60 p-4">
              <div>
                <p className="text-sm font-medium text-charcoal-800">فهرسة الموقع (Index)</p>
                <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                  عند الإيقاف يضاف noindex لصفحات الموقع العامة عند الربط — صفحات الإدارة noindex دائمًا
                </p>
              </div>
              <Switch
                checked={draft.indexSite}
                onCheckedChange={(checked) => patchDraft({ indexSite: checked })}
                aria-label="تفعيل فهرسة الموقع"
              />
            </div>
          </div>
        </section>

        {/* صور المشاركة */}
        <section className="rounded-xl border border-border bg-white p-4 sm:p-6">
          <h2 className="mb-4 text-sm font-semibold text-charcoal-900">صور المشاركة</h2>
          <div className="grid gap-5 sm:grid-cols-2">
            <ImageUpload
              id="seo-og"
              label="صورة Open Graph الافتراضية"
              value={draft.ogImage}
              alt="صورة مشاركة الموقع"
              aspect="video"
              onChange={({ value }) => patchDraft({ ogImage: value })}
              hint="تظهر عند مشاركة روابط الموقع على المنصات (1200×630 الأنسب)."
            />
            <ImageUpload
              id="seo-social"
              label="صورة المشاركة الاجتماعية"
              value={draft.socialImage}
              alt="صورة المشاركة الاجتماعية"
              aspect="video"
              onChange={({ value }) => patchDraft({ socialImage: value })}
              hint="بديل/نسخة مخصصة للمنصات الاجتماعية."
            />
          </div>
        </section>

        {/* أكواد التحقق — نص فقط بلا أي ربط */}
        <section className="rounded-xl border border-border bg-white p-4 sm:p-6">
          <h2 className="mb-1 text-sm font-semibold text-charcoal-900">أكواد التحقق (نص فقط)</h2>
          <p className="mb-3 text-xs leading-relaxed text-muted-foreground">
            تُستخدم عند النشر لإثبات ملكية الموقع — لا يوجد ربط فعلي بـ Google Search Console أو Bing في هذه المرحلة.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="seo-google" label="كود تحقق Google">
              <Input
                id="seo-google"
                value={draft.googleVerification ?? ""}
                dir="ltr"
                className="font-latin"
                onChange={(event) => patchDraft({ googleVerification: event.target.value })}
                placeholder="google-site-verification=…"
              />
            </Field>
            <Field id="seo-bing" label="كود تحقق Bing">
              <Input
                id="seo-bing"
                value={draft.bingVerification ?? ""}
                dir="ltr"
                className="font-latin"
                onChange={(event) => patchDraft({ bingVerification: event.target.value })}
                placeholder="msvalidate.01…"
              />
            </Field>
          </div>
        </section>
      </div>

      <SettingsSaveBar
        isDirty={isDirty}
        saveLabel="حفظ إعدادات SEO"
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
