"use client";

/**
 * useSettingsDraft — نمط المسودة/اللقطة الموحد لصفحات الإعدادات
 * --------------------------------------------------------------
 * نفس نمط المحررات (D-22): التهيئة بعد الترطيب فقط حتى لا يمسح أول
 * حفظ تعديلات المالك المخزنة. يوفر: مسودة + لقطة + Dirty + beforeunload
 * + تأكيد إلغاء + حفظ عبر action المخزن.
 *
 * الحقول داخل كل صفحة إعدادات تُحرر مباشرة في المسودة (لا حفظ جزئي
 * متسرب — قرار D-25 نفسه) ثم يُحفظ كل شيء دفعة واحدة بـ update(patch).
 */
import { useEffect, useMemo, useState } from "react";

import { useAdminActions, useAdminState } from "@/context/admin-store";
import { useToast } from "@/hooks/use-toast";
import type { ActionResult } from "@/lib/cms/result";
import type { AdminData } from "@/data/admin/types";

interface SettingsDraftOptions<T> {
  /** اختيار القيمة المحفوظة الحالية من بيانات المخزن */
  select: (data: AdminData) => T;
  /** action الحفظ (updateGeneral / updateContact / ...) — async مع ActionResult */
  update: (patch: T) => Promise<ActionResult<unknown>> | void;
  /** تحويل اختياري عند الحفظ (تطبيع هواتف مثلاً) */
  sanitize?: (draft: T) => T;
  /** ماذا يحدث بعد الحفظ الناجح */
  successToast?: { title: string; description?: string };
}

export function useSettingsDraft<T extends object>({
  select,
  update,
  sanitize,
  successToast,
}: SettingsDraftOptions<T>) {
  const { data, hydrated } = useAdminState();
  const { toast } = useToast();
  const saved = useMemo(() => select(data), [data, select]);

  /* المسودة بعد الترطيب فقط (D-22) — null قبل الجاهزية */
  const [draft, setDraft] = useState<T | null>(() => (hydrated ? saved : null));
  const [snapshot, setSnapshot] = useState<string>(() => (hydrated ? JSON.stringify(saved) : ""));

  /* التهيئة المؤجلة بعد الترطيب (نمط D-12: ضبط أثناء الرسم) */
  if (hydrated && draft === null) {
    setDraft(saved);
    setSnapshot(JSON.stringify(saved));
  }

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

  const patchDraft = (patch: Partial<T>) =>
    setDraft((prev) => {
      if (!prev) return prev;
      /* مسودات صفحات المدفوعات مصفوفة (مزودون) — التحديث فيها استبدال كامل
         لا دمج كائن، وإلا انهار map في العرض (علة مكتشفة بالاختبار) */
      if (Array.isArray(prev)) return patch as T;
      return { ...prev, ...patch };
    });

  const [saving, setSaving] = useState(false);

  async function handleSave(explicit?: T) {
    /* explicit: يسمح بالحفظ بقيمة مبنية خارج الإغلاق (مثل ختم آخر تحديث
       في المحرر القانوني) — تفاديًا لقراءة مسودة قديمة من الإغلاق */
    const source = explicit ?? draft;
    if (!source || saving) return;
    const clean = sanitize ? sanitize(source) : source;
    setDraft(clean);
    setSaving(true);
    let failure: string | null = null;
    try {
      const result = await update(clean);
      if (result && !result.ok) failure = result.error;
    } catch (error) {
      failure = error instanceof Error ? error.message : "خطأ غير معروف";
    } finally {
      setSaving(false);
    }
    if (failure) {
      toast({ title: "تعذر الحفظ", description: failure, variant: "destructive" });
      return;
    }
    setSnapshot(JSON.stringify(clean));
    toast({
      title: successToast?.title ?? "تم حفظ الإعدادات",
      description: successToast?.description,
    });
  }

  /** إلغاء: يعيد آخر حالة محفوظة دون مغادرة الصفحة (نمط D-25) */
  function confirmCancel() {
    setDraft(saved);
    setSnapshot(JSON.stringify(saved));
    setCancelConfirmOpen(false);
  }

  /**
   * طلب الإلغاء: مع تعديلات غير محفوظة يفتح حوار تأكيد (نفس نمط
   * المحررات) — ودون تعديلات يُلغى فورًا.
   */
  const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false);
  function tryCancel() {
    if (isDirty) {
      setCancelConfirmOpen(true);
      return;
    }
    confirmCancel();
  }

  return {
    draft,
    isDirty,
    patchDraft,
    handleSave,
    tryCancel,
    cancelConfirmOpen,
    setCancelConfirmOpen,
    confirmCancel,
    saving,
  };
}
