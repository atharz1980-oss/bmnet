"use client";

/**
 * UsersList — قائمة المستخدمين (Checkpoint 6)
 * --------------------------------------------
 * الأعمدة: المستخدم (صورة+اسم+بريد)، الدور، الحالة، آخر نشاط، إجراءات
 * (تعديل / تعليق-تفعيل / حذف). لا تكرار للمستخدمين (قرار المواصفة).
 *
 * قواعد الحماية (الأكثر أمانًا — قرار موثق):
 * - آخر مالك: يُحجب حذفه وتعليقه نهائيًا — يبقى Owner واحد على الأقل.
 * - حذف مستخدم عادي: ConfirmDialog (Mock — بلا credentials إطلاقًا).
 */
import Link from "next/link";
import { useState } from "react";
import { Pencil, ShieldBan, ShieldCheck, Trash2 } from "lucide-react";

import type { AdminUser } from "@/data/admin/types";
import { formatDate, formatDateTime } from "@/lib/format";
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
import { StatusBadge } from "@/components/admin/ui/status-badge";
import { ConfirmDialog } from "@/components/admin/ui/confirm-dialog";
import { EmptyState } from "@/components/admin/ui/empty-state";

/** صورة مصغّرة — Initials عند غياب الصورة (Mock avatar) */
function UserAvatar({ user, size = "md" }: { user: AdminUser; size?: "md" | "lg" }) {
  const initials = user.name
    .split(" ")
    .slice(0, 2)
    .map((part) => part.charAt(0))
    .join("");
  return (
    <span
      className={cn(
        "relative block shrink-0 overflow-hidden rounded-full border border-border bg-surface",
        size === "md" ? "h-10 w-10" : "h-14 w-14",
      )}
      aria-hidden="true"
    >
      {user.avatar ? (
        <img
          src={user.avatar}
          alt={`صورة ${user.name}`}
          className="h-full w-full object-cover"
          loading="lazy"
        />
      ) : (
        <span className="flex h-full w-full items-center justify-center text-xs font-bold text-charcoal-500">
          {initials}
        </span>
      )}
    </span>
  );
}

interface RowActionsProps {
  user: AdminUser;
  roleName: string;
  /** آخر مالك = الحماية القصوى (لا تعليق ولا حذف) */
  isLastOwner: boolean;
  onToggleStatus: (user: AdminUser) => void;
  onRequestDelete: (user: AdminUser) => void;
}

function RowActions({
  user,
  roleName,
  isLastOwner,
  onToggleStatus,
  onRequestDelete,
}: RowActionsProps) {
  const isSuspended = user.status === "suspended";
  return (
    <div className="flex items-center justify-end gap-1">
      <Button
        asChild
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-charcoal-500 hover:text-charcoal-800"
      >
        <Link href={`/admin/users/${user.id}`} aria-label={`تعديل بيانات ${user.name}`}>
          <Pencil aria-hidden="true" className="h-4 w-4" />
        </Link>
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-charcoal-500 hover:text-charcoal-800"
        onClick={() => onToggleStatus(user)}
        disabled={isLastOwner}
        title={
          isLastOwner
            ? "لا يمكن تعليق آخر مالك — يبقى وصول كامل دائمًا"
            : undefined
        }
        aria-label={
          isSuspended
            ? `إعادة تفعيل الحساب لـ ${user.name}`
            : `تعليق حساب ${user.name}`
        }
      >
        {isSuspended ? (
          <ShieldCheck aria-hidden="true" className="h-4 w-4" />
        ) : (
          <ShieldBan aria-hidden="true" className="h-4 w-4" />
        )}
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-charcoal-500 hover:bg-brand-50 hover:text-brand-700"
        onClick={() => onRequestDelete(user)}
        aria-label={`حذف المستخدم ${user.name}`}
      >
        <Trash2 aria-hidden="true" className="h-4 w-4" />
      </Button>
    </div>
  );
}

interface UsersListProps {
  users: AdminUser[];
  /** اسم الدور لكل مستخدم (مفتاح = معرّف المستخدم) */
  roleNameByUser: Record<string, string>;
  /** المستخدمون الذين هم آخر مالك (مجموعة معرفات) */
  lastOwnerIds: Set<string>;
  onToggleStatus: (user: AdminUser) => void;
  onDelete: (user: AdminUser) => void;
}

