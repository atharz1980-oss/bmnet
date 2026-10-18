"use client";

/**
 * لوح حجز مساحة — اختيار اليوم ثم الوقت «من — إلى» ثم بيانات الزائر.
 *
 * كل شيء هنا تلميح للزائر: الأوقات تصل من API التوافر، والمبلغ يُشتق من
 * سعر المساحة × المدة ويُرسل ليقارنه الخادم بحسابه — القرار وحده في
 * `bookSpaceAction` ← `startSpaceBooking`، فإخفاء الزر ليس أمنًا ولا عهدًا.
 */

import { useActionState, useEffect, useMemo, useState } from "react";
import { Info, Loader2, Lock, Wallet } from "lucide-react";

import { bookSpaceAction, type SpaceBookingField } from "@/app/spaces/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatPrice } from "@/lib/format";
import { SPACE_CUSTOMER_TYPES, type SpaceCustomerType } from "@/lib/spaces/customer-types";
import {
  MAX_BOOKING_DAYS_AHEAD,
  addDays,
  durationMinutes,
  formatDurationArabic,
  formatTimeArabic,
  isDateIso,
  slotEnds,
  slotStarts,
  todayIso,
  type TimeRange,
} from "@/lib/spaces/schedule";
import { cn } from "@/lib/utils";

interface AvailabilityPlan {
  free: TimeRange[];
  closed: boolean;
  enabled: boolean;
  notice: string | null;
}

const SELECT_CLASS =
  "h-11 w-full rounded-lg border border-charcoal-300 bg-white px-3 text-base lg:text-sm text-charcoal-800 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20";

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

