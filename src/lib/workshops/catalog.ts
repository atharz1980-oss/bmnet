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
};

export function workshopCatalog(slug: string): WorkshopDefinition | null {
  return Object.hasOwn(WORKSHOPS, slug) ? WORKSHOPS[slug] : null;
}
