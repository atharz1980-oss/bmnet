"use client";

/**
 * AdminShell — هيكل لوحة التحكم بهوية «البيت الأسود»
 * ------------------------------
 * Sidebar ثابت يمين الشاشة (RTL) في الديسكتوب، شريط أيقونات على التابلت،
 * وDrawer عبر Sheet على الموبايل. المحتوى على أرضية ورقية (PAPER).
 *
 * الحركة: انكشاف المحتوى (FRAME / REVEAL) عند كل تنقّل — 500ms،
 * ease-out، بلا ارتداد. يُعاد تشغيلها بتبديل اسمين متطابقين
 * للحركة بدل إعادة تركيب شجرة React (حفاظًا على حالة الصفحات).
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
import { cn } from "@/lib/utils";

import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";

export function AdminShell({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();

  /* إغلاق الـ Drawer عند تغيّر المسار — بنمط "ضبط الحالة أثناء الرسم"
     الموثق في React بدل effect (متطلب react-hooks/set-state-in-effect) */
  const [prevPathname, setPrevPathname] = useState(pathname);
  /* عدّاد يقود تبديل اسم حركة الانكشاف لإعادة تشغيلها */
  const [revealTick, setRevealTick] = useState(0);
  if (prevPathname !== pathname) {
    setPrevPathname(pathname);
    setRevealTick((tick) => tick + 1);
    if (mobileOpen) setMobileOpen(false);
  }

  return (
    <div className="flex min-h-screen w-full bg-[#F3F1EC]">
      {/* Desktop: sidebar كامل / Tablet: شريط أيقونات */}
      <aside className="sticky top-0 hidden h-screen shrink-0 border-e border-white/10 md:block md:w-[72px] lg:w-[264px]">
        <Sidebar variant="rail" />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar onMenuClick={() => setMobileOpen(true)} />
        <main
          id="admin-main"
          className={cn(
            "flex-1 px-4 py-7 sm:px-6 lg:px-10 lg:py-10",
            revealTick % 2 === 0 ? "brand-frame-in" : "brand-frame-in-alt",
          )}
        >
          {children}
        </main>
      </div>

      {/* Mobile Drawer */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        {/* زر الإغلاق الافتراضي physical right-4 — ننقله للجهة المعاكسة (يسار RTL) كي لا يتراكب مع الشعار */}
        <SheetContent
          side="right"
          className="w-72 gap-0 border-0 bg-[#111111] p-0 text-[#F3F1EC] [&>button]:right-auto [&>button]:left-4"
        >
          <SheetHeader className="border-b border-white/12 px-0 py-0">
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
