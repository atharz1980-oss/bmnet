"use client";

/**
 * نداء التسجيل — «اشترك الآن» لكل دورة عادية، مجانية كانت أو مدفوعة.
 *
 * نوع التسليم لا يغيّر هذا الزر: الورشة الحضورية تُشترى كما تُشترى الدورة
 * الأونلاين. الفارق يقع **بعد** التسجيل لا قبله، ويقرره الخادم.
 * تدريب الشركات وحده لا يصل هنا أصلًا — صفحته تعرض تواصلًا مباشرًا.
 *
 * والزر لا يقرر شيئًا: يرسل معرّف الدورة (واسم وسيلة الدفع عند الشراء)،
 * والخادم يقرأ السعر والحالة من القاعدة ويقرر. لا مبلغ في الحمولة.
 */

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { CreditCard, Loader2, ShieldCheck, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { Provider } from "@/lib/payments/settings";
import { startCheckoutAction, startFreeEnrollmentAction } from "@/app/courses/actions/enrollment";
import { SessionPicker, type SessionChoice } from "@/components/courses/session-picker";

const PROVIDER_LABEL: Record<Provider, string> = {
  moyasar: "الدفع الكامل — ميسر",
  tabby: "قسّط مع تابي",
  tamara: "قسّط مع تمارا",
};

export type EnrollMode = "free" | "paid";

type Step = Awaited<ReturnType<typeof startFreeEnrollmentAction>>;

export function EnrollCard({
  courseId,
  mode,
  providers,
  sessions = [],
}: {
  courseId: string;
  mode: EnrollMode;
  /** المزودون المفعّلون لهذه الدورة والجاهزون على الخادم. */
  providers: Provider[];
  /** دفعات الدورة إن كانت مجدولة — فارغة يعني تسجيلًا بلا موعد. */
  sessions?: SessionChoice[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [showMethods, setShowMethods] = useState(false);
  /* دفعة واحدة متاحة = اختيار مسبق؛ الاختيار يبقى ظاهرًا لا مخفيًا. */
  const selectableSessions = sessions.filter((session) => session.selectable);
  const [sessionId, setSessionId] = useState<string | null>(
    selectableSessions.length === 1 ? selectableSessions[0].id : null,
  );
  const needsSession = sessions.length > 0;
  const missingSession = needsSession && sessionId === null;
  const noneSelectable = needsSession && selectableSessions.length === 0;

  const run = (key: string, operation: () => Promise<Step>) => {
    setError(null);
    setBusy(key);
    start(async () => {
      const result = await operation();
      if (!result.ok) {
        setError(result.error);
        setBusy(null);
        return;
      }
      if (result.data.kind === "checkout") {
        /* مغادرة إلى صفحة المزود المستضافة. */
        window.location.assign(result.data.href);
        return;
      }
      router.push(result.data.href);
    });
  };

  const picker = needsSession ? (
    <SessionPicker
      sessions={sessions}
      selectedId={sessionId}
      disabled={pending}
      onSelect={(id) => {
        setSessionId(id);
        setError(null);
      }}
    />
  ) : null;

  if (noneSelectable) {
    return (
      <div className="mt-6 space-y-2">
        {picker}
        <p className="rounded-xl border border-charcoal-200 bg-surface px-4 py-3 text-center text-xs leading-relaxed text-charcoal-600">
          اكتملت مقاعد جميع المواعيد الحالية. تواصل معنا لمعرفة الدفعة القادمة.
        </p>
      </div>
    );
  }

  if (mode === "free") {
    return (
      <div className="mt-6 space-y-2">
        {picker}
        <Button
          size="lg"
          className="h-12 w-full gap-2 text-base font-semibold"
          disabled={pending || missingSession}
          onClick={() => run("free", () => startFreeEnrollmentAction(courseId, sessionId ?? undefined))}
        >
          {pending ? (
            <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
          ) : (
            <Sparkles aria-hidden="true" className="h-4 w-4" />
          )}
          اشترك الآن
        </Button>
        <p className="text-center text-xs text-charcoal-400">
          {missingSession ? "اختر الموعد المناسب أولًا." : "التسجيل مجاني — تحتاج حسابًا فقط."}
        </p>
        <ErrorNote message={error} />
      </div>
    );
  }

  if (providers.length === 0) {
    return (
      <p className="mt-6 rounded-xl border border-charcoal-200 bg-surface px-4 py-3 text-center text-xs leading-relaxed text-charcoal-600">
        الدفع الإلكتروني لهذه الدورة غير متاح حاليًا. تواصل معنا لإتمام التسجيل.
      </p>
    );
  }

  /* وسيلة واحدة: «اشترك الآن» يمضي بها مباشرة — نقرة وسيطة بلا خيار عبث. */
  const single = providers.length === 1 ? providers[0] : null;

  return (
    <div className="mt-6 space-y-2">
      {picker}
      {single && !showMethods ? (
        <>
          <Button
            size="lg"
            className="h-12 w-full gap-2 text-base font-semibold"
            disabled={pending || missingSession}
            onClick={() => run(single, () => startCheckoutAction(courseId, single, sessionId ?? undefined))}
          >
            {pending ? (
              <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
            ) : (
              <CreditCard aria-hidden="true" className="h-4 w-4" />
            )}
            اشترك الآن
          </Button>
          <p className="text-center text-xs text-charcoal-400">{PROVIDER_LABEL[single]}</p>
        </>
      ) : !showMethods ? (
        <Button
          size="lg"
          className="h-12 w-full gap-2 text-base font-semibold"
          disabled={pending || missingSession}
          onClick={() => setShowMethods(true)}
        >
          <CreditCard aria-hidden="true" className="h-4 w-4" />
          اشترك الآن
        </Button>
      ) : (
        <>
          <p className="text-center text-xs font-medium text-charcoal-600">اختر طريقة الدفع</p>
          {providers.map((provider) => (
            <Button
              key={provider}
              size="lg"
              variant={provider === "moyasar" ? "default" : "outline"}
              className="h-12 w-full gap-2 text-base font-semibold"
              disabled={pending}
              onClick={() => run(provider, () => startCheckoutAction(courseId, provider, sessionId ?? undefined))}
            >
              {pending && busy === provider ? (
                <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
              ) : (
                <CreditCard aria-hidden="true" className="h-4 w-4" />
              )}
              {PROVIDER_LABEL[provider]}
            </Button>
          ))}
        </>
      )}
      <p className="flex items-center justify-center gap-1.5 text-center text-xs text-charcoal-400">
        <ShieldCheck aria-hidden="true" className="h-3.5 w-3.5 text-brand-500" />
        الدفع يتم على صفحة مزوّد الدفع الآمنة — لا تُحفظ بيانات بطاقتك لدينا.
      </p>
      <ErrorNote message={error} />
    </div>
  );
}

function ErrorNote({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p role="alert" className="rounded-lg bg-brand-50 px-3 py-2 text-center text-xs leading-relaxed text-brand-800">
      {message}
    </p>
  );
}
