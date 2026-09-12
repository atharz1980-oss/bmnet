# Design System — بيت المصور Bayt Almosawer

> مرجع التصميم الموحد. أي واجهة جديدة (عامة أو إدارية) تلتزم بهذه القواعد.
> المصدر الفعلي للأكواد: `src/app/globals.css` — هذا الملف يوثق ويشرح.
> آخر تحديث توثيقي: 2026-09-12 — تصحيح حالة الإدارة والوسائط فقط؛ الهوية وقواعد التصميم محفوظة.

---

## 1) الهوية
- **الاسم:** بيت المصور — Bayt Almosawer | **الموقع:** جدة، السعودية.
- **الطابع:** عصري، فاخر، هادئ، editorial — استوديو تدريب تصوير احترافي.
- **المبدأ:** الأبيض مساحة أساسية، الفحمي للنصوص، الأحمر Accent **وظيفي فقط** (أزرار أساسية، روابط نشطة، hover/focus، تفاصيل صغيرة).

## 2) الألوان (Tokens من globals.css)

### الأساس
| Token | القيمة | الاستخدام |
|---|---|---|
| `--background` | `#ffffff` | الخلفية الأساسية |
| `--foreground` | `#1b1b1f` | النصوص الأساسية |
| `--surface` | `#f8f8f9` | رمادي فاتح جدًا — خلفيات أقسام/صفحات الإدارة |
| `--muted` | `#f6f6f7` | خلفيات ثانوية |
| `--muted-foreground` | `#6d6d76` | نصوص ثانوية/وصوف |
| `--border` | `#e8e8eb` | الحدود |
| `--input` | `#e2e2e6` | حدود الحقول |
| `--primary` | `#d92632` | الأحمر الاحترافي (Accent) |
| `--primary-foreground` | `#ffffff` | نص فوق الأحمر |
| `--destructive` | `#d92632` | أخطار/حذف |
| `--ring` | `#d92632` | حلقة التركيز |

### Brand scale (أحمر)
`50 #fdf2f3` · `100 #fbe5e6` · `200 #f7cdd0` · `300 #f1a7ab` · `400 #ee7d84` · `500 #e74d57` · `600 #d92632` · `700 #b61d28` · `800 #951b24` · `900 #7b1c23`

### Charcoal scale (فحمي)
`50 #f6f6f7` · `100 #ececef` · `200 #d5d5da` · `300 #b3b3ba` · `400 #8b8b94` · `500 #6d6d76` · `600 #55555d` · `700 #414149` · `800 #2b2b31` · `900 #1b1b1f` · `950 #101013`

### قواعد
- **ممنوع الذهبي** وأي لون خارج الـ tokens.
- الأحمر لا يُستخدم كخلفيات واسعة — Accent فقط.
- `--radius: 0.75rem` (rounded-lg) — الكروت rounded-xl.

## 3) الخطوط
- **IBM Plex Sans Arabic**: الأساسي (وزن 300/400/500/600/700) — متغير `--font-ibm-plex-arabic`.
- **Inter**: اللاتيني الثانوي — متغير `--font-inter`.
- الـ stack: `font-sans` = IBM Plex Arabic ثم Inter.
- Helper classes:
  - `.font-latin` — للكلمات الإنجليزية داخل نص RTL.
  - `.num-ltr` — للأرقام/الهواتف/الروابط اللاتينية داخل نص RTL (direction: ltr + isolate).

## 4) RTL
- `<html lang="ar" dir="rtl">` في root layout (`suppressHydrationWarning`).
- استخدم الخصائص المنطقية دائمًا: `ms-/me-/ps-/pe-/start-/end-/text-start/end` بدل ml/mr/pl/pr/left/right.
- أسهم "التالي/الأمام" تنعكس مع الاتجاه.
- الأرقام اللاتينية والتواريخ الرقمية داخل `.num-ltr`.

## 5) الحجم والظلال والحركة
- ظلال خفيفة فقط في الموقع العام؛ **لوحة التحكم: الظلال شبه معدومة — الحدود هي الفاصل**.
- ممنوع: gradients زائدة، glassmorphism، أنيميشن مبالغ، ظلال ضخمة.
- حركة الموقع العام: `.reveal` (IntersectionObserver + `is-visible`) مع احترام `prefers-reduced-motion`.
- ممنوع overflow-x في أي صفحة (يوجد `overflow-x: clip` عالميًا — لا تُعتمد عليه وحده).

