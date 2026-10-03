/**
 * العدّ التنازلي — دالة نقية تشتق كل الأرقام من الموعد الفعلي والوقت الحالي.
 * بعد الموعد لا أرقام سالبة: تُرجع `started` فقط.
 */

export type CountdownState =
  | { started: false; days: number; hours: number; minutes: number; seconds: number }
  | { started: true };

export function countdownParts(targetMs: number, nowMs: number): CountdownState {
  const remaining = Math.floor((targetMs - nowMs) / 1000);
  if (remaining <= 0) return { started: true };
  return {
    started: false,
    days: Math.floor(remaining / 86_400),
    hours: Math.floor((remaining % 86_400) / 3_600),
    minutes: Math.floor((remaining % 3_600) / 60),
    seconds: remaining % 60,
  };
}
