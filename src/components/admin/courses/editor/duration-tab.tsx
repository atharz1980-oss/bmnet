"use client";

/**
 * DurationTab — تبويب المدة
 * أرقام صحيحة بحدود منطقية: الأيام ≥ 1، الساعات ≥ 0.
 */
import type { CourseInput } from "@/context/admin-store";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/admin/ui/field";
import { parseIntOrZero } from "./editor-helpers";

interface TabProps {
  draft: CourseInput;
  update: (patch: Partial<CourseInput>) => void;
  errors: Record<string, string>;
}

export function DurationTab({ draft, update, errors }: TabProps) {
  const setDuration = (patch: Partial<CourseInput["duration"]>) =>
    update({ duration: { ...draft.duration, ...patch } });

  return (
    <div className="max-w-xl space-y-4">
      <Field
        id="duration-days"
        label="عدد الأيام"
        required
        error={errors["duration.days"]}
        hint="وحدة انعقاد الدورة الأساسية — 1 على الأقل"
      >
        <Input
          id="duration-days"
          type="number"
          min={1}
          step={1}
          inputMode="numeric"
          value={draft.duration.days}
          onChange={(event) => setDuration({ days: parseIntOrZero(event.target.value) })}
          aria-invalid={Boolean(errors["duration.days"])}
          className="num-ltr bg-white"
        />
      </Field>

      <Field
        id="duration-total-hours"
        label="إجمالي الساعات"
        error={errors["duration.totalHours"]}
      >
        <Input
          id="duration-total-hours"
          type="number"
          min={0}
          step={1}
          inputMode="numeric"
          value={draft.duration.totalHours}
          onChange={(event) => setDuration({ totalHours: parseIntOrZero(event.target.value) })}
          aria-invalid={Boolean(errors["duration.totalHours"])}
          className="num-ltr bg-white"
        />
      </Field>

      <Field id="duration-hours-per-day" label="الساعات يوميًا">
        <Input
          id="duration-hours-per-day"
          type="number"
          min={0}
          step={1}
          inputMode="numeric"
          value={draft.duration.hoursPerDay ?? ""}
          onChange={(event) =>
            setDuration({
              hoursPerDay:
                event.target.value === "" ? undefined : parseIntOrZero(event.target.value),
            })
          }
          className="num-ltr bg-white"
        />
      </Field>

      <p className="rounded-lg bg-surface/60 p-3 text-xs leading-relaxed text-muted-foreground">
        هذه القيم تعريفية للدورة نفسها. توقيت كل انعقاد فعلي (التواريخ والأوقات) يُدار لكل دفعة
        على حدة من تبويب «المواعيد».
      </p>
    </div>
  );
}
