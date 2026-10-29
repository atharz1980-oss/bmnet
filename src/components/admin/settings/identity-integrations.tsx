"use client";

import { useMemo, useState, useTransition } from "react";

import { saveIdentityProviderCredentialsAction } from "@/app/admin/actions/payments";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/admin/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import type { ActionResult } from "@/lib/cms/result";
import type { IdentityCredentialMetadata, IdentityEnvironment, IdentityProvider } from "@/lib/identity/configuration";

const PROVIDERS: ReadonlyArray<{ id: IdentityProvider; label: string; description: string }> = [
  { id: "nafath", label: "نفاذ — التحقق من الهوية", description: "لتأكيد هوية مستأجر المعدة بعد توثيق واجهة الجهة الرسمية." },
  { id: "nafith", label: "نافذ — سند الضمان", description: "لإعداد سند الضمان للمعدات التي تتطلبه بعد توثيق واجهة الجهة الرسمية." },
];

const ENVIRONMENTS: ReadonlyArray<{ id: IdentityEnvironment; label: string }> = [
  { id: "sandbox", label: "بيئة اختبار" },
  { id: "production", label: "بيئة إنتاج" },
];

interface Draft {
  baseUrl: string;
  clientId: string;
  clientSecret: string;
  apiKey: string;
  redirectUri: string;
  scope: string;
}

const EMPTY_DRAFT: Draft = {
  baseUrl: "",
  clientId: "",
  clientSecret: "",
  apiKey: "",
  redirectUri: "",
  scope: "",
};

