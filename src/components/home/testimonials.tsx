import { Quote } from "lucide-react";
import { Container } from "@/components/shared/container";
import { Reveal } from "@/components/shared/reveal";
import { SectionHeading } from "@/components/shared/section-heading";
import { GoogleReviewBadge, StarRating } from "@/components/shared/testimonial-bits";
import { testimonials as staticTestimonials } from "@/data/testimonials";
import { formatMonthYear } from "@/lib/format";
import type { Testimonial } from "@/types";

interface TestimonialsProps {
  /** Checkpoint 7: تقييمات القسم من جسر الإدارة — غائب = التقييمات الثابتة */
  content?: { title: string; description: string; items: Testimonial[] };
}

/** تقييمات العملاء — بنية جاهزة لعرض تقييمات Google الحقيقية مستقبلاً */
export function Testimonials({ content }: TestimonialsProps) {
  const items = content?.items ?? staticTestimonials;
  return (
    <section aria-labelledby="testimonials-title" className="bg-surface py-16 sm:py-20 lg:py-24">
      <Container>
        <SectionHeading
          eyebrow="آراء المتدربين"
          titleId="testimonials-title"
          title={content?.title ?? "ماذا قالوا عن تجربتهم معنا"}
          description={
            content?.description ??
            "نماذج من تقييمات المتدربين — تُحدَّث تلقائياً من تقييمات Google عند التشغيل الفعلي."
          }
        />

        <ul className="mt-10 grid gap-5 sm:grid-cols-2 lg:mt-12 lg:grid-cols-3 lg:gap-6">
          {items.map((testimonial, index) => (
            <Reveal as="li" key={testimonial.id} delay={(index % 3) * 80}>
              <figure className="flex h-full flex-col rounded-xl border border-charcoal-200/80 bg-white p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-md hover:shadow-charcoal-900/5">
                <div className="flex items-center justify-between">
                  <StarRating rating={testimonial.rating} />
                  <Quote aria-hidden="true" className="h-5 w-5 text-charcoal-200" />
                </div>
                <blockquote className="mt-4 flex-1 text-sm leading-relaxed text-charcoal-600">
                  <p>“{testimonial.text}”</p>
                </blockquote>
                <figcaption className="mt-5 flex items-center justify-between gap-3 border-t border-charcoal-100 pt-4">
                  <div className="flex items-center gap-3">
                    {/* صورة رمزية بالأحرف الأولى حتى توفر صور المتدربين */}
                    <span
                      aria-hidden="true"
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-charcoal-900 text-sm font-bold text-white"
                    >
                      {testimonial.name.trim().charAt(0)}
                    </span>
                    <div>
                      <p className="text-sm font-bold text-charcoal-900">{testimonial.name}</p>
                      <p className="text-xs text-charcoal-400">{testimonial.role}</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1.5">
                    <GoogleReviewBadge />
                    <time dateTime={testimonial.date} className="text-[11px] text-charcoal-400">
                      {formatMonthYear(testimonial.date)}
                    </time>
                  </div>
                </figcaption>
              </figure>
            </Reveal>
          ))}
        </ul>
      </Container>
    </section>
  );
}
