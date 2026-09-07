"use client";

/**
 * UserEditor — محرر المستخدم (Checkpoint 6)
 * ------------------------------------------
 * نفس المكوّن للإضافة (new) والتعديل ([id]) — نمط المحررات الموحد:
 * مسودة + لقطة حفظ + Dirty (beforeunload + تأكيد إلغاء) + Validation + Toast.
 *
 * الحقول: الاسم*، البريد* (صيغة صحيحة + فريد بين المستخدمين)، الدور*
 * (Select)، الحالة (نشط/مدعو/معلّق)، صورة Mock (اختيارية).
 *
 * الصلاحيات مشتقة من الدور — لا صلاحيات مباشرة على المستخدم —
 * وتظهر «ملخص مباشر» يتحدث فور تغيير الدور لإثبات الاشتقاق.
 *
 * حماية آخر مالك: عند تحرير آخر مالك يُقفل اختيار الدور على «المالك»
 * وتُمنع حالة «معلّق» — مع تلميح واضح لسبب القفل.
 *
 * بلا Password ولا Authentication credentials إطلاقًا (Mock).
 */
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LoaderCircle, Lock } from "lucide-react";

import type { AdminUser, AdminUserStatus } from "@/data/admin/types";
import type { UserInput } from "@/context/admin-store";
import { useAdminActions, useAdminData, useAdminState } from "@/context/admin-store";
import { getCurrentUser, isLastOwner } from "@/data/admin/selectors";
import { formatDate } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { AdminPageHeader } from "@/components/admin/ui/admin-page-header";
import { ConfirmDialog } from "@/components/admin/ui/confirm-dialog";
import { EmptyState } from "@/components/admin/ui/empty-state";
import { Field } from "@/components/admin/ui/field";
import { ImageUpload } from "@/components/admin/ui/image-upload";
import { PermissionPreview } from "@/components/admin/roles/permission-preview";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const STATUS_OPTIONS: Array<{ value: AdminUserStatus; label: string }> = [
  { value: "active", label: "نشط" },
  { value: "invited", label: "مدعو" },
  { value: "suspended", label: "معلّق" },
];

function createDraftDefaults(): UserInput {
  return {
    name: "",
    email: "",
    avatar: "",
    roleId: "",
    status: "invited",
    lastActiveAt: undefined,
  };
}

function toDraft(user: AdminUser): UserInput {
  const { id: _id, createdAt: _createdAt, ...rest } = user;
  return { ...rest, avatar: rest.avatar ?? "" };
}

function validateDraft(
  draft: UserInput,
  users: AdminUser[],
  excludeId?: string,
): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!draft.name.trim()) errors.name = "اسم المستخدم مطلوب";
  const email = draft.email.trim().toLowerCase();
  if (!email) {
    errors.email = "البريد الإلكتروني مطلوب";
  } else if (!EMAIL_PATTERN.test(email)) {
    errors.email = "أدخل بريدًا إلكترونيًا صحيحًا";
  } else if (users.some((user) => user.id !== excludeId && user.email.toLowerCase() === email)) {
    errors.email = "هذا البريد مستخدم لحساب آخر — يجب أن يكون فريدًا";
  }
  if (!draft.roleId) errors.roleId = "اختيار الدور مطلوب";
  return errors;
}

/* ─────────────────── المكون الرئيسي ─────────────────── */

interface UserEditorProps {
  mode: "create" | "edit";
  userId?: string;
}

