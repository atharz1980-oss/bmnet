/** صياغة مدد الدروس بالعربية. تُستعمل على الخادم والعميل، فلا "server-only". */

/** مدة درس واحد: دقائق، أو ساعة ودقائق حين تتجاوز الساعة. */
export function formatLessonDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return "";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} د`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0 ? `${hours} س` : `${hours} س ${rest} د`;
}

/** إجمالي الدورة: بالساعات حين تتجاوز الساعة، وإلا بالدقائق. */
export function formatTotalDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return "";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} دقيقة`;
  const hours = minutes / 60;
  /* 2.5 ساعة أوضح من «ساعتان و30 دقيقة» في سطر إحصائي. */
  const rounded = Math.round(hours * 10) / 10;
  return `${Number.isInteger(rounded) ? rounded : rounded.toFixed(1)} ساعة`;
}
