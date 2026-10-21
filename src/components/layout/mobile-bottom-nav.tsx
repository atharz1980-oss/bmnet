"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, GraduationCap, Package, Users, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { brandTokens } from "@/components/brand/brand-tokens";

const TABS = [
  { href: "/", label: "\u0627\u0644\u0631\u0626\u064a\u0633\u064a\u0629", icon: Home, match: (p: string) => p === "/" },
  { href: "/courses", label: "\u0627\u0644\u062f\u0648\u0631\u0627\u062a", icon: GraduationCap, match: (p: string) => p.startsWith("/courses") },
  { href: "/rentals", label: "\u0627\u0644\u062a\u0623\u062c\u064a\u0631", icon: Package, match: (p: string) => p.startsWith("/rentals") },
  { href: "/community", label: "\u0627\u0644\u0645\u062c\u062a\u0645\u0639", icon: Users, match: (p: string) => p.startsWith("/community") },
  { href: "/account", label: "\u062d\u0633\u0627\u0628\u064a", icon: User, match: (p: string) => p.startsWith("/account") },
];

export function PublicMobileBottomNav() {
  const pathname = usePathname() ?? "";

  return (
    <nav
      aria-label="bottom navigation"
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