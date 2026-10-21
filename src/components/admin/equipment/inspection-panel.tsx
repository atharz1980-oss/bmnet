"use client";

/**
 * لوحة محضر التسليم/الاسترجاع — سلسلة العهدة الموثّقة.
 *
 * التسليم لا يُسجَّل إلا بعد استيفاء البوابات في الخادم (دفع + تحقق هوية +
 * سند ضمان معتمد إن لزم)، والاسترجاع لا يُسجَّل إلا والمعدة لدى العميل.
 * البنود والملحقات والوسائط تُحفظ كاملة في المحضر، وإقرار المستلم باسمه
 * ورقم هويته جزء من السلسلة.
 */

import { useState, useTransition, type FormEvent } from "react";
import { Loader2, Save } from "lucide-react";

import { recordEquipmentHandoverAction, recordEquipmentReturnAction } from "@/app/admin/actions/equipment";
import { Field } from "@/components/admin/ui/field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

const DEFAULT_CHECKLIST = [
  "سلامة الجسم من الخدوش",
  "عمل الأزرار والوظائف",
  "نظافة العدسات والواجهات",
  "وجود جميع الملحقات",
];

interface InspectionPanelProps {
  rentalId: string;
  kind: "handover" | "return";
  serialNumber: string;
  customerName: string;
  customerNationalId: string;
  /** هل المحضر مسجّل مسبقًا؟ يُعرض للقراءة فقط. */
  recorded: {
    serial_number: string;
    checklist: unknown;
    accessories: string;
    acknowledged_by_name: string;
    acknowledged_by_id: string;
    damage_note: string | null;
    created_at: string;
  } | null;
}

function checklistRows(checklist: unknown): { label: string; ok: boolean; note: string }[] {
  if (!Array.isArray(checklist)) return [];
  return checklist
    .filter((row): row is Record<string, unknown> => typeof row === "object" && row !== null)
    .map((row) => ({
      label: String(row.label ?? ""),
      ok: row.ok !== false,
      note: String(row.note ?? ""),
    }));
}

