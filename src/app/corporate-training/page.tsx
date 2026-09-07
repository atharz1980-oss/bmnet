import type { Metadata } from "next";
import Image from "next/image";
import { Building2, CalendarClock, ClipboardCheck, UsersRound } from "lucide-react";
import { Container } from "@/components/shared/container";
import { PageHeader } from "@/components/shared/page-header";
import { Reveal } from "@/components/shared/reveal";
import { CorporateTrainingForm } from "@/components/forms/corporate-training-form";
import { images } from "@/data/images";

export const metadata: Metadata = {
  title: "تدريب الشركات",
  description:
    "برامج تدريبية مصممة لفرق العمل في مجال التصوير والفيديو وصناعة المحتوى — اطلب برنامجاً مخصصاً لشركتك.",
};

const benefits = [
  {
    icon: Building2,
    title: "برنامج مبني على احتياجك",
    description: "نحدد معك الفجوات الفعلية لفريقك ونصمم محتوى التدريب حولها.",
  },
  {
    icon: UsersRound,
    title: "تدريب في مقرك أو مقرنا",
    description: "مرونة كاملة في مكان التنفيذ: داخل شركتك أو في استوديوهات المركز.",
  },
  {
    icon: CalendarClock,
    title: "مواعيد تناسب عملياتكم",
    description: "نرتب الجداول التدريبية بما يتوافق مع طبيعة عمل فريقك وموسمكم.",
  },
  {
    icon: ClipboardCheck,
    title: "تقارير نتائج واضحة",
    description: "تقرير ختامي يلخص مستوى الفريق والتوصيات للمرحلة التالية.",
  },
];

export default function CorporateTrainingPage() {
  return (
    <>
      <PageHeader
        title="تدريب الشركات"
        description="برامج تدريبية متخصصة للجهات والشركات في التصوير والفيديو وصناعة المحتوى."
        breadcrumb={[{ label: "الرئيسية", href: "/" }, { label: "تدريب الشركات" }]}
        backgroundImage={images.corporate.src}
        imageAlt={images.corporate.alt}
      />

      {/* التعريف */}
      <section aria-labelledby="corporate-intro" className="py-14 sm:py-16">
        <Container>
          <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-14">
            <Reveal>
              <p className="text-sm font-semibold text-brand-600">تدريب الشركات</p>
              <h2 id="corporate-intro" className="mt-2 text-2xl font-bold leading-snug tracking-tight text-charcoal-900 sm:text-3xl">
                فريق يتقن الأدوات البصرية، ونتائج تظهر في محتواكم
              </h2>
              <div className="mt-5 space-y-4 leading-relaxed text-charcoal-500">
                <p>
                  نقدّم للشركات والجهات برامج تدريبية مخصصة ترفع جودة المحتوى البصري المنتج داخلياً:
                  من توثيق الفعاليات وتصوير المنتجات، إلى صناعة محتوى السوشال ميديا والفيديو.
                </p>
                <p>
                  يبدأ كل برنامج بجلسة تحديد احتياج مع فريقكم، ثم يُبنى المحتوى والجدول الزمني حول
                  مخرجات واضحة نتفق عليها مسبقاً.
                </p>
              </div>
              <ul className="mt-6 grid gap-4 sm:grid-cols-2">
                {benefits.map((benefit) => (
                  <li key={benefit.title} className="rounded-xl border border-charcoal-200/80 bg-white p-4">
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                      <benefit.icon aria-hidden="true" className="h-4 w-4" />
                    </span>
                    <h3 className="mt-3 text-sm font-bold text-charcoal-900">{benefit.title}</h3>
                    <p className="mt-1 text-xs leading-relaxed text-charcoal-500">{benefit.description}</p>
                  </li>
                ))}
              </ul>
            </Reveal>
            <Reveal delay={100}>
              <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-charcoal-100">
                <Image
                  src={images.corporate.src}
                  alt={images.corporate.alt}
                  fill
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  className="object-cover"
                />
              </div>
            </Reveal>
          </div>
        </Container>
      </section>

      {/* النموذج */}
      <section aria-labelledby="corporate-form" className="bg-surface py-14 sm:py-16 lg:py-20">
        <Container>
          <div className="mx-auto max-w-3xl">
            <Reveal>
              <div className="rounded-2xl border border-charcoal-200/80 bg-white p-6 shadow-sm sm:p-10">
                <h2 id="corporate-form" className="text-xl font-bold tracking-tight text-charcoal-900 sm:text-2xl">
                  اطلب برنامجاً تدريبياً لشركتك
                </h2>
                <p className="mb-7 mt-2 text-sm leading-relaxed text-charcoal-500">
                  عبّئ البيانات التالية وسيتواصل معك فريقنا لمناقشة التفاصيل
                  وإعداد عرض مناسب.
                </p>
                <CorporateTrainingForm />
              </div>
            </Reveal>
          </div>
        </Container>
      </section>
    </>
  );
}
