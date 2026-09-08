"use client";

/**
 * RoleEditor — محرر الدور (Checkpoint 6)
 * ---------------------------------------
 * نفس المكوّن للإضافة (new) والتعديل ([id]) — نمط المحررات الموحد:
 * مسودة + لقطة حفظ + Dirty (beforeunload + تأكيد إلغاء) + Validation + Toast.
 *
 * الحقول: الاسم* (فريد بين الأدوار)، الوصف، مصفوفة الصلاحيات
 * (جدول ديسكتوب / بطاقات موبايل) + تحديد الكل / مسح الكل
 * + معاينة «يستطيع / لا يستطيع» حية.
 *
 * قيود النظام:
 * - دور المالك (نظامي): عرض فقط — مصفوفته مقفولة كامل الوصول ولا يُظهر
 *   أزرار «مسح الكل» أصلًا (لا يمكن تصفير صلاحيات المالك إطلاقًا).
 * - بقية الأدوار النظامية: قابلة للتعديل (Defaults قابلة للتغيير).
 */
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LoaderCircle, Lock, ShieldCheck } from "lucide-react";

import type { Role, RolePermissions } from "@/data/admin/types";
import type { RoleInput } from "@/context/admin-store";
import { useAdminActions, useAdminData, useAdminState } from "@/context/admin-store";
import {
  buildEmptyPermissions,
  buildFullPermissions,
  normalizePermissions,
} from "@/data/admin/permissions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { AdminPageHeader } from "@/components/admin/ui/admin-page-header";
import { ConfirmDialog } from "@/components/admin/ui/confirm-dialog";
import { EmptyState } from "@/components/admin/ui/empty-state";
import { Field } from "@/components/admin/ui/field";
import { PermissionMatrix } from "./permission-matrix";
import { PermissionPreview } from "./permission-preview";

function createDraftDefaults(): RoleInput {
  return {
    name: "",
    description: "",
    kind: "custom",
    permissions: buildEmptyPermissions(),
  };
}

function toDraft(role: Role): RoleInput {
  const { id: _id, ...rest } = role;
  return rest;
}

function validateDraft(
  draft: RoleInput,
  roles: Role[],
  excludeId?: string,
): Record<string, string> {
  const errors: Record<string, string> = {};
  const name = draft.name.trim();
  if (!name) errors.name = "اسم الدور مطلوب";
  else if (
    roles.some((role) => role.id !== excludeId && role.name.trim() === name)
  ) {
    errors.name = "يوجد دور بنفس الاسم — اختر اسمًا مميزًا";
  }
  return errors;
}

/* ─────────────────── المكون الرئيسي ─────────────────── */

interface RoleEditorProps {
  mode: "create" | "edit";
  roleId?: string;
}

