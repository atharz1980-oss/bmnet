"use client";

/**
 * PaymentsPreparation — تجهيز الدفع (إعدادات تجارية + مفاتيح المزودين)
 * ---------------------------------------------------------------------
 * هذه شاشة تجهيز وليست Checkout. لا تُنشئ طلبًا ولا تحصّل مبلغًا.
 * المفاتيح السرية لا تصل إلى المتصفح إطلاقًا: الخادم يرسل بيانات وصفية فقط،
 * والحقول هنا للكتابة فقط — الحقل الفارغ يبقي السر المحفوظ كما هو.
 */
import { useState, useTransition } from "react";

import { AdminPageHeader } from "@/components/admin/ui/admin-page-header";
import { Field } from "@/components/admin/ui/field";
import { SettingsPageLayout } from "@/components/admin/settings/settings-shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import type { ActionResult } from "@/lib/cms/result";
import type {
  CommerceSettings,
  DepositSettings,
  Mode,
  Provider,
  ProviderConfiguration,
} from "@/lib/payments/settings";
import {
  deleteCredentialsAction,
  saveCredentialsAction,
  saveDepositAction,
  testCredentialsAction,
} from "@/app/admin/actions/payments";

const PROVIDERS: ReadonlyArray<{ id: Provider; label: string; note: string }> = [
  { id: "moyasar", label: "ميسر", note: "مدى والبطاقات وApple Pay. المزود الأساسي للدفع المباشر." },
  { id: "tabby", label: "تابي", note: "دفع لاحق مقسّط. يحتاج Merchant Code من تابي." },
  { id: "tamara", label: "تمارا", note: "دفع لاحق مقسّط. بيئة sandbox منفصلة عن الإنتاج." },
];

const MODES: ReadonlyArray<{ id: Mode; label: string }> = [
  { id: "test", label: "اختبار" },
  { id: "production", label: "إنتاج" },
];

/** نسبة مئوية ↔ basis points: 15% = 1500. الحقل الفارغ يعني «غير معتمد». */
function bpsToPercent(value: number | null): string {
  return value === null ? "" : String(value / 100);
}

function percentToBps(value: string): number | null {
  const trimmed = value.trim();
  if (trimmed === "") return null;
  if (!/^\d{1,3}(?:\.\d{1,2})?$/.test(trimmed)) return Number.NaN;
  return Math.round(Number(trimmed) * 100);
}

/** ريالات ↔ هللات — الحساب كله يبقى أعدادًا صحيحة. */
function halalasToRiyals(value: number | null): string {
  return value === null ? "" : String(value / 100);
}

function riyalsToHalalas(value: string): number | null {
  const trimmed = value.trim();
  if (trimmed === "") return null;
  if (!/^\d{1,7}(?:\.\d{1,2})?$/.test(trimmed)) return Number.NaN;
  return Math.round(Number(trimmed) * 100);
}

function Notice({ tone, children }: { tone: "warn" | "info"; children: React.ReactNode }) {
  return (
    <p
      role="note"
      className={
        tone === "warn"
          ? "mb-4 rounded-xl border border-brand-200 bg-brand-50 px-4 py-3 text-xs leading-relaxed text-brand-800"
          : "mb-4 rounded-xl border border-charcoal-200 bg-surface px-4 py-3 text-xs leading-relaxed text-charcoal-600"
      }
    >
      {children}
    </p>
  );
}

