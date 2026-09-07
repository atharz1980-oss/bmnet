"use client";

/**
 * PermissionPreview — معاينة صلاحيات دور بصيغة «يستطيع / لا يستطيع»
 * -------------------------------------------------------------------
 * عرض سريع مفهوم للمالك: ✓ وحدة لها أي فعل — ✗ وحدة بلا صلاحيات،
 * مع تفصيل الأفعال الممنوحة لكل وحدة مفعّلة.
 *
 * ⚠️ معلوماتية فقط — الإخفاء في الواجهة ليس أمنًا، والتحكم الفعلي
 * سيكون Server-side بعد Authentication في Phase 3.
 */
import { Check, Minus } from "lucide-react";

import type { AdminModule, RolePermissions } from "@/data/admin/types";
import { ACTION_LABELS, MODULE_ACTIONS, MODULE_LABELS } from "@/data/admin/permissions";
import { cn } from "@/lib/utils";

export function PermissionPreview({
  permissions,
  className,
}: {
  permissions: RolePermissions;
  className?: string;
}) {
  const modules = Object.keys(MODULE_ACTIONS) as AdminModule[];
  const enabled = modules.filter((module) => (permissions[module] ?? []).length > 0);
  const disabled = modules.filter((module) => (permissions[module] ?? []).length === 0);

  return (
    <div className={cn("space-y-3", className)}>
      <div>
        <h3 className="mb-2 text-sm font-semibold text-charcoal-900">هذا الدور يستطيع:</h3>
        {enabled.length === 0 ? (
          <p className="rounded-lg border border-border bg-surface px-3 py-2 text-xs text-muted-foreground">
            لا صلاحيات ممنوحة على أي وحدة — لن يستطيع هذا الدور الوصول لأي قسم.
          </p>
        ) : (
          <ul className="space-y-1.5">
            {enabled.map((module) => {
              const actions = permissions[module] ?? [];
              return (
                <li
                  key={module}
                  className="flex items-start gap-2 rounded-lg border border-border bg-white px-3 py-2 text-sm"
                >
                  <Check aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" />
                  <span className="font-medium text-charcoal-800">{MODULE_LABELS[module]}</span>
                  <span className="text-xs text-muted-foreground">
                    ({actions.map((action) => ACTION_LABELS[action]).join(" · ")})
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {disabled.length > 0 ? (
        <div>
          <h3 className="mb-2 text-sm font-semibold text-charcoal-900">لا يستطيع:</h3>
          <ul className="flex flex-wrap gap-1.5">
            {disabled.map((module) => (
              <li
                key={module}
                className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-2.5 py-1 text-xs text-charcoal-500"
              >
                <Minus aria-hidden="true" className="h-3 w-3" />
                {MODULE_LABELS[module]}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
