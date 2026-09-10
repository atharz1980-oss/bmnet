import type { Metadata } from "next";
import { Suspense } from "react";

import { PageHeader } from "@/components/shared/page-header";
import { PhotographersExplorer } from "@/components/community/photographers-explorer";
import { loadPhotographers } from "@/lib/community/loaders";

export const metadata: Metadata = {
  title: "استكشف المصورين — المجتمع",
  description: "اكتشف مصوري مجتمع بيت المصور وابحث حسب المدينة والتخصص ومستوى الخبرة.",
  alternates: { canonical: "/community/photographers" },
};

export const revalidate = 60;

interface SearchParams {
  q?: string;
  city?: string;
  country?: string;
  specialty?: string;
  experience?: string;
  available?: string;
  page?: string;
}

export default async function PhotographersPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const pageRaw = Number.parseInt(params.page ?? "0", 10);
  const page = Number.isFinite(pageRaw) && pageRaw >= 0 && pageRaw <= 100 ? pageRaw : 0;
  const result = await loadPhotographers({
    q: params.q,
    city: params.city,
    country: params.country,
    specialty: params.specialty,
    experience: params.experience,
    available: params.available,
    page,
  });

  return (
    <>
      <PageHeader
        title="استكشف المصورين"
        description="ابحث في أعضاء المجتمع حسب الاسم أو المدينة أو التخصص."
        breadcrumb={[
          { label: "الرئيسية", href: "/" },
          { label: "المجتمع", href: "/community" },
          { label: "المصورون" },
        ]}
      />
      <section className="mx-auto w-full max-w-5xl px-4 py-8">
        <Suspense fallback={<div className="h-64 animate-pulse rounded-xl bg-muted" />}>
          <PhotographersExplorer
            initialMembers={result.members}
            initialHasMore={result.hasMore}
            failed={result.failed}
            filters={{
              q: params.q ?? "",
              city: params.city ?? "",
              country: params.country ?? "",
              specialty: params.specialty ?? "",
              experience: params.experience ?? "",
              available: params.available ?? "",
            }}
            page={page}
          />
        </Suspense>
      </section>
    </>
  );
}
