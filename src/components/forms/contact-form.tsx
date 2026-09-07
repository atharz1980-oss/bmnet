"use client";

import { useState } from "react";
import { CheckCircle2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

/**
 * نموذج التواصل — واجهة فقط (UI Only)
 * لا يُرسل البيانات لأي Backend حالياً؛ يعرض حالة نجاح تجريبية.
 */
export function ContactForm() {
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    // ⚠️ مرحلة لاحقة: إرسال النموذج إلى API حقيقي
    setSubmitted(true);
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
          placeholder="اكتب استفسارك أو ملاحظتك هنا..."
          className="resize-y"
        />
      </div>

      <Button type="submit" size="lg" className="h-12 w-full gap-2 text-base font-semibold sm:w-auto sm:px-10">
        <Send aria-hidden="true" className="h-4 w-4" />
        إرسال الرسالة
      </Button>
    </form>
  );
}
