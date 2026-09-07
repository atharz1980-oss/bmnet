import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Camera, Film, Share2, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/shared/container";
import { PageHeader } from "@/components/shared/page-header";
import { SectionHeading } from "@/components/shared/section-heading";
import { Reveal } from "@/components/shared/reveal";
import { OrgsBand } from "@/components/home/orgs-band";
import { images } from "@/data/images";

export const metadata: Metadata = {
  title: "من نحن",
  description:
    "تعرّف على بيت المصور: مركز التدريب على التصوير الفوتوغرافي والفيديو وصناعة المحتوى في جدة، رسالته وبرامجه.",
};

const focusAreas = [
  { icon: Camera, title: "التصوير الفوتوغرافي", description: "من الأساسيات إلى المجالات المتقدمة كالبورتريه والمنتجات." },
  { icon: Film, title: "الفيديو والمونتاج", description: "تصوير وإخراج وتحرير محتوى مرئي بمعايير احترافية." },
  { icon: Share2, title: "صناعة المحتوى", description: "إنتاج محتوى بصري يخدم العلامات وأصحاب المتاجر والمبدعين." },
];

export default function AboutPage() {
  return (
    <>
      <PageHeader
        title="من نحن"
        description="بيت المصور — مساحة تتقاطع فيها مهارة التدريب مع شغف الصورة."
        breadcrumb={[{ label: "الرئيسية", href: "/" }, { label: "من نحن" }]}
        backgroundImage={images.about.src}
        imageAlt={images.about.alt}
      />

      {/* التعريف */}
      <section aria-labelledby="about-intro" className="py-16 sm:py-20">
        <Container>
          <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-14">
            <Reveal>
              <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-charcoal-100">
                <Image
                  src={images.about.src}
                  alt={images.about.alt}
                  fill
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  className="object-cover"
                />
              </div>
            </Reveal>
            <Reveal delay={100}>
              <p className="text-sm font-semibold text-brand-600">قصتنا</p>
              <h2 id="about-intro" className="mt-2 text-2xl font-bold leading-snug tracking-tight text-charcoal-900 sm:text-3xl">
                مكان يصنع فيه الشغف مهارة
              </h2>
              <div className="mt-5 space-y-4 leading-relaxed text-charcoal-500">
                <p>
                  انطلق بيت المصور في جدة من فكرة بسيطة: التعلّم بالتصوير لا يكتمل بالشرح النظري،
                  بل بالوقوف خلف الكاميرا والتطبيق المتكرر بإشراف من يجيد الصنعة. من هناك بنينا
                  برامجنا التدريبية حول التطبيق العملي المباشر.
                </p>
                <p>
                  اليوم يقدّم المركز دورات في التصوير الفوتوغرافي والفيديو وصناعة المحتوى للأفراد
                  والشركات، حضورياً وأونلاين، إضافة إلى برامج خاصة مصممة حسب أهداف كل متدرب،
                  في استوديوهات مجهزة تحاكي بيئة العمل الحقيقية.
                </p>
                <p>
                  رسالتنا واضحة: أن يخرج كل متدرب من برامجنا بمهارة قابلة للاستخدام فوراً،
                  سواء لأهداف مهنية أو شخصية.
                </p>
              </div>
            </Reveal>
          </div>
        </Container>
      </section>

      {/* مجالات التركيز */}
      <section aria-labelledby="focus-title" className="bg-surface py-16 sm:py-20">
        <Container>
          <SectionHeading
            eyebrow="مجالاتنا"
            title="ثلاثة مجالات، هدف واحد"
            description="نغطي سلسلة الإنتاج البصري كاملة: من الضوء الأول حتى نشر المحتوى."
          />
          <ul className="mt-10 grid gap-5 sm:grid-cols-3 lg:mt-12 lg:gap-6">
            {focusAreas.map((area, index) => (
              <Reveal as="li" key={area.title} delay={index * 80}>
                <div className="h-full rounded-xl border border-charcoal-200/80 bg-white p-6">
                  <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                    <area.icon aria-hidden="true" className="h-5 w-5" />
                  </span>
                  <h3 className="mt-4 text-base font-bold text-charcoal-900">{area.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-charcoal-500">{area.description}</p>
                </div>
              </Reveal>
            ))}
          </ul>
        </Container>
      </section>

      {/* الاعتمادات والشركاء */}
      <OrgsBand variant="accreditations" />
      <OrgsBand variant="partners" />

      {/* دعوة للتواصل */}
      <section aria-labelledby="about-cta" className="py-16 sm:py-20">
        <Container>
          <Reveal className="rounded-2xl border border-charcoal-200/80 bg-white p-8 text-center sm:p-12">
            <Target aria-hidden="true" className="mx-auto h-8 w-8 text-brand-600" />
            <h2 id="about-cta" className="mt-4 text-xl font-bold text-charcoal-900 sm:text-2xl">
              زر مقرنا وتعرّف على بيئة التدريب
            </h2>
            <p className="mx-auto mt-3 max-w-xl leading-relaxed text-charcoal-500">
              نسعد بزيارتك في مقر المركز بجدة للاطلاع على الاستوديوهات والمعدات،
              أو التواصل معنا للإجابة عن أي استفسار قبل التسجيل.
            </p>
            <Button asChild size="lg" className="mt-6 h-12 px-8 text-base font-semibold">
              <Link href="/contact">تواصل معنا</Link>
            </Button>
          </Reveal>
        </Container>
      </section>
    </>
  );
}
