"use client";

/**
 * محرر عقود الإيجار — إصدارات نص العقد الذي يقرؤه العميل ويوقّعه إلكترونيًا.
 *
 * قاعدة قانونية: نص الإصدار المقبول لا يُعاد كتابته (سجل ما وقّعه كل عميل
 * يبقى قابلًا للإثبات). التحرير يقتصر على العنوان والتفعيل، والتغيير الجوهري
 * يُنشئ إصدارًا جديدًا. الخادم يرفض أي تعديل يغيّر النص، والواجهة تمنع
 * الكتابة في حقل النص عند التعديل لتقليل الخطأ البشري.
 */

import { useState, useTransition, type FormEvent } from "react";
import { CheckCircle2, Loader2, Plus, Save } from "lucide-react";

import {
  activateEquipmentAgreementAction,
  createEquipmentAgreementAction,
  updateEquipmentAgreementAction,
} from "@/app/admin/actions/equipment";
import { Field } from "@/components/admin/ui/field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

export interface AgreementRow {
  id: string;
  version: number;
  title: string;
  body: string;
  active: boolean;
  acceptedCount: number;
}

interface DraftState {
  version: string;
  title: string;
  body: string;
  active: boolean;
}

export function AgreementManager({ agreements }: { agreements: AgreementRow[] }) {
  const { toast } = useToast();
  const [mode, setMode] = useState<"create" | "edit">("create");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<DraftState>({ version: "", title: "", body: "", active: true });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  const nextVersion = Math.max(0, ...agreements.map((row) => row.version)) + 1;

  function startCreate() {
    setMode("create");
    setEditingId(null);
    setDraft({ version: String(nextVersion), title: "", body: "", active: true });
    setError("");
  }

  function startEdit(agreement: AgreementRow) {
    setMode("edit");
    setEditingId(agreement.id);
    setDraft({ version: String(agreement.version), title: agreement.title, body: agreement.body, active: agreement.active });
    setError("");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSaving(true);
    try {
      if (mode === "edit" && editingId) {
        const result = await updateEquipmentAgreementAction(editingId, draft);
        if (!result.ok) {
          setError(result.error);
          return;
        }
        toast({ title: "حُفظ الإصدار", description: "التعديل يقتصر على العنوان والتفعيل — النص ثابت." });
      } else {
        const result = await createEquipmentAgreementAction(draft);
        if (!result.ok) {
          setError(result.error);
          return;
        }
        toast({ title: "أُنشئ إصدار جديد" });
      }
      startCreate();
    } finally {
      setSaving(false);
    }
  }

  function handleActivate(agreement: AgreementRow) {
    startTransition(async () => {
      const result = await activateEquipmentAgreementAction(agreement.id);
      if (result.ok) {
        toast({ title: `الإصدار ${agreement.version} مفعّل`, description: "يُعرض هذا النص ويُوقّعه العميل في كل إيجار جديد." });
      } else {
        toast({ title: "تعذر التفعيل", description: result.error, variant: "destructive" });
      }
    });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_28rem]">
      <section className="space-y-3">
        <h2 className="font-bold text-charcoal-900">إصدارات العقد</h2>
        <p className="text-xs leading-relaxed text-muted-foreground">
          إصدار واحد مفعّل فقط. التعديل الجوهري في النص يُنشئ إصدارًا جديدًا — لا يُلمس نص وقّعه عميل.
        </p>
        {agreements.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border p-6 text-sm text-charcoal-500">
            لا توجد إصدارات بعد. للتأجير أن يعمل يلزم إصدار عقد مفعّل واحد على الأقل.
          </p>
        ) : (
          <ul className="divide-y divide-border rounded-xl border border-border bg-white">
            {[...agreements]
              .sort((a, b) => b.version - a.version)
              .map((agreement) => (
                <li key={agreement.id} className="flex flex-wrap items-center gap-3 p-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-charcoal-900">إصدار {agreement.version}</span>
                      {agreement.active ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2 py-0.5 text-xs font-semibold text-brand-700">
                          <CheckCircle2 aria-hidden="true" className="h-3.5 w-3.5" />
                          مفعّل
                        </span>
                      ) : (
                        <span className="rounded-full bg-surface px-2 py-0.5 text-xs font-semibold text-charcoal-600">غير مفعّل</span>
                      )}
                    </div>
                    <p className="text-sm text-charcoal-700">{agreement.title}</p>
                    <p className="mt-0.5 text-xs text-charcoal-500">
                      وقّعه {agreement.acceptedCount} عميل — {agreement.body.length.toLocaleString("en-US")} حرف
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button type="button" variant="ghost" size="sm" onClick={() => startEdit(agreement)}>
                      عرض وتعديل العنوان
                    </Button>
                    {!agreement.active ? (
                      <Button type="button" variant="outline" size="sm" disabled={pending} onClick={() => handleActivate(agreement)}>
                        تفعيل
                      </Button>
                    ) : null}
                  </div>
                </li>
              ))}
          </ul>
        )}
      </section>

      <section className="space-y-4 rounded-xl border border-border bg-white p-5">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-charcoal-900">{mode === "edit" ? "تعديل الإصدار" : "إصدار جديد"}</h2>
          {mode === "edit" ? (
            <Button type="button" variant="ghost" size="sm" onClick={startCreate}>
              <Plus aria-hidden="true" className="me-1.5 h-4 w-4" />
              إصدار جديد
            </Button>
          ) : null}
        </div>

        {mode === "edit" ? (
          <p className="rounded-lg bg-surface p-3 text-xs leading-relaxed text-charcoal-600">
            نص الإصدار ثابت — لا يُعدَّل بعد قبوله. غيّر العنوان أو التفعيل، وللتغيير الجوهري أنشئ إصدارًا جديدًا.
          </p>
        ) : null}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-[6rem_1fr] gap-4">
            <Field id="agreement-version" label="الإصدار" required>
              <Input
                id="agreement-version"
                type="number"
                min={1}
                max={100000}
                value={draft.version}
                onChange={(event) => setDraft((current) => ({ ...current, version: event.target.value }))}
                required
                dir="ltr"
              />
            </Field>
            <Field id="agreement-title" label="عنوان العقد" required>
              <Input
                id="agreement-title"
                value={draft.title}
                onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))}
                required
                maxLength={200}
                placeholder="عقد تأجير معدات تصوير"
              />
            </Field>
          </div>

          <Field id="agreement-body" label="نص العقد" required hint="النص الكامل الذي يقرؤه العميل ويوافق عليه قبل الدفع.">
            <Textarea
              id="agreement-body"
              value={draft.body}
              onChange={(event) => setDraft((current) => ({ ...current, body: event.target.value }))}
              rows={14}
              maxLength={40000}
              required
              readOnly={mode === "edit"}
              className={mode === "edit" ? "bg-surface" : undefined}
            />
          </Field>

          <label className="flex min-h-11 cursor-pointer items-center justify-between gap-3 rounded-lg border border-border px-3 text-sm font-medium">
            مفعّل (يُعرض ويُوقّع)
            <Switch
              checked={draft.active}
              onCheckedChange={(checked) => setDraft((current) => ({ ...current, active: checked }))}
              aria-label="تفعيل الإصدار"
            />
          </label>

          {error ? (
            <p role="alert" className="rounded-lg bg-danger-50 p-3 text-sm font-medium text-danger-700">
              {error}
            </p>
          ) : null}

          <div className="flex justify-end">
            <Button type="submit" disabled={saving}>
              {saving ? (
                <Loader2 aria-hidden="true" className="me-1.5 h-4 w-4 animate-spin" />
              ) : (
                <Save aria-hidden="true" className="me-1.5 h-4 w-4" />
              )}
              {mode === "edit" ? "حفظ العنوان والتفعيل" : "إنشاء الإصدار"}
            </Button>
          </div>
        </form>
      </section>
    </div>
  );
}
