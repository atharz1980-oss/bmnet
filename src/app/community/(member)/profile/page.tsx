import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { ProfileEditor } from "@/components/community/profile-editor";
import { PortfolioManager } from "@/components/community/portfolio-manager";
import { loadMyPortfolio } from "@/lib/community/loaders";
import { getCommunityContext } from "@/lib/community/member";

export const metadata: Metadata = {
  title: "ملفي في المجتمع",
  robots: { index: false, follow: false },
};

export default async function CommunityProfilePage() {
  const [ctx, projects] = await Promise.all([getCommunityContext(), loadMyPortfolio()]);
  if (!ctx) redirect("/community/login?next=%2Fcommunity%2Fprofile");
  return (
    <section className="mx-auto w-full max-w-2xl px-4 py-8 space-y-10">
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">ملفي في المجتمع</h1>
        <p className="text-sm text-muted-foreground">
          {ctx?.member
            ? "حرّر ملفك العام — يظهر للمصورين والزوار في صفحتك."
            : "أكمل ملفك الشخصي لتبدأ النشر والتفاعل في المجتمع."}
        </p>
        <ProfileEditor initial={ctx?.member ?? null} email={ctx?.user.email ?? ""} />
      </div>
      <PortfolioManager initialProjects={projects} />
    </section>
  );
}