export function UserEditor({ mode, userId }: UserEditorProps) {
  const router = useRouter();
  const { toast } = useToast();
  const { data, hydrated } = useAdminState();
  const { addUser, updateUser } = useAdminActions();

  const user = mode === "edit" ? data.users.find((entry) => entry.id === userId) : undefined;
  const lastOwner = user ? isLastOwner(data, user) : false;
  const currentUser = getCurrentUser(data);
  const isSelf = Boolean(user && currentUser && user.id === currentUser.id);

  /* المسودة تُهيّأ من بيانات المخزن بعد الترطيب فقط — لا من الـ Seed (D-22) */
  const [draft, setDraft] = useState<UserInput | null>(() =>
    mode === "create" ? createDraftDefaults() : hydrated && user ? toDraft(user) : null,
  );
  const [snapshot, setSnapshot] = useState<string>(() =>
    mode === "create"
      ? JSON.stringify(createDraftDefaults())
      : hydrated && user
        ? JSON.stringify(toDraft(user))
        : "",
  );

  /* تغيير المعرّف ضمن نفس المسار → إعادة تهيئة المسودة (نمط D-19) */
  const [prevId, setPrevId] = useState<string | undefined>(userId);
  if (userId !== prevId) {
    setPrevId(userId);
    if (user) {
      const initial = toDraft(user);
      setSnapshot(JSON.stringify(initial));
      setDraft(initial);
    } else {
      setSnapshot("");
      setDraft(null);
    }
  }

  /* التهيئة المؤجلة بعد الترطيب (نمط ضبط أثناء الرسم — D-12) */
  if (mode === "edit" && hydrated && draft === null && user) {
    const initial = toDraft(user);
    setSnapshot(JSON.stringify(initial));
    setDraft(initial);
  }

  const update = (patch: Partial<UserInput>) =>
    setDraft((prev) => (prev ? { ...prev, ...patch } : prev));

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

  if (mode === "edit" && hydrated && !user) {
    return (
      <div className="mx-auto w-full max-w-6xl">
        <EmptyState
          title="المستخدم غير موجود"
          description="ربما حُذف هذا الحساب أو أن الرابط غير صحيح."
        >
          <Button asChild size="sm">
            <Link href="/admin/users">العودة لقائمة المستخدمين</Link>
          </Button>
        </EmptyState>
      </div>
    );
  }

  if (!draft) {
    return (
      <div className="mx-auto flex w-full max-w-6xl items-center justify-center py-24 text-charcoal-300">
        <LoaderCircle aria-hidden="true" className="h-6 w-6 animate-spin" />
        <span className="sr-only">جارٍ تحميل بيانات المستخدم…</span>
      </div>
    );
  }

  /* الصلاحيات المشتقة من الدور المختار — تتحدث لحظيًا مع تغيير الاختيار */
  const selectedRole = data.roles.find((role) => role.id === draft.roleId);
  const selectedRoleName = selectedRole?.name ?? "";

  function handleSave() {
    if (!draft) return;
    const validation = validateDraft(draft, data.users, userId);
    setErrors(validation);

    const errorKeys = Object.keys(validation);
    if (errorKeys.length > 0) {
      document
        .getElementById(`user-${errorKeys[0]}`)
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
      toast({
        title: "تعذر الحفظ — راجع الحقول",
        description: validation[errorKeys[0]],
        variant: "destructive",
      });
      return;
    }

    const clean: UserInput = {
      ...draft,
      name: draft.name.trim(),
      email: draft.email.trim().toLowerCase(),
      avatar: draft.avatar || undefined,
    };

    if (mode === "create") {
      const newId = addUser(clean);
      toast({
        title: "تم إضافة المستخدم",
        description: `أُضيف «${clean.name}» بدور «${selectedRoleName}» — بلا كلمة مرور في هذه المرحلة Mock.`,
      });
      router.push(`/admin/users/${newId}`);
    } else if (userId) {
      updateUser(userId, clean);
      toast({ title: "تم حفظ المستخدم", description: `حُدّثت بيانات «${clean.name}» بنجاح.` });
      router.push("/admin/users");
    }
  }

  function handleCancel() {
    if (isDirty) {
      setCancelConfirmOpen(true);
      return;
    }
    router.push("/admin/users");
  }

  return (
    <div className="mx-auto w-full max-w-6xl pb-24">
      <AdminPageHeader
        title={mode === "create" ? "مستخدم جديد" : draft.name || "تعديل بيانات المستخدم"}
        description={
          mode === "create"
            ? "أضف مستخدمًا وأسنده إلى دور — صلاحياته تُشتق من دوره تلقائيًا. بلا كلمة مرور في هذه المرحلة Mock."
            : "عدّل بيانات المستخدم أو دوره — صلاحياته تتغير فورًا مع تغيير دوره."
        }
      >
        {mode === "edit" && user ? (
          <span className="text-xs text-muted-foreground">
            أُنشئ الحساب في <span className="num-ltr">{formatDate(user.createdAt)}</span>
          </span>
        ) : null}
      </AdminPageHeader>

      {lastOwner ? (
        <div
          role="note"
          className="mb-4 flex items-start gap-2 rounded-xl border border-charcoal-200 bg-charcoal-50 px-4 py-3 text-sm text-charcoal-700"
        >
          <Lock aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
          <p className="leading-relaxed">
            <strong>حماية آخر مالك:</strong> هذا الحساب هو المالك الوحيد — لا يمكن
            حذفه أو تعليقه أو نقله إلى دور آخر، ليظل وصول كامل دائمًا للوحة التحكم.
          </p>
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-3">
        {/* العمود الرئيسي */}
        <div className="space-y-4 lg:col-span-2">
          <section className="rounded-xl border border-border bg-white p-4 sm:p-6">
            <h2 className="mb-4 text-sm font-semibold text-charcoal-900">البيانات الأساسية</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field id="user-name" label="الاسم الكامل" required error={errors.name}>
                <Input
                  id="user-name"
                  value={draft.name}
                  onChange={(event) => update({ name: event.target.value })}
                  placeholder="مثال: سارة العمري"
                  aria-invalid={Boolean(errors.name)}
                />
              </Field>
              <Field
                id="user-email"
                label="البريد الإلكتروني"
                required
                error={errors.email}
                hint="يُستخدم لاحقًا لتسجيل الدخول عند إضافة Authentication"
              >
                <Input
                  id="user-email"
                  type="email"
                  value={draft.email}
                  onChange={(event) => update({ email: event.target.value })}
                  placeholder="name@baytalmosawer.com"
                  dir="ltr"
                  className="font-latin"
                  inputMode="email"
                  aria-invalid={Boolean(errors.email)}
                />
              </Field>
              <Field id="user-roleId" label="الدور" required error={errors.roleId}>
                <Select
                  value={draft.roleId}
                  onValueChange={(value) => update({ roleId: value })}
                  disabled={lastOwner}
                >
                  <SelectTrigger id="user-roleId" aria-invalid={Boolean(errors.roleId)}>
                    <SelectValue placeholder="اختر الدور…" />
                  </SelectTrigger>
                  <SelectContent>
                    {data.roles.map((role) => (
                      <SelectItem key={role.id} value={role.id}>
                        {role.name}
                        {role.kind === "system" ? " — نظامي" : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field
                id="user-status"
                label="الحالة"
                error={lastOwner ? undefined : undefined}
                hint={
                  lastOwner
                    ? "حساب المالك الوحيد لا يمكن تعليقه"
                    : isSelf
                      ? "أنت هذا الحساب — التعليق سيغير هويتك الحالية (Mock)"
                      : undefined
                }
              >
                <Select
                  value={draft.status}
                  onValueChange={(value) => update({ status: value as AdminUserStatus })}
                  disabled={lastOwner}
                >
                  <SelectTrigger id="user-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((option) => (
                      <SelectItem
                        key={option.value}
                        value={option.value}
                        disabled={lastOwner && option.value === "suspended"}
                      >
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </div>
          </section>

          <section className="rounded-xl border border-border bg-white p-4 sm:p-6">
            <h2 className="mb-4 text-sm font-semibold text-charcoal-900">
              صورة المستخدم <span className="text-xs font-normal text-muted-foreground">(اختيارية — Mock)</span>
            </h2>
            <ImageUpload
              id="user-avatar"
              label="صورة الحساب"
              value={draft.avatar ?? ""}
              onChange={({ value }) => update({ avatar: value })}
              withAlt={false}
              aspect="square"
              hint="معاينة محلية فقط — بلا رفع فعلي في هذه المرحلة."
            />
          </section>
        </div>

        {/* العمود الجانبي: الصلاحيات المشتقة من الدور */}
        <aside className="space-y-4">
          <section className="rounded-xl border border-border bg-white p-4 sm:p-6">
            <h2 className="mb-1 text-sm font-semibold text-charcoal-900">صلاحيات الدور المختار</h2>
            <p className="mb-3 text-xs text-muted-foreground">
              {selectedRoleName
                ? `مشتقة تلقائيًا من دور «${selectedRoleName}» — تتبدل فور تغيير الدور.`
                : "اختر دورًا لعرض صلاحياته المشتقة."}
            </p>
            {selectedRole ? (
              <PermissionPreview permissions={selectedRole.permissions} />
            ) : (
              <p className="rounded-lg border border-border bg-surface px-3 py-2 text-xs text-muted-foreground">
                لم يُختر دور بعد.
              </p>
            )}
          </section>
          <section className="rounded-xl border border-border bg-surface p-4 text-xs leading-relaxed text-muted-foreground">
            <p className="mb-2 font-medium text-charcoal-700">ملاحظة أمنية</p>
            <p>
              لا كلمات مرور ولا بيانات دخول في هذه المرحلة — الحساب تعريف Mock
              فقط. التحقق الحقيقي من الهوية والصلاحيات سيُنفَّذ Server-side بعد
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
            <Button type="button" size="sm" onClick={handleSave}>
              {mode === "create" ? "إضافة المستخدم" : "حفظ التغييرات"}
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
        onConfirm={() => router.push("/admin/users")}
      />
    </div>
  );
}
