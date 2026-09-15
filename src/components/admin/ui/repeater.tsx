"use client";

/**
 * Repeater — محرر قائمة نصوص ديناميكي
 * إضافة/تعديل/حذف/إعادة ترتيب بأزرار ↑ ↓ (بدون Dependencies — قرار D-05).
 * يُستخدم لـ: المخرجات التعليمية، الجمهور المستهدف، المتطلبات، Skills...
 */
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface RepeaterProps {
  /** عنوان aria-only للقائمة */
  label: string;
  items: string[];
  onChange: (items: string[]) => void;
  addLabel?: string;
  placeholder?: string;
  hint?: string;
  className?: string;
}

export function Repeater({
  label,
  items,
  onChange,
  addLabel = "إضافة عنصر",
  placeholder = "أدخل النص…",
  hint,
  className,
}: RepeaterProps) {
  function updateItem(index: number, value: string) {
    onChange(items.map((item, i) => (i === index ? value : item)));
  }

  function removeItem(index: number) {
    onChange(items.filter((_, i) => i !== index));
  }

  function moveItem(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= items.length) return;
    const next = [...items];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  }

  return (
    <div className={cn("space-y-2", className)} role="group" aria-label={label}>
      <ul className="space-y-2">
        {items.map((item, index) => (
          <li key={index} className="flex items-center gap-2">
            <span
              aria-hidden="true"
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-surface text-xs font-semibold text-charcoal-500 num-ltr"
            >
              {index + 1}
            </span>
            <Input
              value={item}
              onChange={(event) => updateItem(index, event.target.value)}
              placeholder={placeholder}
              aria-label={`${label} — العنصر ${index + 1}`}
              className="bg-white"
            />
            <div className="flex shrink-0 items-center gap-0.5">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-11 w-11 lg:h-8 lg:w-8 text-charcoal-500"
                onClick={() => moveItem(index, -1)}
                disabled={index === 0}
                aria-label={`نقل العنصر ${index + 1} للأعلى`}
              >
                <ArrowUp aria-hidden="true" className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-11 w-11 lg:h-8 lg:w-8 text-charcoal-500"
                onClick={() => moveItem(index, 1)}
                disabled={index === items.length - 1}
                aria-label={`نقل العنصر ${index + 1} للأسفل`}
              >
                <ArrowDown aria-hidden="true" className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-11 w-11 lg:h-8 lg:w-8 text-brand-700 hover:bg-brand-50 hover:text-brand-700"
                onClick={() => removeItem(index)}
                aria-label={`حذف العنصر ${index + 1}`}
              >
                <Trash2 aria-hidden="true" className="h-4 w-4" />
              </Button>
            </div>
          </li>
        ))}
      </ul>

      <div className="flex items-center gap-3">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onChange([...items, ""])}
        >
          <Plus aria-hidden="true" className="me-1.5 h-4 w-4" />
          {addLabel}
        </Button>
        {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
      </div>
    </div>
  );
}
