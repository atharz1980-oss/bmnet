import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { learningPaths } from "@/data/paths";
import { loadPublicView } from "@/lib/cms/public-loader";
import { PathDetails } from "@/components/paths/path-details";

/** توليد صفحات ثابتة لكل مسار (Phase 1 — SSR كامل لمحركات البحث) */
export function generateStaticParams() {
  return learningPaths.map((path) => ({ slug: path.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const staticPath = learningPaths.find((p) => p.slug === slug);
  if (staticPath) {
    return {
      title: staticPath.name,
      description: staticPath.description,
      alternates: { canonical: `/paths/${slug}` },
    };
  }
  const view = await loadPublicView();
  const cmsPath = view?.paths.find((entry) => entry.path.slug === slug);
  if (!cmsPath) return { title: "مسار غير موجود" };
  return {
    title: cmsPath.path.name,
    description: cmsPath.path.description,
    alternates: { canonical: `/paths/${slug}` },
  };
}

export default async function PathDetailsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  /* Checkpoint 7: المسار الثابت للـ SSR — والعميل يستبدله من الـ CMS بعد الترطيب */
  const staticPath = learningPaths.find((p) => p.slug === slug);
  if (staticPath) {
    return <PathDetails slug={slug} />;
  }
  /* مسار أُنشئ لاحقًا في الـCMS يُعرض؛ والمجهول تمامًا → 404 حقيقي (D-86 للتسامح) */
  const view = await loadPublicView();
  if (view && !view.paths.some((entry) => entry.path.slug === slug)) {
    notFound();
  }
  return <PathDetails slug={slug} />;
}
