"use client";

/**
 * Sidebar — قائمة لوحة التحكم الجانبية
 * ثلاثة أوضاع (قرار D-07 + design.md §7):
 *   - Desktop (lg+) : عرض كامل 256px مع التسميات
 *   - Tablet (md)   : شريط أيقونات مضغوط (تسميات مخفية)
 *   - Mobile        : Drawer عبر Sheet (يُستدعى من Topbar)
 */
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Camera } from "lucide-react";
import { cn } from "@/lib/utils";

import { useAdminData } from "@/context/admin-store";
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
    <div className="flex h-full flex-col bg-white">
      {/* الهوية */}
      <div
        className={cn(
          "flex items-center gap-2.5 border-b border-border px-4 py-4",
          variant === "rail" && "lg:px-5",
        )}
      >
        <span
          aria-hidden="true"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-charcoal-950 text-white"
        >
          <Camera className="h-4.5 w-4.5" />
        </span>
        <span className={cn("min-w-0", variant === "rail" && "hidden lg:block")}>
          <span className="block truncate text-sm font-bold text-charcoal-900">بيت المصور</span>
          <span className="block text-[10px] font-medium uppercase tracking-[0.18em] text-charcoal-400 font-latin">
            Admin
          </span>
        </span>
      </div>

      {/* المجموعات */}
      <nav
        aria-label="قائمة لوحة التحكم"
        className="flex-1 space-y-5 overflow-y-auto px-3 py-4 scrollbar-thin"
      >
        {NAV_GROUPS.map((group) => (
          <div key={group.label}>
            <p
              className={cn(
                "mb-1.5 px-2 text-[10px] font-semibold uppercase tracking-wider text-charcoal-400",
                variant === "rail" && "hidden lg:block",
              )}
            >
              {group.label}
            </p>
            <ul className="space-y-0.5" aria-label={group.label}>
              {group.items.map((item) => {
                const active = isActive(item);
                const Icon = item.icon;
                const badgeCount =
                  item.badge === "new-requests" && newRequestsCount > 0 ? newRequestsCount : null;

                const linkClass = cn(
                  "relative flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-brand-50 text-brand-700"
                    : "text-charcoal-600 hover:bg-accent hover:text-charcoal-900",
                  variant === "rail" && "lg:px-2.5",
                );

                const inner = (
                  <>
                    <Icon aria-hidden="true" className="h-4.5 w-4.5 shrink-0" />
                    <span className={cn("min-w-0 flex-1 truncate", variant === "rail" && "hidden lg:block")}>
                      {item.label}
                    </span>
                    {badgeCount ? (
                      <span
                        className={cn(
                          "flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-bold text-white num-ltr",
                          variant === "rail" && "hidden lg:flex",
                        )}
                        style={{ backgroundColor: "var(--brand-600)" }}
                      >
                        {badgeCount}
                      </span>
                    ) : null}
                    {variant === "rail" && badgeCount ? (
                      <span
                        aria-hidden="true"
                        className="absolute end-2 top-1.5 hidden h-2 w-2 rounded-full lg:block"
                        style={{ backgroundColor: "var(--brand-600)" }}
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

      {/* تذييل الشريط */}
      <div
        className={cn(
          "border-t border-border px-4 py-3",
          variant === "rail" && "hidden lg:block",
        )}
      >
        <p className="text-[11px] leading-relaxed text-charcoal-400">
          نسخة تجريبية — بيانات Mock محلية
        </p>
      </div>
    </div>
  );
}
