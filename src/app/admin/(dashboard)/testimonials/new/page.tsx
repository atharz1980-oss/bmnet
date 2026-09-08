import type { Metadata } from "next";

import { TestimonialEditor } from "@/components/admin/testimonials/testimonial-editor";

export const metadata: Metadata = {
  title: "تقييم جديد | بيت المصور",
};

/** /admin/testimonials/new — إضافة تقييم (#15) */
export default function AdminNewTestimonialPage() {
  return <TestimonialEditor mode="create" />;
}
