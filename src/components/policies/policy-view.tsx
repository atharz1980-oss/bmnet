"use client";

/**
 * PolicyView — صفحة سياسة واحدة (Checkpoint 7 — D-45)
 * -----------------------------------------------------
 * SSR بنص Phase 1 الثابت، وبعد الترطيب نص الـ CMS القانوني المنشور.
 * غير منشورة/محذوفة في الـ CMS → واجهة غير متاحة (بدل 404 قاسٍ).
 */
import { FileCheck2 } from "lucide-react";
import { Container } from "@/components/shared/container";
import { PageHeader } from "@/components/shared/page-header";
import { usePublicCms } from "@/context/public-cms";
import { formatDate } from "@/lib/format";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export interface StaticPolicy {
  title: string;
  summary: string;
  sections: { heading: string; body: string }[];
}

function PolicyUnavailable() {
  return (
    <Container className="py-24 text-center">
      <h1 className="text-2xl font-bold tracking-tight text-charcoal-900">
        هذه الصفحة غير متاحة حالياً
      </h1>
      <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-charcoal-500">
        صفحة السياسات هذه قيد التحديث — تواصل معنا لأي استفسار قانوني أو تشغيلي.
      </p>
      <Button asChild size="lg" className="mt-8 h-12 px-8 text-base font-semibold">
        <Link href="/contact">تواصل معنا</Link>
      </Button>
    </Container>
  );
}

export function PolicyView({
  slug,
  staticPolicy,
}: {
  slug: string;
  staticPolicy?: StaticPolicy;
}) {
  const { view, hydrated } = usePublicCms();

  /* بعد الترطيب: الـ CMS هو المصدر — غير منشورة = غير متاحة */
  const cmsPage = view ? view.legal.find((page) => page.slug === slug) : undefined;
  const policy = cmsPage ?? staticPolicy;

  if (!policy) {
    if (!hydrated) {
      return (
        <Container className="flex min-h-64 items-center justify-center py-24 text-charcoal-300">
          <span className="sr-only">جارٍ تحميل الصفحة…</span>
        </Container>
      );
    }
    return <PolicyUnavailable />;
  }

  /* تضييق النقابي: نص الـ CMS فقرات مسطحة، والثابت أقسام مرقمة */
  const isCms = "paragraphs" in policy;
  const paragraphs = isCms ? policy.paragraphs : [];
  const sections = isCms ? undefined : policy.sections;
  const summary = isCms ? undefined : policy.summary;
  const lastUpdated = isCms ? policy.lastUpdated : undefined;

  return (
    <>
      <PageHeader
        title={policy.title}
        description={summary}
        breadcrumb={[{ label: "الرئيسية", href: "/" }, { label: policy.title }]}
      />
      <Container className="py-12 sm:py-16">
        <div className="mx-auto max-w-3xl">
          <div className="flex items-start gap-3 rounded-xl border border-dashed border-charcoal-300 bg-charcoal-50/50 p-5 text-sm leading-relaxed text-charcoal-500">
            <FileCheck2 aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-brand-500" />
            <p>
              {isCms && lastUpdated ? (
                <>
                  آخر تحديث للسياسة: <span className="num-ltr">{formatDate(lastUpdated)}</span>.
                </>
              ) : (
                <>
                  نصوص السياسات أدناه صياغة مبدئية قابلة للتعديل، وتُراجع نهائياً مع الإدارة
                  قبل الإطلاق الرسمي للموقع.
                </>
              )}
            </p>
          </div>

          {isCms ? (
            /* نص الـ CMS: فقرات مسطحة كما تُحرَّر في محرر الصفحات القانونية */
            <article className="mt-8 space-y-5">
              {paragraphs.map((paragraph, index) => (
                <p key={index} className="leading-relaxed text-charcoal-500">
                  {paragraph}
                </p>
              ))}
            </article>
          ) : (
            <article className="mt-8 space-y-8">
              {(sections ?? []).map((section, index) => (
                <section key={section.heading}>
                  <h2 className="text-lg font-bold text-charcoal-900">
                    <span className="text-brand-600">{index + 1}. </span>
                    {section.heading}
                  </h2>
                  <p className="mt-2.5 leading-relaxed text-charcoal-500">{section.body}</p>
                </section>
              ))}
            </article>
          )}
        </div>
      </Container>
    </>
  );
}
