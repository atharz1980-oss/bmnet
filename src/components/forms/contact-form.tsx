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
        className="flex h-full min-h-80 flex-col items-center justify-center rounded-2xl border border-brand-100 bg-brand-50/60 p-10 text-center"
      >
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-600/10 text-brand-600">
          <CheckCircle2 aria-hidden="true" className="h-7 w-7" />
        </span>
        <h2 className="mt-4 text-lg font-bold text-charcoal-900">تم استلام رسالتك بنجاح</h2>
        <p className="mt-2 max-w-sm text-sm leading-relaxed text-charcoal-500">
          شكراً لتواصلك مع بيت المصور، سيتم مراجعة رسالتك والرد عليك في أقرب وقت.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5" noValidate={false}>
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
          <Label htmlFor="contact-name">الاسم الكامل</Label>
          <Input id="contact-name" name="name" required placeholder="اكتب اسمك الكامل" autoComplete="name" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="contact-phone">رقم الجوال</Label>
          <Input
            id="contact-phone"
            name="phone"
            type="tel"
            required
            placeholder="05XXXXXXXX"
            inputMode="tel"
            autoComplete="tel"
            className="num-ltr text-end"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="contact-email">البريد الإلكتروني</Label>
        <Input
          id="contact-email"
          name="email"
          type="email"
          required
          placeholder="name@example.com"
          inputMode="email"
          autoComplete="email"
          className="font-latin text-start"
          dir="ltr"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="contact-message">رسالتك</Label>
        <Textarea
          id="contact-message"
          name="message"
          required
          rows={6}
          minLength={10}
          placeholder="اكتب استفسارك أو ملاحظتك هنا..."
          className="resize-y"
        />
      </div>

      <Button type="submit" size="lg" disabled={submitting} className="h-12 w-full gap-2 text-base font-semibold sm:w-auto sm:px-10">
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
