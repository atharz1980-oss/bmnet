"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, GraduationCap, ClipboardList, ImageIcon, Menu } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAdminData } from "@/context/admin-store";

const TABS = [
  { href: "/admin", label: "\u0644\u0648\u062d\u0629 \u0627\u0644\u062a\u062d\u0643\u0645", icon: LayoutDashboard, match: (p: string) => p === "/admin" },
  { href: "/admin/courses", label: "\u0627\u0644\u062f\u0648\u0631\u0627\u062a", icon: GraduationCap, match: (p: string) => p.startsWith("/admin/courses") },
  { href: "/admin/corporate-requests", label: "\u0637\u0644\u0628\u0627\u062a \u0627\u0644\u0634\u0631\u0643\u0627\u062a", icon: ClipboardList, match: (p: string) => p.startsWith("/admin/corporate-requests") },
  { href: "/admin/media", label: "\u0627\u0644\u0648\u0633\u0627\u0626\u0637", icon: ImageIcon, match: (p: string) => p.startsWith("/admin/media") },
];

export function MobileBottomNav({ onMore }: { onMore: () => void }) {
  const pathname = usePathname() ?? "";
  const data = useAdminData();
  const newRequests = data.requests.filter((r) => !r.archivedAt && r.status === "new").length;

  return (
    <nav
      aria-label="bottom navigation"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-white/12 bg-[#111111] text-[#F3F1EC] md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      <ul className="grid grid-cols-5">
        {TABS.map((tab) => {
          const active = tab.match(pathname);
          const Icon = tab.icon;
          const badge = tab.href === "/admin/corporate-requests" && newRequests > 0 ? newRequests : null;
          return (
            <li key={tab.href}>
              <Link
                href={tab.href}
                className={cn(
                  "relative flex min-h-[56px] flex-col items-center justify-center gap-1 px-1 py-2 text-[11px] font-medium transition-colors",
                  active ? "text-[#E65A2E]" : "text-white/55 active:text-white",
                )}
                aria-current={active ? "page" : undefined}
              >
                {active ? (
                  <span aria-hidden="true" className="absolute inset-x-3 top-0 h-0.5 bg-[#E65A2E]" />
                ) : null}
                <Icon aria-hidden="true" className="h-5 w-5" strokeWidth={1.5} />
                <span className="truncate">{tab.label}</span>
                {badge ? (
                  <span className="absolute end-2 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#E65A2E] px-1 text-[9px] font-bold text-[#111111]">
                    {badge}
                  </span>
                ) : null}
              </Link>
            </li>
          );
        })}
        <li>
          <button
            type="button"
            onClick={onMore}
            className="flex min-h-[56px] w-full flex-col items-center justify-center gap-1 px-1 py-2 text-[11px] font-medium text-white/55 transition-colors active:text-white"
            aria-label="more"
          >
            <Menu aria-hidden="true" className="h-5 w-5" strokeWidth={1.5} />
            <span className="truncate">{"\u0627\u0644\u0645\u0632\u064a\u062f"}</span>
          </button>
        </li>
      </ul>
    </nav>
  );
}