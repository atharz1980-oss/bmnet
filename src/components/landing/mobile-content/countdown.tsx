"use client";

/**
 * العدّ التنازلي — مشتق من موعد البداية الفعلي في كل ثانية.
 *
 * آمن للترطيب: الخادم وأول رسم يعرضان خانات فارغة ثابتة الأبعاد (لا وقت
 * في HTML)، ثم تملؤها الساعة في المتصفح. بعد الموعد يختفي العداد كليًا.
 */

import { useSyncExternalStore } from "react";

import { countdownParts } from "@/lib/landing/countdown";

function subscribeClock(onTick: () => void) {
  const id = window.setInterval(onTick, 1000);
  return () => window.clearInterval(id);
}
const readClock = () => Math.floor(Date.now() / 1000);
const serverClock = () => null;

const UNITS = [
  { key: "days", label: "يوم" },
  { key: "hours", label: "ساعة" },
  { key: "minutes", label: "دقيقة" },
  { key: "seconds", label: "ثانية" },
] as const;

export function Countdown({ targetIso }: { targetIso: string }) {
  const nowSeconds = useSyncExternalStore(subscribeClock, readClock, serverClock);
  const state = nowSeconds === null ? null : countdownParts(Date.parse(targetIso), nowSeconds * 1000);

  if (state?.started) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-6 text-center">
        <p className="text-lg font-semibold text-white">بدأت الدورة</p>
      </div>
    );
  }

  return (
    <div>
      <p id="countdown-title" className="mb-3 text-sm font-medium text-charcoal-300">
        تنطلق الدورة بعد
      </p>
      <dl
        aria-labelledby="countdown-title"
        className="grid grid-cols-4 gap-2 sm:gap-3"
        data-countdown-target={targetIso}
      >
        {UNITS.map((unit) => (
          <div
            key={unit.key}
            className="flex flex-col-reverse items-center rounded-xl border border-white/10 bg-white/[0.04] px-1 py-3 sm:py-4"
          >
            <dt className="mt-1 text-xs text-charcoal-400 sm:text-sm">{unit.label}</dt>
            <dd className="font-latin text-2xl font-semibold tabular-nums text-white sm:text-3xl">
              {state ? String(state[unit.key]).padStart(2, "0") : "--"}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