export function PaymentsPreparation({
  settings,
  configurations,
  databaseReady,
  encryptionReady,
  canManage,
}: {
  settings: CommerceSettings;
  configurations: ProviderConfiguration[];
  databaseReady: boolean;
  encryptionReady: boolean;
  canManage: boolean;
}) {
  return (
    <SettingsPageLayout>
      <AdminPageHeader
        title="تجهيز الدفع"
        description="طريقة السداد ومفاتيح المزودين. ليست صفحة دفع: لا طلبات ولا تحصيل ولا Webhook بعد."
      />

      {!databaseReady ? (
        <Notice tone="warn">
          جداول الدفع غير مهيأة في هذه القاعدة، أو لا تطابق العقد المتوقع. القيم المعروضة افتراضية ولن
          يُحفظ شيء قبل تطبيق ترحيل commerce_payment_preparation.
        </Notice>
      ) : null}

      {!encryptionReady ? (
        <Notice tone="warn">
          مفتاح تشفير الدفع PAYMENTS_ENCRYPTION_KEY غير مضبوط على الخادم. لا يمكن حفظ أو قراءة مفاتيح
          المزودين قبل ضبطه في بيئة الاستضافة.
        </Notice>
      ) : null}

      {!canManage ? (
        <Notice tone="info">
          العرض فقط. اعتماد العربون والسياسات وإدارة المفاتيح متاح لحساب المالك وحده.
        </Notice>
      ) : null}

      <DepositForm settings={settings} disabled={!canManage || !databaseReady} />
      <CredentialsSection
        configurations={configurations}
        disabled={!canManage || !databaseReady || !encryptionReady}
      />
    </SettingsPageLayout>
  );
}

function DepositForm({ settings, disabled }: { settings: CommerceSettings; disabled: boolean }) {
  const { toast } = useToast();
  const [pending, start] = useTransition();
  const [draft, setDraft] = useState<DepositSettings>({
    prices_include_tax: false,
    full_payment_enabled: settings.full_payment_enabled,
    deposit_enabled: settings.deposit_enabled,
    deposit_type: settings.deposit_type,
    deposit_value: settings.deposit_value,
    balance_due_days: settings.balance_due_days,
    policies_approved: settings.policies_approved,
  });
  const [depositInput, setDepositInput] = useState(() =>
    settings.deposit_type === "percentage"
      ? bpsToPercent(settings.deposit_value)
      : halalasToRiyals(settings.deposit_value),
  );
  const [balanceDays, setBalanceDays] = useState(() =>
    settings.balance_due_days === null ? "" : String(settings.balance_due_days),
  );

  const patch = (value: Partial<DepositSettings>) =>
    setDraft((current) => ({ ...current, ...value }));

  const submit = () => {
    const depositValue =
      draft.deposit_type === "percentage"
        ? percentToBps(depositInput)
        : riyalsToHalalas(depositInput);
    const days = balanceDays.trim() === "" ? null : Number(balanceDays.trim());
    if (depositValue !== null && Number.isNaN(depositValue)) {
      toast({ title: "قيمة العربون غير صالحة", description: "راجع النسبة أو المبلغ المدخل." });
      return;
    }
    if (days !== null && !Number.isInteger(days)) {
      toast({ title: "مهلة سداد الباقي غير صالحة", description: "أدخل عدد أيام صحيحًا." });
      return;
    }
    const payload: DepositSettings = { ...draft, deposit_value: depositValue, balance_due_days: days };
    start(async () => {
      const result: ActionResult<null> = await saveDepositAction(payload);
      toast(
        result.ok
          ? { title: "حُفظت إعدادات السداد", description: "لم يُفعَّل التحصيل؛ الدفع ما زال مغلقًا." }
          : { title: "تعذر الحفظ", description: result.error },
      );
    });
  };

  return (
    <section
      aria-label="السداد والعربون"
      className="mb-6 rounded-xl border border-border bg-white p-4 sm:p-6"
    >
      <h2 className="mb-1 text-base font-semibold text-charcoal-900">طريقة السداد والعربون</h2>
      <p className="mb-4 text-xs leading-relaxed text-muted-foreground">
        الاسم القانوني والسجل والرقم الضريبي تُدار في «بيانات المنشأة»، ونصوص السياسات في «السياسات».
      </p>

      <div className="space-y-3">
        <label className="flex items-center justify-between gap-3 text-sm text-charcoal-800">
          السداد الكامل متاح
          <Switch
            checked={draft.full_payment_enabled}
            disabled={disabled}
            onCheckedChange={(checked) => patch({ full_payment_enabled: checked })}
          />
        </label>
        <label className="flex items-center justify-between gap-3 text-sm text-charcoal-800">
          العربون متاح
          <Switch
            checked={draft.deposit_enabled}
            disabled={disabled}
            onCheckedChange={(checked) => patch({ deposit_enabled: checked })}
          />
        </label>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        <Field id="deposit-type" label="نوع العربون">
          <Select
            value={draft.deposit_type}
            disabled={disabled || !draft.deposit_enabled}
            onValueChange={(value) =>
              patch({ deposit_type: value as DepositSettings["deposit_type"] })
            }
          >
            <SelectTrigger id="deposit-type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="unconfigured">لم يُعتمد بعد</SelectItem>
              <SelectItem value="percentage">نسبة من الإجمالي</SelectItem>
              <SelectItem value="fixed">مبلغ ثابت</SelectItem>
            </SelectContent>
          </Select>
        </Field>

        <Field
          id="deposit-value"
          label={draft.deposit_type === "fixed" ? "قيمة العربون بالريال" : "نسبة العربون %"}
        >
          <Input
            id="deposit-value"
            inputMode="decimal"
            dir="ltr"
            value={depositInput}
            disabled={disabled || !draft.deposit_enabled || draft.deposit_type === "unconfigured"}
            onChange={(event) => setDepositInput(event.target.value)}
          />
        </Field>

        <Field id="balance-days" label="مهلة سداد الباقي بالأيام">
          <Input
            id="balance-days"
            inputMode="numeric"
            dir="ltr"
            value={balanceDays}
            disabled={disabled || !draft.deposit_enabled}
            onChange={(event) => setBalanceDays(event.target.value)}
          />
        </Field>
      </div>

      <label className="mt-4 flex items-center justify-between gap-3 border-t border-border pt-4 text-sm text-charcoal-800">
        اعتمدت السياسات المنشورة (الاسترجاع والإلغاء والخصوصية)
        <Switch
          checked={draft.policies_approved}
          disabled={disabled}
          onCheckedChange={(checked) => patch({ policies_approved: checked })}
        />
      </label>

      <div className="mt-5 flex justify-end">
        <Button onClick={() => submit()} disabled={disabled || pending}>
          {pending ? "جارٍ الحفظ…" : "حفظ إعدادات السداد"}
        </Button>
      </div>
    </section>
  );
}

