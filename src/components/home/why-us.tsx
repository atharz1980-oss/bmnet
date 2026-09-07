"use client";

import { Container } from "@/components/shared/container";
import { Reveal } from "@/components/shared/reveal";
import { SectionHeading } from "@/components/shared/section-heading";
import { whyUsIcon } from "@/components/admin/homepage/why-us-icons";
import type { WhyUsItem } from "@/data/admin/types";

const staticReasons: WhyUsItem[] = [
  {
    id: "why-graduation",
    title: "مدربون ممارسون",
    description: "يتولى التدريب مصورون ومصورو فيديو يعملون في المجال فعلياً، ويشاركون تجربتهم المباشرة.",
    iconKey: "graduation",
    enabled: true,
  },
  {
    id: "why-lightbulb",
    title: "تطبيق عملي من اليوم الأول",
    description: "نؤمن أن التصوير مهارة تُبنى بالممارسة، لذلك معظم وقت الدورات تطبيق وتدريب موجه.",
    iconKey: "lightbulb",
    enabled: true,
  },
  {
    id: "why-users",
    title: "مجموعات صغيرة",
    description: "أعداد محدودة في كل دورة حتى يحصل كل متدرب على وقته الكافي مع المدرب وأجهزة التدريب.",
    iconKey: "users",
    enabled: true,
  },
  {
    id: "why-monitor",
    title: "بيئة تدريبية متكاملة",
    description: "استوديوهات ومعدات إضاءة وكاميرات متاحة داخل المركز لتدريب واقعي قريب من سوق العمل.",
    iconKey: "monitor-play",
    enabled: true,
  },
  {
    id: "why-award",
    title: "شهادة إتمام",
    description: "شهادة معتمدة تُمنح عند إتمام كل دورة، تُوثّق مهاراتك وتدعم مسارك المهني.",
    iconKey: "award",
    enabled: true,
  },
  {
    id: "why-lifebuoy",
    title: "متابعة بعد الدورة",
    description: "تبقى على تواصل مع المدرب ومجموعة المتدربين لمراجعة أعمالك والإجابة عن أسئلتك.",
    iconKey: "lifebuoy",
    enabled: true,
  },
];

interface WhyUsProps {
  /** Checkpoint 7: محتوى قسم «لماذا نحن» من جسر الإدارة — غائب = الأسباب الثابتة */
  content?: { title: string; description: string; items: WhyUsItem[] };
}

/** لماذا بيت المصور — عبارات بسيطة دون مبالغة تسويقية */
export function WhyUs({ content }: WhyUsProps) {
  const title = content?.title ?? "بيئة تدريب مصممة للاحتراف الحقيقي";
  const description =
    content?.description ??
    "ما يميز تجربة التدريب معنا بأمانة: تفاصيل صغيرة تصنع فرقاً كبيراً في نتيجتك.";
  const reasons = content?.items ?? staticReasons;

  return (
    <section aria-labelledby="why-us-title" className="bg-surface py-16 sm:py-20 lg:py-24">
      <Container>
        <SectionHeading
          eyebrow="لماذا بيت المصور؟"
          titleId="why-us-title"
          title={title}
          description={description}
        />

        <ul className="mt-10 grid gap-5 sm:grid-cols-2 lg:mt-12 lg:grid-cols-3 lg:gap-6">
          {reasons.map((reason, index) => {
            const Icon = whyUsIcon(reason.iconKey);
            return (
              <Reveal as="li" key={reason.id} delay={(index % 3) * 80}>
                <div className="h-full rounded-xl border border-charcoal-200/80 bg-white p-6 transition-colors hover:border-charcoal-300">
                  <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                    {Icon ? <Icon aria-hidden="true" className="h-5 w-5" /> : null}
                  </span>
                  <h3 className="mt-4 text-base font-bold text-charcoal-900">{reason.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-charcoal-500">{reason.description}</p>
                </div>
              </Reveal>
            );
          })}
        </ul>
      </Container>
    </section>
  );
}
