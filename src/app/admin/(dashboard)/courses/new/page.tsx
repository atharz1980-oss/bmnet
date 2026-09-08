"use client";

/**
 * /admin/courses/new — إضافة دورة جديدة (المهمة #9)
 * نفس محرر الدورة بوضع الإنشاء.
 */
import { CourseEditor } from "@/components/admin/courses/editor/course-editor";

export default function NewCoursePage() {
  return <CourseEditor mode="create" />;
}
