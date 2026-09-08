"use client";

/**
 * /admin/users/new — إضافة مستخدم (Checkpoint 6 — #19)
 * Mock فقط: بلا Password ولا Authentication credentials.
 */
import { UserEditor } from "@/components/admin/users/user-editor";

export default function AdminNewUserPage() {
  return <UserEditor mode="create" />;
}
