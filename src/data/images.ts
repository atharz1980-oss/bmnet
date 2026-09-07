/**
 * مراجع الصور المركزية (Centralized Image References)
 * ----------------------------------------------------
 * كل صور الموقع تُدار من هنا — صور محلية داخل /public/images
 * يمكن استبدال أي ملف بنفس الاسم دون تعديل الكود،
 * أو تغيير المسار هنا مباشرة عند الربط بقاعدة بيانات لاحقاً.
 */

export const images = {
  logo: "/images/logo.png",
  logoAlt: "شعار بيت المصور",

  hero: {
    src: "/images/hero.jpg",
    alt: "مصور محترف يحمل كاميرته داخل استوديو التصوير في بيت المصور",
  },

  upcomingCourse: {
    src: "/images/course-fundamentals.jpg",
    alt: "كاميرا احترافية على طاولة خلال تدريب أساسيات التصوير",
  },

  about: {
    src: "/images/about-studio.jpg",
    alt: "استوديو بيت المصور للتدريب على التصوير في جدة",
  },

  corporate: {
    src: "/images/corporate-training.jpg",
    alt: "فريق عمل يحضر برنامجاً تدريبياً على التصوير في مقر الشركة",
  },

  categories: {
    inPersonIndividuals: {
      src: "/images/category-individuals.jpg",
      alt: "مجموعة صغيرة من المتدربين في ورشة تصوير حضورية",
    },
    inPersonCorporates: {
      src: "/images/category-corporates.jpg",
      alt: "فريق شركة في برنامج تدريبي على صناعة المحتوى",
    },
    online: {
      src: "/images/category-online.jpg",
      alt: "متدرب يتابع دورة تصوير أونلاين عبر الحاسوب",
    },
    private: {
      src: "/images/category-private.jpg",
      alt: "تدريب فردي على التصوير بإشراف مباشر من مدرب",
    },
  },

  paths: {
    photography: {
      src: "/images/path-photography.jpg",
      alt: "مسار التصوير الفوتوغرافي الاحترافي في بيت المصور",
    },
    content: {
      src: "/images/path-content.jpg",
      alt: "مسار صناعة المحتوى والفيديو في بيت المصور",
    },
  },
} as const;
