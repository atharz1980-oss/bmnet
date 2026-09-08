"use client";

/**
 * /admin/users/[id] — تعديل بيانات المستخدم (Checkpoint 6 — #19)
 * مع حماية آخر مالك (قفل الدور والحالة) وملخص الصلاحيات المشتقة.
 */
import { useParams } from "next/navigation";

import { UserEditor } from "@/components/admin/users/user-editor";

export default function AdminEditUserPage() {
  const params = useParams<{ id: string }>();
  return <UserEditor mode="edit" userId={params.id} />;
}
