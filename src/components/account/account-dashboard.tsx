import Link from "next/link";
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Clock,
  Compass,
  CreditCard,
  GraduationCap,
  LogOut,
  MapPin,
  Sparkles,
  User,
  Video,
} from "lucide-react";

import { Container } from "@/components/shared/container";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { communityLogoutAction } from "@/app/community/actions/auth";
import { resolveMediaUrl } from "@/lib/cms/mappers";
import { formatHalalas } from "@/lib/payments/money";
import type { AccountDashboardData, ConfirmedSessionSeat, EnrolledOnlineCourse } from "@/lib/account/types";

function formatArabicDate(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    return new Intl.DateTimeFormat("ar-SA", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }).format(date);
  } catch {
    return dateStr;
  }
}

function formatArabicDateTime(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    return new Intl.DateTimeFormat("ar-SA", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  } catch {
    return dateStr;
  }
}

function enrollmentStatusBadge(status: EnrolledOnlineCourse["status"]) {
  switch (status) {
    case "active":
      return <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-50">نشطة</Badge>;
    case "pending":
      return <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">قيد التأكيد</Badge>;
    case "expired":
      return <Badge variant="outline" className="bg-charcoal-100 text-charcoal-600">منتهية</Badge>;
    case "cancelled":
      return <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-200">ملغاة</Badge>;
    case "refunded":
      return <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-200">مستردة</Badge>;
    default:
      return null;
  }
}

