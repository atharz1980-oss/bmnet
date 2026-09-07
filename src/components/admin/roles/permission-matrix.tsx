"use client";

/**
 * PermissionMatrix — مصفوفة الصلاحيات (Checkpoint 6)
 * ---------------------------------------------------
 * وحدة ← أفعالها الممنوحة عبر Checkboxes:
 * - Desktop (md+): جدول — صفوف الوحدات الـ 15 وأعمدة الأفعال (غير المنطبق مخفي).
 * - Mobile: بطاقة لكل وحدة بسطور checkboxes — لا جدول أفقي ضخم على 360px.
 *
 * قاعدة «عرض» الأساس: أي فعل أعلى (إضافة/تعديل/حذف/نشر/إدارة) يوجب «عرض»،
 * فلا يُلغى «عرض» ما دامت أعلاف أخرى ممنوحة (تطبيع normalizePermissions نفسه).
 *
 * ⚠️ عرض/تحرير بيانات فقط — ليست حماية أمنية (حد Mock موثق).
 */
import { Lock } from "lucide-react";

import type { AdminModule, PermissionAction, RolePermissions } from "@/data/admin/types";
import {
  ACTION_LABELS,
  ALL_ACTIONS,
  MODULE_ACTIONS,
  MODULE_LABELS,
} from "@/data/admin/permissions";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

interface PermissionMatrixProps {
  permissions: RolePermissions;
  /** غائب = وضع القراءة فقط (دور المالك) */
  onChange?: (next: RolePermissions) => void;
  className?: string;
}

/** تفعيل/إلغاء فعل واحد ضمن وحدة مع تطبيع قاعدة «عرض» */
function toggleAction(
  permissions: RolePermissions,
  adminModule: AdminModule,
  action: PermissionAction,
): RolePermissions {
  const current = permissions[adminModule] ?? [];
  const available = MODULE_ACTIONS[adminModule];
  let next: PermissionAction[];
  if (current.includes(action)) {
    next = current.filter((entry) => entry !== action);
  } else {
    next = [...current, action];
  }
  const hasHigher = next.some((entry) => entry !== "view");
  /* أي فعل أعلى يوجب «عرض» — وإلغاء «عرض» يمسح الوحدة كلها */
  if (hasHigher && !next.includes("view")) {
    next = ["view", ...next];
  }
  return {
    ...permissions,
    [adminModule]: next.filter((entry) => available.includes(entry)),
  };
}

export function PermissionMatrix({ permissions, onChange, className }: PermissionMatrixProps) {
  const readOnly = !onChange;

  return (
    <div className={cn("space-y-3", className)}>
      {/* ── Desktop: جدول المصفوفة ── */}
      <div
        className={cn(
          "hidden overflow-hidden rounded-xl border border-border bg-white md:block",
          readOnly && "opacity-95",
        )}
      >
        <table className="w-full text-sm">
          <caption className="sr-only">
            مصفوفة صلاحيات الدور — الوحدات في الصفوف والأفعال في الأعمدة
          </caption>
          <thead>
            <tr className="border-b border-border bg-surface/60 text-xs text-muted-foreground">
              <th scope="col" className="px-4 py-3 text-start font-medium">
                الوحدة
              </th>
              {ALL_ACTIONS.map((action) => (
                <th key={action} scope="col" className="px-3 py-3 text-center font-medium">
                  {ACTION_LABELS[action]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {(Object.keys(MODULE_ACTIONS) as AdminModule[]).map((adminModule) => {
              const granted = permissions[adminModule] ?? [];
              const hasHigher = granted.some((entry) => entry !== "view");
              return (
                <tr key={adminModule} className="transition-colors hover:bg-surface/40">
                  <th
                    scope="row"
                    className="px-4 py-2.5 text-start font-medium text-charcoal-800"
                  >
                    {MODULE_LABELS[adminModule]}
                  </th>
                  {ALL_ACTIONS.map((action) => {
                    const applicable = MODULE_ACTIONS[adminModule].includes(action);
                    if (!applicable) {
                      return (
                        <td
                          key={action}
                          className="px-3 py-2.5 text-center text-charcoal-200"
                          aria-hidden="true"
                        >
                          —
                        </td>
                      );
                    }
                    const checked = granted.includes(action);
                    const locked = readOnly || (action === "view" && hasHigher);
                    return (
                      <td key={action} className="px-3 py-2.5">
                        <div className="flex justify-center">
                          <Checkbox
                            checked={checked}
                            disabled={locked}
                            onCheckedChange={() =>
                              onChange?.(toggleAction(permissions, adminModule, action))
                            }
                            aria-label={`${ACTION_LABELS[action]} — ${MODULE_LABELS[adminModule]}`}
                          />
                        </div>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ── Mobile: بطاقة لكل وحدة (لا تمرير أفقي) ── */}
      <ul className="space-y-3 md:hidden">
        {(Object.keys(MODULE_ACTIONS) as AdminModule[]).map((adminModule) => {
          const granted = permissions[adminModule] ?? [];
          const hasHigher = granted.some((entry) => entry !== "view");
          return (
            <li key={adminModule} className="rounded-xl border border-border bg-white p-4">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-semibold text-charcoal-900">
                  {MODULE_LABELS[adminModule]}
                </h3>
                <span className="text-xs text-muted-foreground">
                  {granted.length === 0
                    ? "لا صلاحيات"
                    : granted.length === MODULE_ACTIONS[adminModule].length
                      ? "كل الأفعال"
                      : `${granted.length} من ${MODULE_ACTIONS[adminModule].length}`}
                </span>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2.5 sm:grid-cols-3">
                {MODULE_ACTIONS[adminModule].map((action) => {
                  const checked = granted.includes(action);
                  const locked = readOnly || (action === "view" && hasHigher);
                  return (
                    <label
                      key={action}
                      className={cn(
                        "flex cursor-pointer items-center gap-2 text-sm text-charcoal-700",
                        locked && "cursor-default opacity-70",
                      )}
                    >
                      <Checkbox
                        checked={checked}
                        disabled={locked}
                        onCheckedChange={() =>
                          onChange?.(toggleAction(permissions, adminModule, action))
                        }
                        aria-label={`${ACTION_LABELS[action]} — ${MODULE_LABELS[adminModule]}`}
                      />
                      {ACTION_LABELS[action]}
                    </label>
                  );
                })}
              </div>
              {hasHigher ? (
                <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
                  «عرض» أساس بقية الأفعال — ألغِ الأفعال الأعلى أولًا لإلغائه.
                </p>
              ) : null}
            </li>
          );
        })}
      </ul>

      {readOnly ? (
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Lock aria-hidden="true" className="h-3.5 w-3.5" />
          مصفوفة للقراءة فقط — دور نظامي مقفول.
        </p>
      ) : null}
    </div>
  );
}
