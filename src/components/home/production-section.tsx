import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Building2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/shared/container";
import { Reveal } from "@/components/shared/reveal";
import { images } from "@/data/images";

const productionHighlights = [
  {
    title: "صناعة المحتوى البصري",
    description: "تطوير الأفكار البصرية وإنتاج الصور والفيديو بمعايير تعكس الهوية باحترافية.",
  },
  {
    title: "تدريب الشركات والجهات",
    description: "برامج تدريبية مخصصة لتمكين فرق العمل في المنشآت من أدوات التصوير وصناعة المحتوى الداخلي.",
  },
  {
    title: "حلول واستشارات إبداعية",
    description: "جلسات توجيه فني وتطوير للأدوات البصرية بما يلائم متطلبات المشاريع الإبداعية.",
  },
];

/**
 * القسم 6 — الإنتاج وصناعة المحتوى (Production)
 * ركن الإنتاج وصناعة المحتوى الإبداعي مع توجيه صادق للتواصل والتدريب
 */
export function ProductionSection() {
  return (
    <section
      aria-labelledby="production-title"
      className="bg-white py-20 sm:py-24 lg:py-28"
    >
      <Container>
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
          {/* المحتوى التحريري */}
          <Reveal className="order-2 lg:order-1">
            <div>
              <p className="font-mono text-xs font-semibold tracking-wider text-brand-600">
                الإنتاج وصناعة المحتوى / PRODUCTION
              </p>
              <h2
                id="production-title"
                className="mt-3 text-2xl font-bold leading-snug tracking-tight text-charcoal-900 sm:text-3xl lg:text-4xl"
              >
                رؤية بصرية متكاملة وصناعة محتوى إبداعي
              </h2>
              <p className="mt-4 text-base leading-relaxed text-charcoal-600 sm:text-lg">
                نعمل في بيت المصور على صناعة المحتوى البصري وتقديم الحلول الإبداعية في التصوير والفيديو،
                إلى جانب دعم المبدعين والمنشآت بالأدوات والخبرات اللازمة لإنتاج محتوى يعبر عن هويتهم.
              </p>

              {/* نقاط القوة المتوافقة مع واقع الموقع */}
              <ul className="mt-8 space-y-4">
                {productionHighlights.map((item) => (
                  <li key={item.title} className="flex items-start gap-3">
                    <span className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-600">
                      <CheckCircle2 className="h-4 w-4" />
                    </span>
                    <div>
                      <h3 className="text-sm font-bold text-charcoal-900 sm:text-base">
                        {item.title}
                      </h3>
                      <p className="mt-0.5 text-xs leading-relaxed text-charcoal-500 sm:text-sm">
                        {item.description}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>

              {/* أزرار الإجراءات الصادقة دلالياً */}
              <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
                <Button asChild size="lg" className="h-12 px-7 text-base font-semibold">
                  <Link href="/contact">
                    تواصل معنا بخصوص الإنتاج
                  </Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  size="lg"
                  className="h-12 gap-1.5 px-7 text-base font-semibold"
                >
                  <Link href="/corporate-training">
                    تدريب الشركات والجهات
                    <ArrowLeft aria-hidden="true" className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </div>
          </Reveal>

          {/* الصورة التحريرية */}
          <Reveal delay={150} className="order-1 lg:order-2">
            <div className="group relative aspect-[4/3] w-full overflow-hidden rounded-2xl border border-charcoal-200/80 bg-charcoal-900 shadow-lg shadow-charcoal-900/5 sm:aspect-[16/11]">
              <Image
                src={images.corporate.src}
                alt={images.corporate.alt}
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
                  <Building2 className="h-3.5 w-3.5 text-brand-400" />
                  الإنتاج وصناعة المحتوى
                </span>
                <span className="font-mono text-xs text-charcoal-300">PRODUCTION</span>
              </div>
            </div>
          </Reveal>
        </div>
      </Container>
    </section>
  );
}