export function UsersList({
  users,
  roleNameByUser,
  lastOwnerIds,
  onToggleStatus,
  onDelete,
}: UsersListProps) {
  const [deleteTarget, setDeleteTarget] = useState<AdminUser | null>(null);
  const targetIsLastOwner = deleteTarget ? lastOwnerIds.has(deleteTarget.id) : false;

  function confirmDelete() {
    if (deleteTarget) onDelete(deleteTarget);
    setDeleteTarget(null);
  }

  if (users.length === 0) {
    return (
      <EmptyState
        title="لا يوجد مستخدمون"
        description="لم يُضف أي مستخدم بعد — أضف أول مستخدم وأسنده إلى دور."
      >
        <Button asChild size="sm">
          <Link href="/admin/users/new">مستخدم جديد</Link>
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
              <th scope="col" className="px-4 py-3 text-start font-medium">المستخدم</th>
              <th scope="col" className="px-3 py-3 text-start font-medium">الدور</th>
              <th scope="col" className="px-3 py-3 text-start font-medium">الحالة</th>
              <th scope="col" className="px-3 py-3 text-start font-medium">آخر نشاط</th>
              <th scope="col" className="px-4 py-3 text-end font-medium">إجراءات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {users.map((user) => {
              const isLastOwner = lastOwnerIds.has(user.id);
              return (
                <tr key={user.id} className="transition-colors hover:bg-surface/40">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <UserAvatar user={user} />
                      <div className="min-w-0">
                        <Link
                          href={`/admin/users/${user.id}`}
                          className="block max-w-[200px] truncate font-medium text-charcoal-800 hover:text-brand-700"
                        >
                          {user.name}
                        </Link>
                        <span className="num-ltr block max-w-[220px] truncate text-xs text-charcoal-500">
                          {user.email}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-3 text-charcoal-600">
                    {roleNameByUser[user.id] ?? "—"}
                  </td>
                  <td className="px-3 py-3">
                    <StatusBadge status={user.status} />
                  </td>
                  <td className="px-3 py-3 text-xs text-charcoal-600">
                    {user.lastActiveAt ? formatDateTime(user.lastActiveAt) : "لم يسجّل بعد"}
                  </td>
                  <td className="px-4 py-3">
                    <RowActions
                      user={user}
                      roleName={roleNameByUser[user.id] ?? ""}
                      isLastOwner={isLastOwner}
                      onToggleStatus={onToggleStatus}
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
        {users.map((user) => {
          const isLastOwner = lastOwnerIds.has(user.id);
          return (
            <li key={user.id} className="rounded-xl border border-border bg-white p-4">
              <div className="flex items-start gap-3">
                <UserAvatar user={user} size="lg" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <Link
                      href={`/admin/users/${user.id}`}
                      className="block font-medium leading-snug text-charcoal-800 hover:text-brand-700"
                    >
                      {user.name}
                    </Link>
                    <StatusBadge status={user.status} />
                  </div>
                  <p className="num-ltr mt-0.5 truncate text-xs text-charcoal-500">{user.email}</p>
                  <p className="mt-1 text-xs text-charcoal-600">
                    الدور: <strong className="font-medium">{roleNameByUser[user.id] ?? "—"}</strong>
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {user.lastActiveAt
                      ? `آخر نشاط: ${formatDateTime(user.lastActiveAt)}`
                      : "لم يسجّل بعد"}
                  </p>
                </div>
              </div>
              <div className="mt-3 border-t border-border pt-2.5">
                <RowActions
                  user={user}
                  roleName={roleNameByUser[user.id] ?? ""}
                  isLastOwner={isLastOwner}
                  onToggleStatus={onToggleStatus}
                  onRequestDelete={setDeleteTarget}
                />
              </div>
            </li>
          );
        })}
      </ul>

      {/* حوار الحجب: آخر مالك — لا حذف */}
      <AlertDialog
        open={deleteTarget !== null && targetIsLastOwner}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>لا يمكن حذف هذا المستخدم</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2">
                <p>
                  «{deleteTarget?.name}» هو <strong>آخر مستخدم بدور المالك</strong> —
                  النظام يضمن بقاء Owner واحد على الأقل بوصول كامل دائم.
                </p>
                <p className="text-charcoal-600">
                  أسند دور المالك لمستخدم آخر أولًا، ثم يمكنك حذف هذا الحساب.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>فهمت</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* حذف عادي: مستخدم ليس آخر مالك */}
      <ConfirmDialog
        open={deleteTarget !== null && !targetIsLastOwner}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title="حذف المستخدم"
        description={
          deleteTarget
            ? `سيتم حذف حساب «${deleteTarget.name}» (${deleteTarget.email}) نهائيًا من لوحة التحكم. لا يمكن التراجع عن هذا الإجراء.`
            : ""
        }
        confirmLabel="حذف نهائي"
        onConfirm={confirmDelete}
      />
    </>
  );
}
