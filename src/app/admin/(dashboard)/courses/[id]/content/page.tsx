import { notFound } from "next/navigation";

import { requirePermission } from "@/lib/admin/session";
import { getServiceSupabase } from "@/lib/supabase/service";
import { loadCourseContent } from "@/lib/learning/content";
import { bunnyConfigured } from "@/lib/learning/bunny";
import type { EnrollmentStatus } from "@/lib/learning/access";
import { CourseContentManager } from "@/components/admin/learning/course-content-manager";

/* محتوى يتغير مع كل حفظ — لا تخزين. */
export const dynamic = "force-dynamic";

interface EnrollmentRow {
  id: string;
  user_id: string;
  source: string;
  status: EnrollmentStatus;
  granted_at: string;
  expires_at: string | null;
}

export default async function CourseContentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const gate = await requirePermission("courses", "view");
  if (!gate.ok) {
    return (
      <p className="p-8" role="alert">
        {gate.error}
      </p>
    );
  }

  const { id } = await params;
  const svc = getServiceSupabase();
  const { data: course } = await svc
    .from("courses")
    .select("id, name, slug, category")
    .eq("id", id)
    .maybeSingle();
  if (!course) notFound();

  const [content, { data: enrollmentRows }] = await Promise.all([
    loadCourseContent(course.id),
    svc
      .from("course_enrollments")
      .select("id, user_id, source, status, granted_at, expires_at")
      .eq("course_id", course.id)
      .order("granted_at", { ascending: false })
      .limit(100),
  ]);

  /* البريد من جدول المصادقة عبر دالة تبحث بالمعرّفات المطلوبة وحدها —
     لا تنزيل لقائمة المستخدمين كلها إلى الخادم. */
  const enrollments = (enrollmentRows ?? []) as EnrollmentRow[];
  let emails = new Map<string, string>();
  if (enrollments.length > 0) {
    const { data: rows } = await svc.rpc("admin_emails_for_users", {
      p_ids: enrollments.map((row) => row.user_id),
    });
    emails = new Map((rows ?? []).map((row) => [row.user_id, row.email]));
  }

  return (
    <CourseContentManager
      courseId={course.id}
      courseName={course.name}
      courseSlug={course.slug}
      isOnline={course.category === "online"}
      modules={content.modules}
      enrollments={enrollments.map((row) => ({
        id: row.id,
        email: emails.get(row.user_id) ?? "—",
        source: row.source,
        status: row.status,
        grantedAt: row.granted_at,
        expiresAt: row.expires_at,
      }))}
      streamingReady={bunnyConfigured()}
      canEdit={gate.data.role.permissions.courses?.includes("edit") === true}
      backHref={`/admin/courses/${course.id}`}
    />
  );
}

export function generateMetadata() {
  return { title: "محتوى الدورة الأونلاين" };
}
