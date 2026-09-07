"use client";

/**
 * CurriculumTab — بنّاء المنهج (المهمة #10 — الواجهة المحورية)
 * -------------------------------------------------------------
 * Course → Curriculum Days → Curriculum Items — بلا أي Textarea واحدة
 * للمحتوى. العمليات: إضافة/تعديل/حذف/إعادة ترتيب (↑↓ — قرار D-05،
 * بلا Drag & Drop dependency).
 *
 * الضوابط:
 *  - هويات مستقرة (id مولد عند الإنشاء) — لا اعتماد على array index.
 *  - ترتيب deterministic: dayNumber يُحسب من موضع اليوم عند كل تغيير.
 *  - حذف يوم يحتوي محاور → ConfirmDialog؛ حذف محور صغير → مباشر.
 */
import { useState } from "react";
import { ArrowDown, ArrowUp, CalendarDays, Plus, Trash2 } from "lucide-react";

import type { CurriculumDay, CurriculumItem } from "@/data/admin/types";
import type { CourseInput } from "@/context/admin-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ConfirmDialog } from "@/components/admin/ui/confirm-dialog";
import { makeEditorId } from "./editor-helpers";

interface CurriculumTabProps {
  draft: CourseInput;
  update: (patch: Partial<CourseInput>) => void;
  errors: Record<string, string>;
}

/* ─────────────────── معالجات نقية على مصفوفة الأيام ─────────────────── */

/** يعيد ترقيم الأيام من مواضعها — الترتيب المصفوفة هو المصدر */
function renumber(days: CurriculumDay[]): CurriculumDay[] {
  return days.map((day, index) => ({ ...day, dayNumber: index + 1 }));
}

