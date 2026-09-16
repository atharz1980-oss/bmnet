"use client";

/**
 * تبويب «محتوى الدورة» — بوابة إلى مدير المحتوى، لا نسخة منه.
 *
 * لماذا رابط لا نموذج مدمج: محرر الدورة نموذج واحد يُحفظ كله دفعة واحدة
 * عبر `save_course_atomic`، بينما الوحدات والدروس تُحفظ فورًا لكل إجراء
 * على حدة. دمجهما في شاشة واحدة يخلط عقدَي حفظ مختلفين: يظن المحرر أن
 * «حفظ الدورة» يشمل الدروس وهو لا يشملها. الفصل هنا مقصود ومشروح للمستخدم.
 */

import Link from "next/link";
import { ArrowLeft, CircleAlert, ListVideo } from "lucide-react";

import { Button } from "@/components/ui/button";

export function OnlineContentTab({
  courseId,
  isDirty,
}: {
  /** غائب في وضع الإنشاء — لا وجود للدورة بعد فلا محتوى لها. */
  courseId?: string;
  isDirty: boolean;
}) {
  if (!courseId) {
    return (
      <section
        aria-labelledby="online-content-title"
        className="rounded-xl border border-dashed border-charcoal-200 bg-surface p-6 text-center sm:p-8"
      >
        <ListVideo aria-hidden="true" className="mx-auto h-8 w-8 text-charcoal-300" />
        <h2 id="online-content-title" className="mt-3 text-base font-semibold text-charcoal-900">
          احفظ الدورة أولًا
        </h2>
        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-charcoal-500">
          الوحدات والدروس تُبنى على دورة قائمة. احفظ بيانات الدورة، ثم يفتح هذا التبويب لإضافة
          محتواها.
        </p>
      </section>
    );
  }

  return (
    <section
      aria-labelledby="online-content-title"
      className="rounded-xl border border-border bg-white p-4 sm:p-6"
    >
      <h2 id="online-content-title" className="flex items-center gap-2 text-base font-semibold text-charcoal-900">
        <ListVideo aria-hidden="true" className="h-5 w-5 text-brand-600" />
        محتوى الدورة الأونلاين
      </h2>

      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-charcoal-600">
        هذه الشاشة لبيانات الدورة: اسمها ووصفها وسعرها ومحاورها التسويقية. أما{" "}
        <strong className="font-semibold text-charcoal-900">الوحدات والدروس</strong> التي يشاهدها
        المتدرب فتُدار في شاشة مستقلة، لأن كل إجراء فيها يُحفظ فور تنفيذه ولا ينتظر «حفظ الدورة».
      </p>

      <dl className="mt-5 grid gap-3 sm:grid-cols-2">
        <div className="rounded-lg border border-charcoal-200/80 bg-surface p-4">
          <dt className="text-xs font-semibold text-charcoal-500">بيانات الدورة</dt>
          <dd className="mt-1 text-sm leading-relaxed text-charcoal-700">
            الاسم، الوصف، الصور، التسعير، المدة، المحاور، المواعيد. تُحفظ كلها معًا من زر «حفظ
            الدورة» في أسفل هذه الشاشة.
          </dd>
        </div>
        <div className="rounded-lg border border-brand-200 bg-brand-50 p-4">
          <dt className="text-xs font-semibold text-brand-700">محتوى الدورة</dt>
          <dd className="mt-1 text-sm leading-relaxed text-brand-800">
            الوحدات والدروس ومعرّفات الفيديو ومن يملك الوصول. تُحفظ فورًا لكل إجراء في شاشتها
            المستقلة.
          </dd>
        </div>
      </dl>

      {isDirty ? (
        <p
          role="note"
          className="mt-5 flex items-start gap-2 rounded-lg border border-brand-200 bg-brand-50 p-3 text-xs leading-relaxed text-brand-800"
        >
          <CircleAlert aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
          لديك تغييرات غير محفوظة في بيانات الدورة. احفظها قبل الانتقال حتى لا تفقدها.
        </p>
      ) : null}

      <div className="mt-5">
        <Button asChild size="lg" className="w-full gap-2 sm:w-auto">
          <Link href={`/admin/courses/${courseId}/content`}>
            فتح محتوى الدورة
            <ArrowLeft aria-hidden="true" className="h-4 w-4" />
          </Link>
        </Button>
      </div>
    </section>
  );
}
