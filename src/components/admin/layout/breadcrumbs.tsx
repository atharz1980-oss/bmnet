"use client";

/**
 * Breadcrumbs — عمود تنقّل مشتق من المسار الحالي
 * ---------------------------------------------------------------
 * يترجم المقاطع المعروفة من SEGMENT_LABELS، ويحلّل معرّفات الكيانات
 * (دورة/مدرب/مسار/مقال/طلب) إلى اسمها من مخزن الـ Mock.
 *
 * النمط: تسمية علوية (حروف صغيرة متباعدة) كما في ترويسة الملف،
 * والفاصل «/» بين المقاطع.
 *
 * ملاحظة قواعد Hooks: يُستدعى useAdminData مرة واحدة في الأعلى فقط،
 * وحلّ التسميات دالة نقية خالية من الـ hooks.
 */
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Fragment } from "react";
import { ChevronLeft } from "lucide-react";

import { useAdminData } from "@/context/admin-store";
import type { AdminData } from "@/data/admin/types";
import { cn } from "@/lib/utils";
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
  /* صفحات الإضافة: "new" تسبقها وحدة الكيان وليست معرّفًا */
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
      <ol className="brand-eyebrow flex items-center gap-2 text-charcoal-400">
        <li className="flex shrink-0 items-center gap-2">
          <Link
            href="/admin"
            className="transition-colors hover:text-[#111111]"
          >
            لوحة التحكم
          </Link>
        </li>
        {crumbs.map((crumb, index) => {
          /* المقطع الأول "/admin" مغطى برابط الرئيسية */
          if (index === 0 && crumb.segment === "admin") return null;
          const isLast = index === crumbs.length - 1;
          const label = resolveSegmentLabel(data, crumb);
          return (
            <Fragment key={crumb.href}>
              <li aria-hidden="true" className="shrink-0 text-charcoal-300">
                <ChevronLeft className="h-3 w-3" strokeWidth={1.5} />
              </li>
              <li className={cn("min-w-0", isLast && "truncate")}>
                {isLast ? (
                  <span aria-current="page" className="block truncate text-[#111111]">
                    {label}
                  </span>
                ) : (
                  <Link href={crumb.href} className="transition-colors hover:text-[#111111]">
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
