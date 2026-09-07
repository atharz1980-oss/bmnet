import type { BlogPost, PartnerOrg } from "@/types";

/** الاعتمادات — شعارات Placeholder مؤقتة حتى تُرفق الشعارات الرسمية */
export const accreditations: PartnerOrg[] = [
  {
    id: "acc-1",
    name: "وزارة الثقافة",
    note: "شعار تجريبي مؤقت – بانتظار الملف الرسمي",
  },
  {
    id: "acc-2",
    name: "المؤسسة العامة للتدريب التقني والمهني",
    note: "شعار تجريبي مؤقت – بانتظار الملف الرسمي",
  },
  {
    id: "acc-3",
    name: "وزارة الإعلام",
    note: "شعار تجريبي مؤقت – بانتظار الملف الرسمي",
  },
];

/** شركاء النجاح — Placeholder Logos حتى تُرفق الشعارات الفعلية */
export const partners: PartnerOrg[] = [
  { id: "p-1", name: "Sony", nameEn: "SONY", note: "شعار تجريبي مؤقت" },
  { id: "p-2", name: "Nanlite", nameEn: "NANLITE", note: "شعار تجريبي مؤقت" },
  { id: "p-3", name: "نيوم", nameEn: "NEOM", note: "شعار تجريبي مؤقت" },
  { id: "p-4", name: "المؤسسة العامة للتدريب التقني والمهني", nameEn: "UPT", note: "شعار تجريبي مؤقت" },
];

/** مقالات المدونة — Mock Data */
export const blogPosts: BlogPost[] = [
  {
    id: "post-001",
    slug: "choose-your-first-camera",
    title: "كيف تختار كاميرتك الأولى؟",
    excerpt:
      "دليل مبسط يشرح الفرق بين أنواع الكاميرات، وأهم الأسئلة التي يجب أن تطرحها على نفسك قبل الشراء بدلاً من الانسياق وراء المواصفات.",
    image: "/images/course-fundamentals.jpg",
    imageAlt: "كاميرا احترافية مناسبة للمبتدئين",
    category: "نصائح للمبتدئين",
    date: "2026-08-12",
    readMinutes: 6,
  },
  {
    id: "post-002",
    slug: "rule-of-thirds-composition",
    title: "قاعدة الأثلاث: أساس الصورة المقنعة",
    excerpt:
      "أشهر قاعدة في التكوين الفوتوغرافي تُشرح بأمثلة عملية: متى تستخدمها، ومتى تكسرها بوعي لتحصل على صورة مميزة.",
    image: "/images/course-portrait.jpg",
    imageAlt: "صورة بورتريه توضح قاعدة الأثلاث في التكوين",
    category: "التكوين",
    date: "2026-07-30",
    readMinutes: 5,
  },
  {
    id: "post-003",
    slug: "natural-vs-studio-light",
    title: "الإضاءة الطبيعية أم الاستوديوهية؟",
    excerpt:
      "مقارنة عملية بين خياري الإضاءة الأساسيين: مميزات كل خيار، تحدياته، وكيف تختار الأنسب حسب نوع مشروعك.",
    image: "/images/course-lighting.jpg",
    imageAlt: "معدات إضاءة استوديو بجانب نافذة بإضاءة طبيعية",
    category: "الإضاءة",
    date: "2026-07-14",
    readMinutes: 7,
  },
  {
    id: "post-004",
    slug: "common-beginner-mistakes",
    title: "5 أخطاء شائعة لدى المصورين المبتدئين",
    excerpt:
      "أخطاء نتلقاها في كل دورة تأسيسية، وكيف تتجنبها من اليوم الأول: من الاعتماد على الأوضوت التلقائية إلى إهمال الخلفية.",
    image: "/images/category-individuals.jpg",
    imageAlt: "متدرب يتعلم أساسيات التصوير في ورشة عملية",
    category: "نصائح للمبتدئين",
    date: "2026-06-25",
    readMinutes: 5,
  },
  {
    id: "post-005",
    slug: "build-your-first-portfolio",
    title: "كيف تبني معرض أعمالك الأول؟",
    excerpt:
      "معرض الأعمال هو بطاقة تعريفك كمصور. في هذا المقال نشرح كيف تبني ملفاً متماسكاً بقوة، حتى بمشاريع معدودة.",
    image: "/images/path-photography.jpg",
    imageAlt: "مصور يراجع أعماله لبناء معرض أعماله الأول",
    category: "المسار المهني",
    date: "2026-06-08",
    readMinutes: 8,
  },
  {
    id: "post-006",
    slug: "shooting-modes-explained",
    title: "أوضاع التصوير: متى تستخدم كل وضع؟",
    excerpt:
      "Auto وProgram وAperture Priority وShutter Priority وManual: دليل مرجعي سريع يوضح متى يكون كل وضع هو الخيار الصحيح.",
    image: "/images/course-products.jpg",
    imageAlt: "قرص أوضاع التصوير في كاميرا احترافية",
    category: "أساسيات",
    date: "2026-05-20",
    readMinutes: 6,
  },
];
