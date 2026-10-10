/**
 * صفحة الهبوط «ورشة أساسيات التصوير الفوتوغرافي» — المحتوى المعتمد والإعداد.
 *
 * كل نص هنا من الموجز المعتمد. لا تواريخ بداية أو نهاية ولا موعد لانتهاء
 * العرض: الموعد «خلال أكتوبر 2026» ويُحدَّد لاحقًا.
 */

/** معرّف الورشة في workshop_orders — ثابت لا يتغير بعد أول طلب. */
export const PHOTOGRAPHY_BASICS_SLUG = "photography-basics";

export const PHOTOGRAPHY_BASICS_PATH = "/lp/photography-basics";

/** صورة الصفحة ومشاركتها — من صور الموقع القائمة (1344×768). */
export const PHOTOGRAPHY_IMAGE = "/images/course-fundamentals.jpg";

/** المبالغ المعتمدة شاملة الضريبة (ريال). الخادم يحسب منها المحصَّل بالهللات. */
export const photographyPricing = {
  previousSar: 1400,
  currentSar: 796,
  depositSar: 300,
  balanceSar: 496,
} as const;

/** هل يُفتح الدفع الإلكتروني لهذه الورشة؟ `false` يغلق الزر ويُبقي واتساب. */
export const PHOTOGRAPHY_BASICS_CHECKOUT_ENABLED = true;

export const photographyWorkshop = {
  title: "ورشة أساسيات التصوير الفوتوغرافي",
  description:
    "تعلم أساسيات التصوير خطوة بخطوة، من فهم الكاميرا والعدسات إلى التحكم في الإعدادات والتعريض وعمق الميدان.",
  mode: "حضورية",
  location: "مقر أكاديمية بيت المصور – جدة",
  mapUrl: "https://maps.google.com/?q=21.563940,39.185852",
  dateLabel: "خلال أكتوبر 2026",
  dateNote: "يُحدَّد موعد البدء النهائي ويُبلَّغ به المسجلون.",
  duration: "4 أيام تدريبية",
} as const;

export const photographyOffer = {
  name: "عرض اليوم الوطني السعودي الـ96",
  badge: "🇸🇦 عرض اليوم الوطني السعودي الـ96",
  discountPercent: Math.round((1 - photographyPricing.currentSar / photographyPricing.previousSar) * 100),
  savingSar: photographyPricing.previousSar - photographyPricing.currentSar,
  vatNote: "الأسعار شاملة ضريبة القيمة المضافة",
} as const;

export interface PhotographyDay {
  day: string;
  title: string;
  topics: string[];
}

export const photographyCurriculum: PhotographyDay[] = [
  {
    day: "اليوم الأول",
    title: "أساس الصورة",
    topics: [
      "مقدمة في التصوير الفوتوغرافي.",
      "تكوين الصورة والقواعد الذهبية وزوايا التصوير.",
      "آلية عمل الكاميرا والعدسة والمستشعر.",
    ],
  },
  {
    day: "اليوم الثاني",
    title: "الكاميرات والعدسات",
    topics: [
      "أنواع الكاميرات DSLR وMirrorless.",
      "أنواع العدسات واستخداماتها.",
      "اختيار الكاميرا والعدسة المناسبتين.",
    ],
  },
  {
    day: "اليوم الثالث",
    title: "الإعدادات والتعريض",
    topics: [
      "أوضاع التصوير وإعدادات الكاميرا.",
      "ISO وAperture وShutter Speed.",
      "مثلث التعريض.",
      "التصوير بالوضع اليدوي Manual.",
    ],
  },
  {
    day: "اليوم الرابع",
    title: "عمق الميدان والتركيز",
    topics: [
      "عمق الميدان Depth of Field.",
      "التحكم في العزل والتركيز.",
      "إبراز العنصر الأساسي في الصورة.",
    ],
  },
];

export const photographyPaymentOptions = {
  full: {
    title: "الدفع الكامل",
    amountLabel: `${photographyPricing.currentSar} ريال`,
    note: "تُسدَّد قيمة الورشة كاملة الآن ويُؤكَّد مقعدك.",
  },
  deposit: {
    title: "دفع عربون",
    amountLabel: `${photographyPricing.depositSar} ريال الآن`,
    note: `والمتبقي ${photographyPricing.balanceSar} ريال يُسدَّد إلكترونيًا قبل بدء الورشة بـ48 ساعة، بعد تحديد موعدها النهائي.`,
  },
} as const;

export const photographyCancellationPolicy = [
  {
    title: "إذا ألغت الأكاديمية الورشة",
    body: "يستحق المشترك استرداد كامل المبالغ المدفوعة.",
  },
  {
    title: "إذا ألغى المشترك",
    body: "يتحول كامل المبلغ المدفوع إلى رصيد تدريبي باسمه، صالح لمدة سنة ميلادية من تاريخ الإلغاء، ويمكن استخدامه في الدورات القادمة مع سداد الفرق إذا كانت قيمة الدورة أعلى.",
  },
] as const;

export const photographyFaq = [
  {
    question: "متى تبدأ الورشة؟",
    answer: `${photographyWorkshop.dateLabel}. ${photographyWorkshop.dateNote}`,
  },
  {
    question: "أين تُقام الورشة؟",
    answer: `${photographyWorkshop.location}. الورشة ${photographyWorkshop.mode}، ومدتها ${photographyWorkshop.duration}.`,
  },
  {
    question: "هل يمكنني دفع عربون فقط؟",
    answer: `نعم، يمكنك حجز مقعدك بعربون ${photographyPricing.depositSar} ريال، ويُسدَّد المتبقي ${photographyPricing.balanceSar} ريال إلكترونيًا قبل بدء الورشة بـ48 ساعة بعد تحديد موعدها النهائي، ويصلك رابط السداد.`,
  },
  {
    question: "ماذا لو ألغيت تسجيلي؟",
    answer: photographyCancellationPolicy[1].body,
  },
  {
    question: "ماذا لو أُلغيت الورشة؟",
    answer: photographyCancellationPolicy[0].body,
  },
] as const;

/** رسالة واتساب لهذه الصفحة وحدها. */
export const PHOTOGRAPHY_WHATSAPP_MESSAGE = "السلام عليكم، حاب أستفسر عن ورشة أساسيات التصوير وعرض الـ796 ريال.";

/** ما يصف الورشة في أحداث Meta — بلا معرّف داخلي. */
export const PHOTOGRAPHY_PIXEL_CONTENT = {
  content_ids: [PHOTOGRAPHY_BASICS_SLUG],
  content_type: "product",
  content_name: photographyWorkshop.title,
} as const;

/** حقل فخ للبرامج الآلية في نموذج الحجز — مخفي عن البشر وقارئات الشاشة. */
export const WORKSHOP_HONEYPOT_FIELD = "website";

/** مراسي الصفحة. */
export const PHOTOGRAPHY_BOOKING_ANCHOR = "booking";
export const PHOTOGRAPHY_FORM_ANCHOR = "workshop-checkout";
export const PHOTOGRAPHY_CURRICULUM_ANCHOR = "curriculum";
