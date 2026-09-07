"use client";

/**
 * SessionDialog — حوار إضافة/تعديل موعد الدورة (الدفعة)
 * ------------------------------------------------------
 * التحقق الفوري:
 *  - تاريخ البداية مطلوب، والنهاية ≥ البداية.
 *  - وقت النهاية بعد وقت البداية إذا انعقاد بنفس اليوم.
 *  - المقاعد ≥ 1، والمسجلون ≤ المقاعد (لا يُقبل تجاوز السعة).
 * عند اكتمال المقاعد تُعرض الحالة «ممتلئة» مشتقة في البطاقة —
 * هذا الحوار يغيّر الحالة المخزنة فقط بقرار صريح من المالك.
 */
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/admin/ui/field";
import { SESSION_STATUS_OPTIONS } from "../course-meta";
import { parseIntOrZero } from "./editor-helpers";
import type { CourseSession, SessionStatus } from "@/data/admin/types";

const DEFAULT_LOCATION = "مركز بيت المصور — حي الشرفية — جدة";

interface SessionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** الجلسة المُعدَّلة — null عند الإضافة */
  initial?: CourseSession | null;
  onSave: (session: CourseSession) => void;
}

type SessionForm = Pick<
  CourseSession,
  | "batchName"
  | "startDate"
  | "endDate"
  | "startTime"
  | "endTime"
  | "location"
  | "city"
  | "seats"
  | "registered"
  | "price"
> & { status: SessionStatus };

function defaultForm(): SessionForm {
  return {
    batchName: "",
    startDate: "",
    endDate: "",
    startTime: "18:00",
    endTime: "21:00",
    location: DEFAULT_LOCATION,
    city: "جدة",
    seats: 12,
    registered: 0,
    price: undefined,
    status: "open",
  };
}

