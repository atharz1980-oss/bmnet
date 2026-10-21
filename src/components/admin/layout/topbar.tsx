"use client";

/**
 * Topbar — الشريط العلوي للوحة التحكم
 * ------------------------------------
 * خلفية ورقية + خط شعري سفلي (لا ظل ولا زجاجية).
 * زر القائمة (موبايل) + Breadcrumbs + بحث (سطر سفلي بلا صندوق)
 * + إشعارات (بنقطة برتقالية) + قائمة الملف الشخصي الحقيقية.
 */
import { Bell, LogOut, Menu, RefreshCw, Search, ChevronDown, Eye, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAdminActions, useAdminData, useAdminState } from "@/context/admin-store";
import { getCurrentUser, getRoleById } from "@/data/admin/selectors";
import { logoutAction } from "@/app/admin/actions/auth";
import { cn } from "@/lib/utils";

import { Breadcrumbs } from "./breadcrumbs";

interface TopbarProps {
  onMenuClick: () => void;
}

export function Topbar({ onMenuClick }: TopbarProps) {
  const data = useAdminData();
  const { hydrated, previewRoleId, saving } = useAdminState();
  const { setPreviewRole, refreshData } = useAdminActions();
  const newRequests = data.requests.filter((request) => request.status === "new").length;

  /* المستخدم الفعلي + الدور المعروض (معاينة إن وجدت — مع fallback آمن) */
  const currentUser = getCurrentUser(data);
  const actualRole = currentUser ? getRoleById(data, currentUser.roleId) : undefined;
  const previewRole = previewRoleId ? getRoleById(data, previewRoleId) : undefined;
  const effectiveRole = previewRole ?? actualRole;

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-[#F3F1EC]">
      <div className="flex items-center gap-3 px-4 py-3 sm:px-6 lg:px-8">
        {/* زر القائمة — موبايل فقط */}
        <Button
          variant="ghost"
          size="icon"
          className="-ms-2 text-charcoal-700 hover:bg-transparent hover:text-[#111111]"
          onClick={onMenuClick}
          aria-label="فتح قائمة لوحة التحكم"
        >
          <Menu aria-hidden="true" className="h-5 w-5" strokeWidth={1.5} />
        </Button>

        {/* مسار التنقل */}
        <div className="min-w-0 flex-1">
          <Breadcrumbs />
        </div>

        {/* البحث — سطر سفلي بلا صندوق (على ورق) */}
        <div className="relative hidden w-56 md:block xl:w-72" role="search">
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute start-0 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-charcoal-400"
            strokeWidth={1.5}
          />
          <Input
            type="search"
            placeholder="بحث…"
            aria-label="بحث في لوحة التحكم"
            className="h-9 border-0 border-b border-border bg-transparent px-0 ps-6 text-sm shadow-none focus-visible:border-[#111111] focus-visible:ring-0 lg:h-9"
          />
        </div>

        {/* الإشعارات — placeholder */}
        <Button
          variant="ghost"
          size="icon"
          className="text-charcoal-600 hover:bg-transparent hover:text-[#111111]"
          aria-label={`الإشعارات — ${newRequests} طلب جديد (قريبًا)`}
          title="الإشعارات (placeholder)"
        >
          <Bell aria-hidden="true" className="h-5 w-5" strokeWidth={1.5} />
          {newRequests > 0 ? (
            <span
              aria-hidden="true"
              className="absolute end-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-brand-600"
            />
          ) : null}
        </Button>

        {/* الملف الشخصي — قائمة حقيقية (Checkpoint 6) */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="gap-2 px-1 text-charcoal-800 hover:bg-transparent hover:text-[#111111]"
              aria-label="قائمة الملف الشخصي ومعاينة الصلاحيات"
            >
              <span
                aria-hidden="true"
                className={cn(
                  "flex h-9 w-9 items-center justify-center text-xs font-bold",
                  previewRole ? "bg-brand-600 text-white" : "bg-[#111111] text-white",
                )}
              >
                {currentUser?.name.slice(0, 1) ?? "م"}
              </span>
              <span className="hidden text-sm font-medium lg:inline">
                {currentUser?.name ?? "المستخدم"}
              </span>
              {previewRole ? (
                <span className="brand-micro hidden text-brand-600 lg:inline">معاينة</span>
              ) : null}
              <ChevronDown
                aria-hidden="true"
                className="hidden h-3.5 w-3.5 text-charcoal-400 lg:inline"
                strokeWidth={1.5}
              />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64">
            <DropdownMenuLabel>
              <span className="block truncate text-sm font-semibold text-[#111111]">
                {currentUser?.name ?? "المستخدم"}
              </span>
              <span className="num-ltr block truncate text-xs font-normal text-muted-foreground">
                {currentUser?.email ?? ""}
              </span>
              <span className="mt-1 flex items-center gap-1.5 text-xs text-charcoal-600">
                <ShieldCheck aria-hidden="true" className="h-3.5 w-3.5" strokeWidth={1.5} />
                {hydrated
                  ? previewRole
                    ? `تعرض بصلاحيات «${effectiveRole?.name}»`
                    : `دورك: ${effectiveRole?.name ?? "—"}`
                  : "جارٍ التحميل…"}
              </span>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="brand-micro text-muted-foreground">
              معاينة الصلاحيات (تطوير)
            </DropdownMenuLabel>
            <DropdownMenuRadioGroup
              value={previewRoleId ?? ""}
              onValueChange={(value) => setPreviewRole(value === "" ? null : value)}
            >
              {data.roles.map((role) => (
                <DropdownMenuRadioItem key={role.id} value={role.id} className="text-sm">
                  {role.name}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
            {previewRole ? (
              <DropdownMenuItem
                onSelect={() => setPreviewRole(null)}
                className="text-[#111111] focus:text-[#111111]"
              >
                <Eye aria-hidden="true" className="me-1.5 h-4 w-4" strokeWidth={1.5} />
                العودة إلى صلاحياتي الفعلية
              </DropdownMenuItem>
            ) : null}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onSelect={async () => {
                await refreshData();
              }}
              disabled={saving}
            >
              <RefreshCw
                aria-hidden="true"
                className={cn("me-1.5 h-4 w-4", saving && "animate-spin")}
                strokeWidth={1.5}
              />
              تحديث البيانات من قاعدة البيانات
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={() => {
                void logoutAction();
              }}
              className="text-danger-600 focus:text-danger-600"
            >
              <LogOut aria-hidden="true" className="me-1.5 h-4 w-4" strokeWidth={1.5} />
              تسجيل الخروج
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <p className="px-2 py-1.5 text-[11px] leading-relaxed text-muted-foreground">
              الصلاحيات الفعلية تُفرض على الخادم في كل إجراء — المعاينة هنا للواجهة فقط.
            </p>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
