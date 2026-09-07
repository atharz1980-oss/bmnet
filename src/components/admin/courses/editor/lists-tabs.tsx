"use client";

/**
 * ListsTabs — تبويبات القوائم الديناميكية الثلاث
 * مخرجات التعلم / الفئة المستهدفة / المتطلبات — كلها Repeater واحد.
 */
import type { CourseInput } from "@/context/admin-store";
import { Repeater } from "@/components/admin/ui/repeater";

interface TabProps {
  draft: CourseInput;
  update: (patch: Partial<CourseInput>) => void;
  errors: Record<string, string>;
}

export function OutcomesTab({ draft, update }: TabProps) {
  return (
    <div className="max-w-2xl space-y-3">
      <p className="text-sm leading-relaxed text-muted-foreground">
        ما سيتقنه المتدرب بعد إتمام الدورة — يظهر في صفحة الدورة العامة كقائمة رئيسية.
      </p>
      <Repeater
        label="مخرجات التعلم"
        items={draft.outcomes}
        onChange={(outcomes) => update({ outcomes })}
        addLabel="إضافة مخرج"
        placeholder="مثال: التصوير بوضع يدوي كامل بثقة"
        hint="رتّب المخرجات حسب تسلسل اكتساب المهارة."
      />
    </div>
  );
}

export function AudienceTab({ draft, update }: TabProps) {
  return (
    <div className="max-w-2xl space-y-3">
      <p className="text-sm leading-relaxed text-muted-foreground">
        لمن صُممت هذه الدورة — تساعد الزائر على تحديد ملاءمتها لمستواه.
      </p>
      <Repeater
        label="الفئة المستهدفة"
        items={draft.audience}
        onChange={(audience) => update({ audience })}
        addLabel="إضافة فئة"
        placeholder="مثال: من يبدأ من الصفر بلا خبرة سابقة"
      />
    </div>
  );
}

export function RequirementsTab({ draft, update }: TabProps) {
  return (
    <div className="max-w-2xl space-y-3">
      <p className="text-sm leading-relaxed text-muted-foreground">
        ما يحتاجه المتدرب قبل البدء — معدات أو خبرات أو شروط حضور.
      </p>
      <Repeater
        label="المتطلبات"
        items={draft.requirements}
        onChange={(requirements) => update({ requirements })}
        addLabel="إضافة متطلب"
        placeholder="مثال: كاميرا (أي نوع متاح لديك)"
      />
    </div>
  );
}
