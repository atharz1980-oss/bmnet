/**
 * أنماط موحدة لأزرار الدعوة لاتخاذ إجراء (CTA) لصفحة هبوط «موقع المصور بالذكاء الاصطناعي».
 *
 * المواصفات المعتمدة:
 * - اللون الأساسي: خلفية حمراء جذابة ومحفزة للحجز (#DC2626).
 * - نص أبيض واضح بخط عريض (font-bold text-white).
 * - زوايا دائرية أنيقة (rounded-xl).
 * - تأثير Hover أحمر داكن (#B91C1C).
 * - حركة تفاعلية خفيفة عند المرور والضغط (transition-all hover:scale-[1.02] active:scale-[0.98]).
 * - تصميم Mobile First مريح وسهل النقر على شاشات الهواتف الذكية.
 */

export const LP_AI_CTA_BUTTON_CLASSES =
  "inline-flex items-center justify-center gap-2 rounded-xl bg-[#DC2626] font-bold text-white shadow-lg shadow-red-950/30 transition-all duration-200 hover:bg-[#B91C1C] hover:scale-[1.02] hover:shadow-red-900/40 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 focus-visible:ring-offset-charcoal-950";
