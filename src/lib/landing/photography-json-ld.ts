/** بيانات Course المنظمة لصفحة «أساسيات التصوير» — بلا تواريخ: الموعد لم يُحدد بعد، ولا موعد لانتهاء العرض. */

import { siteConfig } from "@/data/site";
import {
  PHOTOGRAPHY_BASICS_PATH,
  PHOTOGRAPHY_BASICS_SLUG,
  PHOTOGRAPHY_IMAGE,
  photographyCurriculum,
  photographyPricing,
  photographyWorkshop,
} from "@/data/landing/photography-basics";

const IMAGE = PHOTOGRAPHY_IMAGE;

export function photographyJsonLd() {
  const url = new URL(PHOTOGRAPHY_BASICS_PATH, siteConfig.url).toString();
  return {
    "@context": "https://schema.org",
    "@type": "Course",
    "@id": `${url}#course`,
    name: photographyWorkshop.title,
    description: photographyWorkshop.description,
    url,
    inLanguage: "ar",
    image: new URL(IMAGE, siteConfig.url).toString(),
    courseCode: PHOTOGRAPHY_BASICS_SLUG,
    syllabusSections: photographyCurriculum.map((day) => ({
      "@type": "Syllabus",
      name: `${day.day}: ${day.title}`,
      description: day.topics.join(" "),
    })),
    provider: { "@type": "Organization", name: "أكاديمية بيت المصور", sameAs: siteConfig.url },
    offers: {
      "@type": "Offer",
      category: "Paid",
      price: photographyPricing.currentSar,
      priceCurrency: "SAR",
      availability: "https://schema.org/InStock",
      url: `${url}#booking`,
    },
    hasCourseInstance: {
      "@type": "CourseInstance",
      courseMode: "Onsite",
      location: {
        "@type": "Place",
        name: photographyWorkshop.location,
        address: { "@type": "PostalAddress", addressLocality: "جدة", addressCountry: "SA" },
        geo: { "@type": "GeoCoordinates", latitude: 21.56394, longitude: 39.185852 },
      },
    },
  };
}