function paymentStatusBadge(status: string) {
  switch (status) {
    case "paid":
      return <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-50">مكتمل</Badge>;
    case "refunded":
      return <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-200">مسترد</Badge>;
    case "pending":
      return <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">معلّق</Badge>;
    case "cancelled":
      return <Badge variant="outline" className="bg-charcoal-100 text-charcoal-600">ملغى</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

export function AccountDashboard({ data }: { data: AccountDashboardData }) {
  const { user, community, onlineCourses, physicalSessions, nearestUpcomingSession, recentPayments, hasAnyActivity } =
    data;

  return (
    <div className="min-h-screen bg-surface pb-20 pt-8 sm:pt-12">
      <Container className="space-y-8">
        {/* Header Section */}
        <header className="rounded-2xl border border-charcoal-200/80 bg-white p-6 shadow-xs sm:p-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-brand-700">مركز الحساب</span>
              <h1 className="text-2xl font-bold text-charcoal-900 sm:text-3xl">حسابي</h1>
              <p className="text-sm text-charcoal-500">
                {user.email ? (
                  <span className="num-ltr inline-block font-mono text-charcoal-700">{user.email}</span>
                ) : (
                  "مرحباً بك في بيت المصور"
                )}
              </p>
            </div>
            <div className="flex items-center gap-3">
              {community.hasProfile ? (
                <Button asChild variant="outline" size="sm" className="gap-1.5">
                  <Link href="/community/profile">
                    <User className="h-4 w-4" aria-hidden="true" />
                    <span>ملفي في المجتمع</span>
                  </Link>
                </Button>
              ) : null}
              <form action={communityLogoutAction}>
                <Button variant="ghost" size="sm" type="submit" className="gap-1.5 text-charcoal-500 hover:text-rose-600">
                  <LogOut className="h-4 w-4" aria-hidden="true" />
                  <span>تسجيل الخروج</span>
                </Button>
              </form>
            </div>
          </div>
        </header>

        {/* Nearest Upcoming Physical Session Highlight */}
        {nearestUpcomingSession ? (
          <section
            aria-labelledby="upcoming-session-title"
            className="rounded-2xl border border-brand-200 bg-brand-50/50 p-6 shadow-xs sm:p-7"
          >
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-800">
                    <Calendar className="h-4 w-4 text-brand-600" aria-hidden="true" />
                    الموعد التدريبي القادم
                  </span>
                  <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 hover:bg-emerald-100">
                    <CheckCircle2 className="h-3 w-3 me-1" aria-hidden="true" />
                    الحجز مؤكد
                  </Badge>
                </div>
                <h2 id="upcoming-session-title" className="text-xl font-bold text-charcoal-900 sm:text-2xl">
                  {nearestUpcomingSession.courseName}
                </h2>
                <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-sm text-charcoal-600">
                  <span className="font-medium text-charcoal-800">{nearestUpcomingSession.batchName}</span>
                  <span className="text-charcoal-300">•</span>
                  <span>{formatArabicDate(nearestUpcomingSession.startDate)}</span>
                  {nearestUpcomingSession.startTime ? (
                    <>
                      <span className="text-charcoal-300">•</span>
                      <span className="num-ltr">{nearestUpcomingSession.startTime}</span>
                    </>
                  ) : null}
                  {nearestUpcomingSession.location ? (
                    <>
                      <span className="text-charcoal-300">•</span>
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5 text-charcoal-400" aria-hidden="true" />
                        {nearestUpcomingSession.location}
                      </span>
                    </>
                  ) : null}
                </div>
              </div>
              <div>
                <Button asChild size="default" className="w-full sm:w-auto">
                  <Link href={`/courses/${nearestUpcomingSession.courseSlug}`}>
                    تفاصيل الدورة
                    <ArrowLeft className="h-4 w-4 ms-1.5" aria-hidden="true" />
                  </Link>
                </Button>
              </div>
            </div>
          </section>
        ) : null}

        {/* Global Empty State (User with no courses, sessions, or payments) */}
        {!hasAnyActivity ? (
          <section className="rounded-2xl border border-dashed border-charcoal-300 bg-white p-8 text-center sm:p-14">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
              <Compass className="h-7 w-7" aria-hidden="true" />
            </div>
            <h2 className="mt-4 text-xl font-bold text-charcoal-900 sm:text-2xl">مرحباً بك في بيت المصور</h2>
            <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-charcoal-500">
              لم تسجل في أي دورة تدريبية بعد. استكشف دوراتنا وورش العمل المتاحة وابدأ مسارك التعليمي.
            </p>
            <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
              <Button asChild size="lg" className="gap-2">
                <Link href="/courses">
                  <GraduationCap className="h-5 w-5" aria-hidden="true" />
                  استكشف الدورات
                </Link>
              </Button>
              {!community.hasProfile ? (
                <Button asChild variant="outline" size="lg" className="gap-2">
                  <Link href="/community/profile">
                    <Sparkles className="h-5 w-5 text-brand-600" aria-hidden="true" />
                    انضم إلى مجتمع المصورين
                  </Link>
                </Button>
              ) : null}
            </div>
          </section>
        ) : null}

        {/* My Online Courses */}
        {onlineCourses.length > 0 ? (
          <section aria-labelledby="my-online-courses-title" className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 id="my-online-courses-title" className="flex items-center gap-2 text-xl font-bold text-charcoal-900">
                <Video className="h-5 w-5 text-brand-600" aria-hidden="true" />
                دوراتي الأونلاين ({onlineCourses.length})
              </h2>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {onlineCourses.map((course) => (
                <article
                  key={course.enrollmentId}
                  className="flex flex-col justify-between overflow-hidden rounded-2xl border border-charcoal-200 bg-white p-5 shadow-xs transition-shadow hover:shadow-md"
                >
                  <div className="space-y-3">
                    {course.imagePath ? (
                      <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-charcoal-100">
                        <img
                          src={resolveMediaUrl(course.imagePath)}
                          alt={course.imageAlt ?? course.courseName}
                          className="h-full w-full object-cover"
                          loading="lazy"
                        />
                      </div>
                    ) : null}
                    <div className="flex items-center justify-between gap-2">
                      {enrollmentStatusBadge(course.status)}
                      <span className="text-xs text-charcoal-400">
                        {course.expiresAt ? `ينتهي: ${formatArabicDate(course.expiresAt)}` : "وصول دائم"}
                      </span>
                    </div>
                    <h3 className="text-base font-bold text-charcoal-900 line-clamp-2">{course.courseName}</h3>
                  </div>

                  <div className="mt-5 border-t border-charcoal-100 pt-4">
                    {course.firstLessonHref ? (
                      <Button asChild className="w-full justify-between">
                        <Link href={course.firstLessonHref}>
                          <span>ابدأ التعلم</span>
                          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                        </Link>
                      </Button>
                    ) : (
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs text-charcoal-400">المحتوى قيد التجهيز</span>
                        <Button asChild variant="outline" size="sm">
                          <Link href={`/courses/${course.courseSlug}`}>صفحة الدورة</Link>
                        </Button>
                      </div>
                    )}
                  </div>
                </article>
              ))}
            </div>
          </section>
        ) : null}

        {/* In-Person Workshops & Sessions */}
        {physicalSessions.length > 0 ? (
          <section aria-labelledby="my-sessions-title" className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 id="my-sessions-title" className="flex items-center gap-2 text-xl font-bold text-charcoal-900">
                <Calendar className="h-5 w-5 text-brand-600" aria-hidden="true" />
                الورش الحضورية والمقاعد ({physicalSessions.length})
              </h2>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {physicalSessions.map((session: ConfirmedSessionSeat) => (
                <article
                  key={session.seatId}
                  className="flex flex-col justify-between rounded-2xl border border-charcoal-200 bg-white p-5 shadow-xs"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="rounded-md bg-brand-50 px-2 py-0.5 text-xs font-semibold text-brand-700">
                        {session.batchName}
                      </span>
                      <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-50">
                        <CheckCircle2 className="h-3 w-3 me-1" aria-hidden="true" />
                        الحجز مؤكد
                      </Badge>
                    </div>

                    <h3 className="text-lg font-bold text-charcoal-900">{session.courseName}</h3>

                    <div className="space-y-1.5 text-sm text-charcoal-600">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-charcoal-400 shrink-0" aria-hidden="true" />
                        <span>{formatArabicDate(session.startDate)}</span>
                        {session.startTime ? (
                          <>
                            <span className="text-charcoal-300">•</span>
                            <span className="num-ltr">{session.startTime}</span>
                          </>
                        ) : null}
                      </div>

                      {session.location ? (
                        <div className="flex items-start gap-2">
                          <MapPin className="h-4 w-4 text-charcoal-400 shrink-0 mt-0.5" aria-hidden="true" />
                          <span>{session.location}</span>
                        </div>
                      ) : null}
                    </div>
                  </div>

                  <div className="mt-5 border-t border-charcoal-100 pt-4">
                    <Button asChild variant="outline" className="w-full">
                      <Link href={`/courses/${session.courseSlug}`}>صفحة الورشة والتفاصيل</Link>
                    </Button>
                  </div>
                </article>
              ))}
            </div>
          </section>
        ) : null}

        {/* Payments / Purchase History */}
        {recentPayments.length > 0 ? (
          <section aria-labelledby="payments-history-title" className="space-y-4">
            <h2 id="payments-history-title" className="flex items-center gap-2 text-xl font-bold text-charcoal-900">
              <CreditCard className="h-5 w-5 text-brand-600" aria-hidden="true" />
              سجل المدفوعات والفواتير
            </h2>

            <div className="overflow-hidden rounded-2xl border border-charcoal-200 bg-white shadow-xs">
              <div className="divide-y divide-charcoal-100">
                {recentPayments.map((payment) => (
                  <div
                    key={payment.paymentId}
                    className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-charcoal-900">{payment.courseName}</span>
                        {paymentStatusBadge(payment.status)}
                      </div>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-charcoal-500">
                        <span>{payment.paidAt ? formatArabicDateTime(payment.paidAt) : formatArabicDateTime(payment.createdAt)}</span>
                        <span className="text-charcoal-300">•</span>
                        <span>شامل ضريبة القيمة المضافة</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-4">
                      <div className="text-start sm:text-end">
                        <span className="num-ltr block text-base font-bold text-charcoal-900">
                          {formatHalalas(payment.totalAmount)} {payment.currency === "SAR" ? "ر.س" : payment.currency}
                        </span>
                        <span className="text-[11px] text-charcoal-400">بواسطة {payment.provider === "moyasar" ? "ميسر" : payment.provider}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        ) : null}

        {/* Optional Community Connection Banner */}
        <section aria-labelledby="community-cta-title" className="rounded-2xl border border-charcoal-200 bg-white p-6 shadow-xs sm:p-7">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <h2 id="community-cta-title" className="text-lg font-bold text-charcoal-900">
                {community.hasProfile ? "ملفك في مجتمع المصورين" : "مجتمع بيت المصور"}
              </h2>
              <p className="text-sm text-charcoal-500">
                {community.hasProfile
                  ? `أنت عضو مسجل باسم @${community.username}. يمكنك تحديث ملفك وعرض أعمالك.`
                  : "انضم إلى شبكة المصورين وشارك أعمالك وتواصل مع المبدعين. العضوية مجانية ومفتوحة."}
              </p>
            </div>
            <div>
              <Button asChild variant="outline">
                <Link href="/community/profile">
                  {community.hasProfile ? (
                    <>
                      <User className="h-4 w-4 me-1.5" aria-hidden="true" />
                      إدارة ملفي في المجتمع
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 me-1.5 text-brand-600" aria-hidden="true" />
                      انضم إلى مجتمع المصورين
                    </>
                  )}
                </Link>
              </Button>
            </div>
          </div>
        </section>
      </Container>
    </div>
  );
}