function move<T>(items: T[], index: number, direction: -1 | 1): T[] {
  const target = index + direction;
  if (target < 0 || target >= items.length) return items;
  const next = [...items];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

export function CurriculumTab({ draft, update, errors }: CurriculumTabProps) {
  const [deleteDayTarget, setDeleteDayTarget] = useState<CurriculumDay | null>(null);
  const days = draft.curriculum;

  function setDays(next: CurriculumDay[]) {
    update({ curriculum: renumber(next) });
  }

  function addDay() {
    const day: CurriculumDay = {
      id: makeEditorId("day"),
      dayNumber: days.length + 1,
      title: `اليوم ${days.length + 1}`,
      items: [],
    };
    setDays([...days, day]);
  }

  function updateDay(dayId: string, patch: Partial<CurriculumDay>) {
    setDays(days.map((day) => (day.id === dayId ? { ...day, ...patch } : day)));
  }

  function moveDay(index: number, direction: -1 | 1) {
    setDays(move(days, index, direction));
  }

  function requestDeleteDay(day: CurriculumDay) {
    if (day.items.length > 0) setDeleteDayTarget(day);
    else setDays(days.filter((entry) => entry.id !== day.id));
  }

  function confirmDeleteDay() {
    if (deleteDayTarget) setDays(days.filter((entry) => entry.id !== deleteDayTarget.id));
    setDeleteDayTarget(null);
  }

  function addItem(dayId: string) {
    const item: CurriculumItem = { id: makeEditorId("item"), title: "" };
    setDays(
      days.map((day) => (day.id === dayId ? { ...day, items: [...day.items, item] } : day)),
    );
  }

  function updateItem(dayId: string, itemId: string, patch: Partial<CurriculumItem>) {
    setDays(
      days.map((day) =>
        day.id === dayId
          ? {
              ...day,
              items: day.items.map((item) => (item.id === itemId ? { ...item, ...patch } : item)),
            }
          : day,
      ),
    );
  }

  function deleteItem(dayId: string, itemId: string) {
    /* حذف مباشر للمحور الصغير — بلا حوار (قرار UX موثق) */
    setDays(
      days.map((day) =>
        day.id === dayId
          ? { ...day, items: day.items.filter((item) => item.id !== itemId) }
          : day,
      ),
    );
  }

  function moveItem(dayId: string, index: number, direction: -1 | 1) {
    setDays(
      days.map((day) =>
        day.id === dayId ? { ...day, items: move(day.items, index, direction) } : day,
      ),
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm leading-relaxed text-muted-foreground">
        ابنِ المنهج يومًا يومًا: أضف أيام الدورة ثم المحاور داخل كل يوم. ترتيب الأيام والمحاور
        بأزرار السهم.
      </p>

      {days.length === 0 ? (
        <div className="rounded-xl border border-dashed border-charcoal-200 bg-surface/50 px-6 py-10 text-center">
          <CalendarDays aria-hidden="true" className="mx-auto mb-2 h-8 w-8 text-charcoal-300" />
          <p className="text-sm font-semibold text-charcoal-800">لا أيام بعد</p>
          <p className="mt-1 text-sm text-muted-foreground">
            ابدأ بإضافة اليوم الأول لمنهج الدورة.
          </p>
        </div>
      ) : null}

      <ul className="space-y-4" aria-label="أيام المنهج">
        {days.map((day, dayIndex) => (
          <li
            key={day.id}
            className="rounded-xl border border-border bg-white p-4"
            aria-label={`اليوم ${day.dayNumber}`}
          >
            {/* رأس اليوم */}
            <div className="flex flex-wrap items-center gap-2">
              <span
                aria-hidden="true"
                className="flex h-8 shrink-0 items-center rounded-lg bg-charcoal-900 px-3 text-xs font-bold text-white num-ltr"
              >
                يوم {day.dayNumber}
              </span>
              <Input
                value={day.title}
                onChange={(event) => updateDay(day.id, { title: event.target.value })}
                placeholder="عنوان اليوم — مثال: اليوم الأول"
                aria-label={`عنوان اليوم ${day.dayNumber}`}
                className="h-9 flex-1 bg-white text-sm"
              />
              <div className="flex shrink-0 items-center gap-0.5">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-charcoal-500"
                  onClick={() => moveDay(dayIndex, -1)}
                  disabled={dayIndex === 0}
                  aria-label={`نقل اليوم ${day.dayNumber} للأعلى`}
                >
                  <ArrowUp aria-hidden="true" className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-charcoal-500"
                  onClick={() => moveDay(dayIndex, 1)}
                  disabled={dayIndex === days.length - 1}
                  aria-label={`نقل اليوم ${day.dayNumber} للأسفل`}
                >
                  <ArrowDown aria-hidden="true" className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-brand-700 hover:bg-brand-50 hover:text-brand-700"
                  onClick={() => requestDeleteDay(day)}
                  aria-label={`حذف اليوم ${day.dayNumber}`}
                >
                  <Trash2 aria-hidden="true" className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* محاور اليوم */}
            {day.items.length > 0 ? (
              <ul className="mt-3 space-y-2 border-s-2 border-s-border ps-3" aria-label={`محاور اليوم ${day.dayNumber}`}>
                {day.items.map((item, itemIndex) => (
                  <li key={item.id} className="rounded-lg bg-surface/60 p-2.5">
                    <div className="flex items-start gap-2">
                      <span
                        aria-hidden="true"
                        className="mt-1.5 flex h-5 w-5 shrink-0 items-center justify-center rounded bg-white text-[10px] font-semibold text-charcoal-500 num-ltr"
                      >
                        {itemIndex + 1}
                      </span>
                      <div className="min-w-0 flex-1 space-y-1.5">
                        <Input
                          value={item.title}
                          onChange={(event) =>
                            updateItem(day.id, item.id, { title: event.target.value })
                          }
                          placeholder="عنوان المحور"
                          aria-label={`عنوان المحور ${itemIndex + 1} — اليوم ${day.dayNumber}`}
                          className="h-8 bg-white text-sm"
                        />
                        <Textarea
                          value={item.description ?? ""}
                          onChange={(event) =>
                            updateItem(day.id, item.id, { description: event.target.value })
                          }
                          placeholder="وصف المحور (اختياري)"
                          aria-label={`وصف المحور ${itemIndex + 1} — اليوم ${day.dayNumber}`}
                          rows={2}
                          className="min-h-0 bg-white text-xs"
                        />
                      </div>
                      <div className="flex shrink-0 flex-col items-center gap-0.5 sm:flex-row">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-charcoal-500"
                          onClick={() => moveItem(day.id, itemIndex, -1)}
                          disabled={itemIndex === 0}
                          aria-label={`نقل المحور ${itemIndex + 1} للأعلى`}
                        >
                          <ArrowUp aria-hidden="true" className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-charcoal-500"
                          onClick={() => moveItem(day.id, itemIndex, 1)}
                          disabled={itemIndex === day.items.length - 1}
                          aria-label={`نقل المحور ${itemIndex + 1} للأسفل`}
                        >
                          <ArrowDown aria-hidden="true" className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-brand-700 hover:bg-brand-50 hover:text-brand-700"
                          onClick={() => deleteItem(day.id, item.id)}
                          aria-label={`حذف المحور ${itemIndex + 1}`}
                        >
                          <Trash2 aria-hidden="true" className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 rounded-lg border border-dashed border-charcoal-200 px-3 py-2 text-center text-xs text-charcoal-400">
                لا محاور في هذا اليوم بعد
              </p>
            )}

            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={() => addItem(day.id)}
            >
              <Plus aria-hidden="true" className="me-1.5 h-4 w-4" />
              إضافة محور
            </Button>
          </li>
        ))}
      </ul>

      <Button type="button" variant="secondary" onClick={addDay}>
        <Plus aria-hidden="true" className="me-1.5 h-4 w-4" />
        إضافة يوم
      </Button>

      {errors.curriculum ? (
        <p role="alert" className="text-xs font-medium text-brand-700">
          {errors.curriculum}
        </p>
      ) : null}

      <ConfirmDialog
        open={deleteDayTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteDayTarget(null);
        }}
        title="حذف اليوم"
        description={
          deleteDayTarget
            ? `«${deleteDayTarget.title || `اليوم ${deleteDayTarget.dayNumber}`}» يحتوي ${deleteDayTarget.items.length} محورًا. سيتم حذف اليوم وكل محاوره — هل أنت متأكد؟`
            : ""
        }
        confirmLabel="حذف اليوم ومحاوره"
        onConfirm={confirmDeleteDay}
      />
    </div>
  );
}
