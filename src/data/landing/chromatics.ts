/**
 * صفحة الهبوط «كروماتيكس — ماستر كلاس إضاءة البورتريه الإبداعية»
 * CHROMATICS — Creative Portrait Lighting Masterclass
 *
 * البيانات المعتمدة والأسعار والمحتوى المتوافق مع التصميم المعتمد.
 */

export const CHROMATICS_PATH = "/lp/chromatics";

/** معرّف الورشة في workshop_orders — ثابت لا يتغير بعد أول طلب. */
export const CHROMATICS_SLUG = "chromatics";

export const CHROMATICS_PRICING = {
  /** السعر الكامل (Early Bird) شامل الضريبة. الخادم يحسب منه المحصَّل بالهللات. */
  tier1Sar: 199,
  tier2Sar: 249,
  tier3Sar: 299,
  currency: "SAR",
  currencyAr: "ريال",
} as const;

/** هل يُفتح الدفع الإلكتروني لهذه الورشة؟ `false` يُبقي النموذج معطّلًا. */
export const CHROMATICS_CHECKOUT_ENABLED = true;

/** حقل فخ للبرامج الآلية في نموذج الحجز — مخفي عن البشر وقارئات الشاشة. */
export const CHROMATICS_HONEYPOT_FIELD = "website";

/** مرسى نموذج الحجز في الصفحة. */
export const CHROMATICS_FORM_ANCHOR = "chromatics-checkout";

export const CHROMATICS_METADATA_AR = {
  title: "الإضاءة الإبداعية بالجيلات الملونة — ماستر كلاس مباشر أونلاين في تصوير البورتريه لمدة 3 أيام | بيت المصوّر",
  description:
    "أتقن إضاءة البورتريه الإبداعية بالجيلات الملونة وRGB في ماستر كلاس مباشر أونلاين لمدة 3 أيام مع بيت المصور. تعلّم إعدادات من 1 إلى 4 مصادر ضوء مباشرة على موديل.",
  ogImage: "/images/landing/chromatics/cl-045-1n.JPG.jpeg",
};

export const CHROMATICS_METADATA_EN = {
  title: "Creative Lighting with Color Gels — 3-Day LIVE Online Portrait Masterclass | Bayt Al Mosawer",
  description:
    "Master creative portrait lighting with color gels & RGB in a 3-Day LIVE Online Masterclass by Bayt Al Mosawer. Learn 1 to 4-light studio setups live.",
  ogImage: "/images/landing/chromatics/cl-045-1n.JPG.jpeg",
};

/** ما يصف الورشة في أحداث Meta — بلا معرّف داخلي. */
export const CHROMATICS_PIXEL_CONTENT = {
  content_ids: [CHROMATICS_SLUG],
  content_type: "product",
  content_name: "Creative Lighting with Color Gels — 3-Day LIVE Online Portrait Masterclass",
} as const;
