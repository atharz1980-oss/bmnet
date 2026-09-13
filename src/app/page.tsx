import type { Metadata } from "next";

import { HomePage } from "@/components/home/homepage";

/**
 * الرئيسية كانت الصفحة الوحيدة بلا canonical: كل صفحة أخرى تعلن
 * `alternates` في metadata الخاصة بها، والجذر لم يكن يعلن شيئًا فلم
 * تُطبع الوسم أصلًا. كُشف على الإنتاج ضمن اختبار القبول.
 */
export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

export default function Page() {
  return <HomePage />;
}
