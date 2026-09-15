"use client";

/**
 * تنقّل قسم الأعضاء.
 * صفحات العضو كانت منفصلة بلا روابط بينها، فالمحفوظات والمحجوبون لا يُوصل
 * إليهما إلا بكتابة العنوان يدويًا.
 */
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, Bookmark, ShieldOff, UserRound } from "lucide-react";

import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/community/profile", label: "ملفي", icon: UserRound },
  { href: "/community/notifications", label: "الإشعارات", icon: Bell },
  { href: "/community/saved", label: "المحفوظات", icon: Bookmark },
  { href: "/community/blocked", label: "المحجوبون", icon: ShieldOff },
] as const;

export function MemberNav() {
  const pathname = usePathname() ?? "";

  return (
    <nav aria-label="أقسام حسابي" className="mx-auto w-full max-w-2xl px-4 pt-6">
      <ul className="flex gap-1.5 overflow-x-auto rounded-xl border bg-card p-1.5 scrollbar-thin">
        {LINKS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <li key={href} className="shrink-0">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-h-11 items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-2 text-xs font-medium transition-colors lg:min-h-0",
                  active
                    ? "bg-brand-50 text-brand-700"
                    : "text-charcoal-600 hover:bg-accent hover:text-charcoal-900",
                )}
              >
                <Icon aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