export function RoleEditor({ mode, roleId }: RoleEditorProps) {
  const router = useRouter();
  const { toast } = useToast();
  const { data, hydrated } = useAdminState();
  const { addRole, updateRole } = useAdminActions();

  const role = mode === "edit" ? data.roles.find((entry) => entry.id === roleId) : undefined;
  /** دور المالك النظامي: عرض فقط — المصفوفة مقفولة كامل الوصول */
  const isLockedOwner = Boolean(role && role.id === "owner" && role.kind === "system");

  /* المسودة تُهيّأ من بيانات المخزن بعد الترطيب فقط — لا من الـ Seed (D-22) */
  const [draft, setDraft] = useState<RoleInput | null>(() =>
    mode === "create" ? createDraftDefaults() : hydrated && role ? toDraft(role) : null,
  );
  const [snapshot, setSnapshot] = useState<string>(() =>
    mode === "create"
      ? JSON.stringify(createDraftDefaults())
      : hydrated && role
        ? JSON.stringify(toDraft(role))
        : "",
  );

  /* تغيير المعرّف ضمن نفس المسار → إعادة تهيئة المسودة (نمط D-19) */
  const [prevId, setPrevId] = useState<string | undefined>(roleId);
  if (roleId !== prevId) {
    setPrevId(roleId);
    if (role) {
      const initial = toDraft(role);
      setSnapshot(JSON.stringify(initial));
      setDraft(initial);
    } else {
      setSnapshot("");
      setDraft(null);
    }
  }

  /* التهيئة المؤجلة بعد الترطيب (نمط ضبط أثناء الرسم — D-12) */
  if (mode === "edit" && hydrated && draft === null && role) {
    const initial = toDraft(role);
    setSnapshot(JSON.stringify(initial));
    setDraft(initial);
  }

  const update = (patch: Partial<RoleInput>) =>
    setDraft((prev) => (prev ? { ...prev, ...patch } : prev));

  const updatePermissions = (next: RolePermissions) => {
    if (isLockedOwner) return;
    update({ permissions: normalizePermissions(next) });
  };

  const isDirty = useMemo(
    () => draft !== null && JSON.stringify(draft) !== snapshot,
    [draft, snapshot],
  );

  useEffect(() => {
    if (!isDirty) return;
    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false);

  if (mode === "edit" && hydrated && !role) {
    return (
      <div className="mx-auto w-full max-w-6xl">
        <EmptyState
          title="الدور غير موجود"
          description="ربما حُذف هذا الدور أو أن الرابط غير صحيح."
        >
          <Button asChild size="sm">
            <Link href="/admin/roles">العودة لقائمة الأدوار</Link>
          </Button>
        </EmptyState>
      </div>
    );
  }

  if (!draft) {
    return (
      <div className="mx-auto flex w-full max-w-6xl items-center justify-center py-24 text-charcoal-300">
        <LoaderCircle aria-hidden="true" className="h-6 w-6 animate-spin" />
        <span className="sr-only">جارٍ تحميل بيانات الدور…</span>
      </div>
    );
  }

  async function handleSave() {
    if (!draft) return;
    const validation = validateDraft(draft, data.roles, roleId);
    setErrors(validation);

    const errorKeys = Object.keys(validation);
    if (errorKeys.length > 0) {
      document
        .getElementById(`role-${errorKeys[0]}`)
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
      toast({
        title: "تعذر الحفظ — راجع الحقول",
        description: validation[errorKeys[0]],
        variant: "destructive",
      });
      return;
    }

    const clean: RoleInput = {
      ...draft,
      name: draft.name.trim(),
      description: draft.description.trim(),
      permissions: normalizePermissions(draft.permissions),
    };

    if (mode === "create") {
      const result = await addRole(clean);
      if (!result.ok) {
        toast({ title: "تعذر إنشاء الدور", description: result.error, variant: "destructive" });
        return;
      }
      toast({
        title: "تم إنشاء الدور",
        description: `أُنشئ الدور المخصص «${clean.name}» — أسنده من صفحة المستخدمين.`,
      });
      router.push(`/admin/roles/${result.data}`);
    } else if (roleId) {
      const result = await updateRole(roleId, clean);
      if (!result.ok) {
        toast({ title: "تعذر الحفظ", description: result.error, variant: "destructive" });
        return;
      }
      toast({ title: "تم حفظ الدور", description: `حُدّثت بيانات وصلاحيات «${clean.name}».` });
      router.push("/admin/roles");
    }
  }

  function handleCancel() {
    if (isDirty) {
      setCancelConfirmOpen(true);
      return;
    }
    router.push("/admin/roles");
  }

  return (
    <div className="mx-auto w-full max-w-6xl pb-24">
      <AdminPageHeader
        title={
          mode === "create" ? "دور جديد" : draft.name || "تعديل الدور"
        }
        description={
          isLockedOwner
            ? "دور نظامي مقفول — صلاحية المالك الكاملة ضمانة وصول دائمة لا تُعدَّل."
            : mode === "create"
              ? "عرّف الدور المخصص وحدّد صلاحياته وحدة بوحدة — تُحفظ كل الحقول معًا."
              : "عدّل بيانات الدور ومصفوفة صلاحياته — يتأثر كل مستخدميه تلقائيًا."
        }
      >
        <Button asChild variant="outline" size="sm">
          <Link href="/admin/roles">قائمة الأدوار</Link>
        </Button>
      </AdminPageHeader>

      {isLockedOwner ? (
        <div
          role="note"
          className="mb-4 flex items-start gap-2 rounded-xl border border-charcoal-200 bg-charcoal-50 px-4 py-3 text-sm text-charcoal-700"
        >
          <Lock aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
          <p className="leading-relaxed">
            <strong>دور نظامي مقفول:</strong> لا يمكن تعديل اسمه أو وصفه أو مصفوفته أو حذفه —
            يضمن النظام بقاء وصول كامل دائمًا لمالك المتجر. أنشئ أدوارًا مخصصة
            لصلاحيات مختلفة.
          </p>
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-3">
        {/* العمود الرئيسي */}
        <div className="space-y-4 lg:col-span-2">
          <section className="rounded-xl border border-border bg-white p-4 sm:p-6">
            <h2 className="mb-4 text-sm font-semibold text-charcoal-900">البيانات الأساسية</h2>
            <div className="grid gap-4">
              <Field id="role-name" label="اسم الدور" required error={errors.name}>
                <Input
                  id="role-name"
                  value={draft.name}
                  onChange={(event) => update({ name: event.target.value })}
                  placeholder="مثال: تسويق"
                  disabled={isLockedOwner}
                  aria-invalid={Boolean(errors.name)}
                />
              </Field>
              <Field
                id="role-description"
                label="وصف الدور"
                hint="سطر يوضح مسؤوليات الدور — يظهر في قائمة الأدوار"
              >
                <Textarea
                  id="role-description"
                  value={draft.description}
                  onChange={(event) => update({ description: event.target.value })}
                  rows={2}
                  placeholder="مثال: إدارة محتوى التسويق والمدونة والوسائط"
                  disabled={isLockedOwner}
                />
              </Field>
            </div>
          </section>

          <section className="rounded-xl border border-border bg-white p-4 sm:p-6">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h2 className="flex items-center gap-1.5 text-sm font-semibold text-charcoal-900">
                <ShieldCheck aria-hidden="true" className="h-4 w-4 text-brand-600" />
                مصفوفة الصلاحيات
              </h2>
              {!isLockedOwner ? (
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => updatePermissions(buildFullPermissions())}
                  >
                    تحديد الكل
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => updatePermissions(buildEmptyPermissions())}
                  >
                    مسح الكل
                  </Button>
                </div>
              ) : null}
            </div>
            <PermissionMatrix
              permissions={draft.permissions}
              onChange={isLockedOwner ? undefined : updatePermissions}
            />
          </section>
        </div>

        {/* العمود الجانبي: معاينة الصلاحيات */}
        <aside className="space-y-4">
          <section className="rounded-xl border border-border bg-white p-4 sm:p-6">
            <h2 className="mb-3 text-sm font-semibold text-charcoal-900">ملخص مباشر</h2>
            <PermissionPreview permissions={draft.permissions} />
          </section>
          <section className="rounded-xl border border-border bg-surface p-4 text-xs leading-relaxed text-muted-foreground">
            <p className="mb-2 font-medium text-charcoal-700">ملاحظة أمنية</p>
            <p>
              الصلاحيات مشتقة من الدور — كل مستخدمي هذا الدور يتحدث وصولهم تلقائيًا
              مع كل تعديل للمصفوفة. في هذه المرحلة Mock هذا تعريف بيانات وواجهة
              إدارة فقط، والتحقق الحقيقي من الصلاحيات سيُنفَّذ Server-side بعد
              إضافة Authentication في مرحلة Backend.
            </p>
          </section>
        </aside>
      </div>

      {/* الشريط اللاصق للحفظ */}
      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-white/95 backdrop-blur md:pe-64">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
          <span className="text-xs text-muted-foreground">
            {isDirty ? "لديك تغييرات غير محفوظة" : "لا تغييرات معلّقة"}
          </span>
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" size="sm" onClick={handleCancel}>
              إلغاء
            </Button>
            <Button type="button" size="sm" onClick={handleSave} disabled={isLockedOwner}>
              {mode === "create" ? "إنشاء الدور" : "حفظ التغييرات"}
            </Button>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={cancelConfirmOpen}
        onOpenChange={setCancelConfirmOpen}
        title="إلغاء التعديلات؟"
        description="لديك تغييرات غير محفوظة — إلغاء الحفظ يعني فقدانها."
        confirmLabel="تجاهل التغييرات"
        onConfirm={() => router.push("/admin/roles")}
      />
    </div>
  );
}
