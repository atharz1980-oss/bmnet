"use client";

/**
 * /admin/settings/contact — بيانات التواصل (#18)
 * ------------------------------------------------
 * كل وسيلة تواصل: قيمة + مفتاح Enabled/Disabled. الهواتف تُخزن
 * بصيغة قابلة للتطبيع (normalizePhone)، وWhatsApp يدعم الصيغة
 * الدولية 9665XXXXXXXX مع توليد رابط wa.me من الرقم (لا تخزين
 * رابط يدوي) — ومعاينة حية للمالك.
 */
import { useAdminActions, useAdminState } from "@/context/admin-store";
import type { ContactChannels, ContactSettings } from "@/data/admin/types";
import { formatDateTime, normalizePhone, phoneDigits } from "@/lib/format";
import { useSettingsDraft } from "@/components/admin/settings/use-settings-draft";
import {
  SettingsPageLayout,
  SettingsSaveBar,
} from "@/components/admin/settings/settings-shared";
import { AdminPageHeader } from "@/components/admin/ui/admin-page-header";
import { Field } from "@/components/admin/ui/field";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Instagram, Mail, MapPin, MessageCircle, Phone, Clock } from "lucide-react";

const CHANNELS_META: Array<{
  key: keyof ContactChannels;
  label: string;
  valueKey: keyof ContactSettings;
}> = [
  { key: "mainMobile", label: "الجوال الرئيسي", valueKey: "mainMobile" },
  { key: "whatsapp", label: "واتساب", valueKey: "whatsappNumber" },
  { key: "secondaryPhone", label: "رقم إضافي", valueKey: "secondaryPhone" },
  { key: "email", label: "البريد الإلكتروني", valueKey: "email" },
  { key: "instagram", label: "إنستغرام", valueKey: "instagram" },
  { key: "tiktok", label: "تيك توك", valueKey: "tiktok" },
  { key: "address", label: "العنوان", valueKey: "address" },
  { key: "mapsUrl", label: "رابط خرائط جوجل", valueKey: "mapsUrl" },
  { key: "workingHours", label: "ساعات العمل", valueKey: "workingHours" },
];

function ChannelRow({
  id,
  label,
  value,
  enabled,
  onChange,
  onToggle,
  error,
  hint,
  placeholder,
  ltr,
  textarea,
}: {
  id: string;
  label: string;
  value: string;
  enabled: boolean;
  onChange: (value: string) => void;
  onToggle: (checked: boolean) => void;
  error?: string;
  hint?: string;
  placeholder?: string;
  ltr?: boolean;
  textarea?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-xl border border-border bg-surface/60 p-4">
      <div className="min-w-0 flex-1">
        <Field id={id} label={label} error={error} hint={hint} compact className="mb-2">
          {textarea ? (
            <Textarea
              id={id}
              value={value}
              onChange={(event) => onChange(event.target.value)}
              rows={2}
              placeholder={placeholder}
              aria-invalid={Boolean(error)}
            />
          ) : (
            <Input
              id={id}
              value={value}
              onChange={(event) => onChange(event.target.value)}
              placeholder={placeholder}
              dir={ltr ? "ltr" : undefined}
              className={ltr ? "num-ltr" : undefined}
              aria-invalid={Boolean(error)}
            />
          )}
        </Field>
      </div>
      <div className="flex shrink-0 flex-col items-center gap-1 pt-6">
        <Switch checked={enabled} onCheckedChange={onToggle} aria-label={`تفعيل ${label}`} />
        <span className="text-[10px] font-medium text-charcoal-500">{enabled ? "مفعّلة" : "معطّلة"}</span>
      </div>
    </div>
  );
}

