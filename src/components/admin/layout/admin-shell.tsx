"use client";

/**
 * AdminShell — هيكل لوحة التحكم
 * ------------------------------
 * Sidebar ثابت يمين الشاشة (RTL) في الديسكتوب، شريط أيقونات على التابلت،
 * وDrawer عبر Sheet على الموبايل. المحتوى في main مع خلفية سطح فاتحة.
 */
import { useState } from "react";
import { usePathname } from "next/navigation";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";

export function AdminShell({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();

  /* إغلاق الـ Drawer عند تغيّر المسار — بنمط "ضبط الحالة أثناء الرسم"
     الموثق في React بدل effect (متطلب react-hooks/set-state-in-effect) */
  const [prevPathname, setPrevPathname] = useState(pathname);
  if (prevPathname !== pathname) {
    setPrevPathname(pathname);
    if (mobileOpen) setMobileOpen(false);
  }

  return (
    <div className="flex min-h-screen w-full bg-surface">
      {/* Desktop: sidebar كامل / Tablet: شريط أيقونات */}
      <aside className="sticky top-0 hidden h-screen shrink-0 border-e border-border md:block md:w-[72px] lg:w-64">
        <Sidebar variant="rail" />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar onMenuClick={() => setMobileOpen(true)} />
        <main id="admin-main" className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
          {children}
        </main>
      </div>

      {/* Mobile Drawer */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        {/* زر الإغلاق الافتراضي physical right-4 — ننقله للجهة المعاكسة (يسار RTL) كي لا يتراكب مع الشعار */}
        <SheetContent
          side="right"
          className="w-72 gap-0 p-0 [&>button]:right-auto [&>button]:left-4"
        >
          <SheetHeader className="border-b border-border px-0 py-0">
            <SheetTitle className="sr-only">قائمة لوحة التحكم</SheetTitle>
            <SheetDescription className="sr-only">
              استعرض أقسام لوحة التحكم وتنقّل بينها
            </SheetDescription>
          </SheetHeader>
          <Sidebar variant="drawer" onNavigate={() => setMobileOpen(false)} />
        </SheetContent>
      </Sheet>
    </div>
  );
}
