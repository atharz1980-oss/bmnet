import type { Metadata } from "next";

import { HomepageEditor } from "@/components/admin/homepage/homepage-editor";

export const metadata: Metadata = {
  title: "الصفحة الرئيسية | بيت المصور",
};

/** /admin/content/home — محرر أقسام الصفحة الرئيسية (#14) */
export default function AdminHomeContentPage() {
  return <HomepageEditor />;
}
