import { z } from "zod";

import { splitVatInclusive, type VatBreakdown } from "./money";

export const providerSchema = z.enum(["moyasar", "tabby", "tamara"]);
export const modeSchema = z.enum(["test", "production"]);
export type Provider = z.infer<typeof providerSchema>;
export type Mode = z.infer<typeof modeSchema>;

/** حقل هوية اختياري: فارغ يعني «لم يُعتمد بعد»، وأي قيمة تلتزم بالصيغة الرسمية. */
function optionalPattern(pattern: RegExp, message: string) {
  return z.string().trim().refine((value) => value === "" || pattern.test(value), { message });
}

/** هوية المنشأة القانونية والضريبية — تُدار من «بيانات المنشأة». */
const companyShape = {
  legal_name: z.string().trim().min(2).max(160),
  legal_name_en: z.string().trim().max(160),
  commercial_registration: z.string().regex(/^\d{10}$/, "رقم السجل التجاري عشرة أرقام."),
  unified_number: optionalPattern(/^7\d{9}$/, "الرقم الموحد عشرة أرقام تبدأ بـ7."),
  national_short_address: optionalPattern(/^[A-Z]{4}\d{4}$/, "العنوان الوطني المختصر أربعة أحرف كبيرة وأربعة أرقام."),
  national_address: z.string().trim().max(240),
  invoice_email: optionalPattern(/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/, "بريد الفواتير غير صالح."),
  invoice_phone: optionalPattern(/^\+9665\d{8}$/, "هاتف الفواتير بصيغة ‎+9665XXXXXXXX."),
  vat_status: z.enum(["unconfigured", "registered", "not_registered"]),
  vat_number: z.string().trim().max(15),
  tax_rate_bps: z.number().int().min(0).max(10000).nullable(),
};

/** السداد والعربون والسياسات — تُدار من «تجهيز الدفع». */
const depositShape = {
  prices_include_tax: z.boolean(),
  full_payment_enabled: z.boolean(),
  deposit_enabled: z.boolean(),
  deposit_type: z.enum(["unconfigured", "percentage", "fixed"]),
  deposit_value: z.number().int().min(1).max(999999999).nullable(),
  balance_due_days: z.number().int().min(0).max(365).nullable(),
  policies_approved: z.boolean(),
};

type TaxFields = { vat_status: "unconfigured" | "registered" | "not_registered"; vat_number: string; tax_rate_bps: number | null };

function refineTax(value: TaxFields, issue: (message: string) => void) {
  if (value.vat_status === "registered" && (value.tax_rate_bps === null || !/^\d{15}$/.test(value.vat_number))) issue("أدخل النسبة والرقم الضريبي المعتمدين.");
  if (value.vat_status === "not_registered" && value.tax_rate_bps !== 0) issue("لا تُضاف ضريبة للمنشأة غير المسجلة.");
}

type DepositFields = { deposit_type: "unconfigured" | "percentage" | "fixed"; deposit_value: number | null; full_payment_enabled: boolean; deposit_enabled: boolean };

function refineDeposit(value: DepositFields, issue: (message: string) => void) {
  if (value.deposit_type === "percentage" && value.deposit_value !== null && value.deposit_value > 10000) issue("نسبة العربون لا تتجاوز 100%.");
  if (!value.full_payment_enabled && !value.deposit_enabled) issue("اختر طريقة سداد واحدة على الأقل.");
}

export const companySchema = z.object(companyShape).superRefine((value, ctx) => {
  refineTax(value, (message) => ctx.addIssue({ code: "custom", message }));
});
export type CompanySettings = z.infer<typeof companySchema>;

export const depositSchema = z.object(depositShape).superRefine((value, ctx) => {
  refineDeposit(value, (message) => ctx.addIssue({ code: "custom", message }));
});
export type DepositSettings = z.infer<typeof depositSchema>;

export const commerceSchema = z.object({ ...companyShape, ...depositShape }).superRefine((value, ctx) => {
  const issue = (message: string) => ctx.addIssue({ code: "custom", message });
  refineTax(value, issue);
  refineDeposit(value, issue);
});
export type CommerceSettings = z.infer<typeof commerceSchema>;

export const defaultCommerce: CommerceSettings = {
  legal_name: "بيت المصور", legal_name_en: "", commercial_registration: "7055038298",
  unified_number: "", national_short_address: "", national_address: "",
  invoice_email: "", invoice_phone: "",
  vat_status: "unconfigured", vat_number: "", tax_rate_bps: null, prices_include_tax: true,
  full_payment_enabled: true, deposit_enabled: false, deposit_type: "unconfigured",
  deposit_value: null, balance_due_days: null, policies_approved: false,
};

export interface ProviderSecrets {
  publishableKey: string;
  secretKey: string;
  merchantCode: string;
  webhookSecret: string;
}

export const credentialInputSchema = z.object({
  provider: providerSchema, environment: modeSchema,
  publishableKey: z.string().trim().max(4096).default(""),
  secretKey: z.string().trim().max(8192).default(""),
  merchantCode: z.string().trim().max(128).default(""),
  webhookSecret: z.string().trim().max(4096).default(""),
  merchantApproved: z.boolean(), depositApproved: z.boolean(),
});

export interface ProviderConfiguration {
  provider: Provider;
  environment: Mode;
  configured: boolean;
  merchantApproved: boolean;
  depositApproved: boolean;
  verifiedAt: string | null;
  updatedAt: string | null;
}

/**
 * سعر الدورة إلى تفصيل ضريبي — والسعر **شامل** الضريبة.
 *
 * ما يراه الطالب هو ما يُخصم منه: لا تُضاف نسبة فوق السعر المعروض. الضريبة
 * تُستخرج منه فيبقى الإجمالي كما أُعلن، ويُحفظ الصافي والضريبة في سجل
 * الشراء للفوترة والمراجعة.
 *
 * فشل مغلق: ما لم تُعتمد إعدادات الضريبة لا يُحسب مبلغ ولا يُفتح دفع. بيع
 * بنسبة ضريبة مجهولة يعني سجلًا ماليًا لا يمكن تصحيحه لاحقًا.
 *
 * العربون خارج النموذج نهائيًا: إعداداته القديمة في `commerce_settings`
 * لا تؤثر في هذه الدالة بحال، ولا تُقرأ أصلًا.
 */
export function quoteCoursePrice(grossHalalas: number, settings: CommerceSettings): VatBreakdown & { currency: "SAR" } {
  const parsed = commerceSchema.parse(settings);
  if (!parsed.prices_include_tax) {
    throw new Error("إعداد الأسعار غير مضبوط على «شامل الضريبة».");
  }
  if (parsed.vat_status === "unconfigured" || parsed.tax_rate_bps === null) {
    throw new Error("لم تُعتمد إعدادات الضريبة بعد.");
  }
  return { ...splitVatInclusive(grossHalalas, parsed.tax_rate_bps), currency: "SAR" };
}