## 6) الموقع العام (مجمد)
- أقسام: `Container` + `SectionHeading`، هوامش سخية، whitespace واسع.
- كروت: حدود `border` + hover رفع خفيف.
- Navbar ثابت أعلى مع backdrop-blur (**تحذير موثق:** backdrop-blur يكسر `fixed` للأبناء — قوائم الموبايل خارجه).
- Footer: sticky bottom (`min-h-screen flex flex-col` + `mt-auto`).
- Skip link "تخطَّ إلى المحتوى الرئيسي" موجود.

## 7) لوحة التحكم (قواعد الواجهة الحالية)
- **الأولوية:** الوضوح وكثافة المعلومات العملية — "أداة عمل" لا "صفحة تسويقية".
- **Sidebar:** خلفية بيضاء، حد جانبي `border`، عرض **256px على lg+**، **شريط أيقونات 72px على md** (تسميات مخفية مع aria-label)، **Drawer (Sheet) على Mobile** — منفّذ في Checkpoint 1.
- **Topbar:** Breadcrumbs + بحث + قائمة حساب فعلية؛ لا تعتبر عناصر البحث/التنبيهات العامة دليلًا على تكامل إشعارات جديد. إشعارات Community لها نطاق مستقل.
- **الكروت:** `bg-white` + `border` — عناوين charcoal-900، وسم muted-foreground.
- **الجداول Responsive:** نسخة `hidden md:block` (جدول) + نسخة `md:hidden` (بطاقات) — أو scroll container — دون page overflow أبدًا.
- **Status Badges** (خلفية surface + حد + نقطة لون):
  - منشور/مفتوح/Agreed: نقطة `brand-600`
  - مسودة/Draft: نقطة `charcoal-300`
  - قريبًا/Upcoming: نقطة `charcoal-800`
  - ممتلئ/مغلق/منتهٍ/Full/Closed/Completed: نقطة `charcoal-400`
  - **New (طلب جديد):** خلفية `brand-50` + نص `brand-700` (لفتح الانتباه)
- **أزرار الخطر (حذف):** `destructive` — دائمًا مع Confirm Dialog (AlertDialog).
- **النماذج:** Label فوق الحقل، نص "اختياري" بجانبه، الخطأ نص `brand-700` تحت الحقل + `aria-invalid`، كل الحقول keyboard-accessible.
- **الأيقونات:** lucide-react فقط.

## 8) الاستجابة
- مقاسات الاختبار المرجعية: **360 / 390 / 768 / 1024 / 1440**.
- Tailwind: sm 640 / md 768 / lg 1024 / xl 1280 — بناء mobile-first.
- أهداف اللمس ≥ 44px.
- الـ Sidebar في الموبايل = Drawer مع focus management وإغلاق عند التنقل.

## 9) Accessibility
- `:focus-visible` عام بحلقة `ring` brand (موجود في globals.css).
- كل صورة لها `alt` عربي وصفي.
- Label لكل input + `aria-required` + `aria-invalid` عند الخطأ.
- Dialogs: مكونات radix (AlertDialog/Dialog) — focus trap مدمج.
- Tabs: نمط ARIA كامل RTL-aware (المرجع: `src/components/courses/course-tabs.tsx`).
- Semantic HTML: main/header/nav/section/article.

## 10) الصور
- مركزية: `src/data/images.ts` → `public/images` (17 صورة AI مؤقتة بهوية سينمائية موحدة).
- **الصور الحالية مؤقتة — ممنوع استبدالها أو توليد صور جديدة الآن.**
- مكتبة الوسائط ترتبط بـSupabase Storage فعلًا. بعض حقول الصور تستخدم المكوّن `ImageUpload` للمعاينة المحلية عبر `URL.createObjectURL` فقط؛ يجب عدم وصفها كرفع دائم قبل إكمال الربط. راجع PROJECT_REPORT.md للحدود.

## 11) المحتوى والتنسيق
- عربي فصيح واضح، نبرة احترافية، بدون حشو.
- الأسعار: `"1,000 ريال"` عبر `formatPrice` — والصفر = "حسب الطلب".
- التواريخ عبر `src/lib/format.ts` (**ممنوع** Intl ar-SA الافتراضي: هجري + hydration mismatch).
- الأرقام: `formatNumber` (أرقام en-US).

## 12) مكونات جاهزة (لا تُعاد بناؤها)
- **shadcn/ui كاملة** في `src/components/ui`: dialog, alert-dialog, sheet, tabs, select, switch, table, badge, input, textarea, label, checkbox, radio-group, dropdown-menu, breadcrumb, progress, tooltip, popover, skeleton...
- **Shared:** container, section-heading, page-header, placeholder-logo, social-icons, reveal.
- **Hooks:** use-mobile, use-toast (+ Toaster مثبت في root layout).
