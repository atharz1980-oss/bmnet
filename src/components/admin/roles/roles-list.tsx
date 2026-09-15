"use client";

/**
 * RolesList — قائمة الأدوار والصلاحيات (Checkpoint 6)
 * ----------------------------------------------------
 * الأعمدة: الدور، الوصف، عدد المستخدمين، ملخص الصلاحيات، نوع (نظامي/مخصص)،
 * إجراءات (تعديل / تكرار / حذف). بحث بالاسم والوصف.
 *
 * قيود النظام (السلوك الأكثر أمانًا — قرار موثق):
 * - المالك (نظامي): مقفول — لا تعديل ولا حذف (معاينة فقط).
 * - الأدوار النظامية: تُعدَّل وتُكرَّر ولا تُحذف.
 * - أي دور مسند لمستخدمين: حذفه محجوب — نقل المستخدمين أولًا.
 * - المخصص غير المسند: حذف بتأكيد.
 */
import Link from "next/link";
import { useState } from "react";
import { Eye, Pencil, Copy, Trash2 } from "lucide-react";

import type { Role } from "@/data/admin/types";
import { countModulesWithAccess } from "@/data/admin/selectors";
import { MODULE_LABELS } from "@/data/admin/permissions";
import { formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ConfirmDialog } from "@/components/admin/ui/confirm-dialog";
import { EmptyState } from "@/components/admin/ui/empty-state";

/** شارة نوع الدور — نظامي أو مخصص */
function KindBadge({ role }: { role: Role }) {
  return (
    <span
      className={cn(
        "inline-flex items-center whitespace-nowrap rounded-full border px-2 py-0.5 text-xs font-medium",
        role.kind === "system"
          ? "border-charcoal-200 bg-charcoal-50 text-charcoal-700"
          : "border-brand-200 bg-brand-50 text-brand-700",
      )}
    >
      {role.kind === "system" ? "دور نظامي" : "دور مخصص"}
    </span>
  );
}

/** ملخص مصفوفة الصلاحيات: عدد الوحدات + أسماء أول وحدتين */
function PermissionSummary({ role }: { role: Role }) {
  const modulesCount = countModulesWithAccess(role.permissions);
  const enabledModules = (Object.keys(role.permissions) as Array<keyof typeof role.permissions>)
    .filter((adminModule) => role.permissions[adminModule].length > 0)
    .slice(0, 2)
    .map((adminModule) => MODULE_LABELS[adminModule]);
  const isFull = modulesCount === Object.keys(role.permissions).length;

  return (
    <div className="min-w-0">
      <span className="num-ltr text-sm font-medium text-charcoal-800">
        {isFull ? "صلاحيات كاملة" : `${formatNumber(modulesCount)} من 15 وحدة`}
      </span>
      {enabledModules.length > 0 && !isFull ? (
        <span className="block truncate text-xs text-muted-foreground">
          {enabledModules.join(" · ")}
          {modulesCount > 2 ? ` +${formatNumber(modulesCount - 2)}` : ""}
        </span>
      ) : null}
    </div>
  );
}

interface RowActionsProps {
  role: Role;
  /** هل الدور مقفول تمامًا (المالك)؟ */
  locked: boolean;
  onDuplicate: (role: Role) => void;
  onRequestDelete: (role: Role) => void;
}

function RowActions({ role, locked, onDuplicate, onRequestDelete }: RowActionsProps) {
  return (
    <div className="flex items-center justify-end gap-1">
      {locked ? (
        <Button
          asChild
          variant="ghost"
          size="icon"
          className="h-11 w-11 lg:h-8 lg:w-8 text-charcoal-500 hover:text-charcoal-800"
        >
          <Link href={`/admin/roles/${role.id}`} aria-label={`عرض مصفوفة صلاحيات ${role.name}`}>
            <Eye aria-hidden="true" className="h-4 w-4" />
          </Link>
        </Button>
      ) : (
        <Button
          asChild
          variant="ghost"
          size="icon"
          className="h-11 w-11 lg:h-8 lg:w-8 text-charcoal-500 hover:text-charcoal-800"
        >
          <Link href={`/admin/roles/${role.id}`} aria-label={`تعديل الدور ${role.name}`}>
            <Pencil aria-hidden="true" className="h-4 w-4" />
          </Link>
        </Button>
      )}
      <Button
        variant="ghost"
        size="icon"
        className="h-11 w-11 lg:h-8 lg:w-8 text-charcoal-500 hover:text-charcoal-800"
        onClick={() => onDuplicate(role)}
        aria-label={`تكرار الدور ${role.name}`}
      >
        <Copy aria-hidden="true" className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="h-11 w-11 lg:h-8 lg:w-8 text-charcoal-500 hover:bg-brand-50 hover:text-brand-700"
        onClick={() => onRequestDelete(role)}
        aria-label={`حذف الدور ${role.name}`}
        disabled={role.kind === "system"}
        title={role.kind === "system" ? "الأدوار النظامية لا تُحذف" : undefined}
      >
        <Trash2 aria-hidden="true" className="h-4 w-4" />
      </Button>
    </div>
  );
}

interface RolesListProps {
  roles: Role[];
  /** عدد المستخدمين المسندين لكل دور (مفتاح = معرّف الدور) */
  usersCountByRole: Record<string, number>;
  onDuplicate: (role: Role) => void;
  onDelete: (role: Role) => void;
}

