"use client";

/**
 * /admin/roles — قائمة الأدوار والصلاحيات (Checkpoint 6 — #19)
 * -------------------------------------------------------------
 * بحث + عرض (الدور/الوصف/المستخدمون/ملخص الصلاحيات/النوع) + إجراءات
 * (تعديل / تكرار / حذف). قيود النظام: المالك مقفول، النظامية لا تُحذف،
 * والمسند لمستخدمين لا يُحذف (السلوك الأكثر أمانًا).
 */
import { useMemo, useState } from "react";
import Link from "next/link";
import { Plus, Search } from "lucide-react";

import { useAdminActions, useAdminData } from "@/context/admin-store";
import type { Role } from "@/data/admin/types";
import { formatNumber } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { AdminPageHeader } from "@/components/admin/ui/admin-page-header";
import { AdminToolbar } from "@/components/admin/ui/admin-toolbar";
import { RolesList } from "@/components/admin/roles/roles-list";

export default function AdminRolesPage() {
  const data = useAdminData();
  const { duplicateRole, deleteRole } = useAdminActions();
  const { toast } = useToast();

  const [query, setQuery] = useState("");

  /* عدد المستخدمين المسند لكل دور — حساب واحد لكل رسم */
  const usersCountByRole = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const user of data.users) {
      counts[user.roleId] = (counts[user.roleId] ?? 0) + 1;
    }
    return counts;
  }, [data.users]);

  const filteredRoles = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return data.roles;
    return data.roles.filter((role) =>
      `${role.name} ${role.description}`.toLowerCase().includes(q),
    );
  }, [data.roles, query]);

  function handleDuplicate(role: Role) {
    const newId = duplicateRole(role.id);
    if (newId) {
      toast({
        title: "تم تكرار الدور",
        description: `أُنشئ الدور المخصص «${role.name} (نسخة)» بنفس المصفوفة — عدّله بحرية.`,
      });
    }
  }

  /** حذف دور مخصص غير مسند — يستدعى بعد تأكيد الحوار فقط */
  function handleDelete(role: Role) {
    deleteRole(role.id);
    toast({ title: "تم حذف الدور", description: `حُذف الدور المخصص «${role.name}».` });
  }

  return (
    <div className="mx-auto w-full max-w-6xl">
      <AdminPageHeader
        title="الأدوار والصلاحيات"
        description={`${formatNumber(data.roles.length)} دور — النظامية الخمسة أساس النموذج، والمخصصة تُبنى منها. الصلاحيات مشتقة من الدور لكل مستخدميه.`}
      >
        <Button asChild>
          <Link href="/admin/roles/new">
            <Plus aria-hidden="true" className="me-1.5 h-4 w-4" />
            دور جديد
          </Link>
        </Button>
      </AdminPageHeader>

      <AdminToolbar>
        <div className="relative w-full lg:max-w-xs">
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-charcoal-300"
          />
          <Input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="ابحث باسم الدور أو الوصف…"
            aria-label="بحث في الأدوار"
            className="bg-white ps-9"
          />
        </div>
      </AdminToolbar>

      <RolesList
        roles={filteredRoles}
        usersCountByRole={usersCountByRole}
        onDuplicate={handleDuplicate}
        onDelete={handleDelete}
      />
    </div>
  );
}