export function BookingPanel({ space }: { space: { slug: string; name: string; pricePerHourSar: number } }) {
  const today = todayIso();
  const maxDate = addDays(today, MAX_BOOKING_DAYS_AHEAD);

  const [date, setDate] = useState("");
  const [plan, setPlan] = useState<AvailabilityPlan | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetchFailed, setFetchFailed] = useState(false);
  const [windowIndex, setWindowIndex] = useState(0);
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [customerType, setCustomerType] = useState<SpaceCustomerType>("individual");

  const [state, formAction, pending] = useActionState(bookSpaceAction, { error: null });

  useEffect(() => {
    if (!isDateIso(date)) return;
    let cancelled = false;
    fetch(`/api/spaces/${space.slug}/availability?date=${encodeURIComponent(date)}`)
      .then((response) => response.json())
      .then((data: { ok?: boolean; closed?: boolean; free?: TimeRange[]; bookingEnabled?: boolean; bookingNotice?: string | null }) => {
        if (cancelled) return;
        setPlan({
          free: data.ok ? (data.free ?? []) : [],
          closed: data.ok ? Boolean(data.closed) : true,
          enabled: data.ok ? Boolean(data.bookingEnabled) : false,
          notice: data.ok ? (data.bookingNotice ?? null) : "تعذّر جلب الأوقات المتاحة. أعد المحاولة.",
        });
      })
      .catch(() => {
        if (cancelled) return;
        setPlan(null);
        setFetchFailed(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [date, space.slug]);

  const currentWindow = plan && plan.free.length > 0 ? (plan.free[Math.min(windowIndex, plan.free.length - 1)] ?? null) : null;
  const starts = useMemo(() => (currentWindow ? slotStarts(currentWindow) : []), [currentWindow]);
  const ends = useMemo(() => (currentWindow && start ? slotEnds(currentWindow, start) : []), [currentWindow, start]);

  const duration = start && end ? durationMinutes(start, end) : null;
  const totalSar = duration ? Math.round((space.pricePerHourSar * 100 * duration) / 60) / 100 : null;
  const canSubmit = Boolean(date && start && end && duration && totalSar && plan?.enabled && !loading);
  const needsCompany = customerType === "company" || customerType === "advertiser";

  const fieldErrors = state.fieldErrors;

  return (
    <section id="booking" className="rounded-2xl border border-charcoal-200 bg-white p-6 shadow-soft">
      <h2 className="text-xl font-bold text-charcoal-900">احجز هذه المساحة</h2>
      <p className="mt-1 inline-flex items-center gap-1 text-sm text-charcoal-600">
        <Wallet aria-hidden="true" className="h-4 w-4 text-brand-600" />
        {formatPrice(space.pricePerHourSar)} <span className="text-charcoal-500">/ الساعة — تأكيد فوري بعد الدفع</span>
      </p>

      <form action={formAction} className="mt-5 space-y-4">
        <input type="hidden" name="space" value={space.slug} />
        <input type="hidden" name="date" value={date} />
        <input type="hidden" name="start" value={start} />
        <input type="hidden" name="end" value={end} />
        <input type="hidden" name="total" value={totalSar ?? ""} />
        <input type="hidden" name="customerType" value={customerType} />
        {/* فخ الروبوتات: إجابة نجاح صامتة بلا كتابة. */}
        <div aria-hidden="true" className="sr-only">
          <Label htmlFor={`hp-${space.slug}`}>لا تملأ هذا الحقل</Label>
          <input id={`hp-${space.slug}`} type="text" name="website" tabIndex={-1} autoComplete="off" />
        </div>

        <div>
          <Label htmlFor="booking-date" className="text-sm font-medium text-charcoal-800">
            اليوم <span aria-hidden="true" className="ms-1 text-danger-600">*</span>
          </Label>
          <input
            id="booking-date"
            type="date"
            required
            min={today}
            max={maxDate}
            value={date}
            onChange={(event) => {
              const next = event.target.value;
              setDate(next);
              /* إعادة الضبط في الحدث نفسه: الـ effect يجلب الأوقات فقط. */
              setStart("");
              setEnd("");
              setWindowIndex(0);
              setPlan(null);
              setFetchFailed(false);
              setLoading(isDateIso(next));
            }}
            className={cn(INPUT_CLASS, "mt-1.5")}
          />
        </div>

        {loading ? (
          <p className="inline-flex items-center gap-2 text-sm text-charcoal-600">
            <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
            جارٍ جلب الأوقات المتاحة…
          </p>
        ) : null}

        {fetchFailed ? (
          <p role="alert" className="rounded-lg bg-danger-50 p-3 text-sm font-medium text-danger-700">
            تعذّر جلب الأوقات المتاحة. أعد المحاولة.
          </p>
        ) : null}

        {plan && !loading ? (
          plan.closed ? (
            <p className="rounded-lg bg-charcoal-50 p-3 text-sm text-charcoal-700">
              المساحة لا تُستأجر في هذا اليوم. اختر يومًا آخر من أيام الحجز.
            </p>
          ) : plan.free.length === 0 ? (
            <p className="rounded-lg bg-charcoal-50 p-3 text-sm text-charcoal-700">
              لا توجد أوقات متاحة في هذا اليوم — احتُجز كل الوقت المعلن. جرّب يومًا آخر.
            </p>
          ) : (
            <div className="space-y-4">
              {plan.free.length > 1 ? (
                <div>
                  <span className="text-sm font-medium text-charcoal-800">فترات اليوم المتاحة</span>
                  <div className="mt-1.5 flex flex-wrap gap-2">
                    {plan.free.map((window, index) => (
                      <button
                        key={`${window.start}-${window.end}`}
                        type="button"
                        onClick={() => {
                          setWindowIndex(index);
                          setStart("");
                          setEnd("");
                        }}
                        className={cn(
                          "min-h-11 rounded-lg border px-3 py-1.5 text-sm font-medium transition",
                          index === windowIndex
                            ? "border-brand-600 bg-brand-50 text-brand-700"
                            : "border-charcoal-300 bg-white text-charcoal-700 hover:border-brand-400",
                        )}
                      >
                        {formatTimeArabic(window.start)} — {formatTimeArabic(window.end)}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="booking-start" className="text-sm font-medium text-charcoal-800">
                    من <span aria-hidden="true" className="ms-1 text-danger-600">*</span>
                  </Label>
                  <select
                    id="booking-start"
                    required
                    value={start}
                    onChange={(event) => {
                      setStart(event.target.value);
                      setEnd("");
                    }}
                    className={cn(SELECT_CLASS, "mt-1.5")}
                  >
                    <option value="">اختر الوقت…</option>
                    {starts.map((value) => (
                      <option key={value} value={value}>
                        {formatTimeArabic(value)}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label htmlFor="booking-end" className="text-sm font-medium text-charcoal-800">
                    إلى <span aria-hidden="true" className="ms-1 text-danger-600">*</span>
                  </Label>
                  <select
                    id="booking-end"
                    required
                    disabled={!start}
                    value={end}
                    onChange={(event) => setEnd(event.target.value)}
                    className={cn(SELECT_CLASS, "mt-1.5")}
                  >
                    <option value="">اختر الوقت…</option>
                    {ends.map((value) => (
                      <option key={value} value={value}>
                        {formatTimeArabic(value)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )
        ) : null}

        {duration && totalSar ? (
          <p className="rounded-lg bg-brand-50 p-3 text-sm font-medium text-brand-800">
            المدة: {formatDurationArabic(duration)} — الإجمالي {formatPrice(totalSar)}
            <span className="font-normal text-brand-700"> (شامل الضريبة)</span>
          </p>
        ) : null}

        {!plan?.enabled && plan?.notice ? (
          <p className="inline-flex items-start gap-2 rounded-lg bg-charcoal-50 p-3 text-sm text-charcoal-700">
            <Info aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-charcoal-500" />
            {plan.notice}
          </p>
        ) : null}

        <fieldset>
          <legend className="text-sm font-medium text-charcoal-800">
            نوع الحجز <span aria-hidden="true" className="ms-1 text-danger-600">*</span>
          </legend>
          <div className="mt-1.5 grid grid-cols-2 gap-2">
            {(Object.keys(SPACE_CUSTOMER_TYPES) as SpaceCustomerType[]).map((type) => (
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
                {SPACE_CUSTOMER_TYPES[type]}
              </button>
            ))}
          </div>
          <FieldError message={fieldErrors?.customerType} />
        </fieldset>

        {needsCompany ? (
          <div>
            <Label htmlFor="booking-company" className="text-sm font-medium text-charcoal-800">
              {customerType === "company" ? "اسم الشركة" : "اسم الجهة أو المكتب"}{" "}
              <span aria-hidden="true" className="ms-1 text-danger-600">*</span>
            </Label>
            <input
              id="booking-company"
              name="companyName"
              required={customerType === "company"}
              maxLength={120}
              className={cn(INPUT_CLASS, "mt-1.5")}
              placeholder="مثال: استوديو الأمل للإنتاج"
            />
            <FieldError message={fieldErrors?.company} />
          </div>
        ) : null}

        <div>
          <Label htmlFor="booking-name" className="text-sm font-medium text-charcoal-800">
            الاسم <span aria-hidden="true" className="ms-1 text-danger-600">*</span>
          </Label>
          <input id="booking-name" name="name" required maxLength={80} autoComplete="name" className={cn(INPUT_CLASS, "mt-1.5")} />
          <FieldError message={fieldErrors?.name} />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="booking-email" className="text-sm font-medium text-charcoal-800">
              البريد الإلكتروني <span aria-hidden="true" className="ms-1 text-danger-600">*</span>
            </Label>
            <input
              id="booking-email"
              name="email"
              type="email"
              required
              dir="ltr"
              autoComplete="email"
              className={cn(INPUT_CLASS, "mt-1.5 text-start")}
            />
            <FieldError message={fieldErrors?.email} />
          </div>
          <div>
            <Label htmlFor="booking-phone" className="text-sm font-medium text-charcoal-800">
              رقم الجوال <span aria-hidden="true" className="ms-1 text-danger-600">*</span>
            </Label>
            <input
              id="booking-phone"
              name="phone"
              type="tel"
              required
              dir="ltr"
              inputMode="tel"
              autoComplete="tel"
              placeholder="05XXXXXXXX"
              className={cn(INPUT_CLASS, "mt-1.5 text-start")}
            />
            <FieldError message={fieldErrors?.phone} />
          </div>
        </div>

        <div>
          <Label htmlFor="booking-notes" className="text-sm font-medium text-charcoal-800">
            ملاحظات <span className="ms-2 text-xs font-normal text-charcoal-500">(اختياري)</span>
          </Label>
          <Textarea
            id="booking-notes"
            name="notes"
            rows={3}
            maxLength={2000}
            placeholder="طبيعة التصوير، عدد الأشخاص، أي تجهيزات خاصة…"
            className="mt-1.5"
          />
        </div>

        {state.error ? (
          <p role="alert" className="rounded-lg bg-danger-50 p-3 text-sm font-medium text-danger-700">
            {state.error}
          </p>
        ) : null}

        <Button type="submit" size="lg" className="w-full" disabled={pending || !canSubmit}>
          {pending ? <Loader2 aria-hidden="true" className="h-5 w-5 animate-spin" /> : <Lock aria-hidden="true" className="h-4 w-4" />}
          {pending ? "جارٍ تحويلك إلى الدفع…" : "المتابعة للدفع الإلكتروني"}
        </Button>
        <p className="text-center text-xs leading-relaxed text-charcoal-500">
          يُؤكَّد الحجز فورًا بعد نجاح الدفع، وتصلك تفاصيله على البريد. بياناتك تُستخدم لتثبيت الحجز فقط.
        </p>
      </form>
    </section>
  );
}
