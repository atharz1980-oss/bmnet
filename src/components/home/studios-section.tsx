import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/shared/container";
import { Reveal } from "@/components/shared/reveal";
import { images } from "@/data/images";

const studioFeatures = [
  {
    title: "أنظمة إضاءة ومشتتات احترافية",
    description: "تجهيزات إضاءة متكاملة للتحكم في الضوء والظلال لتصوير البورتريه والمنتجات والفيديو.",
  },
  {
    title: "مساحات عمل وخلفيات متعددة",
    description: "بيئة مهيأة توفر أجواء استوديو متكاملة وتلائم مختلف أساليب التصوير والتدريب.",
  },
  {
    title: "مقر مجهز في جدة",
    description: "موقع ملائم ومتاح لاستقبال المتدربين والمهتمين بالصورة والتطبيق المباشر.",
  },
];

/**
 * القسم 5 — الاستوديوهات والتجهيزات (Studios)
 * يقدم مساحات الاستوديو المجهزة في جدة كركيزة تدريبية وتطبيقية لمنظومة بيت المصور
 */
export function StudiosSection() {
  return (
    <section
      aria-labelledby="studios-title"
      className="border-y border-charcoal-200/70 bg-surface py-20 sm:py-24 lg:py-28"
    >
      <Container>
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
          {/* الصورة التحريرية للاستوديو */}
          <Reveal>
            <div className="group relative aspect-[4/3] w-full overflow-hidden rounded-2xl border border-charcoal-200/80 bg-charcoal-900 shadow-lg shadow-charcoal-900/5 sm:aspect-[16/11]">
              <Image
                src={images.about.src}
                alt={images.about.alt}
                fill
                sizes="(max-width: 1024px) 100vw, 50vw"
                className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
              />
              <div
                aria-hidden="true"
                className="absolute inset-0 bg-gradient-to-t from-charcoal-950/70 via-transparent to-transparent"
              />
              <div className="absolute bottom-4 start-4 end-4 flex items-center justify-between text-white">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-charcoal-950/80 px-3 py-1 font-mono text-xs font-medium text-white backdrop-blur">
                  <MapPin className="h-3.5 w-3.5 text-brand-400" />
                  جدة — استوديو التصوير والتدريب
                </span>
                <span className="font-mono text-xs text-charcoal-300">STUDIOS</span>
              </div>
            </div>
          </Reveal>

          {/* المحتوى التعريفي بالاستوديوهات */}
          <Reveal delay={150}>
            <div>
              <p className="font-mono text-xs font-semibold tracking-wider text-brand-600">
                الاستوديوهات والمساحات / STUDIOS
              </p>
              <h2
                id="studios-title"
                className="mt-3 text-2xl font-bold leading-snug tracking-tight text-charcoal-900 sm:text-3xl lg:text-4xl"
              >
                استوديوهات مجهزة لبيئة تدريب وتصوير واقعية
              </h2>
              <p className="mt-4 text-base leading-relaxed text-charcoal-600 sm:text-lg">
                نوفر في بيت المصور بجدة بيئة استوديو متكاملة تلبي احتياجات المتدربين
                والمصورين وصنّاع المحتوى، مع تجهيزات إضاءة احترافية وخلفيات متعددة
                تتيح التدرب والتطبيق العملي في أجواء استوديو حقيقية.
              </p>

              {/* مميزات الاستوديو المرتكزة على واقع الموقع */}
              <ul className="mt-8 space-y-4">
                {studioFeatures.map((feature) => (
                  <li key={feature.title} className="flex items-start gap-3">
                    <span className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-600">
                      <CheckCircle2 className="h-4 w-4" />
                    </span>
                    <div>
                      <h3 className="text-sm font-bold text-charcoal-900 sm:text-base">
                        {feature.title}
                      </h3>
                      <p className="mt-0.5 text-xs leading-relaxed text-charcoal-500 sm:text-sm">
                        {feature.description}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>

              {/* أزرار الإجراءات المتوافقة مع واقع الحجز والزيارة */}
              <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
                <Button asChild size="lg" className="h-12 px-7 text-base font-semibold">
                  <Link href="/contact">
                    تواصل معنا لزيارة الاستوديو
                  </Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  size="lg"
                  className="h-12 gap-1.5 px-7 text-base font-semibold"
                >
                  <Link href="/about">
                    عن المركز وقصتنا
                    <ArrowLeft aria-hidden="true" className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </div>
          </Reveal>
        </div>
      </Container>
    </section>
  );
}