function CredentialsSection({
  configurations,
  disabled,
}: {
  configurations: ProviderConfiguration[];
  disabled: boolean;
}) {
  const stored = new Map(
    configurations.map((item) => [`${item.provider}:${item.environment}`, item]),
  );

  return (
    <section
      aria-label="مفاتيح المزودين"
      className="rounded-xl border border-border bg-white p-4 sm:p-6"
    >
      <h2 className="mb-1 text-base font-semibold text-charcoal-900">مفاتيح المزودين</h2>
      <Notice tone="info">
        تُحفظ المفاتيح مشفّرة على الخادم ولا تُعاد إلى المتصفح. اترك الحقل فارغًا للإبقاء على القيمة
        المحفوظة. «اختبار الاتصال» قراءة فقط: لا ينشئ عملية دفع ولا يسجّل Webhook.
      </Notice>

      <div className="space-y-4">
        {PROVIDERS.map((provider) =>
          MODES.map((mode) => (
            <CredentialCard
              key={`${provider.id}:${mode.id}`}
              provider={provider}
              mode={mode}
              configuration={stored.get(`${provider.id}:${mode.id}`)}
              disabled={disabled}
            />
          )),
        )}
      </div>
    </section>
  );
}

function CredentialCard({
  provider,
  mode,
  configuration,
  disabled,
}: {
  provider: { id: Provider; label: string; note: string };
  mode: { id: Mode; label: string };
  configuration: ProviderConfiguration | undefined;
  disabled: boolean;
}) {
  const { toast } = useToast();
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(false);
  const [publishableKey, setPublishableKey] = useState("");
  const [secretKey, setSecretKey] = useState("");
  const [merchantCode, setMerchantCode] = useState("");
  const [webhookSecret, setWebhookSecret] = useState("");
  const [merchantApproved, setMerchantApproved] = useState(configuration?.merchantApproved ?? false);
  const [depositApproved, setDepositApproved] = useState(configuration?.depositApproved ?? false);

  const prefix = `${provider.id}-${mode.id}`;
  const configured = configuration?.configured === true;

  const run = (
    operation: () => Promise<ActionResult<null>>,
    success: { title: string; description: string },
  ) =>
    start(async () => {
      const result = await operation();
      toast(result.ok ? success : { title: "لم يكتمل الإجراء", description: result.error });
      if (result.ok) {
        setPublishableKey("");
        setSecretKey("");
        setMerchantCode("");
        setWebhookSecret("");
      }
    });

  return (
    <article className="rounded-xl border border-border p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-charcoal-900">
            {provider.label} — بيئة {mode.label}
          </h3>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{provider.note}</p>
        </div>
        <p className="text-xs text-muted-foreground">
          {configured
            ? configuration?.verifiedAt
              ? "مفاتيح محفوظة ونجح اختبار الاتصال"
              : "مفاتيح محفوظة دون اختبار اتصال ناجح"
            : "لا مفاتيح محفوظة"}
        </p>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setOpen((value) => !value)}
          disabled={disabled}
        >
          {open ? "إخفاء الحقول" : configured ? "تحديث المفاتيح" : "إدخال المفاتيح"}
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={disabled || pending || !configured}
          onClick={() =>
            run(() => testCredentialsAction(provider.id, mode.id), {
              title: "نجح اتصال المزود",
              description: "الاتصال فقط؛ لا يعني اعتماد الحساب أو جاهزية التحصيل.",
            })
          }
        >
          اختبار الاتصال
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={disabled || pending || !configured}
          onClick={() =>
            run(() => deleteCredentialsAction(provider.id, mode.id), {
              title: "حُذفت المفاتيح",
              description: "عُطّل المزود قبل الحذف.",
            })
          }
        >
          حذف المفاتيح
        </Button>
      </div>

      {open ? (
        <div className="mt-4 space-y-3 border-t border-border pt-4">
          <Field id={`${prefix}-pk`} label="المفتاح العام" hint="يصل إلى نموذج الدفع في المتصفح.">
            <Input
              id={`${prefix}-pk`}
              autoComplete="off"
              dir="ltr"
              value={publishableKey}
              disabled={disabled}
              onChange={(event) => setPublishableKey(event.target.value)}
            />
          </Field>
          <Field id={`${prefix}-sk`} label="المفتاح السري" hint="يبقى على الخادم ولا يُعاد عرضه.">
            <Input
              id={`${prefix}-sk`}
              type="password"
              autoComplete="new-password"
              dir="ltr"
              value={secretKey}
              disabled={disabled}
              onChange={(event) => setSecretKey(event.target.value)}
            />
          </Field>
          {provider.id === "tabby" ? (
            <Field id={`${prefix}-mc`} label="Merchant Code">
              <Input
                id={`${prefix}-mc`}
                autoComplete="off"
                dir="ltr"
                value={merchantCode}
                disabled={disabled}
                onChange={(event) => setMerchantCode(event.target.value)}
              />
            </Field>
          ) : null}
          <Field id={`${prefix}-wh`} label="سر الإشعارات (Webhook)" hint="16 حرفًا على الأقل.">
            <Input
              id={`${prefix}-wh`}
              type="password"
              autoComplete="new-password"
              dir="ltr"
              value={webhookSecret}
              disabled={disabled}
              onChange={(event) => setWebhookSecret(event.target.value)}
            />
          </Field>

          <label className="flex items-center justify-between gap-3 text-sm text-charcoal-800">
            حساب التاجر معتمد لدى المزود
            <Switch
              checked={merchantApproved}
              disabled={disabled}
              onCheckedChange={setMerchantApproved}
            />
          </label>
          <label className="flex items-center justify-between gap-3 text-sm text-charcoal-800">
            المزود يسمح بالعربون لهذا النشاط
            <Switch
              checked={depositApproved}
              disabled={disabled}
              onCheckedChange={setDepositApproved}
            />
          </label>

          <div className="flex justify-end">
            <Button
              disabled={disabled || pending}
              onClick={() =>
                run(
                  () =>
                    saveCredentialsAction({
                      provider: provider.id,
                      environment: mode.id,
                      publishableKey,
                      secretKey,
                      merchantCode,
                      webhookSecret,
                      merchantApproved,
                      depositApproved,
                    }),
                  { title: "حُفظت المفاتيح", description: "اختبر الاتصال قبل الاعتماد." },
                )
              }
            >
              {pending ? "جارٍ الحفظ…" : "حفظ المفاتيح"}
            </Button>
          </div>
        </div>
      ) : null}
    </article>
  );
}
