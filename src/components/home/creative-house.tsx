import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ArrowUpLeft } from "lucide-react";
import { Container } from "@/components/shared/container";
import { Reveal } from "@/components/shared/reveal";
import { SectionHeading } from "@/components/shared/section-heading";
import type { CategoryInfo } from "@/types";

interface Pillar {
  id: string;
  labelEn: string;
  titleAr: string;
  descriptionAr: string;
  image: string;
  imageAlt: string;
  href: string;
  ctaText: string;
  tags: string[];
}

const pillars: Pillar[] = [
  {
    id: "academy",
    labelEn: "ACADEMY",
    titleAr: "الأكاديمية التدريبية",
    descriptionAr:
      "برامج متخصصة ودورات عملية في التصوير الفوتوغرافي والفيديو وصناعة المحتوى بالجوال حضورياً في جدة وعن بُعد، يقدمها مدربون ممارسون.",
    image: "/images/course-mobile.jpg",
    imageAlt: "تدريب عملي على صناعة المحتوى والتصوير بالجوال في أكاديمية بيت المصور",
    href: "/courses",
    ctaText: "استكشف الدورات والبرامج",
    tags: ["تصوير احترافي", "صناعة محتوى", "حضورياً وأونلاين"],
  },
  {
    id: "production",
    labelEn: "PRODUCTION",
    titleAr: "الإنتاج وصناعة المحتوى",
    descriptionAr:
      "مساحة تُعنى بإنتاج المحتوى البصري الإبداعي وصناعة الصورة والفيديو، وتقديم الحلول الإبداعية لشركائنا والمبدعين.",
    image: "/images/corporate-training.jpg",
    imageAlt: "إنتاج وصناعة المحتوى المرئي في بيت المصور",
    href: "/contact",
    ctaText: "تواصل معنا بخصوص الإنتاج",
    tags: ["صناعة المحتوى", "إنتاج مرئي", "حلول بصرية"],
  },
  {
    id: "studios",
    labelEn: "STUDIOS",
    titleAr: "الاستوديوهات والتجهيزات",
    descriptionAr:
      "مساحات استوديو مجهزة في مقرنا بجدة بمعدات إضاءة وكاميرات احترافية وخلفيات متعددة، توفر بيئة عمل ملائمة للتطبيق والتدريب.",
    image: "/images/about-studio.jpg",
    imageAlt: "استوديو بيت المصور المجهز في جدة بمعدات الإضاءة الاحترافية",
    href: "/contact",
    ctaText: "تواصل معنا لزيارة الاستوديو",
    tags: ["مساحات مجهزة", "أنظمة إضاءة", "مقرنا بجدة"],
  },
  {
    id: "community",
    labelEn: "COMMUNITY",
    titleAr: "مجتمع المصورين",
    descriptionAr:
      "شبكة تفاعلية للمصورين وصنّاع المحتوى في المملكة لمشاركة المعارض البصرية، وتبادل الخبرات التقنية، وبناء شراكات إبداعية نوعية.",
    image: "/images/path-photography.jpg",
    imageAlt: "مصورون ومبدعون يشاركون تجاربهم وأعمالهم في مجتمع بيت المصور",
    href: "/community",
    ctaText: "انضم إلى مجتمع المصورين",
    tags: ["شبكة مبدعين", "معارض أعمال", "تواصل مهني"],
  },
];

interface CreativeHouseProps {
  /** التوافق مع بيانات فئات الـ CMS إن وُجدت */
  items?: CategoryInfo[];
}

/**
 * القسم 2 — المنظومة الإبداعية (The Creative House)
 * الأركان الأربعة: الأكاديمية، الإنتاج، الاستوديوهات، المجتمع
 * تصميم تحريري فوتوغرافي بروح علامة موحدة بلا تشظٍ
 */
export function CreativeHouse({ items: _items }: CreativeHouseProps) {
  return (
    <section
      id="ecosystem"
      aria-labelledby="creative-house-title"
      className="bg-surface py-16 sm:py-20 lg:py-28"
    >
      <Container>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <SectionHeading
            align="start"
            titleId="creative-house-title"
            eyebrow="المنظومة الإبداعية / THE CREATIVE HOUSE"
            title="أربع مساحات تصنع التجربة المتكاملة"
            description="منظومة متصلة تجمع بين التمكين المعرفي والإنتاج العملي والمساحات المجهزة ومجتمع المبدعين تحت مظلة بيت المصور."
          />
        </div>

        {/* شبكة الأركان الأربعة بتصميم تحريري متقن */}
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:gap-8">
          {pillars.map((pillar, index) => (
            <Reveal key={pillar.id} delay={index * 100}>
              <Link
                href={pillar.href}
                className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-charcoal-200/80 bg-white transition-all duration-300 hover:-translate-y-1 hover:border-charcoal-300 hover:shadow-xl hover:shadow-charcoal-900/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
              >
                {/* كادر الصورة السينمائي */}
                <div className="relative aspect-[16/10] w-full overflow-hidden bg-charcoal-950 sm:aspect-[16/9]">
                  <Image
                    src={pillar.image}
                    alt={pillar.imageAlt}
                    fill
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 50vw"
                    className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                  />
                  {/* تدرج هادئ لقراءة الوسوم والركن */}
                  <div
                    aria-hidden="true"
                    className="absolute inset-0 bg-gradient-to-t from-charcoal-950/80 via-charcoal-950/25 to-transparent"
                  />

                  {/* الشارة التحريرية بالإنجليزية */}
                  <div className="absolute start-4 top-4">
                    <span className="inline-flex items-center rounded-md border border-white/20 bg-charcoal-950/70 px-2.5 py-1 font-mono text-xs font-semibold tracking-wider text-white backdrop-blur">
                      {pillar.labelEn}
                    </span>
                  </div>

                  {/* وسوم الركن أسفل الصورة */}
                  <div className="absolute bottom-3 start-4 flex flex-wrap gap-1.5">
                    {pillar.tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full bg-white/15 px-2.5 py-0.5 text-[11px] font-medium text-white backdrop-blur"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>

                {/* المحتوى التحريري */}
                <div className="flex flex-1 flex-col justify-between p-6 sm:p-7">
                  <div>
                    <h3 className="text-xl font-bold tracking-tight text-charcoal-900 sm:text-2xl">
                      {pillar.titleAr}
                    </h3>
                    <p className="mt-3 text-sm leading-relaxed text-charcoal-600 sm:text-base">
                      {pillar.descriptionAr}
                    </p>
                  </div>

                  <div className="mt-6 flex items-center justify-between border-t border-charcoal-100 pt-4">
                    <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-600 transition-colors group-hover:text-brand-700">
                      {pillar.ctaText}
                      <ArrowLeft
                        aria-hidden="true"
                        className="h-4 w-4 transition-transform group-hover:-translate-x-1"
                      />
                    </span>
                    <span
                      aria-hidden="true"
                      className="flex h-9 w-9 items-center justify-center rounded-full border border-charcoal-200/80 bg-charcoal-50 text-charcoal-500 transition-colors group-hover:border-brand-500/30 group-hover:bg-brand-50 group-hover:text-brand-600"
                    >
                      <ArrowUpLeft className="h-4 w-4" />
                    </span>
                  </div>
                </div>
              </Link>
            </Reveal>
          ))}
        </div>
      </Container>
    </section>
  );
}
