"use client";

/**
 * لوحة سند الضمان «نافذ» — تسجيل حالة السند الرسمية يدويًا.
 *
 * السند لا يُنشأ ولا يُعتمد تلقائيًا: الحالة تُنقل من بوابة نافذ بعد اعتماد
 * العميل، ومرجع العملية إلزامي. «طلب مُنشأ» ليس سندًا معتمدًا، والتسليم
 * يشترطه معتمدًا للمعدات التي تشترط سندًا.
 */

import { useState, useTransition } from "react";
import { Loader2, Save } from "lucide-react";

import { updateEquipmentSecurityNoteAction } from "@/app/admin/actions/equipment";
import { Field } from "@/components/admin/ui/field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { SECURITY_NOTE_STATUS_LABELS } from "@/lib/rentals/labels";
import { useToast } from "@/hooks/use-toast";

interface SecurityNotePanelProps {
  rentalId: string;
  requiresNote: boolean;
  note: {
    status: string;
    amount_halalas: number;
    provider: string;
    provider_reference: string | null;
    provider_status_text: string;
    note: string | null;
  } | null;
}

const EDITABLE_STATUSES = ["requested", "approved", "rejected", "expired", "released"] as const;

export function SecurityNotePanel({ rentalId, requiresNote, note }: SecurityNotePanelProps) {
  const { toast } = useToast();
  const [status, setStatus] = useState<string>((note?.status === "not_requested" ? "requested" : note?.status) ?? "requested");
  const [reference, setReference] = useState(note?.provider_reference ?? "");
  const [statusText, setStatusText] = useState(note?.provider_status_text ?? "");
  const [memo, setMemo] = useState(note?.note ?? "");
  const [pending, startTransition] = useTransition();

  if (!note) {
    return (
      <section className="space-y-3 rounded-xl border border-border bg-white p-5">
        <h2 className="font-bold text-charcoal-900">سند الضمان (نافذ)</h2>
        <p className="rounded-lg bg-surface p-3 text-xs leading-relaxed text-charcoal-600">
          لا يوجد سجل سند ضمان لهذا الإيجار — المعدة لا تشترط سندًا، أو لم يُنشأ السجل بعد الدفع.
        </p>
      </section>
    );
  }

  function run() {
    startTransition(async () => {
      const result = await updateEquipmentSecurityNoteAction(rentalId, {
        status,
        providerReference: reference.trim(),
        providerStatusText: statusText.trim(),
        note: memo.trim() || null,
      });
      if (result.ok) {
        toast({ title: "حُفظ سند الضمان", description: SECURITY_NOTE_STATUS_LABELS[status] ?? status });
      } else {
        toast({ title: "تعذر الحفظ", description: result.error, variant: "destructive" });
      }
    });
  }

  return (
    <section className="space-y-4 rounded-xl border border-border bg-white p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-bold text-charcoal-900">سند الضمان (نافذ)</h2>
        <span className="rounded-full bg-surface px-2 py-0.5 text-xs font-semibold text-charcoal-700">
          {SECURITY_NOTE_STATUS_LABELS[note.status] ?? note.status}
        </span>
      </div>

      {requiresNote ? (
        <p className="rounded-lg bg-danger-50 p-3 text-xs leading-relaxed text-danger-700">
          هذه المعدة تشترط سند ضمان معتمدًا قبل التسليم.
        </p>
      ) : (
        <p className="rounded-lg bg-surface p-3 text-xs leading-relaxed text-charcoal-600">
          هذه المعدة لا تشترط سندًا — السجل هنا للتوثيق فقط.
        </p>
      )}

      <dl className="grid gap-3 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-xs font-medium text-charcoal-500">مبلغ السند</dt>
          <dd className="mt-0.5 tabular-nums text-charcoal-900">{(note.amount_halalas / 100).toLocaleString("en-US")} ريال</dd>
        </div>
        <div>
          <dt className="text-xs font-medium text-charcoal-500">المزوّد</dt>
          <dd className="mt-0.5 text-charcoal-900">{note.provider}</dd>
        </div>
      </dl>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="note-status" label="الحالة" required>
          <select
            id="note-status"
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            className="h-11 w-full rounded-md border border-charcoal-300 bg-white px-3 text-base lg:text-sm focus:border-brand-500 focus:outline-none"
          >
            {EDITABLE_STATUSES.map((value) => (
              <option key={value} value={value}>
                {SECURITY_NOTE_STATUS_LABELS[value] ?? value}
              </option>
            ))}
          </select>
        </Field>
        <Field id="note-reference" label="مرجع عملية نافذ" required hint="إلزامي — لا يُسجَّل السند بلا مرجع.">
          <Input
            id="note-reference"
            value={reference}
            onChange={(event) => setReference(event.target.value)}
            maxLength={200}
            placeholder="NAFITH-..."
          />
        </Field>
      </div>

      <Field id="note-status-text" label="نص حالة المزود" hint="اختياري — كما قرأه الموظف في بوابة نافذ.">
        <Input
          id="note-status-text"
          value={statusText}
          onChange={(event) => setStatusText(event.target.value)}
          maxLength={300}
        />
      </Field>

      <Field id="note-memo" label="ملاحظة">
        <Textarea id="note-memo" value={memo} onChange={(event) => setMemo(event.target.value)} rows={2} maxLength={2000} />
      </Field>

      <div className="flex justify-end">
        <Button type="button" disabled={pending || reference.trim() === ""} onClick={run}>
          {pending ? (
            <Loader2 aria-hidden="true" className="me-1.5 h-4 w-4 animate-spin" />
          ) : (
            <Save aria-hidden="true" className="me-1.5 h-4 w-4" />
          )}
          حفظ حالة السند
        </Button>
      </div>
    </section>
  );
}
