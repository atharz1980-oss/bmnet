"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import {
  ArrowLeft,
  Calendar,
  Camera,
  CheckCircle2,
  ChevronDown,
  ExternalLink,
  Heart,
  Laptop,
  Mail,
  MapPin,
  Maximize2,
  Phone,
  Send,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Star,
  X,
} from "lucide-react";

import { Container } from "@/components/shared/container";
import { MASHAEL_MOCKUP_ANCHOR, REGISTRATION_ANCHOR } from "./anchors";

export function MashaelShowcaseSection() {
  const [activeTab, setActiveTab] = useState<"desktop" | "mobile" | "admin">("desktop");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [bookingSent, setBookingSent] = useState(false);

  return (
    <section
      id={MASHAEL_MOCKUP_ANCHOR}
      aria-labelledby="mashael-showcase-heading"
      className="relative bg-charcoal-900 py-16 sm:py-24 text-white border-t border-white/5 scroll-mt-12 overflow-hidden"
    >
      {/* إضاءة خلفية دافئة بلون الشامبانيا والذهب */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-40 right-1/4 h-96 w-96 rounded-full bg-amber-500/10 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-40 left-1/4 h-96 w-96 rounded-full bg-amber-600/10 blur-3xl"
      />

      <Container className="relative">
        {/* رأس القسم مع النص المطلوب حرفيًا */}
        <div className="mx-auto max-w-3xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-4 py-1.5 text-xs sm:text-sm font-semibold text-amber-300">
            <Sparkles className="h-4 w-4" />
            <span>مشروع تطبيقي حي من الدورة</span>
          </div>

          <h2
            id="mashael-showcase-heading"
            className="mt-4 text-3xl sm:text-5xl font-extrabold tracking-tight text-white"
          >
            تخيّل موقعك بالشكل ده!
          </h2>

          <p className="mt-4 text-base sm:text-lg leading-relaxed text-charcoal-300">
            ده نموذج لموقع مصورة سعودية اسمها <strong className="text-amber-300 font-bold">مشاعل</strong>. خلال الدورة هتتعلم تبني موقعك الخاص بهويتك وصورك وخدماتك، خطوة بخطوة باستخدام الذكاء الاصطناعي.
          </p>

          <div className="mt-3 inline-block rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-1 text-xs text-amber-200/90">
            * مشاعل شخصية وهوية افتراضية طُورت لأغراض العرض والتطبيق العملي في الدورة.
          </div>

          {/* أزرار التحكم بالمعاينة والمودال التفاعلي */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 px-5 text-sm font-bold text-charcoal-950 shadow-lg shadow-amber-950/40 transition-all hover:from-amber-400 hover:to-amber-500"
            >
              <span>استكشف نموذج موقع مشاعل</span>
              <ExternalLink className="h-4 w-4" />
            </button>

            <div className="inline-flex rounded-xl border border-white/10 bg-charcoal-950/80 p-1">
              <button
                type="button"
                onClick={() => setActiveTab("desktop")}
                className={`flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-medium transition-colors ${
                  activeTab === "desktop"
                    ? "bg-amber-500 text-charcoal-950 font-bold"
                    : "text-charcoal-300 hover:text-white"
                }`}
              >
                <Laptop className="h-4 w-4" />
                <span>عرض اللابتوب</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("mobile")}
                className={`flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-medium transition-colors ${
                  activeTab === "mobile"
                    ? "bg-amber-500 text-charcoal-950 font-bold"
                    : "text-charcoal-300 hover:text-white"
                }`}
              >
                <Smartphone className="h-4 w-4" />
                <span>عرض الجوال</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("admin")}
                className={`flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-medium transition-colors ${
                  activeTab === "admin"
                    ? "bg-amber-500 text-charcoal-950 font-bold"
                    : "text-charcoal-300 hover:text-white"
                }`}
              >
                <ShieldCheck className="h-4 w-4" />
                <span>لوحة الإدارة التجريبية</span>
              </button>
            </div>
          </div>
        </div>

        {/* عرض المعاينة الحية المضمنة لموقع مشاعل */}
        <div className="mt-12">
          {activeTab === "desktop" ? (
            /* لابتوب متصفح سطح المكتب */
            <div className="mx-auto max-w-5xl rounded-2xl border border-white/15 bg-charcoal-950 shadow-2xl overflow-hidden">
              {/* شريط المتصفح */}
              <div className="flex items-center justify-between border-b border-white/10 bg-charcoal-900/90 px-4 py-3">
                <div className="flex items-center gap-1.5">
                  <span className="h-3 w-3 rounded-full bg-rose-500/80" />
                  <span className="h-3 w-3 rounded-full bg-amber-500/80" />
                  <span className="h-3 w-3 rounded-full bg-emerald-500/80" />
                </div>
                <div className="flex items-center gap-2 rounded-lg bg-charcoal-950/80 px-4 py-1 text-xs text-charcoal-400 font-mono border border-white/5">
                  <span>https://mashaelphotography.sa</span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(true)}
                  className="text-xs text-amber-300 hover:text-amber-200 flex items-center gap-1 font-medium"
                >
                  <Maximize2 className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">تكبير المعاينة</span>
                </button>
              </div>

              {/* جسم موقع مشاعل (Editorial Luxury Palette: Ivory, Beige, Charcoal, Gold) */}
              <div className="bg-[#FAF7F2] text-[#1A1A1A] p-6 sm:p-10 font-sans" dir="rtl">
                {/* رأس موقع مشاعل */}
                <div className="flex items-center justify-between border-b border-[#E8E1D5] pb-5">
                  <div className="flex items-center gap-2">
                    <Camera className="h-5 w-5 text-[#B88E3E]" />
                    <div>
                      <span className="block font-serif text-lg font-bold tracking-tight text-[#1A1A1A]">
                        Mashael Photography
                      </span>
                      <span className="block text-[11px] text-[#8C8273] font-medium">
                        تصوير مشاعل — الرياض
                      </span>
                    </div>
                  </div>
                  <nav className="hidden md:flex items-center gap-6 text-xs font-medium text-[#5A5245]">
                    <span className="text-[#B88E3E] font-bold">الرئيسية</span>
                    <span>معرض الأعمال</span>
                    <span>من أنا</span>
                    <span>خدمات التصوير</span>
                    <span>الباقات</span>
                  </nav>
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(true)}
                    className="rounded-full bg-[#1A1A1A] px-4 py-2 text-xs font-semibold text-[#FAF7F2] hover:bg-[#B88E3E] transition-colors"
                  >
                    احجزي جلستك
                  </button>
                </div>

                {/* قسم Hero الخاص بمشاعل */}
                <div className="mt-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                  <div className="lg:col-span-7">
                    <span className="inline-block rounded-full bg-[#F2EDE4] px-3.5 py-1 text-xs font-bold text-[#B88E3E] mb-3">
                      مصورة بورتريه وأعراس معتمدة
                    </span>
                    <h3 className="font-serif text-2xl sm:text-4xl font-extrabold text-[#1A1A1A] leading-tight">
                      لحظاتكم الجميلة… <br />
                      <span className="text-[#B88E3E]">أحفظها بعدستي.</span>
                    </h3>
                    <p className="mt-4 text-xs sm:text-sm text-[#5A5245] leading-relaxed max-w-lg">
                      أهلاً بكِ في عالمي، حيث تلتقي المشاعر الصادقة بجمال الإضاءة والتفاصيل الفاخرة. نوثق مناسباتكم الخاصة في المملكة برؤية فوتوغرافية معاصرة تخلّد كل تفصيلة.
                    </p>
                    <div className="mt-6 flex flex-wrap items-center gap-3">
                      <button
                        type="button"
                        onClick={() => setIsModalOpen(true)}
                        className="rounded-xl bg-[#B88E3E] px-5 py-2.5 text-xs sm:text-sm font-bold text-white shadow-md hover:bg-[#A37B31] transition-colors"
                      >
                        احجزي جلستك الآن
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsModalOpen(true)}
                        className="rounded-xl border border-[#DCD3C3] bg-white px-4 py-2.5 text-xs sm:text-sm font-medium text-[#1A1A1A] hover:bg-[#F2EDE4] transition-colors"
                      >
                        تصفحي الأعمال
                      </button>
                    </div>
                  </div>

                  <div className="lg:col-span-5">
                    <div className="relative aspect-[4/5] rounded-2xl overflow-hidden shadow-xl border-4 border-white">
                      <Image
                        src="/images/mashael/mashael-hero.jpg"
                        alt="المصورة مشاعل — Mashael Photography"
                        fill
                        className="object-cover"
                      />
                    </div>
                  </div>
                </div>

                {/* معرض الأعمال المصغر لمشاعل */}
                <div className="mt-12 border-t border-[#E8E1D5] pt-8">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-serif text-base sm:text-lg font-bold text-[#1A1A1A]">
                      مقتطفات من أعمال مشاعل
                    </h4>
                    <span className="text-xs text-[#B88E3E] font-medium">عرض جميع المعارض (48 جلسة)</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="relative aspect-square rounded-xl overflow-hidden shadow-sm border border-[#E8E1D5] group">
                      <Image
                        src="/images/mashael/portfolio-wedding.jpg"
                        alt="تصوير أعراس سعودية راقية"
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent p-3 flex flex-col justify-end">
                        <span className="text-xs font-bold text-white">تصوير الأعراس والملكة</span>
                        <span className="text-[10px] text-amber-200">توثيق التفاصيل الفاخرة</span>
                      </div>
                    </div>

                    <div className="relative aspect-square rounded-xl overflow-hidden shadow-sm border border-[#E8E1D5] group">
                      <Image
                        src="/images/mashael/portfolio-product.jpg"
                        alt="تصوير منتجات وعطور فاخرة"
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent p-3 flex flex-col justify-end">
                        <span className="text-xs font-bold text-white">تصوير المنتجات والعطور</span>
                        <span className="text-[10px] text-amber-200">جلسات تجارية احترافية</span>
                      </div>
                    </div>

                    <div className="relative aspect-square rounded-xl overflow-hidden shadow-sm border border-[#E8E1D5] group">
                      <Image
                        src="/images/mashael/mashael-action.jpg"
                        alt="جلسات تصوير البورتريه"
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent p-3 flex flex-col justify-end">
                        <span className="text-xs font-bold text-white">جلسات البورتريه والاستوديو</span>
                        <span className="text-[10px] text-amber-200">إضاءة درامية ناعمة</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* باقات التصوير ونموذج الحجز التجريبي */}
                <div className="mt-10 rounded-2xl bg-white p-6 border border-[#E8E1D5] shadow-sm">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="rounded-xl border border-[#E8E1D5] p-4 text-center bg-[#FAF7F2]">
                      <span className="text-xs font-bold text-[#8C8273]">باقة البورتريه</span>
                      <div className="mt-2 text-xl font-extrabold text-[#1A1A1A]">850 ر.س</div>
                      <p className="mt-1 text-[11px] text-[#5A5245]">ساعة تصوير + 10 صور معدلة</p>
                    </div>
                    <div className="rounded-xl border-2 border-[#B88E3E] p-4 text-center bg-[#FFFDF9] relative">
                      <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 rounded-full bg-[#B88E3E] px-2.5 py-0.5 text-[10px] font-bold text-white">
                        الأكثر طلبًا
                      </span>
                      <span className="text-xs font-bold text-[#B88E3E]">باقة الملكة والأعراس</span>
                      <div className="mt-2 text-xl font-extrabold text-[#1A1A1A]">2,800 ر.س</div>
                      <p className="mt-1 text-[11px] text-[#5A5245]">تغطية 4 ساعات + ألبوم فاخر</p>
                    </div>
                    <div className="rounded-xl border border-[#E8E1D5] p-4 text-center bg-[#FAF7F2]">
                      <span className="text-xs font-bold text-[#8C8273]">باقة المنتجات التجارية</span>
                      <div className="mt-2 text-xl font-extrabold text-[#1A1A1A]">1,200 ر.س</div>
                      <p className="mt-1 text-[11px] text-[#5A5245]">15 منتج + خلفيات متنوعة</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : activeTab === "mobile" ? (
            /* عرض متصفح الجوال المحاكى */
            <div className="mx-auto max-w-sm rounded-[38px] border-4 border-charcoal-700 bg-charcoal-950 p-3 shadow-2xl">
              <div className="rounded-[30px] overflow-hidden bg-[#FAF7F2] text-[#1A1A1A]" dir="rtl">
                {/* شريط حالة الجوال */}
                <div className="flex items-center justify-between px-6 pt-3 pb-2 text-[10px] font-mono text-[#8C8273] border-b border-[#E8E1D5]">
                  <span>9:41</span>
                  <span>5G 100%</span>
                </div>

                <div className="p-4 space-y-4">
                  {/* رأس الجوال */}
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-serif text-sm font-bold text-[#1A1A1A] block">
                        Mashael Photography
                      </span>
                      <span className="text-[10px] text-[#B88E3E]">تصوير مشاعل</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsModalOpen(true)}
                      className="rounded-full bg-[#1A1A1A] px-3 py-1 text-[10px] font-bold text-white"
                    >
                      احجزي الآن
                    </button>
                  </div>

                  {/* صورة البطل للجوال */}
                  <div className="relative aspect-[4/3] rounded-xl overflow-hidden shadow-md">
                    <Image
                      src="/images/mashael/mashael-hero.jpg"
                      alt="المصورة مشاعل"
                      fill
                      className="object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent p-3 flex flex-col justify-end">
                      <span className="text-[10px] text-amber-300 font-bold">لحظاتكم الجميلة أحفظها بعدستي</span>
                      <span className="text-xs font-bold text-white">مشاعل — مصورة فوتوغرافية سعودية</span>
                    </div>
                  </div>

                  {/* معرض مصغر */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="relative aspect-square rounded-lg overflow-hidden border border-[#E8E1D5]">
                      <Image src="/images/mashael/portfolio-wedding.jpg" alt="أعراس" fill className="object-cover" />
                      <span className="absolute bottom-1 right-1 text-[9px] bg-black/60 text-white px-1.5 py-0.5 rounded font-bold">
                        أعراس
                      </span>
                    </div>
                    <div className="relative aspect-square rounded-lg overflow-hidden border border-[#E8E1D5]">
                      <Image src="/images/mashael/portfolio-product.jpg" alt="منتجات" fill className="object-cover" />
                      <span className="absolute bottom-1 right-1 text-[9px] bg-black/60 text-white px-1.5 py-0.5 rounded font-bold">
                        منتجات
                      </span>
                    </div>
                  </div>

                  {/* زر الحجز السريع للجوال */}
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(true)}
                    className="w-full rounded-xl bg-[#B88E3E] py-2.5 text-center text-xs font-bold text-white shadow-md"
                  >
                    فتح نموذج طلب حجز تجريبي
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* لوحة الإدارة التجريبية لموقع مشاعل (Demo Admin Dashboard) */
            <div className="mx-auto max-w-5xl rounded-2xl border border-white/15 bg-charcoal-950 shadow-2xl overflow-hidden">
              <div className="flex items-center justify-between border-b border-white/10 bg-charcoal-900/90 px-4 py-3">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-emerald-400" />
                  <span className="text-xs font-bold text-white">لوحة تحكم موقع مشاعل (مشروع تطبيقي)</span>
                </div>
                <div className="text-xs text-charcoal-400 font-mono">
                  admin.mashaelphotography.sa
                </div>
              </div>

              <div className="p-6 sm:p-8 bg-charcoal-900 text-white space-y-6" dir="rtl">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
                  <div>
                    <h3 className="text-lg font-bold text-white">مرحباً مشاعل 👋</h3>
                    <p className="text-xs text-charcoal-400">إليك ملخص حجوزاتك وموقعك الإلكتروني اليوم</p>
                  </div>
                  <div className="inline-flex items-center gap-2 rounded-lg bg-amber-500/10 border border-amber-500/30 px-3 py-1.5 text-xs text-amber-300">
                    <span>حالة الموقع: متصل ونشط 🟢</span>
                  </div>
                </div>

                {/* بطاقات الإحصاءات */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                  <div className="rounded-xl border border-white/10 bg-charcoal-950 p-4">
                    <span className="text-xs text-charcoal-400 block">طلبات الحجز الجديدة</span>
                    <span className="text-2xl font-extrabold text-amber-400 mt-1 block">8</span>
                    <span className="text-[10px] text-emerald-400">+3 هذا الأسبوع</span>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-charcoal-950 p-4">
                    <span className="text-xs text-charcoal-400 block">زيارات المعرض</span>
                    <span className="text-2xl font-extrabold text-white mt-1 block">1,420</span>
                    <span className="text-[10px] text-emerald-400">من مختلف مدن المملكة</span>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-charcoal-950 p-4">
                    <span className="text-xs text-charcoal-400 block">الصور المرفوعة</span>
                    <span className="text-2xl font-extrabold text-white mt-1 block">48</span>
                    <span className="text-[10px] text-charcoal-400">في 4 معارض رئيسية</span>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-charcoal-950 p-4">
                    <span className="text-xs text-charcoal-400 block">متوسط تقييم العملاء</span>
                    <span className="text-2xl font-extrabold text-amber-400 mt-1 block">4.9 ★</span>
                    <span className="text-[10px] text-amber-300">من 36 مراجعة موثقة</span>
                  </div>
                </div>

                {/* جدول طلبات الحجز التجريبية */}
                <div className="rounded-xl border border-white/10 bg-charcoal-950 p-4 overflow-x-auto">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-xs sm:text-sm font-bold text-white">آخر طلبات الحجز المستلمة عبر الموقع</h4>
                    <span className="text-xs text-amber-400">تحديث فوري</span>
                  </div>
                  <table className="w-full text-xs text-start">
                    <thead>
                      <tr className="border-b border-white/10 text-charcoal-400 pb-2">
                        <th className="py-2 text-start font-medium">اسم العميلة</th>
                        <th className="py-2 text-start font-medium">نوع الجلسة</th>
                        <th className="py-2 text-start font-medium">المدينة</th>
                        <th className="py-2 text-start font-medium">الموعد</th>
                        <th className="py-2 text-start font-medium">الحالة</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 text-charcoal-300">
                      <tr>
                        <td className="py-2.5 font-bold text-white">نورة السبيعي</td>
                        <td className="py-2.5">تغطية حفل زفاف</td>
                        <td className="py-2.5">الرياض</td>
                        <td className="py-2.5 font-mono">2026/11/14</td>
                        <td className="py-2.5"><span className="rounded-full bg-emerald-500/20 text-emerald-400 px-2 py-0.5 text-[10px] font-bold">مؤكد</span></td>
                      </tr>
                      <tr>
                        <td className="py-2.5 font-bold text-white">هند القحطاني</td>
                        <td className="py-2.5">بورتريه شخصي</td>
                        <td className="py-2.5">الدرعية</td>
                        <td className="py-2.5 font-mono">2026/11/02</td>
                        <td className="py-2.5"><span className="rounded-full bg-amber-500/20 text-amber-400 px-2 py-0.5 text-[10px] font-bold">قيد المراجعة</span></td>
                      </tr>
                      <tr>
                        <td className="py-2.5 font-bold text-white">براند مسك وعنبر</td>
                        <td className="py-2.5">تصوير منتجات</td>
                        <td className="py-2.5">جدة</td>
                        <td className="py-2.5 font-mono">2026/10/29</td>
                        <td className="py-2.5"><span className="rounded-full bg-emerald-500/20 text-emerald-400 px-2 py-0.5 text-[10px] font-bold">مكتمل</span></td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 text-xs text-charcoal-300 flex items-center justify-between">
                  <span>💡 خلال الدورة ستتعلم كيف تنشئ لوحة إدارة خاصة بك وتتحكم في صورك وأسعارك وطلبات حجزك بكل سهولة.</span>
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(true)}
                    className="text-amber-400 hover:text-amber-300 font-bold underline shrink-0"
                  >
                    استكشف واجهة الموقع
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* المودال التفاعلي الكامل لموقع مشاعل (Interactive Modal Showcase) */}
        {isModalOpen && (
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-mashael-title"
            className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md overflow-y-auto"
          >
            <div className="relative w-full max-w-4xl max-h-[92vh] flex flex-col rounded-2xl bg-[#FAF7F2] text-[#1A1A1A] shadow-2xl overflow-hidden border border-[#E8E1D5]" dir="rtl">
              {/* شريط أدوات النافذة */}
              <div className="flex items-center justify-between border-b border-[#E8E1D5] bg-[#F2EDE4] px-5 py-3">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                  <span className="font-serif text-sm font-bold text-[#1A1A1A]">
                    Mashael Photography — نموذج موقع تجريبي تفاعلي
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-lg p-1.5 text-charcoal-500 hover:bg-black/10 hover:text-black transition-colors"
                  aria-label="إغلاق المعاينة"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* محتوى موقع مشاعل التفاعلي الكامل */}
              <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-8 font-sans">
                {/* بانر توضيحي */}
                <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3.5 text-xs text-[#8C6D2D] flex items-center justify-between">
                  <span>💡 هذا نموذج موقع حقيقي تم إنشاؤه بدون كود بأسلوب ما ستتعلمه في الدورة.</span>
                  <a
                    href={`#${REGISTRATION_ANCHOR}`}
                    onClick={() => setIsModalOpen(false)}
                    className="rounded-lg bg-[#B88E3E] px-3 py-1 font-bold text-white hover:bg-[#A37B31]"
                  >
                    سجل بالدورة لبناء موقعك
                  </a>
                </div>

                {/* Hero داخل المودال */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-[#B88E3E]">
                      Editorial Saudi Photography
                    </span>
                    <h3 id="modal-mashael-title" className="mt-2 font-serif text-2xl sm:text-3xl font-extrabold text-[#1A1A1A]">
                      لحظاتكم الجميلة… أحفظها بعدستي.
                    </h3>
                    <p className="mt-3 text-xs sm:text-sm text-[#5A5245] leading-relaxed">
                      تصوير فوتوغرافي راقٍ للأعراس، البورتريه، والمنتجات الفاخرة في المملكة العربية السعودية.
                    </p>
                    <div className="mt-4 flex items-center gap-2 text-xs text-[#8C8273]">
                      <MapPin className="h-4 w-4 text-[#B88E3E]" />
                      <span>الرياض — وجلسات خاصة بكافة مناطق المملكة</span>
                    </div>
                  </div>
                  <div className="relative aspect-[4/3] rounded-xl overflow-hidden shadow-md">
                    <Image
                      src="/images/mashael/mashael-hero.jpg"
                      alt="المصورة مشاعل"
                      fill
                      className="object-cover"
                    />
                  </div>
                </div>

                {/* من أنا (About Mashael) */}
                <div className="rounded-xl bg-[#F4EFE6] p-6 border border-[#E8E1D5]">
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                    <div className="md:col-span-4 relative aspect-square rounded-xl overflow-hidden">
                      <Image
                        src="/images/mashael/mashael-action.jpg"
                        alt="مشاعل أثناء جلسة تصوير"
                        fill
                        className="object-cover"
                      />
                    </div>
                    <div className="md:col-span-8">
                      <span className="text-xs font-bold text-[#B88E3E]">من أنا</span>
                      <h4 className="mt-1 font-serif text-lg font-bold text-[#1A1A1A]">
                        مشاعل — شغف بتوثيق الجمال والأصالة
                      </h4>
                      <p className="mt-2 text-xs sm:text-sm text-[#5A5245] leading-relaxed">
                        مصورة سعودية محترفة، أؤمن أن الصورة ليست مجرد لقطة عابرة بل ذاكرة حية تعيش للأبد. أجمع في أسلوبي بين الإضاءة الدرامية الدافئة والبساطة العصرية.
                      </p>
                    </div>
                  </div>
                </div>

                {/* معرض الأعمال */}
                <div>
                  <h4 className="font-serif text-lg font-bold text-[#1A1A1A] mb-3">معرض الأعمال المختارة</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="relative aspect-[16/10] rounded-xl overflow-hidden shadow-sm">
                      <Image src="/images/mashael/portfolio-wedding.jpg" alt="أعراس" fill className="object-cover" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent p-3 flex items-end">
                        <span className="text-xs font-bold text-white">تفاصيل الأعراس والملكة الفاخرة</span>
                      </div>
                    </div>
                    <div className="relative aspect-[16/10] rounded-xl overflow-hidden shadow-sm">
                      <Image src="/images/mashael/portfolio-product.jpg" alt="منتجات" fill className="object-cover" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent p-3 flex items-end">
                        <span className="text-xs font-bold text-white">تصوير العطور والبراندات الراقية</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* نموذج طلب الحجز التجريبي التفاعلي */}
                <div className="rounded-xl border border-[#DCD3C3] bg-white p-6 shadow-sm">
                  <span className="text-xs font-bold text-[#B88E3E]">تطبيق عملي حي</span>
                  <h4 className="mt-1 font-serif text-lg font-bold text-[#1A1A1A]">
                    نموذج طلب حجز جلسة تصوير (Interactive Demo)
                  </h4>
                  <p className="mt-1 text-xs text-[#5A5245]">
                    هكذا يستقبل المصور طلبات عملائه مباشرة من خلال موقعه الخاص دون وسطاء.
                  </p>

                  {bookingSent ? (
                    <div className="mt-4 rounded-xl bg-emerald-50 border border-emerald-200 p-4 text-center text-emerald-800">
                      <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-600 mb-2" />
                      <div className="font-bold text-sm">تم إرسال طلب الحجز التجريبي بنجاح!</div>
                      <div className="text-xs mt-1 text-emerald-700">
                        في موقعك الحقيقي ستصلك هذه البيانات عبر الإيميل أو لوحة التحكم الخاصة بك.
                      </div>
                      <button
                        type="button"
                        onClick={() => setBookingSent(false)}
                        className="mt-3 text-xs font-bold text-emerald-800 underline"
                      >
                        إعادة التجربة
                      </button>
                    </div>
                  ) : (
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        setBookingSent(true);
                      }}
                      className="mt-4 space-y-3"
                    >
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-bold text-[#5A5245] mb-1">الاسم الكريم</label>
                          <input
                            type="text"
                            required
                            placeholder="مثال: نورة المحمد"
                            className="w-full rounded-lg border border-[#DCD3C3] p-2 text-xs bg-[#FAF7F2] outline-none focus:border-[#B88E3E]"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-[#5A5245] mb-1">رقم الجوال</label>
                          <input
                            type="tel"
                            required
                            placeholder="05XXXXXXXX"
                            className="w-full rounded-lg border border-[#DCD3C3] p-2 text-xs bg-[#FAF7F2] outline-none focus:border-[#B88E3E] font-mono"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-bold text-[#5A5245] mb-1">نوع الجلسة</label>
                          <select className="w-full rounded-lg border border-[#DCD3C3] p-2 text-xs bg-[#FAF7F2] outline-none focus:border-[#B88E3E]">
                            <option>جلسة بورتريه شخصي</option>
                            <option>تغطية حفل زفاف / ملكة</option>
                            <option>تصوير منتجات تجارية</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-[#5A5245] mb-1">تاريخ المناسبة التقريبي</label>
                          <input
                            type="date"
                            className="w-full rounded-lg border border-[#DCD3C3] p-2 text-xs bg-[#FAF7F2] outline-none focus:border-[#B88E3E] font-mono"
                          />
                        </div>
                      </div>

                      <button
                        type="submit"
                        className="w-full sm:w-auto rounded-xl bg-[#1A1A1A] px-6 py-2.5 text-xs font-bold text-white hover:bg-[#B88E3E] transition-colors"
                      >
                        إرسال طلب الحجز التجريبي
                      </button>
                    </form>
                  )}
                </div>
              </div>

              {/* ذيل النافذة */}
              <div className="border-t border-[#E8E1D5] bg-[#F2EDE4] px-6 py-3 flex items-center justify-between text-xs">
                <span className="text-[#8C8273]">نموذج محاكاة لمخرجات دورة «صمّم موقعك الاحترافي باستخدام الذكاء الاصطناعي»</span>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="font-bold text-[#1A1A1A] hover:underline"
                >
                  إغلاق
                </button>
              </div>
            </div>
          </div>
        )}
      </Container>
    </section>
  );
}
