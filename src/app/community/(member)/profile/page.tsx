import type { Metadata } from "next";

import { ProfileEditor } from "@/components/community/profile-editor";
import { getCommunityContext } from "@/lib/community/member";

export const metadata: Metadata = {
  title: "ملفي في المجتمع",
  robots: { index: false, follow: false },
};

export default async function CommunityProfilePage() {
  const ctx = await getCommunityContext();
  return (
    <section className="mx-auto w-full max-w-2xl px-4 py-8">
      <h1 className="mb-1 text-2xl font-bold">ملفي في المجتمع</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        {ctx?.member
          ? "حرّر ملفك العام — يظهر للمصورين والزوار في صفحتك."
          : "أكمل ملفك الشخصي لتبدأ النشر والتفاعل في المجتمع."}
      </p>
      <ProfileEditor initial={ctx?.member ?? null} email={ctx?.user.email ?? ""} />
    </section>
  );
}
