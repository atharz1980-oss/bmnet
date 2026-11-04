/**
 * الورش الحضورية التي تقبل الدفع الكامل أو العربون عبر workshop_orders.
 *
 * المبالغ هنا مصدر الحقيقة للخادم: المتصفح لا يرسل مبلغًا. إضافة ورشة جديدة
 * = إدخال جديد هنا بمعرّف ثابت لا يتغير بعد أول طلب.
 */

import {
  PHOTOGRAPHY_BASICS_CHECKOUT_ENABLED,
  PHOTOGRAPHY_BASICS_PATH,
  PHOTOGRAPHY_BASICS_SLUG,
  photographyPricing,
  photographyWorkshop,
} from "@/data/landing/photography-basics";

import {
  CHROMATICS_CHECKOUT_ENABLED,
  CHROMATICS_PATH,
  CHROMATICS_PRICING,
  CHROMATICS_SLUG,
} from "@/data/landing/chromatics";

export interface WorkshopDefinition {
  slug: string;
  title: string;
  path: string;
  /** السعر الكامل شامل الضريبة (ريال). */
  priceSar: number;
  /** العربون (ريال) — أقل من السعر الكامل. */
  depositSar: number;
  checkoutEnabled: boolean;
}

const WORKSHOPS: Record<string, WorkshopDefinition> = {
  [PHOTOGRAPHY_BASICS_SLUG]: {
    slug: PHOTOGRAPHY_BASICS_SLUG,
    title: photographyWorkshop.title,
    path: PHOTOGRAPHY_BASICS_PATH,
    priceSar: photographyPricing.currentSar,
    depositSar: photographyPricing.depositSar,
    checkoutEnabled: PHOTOGRAPHY_BASICS_CHECKOUT_ENABLED,
  },
  [CHROMATICS_SLUG]: {
    slug: CHROMATICS_SLUG,
    /* عنوان اللقطة يُخزَّن في workshop_orders.workshop_title_snapshot */
    title: "CHROMATICS — Creative Portrait Lighting Masterclass",
    path: CHROMATICS_PATH,
    /** السعر الكامل (Early Bird 199 SAR) — الخادم يحسم منه المبلغ بالهللات. */
    priceSar: CHROMATICS_PRICING.tier1Sar,
    /**
     * لا مسار عربون لكروماتيكس: يُضبط depositSar مساويًا للسعر الكامل
     * لمنع أي تحقق شرطي خاطئ داخل startWorkshopCheckout إذا استُدعي
     * بـ plan="deposit" عن طريق خطأ.
     */
    depositSar: CHROMATICS_PRICING.tier1Sar,
    checkoutEnabled: CHROMATICS_CHECKOUT_ENABLED,
  },
};

export function workshopCatalog(slug: string): WorkshopDefinition | null {
  return Object.hasOwn(WORKSHOPS, slug) ? WORKSHOPS[slug] : null;
}
