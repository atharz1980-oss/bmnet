"use client";

/**
 * لوح حجز مساحة — اختيار اليوم من شريط بطاقات، ثم الفترة المتاحة، ثم «من — إلى».
 *
 * كل شيء هنا تلميح للزائر: الأيام والفترات تصل من API التوافر، والمبلغ يُشتق
 * من سعر المساحة × المدة ويُرسل ليقارنه الخادم بحسابه — القرار وحده في
 * `bookSpaceAction` ← `startSpaceBooking`، فإخفاء الزر ليس أمنًا ولا عهدًا.
 *
 * الترتيب مقصود: لا يُعرض للزائر وقت غير مسموح أصلًا؛ الأيام المغلقة أو
 * المكتملة تظهر معطّلة، والفترات المعروضة هي الحرّة فعلًا، وداخل الفترة
 * المختارة تُقيَّد خيارات البداية والنهاية بها.
 */

import { useActionState, useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  ChevronDown,
  Info,
  Loader2,
  Lock,
  ShoppingBag,
  Sparkles,
  Wallet,
} from "lucide-react";

import { bookSpaceAction, type SpaceBookingField } from "@/app/spaces/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatPrice, formatShortDate } from "@/lib/format";
import { SPACE_CUSTOMER_TYPES, type SpaceCustomerType } from "@/lib/spaces/customer-types";
import {
  DAY_LABELS,
  MAX_BOOKING_DAYS_AHEAD,
  MIN_BOOKING_MINUTES,
  addDays,
  durationMinutes,
  formatDurationArabic,
  formatTimeArabic,
  fromMinutes,
  isDateIso,
  slotEnds,
  slotStarts,
  toMinutes,
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

interface DaySummary {
  date: string;
  /** 0=الأحد … 6=السبت */
  weekday: number;
  closed: boolean;
  freeWindows: number;
  freeMinutes: number;
}

interface DaysResponse {
  ok?: boolean;
  dates?: DaySummary[];
  bookingEnabled?: boolean;
  bookingNotice?: string | null;
}

/** عدد الأيام في كل دفعة من شريط الأيام. */
const DAYS_BATCH = 14;

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

function dayNumber(dateIso: string): number {
  return Number(dateIso.slice(8, 10));
}

/** «أكتوبر» من تاريخ ISO — بلا اعتماد على تقويم المتصفح. */
function monthLabel(dateIso: string): string {
  return formatShortDate(dateIso).split(" ").slice(1).join(" ");
}

/** نطاق افتراضي عند اختيار فترة: ساعة إن سمحت الفترة، وإلا كاملها. */
function defaultRange(window: TimeRange): { start: string; end: string } {
  const start = toMinutes(window.start);
  const end = toMinutes(window.end);
  if (start === null || end === null) return { start: window.start, end: window.end };
  return { start: window.start, end: fromMinutes(Math.min(start + 60, end)) };
}

export function BookingPanel({ space }: { space: { slug: string; name: string; pricePerHourSar: number } }) {
  const today = todayIso();
  const maxDate = addDays(today, MAX_BOOKING_DAYS_AHEAD);

  const [date, setDate] = useState("");
  const [days, setDays] = useState<DaySummary[]>([]);
  const [daysStatus, setDaysStatus] = useState<"loading" | "ready" | "failed">("loading");
  const [daysExhausted, setDaysExhausted] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  /* خطة اليوم تُخزَّن مع تاريخها: اختلاف التاريخ يعني «قيد التحميل» بلا
     setState متزامن داخل الأثر. */
  const [planState, setPlanState] = useState<{ date: string; plan: AvailabilityPlan | null; failed: boolean } | null>(null);
  const [planAttempt, setPlanAttempt] = useState(0);
  const [windowIndex, setWindowIndex] = useState(0);
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [customerType, setCustomerType] = useState<SpaceCustomerType>("individual");

  const [state, formAction, pending] = useActionState(bookSpaceAction, { error: null });

  /* شريط الأيام: نافذة أولى من اليوم، ثم «عرض أيام أكثر». */
  useEffect(() => {
    let cancelled = false;
    fetch(`/api/spaces/${space.slug}/days?from=${encodeURIComponent(today)}&days=${DAYS_BATCH}`)
      .then((response) => response.json())
      .then((data: DaysResponse) => {
        if (cancelled) return;
        if (!data.ok) {
          setDaysStatus("failed");
          return;
        }
        const list = data.dates ?? [];
        setDays(list);
        setDaysExhausted(list.length < DAYS_BATCH);
        setDaysStatus("ready");
        /* اختيار أول يوم متاح تلقائيًا: خطوة أقل، والقرار يبقى بيد الزائر. */
        const first = list.find((day) => !day.closed && day.freeWindows > 0 && day.freeMinutes >= MIN_BOOKING_MINUTES);
        if (first) setDate((current) => current || first.date);
      })
      .catch(() => {
        if (!cancelled) setDaysStatus("failed");
      });
    return () => {
      cancelled = true;
    };
  }, [space.slug, today]);

  /* الفترات الحرّة لليوم المختار. */
  useEffect(() => {
    if (!isDateIso(date)) return;
    let cancelled = false;
    fetch(`/api/spaces/${space.slug}/availability?date=${encodeURIComponent(date)}`)
      .then((response) => response.json())
      .then((data: { ok?: boolean; closed?: boolean; free?: TimeRange[]; bookingEnabled?: boolean; bookingNotice?: string | null }) => {
        if (cancelled) return;
        const free = data.ok ? (data.free ?? []) : [];
        /* فترة أولى مختارة تلقائيًا مع مدتها الافتراضية (ساعة إن سمحت):
           خطوة أقل، والخادم يعيد الفحص عند الدفع. */
        if (free.length > 0) {
          const range = defaultRange(free[0]);
          setStart(range.start);
          setEnd(range.end);
        }
        setPlanState({
          date,
          plan: data.ok
            ? {
                free,
                closed: Boolean(data.closed),
                enabled: Boolean(data.bookingEnabled),
                notice: data.bookingNotice ?? null,
              }
            : {
                free: [],
                closed: true,
                enabled: false,
                notice: "تعذّر جلب الأوقات المتاحة. أعد المحاولة.",
              },
          failed: false,
        });
      })
      .catch(() => {
        if (!cancelled) setPlanState({ date, plan: null, failed: true });
      });
    return () => {
      cancelled = true;
    };
  }, [date, space.slug, planAttempt]);

  const planLoading = Boolean(date) && (!planState || planState.date !== date);
  const plan = planState && planState.date === date ? planState.plan : null;
  const fetchFailed = Boolean(date) && planState?.date === date && planState.failed;

  const currentWindow = plan && plan.free.length > 0 ? (plan.free[Math.min(windowIndex, plan.free.length - 1)] ?? null) : null;
  const starts = useMemo(() => (currentWindow ? slotStarts(currentWindow) : []), [currentWindow]);
  const ends = useMemo(() => (currentWindow && start ? slotEnds(currentWindow, start) : []), [currentWindow, start]);

  /* مدد سريعة لا تتجاوز نهاية الفترة المختارة. */
  const durationOptions = useMemo(() => {
    if (!start || !currentWindow) return [];
    const from = toMinutes(start);
    const limit = toMinutes(currentWindow.end);
    if (from === null || limit === null) return [];
    return [30, 60, 90, 120, 180].filter((minutes) => minutes <= limit - from);
  }, [start, currentWindow]);

  const duration = start && end ? durationMinutes(start, end) : null;
  const totalSar = duration ? Math.round((space.pricePerHourSar * 100 * duration) / 60) / 100 : null;
  const canSubmit = Boolean(date && start && end && duration && totalSar && plan?.enabled && !planLoading);
  const needsCompany = customerType === "company" || customerType === "advertiser";

  const fieldErrors = state.fieldErrors;

  function chooseDate(next: string) {
    if (!isDateIso(next) || next === date) return;
    setDate(next);
    setStart("");
    setEnd("");
    setWindowIndex(0);
  }

  function chooseWindow(window: TimeRange, index: number) {
    setWindowIndex(index);
    const range = defaultRange(window);
    setStart(range.start);
    setEnd(range.end);
  }

  function retryPlan() {
    setPlanState(null);
    setPlanAttempt((attempt) => attempt + 1);
  }

  async function loadMoreDays() {
    if (loadingMore || daysExhausted || days.length === 0) return;
    const nextFrom = addDays(today, days.length);
    if (nextFrom > maxDate) {
      setDaysExhausted(true);
      return;
    }
    setLoadingMore(true);
    try {
      const response = await fetch(
        `/api/spaces/${space.slug}/days?from=${encodeURIComponent(nextFrom)}&days=${DAYS_BATCH}`,
      );
      const data = (await response.json()) as DaysResponse;
      if (data.ok) {
        const list = data.dates ?? [];
        setDays((current) => {
          const merged = new Map(current.map((day) => [day.date, day] as const));
          for (const day of list) merged.set(day.date, day);
          return [...merged.values()];
        });
        if (list.length < DAYS_BATCH) setDaysExhausted(true);
      }
    } catch {
      /* أفضل جهد: يبقى زر «عرض أيام أكثر» متاحًا لإعادة المحاولة. */
    } finally {
      setLoadingMore(false);
    }
  }

  return (
    <section id="booking" className="rounded-2xl border border-charcoal-200 bg-white p-6 shadow-soft">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-charcoal-900">احجز هذه المساحة</h2>
          <p className="mt-1 inline-flex items-center gap-1 text-sm text-charcoal-600">
            <Wallet aria-hidden="true" className="h-4 w-4 text-brand-600" />
            {formatPrice(space.pricePerHourSar)} <span className="text-charcoal-500">/ الساعة — تأكيد فوري بعد الدفع</span>
          </p>
        </div>
        <span className="hidden shrink-0 items-center gap-1 rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700 sm:inline-flex">
          <Sparkles aria-hidden="true" className="h-3.5 w-3.5" />
          حجز فوري
        </span>
      </div>

      <form action={formAction} className="mt-5 space-y-5">
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

        {/* ① اليوم */}
        <div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-charcoal-800">
              <CalendarDays aria-hidden="true" className="h-4 w-4 text-brand-600" />
              اختر يومك
              <span aria-hidden="true" className="text-danger-600">*</span>
            </span>
            {date ? (
              <span className="num-ltr rounded-full bg-charcoal-50 px-2.5 py-1 text-xs font-medium text-charcoal-600">
                {formatShortDate(date)}
              </span>
            ) : null}
          </div>

          {daysStatus === "loading" && days.length === 0 ? (
            <p className="mt-3 inline-flex items-center gap-2 text-sm text-charcoal-600">
              <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
              جارٍ تحميل الأيام المتاحة…
            </p>
          ) : null}

          {daysStatus === "failed" ? (
            <div className="mt-2">
              <p role="alert" className="rounded-lg bg-danger-50 p-3 text-sm font-medium text-danger-700">
                تعذّر تحميل شريط الأيام. اختر التاريخ مباشرة:
              </p>
              <input
                type="date"
                aria-label="تاريخ الحجز"
                required
                min={today}
                max={maxDate}
                value={date}
                onChange={(event) => chooseDate(event.target.value)}
                className={cn(INPUT_CLASS, "mt-2")}
              />
            </div>
          ) : daysStatus === "ready" && days.length === 0 ? (
            <p className="mt-3 rounded-lg bg-charcoal-50 p-3 text-sm text-charcoal-700">
              لا توجد أيام متاحة للحجز حاليًا. جرّب لاحقًا أو تواصل معنا.
            </p>
          ) : (
            <>
              <div
                role="group"
                aria-label="الأيام المتاحة للحجز"
                className="-mx-1 mt-2 flex max-w-full snap-x gap-2 overflow-x-auto px-1 pb-2"
              >
                {days.map((day) => {
                  const available = !day.closed && day.freeWindows > 0 && day.freeMinutes >= MIN_BOOKING_MINUTES;
                  const selected = day.date === date;
                  return (
                    <button
                      key={day.date}
                      type="button"
                      disabled={!available}
                      aria-pressed={selected}
                      aria-label={`${DAY_LABELS[day.weekday]} ${formatShortDate(day.date)} — ${available ? "متاح" : day.closed ? "مغلق" : "مكتمل"}`}
                      onClick={() => chooseDate(day.date)}
                      className={cn(
                        "relative flex w-[5.4rem] shrink-0 snap-start flex-col items-center gap-0.5 rounded-2xl border px-2 py-3 transition",
                        selected
                          ? "border-brand-600 bg-brand-600 text-brand-ink shadow-soft"
                          : available
                            ? "border-charcoal-200 bg-white text-charcoal-800 hover:-translate-y-0.5 hover:border-brand-400 hover:bg-brand-50 hover:shadow-xs"
                            : "cursor-not-allowed border-charcoal-100 bg-charcoal-50 text-charcoal-400",
                      )}
                    >
                      <span className={cn("text-[11px] font-medium", selected ? "text-brand-ink/70" : "")}>
                        {DAY_LABELS[day.weekday]}
                      </span>
                      <span className="text-xl font-bold leading-tight">{dayNumber(day.date)}</span>
                      <span className={cn("text-[10px]", selected ? "text-brand-ink/70" : "text-charcoal-400")}>
                        {monthLabel(day.date)}
                      </span>
                      <span
                        className={cn(
                          "mt-1 rounded-full px-1.5 py-0.5 text-[10px] font-semibold",
                          selected
                            ? "bg-brand-ink/10 text-brand-ink"
                            : available
                              ? "bg-brand-50 text-brand-700"
                              : "bg-charcoal-100 text-charcoal-500",
                        )}
                      >
                        {selected ? "مختار" : available ? "متاح" : day.closed ? "مغلق" : "مكتمل"}
                      </span>
                    </button>
                  );
                })}
              </div>

              {!daysExhausted ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={loadMoreDays}
                  disabled={loadingMore}
                  className="w-full text-charcoal-600"
                >
                  {loadingMore ? (
                    <Loader2 aria-hidden="true" className="me-1.5 h-4 w-4 animate-spin" />
                  ) : (
                    <ChevronDown aria-hidden="true" className="me-1.5 h-4 w-4" />
                  )}
                  {loadingMore ? "جارٍ تحميل أيام أكثر…" : "عرض أيام أكثر"}
                </Button>
              ) : null}
            </>
          )}
        </div>

        {/* ② الفترة ثم ③ الوقت */}
        {planLoading ? (
          <p className="inline-flex items-center gap-2 text-sm text-charcoal-600">
            <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
            جارٍ جلب الأوقات المتاحة…
          </p>
        ) : null}

        {fetchFailed ? (
          <div role="alert" className="rounded-lg bg-danger-50 p-3 text-sm font-medium text-danger-700">
            <p>تعذّر جلب الأوقات المتاحة.</p>
            <Button type="button" variant="outline" size="sm" onClick={retryPlan} className="mt-2 bg-white">
              أعد المحاولة
            </Button>
          </div>
        ) : null}

        {plan && !planLoading ? (
          plan.closed ? (
            <p className="rounded-lg bg-charcoal-50 p-3 text-sm text-charcoal-700">
              المساحة لا تُستأجر في هذا اليوم. اختر يومًا آخر من الأيام المتاحة.
            </p>
          ) : plan.free.length === 0 ? (
            <p className="rounded-lg bg-charcoal-50 p-3 text-sm text-charcoal-700">
              لا توجد أوقات متاحة في هذا اليوم — احتُجز كل الوقت المعلن. جرّب يومًا آخر.
            </p>
          ) : (
            <div className="space-y-4">
              <div>
                <p className="text-sm font-semibold text-charcoal-800">
                  اختر الفترة <span aria-hidden="true" className="text-danger-600">*</span>
                </p>
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  {plan.free.map((window, index) => {
                    const minutes = durationMinutes(window.start, window.end) ?? 0;
                    const active = index === windowIndex;
                    return (
                      <button
                        key={`${window.start}-${window.end}`}
                        type="button"
                        onClick={() => chooseWindow(window, index)}
                        aria-pressed={active}
                        className={cn(
                          "flex items-center gap-3 rounded-xl border p-3 text-start transition",
                          active
                            ? "border-brand-600 bg-brand-50 ring-1 ring-brand-200"
                            : "border-charcoal-200 bg-white hover:border-brand-300 hover:bg-brand-50/40",
                        )}
                      >
                        <span
                          className={cn(
                            "num-ltr grid h-10 w-10 shrink-0 place-items-center rounded-full text-sm font-bold",
                            active ? "bg-brand-600 text-brand-ink" : "bg-brand-50 text-brand-700",
                          )}
                          aria-hidden="true"
                        >
                          {index + 1}
                        </span>
                        <span className="min-w-0">
                          <span className="num-ltr block text-sm font-bold text-charcoal-900">
                            {formatTimeArabic(window.start)} — {formatTimeArabic(window.end)}
                          </span>
                          <span className="block text-[11px] text-charcoal-500">
                            {formatDurationArabic(minutes)} متاحة
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {currentWindow ? (
                <div className="space-y-3 rounded-xl border border-brand-100 bg-brand-50/50 p-3">
                  <p className="flex items-start gap-2 text-xs leading-relaxed text-brand-800">
                    <Info aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>
                      الوقت المسموح:{" "}
                      <span className="num-ltr font-semibold">
                        {formatTimeArabic(currentWindow.start)} — {formatTimeArabic(currentWindow.end)}
                      </span>
                      . اختر البداية والنهاية داخل هذه الفترة — أقصر حجز {MIN_BOOKING_MINUTES} دقيقة.
                    </span>
                  </p>

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

                  {start && durationOptions.length > 0 ? (
                    <div>
                      <p className="text-xs font-medium text-brand-800">اختصارات المدة</p>
                      <div className="mt-1.5 flex flex-wrap gap-2">
                        {durationOptions.map((minutes) => {
                          const target = fromMinutes((toMinutes(start) ?? 0) + minutes);
                          const active = end === target;
                          return (
                            <button
                              key={minutes}
                              type="button"
                              onClick={() => setEnd(target)}
                              aria-pressed={active}
                              className={cn(
                                "min-h-9 rounded-full border px-3 text-xs font-semibold transition",
                                active
                                  ? "border-brand-600 bg-brand-600 text-brand-ink"
                                  : "border-brand-200 bg-white text-brand-700 hover:bg-brand-50",
                              )}
                            >
                              {formatDurationArabic(minutes)}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ) : null}

                  {duration && totalSar ? (
                    <p className="rounded-lg bg-white/70 p-2.5 text-sm font-medium text-brand-800">
                      المدة: {formatDurationArabic(duration)} — الإجمالي {formatPrice(totalSar)}
                      <span className="font-normal text-brand-700"> (شامل الضريبة)</span>
                    </p>
                  ) : null}
                </div>
              ) : null}
            </div>
          )
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

        {/* المسار الأساسي: تجميع الاختيار في السلة (يجوز الجمع مع دورات). */}
        <Button
          type="submit"
          name="intent"
          value="cart"
          size="lg"
          className="w-full gap-2"
          disabled={pending || !canSubmit}
        >
          {pending ? <Loader2 aria-hidden="true" className="h-5 w-5 animate-spin" /> : <ShoppingBag aria-hidden="true" className="h-4 w-4" />}
          أضف إلى السلة
        </Button>
        {/* المسار المباشر: دفع هذا الموعد وحده بلا سلة. */}
        <Button
          type="submit"
          name="intent"
          value="book"
          size="lg"
          variant="outline"
          className="w-full gap-2"
          disabled={pending || !canSubmit}
        >
          {pending ? <Loader2 aria-hidden="true" className="h-5 w-5 animate-spin" /> : <Lock aria-hidden="true" className="h-4 w-4" />}
          {pending ? "جارٍ تحويلك إلى الدفع…" : "ادفع هذا الموعد مباشرة"}
        </Button>
        <p className="text-center text-xs leading-relaxed text-charcoal-500">
          يُؤكَّد الحجز فورًا بعد نجاح الدفع، وتصلك تفاصيله على البريد. بياناتك تُستخدم لتثبيت الحجز فقط.
        </p>
      </form>
    </section>
  );
}
