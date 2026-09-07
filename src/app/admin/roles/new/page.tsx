"use client";

/**
 * /admin/roles/new — إنشاء دور مخصص (Checkpoint 6 — #19)
 * مصفوفة فارغة افتراضيًا — المالك يحدد الصلاحيات وحدة بوحدة.
 */
import { RoleEditor } from "@/components/admin/roles/role-editor";

export default function AdminNewRolePage() {
  return <RoleEditor mode="create" />;
}
