import type { LearningPath } from "@/types";
import { getCourseBySlug } from "./courses";
import { applyDiscount } from "@/lib/format";

/** المسارات التدريبية — Mock Data */
export const learningPaths: LearningPath[] = [
  {
    id: "path-001",
    name: "مسار التصوير الفوتوغرافي الاحترافي",
    slug: "photography-professional",
    description:
      "ثلاث دورات متدرجة تأخذك من صفر معرفة إلى مصور يتحكم بالكاميرا والضوء: الأساسيات، ثم الإضاءة الاستوديوهية، ثم البورتريه.",
    image: "/images/path-photography.jpg",
    imageAlt: "مسار التصوير الفوتوغرافي الاحترافي",
    level: "beginner",
    courseSlugs: ["photography-fundamentals", "studio-lighting", "portrait-photography"],
    durationWeeks: 6,
    discountPercent: 20,
  },
  {
    id: "path-002",
    name: "مسار صناعة المحتوى والفيديو",
    slug: "content-video",
    description:
      "من الجوال إلى الكاميرا السينمائية: مسار متكامل يغطي التصوير بالجوال، المونتاج، ثم الفيديو السينمائي بإخراج متقدم.",
    image: "/images/path-content.jpg",
    imageAlt: "مسار صناعة المحتوى والفيديو",
    level: "all-levels",
    courseSlugs: ["mobile-photography", "video-editing-basics", "cinematic-video"],
    durationWeeks: 8,
    discountPercent: 15,
  },
];

export interface PathPricing {
  totalPrice: number;
  finalPrice: number;
  coursesCount: number;
  coursesNames: string[];
}

/** حسابات المسار: مجموع أسعار الدورات والسعر بعد الخصم — Mock */
export function getPathPricing(path: LearningPath): PathPricing {
  const pathCourses = path.courseSlugs
    .map((slug) => getCourseBySlug(slug))
    .filter((course): course is NonNullable<typeof course> => Boolean(course));

  const totalPrice = pathCourses.reduce((sum, course) => sum + course.price, 0);
  return {
    totalPrice,
    finalPrice: applyDiscount(totalPrice, path.discountPercent),
    coursesCount: pathCourses.length,
    coursesNames: pathCourses.map((course) => course.name),
  };
}
