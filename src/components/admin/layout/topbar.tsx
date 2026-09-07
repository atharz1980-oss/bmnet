"use client";

/**
 * Topbar — الشريط العلوي للوحة التحكم
 * ------------------------------------
 * زر القائمة (موبايل) + Breadcrumbs + بحث (UI) + إشعارات placeholder
 * + قائمة الملف الشخصي الحقيقية (Checkpoint 6):
 * المستخدم الحالي (Mock — بلا Authentication) + Development Role Preview
 * «عرض اللوحة كـ…» — معاينة صلاحيات فقط وليست حماية أمنية (تنبيه صريح).
 */
import { Bell, Menu, Search, ChevronDown, Eye, ShieldCheck } from "lucide-react";
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
import { cn } from "@/lib/utils";

import { Breadcrumbs } from "./breadcrumbs";

interface TopbarProps {
  onMenuClick: () => void;
}

export function Topbar({ onMenuClick }: TopbarProps) {
  const data = useAdminData();
  const { hydrated, previewRoleId } = useAdminState();
  const { setPreviewRole } = useAdminActions();
  const newRequests = data.requests.filter((request) => request.status === "new").length;

  /* المستخدم الفعلي + الدور المعروض (معاينة إن وجدت — مع fallback آمن) */
  const currentUser = getCurrentUser(data);
  const actualRole = currentUser ? getRoleById(data, currentUser.roleId) : undefined;
  const previewRole = previewRoleId ? getRoleById(data, previewRoleId) : undefined;
  const effectiveRole = previewRole ?? actualRole;

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/85">
      <div className="flex items-center gap-2 px-4 py-3 sm:px-6 lg:px-8">
        {/* زر القائمة — موبايل فقط */}
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          onClick={onMenuClick}
          aria-label="فتح قائمة لوحة التحكم"
        >
          <Menu aria-hidden="true" className="h-5 w-5" />
        </Button>

        {/* مسار التنقل */}
        <div className="min-w-0 flex-1">
          <Breadcrumbs />
        </div>

        {/* البحث — UI placeholder (يُفعّل ضمن صفحات القوائم لاحقًا) */}
        <div className="relative hidden w-56 md:block xl:w-72" role="search">
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-charcoal-400"
          />
          <Input
            type="search"
            placeholder="بحث…"
            aria-label="بحث في لوحة التحكم"
            className="h-9 bg-surface ps-9 text-sm"
          />
        </div>

        {/* الإشعارات — placeholder */}
        <Button
          variant="ghost"
          size="icon"
          className="relative text-charcoal-500"
          aria-label={`الإشعارات — ${newRequests} طلب جديد (قريبًا)`}
          title="الإشعارات (placeholder)"
        >
          <Bell aria-hidden="true" className="h-5 w-5" />
          {newRequests > 0 ? (
            <span
              aria-hidden="true"
              className="absolute end-1.5 top-1.5 h-2 w-2 rounded-full"
              style={{ backgroundColor: "var(--brand-600)" }}
            />
          ) : null}
        </Button>

        {/* الملف الشخصي — قائمة حقيقية (Checkpoint 6) */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="gap-2 px-2 text-charcoal-700"
              aria-label="قائمة الملف الشخصي ومعاينة الصلاحيات"
            >
              <span
                aria-hidden="true"
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-white",
                  previewRole ? "bg-brand-600" : "bg-charcoal-950",
                )}
              >
                {currentUser?.name.slice(0, 1) ?? "م"}
              </span>
              <span className="hidden text-sm font-medium lg:inline">
                {currentUser?.name ?? "المستخدم"}
              </span>
              {previewRole ? (
                <span className="hidden rounded-full bg-brand-50 px-2 py-0.5 text-[10px] font-medium text-brand-700 lg:inline">
                  معاينة
                </span>
              ) : null}
              <ChevronDown
                aria-hidden="true"
                className="hidden h-4 w-4 text-charcoal-400 lg:inline"
              />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64">
            <DropdownMenuLabel>
              <span className="block truncate text-sm font-semibold text-charcoal-900">
                {currentUser?.name ?? "المستخدم"}
              </span>
              <span className="num-ltr block truncate text-xs font-normal text-muted-foreground">
                {currentUser?.email ?? ""}
              </span>
              <span className="mt-1 flex items-center gap-1 text-xs text-charcoal-600">
                <ShieldCheck aria-hidden="true" className="h-3.5 w-3.5" />
                {hydrated
                  ? previewRole
                    ? `تعرض بصلاحيات «${effectiveRole?.name}»`
                    : `دورك: ${effectiveRole?.name ?? "—"}`
                  : "جارٍ التحميل…"}
              </span>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-xs text-muted-foreground">
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
                className="text-brand-700 focus:text-brand-700"
              >
                <Eye aria-hidden="true" className="me-1.5 h-4 w-4" />
                العودة إلى صلاحياتي الفعلية
              </DropdownMenuItem>
            ) : null}
            <DropdownMenuSeparator />
            <p className="px-2 py-1.5 text-[11px] leading-relaxed text-muted-foreground">
              معاينة صلاحيات فقط — ليست حماية أمنية. لا تُخفى البيانات ولا تُمنع
              المسارات، والتحقق الحقيقي سيُنفَّذ Server-side بعد إضافة
              Authentication.
            </p>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
