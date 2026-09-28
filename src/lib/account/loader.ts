import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { loadCourseContent } from "@/lib/learning/content";
import type {
  AccountCommunityInfo,
  AccountDashboardData,
  AccountPaymentHistoryItem,
  ConfirmedSessionSeat,
  EnrolledOnlineCourse,
} from "./types";

interface CourseRow {
  id: string;
  slug: string;
  name: string;
  category: string;
  image_path: string | null;
  image_alt: string | null;
  publish_status: string;
}

interface SessionRow {
  id: string;
  course_id: string;
  batch_name: string;
  start_date: string;
  start_time: string | null;
  location: string;
  city: string | null;
}

export async function loadAccountDashboard(userId: string, email = ""): Promise<AccountDashboardData> {
  const supabase = await createSupabaseServerClient();
  const today = new Date().toISOString().slice(0, 10);

  // 1. Community Profile check
  let community: AccountCommunityInfo = { hasProfile: false };
  try {
    const { data: profile } = await supabase
      .from("community_profiles")
      .select("username, display_name, avatar_path, status")
      .eq("user_id", userId)
      .maybeSingle();

    if (profile && profile.status === "active") {
      community = {
        hasProfile: true,
        username: profile.username,
        displayName: profile.display_name,
        avatarPath: profile.avatar_path,
      };
    }
  } catch {
    // Fail-safe: Community error never blocks account dashboard
  }

  // 2. Enrollments
  let enrollmentRows: Array<{
    id: string;
    course_id: string;
    source: "manual" | "purchase";
    status: "active" | "pending" | "cancelled" | "expired" | "refunded";
    expires_at: string | null;
    created_at: string;
  }> = [];

  try {
    const { data } = await supabase
      .from("course_enrollments")
      .select("id, course_id, source, status, expires_at, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (data) enrollmentRows = data as typeof enrollmentRows;
  } catch {
    // Fail-safe
  }

  // 3. Confirmed Session Seats
  let seatRows: Array<{
    id: string;
    session_id: string;
    course_id: string;
    status: "confirmed";
    source: string;
    created_at: string;
    confirmed_at: string | null;
  }> = [];

  try {
    const { data } = await supabase
      .from("course_session_seats")
      .select("id, session_id, course_id, status, source, created_at, confirmed_at")
      .eq("user_id", userId)
      .eq("status", "confirmed")
      .order("created_at", { ascending: false });
    if (data) seatRows = data as typeof seatRows;
  } catch {
    // Fail-safe
  }

  // 4. Payments (safe fields only)
  let paymentRows: Array<{
    id: string;
    course_id: string;
    provider: string;
    status: string;
    total_amount: number;
    currency: string;
    created_at: string;
    paid_at: string | null;
  }> = [];

  try {
    const { data } = await supabase
      .from("course_payments")
      .select("id, course_id, provider, status, total_amount, currency, created_at, paid_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (data) paymentRows = data as typeof paymentRows;
  } catch {
    // Fail-safe
  }

  // 5. Bulk load courses referenced in enrollments, seats, or payments
  const allCourseIds = Array.from(
    new Set([
      ...enrollmentRows.map((e) => e.course_id),
      ...seatRows.map((s) => s.course_id),
      ...paymentRows.map((p) => p.course_id),
    ]),
  );

  const courseMap = new Map<string, CourseRow>();
  if (allCourseIds.length > 0) {
    try {
      const { data: courses } = await supabase
        .from("courses")
        .select("id, slug, name, category, image_path, image_alt, publish_status")
        .in("id", allCourseIds);
      if (courses) {
        for (const c of courses as CourseRow[]) {
          courseMap.set(c.id, c);
        }
      }
    } catch {
      // Fail-safe
    }
  }

  // 6. Bulk load sessions referenced in seats
  const allSessionIds = Array.from(new Set(seatRows.map((s) => s.session_id)));
  const sessionMap = new Map<string, SessionRow>();
  if (allSessionIds.length > 0) {
    try {
      const { data: sessions } = await supabase
        .from("course_sessions")
        .select("id, course_id, batch_name, start_date, start_time, location, city")
        .in("id", allSessionIds);
      if (sessions) {
        for (const s of sessions as SessionRow[]) {
          sessionMap.set(s.id, s);
        }
      }
    } catch {
      // Fail-safe
    }
  }

  // 7. Shape Online Courses
  const onlineCourses: EnrolledOnlineCourse[] = [];
  for (const enrollment of enrollmentRows) {
    const course = courseMap.get(enrollment.course_id);
    if (!course) continue;

    // Filter to online category
    if (course.category === "online") {
      let firstLessonHref: string | null = null;
      try {
        const { modules } = await loadCourseContent(course.id, { publishedOnly: true });
        const firstLesson = modules.flatMap((m) => m.lessons)[0];
        if (firstLesson) {
          firstLessonHref = `/learn/${course.slug}/${firstLesson.id}`;
        }
      } catch {
        // Fallback gracefully
      }

      onlineCourses.push({
        enrollmentId: enrollment.id,
        courseId: course.id,
        courseSlug: course.slug,
        courseName: course.name,
        category: course.category,
        imagePath: course.image_path,
        imageAlt: course.image_alt,
        status: enrollment.status,
        expiresAt: enrollment.expires_at,
        enrolledAt: enrollment.created_at,
        firstLessonHref,
      });
    }
  }

  // 8. Shape Physical Sessions
  const physicalSessions: ConfirmedSessionSeat[] = [];
  for (const seat of seatRows) {
    const course = courseMap.get(seat.course_id);
    const session = sessionMap.get(seat.session_id);
    if (!course || !session) continue;

    const isUpcoming = session.start_date >= today;

    physicalSessions.push({
      seatId: seat.id,
      sessionId: session.id,
      courseId: course.id,
      courseSlug: course.slug,
      courseName: course.name,
      category: course.category,
      batchName: session.batch_name,
      startDate: session.start_date,
      startTime: session.start_time,
      location: session.location,
      city: session.city,
      status: seat.status,
      confirmedAt: seat.confirmed_at,
      isUpcoming,
    });
  }

  // Sort physical sessions by start_date ascending for upcoming, descending for past
  physicalSessions.sort((a, b) => a.startDate.localeCompare(b.startDate));

  const upcomingCandidates = physicalSessions.filter((s) => s.isUpcoming);
  const nearestUpcomingSession = upcomingCandidates[0] ?? null;

  // 9. Shape Payments (safe fields only)
  const recentPayments: AccountPaymentHistoryItem[] = paymentRows.map((payment) => {
    const course = courseMap.get(payment.course_id);
    return {
      paymentId: payment.id,
      courseId: payment.course_id,
      courseName: course?.name ?? "دورة تدريبية",
      provider: payment.provider,
      totalAmount: payment.total_amount,
      currency: payment.currency,
      status: payment.status,
      paidAt: payment.paid_at,
      createdAt: payment.created_at,
    };
  });

  const hasAnyActivity =
    onlineCourses.length > 0 || physicalSessions.length > 0 || recentPayments.length > 0;

  return {
    user: {
      id: userId,
      email,
    },
    community,
    onlineCourses,
    physicalSessions,
    nearestUpcomingSession,
    recentPayments,
    hasAnyActivity,
  };
}
