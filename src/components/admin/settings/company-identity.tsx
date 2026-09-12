"use client";

/**
 * CompanyIdentity — بيانات المنشأة القانونية والضريبية
 * ------------------------------------------------------
 * مصدر الهوية المعتمدة للفواتير وصفحات السياسات ومراجعة مزودي الدفع.
 * لا تُملأ أي قيمة افتراضيًا نيابة عن المالك: الحقل الفارغ يعني «لم يُعتمد بعد».
 */
import { useState, useTransition } from "react";

import { AdminPageHeader } from "@/components/admin/ui/admin-page-header";
import { Field } from "@/components/admin/ui/field";
import { SettingsPageLayout } from "@/components/admin/settings/settings-shared";
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
import { saveCompanyAction } from "@/app/admin/actions/company";
import type { CompanySettings } from "@/lib/payments/settings";

/** نسبة مئوية ↔ basis points: 15% = 1500. الفارغ يعني «لم تُعتمد». */
function bpsToPercent(value: number | null): string {
  return value === null ? "" : String(value / 100);
}

export function CompanyIdentity({
  settings,
  databaseReady,
  canEdit,
}: {
  settings: CompanySettings;
  databaseReady: boolean;
  canEdit: boolean;
}) {
  const { toast } = useToast();
  const [pending, start] = useTransition();
  const [draft, setDraft] = useState(settings);
  const [taxPercent, setTaxPercent] = useState(() => bpsToPercent(settings.tax_rate_bps));

  const disabled = !canEdit || !databaseReady || pending;
  const patch = (value: Partial<CompanySettings>) => setDraft((current) => ({ ...current, ...value }));

  const submit = () => {
    const trimmed = taxPercent.trim();
    let tax: number | null = null;
    if (trimmed !== "") {
      if (!/^\d{1,3}(?:\.\d{1,2})?$/.test(trimmed)) {
        toast({ title: "نسبة الضريبة غير صالحة", description: "أدخل نسبة مئوية مثل 15." });
        return;
      }
      tax = Math.round(Number(trimmed) * 100);
    }
    start(async () => {
      const result = await saveCompanyAction({ ...draft, tax_rate_bps: tax });
      toast(
        result.ok
          ? { title: "حُفظت بيانات المنشأة", description: "تُستخدم في الفواتير ومراجعة مزودي الدفع." }
          : { title: "تعذر الحفظ", description: result.error },
      );
    });
  };

  return (
    <SettingsPageLayout>
      <AdminPageHeader
        title="بيانات المنشأة"
        description="الهوية القانونية والضريبية المعتمدة. لا تُنشر بيانات غير معتمدة من المالك."
      />

      {!databaseReady ? (
        <p
          role="note"
          className="mb-4 rounded-xl border border-brand-200 bg-brand-50 px-4 py-3 text-xs leading-relaxed text-brand-800"
        >
          جدول <span dir="ltr">commerce_settings</span> غير مهيأ في هذه القاعدة. القيم المعروضة افتراضية
          ولن يُحفظ شيء قبل تطبيق ترحيل تجهيز الدفع.
        </p>
      ) : null}

      {!canEdit ? (
        <p
          role="note"
          className="mb-4 rounded-xl border border-charcoal-200 bg-surface px-4 py-3 text-xs leading-relaxed text-charcoal-600"
        >
          العرض فقط. تعديل بيانات المنشأة متاح لحساب المالك وحده.
        </p>
      ) : null}

      <section
        aria-label="الهوية القانونية"
        className="mb-6 rounded-xl border border-border bg-white p-4 sm:p-6"
      >
        <h2 className="mb-4 text-base font-semibold text-charcoal-900">الهوية القانونية</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="legal-name" label="الاسم القانوني" required hint="كما هو في السجل التجاري.">
            <Input
              id="legal-name"
              value={draft.legal_name}
              disabled={disabled}
              onChange={(event) => patch({ legal_name: event.target.value })}
            />
          </Field>

          <Field id="legal-name-en" label="الاسم القانوني بالإنجليزية">
            <Input
              id="legal-name-en"
              dir="ltr"
              value={draft.legal_name_en}
              disabled={disabled}
              onChange={(event) => patch({ legal_name_en: event.target.value })}
            />
          </Field>

          <Field id="cr" label="رقم السجل التجاري" required hint="عشرة أرقام.">
            <Input
              id="cr"
              dir="ltr"
              inputMode="numeric"
              value={draft.commercial_registration}
              disabled={disabled}
              onChange={(event) => patch({ commercial_registration: event.target.value })}
            />
          </Field>

          <Field id="unified-number" label="الرقم الموحد" hint="عشرة أرقام تبدأ بـ7 — اتركه فارغًا إن لم يُعتمد.">
            <Input
              id="unified-number"
              dir="ltr"
              inputMode="numeric"
              value={draft.unified_number}
              disabled={disabled}
              onChange={(event) => patch({ unified_number: event.target.value })}
            />
          </Field>
        </div>
      </section>

      <section
        aria-label="العنوان الوطني وبيانات الفواتير"
        className="mb-6 rounded-xl border border-border bg-white p-4 sm:p-6"
      >
        <h2 className="mb-4 text-base font-semibold text-charcoal-900">العنوان الوطني والفواتير</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            id="short-address"
            label="العنوان الوطني المختصر"
            hint="أربعة أحرف إنجليزية كبيرة ثم أربعة أرقام، مثل RRRD2929."
          >
            <Input
              id="short-address"
              dir="ltr"
              value={draft.national_short_address}
              disabled={disabled}
              onChange={(event) => patch({ national_short_address: event.target.value.toUpperCase() })}
            />
          </Field>

          <Field id="invoice-email" label="بريد الفواتير">
            <Input
              id="invoice-email"
              dir="ltr"
              value={draft.invoice_email}
              disabled={disabled}
              onChange={(event) => patch({ invoice_email: event.target.value })}
            />
          </Field>

          <Field id="invoice-phone" label="هاتف الفواتير" hint="صيغة دولية ‎+9665XXXXXXXX.">
            <Input
              id="invoice-phone"
              dir="ltr"
              value={draft.invoice_phone}
              disabled={disabled}
              onChange={(event) => patch({ invoice_phone: event.target.value })}
            />
          </Field>

          <Field
            id="national-address"
            label="العنوان الوطني التفصيلي"
            hint="المبنى والشارع والحي والمدينة والرمز البريدي."
            className="sm:col-span-2"
          >
            <Textarea
              id="national-address"
              rows={2}
              value={draft.national_address}
              disabled={disabled}
              onChange={(event) => patch({ national_address: event.target.value })}
            />
          </Field>
        </div>
      </section>

      <section aria-label="الوضع الضريبي" className="rounded-xl border border-border bg-white p-4 sm:p-6">
        <h2 className="mb-1 text-base font-semibold text-charcoal-900">الوضع الضريبي</h2>
        <p className="mb-4 text-xs leading-relaxed text-muted-foreground">
          الأسعار المعروضة في الموقع لا تشمل ضريبة القيمة المضافة؛ تُضاف عند الحساب وفق النسبة المعتمدة هنا.
        </p>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field id="vat-status" label="حالة التسجيل الضريبي" required>
            <Select
              value={draft.vat_status}
              disabled={disabled}
              onValueChange={(value) => patch({ vat_status: value as CompanySettings["vat_status"] })}
            >
              <SelectTrigger id="vat-status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="unconfigured">لم تُعتمد بعد</SelectItem>
                <SelectItem value="registered">مسجّلة في ضريبة القيمة المضافة</SelectItem>
                <SelectItem value="not_registered">غير مسجّلة</SelectItem>
              </SelectContent>
            </Select>
          </Field>

          <Field id="vat-number" label="الرقم الضريبي" hint="خمسة عشر رقمًا.">
            <Input
              id="vat-number"
              dir="ltr"
              inputMode="numeric"
              value={draft.vat_number}
              disabled={disabled || draft.vat_status !== "registered"}
              onChange={(event) => patch({ vat_number: event.target.value })}
            />
          </Field>

          <Field id="tax-rate" label="نسبة الضريبة %">
            <Input
              id="tax-rate"
              dir="ltr"
              inputMode="decimal"
              value={taxPercent}
              disabled={disabled || draft.vat_status === "unconfigured"}
              onChange={(event) => setTaxPercent(event.target.value)}
            />
          </Field>
        </div>

        <div className="mt-5 flex justify-end">
          <Button onClick={() => submit()} disabled={disabled}>
            {pending ? "جارٍ الحفظ…" : "حفظ بيانات المنشأة"}
          </Button>
        </div>
      </section>
    </SettingsPageLayout>
  );
}