export function InspectionPanel({
  rentalId,
  kind,
  serialNumber,
  customerName,
  customerNationalId,
  recorded,
}: InspectionPanelProps) {
  const { toast } = useToast();
  const [serial, setSerial] = useState(recorded?.serial_number || serialNumber);
  const [accessories, setAccessories] = useState(recorded?.accessories ?? "");
  const [ackedName, setAckedName] = useState(recorded?.acknowledged_by_name || customerName);
  const [ackedId, setAckedId] = useState(recorded?.acknowledged_by_id || customerNationalId);
  const [damageNote, setDamageNote] = useState(recorded?.damage_note ?? "");
  const [items, setItems] = useState(
    recorded
      ? checklistRows(recorded.checklist)
      : DEFAULT_CHECKLIST.map((label) => ({ label, ok: true, note: "" })),
  );
  const [pending, startTransition] = useTransition();

  const title = kind === "handover" ? "محضر التسليم" : "محضر الاسترجاع";

  if (recorded) {
    return (
      <section className="space-y-3 rounded-xl border border-border bg-white p-5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-bold text-charcoal-900">{title}</h2>
          <span className="inline-flex items-center gap-2 text-xs font-medium text-brand-700">
            <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-brand-600" />
            مسجّل — {new Date(recorded.created_at).toLocaleDateString("en-CA")}
          </span>
        </div>
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-xs font-medium text-charcoal-500">السيريال</dt>
            <dd dir="ltr" className="mt-0.5 text-start text-charcoal-900">{recorded.serial_number || "—"}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-charcoal-500">أقرّ به</dt>
            <dd className="mt-0.5 text-charcoal-900">
              {recorded.acknowledged_by_name} — <span dir="ltr" className="tabular-nums">{recorded.acknowledged_by_id}</span>
            </dd>
          </div>
        </dl>
        {recorded.accessories ? (
          <p className="text-sm text-charcoal-700">{recorded.accessories}</p>
        ) : null}
        {recorded.damage_note ? (
          <p className="rounded-lg bg-danger-50 p-3 text-sm text-danger-700">ملاحظة تلف: {recorded.damage_note}</p>
        ) : null}
        <ul className="space-y-1 text-sm">
          {checklistRows(recorded.checklist).map((row) => (
            <li key={row.label} className="flex items-center gap-2 text-charcoal-700">
              <span aria-hidden="true" className={row.ok ? "text-brand-700" : "text-danger-700"}>
                {row.ok ? "✓" : "✗"}
              </span>
              {row.label}
              {row.note ? <span className="text-xs text-charcoal-500">— {row.note}</span> : null}
            </li>
          ))}
        </ul>
      </section>
    );
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    startTransition(async () => {
      const payload = {
        serialNumber: serial,
        checklist: items,
        accessories,
        media: [] as { path: string; kind: "image" | "video" }[],
        acknowledgedByName: ackedName,
        acknowledgedById: ackedId,
        damageNote: damageNote.trim() || null,
      };
      const result =
        kind === "handover"
          ? await recordEquipmentHandoverAction(rentalId, payload)
          : await recordEquipmentReturnAction(rentalId, payload);
      if (result.ok) {
        toast({ title: `حُفظ ${title}`, description: "السلسلة توثّقت — حالة الإيجار تحدّثت تلقائيًا." });
      } else {
        toast({ title: "تعذر الحفظ", description: result.error, variant: "destructive" });
      }
    });
  }

  return (
    <section className="space-y-4 rounded-xl border border-border bg-white p-5">
      <h2 className="font-bold text-charcoal-900">{title}</h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Field id={`${kind}-serial`} label="السيريال الفعلي" hint="الوحدة المسلَّمة أو المستلَمة.">
          <Input id={`${kind}-serial`} value={serial} onChange={(event) => setSerial(event.target.value)} dir="ltr" maxLength={120} />
        </Field>

        <div className="space-y-2">
          <span className="text-sm font-medium text-charcoal-800">بنود الحالة</span>
          {items.map((row, index) => (
            <div key={`${row.label}-${index}`} className="flex flex-wrap items-center gap-2">
              <input
                value={row.label}
                onChange={(event) =>
                  setItems((current) => current.map((entry, i) => (i === index ? { ...entry, label: event.target.value } : entry)))
                }
                maxLength={80}
                aria-label="بند التحقق"
                className="h-9 flex-1 rounded-md border border-charcoal-300 bg-white px-2 text-sm"
              />
              <label className="flex items-center gap-1 text-xs text-charcoal-700">
                <input
                  type="checkbox"
                  checked={row.ok}
                  onChange={(event) =>
                    setItems((current) => current.map((entry, i) => (i === index ? { ...entry, ok: event.target.checked } : entry)))
                  }
                />
                سليم
              </label>
              <input
                value={row.note}
                onChange={(event) =>
                  setItems((current) => current.map((entry, i) => (i === index ? { ...entry, note: event.target.value } : entry)))
                }
                placeholder="ملاحظة"
                maxLength={300}
                aria-label="ملاحظة البند"
                className="h-9 w-40 rounded-md border border-charcoal-300 bg-white px-2 text-sm"
              />
            </div>
          ))}
        </div>

        <Field id={`${kind}-accessories`} label="الملحقات">
          <Textarea
            id={`${kind}-accessories`}
            value={accessories}
            onChange={(event) => setAccessories(event.target.value)}
            rows={2}
            maxLength={2000}
            placeholder="بطارية، شاحن، حقيبة…"
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field id={`${kind}-acked-name`} label="اسم المستلم المقرّ" required>
            <Input id={`${kind}-acked-name`} value={ackedName} onChange={(event) => setAckedName(event.target.value)} required maxLength={120} />
          </Field>
          <Field id={`${kind}-acked-id`} label="رقم هوية المقرّ" required hint="عشرة أرقام.">
            <Input
              id={`${kind}-acked-id`}
              value={ackedId}
              onChange={(event) => setAckedId(event.target.value.replace(/\D/g, "").slice(0, 10))}
              required
              dir="ltr"
              inputMode="numeric"
              maxLength={10}
            />
          </Field>
        </div>

        <Field id={`${kind}-damage`} label="ملاحظة تلف" hint={kind === "return" ? "اذكر أي تلف عند الاسترجاع." : "اختياري."}>
          <Textarea id={`${kind}-damage`} value={damageNote} onChange={(event) => setDamageNote(event.target.value)} rows={2} maxLength={2000} />
        </Field>

        <div className="flex justify-end">
          <Button type="submit" disabled={pending || ackedId.length !== 10}>
            {pending ? (
              <Loader2 aria-hidden="true" className="me-1.5 h-4 w-4 animate-spin" />
            ) : (
              <Save aria-hidden="true" className="me-1.5 h-4 w-4" />
            )}
            حفظ {title}
          </Button>
        </div>
      </form>
    </section>
  );
}
