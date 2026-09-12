"use client";

/**
 * /admin/settings/general — الإعدادات العامة (#18)
 * --------------------------------------------------
 * اسم الموقع (عربي/إنجليزي) + الشعارات (Mock) + Favicon + اللغة
 * الافتراضية والعملة والتوقيت والمدينة والبلد — بمسودة موحدة وحفظ
 * شامل (نمط useSettingsDraft — D-22).
 */
import Link from "next/link";
import { useAdminActions, useAdminState } from "@/context/admin-store";
import type { GeneralSettings } from "@/data/admin/types";
import { useSettingsDraft } from "@/components/admin/settings/use-settings-draft";
import {
  SettingsPageLayout,
  SettingsSaveBar,
} from "@/components/admin/settings/settings-shared";
import { AdminPageHeader } from "@/components/admin/ui/admin-page-header";
import { Field } from "@/components/admin/ui/field";
import { ImageUpload } from "@/components/admin/ui/image-upload";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const TIMEZONES = [
  { value: "Asia/Riyadh", label: "Asia/Riyadh — الرياض (UTC+3)" },
  { value: "Asia/Jeddah", label: "Asia/Jeddah — جدة (UTC+3)" },
  { value: "Asia/Dubai", label: "Asia/Dubai — دبي (UTC+4)" },
  { value: "Africa/Cairo", label: "Africa/Cairo — القاهرة (UTC+2)" },
];

const CURRENCIES = [
  { value: "SAR", label: "ريال سعودي (SAR)" },
  { value: "AED", label: "درهم إماراتي (AED)" },
  { value: "USD", label: "دولار أمريكي (USD)" },
];

const LANGUAGES = [
  { value: "ar", label: "العربية" },
  { value: "en", label: "English" },
];

export default function GeneralSettingsPage() {
  const { updateGeneral } = useAdminActions();
  const { data } = useAdminState();

  const { draft, isDirty, patchDraft, handleSave, tryCancel, cancelConfirmOpen, setCancelConfirmOpen, confirmCancel } =
    useSettingsDraft<GeneralSettings>({
      select: (store) => store.general,
      update: updateGeneral,
      successToast: { title: "حُفظت الإعدادات العامة" },
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
        title="الإعدادات العامة"
        description="هوية الموقع والإعدادات الأساسية — تُستخدم في Phase 3 عند ربط الموقع العام بالمخزن."
      >
        <Button asChild variant="outline" size="sm">
          <Link href="/admin">عودة للوحة</Link>
        </Button>
      </AdminPageHeader>

      <div className="space-y-4 pb-4">
        {/* الهوية */}
        <section className="rounded-xl border border-border bg-white p-4 sm:p-6">
          <h2 className="mb-4 text-sm font-semibold text-charcoal-900">هوية الموقع</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="general-name-ar" label="اسم الموقع (عربي)" required>
              <Input
                id="general-name-ar"
                value={draft.siteNameAr}
                onChange={(event) => patchDraft({ siteNameAr: event.target.value })}
                placeholder="بيت المصور"
              />
            </Field>
            <Field id="general-name-en" label="اسم الموقع (إنجليزي)">
              <Input
                id="general-name-en"
                value={draft.siteNameEn}
                dir="ltr"
                className="font-latin"
                onChange={(event) => patchDraft({ siteNameEn: event.target.value })}
                placeholder="Bayt Almosawer"
              />
            </Field>
          </div>
        </section>

        {/* الشعارات */}
        <section className="rounded-xl border border-border bg-white p-4 sm:p-6">
          <h2 className="mb-4 text-sm font-semibold text-charcoal-900">الشعارات والأيقونة</h2>
          <div className="grid gap-5 sm:grid-cols-2">
            <ImageUpload
              folder="site"
              id="general-logo-dark"
              label="الشعار الداكن (خلفية فاتحة)"
              value={draft.logoDark}
              alt="شعار بيت المصور"
              aspect="square"
              onChange={({ value }) => patchDraft({ logoDark: value })}
              hint="رفع تجريبي — يُفقد بعد التحديث حتى ربط Storage."
            />
            <ImageUpload
              folder="site"
              id="general-logo-light"
              label="الشعار الفاتح (خلفية غامقة)"
              value={draft.logoLight}
              alt="شعار بيت المصور"
              aspect="square"
              onChange={({ value }) => patchDraft({ logoLight: value })}
              hint="رفع تجريبي — يُفقد بعد التحديث حتى ربط Storage."
            />
          </div>
          <div className="mt-4 max-w-sm">
            <ImageUpload
              folder="site"
              id="general-favicon"
              label="أيقونة الموقع (Favicon)"
              value={draft.favicon}
              alt="أيقونة الموقع"
              aspect="square"
              onChange={({ value }) => patchDraft({ favicon: value })}
              hint="مربع صغير — رفع تجريبي."
            />
          </div>
        </section>

        {/* الإعدادات الإقليمية */}
        <section className="rounded-xl border border-border bg-white p-4 sm:p-6">
          <h2 className="mb-4 text-sm font-semibold text-charcoal-900">اللغة والإعدادات الإقليمية</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="general-language" label="اللغة الافتراضية">
              <Select value={draft.defaultLanguage} onValueChange={(value) => patchDraft({ defaultLanguage: value })}>
                <SelectTrigger id="general-language" aria-label="اللغة الافتراضية">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LANGUAGES.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field id="general-currency" label="العملة">
              <Select value={draft.currency} onValueChange={(value) => patchDraft({ currency: value })}>
                <SelectTrigger id="general-currency" aria-label="العملة">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CURRENCIES.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field id="general-timezone" label="المنطقة الزمنية">
              <Select value={draft.timezone} onValueChange={(value) => patchDraft({ timezone: value })}>
                <SelectTrigger id="general-timezone" aria-label="المنطقة الزمنية">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIMEZONES.map((option) => (
                    <SelectItem key={option.value} value={option.value} className="font-latin">
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field id="general-city" label="المدينة">
              <Input
                id="general-city"
                value={draft.city}
                onChange={(event) => patchDraft({ city: event.target.value })}
                placeholder="جدة"
              />
            </Field>
            <Field id="general-country" label="البلد">
              <Input
                id="general-country"
                value={draft.country}
                onChange={(event) => patchDraft({ country: event.target.value })}
                placeholder="السعودية"
              />
            </Field>
          </div>
        </section>
      </div>

      <SettingsSaveBar
        isDirty={isDirty}
        saveLabel="حفظ الإعدادات العامة"
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