export default function ContactSettingsPage() {
  const { updateContact } = useAdminActions();
  const { data } = useAdminState();

  const { draft, isDirty, patchDraft, handleSave, tryCancel, cancelConfirmOpen, setCancelConfirmOpen, confirmCancel } =
    useSettingsDraft<ContactSettings>({
      select: (store) => store.contact,
      update: updateContact,
      /* تطبيع الهواتف عند الحفظ — صيغة قابلة للتطبيع (Checkpoint 5) */
      sanitize: (value) => ({
        ...value,
        mainMobile: normalizePhone(value.mainMobile),
        whatsappNumber: normalizePhone(value.whatsappNumber),
        secondaryPhone: value.secondaryPhone ? normalizePhone(value.secondaryPhone) : undefined,
      }),
      successToast: { title: "حُفظت بيانات التواصل" },
    });

  if (!draft) {
    return (
      <SettingsPageLayout>
        <div className="py-24 text-center text-sm text-charcoal-400">جارٍ تحميل الإعدادات…</div>
      </SettingsPageLayout>
    );
  }

  const whatsappDigits = phoneDigits(draft.whatsappNumber);
  const whatsappValid = /^9665\d{8}$/.test(whatsappDigits);
  const waPreviewLink = whatsappValid
    ? `https://wa.me/${whatsappDigits}?text=${encodeURIComponent(draft.whatsappMessage || "مرحبًا، لدي استفسار")}`
    : "";

  const channelEnabled = (key: keyof ContactChannels) => draft.channels[key];

  return (
    <SettingsPageLayout>
      <AdminPageHeader
        title="بيانات التواصل"
        description="قنوات التواصل المعروضة في الموقع — لكل وسيلة مفتاح تفعيل، وروابط الاتصال والواتساب تُولَّد تلقائيًا من الأرقام."
      />

      <div className="space-y-4 pb-4">
        {/* الهواتف */}
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-charcoal-900">الهواتف والمراسلة</h2>
          <ChannelRow
            id="contact-main"
            label="الجوال الرئيسي"
            value={draft.mainMobile}
            enabled={channelEnabled("mainMobile")}
            onChange={(value) => patchDraft({ mainMobile: value })}
            onToggle={(checked) => patchDraft({ channels: { ...draft.channels, mainMobile: checked } })}
            hint="يُحفظ بصيغة قابلة للتطبيع — مثال: +966551234567"
            ltr
          />
          <ChannelRow
            id="contact-whatsapp"
            label="رقم واتساب (صيغة دولية)"
            value={draft.whatsappNumber}
            enabled={channelEnabled("whatsapp")}
            onChange={(value) => patchDraft({ whatsappNumber: value })}
            onToggle={(checked) => patchDraft({ channels: { ...draft.channels, whatsapp: checked } })}
            error={
              draft.whatsappNumber && !whatsappValid
                ? "أدخل الرقم بصيغة دولية سعودية مثل 9665XXXXXXXX (12 رقمًا تبدأ بـ 9665)."
                : undefined
            }
            hint={whatsappValid ? `سيُولَّد رابط wa.me/${whatsappDigits} تلقائيًا عند الحفظ` : "مثال: 966551234567"}
            ltr
          />
          <ChannelRow
            id="contact-secondary"
            label="رقم إضافي"
            value={draft.secondaryPhone ?? ""}
            enabled={channelEnabled("secondaryPhone")}
            onChange={(value) => patchDraft({ secondaryPhone: value })}
            onToggle={(checked) => patchDraft({ channels: { ...draft.channels, secondaryPhone: checked } })}
            ltr
          />
          <div className="rounded-xl border border-border bg-surface/60 p-4">
            <Field
              id="contact-wa-message"
              label="رسالة الواتساب الافتراضية"
              hint="تُلحق تلقائيًا برابط wa.me عند فتح المحادثة"
            >
              <Textarea
                id="contact-wa-message"
                value={draft.whatsappMessage}
                onChange={(event) => patchDraft({ whatsappMessage: event.target.value })}
                rows={2}
                placeholder="السلام عليكم، أردت الاستفسار عن الدورات"
              />
            </Field>
          </div>
        </section>

        {/* البريد والسوشال */}
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-charcoal-900">البريد وحسابات التواصل الاجتماعي</h2>
          <ChannelRow
            id="contact-email"
            label="البريد الإلكتروني"
            value={draft.email}
            enabled={channelEnabled("email")}
            onChange={(value) => patchDraft({ email: value })}
            onToggle={(checked) => patchDraft({ channels: { ...draft.channels, email: checked } })}
            ltr
          />
          <ChannelRow
            id="contact-instagram"
            label="إنستغرام"
            value={draft.instagram}
            enabled={channelEnabled("instagram")}
            onChange={(value) => patchDraft({ instagram: value })}
            onToggle={(checked) => patchDraft({ channels: { ...draft.channels, instagram: checked } })}
            ltr
          />
          <ChannelRow
            id="contact-tiktok"
            label="تيك توك"
            value={draft.tiktok}
            enabled={channelEnabled("tiktok")}
            onChange={(value) => patchDraft({ tiktok: value })}
            onToggle={(checked) => patchDraft({ channels: { ...draft.channels, tiktok: checked } })}
            ltr
          />
        </section>

        {/* الموقع وساعات العمل */}
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-charcoal-900">الموقع وساعات العمل</h2>
          <ChannelRow
            id="contact-address"
            label="العنوان"
            value={draft.address}
            enabled={channelEnabled("address")}
            onChange={(value) => patchDraft({ address: value })}
            onToggle={(checked) => patchDraft({ channels: { ...draft.channels, address: checked } })}
          />
          <ChannelRow
            id="contact-maps"
            label="رابط خرائط جوجل"
            value={draft.mapsUrl ?? ""}
            enabled={channelEnabled("mapsUrl")}
            onChange={(value) => patchDraft({ mapsUrl: value })}
            onToggle={(checked) => patchDraft({ channels: { ...draft.channels, mapsUrl: checked } })}
            ltr
          />
          <ChannelRow
            id="contact-hours"
            label="ساعات العمل"
            value={draft.workingHours}
            enabled={channelEnabled("workingHours")}
            onChange={(value) => patchDraft({ workingHours: value })}
            onToggle={(checked) => patchDraft({ channels: { ...draft.channels, workingHours: checked } })}
          />
        </section>

        {/* المعاينة */}
        <section className="rounded-xl border border-border bg-white p-4 sm:p-6">
          <h2 className="mb-3 text-sm font-semibold text-charcoal-900">معاينة بيانات التواصل</h2>
          <p className="mb-3 text-xs text-muted-foreground">
            هكذا تظهر القنوات المفعّلة فقط — المعاينة تعكس المسودة الحالية قبل الحفظ.
          </p>
          <ul className="grid gap-2 sm:grid-cols-2">
            {channelEnabled("mainMobile") ? (
              <li className="flex items-center gap-2 rounded-lg border border-border bg-surface/50 px-3 py-2 text-sm text-charcoal-700">
                <Phone aria-hidden="true" className="h-4 w-4 shrink-0 text-charcoal-400" />
                <span className="num-ltr">{draft.mainMobile || "—"}</span>
              </li>
            ) : null}
            {channelEnabled("whatsapp") ? (
              <li className="flex items-center gap-2 rounded-lg border border-border bg-surface/50 px-3 py-2 text-sm text-charcoal-700">
                <MessageCircle aria-hidden="true" className="h-4 w-4 shrink-0 text-charcoal-400" />
                {waPreviewLink ? (
                  <a
                    href={waPreviewLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="truncate rounded font-medium text-brand-600 hover:text-brand-700 num-ltr"
                  >
                    {`wa.me/${whatsappDigits}`}
                  </a>
                ) : (
                  <span className="text-charcoal-400">رقم واتساب غير صالح بعد</span>
                )}
              </li>
            ) : null}
            {channelEnabled("email") ? (
              <li className="flex items-center gap-2 rounded-lg border border-border bg-surface/50 px-3 py-2 text-sm text-charcoal-700">
                <Mail aria-hidden="true" className="h-4 w-4 shrink-0 text-charcoal-400" />
                <span className="truncate num-ltr" dir="ltr">{draft.email || "—"}</span>
              </li>
            ) : null}
            {channelEnabled("instagram") ? (
              <li className="flex items-center gap-2 rounded-lg border border-border bg-surface/50 px-3 py-2 text-sm text-charcoal-700">
                <Instagram aria-hidden="true" className="h-4 w-4 shrink-0 text-charcoal-400" />
                <span className="truncate font-latin" dir="ltr">{draft.instagram || "—"}</span>
              </li>
            ) : null}
            {channelEnabled("address") ? (
              <li className="flex items-center gap-2 rounded-lg border border-border bg-surface/50 px-3 py-2 text-sm text-charcoal-700 sm:col-span-2">
                <MapPin aria-hidden="true" className="h-4 w-4 shrink-0 text-charcoal-400" />
                {draft.address || "—"}
              </li>
            ) : null}
            {channelEnabled("workingHours") ? (
              <li className="flex items-center gap-2 rounded-lg border border-border bg-surface/50 px-3 py-2 text-sm text-charcoal-700 sm:col-span-2">
                <Clock aria-hidden="true" className="h-4 w-4 shrink-0 text-charcoal-400" />
                {draft.workingHours || "—"}
              </li>
            ) : null}
          </ul>
        </section>
      </div>

      <SettingsSaveBar
        isDirty={isDirty}
        saveLabel="حفظ بيانات التواصل"
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
