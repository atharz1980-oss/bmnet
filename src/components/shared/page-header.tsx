import Image from "next/image";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { Container } from "./container";

interface PageHeaderProps {
  title: string;
  description?: string;
  /** مسار التنقل — العناصر من الأقدم للأحدث */
  breadcrumb?: { label: string; href?: string }[];
  /** صورة خلفية اختيارية */
  backgroundImage?: string;
  imageAlt?: string;
}

/** ترويسة موحدة للصفحات الداخلية */
export function PageHeader({
  title,
  description,
  breadcrumb,
  backgroundImage,
  imageAlt,
}: PageHeaderProps) {
  return (
    <header className="relative overflow-hidden bg-charcoal-950 text-white">
      {backgroundImage ? (
        <>
          <Image
            src={backgroundImage}
            alt={imageAlt ?? ""}
            fill
            priority
            sizes="100vw"
            className="object-cover opacity-40"
          />
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-gradient-to-t from-charcoal-950 via-charcoal-950/60 to-charcoal-950/30"
          />
        </>
      ) : null}

      <Container className="relative py-14 sm:py-20">
        {breadcrumb && breadcrumb.length > 0 ? (
          <nav aria-label="مسار التنقل" className="mb-4">
            <ol className="flex flex-wrap items-center gap-1 text-sm text-charcoal-300">
              {breadcrumb.map((item, index) => (
                <li key={`${item.label}-${index}`} className="flex items-center gap-1">
                  {index > 0 && (
                    <ChevronLeft aria-hidden="true" className="h-3.5 w-3.5 text-charcoal-500" />
                  )}
                  {item.href ? (
                    <Link
                      href={item.href}
                      className="transition-colors hover:text-white"
                    >
                      {item.label}
                    </Link>
                  ) : (
                    <span aria-current="page" className="font-medium text-brand-400">
                      {item.label}
                    </span>
                  )}
                </li>
              ))}
            </ol>
          </nav>
        ) : null}

        <h1 className="max-w-3xl text-3xl font-bold leading-tight tracking-tight sm:text-4xl lg:text-5xl">
          {title}
        </h1>
        {description ? (
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-charcoal-300 sm:text-lg">
            {description}
          </p>
        ) : null}
      </Container>
    </header>
  );
}
