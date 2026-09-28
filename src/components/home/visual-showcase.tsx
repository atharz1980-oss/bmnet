import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Sparkles } from "lucide-react";
import { Container } from "@/components/shared/container";
import { Reveal } from "@/components/shared/reveal";

interface ShowcaseItem {
  id: string;
  tagEn: string;
  tagAr: string;
  title: string;
  description?: string;
  image: string;
  imageAlt: string;
  aspectDesktop: string;
  colSpan: string;
}

const craftItems: ShowcaseItem[] = [
  {
    id: "lighting",
    tagEn: "STUDIO LIGHTING",
    tagAr: "الاستوديو وهندسة الضوء",
    title: "التحكم في مصادر الضوء وتشكيل الظلال داخل الاستوديو",
    description:
      "إتقان هندسة الإضاءة، استخدام المشتتات والعواكس، وبناء التباين الدرامي بما يخدم هوية المشهد.",
    image: "/images/course-lighting.jpg",
    imageAlt: "تجهيزات الإضاءة والتحكم في زوايا الظلال داخل استوديو بيت المصور",
    aspectDesktop: "aspect-[16/11]",
    colSpan: "lg:col-span-7",
  },
  {
    id: "portrait",
    tagEn: "PORTRAITURE",
    tagAr: "تصوير البورتريه",
    title: "توثيق الملامح وإبراز التعبير الإنساني بالعدسة",
    description: "قراءة الوجه واختيار الزاوية والبعد البؤري الملائم للتعبير الصادق.",
    image: "/images/course-portrait.jpg",
    imageAlt: "جلسة تصوير بورتريه وتوثيق الملامح في استوديوهات بيت المصور",
    aspectDesktop: "aspect-[16/10]",
    colSpan: "lg:col-span-5",
  },
  {
    id: "products",
    tagEn: "PRODUCT PHOTOGRAPHY",
    tagAr: "تصوير المنتجات",
    title: "إبراز الخامات وتفاصيل المنتجات بدقة بصرية",
    description: "ضبط زوايا الإضاءة وعزل الانعكاسات لتقديم المنتج بوضوح وإتقان بصري.",
    image: "/images/course-products.jpg",
    imageAlt: "تصوير منتجات احترافي وعينات دعائية",
    aspectDesktop: "aspect-[16/10]",
    colSpan: "lg:col-span-5",
  },
  {
    id: "cinematography",
    tagEn: "CINEMATOGRAPHY & VIDEO",
    tagAr: "الفيديو والحركة السينمائية",
    title: "السرد البصري المتحرك وحركات الكاميرا الاحترافية",
    description: "من بناء المشهد الأول وضبط الإطارات إلى المونتاج اللوني النهائي.",
    image: "/images/course-video.jpg",
    imageAlt: "إنتاج الفيديو السينمائي وحركات الكاميرا الاحترافية",
    aspectDesktop: "aspect-[16/11]",
    colSpan: "lg:col-span-7",
  },
];

/**
 * القسم 3 — المعرض البصري / قصة الحرفة (Visual Story)
 * إيقاع سينمائي يبرز أبعاد الصورة الأربعة عبر تصوير حقيقي
 */
export function VisualShowcase() {
  return (
    <section
      aria-labelledby="visual-story-title"
      className="relative overflow-hidden bg-charcoal-950 py-20 text-white sm:py-24 lg:py-32"
    >
      {/* خلفية جمالية خافتة */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -end-40 top-1/4 h-96 w-96 rounded-full bg-brand-600/10 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -start-40 bottom-10 h-80 w-80 rounded-full bg-white/5 blur-3xl"
      />

      <Container className="relative">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <p className="inline-flex items-center gap-2 font-mono text-xs font-semibold tracking-wider text-brand-400">
              <Sparkles aria-hidden="true" className="h-3.5 w-3.5" />
              المعرض البصري / CRAFT &amp; VISION
            </p>
            <h2
              id="visual-story-title"
              className="mt-3 text-3xl font-bold leading-tight tracking-tight text-white sm:text-4xl lg:text-5xl"
            >
              أبعاد الصورة في بيت المصور
            </h2>
            <p className="mt-4 text-base leading-relaxed text-charcoal-300 sm:text-lg">
              لقطات من ممارساتنا واستوديوهاتنا التدريبية والإنتاجية — حيث يتحول الشغف
              إلى صنعة احترافية متكاملة الأدوات.
            </p>
          </div>

          <Reveal delay={150}>
            <Link
              href="/community"
              className="inline-flex items-center gap-2 text-sm font-semibold text-charcoal-300 transition-colors hover:text-white"
            >
              استكشف أعمال المجتمع والمصورين
              <ArrowLeft aria-hidden="true" className="h-4 w-4" />
            </Link>
          </Reveal>
        </div>

        {/* شبكة المعرض غير المتناظرة تحريرياً */}
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-12 lg:gap-8">
          {craftItems.map((item, index) => (
            <Reveal
              key={item.id}
              delay={index * 80}
              className={`group relative overflow-hidden rounded-2xl border border-white/10 bg-charcoal-900/80 transition-all duration-300 hover:border-white/20 sm:col-span-1 ${item.colSpan}`}
            >
              <div
                className={`relative aspect-[16/10] w-full overflow-hidden ${item.aspectDesktop}`}
              >
                <Image
                  src={item.image}
                  alt={item.imageAlt}
                  fill
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 60vw"
                  className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                />
                {/* طبقة تدرج للقراءة */}
                <div
                  aria-hidden="true"
                  className="absolute inset-0 bg-gradient-to-t from-charcoal-950 via-charcoal-950/40 to-transparent"
                />

                {/* المحتوى داخل الكادر البصري */}
                <div className="absolute inset-0 flex flex-col justify-between p-6 sm:p-7">
                  <div className="flex items-center justify-between">
                    <span className="rounded-md border border-white/20 bg-charcoal-950/70 px-2.5 py-1 font-mono text-[11px] font-semibold tracking-wider text-white backdrop-blur">
                      {item.tagEn}
                    </span>
                    <span className="text-xs font-medium text-charcoal-300">
                      {item.tagAr}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-lg font-bold text-white sm:text-xl lg:text-2xl">
                      {item.title}
                    </h3>
                    {item.description ? (
                      <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-charcoal-300 sm:text-sm">
                        {item.description}
                      </p>
                    ) : null}
                  </div>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </Container>
    </section>
  );
}
