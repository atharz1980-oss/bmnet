import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { CalendarDays, CircleCheck, MapPin } from "lucide-react";

import { Container } from "@/components/shared/container";
import { Button } from "@/components/ui/button";
import { WhatsAppIcon } from "@/components/shared/social-icons";
import { communityLoginHref } from "@/lib/community/auth-links";
import { getCommunityViewerId } from "@/lib/community/member";
import { getServiceSupabase } from "@/lib/supabase/service";
import { loadPublicView } from "@/lib/cms/public-loader";
import { siteConfig } from "@/data/site";
import { formatDateWithWeekday } from "@/lib/format";
import { registrationDestination } from "@/lib/payments/purchase";

/**
 * تأكيد التسجيل — للدورات التي لا محتوى رقمي لها.
 *
 * ورشة في استوديو ليس لها «أول درس»، وإرسال المتدرب إلى مشغّل فارغ بعد
 * تسجيل ناجح عطل لا ترحيب. هنا يرى أن تسجيله تم، ومواعيد الدفعات كما
 * أدخلتها الإدارة، وطريق التواصل لتأكيد موعده.
 *
 * الصفحة تخص صاحبها: تُقرأ حالة تسجيله من الخادم، ومن لا تسجيل له يُعاد
 * إلى صفحة الدورة. لا تكشف شيئًا لمن ليس مسجّلًا.
 *
 * ولا مقاعد تُحجز هنا ولا عدّاد يُزاد: القاعدة اليوم لا تربط تسجيلًا بدفعة،
 * واختراع حجز مقعد بلا بنية تحته يعطي وعدًا لا يسنده شيء.
 */
export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "تم تسجيلك",
  robots: { index: false, follow: false },
};

export default async function RegisteredPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const svc = getServiceSupabase();
  const { data: course } = await svc
    .from("courses")
    .select("id, slug, name, category, publish_status")
    .eq("slug", slug)
    .maybeSingle();
  if (!course || course.publish_status !== "published") notFound();

  const viewerId = await getCommunityViewerId();
  if (!viewerId) redirect(communityLoginHref(`/courses/${slug}/registered`));

  const { data: enrollment } = await svc
    .from("course_enrollments")
    .select("status, source, granted_at")
    .eq("user_id", viewerId)
    .eq("course_id", course.id)
    .maybeSingle();
  /* غير مسجّل: لا صفحة تأكيد له — يعود إلى الدورة نفسها. */
  if (!enrollment || enrollment.status !== "active") redirect(`/courses/${slug}`);

  const destination = await registrationDestination(course.id, course.slug);
  const { data: sessions } = await svc
    .from("course_sessions")
    .select("id, batch_name, start_date, end_date, start_time, location, city, status")
    .eq("course_id", course.id)
    .in("status", ["upcoming", "open"])
    .order("start_date", { ascending: true })
    .limit(3);

  const view = await loadPublicView();
  const whatsappHref = view?.settings.whatsappHref ?? siteConfig.whatsappLink;

  return (
    <Container className="py-16">
      <div className="mx-auto max-w-lg rounded-2xl border border-charcoal-200 bg-white p-6 text-center sm:p-8">
        <CircleCheck aria-hidden="true" className="mx-auto h-10 w-10 text-emerald-600" />
        <h1 className="mt-4 text-xl font-bold text-charcoal-900 sm:text-2xl">
          تم تسجيلك في الدورة بنجاح
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-charcoal-500">
          سجّلناك في «{course.name}».
          {destination.kind === "lesson"
            ? " يمكنك البدء الآن."
            : " سنتواصل معك لتأكيد موعد الدفعة وتفاصيل الحضور."}
        </p>

        {sessions && sessions.length > 0 ? (
          <div className="mt-5 space-y-2 rounded-xl border border-charcoal-100 bg-surface p-4 text-start">
            <p className="text-xs font-semibold text-charcoal-700">المواعيد المعلنة</p>
            <ul className="space-y-2">
              {sessions.map((session) => (
                <li key={session.id} className="text-sm text-charcoal-700">
                  <span className="flex items-center gap-1.5 font-medium text-charcoal-900">
                    <CalendarDays aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-brand-500" />
                    {formatDateWithWeekday(session.start_date)}
                    {session.batch_name ? ` — ${session.batch_name}` : ""}
                  </span>
                  {session.location || session.city ? (
                    <span className="mt-0.5 flex items-center gap-1.5 text-xs text-charcoal-500">
                      <MapPin aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
                      {[session.location, session.city].filter(Boolean).join(" — ")}
                    </span>
                  ) : null}
                </li>
              ))}
            </ul>
            <p className="pt-1 text-xs leading-relaxed text-charcoal-500">
              تأكيد موعدك يتم معنا مباشرة — المقاعد تُخصَّص بالتواصل.
            </p>
          </div>
        ) : null}

        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
          {destination.kind === "lesson" ? (
            <Button asChild>
              <Link href={destination.href}>ابدأ الدورة</Link>
            </Button>
          ) : null}
          <Button asChild variant={destination.kind === "lesson" ? "outline" : "default"} className="gap-2">
            <a href={whatsappHref} target="_blank" rel="noopener noreferrer">
              <WhatsAppIcon className="h-4 w-4" />
              تواصل معنا عبر واتساب
            </a>
          </Button>
          <Button asChild variant="outline">
            <Link href={`/courses/${slug}`}>صفحة الدورة</Link>
          </Button>
        </div>
      </div>
    </Container>
  );
}
