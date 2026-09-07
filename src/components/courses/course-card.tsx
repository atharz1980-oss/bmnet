import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, CalendarDays, Clock3, MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getCategoryName } from "@/data/categories";
import { formatPrice, formatShortDate } from "@/lib/format";
import type { Course } from "@/types";
import { cn } from "@/lib/utils";

const levelLabels: Record<string, string> = {
  beginner: "مبتدئ",
  intermediate: "متوسط",
  advanced: "متقدم",
  "all-levels": "جميع المستويات",
};

interface CourseCardProps {
  course: Course;
  className?: string;
  priority?: boolean;
}

/** كارت دورة قابل لإعادة الاستخدام — يعرض الصورة، النوع، المدة، المكان، السعر، وأقرب موعد */
export function CourseCard({ course, className, priority = false }: CourseCardProps) {
  const nextSession = course.upcomingSessions[0];

  return (
    <article
      className={cn(
        "group relative flex h-full flex-col overflow-hidden rounded-xl border border-charcoal-200/80 bg-white transition-all duration-300 hover:-translate-y-1 hover:border-charcoal-300 hover:shadow-lg hover:shadow-charcoal-900/5",
        className
      )}
    >
      {/* صورة الدورة */}
      <div className="relative aspect-[16/10] overflow-hidden bg-charcoal-100">
        <Image
          src={course.image}
          alt={course.imageAlt}
          fill
          priority={priority}
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
        />
        <Badge className="absolute end-3 top-3 border-0 bg-charcoal-950/80 text-xs text-white backdrop-blur">
          {getCategoryName(course.category)}
        </Badge>
      </div>

      {/* المحتوى */}
      <div className="flex flex-1 flex-col p-5">
        <p className="text-xs font-medium text-brand-600">{levelLabels[course.level]}</p>
        <h3 className="mt-1.5 text-lg font-bold leading-snug text-charcoal-900">
          <Link
            href={`/courses/${course.slug}`}
            className="transition-colors after:absolute after:inset-0 hover:text-brand-700"
          >
            {course.name}
          </Link>
        </h3>
        <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-charcoal-500">
          {course.shortDescription}
        </p>

        {/* بيانات الدورة */}
        <ul className="mt-4 space-y-2 text-[13px] text-charcoal-500">
          <li className="flex items-center gap-2">
            <Clock3 aria-hidden="true" className="h-4 w-4 shrink-0 text-brand-500" />
            <span>
              {course.durationDays} أيام · {course.totalHours} ساعة تدريبية
            </span>
          </li>
          <li className="flex items-center gap-2">
            <MapPin aria-hidden="true" className="h-4 w-4 shrink-0 text-brand-500" />
            <span className="line-clamp-1">{course.location}</span>
          </li>
          {nextSession ? (
            <li className="flex items-center gap-2">
              <CalendarDays aria-hidden="true" className="h-4 w-4 shrink-0 text-brand-500" />
              <span>
                أقرب موعد: {formatShortDate(nextSession.startDate)}
                {nextSession.seatsLeft > 0 && nextSession.seatsLeft <= 5 ? (
                  <span className="ms-1.5 font-semibold text-brand-600">
                    (متبقي {nextSession.seatsLeft} مقاعد)
                  </span>
                ) : null}
              </span>
            </li>
          ) : (
            <li className="flex items-center gap-2">
              <CalendarDays aria-hidden="true" className="h-4 w-4 shrink-0 text-brand-500" />
              <span>تُحدد المواعيد بعد التواصل</span>
            </li>
          )}
        </ul>

        {/* السعر + الرابط */}
        <div className="mt-5 flex items-center justify-between border-t border-charcoal-100 pt-4">
          <p className="text-lg font-bold text-charcoal-900">
            <span className="sr-only">السعر: </span>
            {formatPrice(course.price)}
          </p>
          <Button asChild variant="ghost" size="sm" className="relative z-10 gap-1 text-brand-600 hover:bg-brand-50 hover:text-brand-700">
            <Link href={`/courses/${course.slug}`}>
              تفاصيل الدورة
              <ArrowLeft aria-hidden="true" className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
            </Link>
          </Button>
        </div>
      </div>
    </article>
  );
}
