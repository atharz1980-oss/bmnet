/**
 * بيت المصور — جلسة الإدارة (CP-F)
 * ----------------------------------
 * المصدر الوحيد لهوية المشرف وصلاحياته على الخادم:
 *  - الجلسة من كوكيز @supabase/ssr (server client القابل للكتابة).
 *  - الملف والدور والصلاحيات من قاعدة البيانات عبر عميل الخدمة
 *    (قراءة موثوقة بعد التحقق — لا اعتماد على ادعاءات العميل).
 *  - requirePermission: بوابة كل Server Action إداري.
 */
import "server-only";

import { notAuthenticated, ok, permissionDenied, toArabicDbError, type ActionResult } from "@/lib/cms/result";
import { permissionsFromRows } from "@/lib/cms/mappers";
import { getServiceSupabase } from "@/lib/supabase/service";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type {
  AdminModule,
  PermissionAction,
  RolePermissions,
} from "@/data/admin/types";

export interface AdminRoleView {
  id: string;
  key: string | null;
  name: string;
  kind: "system" | "custom";
  permissions: RolePermissions;
}

export interface AdminSession {
  userId: string;
  email: string;
  name: string;
  avatarPath: string | null;
  roleId: string;
  role: AdminRoleView;
}

interface ProfileRow {
  id: string;
  name: string;
  avatar_path: string | null;
  role_id: string;
  status: string;
}

interface RoleRow {
  id: string;
  key: string | null;
  name: string;
  kind: string;
}

/**
 * جلسة الإدارة الحالية أو null:
 * مستخدم مصادق عليه + ملف شخصي نشط + دور بصلاحيات.
 */
export async function getAdminSession(): Promise<AdminSession | null> {
  const auth = await createSupabaseServerClient();
  const {
    data: { user },
  } = await auth.auth.getUser();
  if (!user?.email) return null;

  const svc = getServiceSupabase();

  const { data: profile, error: profileError } = await svc
    .from("profiles")
    .select("id, name, avatar_path, role_id, status")
    .eq("id", user.id)
    .maybeSingle<ProfileRow>();
  if (profileError || !profile) return null;
  if (profile.status === "suspended") return null;

  const { data: role, error: roleError } = await svc
    .from("roles")
    .select("id, key, name, kind")
    .eq("id", profile.role_id)
    .maybeSingle<RoleRow>();
  if (roleError || !role) return null;

  const { data: permissionRows, error: permError } = await svc
    .from("role_permissions")
    .select("module, action")
    .eq("role_id", role.id);
  if (permError) return null;

  return {
    userId: user.id,
    email: user.email,
    name: profile.name,
    avatarPath: profile.avatar_path,
    roleId: role.id,
    role: {
      id: role.id,
      key: role.key,
      name: role.name,
      kind: role.kind === "system" ? "system" : "custom",
      permissions: permissionsFromRows(permissionRows ?? []),
    },
  };
}

/** بوابة المصادقة لكل إجراء إداري */
export async function requireSession(): Promise<ActionResult<AdminSession>> {
  try {
    const session = await getAdminSession();
    if (!session) return notAuthenticated();
    return ok(session);
  } catch (error) {
    return { ok: false, error: toArabicDbError(error, "التحقق من الجلسة") };
  }
}

/** بوابة الصلاحية: مصادقة + فعل مسموح على الوحدة */
export async function requirePermission(
  module: AdminModule,
  action: PermissionAction,
): Promise<ActionResult<AdminSession>> {
  const gate = await requireSession();
  if (!gate.ok) return gate;
  const granted = gate.data.role.permissions[module] ?? [];
  if (!granted.includes(action)) return permissionDenied();
  return gate;
}
