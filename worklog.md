# Worklog — Bayt Almosawer Website

---
Task ID: 1
Agent: main (Super Z)
Task: بناء الموقع الرسمي لبيت المصور (Front-end فقط) — Next.js 16 + TS + Tailwind 4 + RTL

Work Log:
- تهيئة البيئة عبر init-fullstack.sh وقراءة هيكل القالب
- إنشاء Design System في globals.css: ألوان brand (أحمر #d92632) + charcoal + surface، خطوط IBM Plex Sans Arabic + Inter عبر next/font
- إنشاء src/types/index.ts: أنواع Course/LearningPath/Testimonial/BlogPost/CategoryInfo... جاهزة للربط بقاعدة بيانات لاحقاً
- إنشاء Mock Data في src/data: site, images, categories, courses (8 دورات), paths (2 مسار مع حساب خصم), testimonials (6), content (اعتمادات/شركاء/مدونة)
- إنشاء src/lib/format.ts: تنسيق أسعار وتواريخ عربية ثابتة (تفادي hydration mismatch)
- Layout: RTL + lang=ar + Navbar (dropdown + mobile menu) + Footer
- الصفحة الرئيسية: Hero, StatsBar, UpcomingCourse, CourseCategories, FeaturedCourses, WhyUs, OrgsBand (اعتمادات+شركاء), Testimonials, CtaSection
- صفحات: about, courses (+فلترة), courses/[slug] (+tabs وgenerateStaticParams), paths, paths/[slug], blog, blog/[slug] skeleton, contact (+نموذج UI), corporate-training (+نموذج UI), policies/[slug] ×4, not-found
- بحث صور عبر image-search (12 استعلام) وتنزيل 17 صورة إلى public/images
- توليد 17 صورة AI بهوية سينمائية داكنة موحدة (scripts/generate-images.mjs + regenerate) واستبدالها في public/images
- إصلاح أخطاء lint (setState في effect) — lint نظيف، tsc نظيف على src/
- إصلاح خطأ قائمة الموبايل: نقلها خارج <header> لأن backdrop-blur يكسر fixed positioning + إصلاح زر واتساب الشفاف
- مسح كاش الصور في .next/dev/cache/images بعد استبدال الصور
- تحقق متصفح كامل (agent-browser): جميع الصفحات 200، لا console errors، لا horizontal overflow على 360/768/1280px، الـ dropdown والتبويبات والأكورديون ونماذج النجاح تعمل، sticky footer سليم

Stage Summary:
- جميع المسارات المطلوبة منشأة مع skeletons، لا Backend/DB/Auth/Payment
- الصور في public/images وتُدار مركزياً من src/data/images.ts
- يعتمد على بيانات تجريبية فقط (Mock Data)

---
Task ID: 2
Agent: main (Super Z)
Task: مراجعة نهائية شاملة لتثبيت المرحلة الأولى (Phase 1 Freeze) — بدون ميزات جديدة

Work Log:
- مراجعة Architecture كاملة: أكبر مكون مخصص Navbar (297 سطر، مبرر)، Mock Data منفصلة في src/data، الصور مركزية في src/data/images.ts، use client فقط حيث يلزم (5 ملفات مخصصة فقط)
- فحص البيانات: 8 دورات، slugs المسارات صحيحة، 17 صورة موجودة، 45 رابط داخلي فريد
- إصلاحات (Bug fixes فقط):
  1. src/app/api/route.ts — حذفه (قالب boilerplate يخالف ممنوع-الـ-Backend)
  2. globals.css — حذف متغير مكرر --color-brand-400 من :root
  3. course-tabs.tsx — استكمال نمط ARIA Tabs: aria-controls + tabIndex rotator + تنقل أسهم RTL-aware + Home/End
  4. courses-explorer.tsx — استبدال role=tablist الناقص بـ role=group + aria-pressed (نمط filter chips صحيح)
  5. paths/page.tsx — تصحيح ترتيب dt/dd (كان dd قبل dt — HTML غير صالح) مع الحفاظ على الترتيب البصري عبر order classes
  6. layout.tsx — إضافة Skip link "تخطَّ إلى المحتوى الرئيسي"
  7. navbar.tsx — إضافة aria-expanded لزر الـ dropdown + invisible للقائمة المغلقة (إخراجها من شجرة الوصول)
- التحقق: lint PASS / tsc (src) 0 أخطاء / build PASS (30 صفحة ثابتة) / 55 اختبار responsive (5 مقاسات × 11 صفحة) بلا overflow / 0 broken links / 0 console أو hydration errors على 26 مسارًا / كل صفحة h1 واحد / عناوين SEO صحيحة
- اختبارات تفاعل: mobile menu + submenu + إغلاق تلقائي، dropdown بالنقر والكيبورد (Enter/Escape)، تبويبات بالأسهم RTL، أكورديون، فلترة الدورات من رابط عميق، نموذجا contact + corporate بنجاح
- خادم الإنتاج standalone يعمل على :3000 للمعاينة

Stage Summary:
- المرحلة الأولى مثبتة ومجمدة: لا Backend/DB/Auth/Payment/Dashboard
- Production Build ناجح وكل بوابات الجودة خضراء — جاهز للتنزيل والنشر من Cursor

---
Task ID: 3
Agent: main (Super Z)
Task: إنشاء ثلاثية توثيق المزامنة (prd.md / design.md / memory.md) كملحق معتمد لـ GLM 5.3 Flash — قبل تنفيذ Phase 2

Work Log:
- قراءة كاملة لأكواد وبيانات Phase 1 (package.json, types, data/*, layout.tsx, globals.css, format.ts) لضمان دقة التوثيق
- إنشاء prd.md: القيود الصارمة + حالة Phase 1 المجمدة ونتائجها + المواصفة التنفيذية الكاملة للمرحلة الثانية (31 بند) + Phase 3 المستقبلية + بوابات الجودة
- إنشاء design.md: Tokens الفعلية من globals.css (ألوان/خطوط/RTL) + قواعد الموقع العام المجمد + قواعد لوحة التحكم (sidebar/جداول/Status badges/نماذج) + accessibility + الصور
- إنشاء memory.md: بروتوكول مزامنة إلزامي (قراءة قبل/تحديث بعد) + الحالة الحالية + سجل قرارات معمارية D-01..D-10 للمرحلة الثانية (ChromeGate، Context store، localStorage، ↑↓ بدل DnD، seeds ثابتة...) + خريطة ملفات + بيئة العمل + مزالق معروفة + سجل جلسات Append-only
- بروتوكول المزامنة: أي وكيل/نموذج يقرأ الملفات الثلاثة قبل العمل ويحدّث memory.md بعده

Stage Summary:
- الملفات الثلاثة في جذر المشروع وجاهزة للإرفاق بنموذج GLM 5.3 Flash
- قرارات Phase 2 المعمارية مثبتة وموثقة (D-01..D-10) بانتظار إشارة المالك لبدء التنفيذ

---
Task ID: 4
Agent: main (Super Z)
Task: Phase 2 — Checkpoint 1 (Foundation): المهام #1–#6 (ChromeGate, Types, Seed, Store, Primitives, Shell) + تحقق كامل

Work Log:
- #1: chrome-gate.tsx (client) يغلف Navbar/Footer كـ children في root layout — إخفاء على /admin* دون تحويل الـ layout لـ client
- #2: src/data/admin/types.ts — أنواع CMS مستقلة (~30 نوعًا) بدون any مع إعادة استخدام تعدادات @/types
- #3: src/data/admin/seed.ts — اشتقاق برمجي من بيانات Phase 1 + إثراءات (2 دورات إداريتان، 6 طلبات شركات بكل الحالات، media، users/roles، homepage، legal) + sanitizeForStorage لمنع حفظ blob URLs
- #4: src/context/admin-store.tsx — State/Actions contexts منفصلة (~60 action) + localStorage hydration-safe (تحميل مؤجل setTimeout 0) + src/data/admin/selectors.ts نقية
- #5: 9 UI primitives في src/components/admin/ui (field, status-badge, confirm-dialog, image-upload, repeater, stat-card, empty-state, page-header, toolbar)
- #6: src/app/admin/layout.tsx (noindex) + admin-shell + sidebar (3 أوضاع) + topbar + breadcrumbs ذكية + nav-config + صفحة /admin placeholder
- إصلاحات: استعادة admin/layout.tsx (فشل Write أول)، إصلاح hooks violation في breadcrumbs (دالة نقية)، isActive للروابط الخارجية، موضع زر إغلاق Sheet RTL، SheetDescription sr-only، tsconfig exclude لـ examples/skills (D-11)
- التحقق: lint PASS / tsc PASS / build PASS (31 صفحة) / متصفح 1440-1024-768-360: 0 console، 0 hydration، 0 overflow، drawer + keyboard + localStorage تعمل، الموقع العام سليم (12 مسار 200)
- مزامنة الوثائق: memory.md (حالة + D-11..D-13 + مزالق جديدة + سجل جلسة 2) + design.md (عرض sidebar الفعلي)

Stage Summary:
- Checkpoint 1 (Foundation) مكتمل ومُتحقق منه بالكامل
- بانتظار موافقة المالك لبدء المهمة #7 (Dashboard Home)

---
Task ID: 5
Agent: main (Super Z)
Task: Phase 2 — Checkpoint 2 (Core CMS): المهام #7–#11 (Dashboard Home, Courses List, Course Editor, Curriculum Builder, Sessions Manager) + تحقق كامل

Work Log:
- طبقة البيانات: دورة مرجعية «ورشة أساسيات التصوير» كتجاوز منهجي في seed (D-14, version→2) + 5 selectors جديدة (nearest session, derived status, recent registrations, unique slug/name) + duplicateCourse بتفررد مضمون (D-17)
- #7: /admin حقيقي — 8 إحصائيات من Selectors + 4 أقسام + Quick Actions (روابط غير مبنية = Disabled بتلميح)
- #8: /admin/courses — جدول/كروت + بحث + فلترة نوع/حالة + 5 ترتيبات فعّالة + Edit/Duplicate/Preview(مشروط بوجود slug عام)/Delete
- #9: محرر بمكوّن واحد new/[id] — 9 تبويبات بتمرير داخلي + Sticky Save Bar + Dirty (beforeunload + تأكيد إلغاء) + Validation بقفز لتبويب الخطأ + Toast
- #10: تبويب المحاور — أيام←محاور بمعرفات مستقرة + ↑↓ + ConfirmDialog ليوم به محاور (إلغاء/تأكيد مختبران)
- #11: تبويب المواعيد — Dialog كامل + Remaining محسوب + منع تجاوز السعة وتواريخ غير منطقية + Derived Status + تكرار/حذف مؤكد
- إصلاحان من الاختبار: علاقة spinner التنقل الداخلي (D-19) + زر حذف تجاوز التأكيد (D-20) + Breadcrumb صفحة new
- بوابة الجودة: lint PASS / tsc PASS / build PASS (33 صفحة) + standalone محدث
- متصفح: CRUD 24/24 ✓، 5 مقاسات 0 overflow، keyboard/ARIA ✓، جلسة نظيفة 0 console، Public regression 7 مسارات 200
- مزامنة memory.md: D-14..D-20 + 5 مزالق جديدة + سجل جلسة 3

Stage Summary:
- Checkpoint 2 (Core CMS) مكتمل ومُتحقق — نموذج البيانات أثبت إدارة دورة حقيقية كاملة من اللوحة
- بانتظار موافقة المالك قبل المهمة #12 (Trainers) — لا بدء قبلها

---
Task ID: 6
Agent: main (Super Z)
Task: إعادة تحقق وتثبيت Checkpoint 2 (المهام #7–#11) بعد استئناف الجلسة + إصلاح تجميلي واحد

Work Log:
- إعادة تشغيل بوابات الجودة كاملة: lint PASS / tsc --noEmit PASS (0 أخطاء) / build PASS (33 صفحة + standalone)
- كشف البيئة: خادم المعاينة القديم قُتل بـ OOM — وعملية next-server المعاد تسميتها لا تلتقطها pkill -f "standalone/server.js" مما سبق ChunkLoadError كاذبًا (HTML قديم من ذاكرة العملية يشير لـ chunks حُذفت بالـ rebuild) — الإصلاح: pkill -f next-server + fuser -k 3000/tcp ثم تشغيل نظيف (توثيق مزلاقة جديدة)
- إصلاح تجميلي واحد: sessions-tab.tsx — منع تكرار المدينة إذا كانت مضمنة في نص المكان («حي الشرفية — جدة — جدة» أصبحت «… — جدة») — سطر عرض فقط، لا مساس ببيانات المالك
- فحص متصفح شامل بعد إعادة البناء: /admin و/admin/courses و/new و/course-001 = 200 + 0 أخطاء + 0 overflow (1440/390)
- تحقق المحتوى: 8 إحصائيات من Selectors، المنهج المرجعي 4 أيام/8 محاور مطابق، المواعيد 2 والـ Remaining محسوب (12−7=5، 12−0=12)، حوار المواعيد يفتح/يلغى (10 حقول)، Repeater إضافة/حذف net-zero
- localStorage: v2، 10 دورات، لا blob URLs (sanitizeForStorage)
- Public regression: 6 مسارات (/, /courses, /[slug], /paths, /corporate-training, /blog) = 0 overflow + Navbar/Footer سليمان + 0 أخطاء

Stage Summary:
- Checkpoint 2 مثبت بإعادة تحقق كاملة بعد استئناف الجلسة — البوابات الثلاث خضراء والمتصفح نظيف
- بانتظار موافقة المالك قبل #12 (Trainers) — لا بدء قبلها

---
Task ID: 7
Agent: main (Super Z)
Task: Checkpoint 3 — المهمتان #12 (Trainers) و#13 (Learning Paths) فقط، ثم توقف صارم قبل #14

Work Log:
- قراءة prd.md / design.md / memory.md كاملة + فحص الكود الحالي قبل أي تعديل
- اكتشاف عمل سابق غير مكتمل من جلسة منقطعة: مكونا المدربين (list+editor) وStore actions وSelectors وSeed (v3) وTrainer Select في محرر الدورة موجودية — لكن ملفات المسارات الثلاثة للمدربين وكل ما يخص المسارات غائب
- #12 استكمالًا: /admin/trainers (بحث+فلترة حالة+4 ترتيبات) + new + [id] + تفعيل Quick Actions (مدرب/مسار)
- #13 كاملة: paths-list.tsx (جدول/كروت، تسعير مشتق في الخلية، Preview مشروط بslug عام) + path-editor.tsx (بيانات أساسية/أوصاف/دورات المسار بمنع تكرار و↑↓/تسعير حي/تنبيهات مسودات) + 3 صفحات مسارات
- علة بيانات خطيرة اكتُشفت بالاختبار وأُصلحت في المحررات الثلاثة (مدرب/مسار/دورة): التحميل المباشر لرابط المحرر كان يهيئ المسودة من الـ Seed قبل ترطيب localStorage وأول حفظ يصفّر تعديلات المالك — الإصلاح: تهيئة بعد الترطيب فقط (hydrated في المُهيّئ وشرط التهيئة المؤجلة) — تحقق فعلي: تعديل محفوظ يبقى بعد إعادة فتح مباشرة + blind save لا يلغي
- بوابة الجودة بعد الإصلاح: lint PASS / tsc PASS / build PASS (37 صفحة) + standalone محدث
- متصفح: 6 مسارات جديدة 200 + CRUD المدربين 10 خطوات + CRUD المسارات 16 خطوة (خصم 20→25 يلغي حيًا، إضافة/إزالة دورة تحدث الإجمالي، تغيير سعر دورة 1000→1200 أعاد حساب المسار 3200→3360 تلقائيًا ثم الاستعادة، تكرار مسار بنسخة مسودة بنفس المراجع، حذف النسخة، refresh يثبت) + قيد الخصم 0–100 + تنبيه مسودة + تحذير «منشور بلا دورات»
- حمايات العلاقات: حذف مدرب مرتبط محجوب مع بديل «تحويل إلى مخفي» (D-21)، حذف دورة مستخدمة في مسار محجوب بتسمية المسارات (قائمة الدورات)، المدرب المخفي يبقى خيار «الحالي» ولا يظهر للاختيارات الجديدة
- Responsive: 24 تركيبة (4 مقاسات × 6 صفحات) 0 overflow — Console: 0 أخطاء على 12 مسارًا إداريًا و7 عامة — 0 hydration warnings
- localStorage: v3 نظيف بلا blob، والعودة لبيانات Seed نظيفة بعد الاختبارات

Stage Summary:
- Checkpoint 3 مكتمل: #12 Trainers + #13 Learning Paths كاملتين بالعلاقات والتسعير المشتق
- قرار العلاقة الموثق D-21 (الأكثر أمانًا): حجب حذف المدرب المرتبط + بديل إخفاء؛ وحذف المسار آمن ولا يمس دوراته
- التسعير Derived نهائيًا (getPathPricing لحظيًا — لا تخزين finalPrice) — قرار D-09 مطبق فعليًا
- الخطوة التالية: #14 Homepage CMS — ممنوع البدء قبل موافقة المالك

---
Task ID: 8
Agent: main (Super Z)
Task: Checkpoint 5 — المهام #16 (Corporate Requests) و#17 (Media Library) و#18 (Settings + Legal) + إصلاح Admin 404، ثم توقف صارم قبل #19

Work Log:
- قراءة prd.md / design.md / memory.md كاملة + فحص الكود والمخزن (v4) قبل أي تعديل
- طبقة البيانات v5: أنواع جديدة (RequestTimelineEntry/archivedAt + MediaItem v5 + FooterLink.enabled + Seo verification + Payments.displayName + LegalPage.slug) + Seed بـ Timeline deterministic لكل طلب + migration v4→v5 (وv3→v5) مع حماية بيانات المالك + sanitize يمتد للوسائط
- Store: updateRequestStatus يبني Timeline تلقائيًا (actor «المالك») + updateRequest للأرشفة + deleteRequestNote؛ selectors: العدادات الجديدة تستثني المؤرشف + ماسح مراجع الوسائط getMediaReferences
- #16: قائمة (بحث/فلاتر/ترتيبات/جدول-بطاقات) + تفاصيل (3 أقسام/إدارة حالة/Timeline/Mلاحظات/إجراءات سريعة tel-mailto-wa.me/أرشفة-استعادة بتأكيد) + Dashboard/Sidebar يستثنيان المؤرشف
- #17: رفع بالتحقق المسبق (صور فقط + 10MB قبل المعاينة) + Grid/List + بحث/فلترة/ترتيب + تحرير بيانات + نسخ رابط Mock بfallback + حماية حذف بعدّ المواضع وتفصيلها
- #18: settings/layout بقائمة تنقل + useSettingsDraft موحد (D-22/D-25) + صفحات general/contact/footer/seo/payments (تطبيع هواتف + تحقق واتساب + wa.me مشتق + معاينة تواصل + روابط قانونية مربوطة + مدفوعات بلا مفاتيح برسالة Environment Variables) + legal (قائمة + محرر بمعاينة داخل الصفحة + تحقق slug)
- إصلاح Admin 404: admin/[...rest] + admin/not-found.tsx داخل AdminShell — 404 العام سليم
- بوابات الجودة: lint PASS / tsc PASS / build PASS (52 صفحة) + standalone محدث بـ node
- علتان من الاختبار أُصلحتا: patchDraft يفكك المصفوفة (انهيار المدفوعات) + handleSave يقبل قيمة صريحة لختم آخر تحديث؛ todayISO محلي بدل UTC
- متصفح: Corporate 12/12، Media 14/14 (حد 10MB اختُبر بملف DataTransfer لأن Playwright يضبط size=0)، Settings 16/16، Legal 7/7، Responsive 50/50، Regression 28/28 (0 console)، A11y/RTL/404/عزل الموقع العام — وأعيدت البيانات للـ Seed النظيف
- مزامنة memory.md: D-30..D-38 + سجل الجلسة 7

Stage Summary:
- Checkpoint 5 مكتمل ومُتحقق: الجزء التشغيلي من CMS كامل (#16/#17/#18) بلا أي Backend أو Dependencies جديدة
- Archive بدل الحذف للطلبات، Timeline مشتق من الحالة، الوسائط بلا blob مخزن، الإعدادات بمخزن واحد وقائمة تنقل، والـ 404 الإداري داخل الشل
- الخطوة التالية: #19 Users & Roles — ممنوع البدء قبل موافقة المالك

---
Task ID: 8-verify
Agent: main (Super Z)
Task: إعادة تحقق نهائية من Checkpoint 5 (#16/#17/#18 + Admin 404) بعد استئناف الجلسة — دون أي تعديل على الكود

Work Log:
- إعادة قراءة worklog.md/memory.md والتحقق من وجود كل ملفات CP5 (المسارات + المكونات + الأنواع)
- بوابات الجودة مُعاد تشغيلها بالكامل: lint PASS / tsc --noEmit PASS (0 أخطاء) / build PASS (0 أخطاء — 52 صفحة، 31 مسارًا إداريًا)
- إعادة تشغيل standalone بـ node بعد قتل العملية القديمة (pkill next-server + fuser) — علة انهيار الخادم عند الخلفية بـ & وحلها بـ subshell (setsid ... &)
- فحص HTTP: 8 مسارات CP5 = 200، /admin/does-not-exist = 404، عامة (6 مسارات) = 200
- متصفح: 0 console errors على corporate-requests / media / settings/payments / legal؛ 404 الإداري داخل AdminShell
- localStorage: version=5، 6 طلبات + 14 وسيطًا + 4 صفحات قانونية، لا blob URLs

Stage Summary:
- Checkpoint 5 مُثبت بإعادة تحقق كاملة — البوابات الثلاث خضراء والخادم يعمل
- تقرير 35 نقطة سُلّم للمالك — لا بدء #19 قبل موافقة المالك

---
Task ID: 9
Agent: main (Super Z)
Task: CP6-VERIFY — التحقق الكامل من Checkpoint 6 (#19 Users & Roles الذي بُني دون تحقق/توثيق) + إصلاح علل البناء المكتشفة + مزامنة التوثيق — بلا أي Feature جديدة

Work Log:
- Audit مسبق كشف: كود CP6 كامل (6 صفحات + 6 مكونات + permissions.ts + Store v6 + migration v5→v6) لكن بلا بوابات ولا اختبارات ولا توثيق — هذه الجلسة أغلقت الفجوة
- البيئة (نسخة Windows بلا node_modules/.next): تثبيت bun 1.4.0 (npm i -g bun) → bun install --frozen-lockfile من bun.lock (818 حزمة، صفر dependencies جديدة) → bunx prisma generate (ضروري لبواب tsc — بقايا قالب lib/db.ts) → بناء + تغليف standalone يدويًا (Copy-Item بعد آخر build) + تشغيل الخادم على :3000
- قراءة كود CP6 بالكامل قبل أي تنفيذ (permissions/types/seed/selectors/store/الصفحات الست/المكونات الستة/Topbar/nav-config)
- إصلاحات (Bugs فقط):
  1. permissions.ts: 3 أخطاء lint no-assign-module-variable — إعادة تسمية متغير module إلى adminModule في البنّائين الثلاثة
  2. seed.ts: استيراد RolePermissions الناقص (TS2552) + نوع LegacyUser يقاطع الحالة فتستحيل مقارنة "disabled" (TS2367) — Omit للحالة من النوع القديم
  3. seed.ts sanitizeForStorage: تعقيم users[].avatar من blob: (→ undefined) — علة مؤكدة باختبار حي ثم أُعيد التحقق بعدها
- البوابات بعد الإصلاحات: lint PASS (exit 0) / bunx tsc --noEmit PASS (0 أخطاء) / next build PASS (exit 0 — 56 صفحة + standalone)
- تحقق المتصفح عبر Playwright عالمي (سكربتان في Temp خارج المستودع):
  - Script1 37/37: Users CRUD كامل (بحث/فلاتر/ترتيب عربي/تحقق اسم-بريد صيغة-فريد/تعديل/تعليق-تفعيل/حذف بتأكيد/persistence) — حماية آخر مالك 3/3 (UI + حوار + Store guard) — Roles CRUD (بحث/تكرار/اسم فريد/مصفوفة/تحديد-مسح الكل/قفل «عرض» الأساس/حماية النظامي-المسند-المالك) — الاشتقاط roleId-only مُثبت حيًا (تعديل الدور غيّر صلاحيات مستخدمه دون لمسه) — Role Preview بتحذيره الصريح وعدم تخزينه — اختبار blob-avatar (PASS بعد الإصلاح)
  - Script2 18/18: Migration v5→v6 بحملة v5 مصنوعة (مستويات نصية + disabled + بلا currentUserId) — بلا فقدان/duplication/blob، disabled→suspended ظاهرًا، currentUserId→المالك، مستقر عبر reload ثانٍ — Responsive 30/30 (6×5 مقاسات، 0 overflow، المصفوفة بطاقات على 360) — A11y (RTL/Labels/aria-label×53/role=alert/aria-invalid/Space-toggle/حوار focus-trap+Escape) — Regression 10 إداري + 5 عام + 404 إداري + عزل الموقع العام
- Console عبر كل الاختبارات: 0 errors / 0 warnings / 0 hydration
- ملاحظات موثقة لا تعدل الآن (خارج نطاق CP6): main متداخل منذ CP1 (root + admin-shell) — وRadix الحالي لا يرسم aria-modal (يعتمد role+focus-trap)
- مزامنة الوثائق: memory.md (حالة CP6 COMPLETE+VERIFIED + D-39..D-44 + خريطة محدثة + بيئتان + 6 مزالق Windows جديدة + جلسة 8) + worklog.md (هذه المهمة)

Stage Summary:
- Checkpoint 6 (#19 Users & Roles) مكتمل ومُتحقق منه بالكامل — Store v6، نموذج صلاحيات 15 وحدة، حماية آخر مالك ثلاثية، اشتقاق roleId-only، ترحيل v5→v6 مثبت، 55 اختبار متصفح PASS + بوابات ثلاث خضراء (56 صفحة)
- ثلاث علل بناء/كود أُصلحت أثناء التحقق (lint×3 + tsc×2 + blob avatar) وأُعيد التحقق بعد كل إصلاح
- الخطوة التالية: #20 Public Integration — لا بدء قبل موافقة المالك (Phase 3 لا تزال مؤجلة)

---
Task ID: 10
Agent: main (Super Z)
Task: CP7 — #20 Public Integration (آخر مهام Phase 2): ربط الموقع العام بمخزن CMS الإدارة (localStorage) مع الحفاظ التام على SSR/SEO/RTL/Responsive — ثم التحقق الشامل

Work Log:
- قراءة السياق كاملًا (prd/design/memory/worklog) + فحص المتجر v6 والبيانات العامة والمسارات والـ selectors وكل محتويات CMS — وتحديد الفرق: العام يعرض بيانات Phase 1 المجمدة والإدارة مصدر CMS منفصل لم يكن ينعكس على العام (قرار D-27 السابق)
- قرار المعمارية (مقارنة A/B/C → الخيار B «جسر بيانات عام»): وحدة اشتقاق نقية + Provider صغير بقراءة فقط — SSR ببيانات Phase 1 الثابتة بايت-بايت (صفر mismatch وSEO محفوظ) → استبدال بعد الترطيب من localStorage — الزائر بلا مخزن يرى الموقع حرفيًا والمالك يرى تعديلاته
- بناء الجسر: public-bridge.ts (قواعد العرض: draft مخفي، جلسات open/upcoming/full فقط، مدرب مخفي يبقى لدوراته، مسارات/مقالات/قانوني منشورة فقط، تقييم غير ظاهر لا يظهر، اختيار يدوي غير صالح→تلقائي، صور غير محلية→بديلة Phase 1، تسعير مشتق لا يخزن) + public-cms.tsx (حدث storage → مزامنة تبويبات فورية)
- صفحات الخادم صارت رفيعة (metadata/staticParams محفوظة) بمكونات عرض client جديدة: homepage/course-details/paths-view/path-details/blog-view/blog-post-view/policy-view/contact-details — واجهات «غير متاح» عند مسودة/محذوف بلا كسر
- props اختيارية للأقسام التسعة + courses-explorer + corporate-form + navbar + footer (تعديلات موثقة على ملفات Phase 1 المجمدة بأمر CP7 الصريح)
- إصلاحان اكتشفهما التحقق: (1) علة إدارية حرجة — زر الحفظ الموحد يمرر حدث النقر كوسيط explicit إلى handleSave فتنهار كل صفحات الإعدادات الخمس (لا حفظ + JSON دائري + undefined.trim) → عزل الحدث (2) علة ARIA كامنة من Phase 1 — 5 أقسام بمراجع aria-labelledby معلقة (SectionHeading بلا id) → titleId اختياري
- البوابات: lint PASS (0) / bunx tsc --noEmit PASS (0) / build PASS (56 صفحة) — سيرفر أعيد بناؤه ثلاث مرات (نمط Windows الموثق: إيقاف → بناء → نسخ static بعد آخر بناء → إعادة تشغيل)
- اختبار التكامل (Playwright — سياق واحد بتبويب إدارة + تبويب عام يتشاركان localStorage): 18/18 = الخطوات الـ32 كاملة (Hero/أقسام/ترتيب/إحصائية/دورة قادمة يدوي/مسودة↔نشر/سعر→صفحة+مسار/منهج/مدرب/خصم مسار/تقييم مخفي/مقال مسودة↔نشر/تواصل+فوتر+قانوني/refresh-persistence) + مزامنة التبويبات مُثبتة بعلامة جلسة (بلا reload) + fallbacks (تالف→seed، بلا مخزن→seed، لا كتابة عامة)
- SCRIPT4 12/12: Responsive 55/55 (11 مسارًا × 5 مقاسات — 0 overflow) + A11y (h1×11 صفحات، skip link، alt، لا مراجع aria معلقة — إصلاح D-50 مُتحقق، labels 1:1، keyboard) + Regression (12 إداري CP1-CP6 + 6 عامة + 404 + عزل تام) + Broken Links 0/27
- Console عبر كل الاختبارات: 0 errors / 0 React warnings / 0 hydration
- مزامنة الوثائق: memory.md (D-45..D-50 + جلسة 9 + حالة Phase 2 COMPLETE + خريطة محدثة + 6 مزالق جديدة) + worklog.md (هذه المهمة) + prd.md (حالة Phase 2 → COMPLETE)

Stage Summary:
- Checkpoint 7 (#20 Public Integration) مكتمل ومُتحقق: Admin edit → localStorage → Public يعكسها فورًا (وبين التبويبات بلا reload) مع SSR/SEO/RTL/Responsive محفوظة حرفيًا للزائر العام
- 30 اختبار متصفح PASS (18+12) + بوابات ثلاث خضراء (56 صفحة) + إصلاح علتين حقيقيتين (انهيار حفظ الإعدادات الخمس + مراجع ARIA المعلقة منذ Phase 1)
- **Phase 2 مغلقة بالكامل (CP1–CP7)** — الخطوة التالية: Phase 3 (Backend حقيقي) لا تبدأ إلا بموافقة المالك

---
Task ID: 11
Agent: main (Super Z)
Task: Phase 3 — CP-A: Supabase Connection + Env + Clients + SSR Compatibility (بلا Schema/RLS/Auth/Storage/Payments/CP-B)

Work Log:
- فحص كامل قبل أي تعديل: التوثيق + package.json/bun.lock/next.config + لا يوجد proxy/middleware سابقًا + src/lib + البنية الحالية — ولا قيم Supabase محليًا إطلاقًا (بحث شامل) → طُلبت القيم من المالك (URL + Publishable Key — عامة بالتصميم) وتوفرت
- البيئة: bun add @supabase/supabase-js@2.115.0 + @supabase/ssr@0.12.6 (فقط) + .env.local محلي (git-ignored مؤكد) + .env.example (الأسماء الثلاثة بلا قيم، مفعّل رفعه باستثناء .gitignore) + مفتاح السر فارغ عمدًا وغير مستخدم
- العملاء الثلاثة (D-51): src/lib/supabase/client.ts (createBrowserClient + Singleton كسول) + server.ts (createServerClient + await cookies() متوافق Next 16 + setAll بصمت في RSC) + middleware.ts helper (updateSession — getUser فقط بلا حماية/توجيه)
- علة مميزة حُسمت تجريبيًا (D-52): proxy.ts (اصطلاح 16 الرسمي المؤكد من مصدر next@16.1.3) يُجمَّع ويُكشف في قائمة البناء لكن لا يُسجَّل في middleware-manifest فلا يُستدعى وقت التشغيل — مقارنة مباشرة: نفس الملف باسم middleware.ts يسجل (MW_KEYS=/) ويعمل فورًا → اعتمدناه مع تحذير الإهمال المتوقع + توثيق خطة إعادة التسمية عند الترقية
- مسار الفحص (D-53) /admin/dev/supabase-check: صفحة خادم + مكون عميل — OK/FAIL فقط بلا أي قيم — إصلاح أثناء الجولة: ترويسة apikey لفحص health (كان 401)
- البوابات: lint PASS / tsc --noEmit PASS / build PASS (56 صفحة) — ثلاثة إعادة بناء وفق النمط الموثق (إيقاف → بناء → نسخ → تشغيل)
- بوابة التوافق (الأهم): Playwright 10/10 + Console نظيف — عميل خادم مع cookies async + قراءة/كتابة/تحديث كوكيز مثبتة حيًا (Set-Cookie من الـ middleware + مسبار cpa-probe يتزايد عبر الطلبات) + session refresh (getUser) عبر كل طلب + عميل متصفح بعد الترطيب + اتصال المشروع (health بالمفتاح 200)
- العزل: جسر CP7 (localStorage) يعمل بجانب الـ middleware (اختبار تعديل Hero انعكس فورًا) + رجعية 8 مسارات + استجابة الفحص 3 مقاسات 0 overflow
- أمان الأسرار: مسح شامل (source + .next كامل + chunks) = صفر SUPABASE_SECRET/service_role + السر فارغ + .env.local مؤكد git-ignored + لا طباعة مفاتيح
- التوثيق: memory.md (D-51..D-53 + جلسة 10 + 6 مزالق + الحالة) + worklog (هذه المهمة) — prd.md/design.md لم يُمسّا

Stage Summary:
- CP-A مكتمل ومُتحقق: اتصال Supabase حي + عملاء الثلاثة متوافقون مع Next 16 (async cookies) + إثبات فعلي لقراءة/كتابة/تحديث الكوكيز عبر الـ middleware — كل ذلك معزول تمامًا عن Phase 2
- اكتشاف موثق لعلة proxy.ts في next@16.1.3/Turbopack وحسمها بـ middleware.ts مع خطة ترقية
- الخطوة التالية: CP-B (Schema) — لا تبدأ إلا بموافقة المالك الصريحة

---
Task ID: 12
Agent: main (Super Z)
Task: Phase 3 — CP-B: Database Schema (Enums + 41 Tables + Constraints + Indexes + Triggers + RLS enable) — مكتوب ومُتحقق محليًا

Work Log:
- القرارات المعمارية D-54..D-59: uuid مرجعي + مفاتيح طبيعية للمرجعية (permissions/homepage_sections/payment_settings.provider) + Singleton id=1 CHECK(id=1) + فصل publish/operational status + legal بلا enum + registered_count مؤقت وprofiles بلا FK auth (قابلية إعادة بناء على قاعدة بلا مخطط auth) + RLS مفعل بلا Policies
- supabase init (config.toml project_id=bayt-almosawer) + bunx supabase migration new cp_b_init_schema
- كتابة supabase/migrations/20260905093844_cp_b_init_schema.sql: 20 enum + 41 جدول (هوية/صلاحيات/مدربون/دورات+جلسات+منهج/مسارات/تقييمات/مدونة/طلبات شركات/وسائط/الرئيسية Hybrid 11 جدول/إعدادات/قانوني) + 25 FK + set_updated_at + 36 trigger + 18 index ضرورية + RLS enable على 41
- التحقق المحلي (Docker postgres:17-alpine على قاعدة نظيفة): تطبيق كامل exit 0 أول مرة (--single-transaction + ON_ERROR_STOP) — قابلية الترحيل مثبتة
- اختبارات القيود (معاملة+ROLLBACK+تأكيد فراغ): 15/15 PASS (سالب/خصم/سعة/تقييم/slug مكرر/مسار مكرر/Singleton ثانٍ/FK-RESTRICT مدرب/block غير object/end<start/trainee 0/صفوف صالحة/CASCADE×2/updated_at trigger) — خطأان في سكربت الاختبار فقط (CASE13 اعتقد CASCADE مقابل RESTRICT المصمم، CASE15 قارن now() الثابتة بالمعاملة) مُصححان
- Introspection مطابق للتصميم: ENUMS 20 / TABLES 41 / INDEXES 29 / FK 25 / CHECK 29 / UNIQUE 11 / TRIGGERS 36 / RLS 41
- التوثيق: memory.md (D-54..D-59 + جلسة 11 + الحالة + الخريطة + 3 مزالق) + worklog (هذه المهمة) — ثم تنظيف حاوية الاختبار

Stage Summary:
- CP-B Schema مكتوب بالكامل ومُتحقق على قاعدة نظيفة (build + قيود + introspection) — بلا RLS Policies/Auth/Seed
- **مُطبَّق على Supabase (`db push` exit 0) + introspection البعيد مطابق (20/41/29/25/29/11/36/41) + القيود البعيدة 11/11 PASS + القاعدة نظيفة (total=0)**
- بوابة lint + tsc خضراوان (لا تغيير src في هذه المهمة)
- الخطوة التالية: CP-C (Auth + RLS Policies + Seed + Storage) — بموافقة المالك

---
Task ID: 13
Agent: main (Codex)
Task: Phase 3 — CP-C: Security Foundation Only (RLS + permission helpers + DB enforcement + grants + verification)

Work Log:
- استعادة السياق الكامل وتثبيت النطاق المصحح: Security Foundation فقط؛ CP-B immutable، ولا Auth UI/حماية admin/Seed/Storage/Repositories/DB integration/Payments/Edge Functions.
- إنشاء `supabase/migrations/20260905131000_cp_c_security_rls.sql` + ملفات اختبار محلية `local_auth_bootstrap.sql` و`cp_c_security_rls.test.sql` و`cp_c_introspection.sql`.
- بناء `private.has_permission` (`STABLE SECURITY DEFINER`, `search_path=''`, auth.uid فقط) و`is_owner` و`can_assign_role`، مع 4 دوال حماية إضافية؛ المجموع 7 (6 definer + 1 invoker).
- إنشاء 180 RLS Policy: 32 public-safe SELECT + corporate pristine INSERT + سياسات الإدارة command-specific لكل الجداول وفق خريطة 15 module. لا Public SELECT للجداول الحساسة أو profiles؛ Views=0 وauthor projection مؤجل.
- فرض DB: publish transition يحتاج publish، view normalization، owner matrix immutable، system roles undeletable/key+kind immutable، last active owner guard، self role/status escalation guard، وحدود منح الدور/الصلاحيات.
- least-privilege grants: revoke شامل ثم grants اللازمة فقط؛ permissions catalog read-only؛ trigger functions غير قابلة للتنفيذ من العملاء. Security Advisor كشف EXECUTE على bootstrap `public.rls_auto_enable()` فأُضيف revoke شرطي إلى CP-C وطُبق بعيدًا.
- قاعدة PostgreSQL 17 محلية نظيفة: CP-B→CP-C PASS؛ اختبارات transaction-only/ROLLBACK لكل الأدوار والسيناريوهات السلبية والإيجابية وانتقالات النشر PASS؛ introspection المحلي 180/7/6/7/41-41/0 views/0 fixtures. محاولة إعادة Docker بعد إصلاح Advisor تعذرت بعطل Docker Desktop engine؛ الإصلاح الشرطي لا يغير المسار المحلي عند غياب الدالة.
- Supabase remote: التحقق بالـ project ref منع الالتباس بمشروع آخر مشابه الاسم؛ التطبيق الذري على `bmtraining` نجح وسُجل `20260905131000 cp_c_security_rls`. Remote introspection: policies 180، functions 7، definer 6، triggers 7، tables/RLS 41/41، views 0، rows 0، ولا RLS بلا policy أو grants حساسة.
- Security Advisor النهائي بعد Rerun: 0 Errors / 0 Warnings / 0 Info.
- بوابات التطبيق: lint PASS، tsc PASS، Next production compilation PASS (56 صفحة)؛ `bun run build` wrapper فقط يصطدم بعلة Bun/Windows `cp -r` بعد نجاح البناء، فتم standalone packaging عبر GNU cp. Regression للمسارات الستة المطلوبة = 200.
- Secret hygiene: لا secret/service_role/database password داخل كود التطبيق أو migration/tests، ولا سر طُبع في التقرير؛ التطبيق البعيد عبر Dashboard بلا DB password.
- توثيق `memory.md` و`worklog.md` فقط؛ `design.md` وMigration CP-B لم يُعدلا.

Stage Summary:
- **CP-C COMPLETE + VERIFIED** — 180 Policy، 7 security functions، 7 protection triggers، RLS 41/41، Security Advisor نظيف، و0 Seed rows.
- النطاق المؤجل بقي كما هو: Auth UI/admin protection/Seed/Storage/Public DB reads/Admin DB writes/Repositories/Payments/Edge Functions.
- الخطوة التالية: **CP-D — Idempotent Database Seed**؛ لم يبدأ.

---
Task ID: 14
Agent: main (Codex)
Task: Phase 3 — CP-D: Idempotent Database Seed

Work Log:
- استعادة السياق وقراءة مصدر Mock/permissions/schema/security/config؛ حُصر CP-D في Seed فقط مع إبقاء التطبيق على localStorage/Public bridge الحالي.
- إنشاء `scripts/generate-supabase-seed.ts` وتوليد `supabase/seed.sql`؛ config كان مهيأ مسبقًا بـ `sql_paths = ["./seed.sql"]`.
- UUID حتمية من SHA-256 namespace + logical key، وترتيب entities→relations، وUPSERT مشروط بـ `IS DISTINCT FROM` لمنع تغيّر updated_at في no-op rerun.
- Seed: 5 roles، 53 permission combinations، 143 role permissions، 3 trainers، 10 courses، 8 sessions، 29/82 curriculum، 2/6 paths، 6 testimonials، Blog 6/21/6/12، Homepage كاملة، 14 footer links، settings singletons، 3 payment display rows، 4 legal pages.
- profiles=0 حتى Auth؛ corporate requests/notes/timeline=0 لأن Mock تشغيلية؛ media=0 حتى وجود Storage bucket objects؛ مؤلف blog null حتى Auth/projection.
- اختبار نظيف على PostgreSQL 18: CP-B→CP-C→Seed مرتين؛ snapshot شامل counts + row checksums متطابق حرفيًا، SHA-256 في المرتين `1abcff79ee655655975f7d9be47ab45be66291bdb34221e82e1aa0b50f25108a`.
- Business tests كلها PASS: أسعار/خصومات/جلسات/slugs/order/FKs/permission normalization؛ دورة أساسيات التصوير 4 أيام/8 محاور، وأسعار المسارات مشتقة.
- Remote: تحقق من `bmtraining` / `rnzdleotnxznkqfrcwfa` ثم تطبيق ناجح. استعلام تحقق مستقل طابق العدادات؛ 41/41 RLS و180 Policy؛ جميع مؤشرات المخالفات = 0.
- RLS REST regression: anon يرى 9 courses منشورة و6 posts، يرى 0 drafts، ويُرفض عن roles/payment settings (401).
- lint PASS؛ tsc PASS؛ Next build compilation PASS (56 صفحة). wrapper `bun run build` يظل يفشل بعد البناء عند `cp -r` على Bun/Windows؛ التغليف اليدوي الآمن نجح. المسارات الستة المطلوبة = HTTP 200.
- Secret scan: صفر database password/URL، secret key، service-role value في Seed أو generator. لا packages ولا migrations جديدة، ولا تعديل CP-B/CP-C/design.

Stage Summary:
- **CP-D COMPLETE + VERIFIED** — local exact idempotency + remote parity + RLS/business regression PASS.
- الخطوة التالية: **CP-E — Storage**؛ لم يبدأ.

---
Task ID: 15
Agent: main (Codex)
Task: Phase 3 — CP-D.1: Course Schema Parity Fix

Work Log:
- فحص مصدر الحقيقة كاملًا للحقول الثلاثة: `AdminCourse` يعرّفها `string[]`، الـ Seed يملؤها كمصفوفات نصية، Course Editor يستخدم Repeaters نصية، وCourse Detail/public bridge يستهلكانها كقوائم نصية. `readMinutes` بقي Derived ولم يدخل Schema.
- إنشاء Migration additive مستقلة `supabase/migrations/20260906090000_cp_d1_course_schema_parity.sql`: ثلاثة أعمدة `text[] NOT NULL DEFAULT '{}'` داخل `courses` فقط؛ لا تعديل CP-B/CP-C ولا تغيير أمني.
- تحديث `scripts/generate-supabase-seed.ts` ثم إعادة توليد `supabase/seed.sql` لإدخال outcomes/audience/requirements ضمن UPSERT المشروط؛ عدم اختلاف البيانات لا يغير updated_at.
- Local clean PostgreSQL 18: CP-B→CP-C→CP-D.1→Seed PASS. مقارنة per-course Mock↔DB = 10/10 و0 فروق. canonical snapshot بعد تشغيلين = `6ed0d45de6181091722fad354f1777e762c667ebb6f632a9479490ad50a6fce9` في المرتين؛ counts ثابتة 10/9/1.
- Local security: RLS 41/41، Policies 180، anon يرى 9 منشورة بكل القوائم و0 draft؛ admin يرى 10 وينفذ UPDATE، واختبار profile تم داخل transaction ثم ROLLBACK إلى 0.
- Remote: تحقق صريح من URL/ref `rnzdleotnxznkqfrcwfa` قبل الكتابة؛ تطبيق الأعمدة وCourse seed ثم تسجيل migration version `20260906090000`. عقد الأعمدة مطابق، complete_list_count=10، parity hash=`0030ca58c3a36a30d5bf8a1fce8ad634` مطابق المحلي، RLS 41/41 وPolicies 180.
- Remote idempotency/security: إعادة Course parity seed أبقت count=10 وsnapshot=`c6af96dd63ab8c93c38a9ae4e1f94a68`؛ REST anon 9 صفوف مكتملة و0 draft؛ admin regression 10 reads + 1 update داخل transaction وrollback مؤكد (0 profile تجريبي).
- Gates: lint PASS؛ `bunx tsc --noEmit` PASS؛ Next production compilation PASS (56 صفحة). `bun run build` exit 1 فقط بسبب `cp -r` المعروف بعد نجاح compile؛ Copy-Item standalone PASS. Smoke: `/`, `/courses`, `/courses/photography-fundamentals`, `/admin`, `/admin/courses` كلها 200.
- Bugs: لا علة وظيفية جديدة؛ العلة البيئية المعروفة للـ build wrapper فقط. Deviations: استُخدم PostgreSQL 18 مؤقت لأن Docker engine غير متاح، وتطبيق remote تم عبر SQL Editor بلا أي secret؛ النتيجة والعقد وسجل migration تحققت مستقلًا.
- لم يبدأ Storage/Auth/Public DB reads/Admin DB writes، ولم يُحوّل التطبيق إلى DB.

Stage Summary:
- **CP-D.1 COMPLETE + VERIFIED** — Course CMS/DB parity 100%، idempotency وRLS/security/app regression كلها PASS.
- الخطوة التالية: **CP-E — Storage**؛ لم يبدأ.

---
Task ID: 16
Agent: main (Codex)
Task: Phase 3 — CP-E: Supabase Storage + Media Foundation

Work Log:
- استعادة نطاق CP-E وحصره في Storage/Media فقط؛ لم يبدأ Auth UI أو حماية admin أو Public DB reads أو Admin repositories/writes أو Payments أو Edge Functions أو CP-F.
- إنشاء migration مستقلة `20260906093000_cp_e_storage.sql`: bucket عام `bm-media`، 10MiB، JPEG/PNG/WebP/AVIF، قيد/default `public.media.bucket`، وأربع RLS Policies لـ SELECT/INSERT/UPDATE/DELETE مربوطة بصلاحيات media.
- إنشاء `src/lib/supabase/media-storage.ts`: تحقق العميل، مسارات UUID بالمجلدات الثمانية، URL مشتق، upload cleanup، safe replace/delete، reference scan وorphan scan. اختبار API كشف وصحح حقلي المدونة (`cover_path` و`content.image`).
- تحديث مولد Seed و`supabase/seed.sql` بخيار A: رفع وزرع ملفات Mock الـ14 الموجودة فعلًا، IDs/paths حتمية، الاسم/alt/caption/time من Mock، والحجم/الأبعاد من الملفات. لا fake rows ولا public_url؛ `public/images` والجسر العام لم يتغيرا.
- Local clean PostgreSQL 18: CP-B→CP-C→CP-D.1→CP-E→Seed مرتين PASS؛ media=14، RLS=41/41، public Policies=180، Storage Policies=4؛ canonical seed hashes متطابقة `53F4DC58453A3CD0992B3EF0AFDBC21A1693C2DF2E888F180CCD99AEE817C722`.
- اختبارات RLS المحلية: anon read فقط؛ content-editor create/update/delete؛ finance/suspended/cross-bucket denied؛ owner-like allowed.
- Remote exact ref `rnzdleotnxznkqfrcwfa`: migration مسجلة ومطبقة؛ 14 objects + 14 metadata، orphan 0/0، bucket contract صحيح، RLS العامة 41/41، Policies العامة 180، Storage RLS true و4 Policies.
- Storage API بمستخدم مؤقت مصادق (حُذف بعد الاختبار): JPEG/PNG/WebP upload+delete PASS؛ AVIF config-only؛ invalid MIME/oversize مرفوضان على العميل والـ bucket؛ wrong bucket وanon upload مرفوضان؛ public read PASS؛ metadata-failure compensation PASS؛ orphan scanner اكتشف الاتجاهين ثم عاد 0/0.
- Security Advisor بعد Rerun: 0 Errors، Warning واحد متوقع لأن bucket العام يسمح listing حسب شرط النطاق. فحص grants/ACL + اختبارات RLS أكد أن الحماية الصفية فعالة. Secret scan في source/migrations/scripts/docs = 0.
- lint PASS؛ tsc PASS؛ Next build compilation PASS (56 صفحة). `bun run build` exit 1 فقط عند `cp -r` البيئية الموثقة؛ PowerShell packaging PASS. Smoke للمسارات السبعة المطلوبة = 200.
- التوثيق: memory.md (D-68..D-72 + جلسة 15 + الحالة الحالية) وworklog.md فقط؛ design/prd وCP-B/CP-C لم تعدل في CP-E.

Stage Summary:
- **CP-E COMPLETE + VERIFIED** — Storage/Media foundation مطبقة محليًا وبعيدًا مع 14/14 parity و0 orphans.
- الخطوة التالية: **CP-F — Auth + Profiles + Admin Route Protection**؛ لم يبدأ.
