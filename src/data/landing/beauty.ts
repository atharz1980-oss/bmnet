/**
 * صفحة الهبوط «ورشة البيوتي بحلّتها الجديدة — فن تصوير البيوتي الاحترافي»
 * BEAUTY WORKSHOP — Professional Beauty Photography: Photo · Video · Retouch · AI
 *
 * البيانات المعتمدة والأسعار والمحتوى.
 */

export const BEAUTY_PATH = "/lp/beauty";

/** معرّف الورشة في workshop_orders — ثابت لا يتغير بعد أول طلب. */
export const BEAUTY_SLUG = "beauty";

export const BEAUTY_PRICING = {
  /** مرحلة جمعة المصورين — أول 5 مقاعد */
  tier1Sar: 1260,
  /** الحجز المبكر — المشتركون 6-10 */
  tier2Sar: 1350,
  /** السعر الأساسي */
  tier3Sar: 1800,
  currency: "SAR",
  currencyAr: "ريال",
} as const;

/** هل يُفتح الدفع الإلكتروني لهذه الورشة؟ */
export const BEAUTY_CHECKOUT_ENABLED = true;

/** حقل فخ للبرامج الآلية — مخفي عن البشر. */
export const BEAUTY_HONEYPOT_FIELD = "website";

/** مرسى نموذج الحجز في الصفحة. */
export const BEAUTY_FORM_ANCHOR = "beauty-checkout";

export const BEAUTY_METADATA_AR = {
  title: "ورشة البيوتي بحلّتها الجديدة — فوتوغرافي · فيديو · ريتاتش · ذكاء اصطناعي | بيت المصوّر",
  description:
    "ورشة حضورية في جدة تجمع تصوير البيوتي الفوتوغرافي والفيديو والريتاتش الاحترافي وأدوات الذكاء الاصطناعي. 3 أيام × 4 ساعات مع أحمد زغلول — 24-26 ديسمبر 2026.",
  ogImage: "/images/landing/beauty/beauty-hero.jpg",
};

/** ما يصف الورشة في أحداث Meta. */
export const BEAUTY_PIXEL_CONTENT = {
  content_ids: [BEAUTY_SLUG],
  content_type: "product",
  content_name: "Beauty Photography Workshop — Photo · Video · Retouch · AI",
} as const;
