"use client";

/**
 * نداء التسجيل في دورة أونلاين — مجانًا أو بالشراء.
 *
 * الزر لا يقرر شيئًا: يرسل معرّف الدورة (واسم وسيلة الدفع عند الشراء) إلى
 * الخادم، والخادم يقرأ السعر والحالة من القاعدة ويقرر. لا مبلغ في الحمولة
 * ولا «مجانية» ولا حالة تسجيل — ما يكتبه المتصفح لا يفتح وصولًا.
 *
 * ولا يُعرض مزوّد غير جاهز: القائمة تصل من الخادم بعد ترشيحها بما هو
 * مفعّل للدورة **وعامل فعلًا**، فلا زر يَعِد بما لا يتم.
 */

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { CreditCard, Loader2, PlayCircle, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { Provider } from "@/lib/payments/settings";
import { startCheckoutAction, startFreeEnrollmentAction } from "@/app/courses/actions/enrollment";

const PROVIDER_LABEL: Record<Provider, string> = {
  moyasar: "ادفع كاملًا — ميسر",
  tabby: "قسّط مع تابي",
  tamara: "قسّط مع تمارا",
};

export type EnrollMode = "free" | "paid";

export function EnrollCard({
  courseId,
  mode,
  providers,
}: {
  courseId: string;
  mode: EnrollMode;
  /** المزودون المفعّلون لهذه الدورة والجاهزون على الخادم. */
  providers: Provider[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const run = (key: string, operation: () => Promise<Awaited<ReturnType<typeof startFreeEnrollmentAction>>>) => {
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

  if (mode === "free") {
    return (
      <div className="mt-6 space-y-2">
        <Button
          size="lg"
          className="h-12 w-full gap-2 text-base font-semibold"
          disabled={pending}
          onClick={() => run("free", () => startFreeEnrollmentAction(courseId))}
        >
          {pending ? (
            <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
          ) : (
            <PlayCircle aria-hidden="true" className="h-4 w-4" />
          )}
          ابدأ الدورة مجانًا
        </Button>
        <p className="text-center text-xs text-charcoal-400">تحتاج حسابًا مجانيًا فقط.</p>
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

  return (
    <div className="mt-6 space-y-2">
      {providers.map((provider) => (
        <Button
          key={provider}
          size="lg"
          variant={provider === "moyasar" ? "default" : "outline"}
          className="h-12 w-full gap-2 text-base font-semibold"
          disabled={pending}
          onClick={() => run(provider, () => startCheckoutAction(courseId, provider))}
        >
          {pending && busy === provider ? (
            <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
          ) : (
            <CreditCard aria-hidden="true" className="h-4 w-4" />
          )}
          {PROVIDER_LABEL[provider]}
        </Button>
      ))}
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
