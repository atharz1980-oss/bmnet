import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Compass, Image as ImageIcon, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/shared/container";
import { Reveal } from "@/components/shared/reveal";
import { SectionHeading } from "@/components/shared/section-heading";

const communityFeatures = [
  {
    icon: ImageIcon,
    title: "مشاركة الأعمال والمعارض البصرية",
    description: "انشر أعمالك الفوتوغرافية وتجاربك البصرية وتلقَّ آراء الممارسين والمهتمين.",
  },
  {
    icon: Users,
    title: "دليل المصورين وصنّاع المحتوى",
    description: "استكشف ملفات المصورين في مختلف التخصصات وابنِ شبكة علاقاتك المهنية.",
  },
  {
    icon: Compass,
    title: "بيئة إلهام وتواصل مستمر",
    description: "مساحة تجمع الشغف بالصورة مع فرص التعاون والشراكات الإبداعية في المملكة.",
  },
];

/**
 * القسم 7 — مجتمع بيت المصور (Community)
 * شبكة مهنية للمصورين وصنّاع المحتوى مع الحفاظ الكامل على مسارات التوثيق القائمة
 */
export function CommunitySection() {
  return (
    <section
      aria-labelledby="community-title"
      className="border-t border-charcoal-200/70 bg-surface py-20 sm:py-24 lg:py-28"
    >
      <Container>
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <SectionHeading
            align="start"
            titleId="community-title"
            eyebrow="مجتمع المبدعين / COMMUNITY"
            title="مجتمع تفاعلي للمصورين وصنّاع المحتوى"
            description="مساحة تجمع الممارسين والمواهب البصرية في المملكة لمشاركة أحدث الأعمال، وتبادل الخبرات الفنية، وبناء شراكات إبداعية نوعية."
          />

          <Reveal delay={100}>
            <div className="flex flex-wrap items-center gap-3">
              <Button asChild size="lg" className="h-12 px-7 text-base font-semibold">
                <Link href="/community">
                  انضم إلى المجتمع
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                size="lg"
                className="h-12 gap-1.5 px-6 text-base font-semibold"
              >
                <Link href="/community/photographers">
                  دليل المصورين
                  <ArrowLeft aria-hidden="true" className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </Reveal>
        </div>

        {/* المزايا الثلاث للمجتمع */}
        <div className="mt-12 grid gap-6 sm:grid-cols-3 lg:gap-8">
          {communityFeatures.map((item, index) => (
            <Reveal key={item.title} delay={index * 100}>
              <div className="flex h-full flex-col justify-between rounded-2xl border border-charcoal-200/80 bg-white p-7 transition-all duration-300 hover:-translate-y-1 hover:border-charcoal-300 hover:shadow-lg hover:shadow-charcoal-900/5">
                <div>
                  <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                    <item.icon className="h-6 w-6" aria-hidden="true" />
                  </span>
                  <h3 className="mt-5 text-lg font-bold text-charcoal-900">
                    {item.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-charcoal-500">
                    {item.description}
                  </p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>

        {/* كادر بصري استعراضي من تصوير المجتمع الحقيقي */}
        <Reveal delay={200} className="mt-10 lg:mt-12">
          <div className="group relative overflow-hidden rounded-2xl border border-charcoal-200/80 bg-charcoal-950 p-8 sm:p-12 text-white">
            <div className="absolute inset-0">
              <Image
                src="/images/path-photography.jpg"
                alt="مجتمع مصوري بيت المصور"
                fill
                sizes="(max-width: 1024px) 100vw, 1200px"
                className="object-cover opacity-30 transition-transform duration-700 ease-out group-hover:scale-105"
              />
              <div
                aria-hidden="true"
                className="absolute inset-0 bg-gradient-to-l from-charcoal-950 via-charcoal-950/80 to-charcoal-950/60"
              />
            </div>

            <div className="relative max-w-xl">
              <span className="inline-flex items-center rounded-md border border-white/20 bg-charcoal-950/70 px-3 py-1 font-mono text-xs font-semibold text-brand-400 backdrop-blur">
                COMMUNITY NETWORK
              </span>
              <h3 className="mt-4 text-2xl font-bold leading-snug sm:text-3xl">
                شارك أعمالك واستلهم من مصوري مجتمعنا
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-charcoal-300 sm:text-base">
                سواء كنت في بداية طريقك أو محترفاً تبحث عن بيئة تلهمك وتشاركك الشغف،
                مجتمع بيت المصور يفتح لك أبواب التواصل والفرص الجديدة.
              </p>
              <div className="mt-6 flex flex-wrap items-center gap-3">
                <Button asChild size="lg" className="h-11 px-6 text-sm font-semibold">
                  <Link href="/community">
                    استكشف خلاصة المجتمع
                  </Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  size="lg"
                  className="h-11 border-white/20 bg-transparent px-6 text-sm font-semibold text-white hover:bg-white/10 hover:text-white"
                >
                  <Link href="/community/photographers">
                    تصفح المصورين
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </Reveal>
      </Container>
    </section>
  );
}
