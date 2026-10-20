"use client";

/**
 * لوح حجز معدة — اختيار فترة (بداية/نهاية)، ثم الكمية، ثم طريقة التسليم،
 * ثم بيانات المستأجر والهوية والموافقة على العقد والتوقيع بالاسم.
 *
 * كل شيء هنا تلميح للزائر: السعر والكمية المتاحة يصلان من API التوافر،
 * والمبلغ يُشتق من سعر اليوم × الأيام × الكمية + رسوم التوصيل ويُرسل
 * ليقارنه الخادم بحسابه — القرار وحده في `rentEquipmentAction` ←
 * `startEquipmentRental`.
 *
 * سريان الهوية يُفحص في المتصفح كتلميح فقط (نفس الدالة النقية)، والقرار
 * في الخادم. لا ادعاء تحقق حكومي: الحالة تبقى «بانتظار التحقق اليدوي».
 */

import { useEffect, useMemo, useState } from "react";
import { CalendarDays, Info, Loader2, Lock, MapPin, Package, ShieldCheck } from "lucide-react";

import { rentEquipmentAction, type EquipmentRentalField } from "@/app/rentals/actions";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatPrice, formatShortDate } from "@/lib/format";
import { RENTAL_CUSTOMER_TYPES, type RentalCustomerType } from "@/lib/rentals/customer-types";
import {
  EQUIPMENT_DELIVERY_FEE_HALALAS,
  MAX_RENTAL_DAYS,
  MAX_RENTAL_DAYS_AHEAD,
  rentalDays,
  validateRentalDates,
} from "@/lib/rentals/dates";
import { identityCoversRental, isValidSaudiNationalId } from "@/lib/rentals/identity-fields";
import { addDays, todayIso } from "@/lib/spaces/schedule";
import { cn } from "@/lib/utils";

interface AvailabilityState {
  days: number;
  capacity: number;
  reserved: number;
  remaining: number;
  checkoutEnabled: boolean;
  checkoutNotice: string | null;
}

interface AvailabilityResponse extends Partial<AvailabilityState> {
  ok?: boolean;
}

const INPUT_CLASS =
  "h-11 w-full rounded-lg border border-charcoal-300 bg-white px-3 text-base lg:text-sm text-charcoal-800 placeholder:text-charcoal-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20";

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p role="alert" className="mt-1 text-xs font-medium text-danger-700">
      {message}
    </p>
  );
}

export interface EquipmentBookingPanelProps {
  item: {
    slug: string;
    name: string;
    pricePerDaySar: number;
    quantity: number;
    requiresSecurityNote: boolean;
  };
}

