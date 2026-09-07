import type { CategoryInfo, StatItem } from "@/types";

/** فئات الدورات الأربع — بيانات تجريبية */
export const categories: CategoryInfo[] = [
  {
    id: "in-person-individuals",
    name: "حضوري أفراد",
    slug: "in-person-individuals",
    description:
      "دورات عملية داخل مقر المركز في جدة بمجموعات صغيرة، مع تطبيق مباشر على أرض الواقع وإشراف مباشر من المدرب.",
    image: "/images/category-individuals.jpg",
    imageAlt: "مجموعة صغيرة من المتدربين في ورشة تصوير حضورية",
    features: ["مجموعات صغيرة", "تطبيق عملي مباشر", "شهادة إتمام"],
  },
  {
    id: "in-person-corporates",
    name: "حضوري شركات",
    slug: "in-person-corporates",
    description:
      "برامج تدريبية مصممة خصيصاً لفرق العمل والجهات، تُنفَّذ في مقر المركز أو مقر الجهة حسب احتياجها.",
    image: "/images/category-corporates.jpg",
    imageAlt: "فريق شركة في برنامج تدريبي على صناعة المحتوى",
    features: ["برامج مخصصة", "مرونة في التوقيت", "تقارير نتائج"],
  },
  {
    id: "online",
    name: "أونلاين",
    slug: "online",
    description:
      "دورات عن بُعد بجلسات مباشرة ومحتوى مسجل، تتيح لك التعلّم في الوقت المناسب لك من أي مكان.",
    image: "/images/category-online.jpg",
    imageAlt: "متدرب يتابع دورة تصوير أونلاين عبر الحاسوب",
    features: ["تعلّم بمكانك", "جلسات مسجلة", "متابعة أسبوعية"],
  },
  {
    id: "private",
    name: "برايفت",
    slug: "private",
    description:
      "تدريب فردي بإشراف مباشر، يُبنى المحتوى حول مستواك وهدفك سواء كنت مبتدئاً أو ترغب بتطوير مهارة محددة.",
    image: "/images/category-private.jpg",
    imageAlt: "تدريب فردي على التصوير بإشراف مباشر من مدرب",
    features: ["محتوى حسب هدفك", "جدول مرن", "إشراف فردي"],
  },
];

/** إحصائيات المركز — أرقام تجريبية قابلة للتغيير */
export const stats: StatItem[] = [
  { value: 4500, suffix: "+", label: "متدرب", icon: "users" },
  { value: 120, suffix: "+", label: "دورة تدريبية", icon: "book" },
  { value: 8, suffix: "+", label: "سنوات خبرة", icon: "award" },
  { value: 25, suffix: "+", label: "جهة وشريك", icon: "handshake" },
];

export function getCategoryName(id: string): string {
  return categories.find((c) => c.id === id)?.name ?? "";
}
