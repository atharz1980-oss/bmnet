import type { Metadata } from "next";
import { learningPaths } from "@/data/paths";
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
  const path = learningPaths.find((p) => p.slug === slug);
  if (!path) return { title: "مسار غير موجود" };
  return { title: path.name, description: path.description };
}

export default async function PathDetailsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  /* Checkpoint 7: المسار الثابت للـ SSR — والعميل يستبدله من الـ CMS بعد الترطيب */
  return <PathDetails slug={slug} />;
}