export function EquipmentBookingPanel({ item }: EquipmentBookingPanelProps) {
  const today = todayIso();
  const maxDate = addDays(today, MAX_RENTAL_DAYS_AHEAD);

  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const [quantity, setQuantity] = useState(1);
  const [method, setMethod] = useState<"pickup" | "delivery">("pickup");
  const [customerType, setCustomerType] = useState<RentalCustomerType>("individual");
  const [nationalId, setNationalId] = useState("");
  const [nationalIdExpiry, setNationalIdExpiry] = useState("");

  const [availability, setAvailability] = useState<AvailabilityState | null>(null);
  const [availabilityStatus, setAvailabilityStatus] = useState<"idle" | "loading" | "ready" | "failed">("idle");

  /* نتيجة الإجراء — نديرها محليًا لنعرض أخطاء الحقول مع الحقول نفسها. */
  const [result, setResult] = useState<{ error: string | null; fieldErrors?: Partial<Record<EquipmentRentalField, string>> }>({ error: null });
  const [submitting, setSubmitting] = useState(false);

  const dateCheck = validateRentalDates(startDate, endDate);
  const days = dateCheck.ok ? dateCheck.days : null;

  /* جلب الكمية المتاحة لكل فترة (تلميح — القرار في الخادم). */
  useEffect(() => {
    let cancelled = false;
    /* التاريخ غير صالح: نُصفّر الحالة داخل تدفق غير متزامن لا في جسم الأثر. */
    const controller = new AbortController();
    async function run() {
      if (!dateCheck.ok) {
        if (cancelled) return;
        setAvailability(null);
        setAvailabilityStatus("idle");
        return;
      }
      setAvailabilityStatus("loading");
      try {
        const response = await fetch(
          `/api/rentals/${item.slug}/availability?start=${encodeURIComponent(startDate)}&end=${encodeURIComponent(endDate)}`,
          { signal: controller.signal },
        );
        const data = (await response.json()) as AvailabilityResponse;
        if (cancelled) return;
        if (!data.ok || typeof data.remaining !== "number") {
          setAvailability(null);
          setAvailabilityStatus("failed");
          return;
        }
        setAvailability({
          days: data.days ?? (days ?? 1),
          capacity: data.capacity ?? item.quantity,
          reserved: data.reserved ?? 0,
          remaining: data.remaining,
          checkoutEnabled: Boolean(data.checkoutEnabled),
          checkoutNotice: data.checkoutNotice ?? null,
        });
        setAvailabilityStatus("ready");
      } catch {
        if (!cancelled) {
          setAvailability(null);
          setAvailabilityStatus("failed");
        }
      }
    }
    void run();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [item.slug, startDate, endDate, dateCheck.ok, days]);

  const maxQuantity = availability ? availability.remaining : item.quantity;
  const safeQuantity = Math.max(1, Math.min(quantity, Math.max(1, maxQuantity)));

  const deliveryFee = method === "delivery" ? EQUIPMENT_DELIVERY_FEE_HALALAS / 100 : 0;
  const rentalTotal = days !== null ? item.pricePerDaySar * days * safeQuantity : null;
  const totalSar = rentalTotal !== null ? Math.round((rentalTotal + deliveryFee) * 100) / 100 : null;

  const needsCompany = customerType === "company" || customerType === "advertiser";
  const idLooksValid = nationalId.replace(/[\s-]/g, "").length === 0 || isValidSaudiNationalId(nationalId);
  const expiryCovers = nationalIdExpiry.length === 0 || identityCoversRental(nationalIdExpiry, endDate);

  const soldOut = availabilityStatus === "ready" && availability !== null && availability.remaining < 1;
  const canSubmit =
    dateCheck.ok &&
    availabilityStatus === "ready" &&
    !soldOut &&
    Boolean(availability?.checkoutEnabled) &&
    !submitting;

  const quantityOptions = useMemo(
    () => Array.from({ length: Math.max(1, Math.min(maxQuantity, 20)) }, (_, index) => index + 1),
    [maxQuantity],
  );

  async function submit(formData: FormData) {
    setSubmitting(true);
    setResult({ error: null });
    try {
      const next = await rentEquipmentAction({ error: null }, formData);
      /* النجاح يعني توجيهًا من الإجراء — لا نصل هنا إلا بخطأ. */
      if (next?.error) setResult(next);
    } catch (error) {
      /* redirect() يرمي استثناءً خاصًا يقوده Next؛ لا نلتقطه كخطأ عرض. */
      if (error && typeof error === "object" && "digest" in error && String((error as { digest?: string }).digest).startsWith("NEXT_REDIRECT")) {
        throw error;
      }
      setResult({ error: "تعذر بدء عملية الدفع. حاول مرة أخرى." });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section id="booking" className="rounded-2xl border border-charcoal-200 bg-white p-6 shadow-soft">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-charcoal-900">استأجر هذه المعدة</h2>
          <p className="mt-1 inline-flex items-center gap-1 text-sm text-charcoal-600">
            <Package aria-hidden="true" className="h-4 w-4 text-brand-600" />
            {formatPrice(item.pricePerDaySar)} <span className="text-charcoal-500">/ اليوم — دفع إلكتروني وتوقيع إلكتروني</span>
          </p>
        </div>
        <span className="hidden shrink-0 items-center gap-1 rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700 sm:inline-flex">
          <Lock aria-hidden="true" className="h-3.5 w-3.5" />
          تأكيد بعد الدفع
        </span>
      </div>

      <form action={submit} className="mt-5 space-y-5">
        <input type="hidden" name="item" value={item.slug} />
        <input type="hidden" name="total" value={totalSar ?? ""} />
        {/* فخ الروبوتات: إجابة نجاح صامتة بلا كتابة. */}
        <div aria-hidden="true" className="sr-only">
          <Label htmlFor={`hp-${item.slug}`}>لا تملأ هذا الحقل</Label>
          <input id={`hp-${item.slug}`} type="text" name="website" tabIndex={-1} autoComplete="off" />
        </div>

        {/* ① الفترة */}
        <div>
          <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-charcoal-800">
            <CalendarDays aria-hidden="true" className="h-4 w-4 text-brand-600" />
            فترة الإيجار
            <span aria-hidden="true" className="text-danger-600">*</span>
          </span>
          <div className="mt-2 grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="rental-start" className="text-sm font-medium text-charcoal-800">
                من <span aria-hidden="true" className="ms-1 text-danger-600">*</span>
              </Label>
              <input
                id="rental-start"
                name="startDate"
                type="date"
                required
                min={today}
                max={maxDate}
                value={startDate}
                onChange={(event) => {
                  const next = event.target.value;
                  setStartDate(next);
                  if (endDate < next) setEndDate(next);
                }}
                dir="ltr"
                className={cn(INPUT_CLASS, "mt-1.5 text-start")}
              />
            </div>
            <div>
              <Label htmlFor="rental-end" className="text-sm font-medium text-charcoal-800">
                إلى <span aria-hidden="true" className="ms-1 text-danger-600">*</span>
              </Label>
              <input
                id="rental-end"
                name="endDate"
                type="date"
                required
                min={startDate}
                max={addDays(startDate, MAX_RENTAL_DAYS - 1)}
                value={endDate}
                onChange={(event) => setEndDate(event.target.value)}
                dir="ltr"
                className={cn(INPUT_CLASS, "mt-1.5 text-start")}
              />
            </div>
          </div>
          <FieldError message={result.fieldErrors?.dates ?? (!dateCheck.ok ? dateCheck.error ?? undefined : undefined)} />
        </div>

        {/* ② الكمية والتوافر */}
        <div>
          <Label htmlFor="rental-quantity" className="text-sm font-medium text-charcoal-800">
            الكمية <span aria-hidden="true" className="ms-1 text-danger-600">*</span>
          </Label>
          <select
            id="rental-quantity"
            name="quantity"
            value={safeQuantity}
            onChange={(event) => setQuantity(Number(event.target.value))}
            disabled={availabilityStatus !== "ready" || soldOut}
            className={cn(INPUT_CLASS, "mt-1.5")}
          >
            {quantityOptions.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
          <FieldError message={result.fieldErrors?.quantity} />

          {availabilityStatus === "loading" ? (
            <p className="mt-2 inline-flex items-center gap-2 text-xs text-charcoal-600">
              <Loader2 aria-hidden="true" className="h-3.5 w-3.5 animate-spin" />
              جارٍ التحقق من الكمية المتاحة…
            </p>
          ) : null}
          {availabilityStatus === "failed" ? (
            <p className="mt-2 text-xs font-medium text-danger-700">
              تعذّر التحقق من التوافر الآن. عدّل الفترة أو أعد المحاولة.
            </p>
          ) : null}
          {availabilityStatus === "ready" && availability ? (
            <p className={cn("mt-2 text-xs font-medium", soldOut ? "text-danger-700" : "text-charcoal-600")}>
              {soldOut
                ? "لا تتوفر كمية في هذه الفترة — جرّب فترة أخرى."
                : `متاح في هذه الفترة: ${availability.remaining} من ${availability.capacity}`}
            </p>
          ) : null}
        </div>

        {/* ③ طريقة التسليم */}
        <fieldset>
          <legend className="text-sm font-medium text-charcoal-800">
            طريقة التسليم <span aria-hidden="true" className="ms-1 text-danger-600">*</span>
          </legend>
          <div className="mt-1.5 grid grid-cols-2 gap-2">
            {(["pickup", "delivery"] as const).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setMethod(value)}
                aria-pressed={value === method}
                className={cn(
                  "min-h-11 rounded-lg border px-3 py-2 text-sm font-medium transition",
                  value === method
                    ? "border-brand-600 bg-brand-50 text-brand-700"
                    : "border-charcoal-300 bg-white text-charcoal-700 hover:border-brand-400",
                )}
              >
                {value === "pickup" ? "استلام من المركز" : `توصيل (+${formatPrice(EQUIPMENT_DELIVERY_FEE_HALALAS / 100)})`}
              </button>
            ))}
          </div>
          <input type="hidden" name="method" value={method} />
        </fieldset>

        {method === "delivery" ? (
          <div>
            <Label htmlFor="rental-address" className="text-sm font-medium text-charcoal-800">
              عنوان التوصيل <span aria-hidden="true" className="ms-1 text-danger-600">*</span>
            </Label>
            <input
              id="rental-address"
              name="deliveryAddress"
              required
              maxLength={500}
              placeholder="الحي، الشارع، رقم المبنى، جدة"
              className={cn(INPUT_CLASS, "mt-1.5")}
            />
            <FieldError message={result.fieldErrors?.deliveryAddress} />
            <p className="mt-1 text-xs text-charcoal-500">التوصيل داخل جدة. خارجه يُنسّق يدويًا مع فريق المركز.</p>
          </div>
        ) : null}

        {/* ④ المستأجر */}
        <fieldset>
          <legend className="text-sm font-medium text-charcoal-800">
            نوع المستأجر <span aria-hidden="true" className="ms-1 text-danger-600">*</span>
          </legend>
          <div className="mt-1.5 grid grid-cols-2 gap-2">
            {(Object.keys(RENTAL_CUSTOMER_TYPES) as RentalCustomerType[]).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setCustomerType(type)}
                aria-pressed={type === customerType}
                className={cn(
                  "min-h-11 rounded-lg border px-3 py-2 text-sm font-medium transition",
                  type === customerType
                    ? "border-brand-600 bg-brand-50 text-brand-700"
                    : "border-charcoal-300 bg-white text-charcoal-700 hover:border-brand-400",
                )}
              >
                {RENTAL_CUSTOMER_TYPES[type]}
              </button>
            ))}
          </div>
          <input type="hidden" name="customerType" value={customerType} />
          <FieldError message={result.fieldErrors?.customerType} />
        </fieldset>

        {needsCompany ? (
          <div>
            <Label htmlFor="rental-company" className="text-sm font-medium text-charcoal-800">
              {customerType === "company" ? "اسم الشركة" : "اسم الجهة"}{" "}
              <span aria-hidden="true" className="ms-1 text-danger-600">*</span>
            </Label>
            <input id="rental-company" name="companyName" maxLength={120} className={cn(INPUT_CLASS, "mt-1.5")} />
            <FieldError message={result.fieldErrors?.company} />
          </div>
        ) : null}

        <div>
          <Label htmlFor="rental-name" className="text-sm font-medium text-charcoal-800">
            الاسم الكامل <span aria-hidden="true" className="ms-1 text-danger-600">*</span>
          </Label>
          <input id="rental-name" name="name" required maxLength={80} autoComplete="name" className={cn(INPUT_CLASS, "mt-1.5")} />
          <FieldError message={result.fieldErrors?.name} />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="rental-email" className="text-sm font-medium text-charcoal-800">
              البريد الإلكتروني <span aria-hidden="true" className="ms-1 text-danger-600">*</span>
            </Label>
            <input
              id="rental-email"
              name="email"
              type="email"
              required
              dir="ltr"
              autoComplete="email"
              className={cn(INPUT_CLASS, "mt-1.5 text-start")}
            />
            <FieldError message={result.fieldErrors?.email} />
          </div>
          <div>
            <Label htmlFor="rental-phone" className="text-sm font-medium text-charcoal-800">
              رقم الجوال <span aria-hidden="true" className="ms-1 text-danger-600">*</span>
            </Label>
            <input
              id="rental-phone"
              name="phone"
              type="tel"
              required
              dir="ltr"
              inputMode="tel"
              autoComplete="tel"
              placeholder="05XXXXXXXX"
              className={cn(INPUT_CLASS, "mt-1.5 text-start")}
            />
            <FieldError message={result.fieldErrors?.phone} />
          </div>
        </div>

        {/* ⑤ الهوية */}
        <div className="space-y-4 rounded-xl border border-brand-100 bg-brand-50/40 p-4">
          <p className="flex items-start gap-2 text-xs leading-relaxed text-brand-800">
            <ShieldCheck aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              نطلب رقم الهوية الوطنية/الإقامة وتاريخ انتهائها لأن العقد يلزمنا بالتحقق من سريان الهوية عند التسليم.
              البيانات تُستخدم لتوثيق الإيجار فقط.
            </span>
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="rental-id" className="text-sm font-medium text-charcoal-800">
                رقم الهوية / الإقامة <span aria-hidden="true" className="ms-1 text-danger-600">*</span>
              </Label>
              <input
                id="rental-id"
                name="nationalId"
                required
                dir="ltr"
                inputMode="numeric"
                maxLength={10}
                value={nationalId}
                onChange={(event) => setNationalId(event.target.value.replace(/\D/g, "").slice(0, 10))}
                placeholder="1XXXXXXXXX أو 2XXXXXXXXX"
                className={cn(INPUT_CLASS, "mt-1.5 text-start")}
                aria-invalid={!idLooksValid}
              />
              <FieldError
                message={
                  result.fieldErrors?.nationalId ?? (!idLooksValid ? "رقم الهوية غير صالح — عشرة أرقام تبدأ بـ1 أو 2." : undefined)
                }
              />
            </div>
            <div>
              <Label htmlFor="rental-id-expiry" className="text-sm font-medium text-charcoal-800">
                تاريخ انتهاء الهوية <span aria-hidden="true" className="ms-1 text-danger-600">*</span>
              </Label>
              <input
                id="rental-id-expiry"
                name="nationalIdExpiry"
                type="date"
                required
                dir="ltr"
                value={nationalIdExpiry}
                min={endDate}
                onChange={(event) => setNationalIdExpiry(event.target.value)}
                className={cn(INPUT_CLASS, "mt-1.5 text-start")}
                aria-invalid={!expiryCovers}
              />
              <FieldError
                message={
                  result.fieldErrors?.nationalIdExpiry ??
                  (!expiryCovers ? "تاريخ انتهاء الهوية يجب أن يغطي آخر يوم من الإيجار." : undefined)
                }
              />
              <p className="mt-1 text-xs text-charcoal-500">على أن تغطي سريان الهوية كامل مدة الإيجار.</p>
            </div>
          </div>
        </div>

        <div>
          <Label htmlFor="rental-notes" className="text-sm font-medium text-charcoal-800">
            ملاحظات <span className="ms-2 text-xs font-normal text-charcoal-500">(اختياري)</span>
          </Label>
          <Textarea
            id="rental-notes"
            name="notes"
            rows={3}
            maxLength={2000}
            placeholder="أي ملاحظات عن الاستخدام أو موعد التسليم…"
            className="mt-1.5"
          />
        </div>

        {/* ⑥ الموافقة والتوقيع */}
        <div className="space-y-3 rounded-xl border border-charcoal-200 bg-charcoal-50/60 p-4">
          <label className="flex items-start gap-2 text-sm leading-relaxed text-charcoal-800">
            <input type="checkbox" name="agreementAccepted" value="true" required className="mt-1 h-4 w-4 shrink-0" />
            <span>
              أقرّ بأنني قرأت عقد الإيجار ووافقت على بنوده، وأتحمل مسؤولية المعدة وملحقاتها خلال مدة الإيجار.
            </span>
          </label>
          <FieldError message={result.fieldErrors?.agreement} />

          <div>
            <Label htmlFor="rental-signature" className="text-sm font-medium text-charcoal-800">
              التوقيع الإلكتروني — اكتب اسمك كما في الأعلى{" "}
              <span aria-hidden="true" className="ms-1 text-danger-600">*</span>
            </Label>
            <input
              id="rental-signature"
              name="signatureName"
              required
              maxLength={80}
              placeholder="اكتب اسمك الكامل كتوقيع"
              className={cn(INPUT_CLASS, "mt-1.5")}
            />
            <FieldError message={result.fieldErrors?.signature} />
            <p className="mt-1 text-xs leading-relaxed text-charcoal-500">
              توقيعك الإلكتروني (الاسم + رقم الهوية + إصدار العقد + الفترة) يُبصم ويُخزَّن مع الإيجار.
            </p>
          </div>
        </div>

        {item.requiresSecurityNote ? (
          <p className="flex items-start gap-2 rounded-lg bg-amber-50 p-3 text-xs leading-relaxed text-amber-800">
            <Info aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              هذه المعدة تتطلب سند ضمان عبر بوابة «نافذ» قبل التسليم. سيتواصل معك الفريق لإتمام إجراءات السند بعد الدفع.
              طلب السند لا يُعد سندًا معتمدًا حتى تأكيد الجهة.
            </span>
          </p>
        ) : null}

        {availability && !availability.checkoutEnabled && availability.checkoutNotice ? (
          <p className="flex items-start gap-2 rounded-lg bg-charcoal-50 p-3 text-sm text-charcoal-700">
            <Info aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-charcoal-500" />
            {availability.checkoutNotice}
          </p>
        ) : null}

        {totalSar !== null ? (
          <p className="rounded-lg bg-white/70 p-3 text-sm font-medium text-brand-800 ring-1 ring-brand-100">
            المدة: {days} {days === 1 ? "يوم" : "أيام"} — الإجمالي {formatPrice(totalSar)}
            <span className="font-normal text-brand-700"> (شامل الضريبة{deliveryFee > 0 ? " ورسوم التوصيل" : ""})</span>
          </p>
        ) : null}

        {result.error ? (
          <p role="alert" className="rounded-lg bg-danger-50 p-3 text-sm font-medium text-danger-700">
            {result.error}
          </p>
        ) : null}

        <Button type="submit" size="lg" className="w-full gap-2" disabled={!canSubmit}>
          {submitting ? <Loader2 aria-hidden="true" className="h-5 w-5 animate-spin" /> : <Lock aria-hidden="true" className="h-4 w-4" />}
          {submitting ? "جارٍ تحويلك إلى الدفع…" : "أكمل الدفع ووقّع العقد"}
        </Button>
        <p className="text-center text-xs leading-relaxed text-charcoal-500">
          يُثبَّت الإيجار بعد نجاح الدفع، وتصلك تفاصيله على البريد. التسليم يشترط التحقق من أصل الهوية
          {item.requiresSecurityNote ? " واعتماد سند الضمان" : ""}.
        </p>
      </form>
    </section>
  );
}
