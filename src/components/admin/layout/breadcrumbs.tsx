"use client";

/**
 * Breadcrumbs — عمود تنقل مشتق من المسار الحالي
 * يترجم المقاطع المعروفة من SEGMENT_LABELS، ويحلّل معرّفات الكيانات
 * (دورة/مدرب/مسار/مقال/طلب) إلى اسمها من مخزن الـ Mock.
 *
 * ملاحظة قواعد Hooks: يُستدعى useAdminData مرة واحدة في الأعلى فقط،
 * وحلّ التسميات دالة نقية خالية من الـ hooks.
 */
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Fragment } from "react";
import { ChevronLeft, Home as HomeIcon } from "lucide-react";

import { useAdminData } from "@/context/admin-store";
import type { AdminData } from "@/data/admin/types";
import { SEGMENT_LABELS } from "./nav-config";

/** مقاطع الأب التي تأتي قبلها معرّفات كيانات */
const ENTITY_PARENTS: Record<string, "course" | "trainer" | "path" | "post" | "request"> = {
  courses: "course",
  trainers: "trainer",
  paths: "path",
  blog: "post",
  "corporate-requests": "request",
};

interface Crumb {
  href: string;
  segment: string;
  parentKey?: (typeof ENTITY_PARENTS)[keyof typeof ENTITY_PARENTS];
}

/** دالة نقية: تسمية المقطع من البيانات — بلا hooks */
function resolveSegmentLabel(data: AdminData, crumb: Crumb): string {
  /* صفحات الإضافة: "new" تسبقها وحدة الكيان وليست معرفًا */
  if (crumb.segment === "new" && crumb.parentKey) {
    const NEW_LABELS = {
      course: "دورة جديدة",
      trainer: "مدرب جديد",
      path: "مسار جديد",
      post: "مقال جديد",
      request: "طلب جديد",
    } as const;
    return NEW_LABELS[crumb.parentKey];
  }
  switch (crumb.parentKey) {
    case "course":
      return data.courses.find((course) => course.id === crumb.segment)?.name ?? "تفاصيل الدورة";
    case "trainer":
      return data.trainers.find((trainer) => trainer.id === crumb.segment)?.name ?? "تفاصيل المدرب";
    case "path":
      return data.paths.find((path) => path.id === crumb.segment)?.name ?? "تفاصيل المسار";
    case "post":
      return data.posts.find((post) => post.id === crumb.segment)?.title ?? "تفاصيل المقال";
    case "request":
      return data.requests.find((request) => request.id === crumb.segment)?.company ?? "تفاصيل الطلب";
    default:
      return SEGMENT_LABELS[crumb.segment] ?? crumb.segment;
  }
}

export function Breadcrumbs() {
  const pathname = usePathname();
  const data = useAdminData();

  const segments = (pathname ?? "").split("/").filter(Boolean);
  const crumbs: Crumb[] = segments.map((segment, index) => ({
    href: `/${segments.slice(0, index + 1).join("/")}`,
    segment,
    parentKey: index > 0 ? ENTITY_PARENTS[segments[index - 1]] : undefined,
  }));

  return (
    <nav aria-label="مسار التنقل" className="min-w-0">
      <ol className="flex items-center gap-1 text-xs text-muted-foreground">
        <li className="flex shrink-0">
          <Link
            href="/admin"
            className="flex items-center gap-1 rounded-md px-1 py-0.5 hover:text-charcoal-800"
          >
            <HomeIcon aria-hidden="true" className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">لوحة التحكم</span>
          </Link>
        </li>
        {crumbs.map((crumb, index) => {
          /* المقطع الأول "/admin" مغطى برابط الرئيسية */
          if (index === 0 && crumb.segment === "admin") return null;
          const isLast = index === crumbs.length - 1;
          const label = resolveSegmentLabel(data, crumb);
          return (
            <Fragment key={crumb.href}>
              <li aria-hidden="true" className="shrink-0">
                <ChevronLeft className="h-3.5 w-3.5" />
              </li>
              <li className={isLast ? "min-w-0" : "shrink-0"}>
                {isLast ? (
                  <span
                    aria-current="page"
                    className="block truncate font-medium text-charcoal-800"
                  >
                    {label}
                  </span>
                ) : (
                  <Link
                    href={crumb.href}
                    className="rounded-md px-1 py-0.5 hover:text-charcoal-800"
                  >
                    {label}
                  </Link>
                )}
              </li>
            </Fragment>
          );
        })}
      </ol>
    </nav>
  );
}