export function RolesList({ roles, usersCountByRole, onDuplicate, onDelete }: RolesListProps) {
  const [deleteTarget, setDeleteTarget] = useState<Role | null>(null);
  const assignedCount = deleteTarget ? (usersCountByRole[deleteTarget.id] ?? 0) : 0;
  const isLockedOwner = deleteTarget?.id === "owner";

  function confirmDelete() {
    if (deleteTarget) onDelete(deleteTarget);
    setDeleteTarget(null);
  }

  if (roles.length === 0) {
    return (
      <EmptyState
        title="لا توجد أدوار"
        description="لم يُعرَّف أي دور بعد — الأدوار النظامية الخمسة تظهر هنا دائمًا."
      >
        <Button asChild size="sm">
          <Link href="/admin/roles/new">دور جديد</Link>
        </Button>
      </EmptyState>
    );
  }

  return (
    <>
      {/* ── Desktop: جدول ── */}
      <div className="hidden overflow-hidden rounded-xl border border-border bg-white md:block">
        <table className="w-full text-start text-sm">
          <thead>
            <tr className="border-b border-border bg-surface/60 text-xs text-muted-foreground">
              <th scope="col" className="px-4 py-3 text-start font-medium">الدور</th>
              <th scope="col" className="px-3 py-3 text-start font-medium">الوصف</th>
              <th scope="col" className="px-3 py-3 text-start font-medium">المستخدمون</th>
              <th scope="col" className="px-3 py-3 text-start font-medium">الصلاحيات</th>
              <th scope="col" className="px-3 py-3 text-start font-medium">النوع</th>
              <th scope="col" className="px-4 py-3 text-end font-medium">إجراءات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {roles.map((role) => {
              const locked = role.id === "owner" && role.kind === "system";
              return (
                <tr key={role.id} className="transition-colors hover:bg-surface/40">
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/roles/${role.id}`}
                      className="block font-medium text-charcoal-800 hover:text-brand-700"
                    >
                      {role.name}
                    </Link>
                  </td>
                  <td className="max-w-[260px] px-3 py-3">
                    <span className="line-clamp-2 text-xs leading-relaxed text-charcoal-600">
                      {role.description}
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    <span className="num-ltr font-medium text-charcoal-700">
                      {formatNumber(usersCountByRole[role.id] ?? 0)}
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    <PermissionSummary role={role} />
                  </td>
                  <td className="px-3 py-3">
                    <KindBadge role={role} />
                  </td>
                  <td className="px-4 py-3">
                    <RowActions
                      role={role}
                      locked={locked}
                      onDuplicate={onDuplicate}
                      onRequestDelete={setDeleteTarget}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ── Mobile: بطاقات ── */}
      <ul className="space-y-3 md:hidden">
        {roles.map((role) => {
          const locked = role.id === "owner" && role.kind === "system";
          return (
            <li key={role.id} className="rounded-xl border border-border bg-white p-4">
              <div className="flex items-start justify-between gap-2">
                <Link
                  href={`/admin/roles/${role.id}`}
                  className="font-medium leading-snug text-charcoal-800 hover:text-brand-700"
                >
                  {role.name}
                </Link>
                <KindBadge role={role} />
              </div>
              <p className="mt-1 text-xs leading-relaxed text-charcoal-500">{role.description}</p>
              <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1.5 border-t border-border pt-3 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <dt className="text-muted-foreground">المستخدمون</dt>
                  <dd className="num-ltr font-medium text-charcoal-700">
                    {formatNumber(usersCountByRole[role.id] ?? 0)}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <dt className="text-muted-foreground">الصلاحيات</dt>
                  <dd className="text-charcoal-700">
                    <PermissionSummary role={role} />
                  </dd>
                </div>
              </dl>
              <div className="mt-3 border-t border-border pt-2.5">
                <RowActions
                  role={role}
                  locked={locked}
                  onDuplicate={onDuplicate}
                  onRequestDelete={setDeleteTarget}
                />
              </div>
            </li>
          );
        })}
      </ul>

      {/* حوار الحجب: دور نظامي أو مسند لمستخدمين — لا حذف صامت */}
      <AlertDialog
        open={deleteTarget !== null && (deleteTarget.kind === "system" || assignedCount > 0)}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>لا يمكن حذف الدور</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2">
                {isLockedOwner ? (
                  <p>
                    دور «المالك» نظامي مقفول — صلاحيته الكاملة ضمانة وصول المالك الدائمة
                    ولا يُحذف ولا تُصفَّر مصفوفته في أي حالة.
                  </p>
                ) : deleteTarget?.kind === "system" ? (
                  <p>
                    الدور «{deleteTarget?.name}» من الأدوار النظامية الخمسة المبنية عليها
                    قوائم المستخدمين الافتراضية — حذفه محجوب دائمًا.
                  </p>
                ) : (
                  <p>
                    الدور «{deleteTarget?.name}» مسند إلى{" "}
                    <strong className="text-charcoal-800">
                      {formatNumber(assignedCount)} {assignedCount === 1 ? "مستخدم" : "مستخدمين"}
                    </strong>
                    . انقل المستخدمين إلى دور آخر أولًا ثم احذف الدور — لا يُحذف دور
                    وهو مستخدم حمايةً لصلاحيات أصحابه.
                  </p>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>فهمت</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* حذف عادي: دور مخصص غير مسند لأي مستخدم */}
      <ConfirmDialog
        open={deleteTarget !== null && deleteTarget.kind === "custom" && assignedCount === 0}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title="حذف الدور"
        description={
          deleteTarget
            ? `سيتم حذف الدور المخصص «${deleteTarget.name}» نهائيًا. لا يمكن التراجع عن هذا الإجراء.`
            : ""
        }
        confirmLabel="حذف نهائي"
        onConfirm={confirmDelete}
      />
    </>
  );
}
