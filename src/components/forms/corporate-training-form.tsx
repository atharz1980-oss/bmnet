"use client";

import { useState } from "react";
import { AlertCircle, CheckCircle2, Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { getPublishedCourses } from "@/data/courses";
import { usePublicCms } from "@/context/public-cms";
import { submitCorporateRequestAction } from "@/app/admin/actions/public-form";

/**
 * نموذج طلب برنامج تدريبي لشركتك — متصل بقاعدة البيانات (CP-G)
 * الإرسال عبر Server Action (إدراج anon مسموح بسياسة RLS الموثقة)،
 * والطلب يظهر في لوحة الإدارة فورًا.
 */
export function CorporateTrainingForm() {
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  /* خيارات الدورات من الـ CMS من قاعدة البيانات — وإلا دورات Phase 1 */
  const { view } = usePublicCms();
  const courses = view?.courses ?? getPublishedCourses();

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting) return;
    const formData = new FormData(event.currentTarget);
    setSubmitting(true);
    setFormError(null);

    const result = await submitCorporateRequestAction({
      company: String(formData.get("company") ?? ""),
      contactPerson: String(formData.get("contactName") ?? ""),
      phone: String(formData.get("phone") ?? ""),
      email: String(formData.get("email") ?? ""),
      traineesCount: Number(formData.get("traineesCount") ?? 1),
      requestedCourse: String(formData.get("course") ?? ""),
      notes: String(formData.get("notes") ?? ""),
    });
    setSubmitting(false);

    if (!result.ok) {
      setFormError(result.error);
      return;
    }
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div
        role="status"
        className="flex min-h-80 flex-col items-center justify-center rounded-2xl border border-brand-100 bg-brand-50/60 p-10 text-center"
      >
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-600/10 text-brand-600">
          <CheckCircle2 aria-hidden="true" className="h-7 w-7" />
        </span>
        <h2 className="mt-4 text-lg font-bold text-charcoal-900">تم استلام طلبكم بنجاح</h2>
        <p className="mt-2 max-w-md text-sm leading-relaxed text-charcoal-500">
          سيتم مراجعة بيانات الطلب والتواصل معكم في أقرب وقت.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {formError ? (
        <p
          role="alert"
          className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-sm text-destructive"
        >
          <AlertCircle aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
          {formError}
        </p>
      ) : null}
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="corp-company">اسم الشركة</Label>
          <Input id="corp-company" name="company" required placeholder="الاسم الرسمي للشركة" autoComplete="organization" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="corp-contact">اسم مسؤول التواصل</Label>
          <Input id="corp-contact" name="contactName" required placeholder="الاسم الكامل" autoComplete="name" />
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="corp-phone">رقم الجوال</Label>
          <Input
            id="corp-phone"
            name="phone"
            type="tel"
            required
            placeholder="05XXXXXXXX"
            inputMode="tel"
            autoComplete="tel"
            className="num-ltr text-end"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="corp-email">البريد الإلكتروني</Label>
          <Input
            id="corp-email"
            name="email"
            type="email"
            required
            placeholder="name@company.com"
            inputMode="email"
            autoComplete="email"
            dir="ltr"
            className="font-latin text-start"
          />
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="corp-trainees">عدد المتدربين</Label>
          <Input
            id="corp-trainees"
            name="traineesCount"
            type="number"
            min={1}
            required
            placeholder="مثال: 10"
            inputMode="numeric"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="corp-course">الدورة المطلوبة</Label>
          <select
            id="corp-course"
            name="course"
            required
            defaultValue=""
            className="h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-2 focus-visible:outline-ring/50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <option value="" disabled>
              اختر الدورة أو البرنامج
            </option>
            {courses
              .filter((course) => course.published && course.price > 0)
              .map((course) => (
                <option key={course.id} value={course.slug}>
                  {course.name}
                </option>
              ))}
            <option value="custom">برنامج مخصص حسب احتياجنا</option>
          </select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="corp-notes">ملاحظات</Label>
        <Textarea
          id="corp-notes"
          name="notes"
          rows={5}
          placeholder="اكتب أي تفاصيل إضافية: التوقيت المفضل، مستوى الفريق، هدف التدريب..."
        />
      </div>

      <Button type="submit" size="lg" className="h-12 w-full gap-2 text-base font-semibold sm:w-auto sm:px-10" disabled={submitting}>
        {submitting ? (
          <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
        ) : (
          <Send aria-hidden="true" className="h-4 w-4" />
        )}
        {submitting ? "جارٍ الإرسال…" : "إرسال الطلب"}
      </Button>
    </form>
  );
}
