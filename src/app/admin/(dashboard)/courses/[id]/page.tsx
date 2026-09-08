"use client";

/**
 * /admin/courses/[id] — تعديل دورة (المهمة #9)
 * نفس محرر الدورة بوضع التعديل — المعرّف من المسار.
 */
import { useParams } from "next/navigation";

import { CourseEditor } from "@/components/admin/courses/editor/course-editor";

export default function EditCoursePage() {
  const params = useParams<{ id: string }>();
  const courseId = Array.isArray(params?.id) ? params.id[0] : params?.id;

  return <CourseEditor mode="edit" courseId={courseId} />;
}
