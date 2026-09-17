"use client";

/**
 * مقاعد الدفعات في محرر الدورة — أرقام النظام بجوار أرقام الإدارة.
 *
 * «مسجلون يدويًا» هو ما تكتبه الإدارة (هاتف أو حضور)، و«مؤكَّد» و«محجوز»
 * يحسبهما النظام من المقاعد. الفصل مقصود: رقم واحد مدمج يخفي من أين جاء
 * كل مقعد، ويجعل خطأ إدخال يبدو كحجز حقيقي.
 *
 * القراءة هنا فقط. تعديل السعة والحذف يمران بحفظ الدورة، وحرّاس القاعدة
 * يردّان ما يخالف — والرسالة العربية تصل من هناك لا من هنا.
 */

import { useEffect, useState } from "react";
import { CalendarClock, CircleAlert, Loader2, MapPin, Users } from "lucide-react";

import { cn } from "@/lib/utils";
import { formatNumber } from "@/lib/format";
import { loadSessionSeatsAction, type SessionSeatsView } from "@/app/admin/actions/session-seats";

const STATUS_LABEL: Record<string, string> = {
  upcoming: "قادمة",
  open: "مفتوحة",
  full: "مكتملة",
  closed: "مغلقة",
  completed: "منتهية",
  cancelled: "ملغاة",
};

export function SessionSeatsPanel({ courseId }: { courseId?: string }) {
  const [rows, setRows] = useState<SessionSeatsView[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!courseId) return;
    let cancelled = false;
    void loadSessionSeatsAction(courseId).then((result) => {
      if (cancelled) return;
      if (result.ok) setRows(result.data);
      else setError(result.error);
    });
    return () => {
      cancelled = true;
    };
  }, [courseId]);

  if (!courseId) return null;

  return (
    <section aria-label="مقاعد الدفعات" className="rounded-xl border border-border bg-surface/60 p-4">
      <h3 className="flex items-center gap-2 text-sm font-bold text-charcoal-900">
        <Users aria-hidden="true" className="h-4 w-4 text-brand-600" />
        المقاعد الفعلية
      </h3>
      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
        «مسجلون يدويًا» ما تُدخله الإدارة. «مؤكَّد» و«محجوز» يحسبهما النظام من تسجيلات الموقع، ولا
        تُعدَّل يدويًا.
      </p>

      {error ? (
        <p role="alert" className="mt-3 text-xs text-brand-700">
          {error}
        </p>
      ) : rows === null ? (
        <p className="mt-3 flex items-center gap-2 text-xs text-charcoal-500">
          <Loader2 aria-hidden="true" className="h-3.5 w-3.5 animate-spin" />
          جارٍ القراءة…
        </p>
      ) : rows.length === 0 ? (
        <p className="mt-3 text-xs text-charcoal-500">لا مواعيد لهذه الدورة بعد.</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {rows.map((row) => (
            <li key={row.id} className="rounded-lg border border-border bg-white p-3">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="text-sm font-semibold text-charcoal-900">{row.label}</p>
                <span
                  className={cn(
                    "shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold",
                    row.selectable ? "bg-emerald-100 text-emerald-800" : "bg-charcoal-100 text-charcoal-600",
                  )}
                >
                  {row.selectable ? "متاحة للتسجيل" : (STATUS_LABEL[row.status] ?? row.status)}
                </span>
              </div>
              <p className="num-ltr mt-1 flex flex-wrap items-center gap-2 text-xs text-charcoal-500">
                <span className="inline-flex items-center gap-1">
                  <CalendarClock aria-hidden="true" className="h-3.5 w-3.5" />
                  {row.date} · {row.time}
                </span>
                {row.place ? (
                  <span className="inline-flex items-center gap-1">
                    <MapPin aria-hidden="true" className="h-3.5 w-3.5" />
                    {row.place}
                  </span>
                ) : null}
              </p>

              <dl className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-5">
                <Cell label="المقاعد" value={row.capacity} />
                <Cell label="مسجلون يدويًا" value={row.manualCount} />
                <Cell label="مؤكَّد" value={row.confirmed} />
                <Cell label="محجوز" value={row.held} />
                <Cell label="متاح" value={row.available} highlight />
              </dl>

              {row.hasSeatHistory ? (
                <p className="mt-2 flex items-start gap-1.5 text-xs leading-relaxed text-charcoal-500">
                  <CircleAlert aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  لهذا الموعد تسجيلات، فلا يمكن حذفه ولا خفض مقاعده تحت المشغول. أغلقه أو ألغِه بدل
                  الحذف.
                </p>
              ) : null}
              {row.paidWithoutSeat > 0 ? (
                <p className="mt-2 flex items-start gap-1.5 text-xs leading-relaxed text-amber-700">
                  <CircleAlert aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  <span className="num-ltr">{formatNumber(row.paidWithoutSeat)}</span> عملية «مدفوع بلا
                  مقعد» تحتاج قرارًا: نقل إلى موعد آخر أو إعادة المبلغ.
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function Cell({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
  return (
    <div className="rounded-md border border-border bg-surface/60 p-2 text-center">
      <dt className="text-[11px] text-charcoal-500">{label}</dt>
      <dd className={cn("num-ltr mt-0.5 text-sm font-bold", highlight ? "text-brand-700" : "text-charcoal-900")}>
        {formatNumber(value)}
      </dd>
    </div>
  );
}
