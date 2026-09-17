/**
 * إطار مشاهدة الدرس — يُستعمل في صفحة الطالب وفي المعاينة الإدارية.
 *
 * لا يعرف شيئًا عن الإذن ولا عن المفاتيح: يستقبل **رابطًا موقّعًا جاهزًا**
 * بناه الخادم، أو `null`. و`null` يعني «لا مشغّل» — لا رجوع إلى embed غير
 * موقّع بحال، فذلك يحوّل عطلًا في الإعداد إلى تسريب صامت.
 *
 * ولهذا لا يستقبل `videoId` أصلًا: ما لا يصل المكوّن لا يتسرب إلى HTML.
 */

import { FileText } from "lucide-react";

import { renderLessonHtml } from "@/lib/learning/rich-text";

export function LessonVideo({ source, title }: { source: string | null; title: string }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-charcoal-200 bg-charcoal-950">
      {source ? (
        <div className="relative aspect-video">
          <iframe
            src={source}
            title={title}
            loading="lazy"
            allow="accelerometer; gyroscope; encrypted-media; picture-in-picture; fullscreen"
            allowFullScreen
            className="absolute inset-0 h-full w-full border-0"
          />
        </div>
      ) : (
        <p className="p-8 text-center text-sm leading-relaxed text-charcoal-300" role="status">
          لم يُربط فيديو هذا الدرس بعد، أو لم يُضبط إعداد البث على الخادم. لا يُعرض الفيديو بلا
          رابط موقّع.
        </p>
      )}
    </div>
  );
}

/**
 * نص الدرس. المصدر markdown محدود يُهرَّب قبل تحويله في `renderLessonHtml`،
 * فلا يمر وسم من المُدخَل إلى الناتج — ولهذا وحده يجوز `dangerouslySetInnerHTML`.
 */
export function LessonBody({ source }: { source: string }) {
  const html = renderLessonHtml(source);
  if (html === "") {
    return (
      <p className="flex items-center gap-2 rounded-2xl border border-dashed border-charcoal-200 p-8 text-sm text-charcoal-400">
        <FileText aria-hidden="true" className="h-4 w-4" />
        لا محتوى في هذا الدرس بعد.
      </p>
    );
  }
  return (
    <div
      className="max-w-2xl text-[15px] leading-relaxed text-charcoal-700"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
