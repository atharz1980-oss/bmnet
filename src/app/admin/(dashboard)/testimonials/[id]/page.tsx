"use client";

/**
 * /admin/testimonials/[id] — تعديل تقييم (المهمة #15)
 * نفس محرر التقييم بوضع التعديل — المعرّف من المسار.
 */
import { useParams } from "next/navigation";

import { TestimonialEditor } from "@/components/admin/testimonials/testimonial-editor";

export default function EditTestimonialPage() {
  const params = useParams<{ id: string }>();
  const testimonialId = Array.isArray(params?.id) ? params.id[0] : params?.id;

  return <TestimonialEditor mode="edit" testimonialId={testimonialId} />;
}