function IntegrationForm({
  provider,
  configurations,
  disabled,
}: {
  provider: (typeof PROVIDERS)[number];
  configurations: IdentityCredentialMetadata[];
  disabled: boolean;
}) {
  const { toast } = useToast();
  const [environment, setEnvironment] = useState<IdentityEnvironment>("sandbox");
  const [drafts, setDrafts] = useState<Record<string, Draft>>(() => {
    const initial: Record<string, Draft> = {};
    for (const env of ENVIRONMENTS) {
      const saved = configurations.find((item) => item.provider === provider.id && item.environment === env.id);
      initial[env.id] = {
        ...EMPTY_DRAFT,
        baseUrl: saved?.baseUrl ?? "",
        clientId: saved?.clientId ?? "",
        redirectUri: saved?.redirectUri ?? "",
        scope: saved?.scope ?? "",
      };
    }
    return initial;
  });
  const [pending, startTransition] = useTransition();
  const draft = drafts[environment] ?? EMPTY_DRAFT;
  const config = useMemo(
    () => configurations.find((item) => item.provider === provider.id && item.environment === environment),
    [configurations, environment, provider.id],
  );

  function patch(values: Partial<Draft>) {
    setDrafts((current) => ({
      ...current,
      [environment]: { ...(current[environment] ?? EMPTY_DRAFT), ...values },
    }));
  }

  function save() {
    startTransition(async () => {
      const result: ActionResult<null> = await saveIdentityProviderCredentialsAction({
        provider: provider.id,
        environment,
        ...draft,
      });
      toast(
        result.ok
          ? {
              title: "حُفظت إعدادات الربط",
              description: "حُفظت البيانات مشفّرة؛ لم يُرسل أي طلب إلى المنصة ولم يُفعّل الربط.",
            }
          : { title: "تعذر الحفظ", description: result.error },
      );
    });
  }

  return (
    <article className="rounded-xl border border-border bg-white p-4 sm:p-5">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold text-charcoal-900">{provider.label}</h3>
          <p className="mt-1 text-xs text-charcoal-600">{provider.description}</p>
        </div>
        <span className="rounded-full bg-charcoal-100 px-3 py-1 text-xs text-charcoal-700">
          {config?.configured ? "بيانات محفوظة" : "بانتظار بيانات التفعيل"}
        </span>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field id={`${provider.id}-environment`} label="البيئة">
          <Select value={environment} onValueChange={(value) => setEnvironment(value as IdentityEnvironment)}>
            <SelectTrigger id={`${provider.id}-environment`} disabled={disabled}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ENVIRONMENTS.map((item) => <SelectItem key={item.id} value={item.id}>{item.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>
        <Field id={`${provider.id}-base-url`} label="عنوان API الرسمي">
          <Input id={`${provider.id}-base-url`} dir="ltr" value={draft.baseUrl} disabled={disabled}
            placeholder="https://api.example.sa" onChange={(event) => patch({ baseUrl: event.target.value })} />
        </Field>
        <Field id={`${provider.id}-client-id`} label="معرّف التطبيق / العميل">
          <Input id={`${provider.id}-client-id`} dir="ltr" value={draft.clientId} disabled={disabled}
            onChange={(event) => patch({ clientId: event.target.value })} />
        </Field>
        <Field id={`${provider.id}-client-secret`} label="Client Secret">
          <Input id={`${provider.id}-client-secret`} type="password" dir="ltr" autoComplete="new-password"
            value={draft.clientSecret} disabled={disabled} placeholder={config?.configured ? "اتركه فارغًا للإبقاء على المفتاح المحفوظ" : ""}
            onChange={(event) => patch({ clientSecret: event.target.value })} />
        </Field>
        <Field id={`${provider.id}-api-key`} label="API Key / رمز التفعيل">
          <Input id={`${provider.id}-api-key`} type="password" dir="ltr" autoComplete="new-password"
            value={draft.apiKey} disabled={disabled} placeholder={config?.configured ? "اتركه فارغًا للإبقاء على المفتاح المحفوظ" : ""}
            onChange={(event) => patch({ apiKey: event.target.value })} />
        </Field>
        <Field id={`${provider.id}-redirect`} label="رابط العودة / Callback URI">
          <Input id={`${provider.id}-redirect`} dir="ltr" value={draft.redirectUri} disabled={disabled}
            onChange={(event) => patch({ redirectUri: event.target.value })} />
        </Field>
        <Field id={`${provider.id}-scope`} label="النطاقات المطلوبة (Scope)">
          <Input id={`${provider.id}-scope`} dir="ltr" value={draft.scope} disabled={disabled}
            onChange={(event) => patch({ scope: event.target.value })} />
        </Field>
      </div>

      <div className="mt-4 flex justify-end">
        <Button onClick={save} disabled={disabled || pending}>
          {pending ? "جارٍ الحفظ…" : "حفظ بيانات الربط"}
        </Button>
      </div>
    </article>
  );
}

export function IdentityIntegrations({
  configurations,
  databaseReady,
  encryptionReady,
  canManage,
}: {
  configurations: IdentityCredentialMetadata[];
  databaseReady: boolean;
  encryptionReady: boolean;
  canManage: boolean;
}) {
  const disabled = !canManage || !databaseReady || !encryptionReady;

  return (
    <section aria-label="ربط منصات الهوية والسند" className="mt-6 rounded-xl border border-border bg-surface p-4 sm:p-6">
      <h2 className="text-base font-semibold text-charcoal-900">تجهيز ربط نفاذ ونافذ</h2>
      <p className="mb-4 mt-2 text-xs leading-relaxed text-charcoal-600">
        تُشفّر المفاتيح على الخادم ولا تُعرض بعد الحفظ. هذه شاشة تجهيز فقط؛ لن تُرسل بيانات أو تُنفّذ مصادقة قبل توفير
        مواصفات API الرسمية واعتماد المحول الخاص بكل منصة. الدليل المرفق يشرح الاشتراك ولا يتضمن تلك المواصفات.
      </p>
      {!databaseReady ? (
        <p role="alert" className="mb-4 rounded-lg bg-amber-50 p-3 text-xs text-amber-900">
          جدول إعدادات الهوية غير جاهز. طبّق ترحيل identity_provider_credentials أولًا.
        </p>
      ) : null}
      {!encryptionReady ? (
        <p role="alert" className="mb-4 rounded-lg bg-amber-50 p-3 text-xs text-amber-900">
          اضبط PAYMENTS_ENCRYPTION_KEY في بيئة الخادم لحفظ المفاتيح مشفّرة.
        </p>
      ) : null}
      {!canManage ? (
        <p role="note" className="mb-4 text-xs text-charcoal-600">إدارة مفاتيح الربط متاحة للمالك فقط.</p>
      ) : null}
      <div className="space-y-4">
        {PROVIDERS.map((provider) => (
          <IntegrationForm
            key={provider.id}
            provider={provider}
            configurations={configurations}
            disabled={disabled}
          />
        ))}
      </div>
    </section>
  );
}
