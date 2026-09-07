"use client";

/**
 * /admin/roles/[id] — تعديل الدور (Checkpoint 6 — #19)
 * دور المالك = عرض مقفول؛ بقية الأدوار (نظامية ومخصصة) قابلة للتعديل،
 * وكل تعديل يمس صلاحيات كل مستخدمي الدور تلقائيًا (اشتقاق لا نسخ).
 */
import { useParams } from "next/navigation";

import { RoleEditor } from "@/components/admin/roles/role-editor";

export default function AdminEditRolePage() {
  const params = useParams<{ id: string }>();
  return <RoleEditor mode="edit" roleId={params.id} />;
}
