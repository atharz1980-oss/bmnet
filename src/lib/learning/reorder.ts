/**
 * نقل عنصر في قائمة معرّفات — أساس السحب وأزرار الترتيب معًا.
 *
 * منفصل عن المكوّن ليُختبر بلا متصفح: خطأ في الفهارس هنا يعيد ترتيب دروس
 * دورة منشورة، وهو ما لا يُكتشف بالنظر إلى الشاشة بعد فوات الأوان.
 * الحدود تُعيد القائمة كما هي بدل أن ترمي: إفلات في غير محله لا يخسر شيئًا.
 */
export function moveItem(ids: string[], from: number, to: number): string[] {
  if (from < 0 || from >= ids.length) return ids;
  if (to < 0 || to >= ids.length) return ids;
  if (from === to) return ids;
  const next = [...ids];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}
