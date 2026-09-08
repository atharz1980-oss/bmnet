"use client";

/**
 * /admin/settings/payments — إعدادات الدفع (UI فقط — #18)
 * ---------------------------------------------------------
 * ثلاثة مزودين (Moyasar / Tabby / Tamara): مفتاح تفعيل + بيئة
 * (Test/Production) + اسم معروض اختياري. الحالة دائمًا «يتطلب تهيئة»
 * في هذه المرحلة. **لا حقول مفاتيح سرية إطلاقًا** — رسالة صريحة
 * أن المفاتيح ستُضبط عبر Environment Variables في مرحلة Backend.
 * لا API ولا Checkout ولا Webhook — واجهة إعداد فقط.
 */
import { useAdminActions, useAdminData } from "@/context/admin-store";
import type { ActionResult } from "@/lib/cms/result";
import type { PaymentEnvironment, PaymentProviderId } from "@/data/admin/types";
import {
  SettingsPageLayout,
  SettingsSaveBar,
} from "@/components/admin/settings/settings-shared";
import { useSettingsDraft } from "@/components/admin/settings/use-settings-draft";
import { AdminPageHeader } from "@/components/admin/ui/admin-page-header";
import { Field } from "@/components/admin/ui/field";
import { ShieldAlert } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const PROVIDER_INFO: Record<PaymentProviderId, { label: string; description: string }> = {
  moyasar: {
    label: "Moyasar",
    description: "بوابة سعودية تدعم مدى وApple Pay والبطاقات — الخيار الأساسي للدفع المباشر.",
  },
  tabby: {
    label: "Tabby",
    description: "اشترِ الآن وادفع لاحقًا على 4 أقساط — يرفع متوسط قيمة الطلب للدورات.",
  },
  tamara: {
    label: "Tamara",
    description: "قسّم فاتورتك على 4 دفعات — بديل BNPL شائع في السوق السعودي.",
  },
};

export default function PaymentsSettingsPage() {
  const { updatePaymentProvider } = useAdminActions();
  const data = useAdminData();

  const { draft, isDirty, patchDraft, handleSave, tryCancel, cancelConfirmOpen, setCancelConfirmOpen, confirmCancel } =
    useSettingsDraft<Array<{ id: PaymentProviderId; enabled: boolean; environment: PaymentEnvironment; displayName?: string }>>({
      select: (store) =>
        store.payments.map((provider) => ({
          id: provider.id,
          enabled: provider.enabled,
          environment: provider.environment,
          displayName: provider.displayName,
        })),
      update: async (drafts) => {
        let last: ActionResult<string | null> = { ok: true, data: null };
        for (const item of drafts) {
          last = await updatePaymentProvider(item.id, {
            enabled: item.enabled,
            environment: item.environment,
            displayName: item.displayName?.trim() || undefined,
          });
          if (!last.ok) return last;
        }
        return last;
      },
      successToast: { title: "حُفظت إعدادات الدفع", description: "واجهة إعداد فقط — لا ربط فعلي في هذه المرحلة." },
    });

  if (!draft) {
    return (
      <SettingsPageLayout>
        <div className="py-24 text-center text-sm text-charcoal-400">جارٍ تحميل الإعدادات…</div>
      </SettingsPageLayout>
    );
  }

  const storedById = new Map(data.payments.map((provider) => [provider.id, provider]));

  return (
    <SettingsPageLayout>
      <AdminPageHeader
        title="إعدادات الدفع"
        description="واجهة إعداد المزودين فقط — التفعيل الحقيقي والربط في مرحلة Backend."
      />

      {/* رسالة المفاتيح السرية — إلزامية في المواصفة */}
      <div
        role="note"
        className="mb-4 flex items-start gap-2.5 rounded-xl border border-charcoal-200 bg-surface px-4 py-3"
      >
        <ShieldAlert aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-charcoal-500" />
        <p className="text-xs leading-relaxed text-charcoal-600">
          مفاتيح API السرية سيتم ضبطها لاحقًا عبر Environment Variables ولا يتم تخزينها في لوحة التحكم —
          لا توجد حقول مفاتيح هنا أبدًا.
        </p>
      </div>

      <div className="space-y-4 pb-4">
        {draft.map((provider, index) => {
          const info = PROVIDER_INFO[provider.id];
          const stored = storedById.get(provider.id);
          return (
            <section
              key={provider.id}
              className="rounded-xl border border-border bg-white p-4 sm:p-6"
              aria-label={`إعدادات ${info.label}`}
            >
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <h2 className="flex items-center gap-2 text-sm font-semibold text-charcoal-900">
                    {info.label}
                    <span className="rounded-full border border-charcoal-200 bg-surface px-2 py-0.5 text-[10px] font-medium text-charcoal-500 font-latin">
                      {stored?.status === "not-configured" ? "Not configured" : stored?.status}
                    </span>
                  </h2>
                  <p className="mt-1 max-w-xl text-xs leading-relaxed text-muted-foreground">
                    {info.description}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-center gap-1">
                  <Switch
                    checked={provider.enabled}
                    onCheckedChange={(checked) => {
                      const next = [...draft];
                      next[index] = { ...provider, enabled: checked };
                      patchDraft(next);
                    }}
                    aria-label={`تفعيل ${info.label}`}
                  />
                  <span className="text-[10px] font-medium text-charcoal-500">
                    {provider.enabled ? "مفعّل" : "معطّل"}
                  </span>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field id={`pay-${provider.id}-env`} label="البيئة">
                  <Select
                    value={provider.environment}
                    onValueChange={(value) => {
                      const next = [...draft];
                      next[index] = { ...provider, environment: value as PaymentEnvironment };
                      patchDraft(next);
                    }}
                    disabled={!provider.enabled}
                  >
                    <SelectTrigger id={`pay-${provider.id}-env`} aria-label={`بيئة ${info.label}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="test">Test (تجريبية)</SelectItem>
                      <SelectItem value="production">Production (إنتاج)</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
                <Field id={`pay-${provider.id}-name`} label="الاسم المعروض">
                  <Input
                    id={`pay-${provider.id}-name`}
                    value={provider.displayName ?? ""}
                    onChange={(event) => {
                      const next = [...draft];
                      next[index] = { ...provider, displayName: event.target.value };
                      patchDraft(next);
                    }}
                    placeholder={info.label}
                    disabled={!provider.enabled}
                  />
                </Field>
              </div>

              {provider.enabled ? (
                <p
                  role="status"
                  className="mt-3 rounded-lg border border-brand-200 bg-brand-50 px-3 py-2 text-xs font-medium leading-relaxed text-brand-700"
                >
                  الحالة: يتطلب تهيئة — سيتم ربط مفاتيح {info.label} عبر Environment Variables عند
                  تنفيذ مرحلة Backend، ويتحول Status تلقائيًا إلى «مُعد».
                </p>
              ) : null}
            </section>
          );
        })}
      </div>

      <SettingsSaveBar
        isDirty={isDirty}
        saveLabel="حفظ إعدادات الدفع"
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
