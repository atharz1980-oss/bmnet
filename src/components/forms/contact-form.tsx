"use client";

import { useState } from "react";
import { AlertCircle, CheckCircle2, LoaderCircle, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  submitContactMessageAction,
} from "@/app/admin/actions/public-form";

/**
 * نموذج التواصل — إرسال حقيقي إلى قاعدة البيانات (مراجعة الإطلاق)
 * عبر submitContactMessageAction: عميل anon + RLS يسمح بالإدراج فقط.
 * الحالات: تحميل / نجاح / فشل برسائل عربية — ولا نجاح وهمي إطلاقًا.
 */
/*
 * المرحلة B1: أنماط الهوية الرسمية (رموز --bm-* من نطاق صفحة /contact؛ هذا النموذج لا
 * يُستخدم إلا هناك). الحقول بارتفاع 48px وحدود رمادية رسمية (3.59:1)، وحلقة تركيز فحمية،
 * وزر برتقالي بنص فحمي (4.72:1) — لا نص أبيض على البرتقالي. منطق الإرسال لم يتغير.
 *
 * وضع التباين العالي (forced-colors) يلغي حلقة الظل: إطار تركيز بلون التحديد في النظام فيه وحده.
 * ‎:focus لا ‎:focus-visible — حقول النص تُظهر التركيز دائمًا، وFirefox لم يطابق ‎:focus-visible على الحقول في محاكاة هذا الوضع.
 */
const fieldClass =
  "h-12 lg:h-12 rounded-xl border-[var(--bm-gray)] bg-[var(--bm-white)] px-4 text-base text-[var(--bm-ink)] shadow-none placeholder:text-[var(--bm-ink-72)] focus-visible:border-[var(--bm-ink)] focus-visible:ring-2 focus-visible:ring-[var(--bm-ink)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bm-white)] aria-invalid:border-red-700 forced-colors:focus:outline-solid forced-colors:focus:outline-[3px] forced-colors:focus:outline-offset-2 forced-colors:focus:outline-[Highlight]";
const labelClass = "text-sm font-semibold text-[var(--bm-ink)]";

export function ContactForm() {
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting || submitted) return; /* منع الإرسال المكرر */

    const form = event.currentTarget;
    const data = new FormData(form);
    setSubmitting(true);
    setError(null);

    const result = await submitContactMessageAction({
      name: String(data.get("name") ?? ""),
      phone: String(data.get("phone") ?? ""),
      email: String(data.get("email") ?? ""),
      message: String(data.get("message") ?? ""),
    });

    if (result.ok) {
      setSubmitted(true);
    } else {
      setError(result.error);
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div
        role="status"
        className="flex h-full min-h-80 flex-col items-center justify-center rounded-2xl bg-[var(--bm-offwhite)] p-10 text-center"
      >
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--bm-white)] text-[var(--bm-orange)]">
          <CheckCircle2 aria-hidden="true" className="h-7 w-7" />
        </span>
        <h2 className="mt-4 text-lg font-bold text-[var(--bm-ink)]">تم استلام رسالتك بنجاح</h2>
        <p className="mt-2 max-w-sm text-base leading-relaxed text-[var(--bm-ink-72)]">
          شكراً لتواصلك مع بيت المصور، سيتم مراجعة رسالتك والرد عليك في أقرب وقت.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6" noValidate={false}>
      {error && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-relaxed text-red-700"
        >
          <AlertCircle aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="contact-name" className={labelClass}>الاسم الكامل</Label>
          <Input id="contact-name" name="name" required placeholder="اكتب اسمك الكامل" autoComplete="name" className={fieldClass} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="contact-phone" className={labelClass}>رقم الجوال</Label>
          <Input
            id="contact-phone"
            name="phone"
            type="tel"
            required
            placeholder="05XXXXXXXX"
            inputMode="tel"
            autoComplete="tel"
            className={`${fieldClass} num-ltr text-end font-[family-name:var(--font-bm-montserrat),var(--font-ibm-plex-arabic)]`}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="contact-email" className={labelClass}>البريد الإلكتروني</Label>
        <Input
          id="contact-email"
          name="email"
          type="email"
          required
          placeholder="name@example.com"
          inputMode="email"
          autoComplete="email"
          className={`${fieldClass} text-start font-[family-name:var(--font-bm-montserrat),var(--font-ibm-plex-arabic)]`}
          dir="ltr"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="contact-message" className={labelClass}>رسالتك</Label>
        <Textarea
          id="contact-message"
          name="message"
          required
          rows={6}
          minLength={10}
          placeholder="اكتب استفسارك أو ملاحظتك هنا..."
          className={`${fieldClass} h-auto lg:h-auto min-h-36 resize-y py-3 leading-relaxed`}
        />
      </div>

      {/* وضع التباين العالي (forced-colors) يلغي الخلفية والظل: حدّ وإطار تركيز بألوان النظام فيه وحده */}
      <Button
        type="submit"
        size="lg"
        disabled={submitting}
        className="h-[3.25rem] lg:h-[3.25rem] w-full gap-2 rounded-xl bg-[var(--bm-orange)] text-base font-bold text-[var(--bm-ink)] shadow-none hover:bg-[var(--bm-ink)] hover:text-[var(--bm-white)] focus-visible:ring-2 focus-visible:ring-[var(--bm-ink)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bm-white)] disabled:opacity-70 motion-reduce:transition-none sm:w-auto sm:px-12 forced-colors:border-2 forced-colors:border-solid forced-colors:border-[ButtonText] forced-colors:focus-visible:outline-solid forced-colors:focus-visible:outline-[3px] forced-colors:focus-visible:outline-offset-2 forced-colors:focus-visible:outline-[Highlight]"
      >
        {submitting ? (
          <LoaderCircle aria-hidden="true" className="h-4 w-4 animate-spin" />
        ) : (
          <Send aria-hidden="true" className="h-4 w-4" />
        )}
        {submitting ? "جارٍ الإرسال…" : "إرسال الرسالة"}
      </Button>
    </form>
  );
}
