import { MODULE_ACTIONS } from "@/data/admin/permissions";
import type { AdminModule, PermissionAction, RolePermissions } from "@/data/admin/types";

/** An administrator cannot delegate a permission they do not hold. */
export function canDelegatePermissions(held: RolePermissions, requested: Record<string, unknown>): boolean {
  return Object.entries(requested).every(([module, actions]) => {
    const allowed = MODULE_ACTIONS[module as AdminModule];
    return Array.isArray(actions) && actions.every((action) =>
      allowed?.includes(action as PermissionAction) && held[module as AdminModule]?.includes(action as PermissionAction),
    );
  });
}
