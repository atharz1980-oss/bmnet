"use client";

/**
 * /admin/paths/new — إضافة مسار جديد (المهمة #13)
 * نفس محرر المسار بوضع الإنشاء.
 */
import { PathEditor } from "@/components/admin/paths/path-editor";

export default function NewPathPage() {
  return <PathEditor mode="create" />;
}
