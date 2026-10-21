"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, GraduationCap, Package, Users, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { brandTokens } from "@/components/brand/brand-tokens";

const TABS = [
  { href: "/", label: "الرئيسية", icon: Home, match: (p: string) => p === "/" },
  { href: "/courses", label: "الدورات", icon: GraduationCap, match: (p: string) => p.startsWith("/courses") },
  { href: "/rentals", label: "التأجير", icon: Package, match: (p: string) => p.startsWith("/rentals") },
  { href: "/community", label: "المجتمع", icon: Users, match: (p: string) => p.startsWith("/community") },
  { href: "/account", label: "حسابي", icon: User, match: (p: string) => p.startsWith("/account") },
];

export function PublicMobileBottomNav() {
  const pathname = usePathname() ?? "";

  return (
    <nav
      aria-label="التنقل السفلي"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-white/12 bg-[var(--bm-ink)] text-[var(--bm-white)] md:hidden"
      style={{ ...brandTokens, paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      <ul className="grid grid-cols-5">
        {TABS.map((tab) => {
          const active = tab.match(pathname);
          const Icon = tab.icon;
          return (
            <li key={tab.href}>
              <Link
                href={tab.href}
                className={cn(
                  "relative flex min-h-[56px] flex-col items-center justify-center gap-1 px-1 py-2 text-[11px] font-medium transition-colors",
                  active ? "text-[var(--bm-orange)]" : "text-[var(--bm-gray-200)] active:text-[var(--bm-white)]",
                )}
                aria-current={active ? "page" : undefined}
              >
                {active ? <span aria-hidden="true" className="absolute inset-x-3 top-0 h-0.5 bg-[var(--bm-orange)]" /> : null}
                <Icon aria-hidden="true" className="h-5 w-5" strokeWidth={1.5} />
                <span className="truncate">{tab.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}