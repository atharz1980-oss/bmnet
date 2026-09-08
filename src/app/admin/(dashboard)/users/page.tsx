"use client";

/**
 * /admin/users — قائمة المستخدمين (Checkpoint 6 — #19)
 * ------------------------------------------------------
 * بحث (اسم/بريد) + فلترة الدور والحالة + 3 ترتيبات — كلها تعمل فعليًا
 * على مخزن الـ Mock. الإجراءات: تعديل / تعليق-تفعيل / حذف (بتأكيد
 * وحماية آخر مالك — القرار الأكثر أمانًا). بلا تكرار للمستخدمين.
 */
import { useMemo, useState } from "react";
import Link from "next/link";
import { Plus, Search } from "lucide-react";

import { useAdminActions, useAdminData } from "@/context/admin-store";
import type { AdminUser } from "@/data/admin/types";
import { formatNumber, formatDateTime } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { AdminPageHeader } from "@/components/admin/ui/admin-page-header";
import { AdminToolbar } from "@/components/admin/ui/admin-toolbar";
import { UsersList } from "@/components/admin/users/users-list";
import { isLastOwner } from "@/data/admin/selectors";

type SortKey = "newest" | "name" | "last-active";

const SORT_OPTIONS: Array<{ value: SortKey; label: string }> = [
  { value: "newest", label: "الأحدث إنشاء" },
  { value: "name", label: "الاسم (أ–ي)" },
  { value: "last-active", label: "آخر نشاط" },
];

export default function AdminUsersPage() {
  const data = useAdminData();
  const { updateUser, deleteUser } = useAdminActions();
  const { toast } = useToast();

  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortKey, setSortKey] = useState<SortKey>("newest");

  const roleNameByUser = useMemo(() => {
    const map: Record<string, string> = {};
    for (const role of data.roles) map[role.id] = role.name;
    return map;
  }, [data.roles]);

  /* مجموعات «آخر مالك» — تُحسب مرة واحدة لكل رسم (قاعدة الحماية) */
  const lastOwnerIds = useMemo(() => {
    const ownerUsers = data.users.filter((user) => user.roleId === "owner");
    return new Set(ownerUsers.length === 1 ? ownerUsers.map((user) => user.id) : []);
  }, [data.users]);

  const filteredUsers = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = data.users.filter((user) => {
      if (roleFilter !== "all" && user.roleId !== roleFilter) return false;
      if (statusFilter !== "all" && user.status !== statusFilter) return false;
      if (q && !`${user.name} ${user.email}`.toLowerCase().includes(q)) return false;
      return true;
    });

    if (sortKey === "name") {
      list = [...list].sort((a, b) => a.name.localeCompare(b.name, "ar"));
    } else if (sortKey === "newest") {
      list = [...list].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    } else if (sortKey === "last-active") {
      /* بلا نشاط في الأسفل — ثم الأقدم أولًا */
      list = [...list].sort((a, b) => {
        if (!a.lastActiveAt && !b.lastActiveAt) return 0;
        if (!a.lastActiveAt) return 1;
        if (!b.lastActiveAt) return -1;
        return a.lastActiveAt.localeCompare(b.lastActiveAt);
      });
    }

    return list;
  }, [data.users, query, roleFilter, statusFilter, sortKey]);

  /** تعليق/تفعيل سريع من القائمة — حماية آخر مالك مضمّنة */
  function handleToggleStatus(user: AdminUser) {
    if (lastOwnerIds.has(user.id)) {
      toast({
        title: "لا يمكن تعليق آخر مالك",
        description: "يبقى Owner واحد على الأقل بوصول كامل دائم — أسند الدور لمستخدم آخر أولًا.",
        variant: "destructive",
      });
      return;
    }
    const next = user.status === "suspended" ? "active" : "suspended";
    updateUser(user.id, { status: next });
    toast({
      title: next === "suspended" ? "تم تعليق الحساب" : "تم تفعيل الحساب",
      description:
        next === "suspended"
          ? `عُلّق حساب «${user.name}» — في مرحلة Backend سيُمنع من تسجيل الدخول فعليًا.`
          : `أُعيد تفعيل حساب «${user.name}».`,
    });
  }

  function handleDelete(user: AdminUser) {
    deleteUser(user.id);
    toast({ title: "تم حذف المستخدم", description: `حُذف حساب «${user.name}» من المخزن.` });
  }

  const hasActiveFilters =
    query.trim() !== "" || roleFilter !== "all" || statusFilter !== "all";

  return (
    <div className="mx-auto w-full max-w-6xl">
      <AdminPageHeader
        title="المستخدمون"
        description={`فريق لوحة التحكم — ${formatNumber(data.users.length)} حساب في المخزن. الصلاحيات مشتقة من الأدوار.`}
      >
        <Button asChild>
          <Link href="/admin/users/new">
            <Plus aria-hidden="true" className="me-1.5 h-4 w-4" />
            مستخدم جديد
          </Link>
        </Button>
      </AdminPageHeader>

      <AdminToolbar>
        {/* البحث */}
        <div className="relative w-full lg:max-w-xs">
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-charcoal-300"
          />
          <Input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="ابحث بالاسم أو البريد…"
            aria-label="بحث في المستخدمين"
            className="bg-white ps-9"
          />
        </div>

        {/* فلترة الدور */}
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-full bg-white sm:w-[180px]" aria-label="فلترة بالدور">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">كل الأدوار</SelectItem>
            {data.roles.map((role) => (
              <SelectItem key={role.id} value={role.id}>
                {role.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* فلترة الحالة */}
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full bg-white sm:w-[150px]" aria-label="فلترة بالحالة">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">كل الحالات</SelectItem>
            <SelectItem value="active">نشط</SelectItem>
            <SelectItem value="invited">مدعو</SelectItem>
            <SelectItem value="suspended">معلّق</SelectItem>
          </SelectContent>
        </Select>

        {/* الترتيب */}
        <Select value={sortKey} onValueChange={(value) => setSortKey(value as SortKey)}>
          <SelectTrigger className="w-full bg-white sm:w-[170px]" aria-label="ترتيب القائمة">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SORT_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {hasActiveFilters ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setQuery("");
              setRoleFilter("all");
              setStatusFilter("all");
              setSortKey("newest");
            }}
          >
            مسح الفلاتر
          </Button>
        ) : null}
      </AdminToolbar>

      <p className="mb-3 text-xs text-muted-foreground" role="status" aria-live="polite">
        عرض {formatNumber(filteredUsers.length)} من {formatNumber(data.users.length)} مستخدم
        {sortKey === "last-active" && filteredUsers.some((user) => user.lastActiveAt)
          ? ` — الأحدث نشاطًا: ${
              filteredUsers.find((user) => user.lastActiveAt)?.lastActiveAt
                ? formatDateTime(filteredUsers.find((user) => user.lastActiveAt)!.lastActiveAt!)
                : ""
            }`
          : ""}
      </p>

      <UsersList
        users={filteredUsers}
        roleNameByUser={roleNameByUser}
        lastOwnerIds={lastOwnerIds}
        onToggleStatus={handleToggleStatus}
        onDelete={handleDelete}
      />
    </div>
  );
}
