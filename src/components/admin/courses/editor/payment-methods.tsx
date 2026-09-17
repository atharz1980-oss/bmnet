"use client";

/**
 * «طرق الدفع» لدورة أونلاين مدفوعة.
 *
 * تُحفظ فورًا ومستقلة عن «حفظ الدورة» — وهذا مكتوب في الشاشة لا مستنتَج،
 * لأن خلط عقدَي حفظ في نموذج واحد أوقع المحرر سابقًا.
 *
 * ولا مفتاح API هنا بحال: المفاتيح في بيئة الخادم، وهذه الشاشة تختار ما
 * يُعرض للطالب فقط.
 */

import { useEffect, useState, useTransition } from "react";
import { CircleAlert, CreditCard, Loader2 } from "lucide-react";

import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import type { Provider } from "@/lib/payments/settings";
import {
  loadCoursePaymentMethodsAction,
  saveCoursePaymentMethodsAction,
} from "@/app/admin/actions/course-payments";

const LABELS: Record<Provider, { name: string; hint: string }> = {
  moyasar: { name: "ميسر", hint: "دفع كامل — مدى وفيزا وماستركارد وآبل باي" },
  tabby: { name: "تابي", hint: "تقسيط يديره المزود" },
  tamara: { name: "تمارا", hint: "تقسيط يديره المزود" },
};

const ORDER: Provider[] = ["moyasar", "tabby", "tamara"];

export function CoursePaymentMethods({
  courseId,
  disabled,
  reason,
}: {
  courseId?: string;
  /** مقفل لأن الدورة مجانية أو حسب الطلب أو ليست أونلاين. */
  disabled: boolean;
  reason?: string;
}) {
  const { toast } = useToast();
  const [pending, start] = useTransition();
  const [loaded, setLoaded] = useState(false);
  const [selected, setSelected] = useState<Provider[]>([]);
  const [available, setAvailable] = useState<Provider[]>([]);
  const [unconfigured, setUnconfigured] = useState<Provider[]>([]);

  useEffect(() => {
    if (!courseId) return;
    let cancelled = false;
    void loadCoursePaymentMethodsAction(courseId).then((result) => {
      if (cancelled) return;
      if (result.ok) {
        setSelected(result.data.providers);
        setAvailable(result.data.available);
        setUnconfigured(result.data.unconfigured);
      }
      setLoaded(true);
    });
    return () => {
      cancelled = true;
    };
  }, [courseId]);

  if (!courseId) {
    return (
      <Section>
        <p className="text-sm leading-relaxed text-charcoal-500">
          احفظ الدورة أولًا، ثم اختر طرق الدفع المتاحة لها.
        </p>
      </Section>
    );
  }

  const toggle = (provider: Provider, next: boolean) => {
    const value = next ? [...new Set([...selected, provider])] : selected.filter((p) => p !== provider);
    const previous = selected;
    setSelected(value);
    start(async () => {
      const result = await saveCoursePaymentMethodsAction(courseId, value);
      if (result.ok) {
        toast({ title: next ? "فُعّلت وسيلة الدفع" : "أُلغيت وسيلة الدفع" });
      } else {
        setSelected(previous);
        toast({ title: "لم يُحفظ التغيير", description: result.error, variant: "destructive" });
      }
    });
  };

  return (
    <Section>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-sm font-bold text-charcoal-900">
          <CreditCard aria-hidden="true" className="h-4 w-4 text-brand-600" />
          طرق الدفع المتاحة
        </h3>
        {pending ? (
          <span role="status" className="inline-flex items-center gap-1.5 text-xs text-brand-700">
            <Loader2 aria-hidden="true" className="h-3.5 w-3.5 animate-spin" />
            جارٍ الحفظ…
          </span>
        ) : null}
      </div>
      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
        تُحفظ فور التغيير، ولا تنتظر «حفظ الدورة».
      </p>

      {disabled ? (
        <p role="note" className="mt-3 text-xs leading-relaxed text-charcoal-500">
          {reason ?? "طرق الدفع تخص الدورات المدفوعة."}
        </p>
      ) : null}

      <ul className="mt-3 space-y-2">
        {ORDER.map((provider) => {
          const ready = available.includes(provider);
          const on = selected.includes(provider);
          return (
            <li
              key={provider}
              className={cn(
                "flex min-h-11 items-center justify-between gap-3 rounded-lg border border-border p-3 lg:min-h-0",
                (!ready || disabled) && "opacity-70",
              )}
            >
              <span className="min-w-0">
                <span className="block text-sm font-medium text-charcoal-800">
                  {LABELS[provider].name}
                  {!ready ? (
                    <span className="ms-2 rounded-full bg-charcoal-100 px-2 py-0.5 text-[11px] font-semibold text-charcoal-600">
                      قريبًا
                    </span>
                  ) : null}
                </span>
                <span className="mt-0.5 block text-xs text-charcoal-500">{LABELS[provider].hint}</span>
              </span>
              <Switch
                checked={on && ready}
                disabled={disabled || pending || !ready || !loaded}
                aria-label={`تفعيل ${LABELS[provider].name}`}
                onCheckedChange={(next) => toggle(provider, next)}
              />
            </li>
          );
        })}
      </ul>

      {!disabled && loaded && selected.length === 0 ? (
        <p role="note" className="mt-3 flex items-start gap-1.5 text-xs leading-relaxed text-brand-700">
          <CircleAlert aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          اختر وسيلة دفع واحدة على الأقل، وإلا لن يستطيع الطالب شراء الدورة.
        </p>
      ) : null}

      {unconfigured.length > 0 ? (
        <p role="note" className="mt-3 flex items-start gap-1.5 text-xs leading-relaxed text-amber-700">
          <CircleAlert aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          وسيلة مفعّلة هنا لكن إعدادها ناقص على الخادم، فلا تظهر للطالب حتى يكتمل.
        </p>
      ) : null}
    </Section>
  );
}

function Section({ children }: { children: React.ReactNode }) {
  return (
    <section aria-label="طرق الدفع" className="rounded-xl border border-border bg-surface/60 p-4">
      {children}
    </section>
  );
}
