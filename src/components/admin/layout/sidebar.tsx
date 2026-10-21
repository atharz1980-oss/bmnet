"use client";

/**
 * Sidebar — قائمة لوحة التحكم الجانبية بهوية «البيت الأسود»
 * ----------------------------------------------------------------
 * أرضية الحبر (#111111): كأنها غرفة عرض داكنة تُطِلّ على ورق العمل.
 * البنية تتبع لوحة «STUDIO RULES» في الملف: عمود ترقيم + عمود نص،
 * مفصولان بخطوط شعرية، والنشط يُعلَّم بنقطة برتقالية وشريط رفيع.
 *
 * ثلاثة أوضاع (قرار D-07 + design.md §7):
 *   - Desktop (lg+) : عرض كامل 264px مع التسميات
 *   - Tablet (md)   : شريط أيقونات مضغوط (تسميات مخفية)
 *   - Mobile        : Drawer عبر Sheet (يُستدعى من Topbar)
 */
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

import { useAdminData } from "@/context/admin-store";
import { BaytMark } from "@/components/brand/bayt-mark";
import { NAV_GROUPS } from "./nav-config";

interface SidebarProps {
  /** داخل Drawer الموبايل — تسميات دائمًا ظاهرة */
  variant?: "rail" | "drawer";
  /** إغلاق الـ Drawer بعد النقر على رابط */
  onNavigate?: () => void;
}

export function Sidebar({ variant = "rail", onNavigate }: SidebarProps) {
  const pathname = usePathname() ?? "";
  const data = useAdminData();
  /* العداد يستثني المؤرشف — الطلب المؤرشف لم يعد «جديدًا بانتظار التواصل» */
  const newRequestsCount = data.requests.filter(
    (request) => !request.archivedAt && request.status === "new",
  ).length;

  function isActive(item: { href: string; matchPrefix?: boolean; external?: boolean }): boolean {
    /* الروابط الخارجية (عرض الموقع) لا تأخذ حالة نشط */
    if (item.external) return false;
    if (item.href === "/admin") return pathname === "/admin";
    if (item.matchPrefix) return pathname.startsWith(item.href);
    return pathname.startsWith(item.href);
  }

  return (
    <div className="flex h-full flex-col bg-[#111111] text-[#F3F1EC]">
      {/* ── الهوية ── */}
      <div
        className={cn(
          "flex items-center gap-3 border-b border-white/12 px-4 py-5",
          variant === "rail" && "lg:px-6",
        )}
      >
        <BaytMark size={variant === "rail" ? 26 : 24} className="text-[#F3F1EC]" />
        <span className={cn("min-w-0", variant === "rail" && "hidden lg:block")}>
          <span
            dir="ltr"
            className="brand-micro block truncate whitespace-nowrap text-[#F3F1EC]"
            style={{ letterSpacing: "0.14em" }}
          >
            BAYT AL MOSAWER
          </span>
          <span className="mt-1 block text-[11px] font-medium text-white/45">لوحة التحكم</span>
        </span>
      </div>

      {/* ── المجموعات ── */}
      <nav
        aria-label="قائمة لوحة التحكم"
        className="flex-1 overflow-y-auto px-3 py-5 scrollbar-thin lg:px-4"
      >
        {NAV_GROUPS.map((group, groupIndex) => (
          <div key={group.label} className="mb-6 last:mb-0">
            <p
              className={cn(
                "brand-eyebrow mb-3 flex items-center gap-2 border-t border-white/12 pt-4 text-white/40",
                variant === "rail" && "hidden lg:flex",
              )}
            >
              <span className="num-ltr text-white/30" dir="ltr">
                {String(groupIndex + 1).padStart(2, "0")}
              </span>
              <span aria-hidden="true" className="h-px w-3 bg-white/20" />
              <span>{group.label}</span>
            </p>

            <ul className="space-y-0.5" aria-label={group.label}>
              {group.items.map((item) => {
                const active = isActive(item);
                const Icon = item.icon;
                const badgeCount =
                  item.badge === "new-requests" && newRequestsCount > 0 ? newRequestsCount : null;

                const linkClass = cn(
                  "group relative flex min-h-11 items-center gap-3 px-3 py-2 text-sm font-medium transition-colors lg:min-h-0",
                  active ? "text-white" : "text-white/55 hover:text-white/90",
                  variant === "rail" && "lg:px-2",
                );

                const inner = (
                  <>
                    {/* نقطة الحالة — في بداية السطر (يمين في RTL) */}
                    <span
                      aria-hidden="true"
                      className={cn(
                        "h-1.5 w-1.5 shrink-0 transition-colors",
                        active ? "bg-brand-600" : "bg-transparent group-hover:bg-white/25",
                      )}
                    />
                    <Icon
                      aria-hidden="true"
                      className={cn(
                        "h-4 w-4 shrink-0 transition-colors",
                        active ? "text-brand-600" : "text-white/45 group-hover:text-white/80",
                      )}
                      strokeWidth={1.5}
                    />
                    <span
                      className={cn(
                        "min-w-0 flex-1 truncate",
                        variant === "rail" && "hidden lg:block",
                      )}
                    >
                      {item.label}
                    </span>
                    {badgeCount ? (
                      <span
                        className={cn(
                          "brand-micro num-ltr shrink-0 text-brand-600",
                          variant === "rail" && "hidden lg:block",
                        )}
                        dir="ltr"
                      >
                        {String(badgeCount).padStart(2, "0")}
                      </span>
                    ) : null}
                    {/* شريط التحديد على حافة البداية */}
                    {active ? (
                      <span
                        aria-hidden="true"
                        className="absolute inset-y-1 start-0 w-0.5 bg-brand-600"
                      />
                    ) : null}
                  </>
                );

                return (
                  <li key={item.href}>
                    {item.external ? (
                      <a
                        href={item.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={linkClass}
                        aria-label={item.label}
                      >
                        {inner}
                      </a>
                    ) : (
                      <Link
                        href={item.href}
                        className={linkClass}
                        aria-current={active ? "page" : undefined}
                        aria-label={
                          badgeCount ? `${item.label} — ${badgeCount} جديد` : item.label
                        }
                        onClick={onNavigate}
                        title={variant === "rail" ? item.label : undefined}
                      >
                        {inner}
                      </Link>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* ── تذييل الشريط ── */}
      <div
        className={cn(
          "border-t border-white/12 px-4 py-4",
          variant === "rail" && "hidden lg:block",
        )}
      >
        <p
          dir="ltr"
          className="brand-micro text-white/35"
          style={{ letterSpacing: "0.2em" }}
        >
          MAKE ROOM TO CREATE
        </p>
        <p className="mt-2 text-[11px] leading-relaxed text-white/40">
          متصل بقاعدة البيانات — Supabase
        </p>
      </div>
    </div>
  );
}
