import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Check } from "lucide-react";
import { Container } from "@/components/shared/container";
import { Reveal } from "@/components/shared/reveal";
import { SectionHeading } from "@/components/shared/section-heading";
import { categories as staticCategories } from "@/data/categories";
import type { CategoryInfo } from "@/types";

/** فئات الدورات الأربع */
export function CourseCategories({ items }: { items?: CategoryInfo[] }) {
  const categories = items ?? staticCategories;
  return (
    <section aria-labelledby="categories-title" className="bg-surface py-16 sm:py-20 lg:py-24">
      <Container>
        <SectionHeading
          titleId="categories-title"
          eyebrow="طرق التدريب"
          title="فئات الدورات"
          description="اختر أسلوب التدريب الذي يناسبك: حضورياً بمقر المركز، عن بُعد، أو تدريباً خاصاً مصمماً لك."
        />

        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:mt-12 lg:grid-cols-4 lg:gap-6">
          {categories.map((category, index) => (
            <Reveal key={category.id} delay={index * 80}>
              <Link
                href={
                  category.id === "in-person-corporates"
                    ? "/corporate-training"
                    : `/courses?category=${category.slug}`
                }
                className="group block h-full overflow-hidden rounded-xl border border-charcoal-200/80 bg-white transition-all duration-300 hover:-translate-y-1 hover:border-charcoal-300 hover:shadow-lg hover:shadow-charcoal-900/5"
              >
                <div className="relative aspect-[4/3] overflow-hidden bg-charcoal-100">
                  <Image
                    src={category.image}
                    alt={category.imageAlt}
                    fill
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                    className="object-cover transition-transform duration-500 group-hover:scale-[1.05]"
                  />
                  <div
                    aria-hidden="true"
                    className="absolute inset-0 bg-gradient-to-t from-charcoal-950/60 to-transparent"
                  />
                  <h3 className="absolute bottom-3.5 start-4 text-lg font-bold text-white">
                    {category.name}
                  </h3>
                </div>
                <div className="p-5">
                  <p className="line-clamp-2 text-sm leading-relaxed text-charcoal-500">
                    {category.description}
                  </p>
                  <ul className="mt-3.5 space-y-1.5">
                    {category.features.map((feature) => (
                      <li key={feature} className="flex items-center gap-2 text-[13px] text-charcoal-600">
                        <Check aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-brand-500" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-600 transition-colors group-hover:text-brand-700">
                    استعرض الدورات
                    <ArrowLeft
                      aria-hidden="true"
                      className="h-4 w-4 transition-transform group-hover:-translate-x-1"
                    />
                  </span>
                </div>
              </Link>
            </Reveal>
          ))}
        </div>
      </Container>
    </section>
  );
}
