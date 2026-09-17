"use client";

/**
 * اختيار الدفعة — بطاقات مواعيد بمقاعدها المتبقية.
 *
 * الأرقام هنا لقطة لحظة بناء الصفحة، والصفحة مخبّأة دقائق. فهي إرشاد لا
 * ضمان: الضمان الوحيد هو المطالبة الذرية على الخادم، ولذلك تُكتب الواجهة
 * لتحتمل رفضًا متأخرًا برسالة مفهومة بدل أن تَعِد بما قد لا يتم.
 */

import { CalendarDays, MapPin, Users } from "lucide-react";

import { cn } from "@/lib/utils";
import { formatDateWithWeekday, formatSeats } from "@/lib/format";

export interface SessionChoice {
  id: string;
  label: string;
  startDate: string;
  endDate: string | null;
  time: string;
  place: string;
  available: number;
  selectable: boolean;
}

export function SessionPicker({
  sessions,
  selectedId,
  disabled,
  onSelect,
}: {
  sessions: SessionChoice[];
  selectedId: string | null;
  disabled: boolean;
  onSelect: (id: string) => void;
}) {
  if (sessions.length === 0) return null;

  return (
    <fieldset className="mt-5" disabled={disabled}>
      <legend className="mb-2 text-sm font-semibold text-charcoal-900">اختر الموعد المناسب</legend>
      <ul className="space-y-2">
        {sessions.map((session) => {
          const selected = session.id === selectedId;
          const full = !session.selectable;
          return (
            <li key={session.id}>
              <button
                type="button"
                disabled={disabled || full}
                aria-pressed={selected}
                onClick={() => onSelect(session.id)}
                className={cn(
                  "flex min-h-11 w-full flex-col gap-1 rounded-xl border p-3 text-start transition-colors",
                  full
                    ? "cursor-not-allowed border-charcoal-200 bg-surface opacity-70"
                    : selected
                      ? "border-brand-600 bg-brand-50"
                      : "border-charcoal-200 bg-white hover:border-charcoal-400",
                )}
              >
                <span className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="text-sm font-semibold text-charcoal-900">{session.label}</span>
                  {full ? (
                    <span className="shrink-0 rounded-full bg-charcoal-100 px-2 py-0.5 text-[11px] font-semibold text-charcoal-600">
                      اكتملت المقاعد
                    </span>
                  ) : (
                    <span className="num-ltr shrink-0 rounded-full bg-brand-50 px-2 py-0.5 text-[11px] font-semibold text-brand-700">
                      متبقي {formatSeats(session.available)}
                    </span>
                  )}
                </span>
                <span className="num-ltr flex items-center gap-1.5 text-xs text-charcoal-500">
                  <CalendarDays aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-brand-500" />
                  {formatDateWithWeekday(session.startDate)}
                  {session.endDate ? ` – ${formatDateWithWeekday(session.endDate)}` : ""} · {session.time}
                </span>
                {session.place ? (
                  <span className="flex items-center gap-1.5 text-xs text-charcoal-500">
                    <MapPin aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-brand-500" />
                    {session.place}
                  </span>
                ) : null}
              </button>
            </li>
          );
        })}
      </ul>
      <p className="mt-2 flex items-start gap-1.5 text-xs leading-relaxed text-charcoal-400">
        <Users aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        المقاعد المتبقية تقريبية وتتغير لحظيًا — يُحجز مقعدك عند إتمام التسجيل.
      </p>
    </fieldset>
  );
}
