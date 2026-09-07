"use client";

import { useState } from "react";
import { CheckCircle2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { getPublishedCourses } from "@/data/courses";
import { usePublicCms } from "@/context/public-cms";

/**
 * نموذج طلب برنامج تدريبي لشركتك — واجهة فقط (UI Only)
 * لا يُرسل البيانات لأي Backend حالياً؛ يعرض حالة نجاح تجريبية.
 */
export function CorporateTrainingForm() {
  const [submitted, setSubmitted] = useState(false);
  /* Checkpoint 7: خيارات الدورات من الـ CMS بعد الترطيب — وإلا دورات Phase 1 */
  const { view } = usePublicCms();
  const courses = view?.courses ?? getPublishedCourses();

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    // ⚠️ مرحلة لاحقة: إرسال الطلب إلى API حقيقي
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
            name="trainees"
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

      <Button type="submit" size="lg" className="h-12 w-full gap-2 text-base font-semibold sm:w-auto sm:px-10">
        <Send aria-hidden="true" className="h-4 w-4" />
        إرسال الطلب
      </Button>
    </form>
  );
}
