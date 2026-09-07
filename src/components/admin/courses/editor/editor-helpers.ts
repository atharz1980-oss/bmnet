/**
 * Editor helpers — مساعدات صغيرة لمحرر الدورة (Client فقط)
 * مولد معرفات مستقرة للكيانات الجديدة (أيام/محاور/مواعيد):
 * يعمل في المتصفح فقط أثناء تفاعل المستخدم — لا يُستدعى في الـ Seed
 * ولا أثناء SSR، فلا يوجد أي خطر hydration.
 */
export function makeEditorId(prefix: string): string {
  const random = Math.random().toString(36).slice(2, 8);
  return `${prefix}-${Date.now().toString(36)}-${random}`;
}

/** تحويل قيمة حقل رقمي إلى عدد صحيح آمن (الفراغ = 0) */
export function parseIntOrZero(value: string): number {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : 0;
}
