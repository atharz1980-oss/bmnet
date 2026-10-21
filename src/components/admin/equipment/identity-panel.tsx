"use client";

/**
 * لوحة التحقق من هوية المستأجر — توثيق التحقق اليدوي عند التسليم.
 *
 * لا ادعاء تحقق حكومي: الموظف يفحص أصل الهوية ويوثّق مرجع التحقق. الخادم
 * يحرس الانتقالات، والواجهة تعرض الحالة كما هي: «بانتظار التحقق اليدوي»
 * ليست «موثّق».
 */

import { useState, useTransition } from "react";
import { Check, Loader2, ShieldAlert } from "lucide-react";

import { failEquipmentIdentityAction, verifyEquipmentIdentityAction } from "@/app/admin/actions/equipment";
import { Field } from "@/components/admin/ui/field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RENTAL_IDENTITY_STATUS_LABELS } from "@/lib/rentals/labels";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface IdentityPanelProps {
  rentalId: string;
  status: string;
  method: string;
  reference: string | null;
  verifiedAt: string | null;
  /** رقم الهوية كما أدخله العميل — يُعرض للفحص عند التسليم. */
  nationalId: string;
  nationalIdExpiry: string | null;
}

function maskId(id: string): string {
  return id.length === 10 ? `${id.slice(0, 3)}•••••${id.slice(8)}` : id;
}

export function IdentityPanel({
  rentalId,
  status,
  method,
  reference,
  verifiedAt,
  nationalId,
  nationalIdExpiry,
}: IdentityPanelProps) {
  const { toast } = useToast();
  const [ref, setRef] = useState(reference ?? "");
  const [note, setNote] = useState("");
  const [showFullId, setShowFullId] = useState(false);
  const [pending, startTransition] = useTransition();

  const verified = status === "verified";
  const failed = status === "failed";

  function run(action: () => Promise<{ ok: boolean; error?: string }>, title: string, description?: string) {
    startTransition(async () => {
      const result = await action();
      if (result.ok) {
        toast({ title, description });
        setNote("");
      } else {
        toast({ title: "تعذر التنفيذ", description: result.error, variant: "destructive" });
      }
    });
  }

  return (
    <section className="space-y-4 rounded-xl border border-border bg-white p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-bold text-charcoal-900">هوية المستأجر</h2>
        <span
          className={cn(
            "inline-flex items-center gap-2 text-xs font-medium",
            verified
              ? "text-brand-700"
              : failed
                ? "text-danger-700"
                : "text-charcoal-500",
          )}
        >
          <span
            aria-hidden="true"
            className={cn(
              "h-1.5 w-1.5 rounded-full",
              verified ? "bg-brand-600" : failed ? "bg-danger-600" : "bg-charcoal-300",
            )}
          />
          {RENTAL_IDENTITY_STATUS_LABELS[status] ?? status}
        </span>
      </div>

      <dl className="grid gap-3 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-xs font-medium text-charcoal-500">رقم الهوية كما أدخله العميل</dt>
          <dd className="mt-0.5 flex items-center gap-2">
            <span dir="ltr" className="tabular-nums text-charcoal-900">
              {showFullId ? nationalId : maskId(nationalId)}
            </span>
            <Button type="button" variant="ghost" size="sm" onClick={() => setShowFullId((current) => !current)}>
              {showFullId ? "إخفاء" : "إظهار"}
            </Button>
          </dd>
        </div>
        <div>
          <dt className="text-xs font-medium text-charcoal-500">انتهاء الهوية</dt>
          <dd dir="ltr" className="mt-0.5 text-start tabular-nums text-charcoal-900">
            {nationalIdExpiry ?? "—"}
          </dd>
        </div>
        <div>
          <dt className="text-xs font-medium text-charcoal-500">طريقة التحقق</dt>
          <dd className="mt-0.5 text-charcoal-900">{method === "manual" ? "يدوي موثّق" : method}</dd>
        </div>
        <div>
          <dt className="text-xs font-medium text-charcoal-500">مرجع التحقق</dt>
          <dd className="mt-0.5 text-charcoal-900">{reference ?? "—"}</dd>
        </div>
        {verifiedAt ? (
          <div className="sm:col-span-2">
            <dt className="text-xs font-medium text-charcoal-500">وُثّق في</dt>
            <dd dir="ltr" className="mt-0.5 text-start tabular-nums text-charcoal-900">
              {verifiedAt}
            </dd>
          </div>
        ) : null}
      </dl>

      <p className="rounded-lg bg-surface p-3 text-xs leading-relaxed text-charcoal-600">
        لا يوجد تكامل حكومي: التحقق يدوي موثّق — افحص أصل الهوية عند التسليم وسجّل مرجع الفحص. المعدة ذات سند ضمان معتمد
        تُسلَّم فقط بعد سريان التحقق.
      </p>

      {verified ? (
        <p className="flex items-center gap-2 text-sm font-medium text-brand-700">
          <Check aria-hidden="true" className="h-4 w-4" />
          الهوية موثّقة.
        </p>
      ) : (
        <div className="space-y-4">
          <Field id="identity-reference" label="مرجع التحقق" required hint="رقم الطلب أو وصف صورة الهوية التي فُحصت.">
            <Input
              id="identity-reference"
              value={ref}
              onChange={(event) => setRef(event.target.value)}
              maxLength={200}
              placeholder="فحص أصل الهوية في الفرع"
            />
          </Field>
          <Field id="identity-note" label="ملاحظة" hint="اختياري — تُحفظ في الإيجار.">
            <Textarea
              id="identity-note"
              value={note}
              onChange={(event) => setNote(event.target.value)}
              rows={2}
              maxLength={1000}
            />
          </Field>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              disabled={pending || ref.trim() === ""}
              onClick={() =>
                run(
                  () => verifyEquipmentIdentityAction(rentalId, { reference: ref.trim(), note: note.trim() || null }),
                  "وُثّقت الهوية",
                )
              }
            >
              {pending ? <Loader2 aria-hidden="true" className="me-1.5 h-4 w-4 animate-spin" /> : <Check aria-hidden="true" className="me-1.5 h-4 w-4" />}
              توثيق التحقق
            </Button>
            <Button
              type="button"
              variant="outline"
              className="text-danger-700"
              disabled={pending || note.trim() === ""}
              onClick={() =>
                run(
                  () => failEquipmentIdentityAction(rentalId, note.trim()),
                  "سُجّل تعذّر التحقق",
                  "الملاحظة إلزامية — اذكر السبب.",
                )
              }
            >
              <ShieldAlert aria-hidden="true" className="me-1.5 h-4 w-4" />
              تعذّر التحقق
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}
