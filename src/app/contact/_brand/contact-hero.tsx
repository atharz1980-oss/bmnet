import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { Container } from "@/components/shared/container";
import { BrandCoreShape } from "./brand-shape";
import { eyebrowClass } from "./tokens";

/**
 * ترويسة صفحة التواصل بالهوية التجريبية — محلية لهذه الصفحة فقط (لا تمس PageHeader المشترك).
 * داكنة بالفحمي الرسمي، بلا صورة خلفية (أخف على الهواتف)، وعنصر هوية واحد
 * زخرفي من «Brand Core». العنوان والوصف ومسار التنقل كما في الصفحة الحالية.
 */
export function ContactHero({ title, description }: { title: string; description: string }) {
  return (
    <header className="relative isolate overflow-hidden bg-[var(--bm-ink)] text-[var(--bm-white)]">
      {/* عنصر هوية واحد (Brand Core) — زخرفي فقط، لا يحمل معنى، ولا يغطي النص */}
      <BrandCoreShape className="pointer-events-none absolute -end-12 -top-4 -z-10 w-40 sm:-end-8 sm:w-52 lg:end-[5%] lg:top-auto lg:bottom-14 lg:w-56" />

      <Container className="relative pb-12 pt-10 sm:pb-16 sm:pt-14 lg:pb-24 lg:pt-20">
        <nav aria-label="مسار التنقل" className="mb-6">
          <ol className="flex flex-wrap items-center gap-1 text-sm text-[var(--bm-gray-200)]">
            <li className="flex min-h-11 items-center lg:min-h-6">
              <Link
                href="/"
                className="flex min-h-11 items-center rounded-sm outline-none transition-colors hover:text-[var(--bm-white)] focus-visible:ring-2 focus-visible:ring-[var(--bm-orange)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bm-ink)] lg:min-h-6"
              >
                الرئيسية
              </Link>
            </li>
            <li className="flex min-h-11 items-center gap-1 lg:min-h-6">
              <ChevronLeft aria-hidden="true" className="h-3.5 w-3.5 text-[var(--bm-gray)]" />
              <span aria-current="page" className="font-medium text-[var(--bm-white)]">
                {title}
              </span>
            </li>
          </ol>
        </nav>

        {/* السطر يتبع اتجاه الصفحة (يمين)، والكلمة الإنجليزية وحدها LTR */}
        <p className={`${eyebrowClass} text-[var(--bm-orange)]`}>
          <span lang="en" dir="ltr">
            Contact
          </span>
        </p>
        <h1 className="mt-3 max-w-2xl text-[2rem] font-bold leading-[1.2] sm:text-5xl lg:text-6xl">{title}</h1>
        <p className="mt-4 max-w-xl text-base leading-[1.9] text-[var(--bm-gray-200)] sm:text-lg">{description}</p>
      </Container>
    </header>
  );
}