export function SessionDialog({
  open,
  onOpenChange,
  initial,
  onSave,
}: SessionDialogProps) {
  const [form, setForm] = useState<SessionForm>(defaultForm);
  const [errors, setErrors] = useState<Record<string, string>>({});

  /* إعادة تهيئة النموذج عند كل فتح/تبديل هدف — بنمط «ضبط الحالة أثناء
     الرسم» المعتمد (D-12) بدل setState داخل effect */
  const syncKey = open ? `open-${initial?.id ?? "new"}` : "closed";
  const [prevSyncKey, setPrevSyncKey] = useState<string | null>(null);
  if (prevSyncKey !== syncKey) {
    setPrevSyncKey(syncKey);
    if (open) {
      setForm(
        initial
          ? {
              batchName: initial.batchName ?? "",
              startDate: initial.startDate,
              endDate: initial.endDate ?? "",
              startTime: initial.startTime,
              endTime: initial.endTime,
              location: initial.location,
              city: initial.city,
              seats: initial.seats,
              registered: initial.registered,
              price: initial.price,
              status: initial.status,
            }
          : defaultForm(),
      );
      setErrors({});
    }
  }

  const set = (patch: Partial<SessionForm>) => setForm((prev) => ({ ...prev, ...patch }));

  function validate(): boolean {
    const next: Record<string, string> = {};
    if (!form.startDate) next.startDate = "تاريخ البداية مطلوب";
    if (form.endDate && form.startDate && form.endDate < form.startDate) {
      next.endDate = "تاريخ النهاية قبل تاريخ البداية";
    }
    if (form.seats < 1) next.seats = "سعة المقاعد يجب أن تكون 1 على الأقل";
    if (form.registered < 0) next.registered = "عدد المسجلين غير صالح";
    if (form.registered > form.seats) {
      next.registered = "المسجلون يتجاوزون سعة المقاعد";
    }
    if (form.startTime && form.endTime && (!form.endDate || form.endDate === form.startDate)) {
      if (form.endTime <= form.startTime) {
        next.endTime = "وقت النهاية يجب أن يكون بعد وقت البداية";
      }
    }
    if (form.price !== undefined && form.price < 0) next.price = "السعر لا يمكن أن يكون سالبًا";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function handleSave() {
    if (!validate()) return;
    const session: CourseSession = {
      id: initial?.id ?? `session-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
      batchName: (form.batchName ?? "").trim() || undefined,
      startDate: form.startDate,
      endDate: form.endDate || undefined,
      startTime: form.startTime,
      endTime: form.endTime,
      location: form.location.trim() || DEFAULT_LOCATION,
      city: form.city.trim() || "جدة",
      seats: form.seats,
      registered: form.registered,
      price: form.price,
      status: form.status,
    };
    onSave(session);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{initial ? "تعديل الموعد" : "إضافة موعد جديد"}</DialogTitle>
          <DialogDescription>
            بيانات دفعة انعقاد مستقلة عن الدورة — المقاعد المتبقية تُحسب تلقائيًا.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Field id="s-batch" label="اسم الدفعة">
            <Input
              id="s-batch"
              value={form.batchName}
              onChange={(event) => set({ batchName: event.target.value })}
              placeholder="مثال: دفعة سبتمبر — المسائية"
              className="bg-white"
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="s-start" label="تاريخ البداية" required error={errors.startDate}>
              <Input
                id="s-start"
                type="date"
                value={form.startDate}
                onChange={(event) => set({ startDate: event.target.value })}
                aria-invalid={Boolean(errors.startDate)}
                className="num-ltr bg-white"
              />
            </Field>
            <Field id="s-end" label="تاريخ النهاية" error={errors.endDate}>
              <Input
                id="s-end"
                type="date"
                value={form.endDate}
                onChange={(event) => set({ endDate: event.target.value })}
                min={form.startDate || undefined}
                aria-invalid={Boolean(errors.endDate)}
                className="num-ltr bg-white"
              />
            </Field>
            <Field id="s-start-time" label="وقت البداية" required>
              <Input
                id="s-start-time"
                type="time"
                value={form.startTime}
                onChange={(event) => set({ startTime: event.target.value })}
                className="num-ltr bg-white"
              />
            </Field>
            <Field id="s-end-time" label="وقت النهاية" required error={errors.endTime}>
              <Input
                id="s-end-time"
                type="time"
                value={form.endTime}
                onChange={(event) => set({ endTime: event.target.value })}
                aria-invalid={Boolean(errors.endTime)}
                className="num-ltr bg-white"
              />
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="s-location" label="المكان">
              <Input
                id="s-location"
                value={form.location}
                onChange={(event) => set({ location: event.target.value })}
                className="bg-white"
              />
            </Field>
            <Field id="s-city" label="المدينة">
              <Input
                id="s-city"
                value={form.city}
                onChange={(event) => set({ city: event.target.value })}
                className="bg-white"
              />
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <Field id="s-seats" label="عدد المقاعد" required error={errors.seats}>
              <Input
                id="s-seats"
                type="number"
                min={1}
                step={1}
                inputMode="numeric"
                value={form.seats}
                onChange={(event) => set({ seats: parseIntOrZero(event.target.value) })}
                aria-invalid={Boolean(errors.seats)}
                className="num-ltr bg-white"
              />
            </Field>
            <Field
              id="s-registered"
              label="عدد المسجلين"
              required
              error={errors.registered}
              hint={
                form.seats > 0 && form.registered <= form.seats
                  ? `المتبقي: ${form.seats - form.registered}`
                  : undefined
              }
            >
              <Input
                id="s-registered"
                type="number"
                min={0}
                step={1}
                inputMode="numeric"
                value={form.registered}
                onChange={(event) => set({ registered: parseIntOrZero(event.target.value) })}
                aria-invalid={Boolean(errors.registered)}
                className="num-ltr bg-white"
              />
            </Field>
            <Field id="s-price" label="سعر الدفعة" error={errors.price}>
              <Input
                id="s-price"
                type="number"
                min={0}
                step={50}
                inputMode="numeric"
                value={form.price ?? ""}
                onChange={(event) =>
                  set({ price: event.target.value === "" ? undefined : parseIntOrZero(event.target.value) })
                }
                placeholder="افتراضي سعر الدورة"
                aria-invalid={Boolean(errors.price)}
                className="num-ltr bg-white"
              />
            </Field>
          </div>

          <Field id="s-status" label="حالة التسجيل">
            <Select
              value={form.status}
              onValueChange={(value) => set({ status: value as SessionStatus })}
            >
              <SelectTrigger id="s-status" aria-label="حالة التسجيل">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SESSION_STATUS_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            إلغاء
          </Button>
          <Button onClick={handleSave}>{initial ? "حفظ التعديلات" : "إضافة الموعد"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
