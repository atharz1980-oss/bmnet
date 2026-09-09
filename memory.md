# Memory — حالة مشروع بيت المصور

> **بروتوكول المزامنة الإلزامي** (يمنع فقدان السياق بين الجلسات/النماذج — GLM 5.3 Flash أو غيره):
> 1. في بداية أي جلسة: اقرأ `prd.md` + `design.md` + هذا الملف **كاملة** قبل أي عمل.
> 2. عند إنهاء أي عمل: حدّث "الحالة الحالية" + أضف سطرًا في "سجل الجلسات" (**إلزامي**).
> 3. أي قرار معماري جديد يُضاف لجدول "سجل القرارات" مع سببه (Append-only).
> 4. أي تعديل على ملفات مجمدة يوثَّق في سجل القرارات (الملف + السبب).
> 5. `prd.md` و`design.md` لا يتغيران إلا بتغيير متطلبات من المالك.
> آخر تحديث: 2026-09-06 (Phase 3 — CP-E)

---

## 1) الحالة الحالية

| المرحلة | الحالة |
|---|---|
| Phase 1 — Public Frontend | ✅ **منجزة ومجمدة** |
| Phase 2 — Owner Dashboard + CMS Mock | ✅ **COMPLETE** (CP1–CP7) |
| Phase 3 — Backend حقيقي | ✅ **CP-A..CP-G COMPLETE + VERIFIED + Launch Audit (2026-09-09) منفذ** — مراجعة إطلاق شاملة أصلحت: soft-404 + metadata ديناميكية من القاعدة، نموذج تواصل حقيقي (contact_messages)، sitemap/robots/OG/canonical، رسائل أخطاء عربية سليمة، سكربت تشغيل إنتاج — **بانتظار المالك: تطبيق migration ‏`20260909090000_service_role_private_grants.sql` (بدونه كل UPDATE على courses/paths/blog/legal يفشل 42501) + `20260909091000_contact_messages.sql` + تأكيد الدومين في `siteConfig.url`** — ممنوع بدء CP-H/Community/مزايا جديدة |
| Launch Audit | 🟡 **READY WITH ACTIONS** — 0 روابط مكسورة، 29 اختبار، lint/tsc نظيفة، بناء 58 صفحة، حماية /admin وRLS ووسائط وطلبات شركات وخروج/جلسات مُتحقق منها حيًا | **جارية — CP-A + CP-B + CP-C + CP-D + CP-D.1 + CP-E COMPLETE + VERIFIED** — bucket `bm-media` و14 أصلًا/صف metadata مطبقة محليًا وبعيدًا على `rnzdleotnxznkqfrcwfa`؛ RLS بقي **41/41** وPolicies العامة **180** مع 4 Storage Policies — **الخطوة التالية: CP-F (Auth + Profiles + Admin Route Protection)** بموافقة المالك |

## 2) سجل القرارات المعمارية (Append-only)

| # | التاريخ | القرار | السبب |
|---|---|---|---|
| D-01 | 2026-08-31 | إخفاء Navbar/Footer العام على /admin عبر مكوّن Client صغير (ChromeGate) يغلّفهما في root layout — بدل نقل صفحات الموقع إلى route groups | عدم تحريك/تعديل ملفات Phase 1 المجمدة — أقل تأثير ممكن (usePathname متاح أثناء SSR فلا وميض) |
| D-02 | 2026-08-31 | طبقة بيانات الإدارة: `src/data/admin/types.ts` (أنواع مستقلة أغنى) + Seed مشتق من بيانات Phase 1 (courses/paths/testimonials/blogPosts/siteConfig/content) | اتساق الأسماء والأسعار مع الموقع العام + نموذج بيانات CMS كامل |
| D-03 | 2026-08-31 | حالة CMS واحدة: React Context (`AdminStoreProvider`) في admin layout — بدون Redux/Zustand | المواصفة §4.26 تمنع State libraries |
| D-04 | 2026-08-31 | حفظ اختياري في localStorage بمفتاح `bm-admin-cms-v1` — بنمط hydration-safe (render بالـ seed ثم تحميل في useEffect) | مراجعة UX واقعية عبر refresh + تفادي hydration mismatch |
| D-05 | 2026-08-31 | إعادة الترتيب بأزرار ↑ ↓ (بدون drag & drop) | المواصفة تمنع إضافة Dependencies — والأزرار أبسط وأسهل وصولًا |
| D-06 | 2026-08-31 | محرر المدونة: textarea منظم (بدون Rich Text Editor) | المواصفة §4.16 تمنع إضافة مكتبة RTE |
| D-07 | 2026-08-31 | مكونات shadcn/ui (radix) للإدارة: AlertDialog للتأكيد، Sheet للموبايل Drawer، Switch/Tabs/Select/Table/Badge | جاهزة ومتوافقة مع الـ tokens وaccessibility مدمجة |
| D-08 | 2026-08-31 | صفحات الإدارة `"use client"` — و`src/app/admin/layout.tsx` (server) يضبط metadata + robots noindex | لا SEO للإدارة + الحفاظ على State بين التنقل داخل /admin |
| D-09 | 2026-08-31 | القيم المحسوبة (Remaining Seats، أسعار المسارات، الإحصائيات) تُحسب في الواجهة ولا تُخزن | تتجنب التضارب عند تغيير الأسعار/المقاعد |
| D-10 | 2026-08-31 | Seeds ثابتة بدون `new Date()` بمستوى الموديول؛ التواريخ Mock في 2026 (الطوابع الزمنية للعمليات الجديدة تولد وقت التنفيذ في المتصفح فقط) | تفادي SSR/client hydration mismatch |
| D-11 | 2026-08-31 | استثناء `examples/` و`skills/` (مجلدات قالب البيئة) من tsconfig + حذف `.next/dev` المتراكمة | جعل `npx tsc --noEmit` الكامل نظيفًا لتلبية بوابة التحقق — ملف إعدادات وليس من ملفات الواجهة المجمدة |
| D-12 | 2026-08-31 | تحميل localStorage مؤجل بـ `setTimeout(0)` داخل effect + إغلاق Drawer بنمط ضبط الحالة أثناء الرسم (previous-state pattern) | قاعدة `react-hooks/set-state-in-effect` الجديدة في Next 16 تمنع setState المتزامن داخل effects — دون كسر الترطيب الآمن |
| D-13 | 2026-08-31 | Breadcrumbs تترجم معرّفات الكيانات (دورة/مدرب/مسار/مقال/طلب) إلى أسمائها من المخزن — hook واحد أعلى المكوّن ودوال حل تسمية نقية | تجربة إدارة حقيقية + التزام صارم بقواعد Hooks |
| D-14 | 2026-08-31 | الدورة المرجعية «ورشة أساسيات التصوير» (course-001) تُطبَّق كتجاوز منهجي واحد في seed (`applyReferenceCourseOverride`: الاسم الكامل + shortName + منهج 4 أيام بمحاورها + موقع «حي الشرفية») مع رفع `ADMIN_CMS_VERSION` إلى 2 | بيانات معتمدة من المالك للمرجعية دون المساس بملفات Phase 1 المجمدة، ولا نسخ يدوي في أماكن متعددة |
| D-15 | 2026-08-31 | منطق «المتاح/أقرب موعد» في Mock: الحالة open/upcoming مرتبة بـ startDate تصاعدي — صفر اعتماد على ساعة النظام (`getCourseNearestSession`) | Seed 2026 لا يختفي مع مرور الزمن؛ عند الربط بالـ DB يُستبدل بـ current timestamp + query |
| D-16 | 2026-08-31 | قسم «آخر التسجيلات» في الداشبورد مشتق من الجلسات (`getRecentRegistrations`) دون إضافة كيان Registration لنموذج البيانات | الالتزام بقائمة النموذج المعتمدة من Checkpoint 1؛ يُستبدل بجدول تسجيلات حقيقي في Phase 3 |
| D-17 | 2026-08-31 | Duplicate: اسم «(نسخة)» + slug «-copy» مع ضمانة التفرد (`uniqueCopyName`/`uniqueCourseSlug`)، وحالة draft — والـ sessions **لا تُنسخ** (تبدأ النسخة بلا مواعيد) مع نسخ المنهج والمحتوى | المواعيد التزامات زمنية مرتبطة بالدفعة الأصلية؛ قرار موثق في الكود والتقرير |
| D-18 | 2026-08-31 | الحالة المعروضة للمواعيد مشتقة (`getDerivedSessionStatus`): اكتمال المسجلين يعرض «ممتلئة» بصريًا دون تعديل الحالة المخزنة تلقائيًا | لا مصدرا حقيقة متعارضان — تغيير الحالة قرار صريح من المالك |
| D-19 | 2026-08-31 | مسودة المحرر تُهيأ بثلاث طبقات: initializer فوري عند توفر الدورة + مزامنة prevId عند تغيير المعرّف + تهيئة مؤجلة بعد الترطيب (نمط ضبط أثناء الرسم D-12) | إصلاح علقة spinner عند التنقل الداخلي من القائمة إلى المحرر (prevCourse بالمرفق لا يتغير أبدًا) |
| D-20 | 2026-08-31 | زر حذف القوائم يفتح ConfirmDialog فقط (`onRequestDelete`) — الحذف الفعلي لا يحدث إلا بعد التأكيد | إصلاح علقة: الحذف كان يتجاوز التأكيد؛ + ملاحظة حرجة: `ignoreBuildErrors: true` في next.config تجعل `npx tsc --noEmit` الصريحة هي البوابة الحقيقية |
| D-21 | 2026-08-31 | حماية حذف المدرب (الأكثر أمانًا من بين خيارين): مدرب مرتبط بدورات **يُحجب حذفه نهائيًا** ويُعرض حوار يشرح الارتباط مع بديل «تحويل إلى مخفي» — غير المرتبط يُحذف بتأكيد عادي | منع الحذف الصامت وكسر علاقة trainerId؛ الإخفاء يحفظ علاقات الدورات القائمة ويختفي من الاختيارات الجديدة فقط |
| D-22 | 2026-08-31 | تهيئة مسودة المحررات (دورة/مدرب/مسار) من بيانات المخزن **بعد الترطيب فقط** — `hydrated` شرط إلزامي في المُهيّئ وفي التهيئة المؤجلة | التحميل المباشر لرابط المحرر كان يهيئ المسودة من الـ Seed قبل قراءة localStorage وأول حفظ يصفّر تعديلات المالك المحفوظة (علة اكتُشفت بـ blind-save بعد فتح مباشر — أصلحت في المحررات الثلاثة وتحقق إصلاحها فعليًا) |
| D-23 | 2026-08-31 | **ترحيل تلقائي للنسخ السابقة داخل ترطيب المخزن**: `migrateAdminData` (في seed.ts) تقبل v3 وتنتج v4 — الأقسام الجديدة للرئيسية بقيم افتراضية آمنة (تلقائي) مع الحفاظ على تعديلات المالك القائمة، وتبنّى عناصر whyUs القديمة بـ enabled:true — وإذا فشل الترحيل نبقى على الـ Seed | المواصفة تطلب migration بسيط داخل Store versioning؛ رفع النسخة وحده كان سيفقد بيانات المالك المحلية عند أول فتح بعد التحديث |
| D-24 | 2026-08-31 | **محتوى المدونة كتل منظمة** `contentBlocks[]` بخمسة أنواع (paragraph/heading/image/quote/list) — بلا Rich Text Editor ولا HTML خام؛ الترحيل يفصل النص القديم عند الفقرات المزدوجة إلى كتل paragraph بلا فقد أي نص، ونسخة المقال تُعيد توليد معرفات كتلها | المواصفة (#15) تطلب Structured Editor؛ الكتل تحمي لغة التصميم وتمكّن ترتيبًا موثوقًا |
| D-25 | 2026-08-31 | محرر الرئيسية = **مسودة محلية كاملة + إجراء حفظ شامل واحد `updateHomepage(content)`** — استُبدلت الـ actions التفصيلية (غير المستخدمة) بنمط المسودة/اللقطة/Dirty الموحد؛ الإلغاء يعيد آخر حالة محفوظة دون مغادرة الصفحة | «أولوية الوضوح للمالك»: لا حفظ جزئي متسرب، وDirty state موثوق عبر تبويبات الأقسام الـ 11 |
| D-26 | 2026-08-31 | **منطق اختيار الرئيسية**: الدورة القادمة تلقائي = أقرب Session متاحة (منطق D-15) أو يدوي بمراجع IDs + **تحذير صريح** إذا لم يعد الاختيار صالحًا (محذوف أو حالته ليست open/upcoming)؛ المميزة تلقائي = Featured وغير مسودة؛ التقييمات تلقائي = Featured+Visible فقط والمخفي لا يظهر أبدًا في أي وضع | متطلبات صريحة في مواصفة #14 + قواعد Business 4/6/7 — مراجع IDs فقط لا نسخ بيانات |
| D-27 | 2026-08-31 | **معاينة المدونة دائمًا داخلية** `/admin/preview/blog/[id]` — لا يوجد رابط معاينة عام أبدًا (لا Broken Links)؛ و«معاينة الرئيسية» `/admin/preview/home` تعكس ترتيب الأقسام وEnabled/Disabled من المخزن، والموقع العام `/` يبقى على بيانات Phase 1 المجمدة (العزل مُتحقق فعليًا) | الموقع العام لا يقرأ المخزن في هذه المرحلة (قرار المالك) — والمعاينة الإدارية البديلة أنظف من الاعتماد على slug عام قد لا يوجد |
| D-28 | 2026-08-31 | حقول مشتقة عند الحفظ: `readMinutes` = كلمات الكتل ÷ 180 (دقيقة كاملة) و`updatedAt` يُختم عند كل حفظ — لا يُحرَّران يدويًا؛ Duplicate التقييم = غير مميز ومخفي، وDuplicate المقال = مسودة بـ slug فريد «-copy» وكتل بمعرفات جديدة | لا مصدرين للحقيقة (D-09)؛ والنسخ تبدأ آمنة لا تنشر بالخطأ |
| D-29 | 2026-08-31 | slug المقال = نفس النمط اللاتيني الموثق `SLUG_PATTERN` (أحرف صغيرة/أرقام/شرطات) وفريد عبر `uniquePostSlug` | المشروع يستخدم slugs لاتينية منذ Phase 1 وموثق في Checkpoint 2 — لا فرض عكسي |
| D-30 | 2026-09-01 | **طلبات الشركات: Archive بدل الحذف** — `archivedAt?` يخفي الطلب من القوائم النشطة والعدادات (Dashboard/Sidebar/getDashboardStats) مع الاحتفاظ ببياناته، وحذف نهائي غير متاح في الواجهة | Leads بيانات تشغيلية يجب ألا تضيع بسهولة — مواصفة Checkpoint 5 توصي صراحة بالأرشفة |
| D-31 | 2026-09-01 | **Timeline طلب الشركات** يُنشأ تلقائيًا داخل `updateRequestStatus` عند كل تغيير حالة (previous/new/timestamp/actor «المالك»)، وSeed يستخدم طوابع ثابتة Deterministic مع حدث افتتاحي actor «النظام» | توثيق دورة الحياة + قاعدة عدم Timestamps غير deterministic في Seed (D-10) — تعديلات الجلسة الحية فقط تأخذ وقت التنفيذ |
| D-32 | 2026-09-01 | **نموذج الوسائط v5**: mimeType/size(bytes)/altText/caption/source(seed\|local-preview)/previewUrl/أبعاد اختيارية — رفع محلي بالتحقق (صور فقط، حد 10MB قبل أي معاينة) وعناصر local-preview تُحذف عند الحفظ (sanitize) فتُفقد معاينتها بعد التحديث بتنويه صريح | المواصفة #17 — لا تخزين File/Blob في localStorage مطلقًا (توسيع قرار sanitize القائم) |
| D-33 | 2026-09-01 | **حماية حذف الوسائط**: ماسح مراجع نقي `getMediaReferences` يفحص كل حقول الصور (دورات/مدربون/مسارات/رئيسية/مقالات/SEO/General) ويعرض «مستخدمة في N مواضع» مع التفاصيل قبل التأكيد (حذف رغم المراجع ممكن مع تنبيه أن المواضع تعود للـ placeholder) — بلا Architecture معقد | مواصفة Phase 2: لا حذف صامت؛ Warning + تأكيد قوي فقط |
| D-34 | 2026-09-01 | **بنية الإعدادات**: مخزن واحد مع أقسام General/Contact/Footer/Seo/Payments + `/admin/settings/layout.tsx` بقائمة تنقل (Sidebar عمودي/صف أفقي موبايل) + hook موحد `useSettingsDraft` (مسودة بعد الترطيب D-22 + لقطة + Dirty + beforeunload + تأكيد إلغاء + حفظ شامل واحد D-25). روابط الفوتر القانونية **مربوطة** بصفحات /admin/legal (لا نسخ نصوص)، وWhatsApp يُولّد wa.me من الرقم المطبّع (تحقق 9665XXXXXXXX) بلا تخزين رابط يدوي | مواصفة #18 + «لا تكرر settings داخل عدة stores» — والدعم للأقسام الجديدة يكون سطرًا في types/seed دون مخزن ثانٍ |
| D-35 | 2026-09-01 | **المدفوعات UI فقط**: 3 مزودين (Moyasar/Tabby/Tamara) بمفتاح تفعيل وبيئة Test/Production واسم معروض اختياري — الحالة دائمًا not-configured (تُعرض «يتطلب تهيئة» عند التفعيل)، **لا حقول مفاتيح سرية إطلاقًا** مع رسالة صريحة أن المفاتيح عبر Environment Variables في Phase 3 | مواصفة #18 الصارمة: لا API/Checkout/Webhook/Sandbox |
| D-36 | 2026-09-01 | **إصلاح Admin 404**: `src/app/admin/[...rest]/page.tsx` (catch-all يستدعي notFound) + `src/app/admin/not-found.tsx` بواجهة إدارية داخل AdminShell وزر «العودة إلى لوحة التحكم» — 404 الجذر العام لم يتأثر | المزلقة الموثقة من CP4: مسارات /admin غير المبنية كانت تعرض هيكل الموقع العام؛ الحل لا يعيد هيكلة Phase 1 ولا يحرك الملفات |
| D-37 | 2026-09-01 | تواريخ اليوم فقط (بلا وقت) تُشتق بـ `todayISO()` المحلي — لا `toISOString().slice(0,10)` الذي يعطي تاريخ الأمس بعد منتصف الليل بالتوقيت المحلي؛ شمل الإصلاح محرر Legal والتقييم الافتراضي الجديد | الختم الزمني للصفحات القانونية ظهر بتاريخ خاطئ في الاختبار (UTC vs المحلي) — أُصلح وأُتحق |
| D-38 | 2026-09-01 | `useSettingsDraft.patchDraft` يعامل المسودة المصفوفة (المدفوعات) كاستبدال كامل لا دمج كائن — ودعم تمرير قيمة صريحة `handleSave(explicit)` للمحرر القانوني لختم lastUpdated دون قراءة مسودة قديمة من الإغلاق | علتان مكتشفتان بـ browser tests: انهار `draft.map` في المدفوعات عند التفعيل، وختم «آخر تحديث» لم يُطبق بسبب async state closure |
| D-39 | 2026-09-02 | **نموذج الصلاحيات (Checkpoint 6)**: ملف مستقل `src/data/admin/permissions.ts` — 15 وحدة × أفعال منطقية (view/create/edit/delete/publish/manage)، «عرض» أساس أي فعل أعلى يُلحق تلقائيًا (normalizePermissions)، الأدوار النظامية الخمسة بمصفوفات Defaults قابلة للتعديل من اللوحة عدا **المالك مقفول كامل الوصول** | «أقل نموذج يحقق تحكمًا فعليًا» + قابلية ترحيل/توسعة — تحذير أمني موثق في رأس الملف: Mock UI فقط، الحماية الحقيقية Server-side في Phase 3 |
| D-40 | 2026-09-02 | **حماية آخر مالك ثلاثية الطبقات**: (1) UI: تعطيل أزرار التعليق/الحذف + قفل اختيار الدور والحالة في المحرر + حوار تفسيري، (2) Store guard دفاعي: updateUser/deleteUser يتجاهلان صامتًا أي محاولة نقله أو تعليقه أو حذفه، (3) deleteUser يعيد currentUserId للمالك الباقي | يبقى Owner واحد بوصول كامل دائمًا — لا مسار واحد يصفّره حتى لو خُدعت الواجهة |
| D-41 | 2026-09-02 | **المستخدم يخزن roleId فقط** — لا نسخ صلاحيات إلى المستخدم إطلاقًا؛ الاشتقاق عبر getRolePermissions/roleCan/can — تعديل مصفوفة الدور يتبدل وصول كل مستخدميه لحظيًا (أُثبت فعليًا باختبار D3: تغيير الدور غيّر معاينة مستخدمه دون لمسه) | لا مصدرين للحقيقة (امتداد D-09) + جاهزية Phase 3: جدول user.roleId FK |
| D-42 | 2026-09-02 | **Role Preview تطويرية فقط**: `previewRoleId` حالة في الذاكرة داخل Store (لا تُخزن ولا تُقيّد مسارات) في قائمة Topbar مع تنبيه صريح «معاينة صلاحيات فقط — ليست حماية أمنية» + زر عودة للصلاحيات الفعلية — تزول بالـ refresh | تمكين المالك من معاينة شكل اللوحة بأدوار مختلفة دون أي ادعاء أمني في مرحلة بلا Authentication |
| D-43 | 2026-09-02 | **ترحيل v5→v6** داخل `migrateAdminData`: الأدوار النظامية تُستبدل بمصفوفاتها القانونية (لا واجهة تعديل كانت قبل v6 فلا خسارة) والمخصصة تُحوَّل مستوياتها القديمة لأفعال؛ المستخدمون: disabled→suspended + طوابع createdAt/lastActiveAt حتمية + currentUserId يثبت على المالك إن غاب — **مُتحقق فعليًا بحملة v5 مصنوعة** (بلا فقدان/duplication/blob، مستقر عبر reload ثانٍ) | استمرار سلسلة D-23 + حماية بيانات المالك المحلية عند أول فتح بعد التحديث |
| D-44 | 2026-09-02 | **إصلاح تعقيم `users[].avatar`**: `sanitizeForStorage` أصبح يمسح أي blob: في صور المستخدمين (→ undefined) — علة اكتُشفت باختبار متصفح فعلي (blob تُخزَّن) وأُصلحت وأُعيد التحقق (B1 PASS) | إغلاق ثغرة نمط D-32: كل حقل صورة في النموذج يعقَّم — كان قد فات المستخدمين الجدد في CP6 |
| D-45 | 2026-09-02 | **معمارية الربط العام (CP7)**: «جسر بيانات عام» — وحدة نقية `src/data/public-bridge.ts` تشتق `PublicCmsView` من AdminData (المصدر الوحيد) بقواعد العرض العامة، + `PublicCmsProvider` صغير في الـ root layout يغلف الجسم كاملًا (Navbar/Footer أيضًا). **الاستراتيجية**: SSR يعرض بيانات Phase 1 الثابتة بايت-بايت (صفر hydration mismatch + SEO محفوظ) ثم بعد الترطيب (setTimeout 0 — نمط D-12) يقرأ localStorage قراءةً فقط (لا يكتب أبدًا) ويستبدل العرض — الزائر العام بلا مخزن يرى الموقع المجمد حرفيًا، والمالك (صاحب المخزن) يرى تعديلات CMS. قُرنت البدائل: A) العام يقرأ AdminStore مباشرة — مرفوض (تحويل كامل client + Provider ثقيل)، C) إعادة بناء client كاملة — مرفوض (تضحية SSG/SEO) | متطلب CP7 §3: لا client بلا داعٍ، لا mismatch، لا Flicker واضح (مبادلة رسم واحدة لمالك المتصفح فقط)، لا تكرار (الاشتقاق من مخزن واحد)، لا D-22 (قراءة فقط)، لا مصدرين (الإدارة مصدر الحقيقة) |
| D-46 | 2026-09-02 | **قواعد العرض العام في الجسر**: الدورات غير المسودة فقط (draft مخفٍ)، الجلسات open/upcoming/full فقط (المغلقة/المنتهية مخفية — full تعرض «اكتمل العدد»)، المدرب المخفي يبقى معروضًا لدوراته المرتبطة (امتداد D-21 للعام)، المسار/المقال منشوران فقط، التقييم غير الظاهر لا يظهر أبدًا (D-26)، القانوني المنشور فقط، الاختيار اليدوي غير الصالح في الرئيسية → fallback تلقائي (§16)، الصور blob:/غير محلية → صورة Phase 1 البديلة، durationWeeks للمسار مشتق (⌈أيام/2⌉ — غير مُدار في CMS)، التسعير مشتق لحظيًا من أسعار الدورات العامة (لا يُخزَّن — D-09) | كلها fallbacks داخل الجسر النقي — قابلة للاختبار وإعادة الاستخدام في Phase 3 من DB |
| D-47 | 2026-09-02 | **مزامنة التبويبات (Multi-tab)**: الـ Provider يستمع لحدث `storage` (يُطلق تلقائيًا في التبويبات الأخرى عند كتابة الإدارة) → إعادة اشتقاق فورية — مُتحقق فعليًا: حفظ من تبويب الإدارة يُحدّث تبويب العام المفتوح دون أي reload (اختبار MT بعلامة جلسة على window) | أبسط تنفيذ آمن ممكن (بلا Polling/Channel) — يغلق Known Issue «multi-tab sync غير منفذ» |
| D-48 | 2026-09-02 | **صفحات الخادم العامة تصبح رفيعة**: metadata + generateStaticParams (روابط Phase 1 — SSG محفوظ) تبقى في الخادم، والجسم ينتقل لمكوّنات عرض client (`course-details/paths-view/path-details/blog-view/blog-post-view/policy-view/contact-details/homepage`) تحل: الثابت initial للـ SSR → استبدال CMS بعد الترطيب → واجهة «غير متاح» عند مسودة/محذوف (لا صفحة مكسورة)، وslug جديد أنشأه المالك يُعرض عند الطلب الديناميكي | الحفاظ على SEO/SSG الحرفي مع تفعيل الربط — روابط غير معروفة تعرض fallback بدل 404 قاسٍ (موثق) |
| D-49 | 2026-09-02 | **إصلاح انهيار الحفظ في صفحات الإعدادات**: زر `SettingsSaveBar` كان `onClick={onSave}` فيمرر حدث النقر كوسيط `explicit` إلى `handleSave(explicit?)` (ميزة D-38) → sanitize يعالج الحدث بدل المسودة → `undefined.trim` + JSON دائري ولا حفظ في صفحات الإعدادات الخمس — الإصلاح: عزل الحدث `onClick={() => onSave()}` في الشريط الموحد (موضع واحد) | علة حرجة اكتشفها اختبار CP7 — كانت تخرب كل حفظ إداري للإعدادات (دخيلة بعد تحقق CP5 ولم يغطها CP6-VERIFY) |
| D-50 | 2026-09-02 | **إصلاح مراجع aria-labelledby معلقة (كامنة من Phase 1)**: خمسة أقسام رئيسية تشير لمعرفات غير موجودة (SectionLead بلا id) — الإصلاح: `titleId?` اختياري في SectionHeading يضعه على h2 ويُمرَّر من الأقسام الخمسة — تغيير جمعي آمن (سمة id فقط) | علة أصول كشفها فحص §22 في CP7 — الملفات نفسها معدلة ضمن CP7 أصلًا فالإصلاح ضمن النطاق وموثق |
| D-51 | 2026-09-02 | **بنية عملاء Supabase (CP-A)**: `src/lib/supabase/{client,server,middleware}.ts` — المتصفح عبر `createBrowserClient` (Singleton كسول)، الخادم عبر `createServerClient` مع `await cookies()` (Next 16) وsetAll بصمت داخل RSC، والـ middleware عبر `updateSession` بالنمط الرسمي (getUser فقط — بلا حماية/توجيه). **المفاتيح**: Publishable فقط في العميلين — `SUPABASE_SECRET_KEY` فارغ وغير مستخدم إطلاقًا. env: `.env.local` (محلي، git-ignored) + `.env.example` (أسماء بلا قيم، رفع مفعّل باستثناء `!.env.example`) | عزل CP-A الكامل: لا Schema/Tables/SQL/RLS/Auth/Storage/Repositories — جسر localStorage للعام والإدارة كما هو بلا أي مساس |
| D-52 | 2026-09-02 | **`middleware.ts` بدل `proxy.ts` (CP-A)**: اصطلاح Next 16 الرسمي هو proxy.ts، لكنه في next@16.1.3 + Turbopack **يُجمَّع ويُكشف في قائمة البناء لكن لا يُسجَّل في middleware-manifest فلا يُستدعى وقت التشغيل** — مُثبت تجريبيًا بمقارنة مباشرة (نفس الملف باسم middleware.ts يسجل MW_KEYS=/ ويعمل فورًا). CP-A يستخدم middleware.ts المدعوم فعليًا (بتحذير الإهمال المتوقع) — عند ترقية Next يُعاد التسمية إلى proxy.ts دون أي تغيير في المنطق | الحسم التجريبي أسرع وأوثق من انتظار إصلاح المنبع — موثق للترقية |
| D-53 | 2026-09-02 | **مسار فحص CP-A** `/admin/dev/supabase-check`: صفحة خادم (noindex ضمن admin) تعرض OK/FAIL فقط (بيئة/اتصال/عميل خادم/كوكيز) + مكون عميل لفحص المتصفح بعد الترطيب — بلا أي قيم/مفاتيح. تحقق الكتابة/التحديث عبر كوكي مسبار `cpa-probe` يكتبه/يزيده الـ middleware على مسار الفحص فقط — بنفس آلية @supabase/ssr (response.cookies.set) | إثبات حي لمسار الكوكيز الذي لا يمكن إثارته بلا جلسة Auth (ممنوعة في CP-A) — يُزال المسبار عند بناء Auth الحقيقي |
| D-54 | 2026-09-05 | **CP-B المعرفات**: كل الجداول `uuid gen_random_uuid()` — والمرجعية فقط بمفاتيح طبيعية: `permissions (module, action)` و`homepage_sections (section_key)` و`payment_settings.provider unique` | uuid موحد بلا اعتماد على معرفات المقاييس؛ المرجعية قوائم إغلاق تُنشأ داخل الميجرشن ويُقصد مرجعيتها في RLS/API فمفاتيحها نصية معبرة |
| D-55 | 2026-09-05 | **Singleton tables** لتلك التي بصف واحد حتمي: hero/إحصائية-الرئيسية-الإطار؟ (homepage_upcoming/featured/testimonials/why_us/cta) والإعدادات الخمس (site/contact/footer/seo) — `id int PK default 1 CHECK (id=1)`، بينما قوائم العناصر (statistics/why_us_items/…) جداول عناصر بـ `sort_order` | صف واحد مضمون بدون منطق upsert متكرر؛ الفصل بين «الإطار الثابت» و«جداول العناصر» يجعل إعادة ترتيب/تمكين العناصر مستقلة تمامًا |
| D-56 | 2026-09-05 | **فصل حالة الدورة**: `publish_status (draft/published)` لحرية النشر، و`operational_status` منفصلة nullable (coming-soon/registration-open/full/completed) — ودورة علاقة الجلسات `session_status` مع `registered_count <= capacity` constraint | النشر قرار تحريري مستقل عن حالة التشغيل؛ لا enum مركب واحد يخلط المفهومين — والقتل الذاتي للدورة (عرض عام) يقرره الجسر بقواعد العرض (لا DB) كما في CP7 |
| D-57 | 2026-09-05 | **الصفحات القانونية Tables**: no enum للـ политической — `legal_pages` بـ uuid + `slug` text unique (نفس نموذج المدونة) | صفحات CMS قابلة للإضافة من اللوحة (نعم، المالك يضيف صفحات) — enum كان سيكسر ذلك |
| D-58 | 2026-09-05 | **registered_count مؤقت + profiles بلا FK/auth**: `course_sessions.registered_count` حتى جدول registrations مستقبلًا (Preview plan)، و`profiles` بلا FK إلى auth.users حتى CP-C auth | مبدأ D-51 للقابلية الكلية: الميجرشن يعمل على قاعدة بلا مخطط auth (لأي Dev env نظيفة) — auth.users FK يُضاف في CP-C عند وجود جدول auth فعليًا |
| D-59 | 2026-09-05 | **RLS مفعّل على كل الجداول (41/41) بلا Policies** في CP-B — الوصول عبر anon/service مقفول بالكامل حتى CP-C (جداول مسودة) | Scope CP-B = Schema فقط، لكن فتح الجداول بلا أمان فتح الحماية ثم نسيانها؛ Manager (اتصال الترحيل) يتجاوز RLS كمالك للإجراءات/الاختبار |
| D-60 | 2026-09-05 | **مركز صلاحيات CP-C داخل `private`**: `private.has_permission(module, action)` دالة `STABLE SECURITY DEFINER` بـ `search_path=''`، لا تقبل user_id وتشتق الهوية حصريًا من `auth.uid() → active profile → role_permissions`. معها `is_owner()` و`can_assign_role()`؛ التنفيذ الممنوح للمصادق عليهم يقتصر على هذه helpers الثلاثة، ودوال التريغر غير قابلة للاستدعاء من العملاء | منع recursion بين Policies مع إبقاء قرار التفويض مركزيًا وغير قابل لتزوير هوية الهدف؛ `private` غير مكشوفة للـ Data API العام |
| D-61 | 2026-09-05 | **نموذج RLS/Grants**: 180 Policy command-specific على 41 جدولًا؛ العام يقرأ المنشور/الظاهر فقط (حالة تشغيل الدورة لا تدخل حد الأمان)، ولا يرى profiles/roles/permissions/payment/corporate. الكتابة العامة الوحيدة `corporate_requests INSERT` بشرط `new + assigned_to null + archived_at null`. الإدارة تتبع 15 module: view/create/edit/delete، مع manage حيث النموذج يقتضيه، و`permissions` كتالوج read-only | دفاع مزدوج: RLS + least-privilege grants، بدل الاتكال على طبقة التطبيق؛ rate limiting لطلب الشركات مؤجل صراحة |
| D-62 | 2026-09-05 | **حواجز DB غير القابلة للتجاوز من UI**: publish transition يحتاج `module.publish` في الاتجاهين؛ أي صلاحية أعلى تطبّع `view` تلقائيًا ولا يمكن حذف view مع بقاء فعل أعلى؛ owner matrix ثابتة؛ system-role key/kind ثابتان ولا تحذف system roles؛ آخر active owner لا يحذف/يوقف/يغيّر دوره؛ المستخدم لا يغيّر role/status لنفسه، وتعيين الأدوار/مصفوفاتها مقيد بصلاحيات المانح | قواعد نزاهة وتفويض يجب أن تصمد أمام REST/SDK/SQL العميل لا واجهة الإدارة فقط |
| D-63 | 2026-09-05 | **قرار profiles/author العام**: لا `USING(true)` ولا Public SELECT على `profiles`، ولم تُنشأ View في CP-C (Views=0). اسم الكاتب العام يُؤجل إلى projection محدود عند بدء Public DB reads؛ Auth/FK إلى auth.users يبقى مؤجلًا لأن Auth خارج CP-C | عدم كشف role_id/status/بيانات الإدارة، وعدم بناء projection غير مستهلك قبل طبقة القراءة العامة |
| D-64 | 2026-09-05 | **هوية المشروع البعيد بالـ project ref لا بالاسم**: المشروع الصحيح `bmtraining` داخل منظمة `baytalmosawer traning` هو المطابق لـ `.env.local`؛ يوجد مشروع آخر باسم قريب في منظمة أخرى لكنه لا يحوي CP-B | منع تطبيق migrations على مشروع متشابه بالاسم؛ المرجع العام في URL هو مصدر المطابقة التشغيلي |
| D-65 | 2026-09-05 | **معرّفات CP-D حتمية**: UUID لكل كيان Seed مشتقة من `SHA-256("bayt-almosawer:" + logical-key)` مع ضبط bits إلى RFC 4122 version 5/variant؛ المرجعيات الطبيعية (`permissions` و`homepage_sections`) تبقى بمفاتيحها المركبة/الطبيعية | نفس الكيان والعلاقات يحصلون على الهوية نفسها في كل قاعدة وكل إعادة تشغيل، بلا `gen_random_uuid()` في بيانات Seed الأساسية |
| D-66 | 2026-09-05 | **Upsert بلا أثر عند عدم التغيير**: `INSERT ... ON CONFLICT` يحدّث أعمدة العمل فقط ومع شرط tuple `IS DISTINCT FROM`، ولا يحدّث `created_at/updated_at` في إعادة تشغيل مطابقة؛ لا حذف شامل ولا تعطيل قيود | تريغر `set_updated_at` كان سيغيّر البصمة عند كل `DO UPDATE` حتى لو القيم نفسها؛ الشرط يجعل التشغيل الثاني no-op ويحمي البيانات التشغيلية المستقبلية |
| D-67 | 2026-09-05 | **الجداول المؤجلة في Seed**: `profiles` فارغة حتى Auth/إنشاء owner الحقيقي؛ جداول corporate requests الثلاثة فارغة لأنها Mock تشغيلية تجريبية؛ `media` فارغة لأن جدولها يشير إلى Supabase bucket ولم يبدأ Storage؛ مؤلفو المدونة `author_id=null` حتى projection/Auth | لا fake auth UUID، لا بيانات عملاء تجريبية في Production، ولا metadata تشير إلى Storage objects غير موجودة |
| D-68 | 2026-09-06 | **Course schema parity**: `outcomes` و`audience` و`requirements` داخل `courses` كـ `text[] NOT NULL DEFAULT '{}'`؛ `readMinutes` يبقى مشتقًا | الأنواع والمحرر والجسر العام تثبت أنها قوائم نصية بسيطة بلا هوية مستقلة تستدعي جداول فرعية |
| D-69 | 2026-09-06 | **Storage واحد عام للصور** باسم `bm-media` مع مجلدات منطقية ثابتة، مسارات `{folder}/{uuid}.{extension}`، MIME محصور JPEG/PNG/WebP/AVIF وحد 10MiB على العميل والـ bucket | قراءة الصور عامة مع منع التصادم وعدم كشف اسم الملف الخام في المسار؛ الكتابة محكومة بـ RLS وصلاحيات media |
| D-70 | 2026-09-06 | **`public.media` metadata فقط ولا يخزن public URL**؛ الرابط يُشتق بـ `getPublicUrl`. الرفع object ثم metadata مع تنظيف object عند فشل metadata؛ الاستبدال يرفع الجديد أولًا؛ الحذف يفحص المراجع ثم object فـ metadata مع نتيجة صريحة لأي فشل تعويض | منع روابط مشتقة متقادمة، وتقليل orphan/broken references في العمليات متعددة الأنظمة التي لا يمكن جعلها transaction واحدة |
| D-71 | 2026-09-06 | **Media Seed Option A**: رفع الأصول الـ14 المطابقة لـ Mock فعلًا وزرع 14 صفًا حتميًا؛ الاسم/alt/caption/time من Mock والحجم والأبعاد من الملف الحقيقي. تبقى `public/images` والجسر العام كما هما حتى CP-G | لا fake metadata ولا اختلاف عن bytes الفعلية، مع عدم تحويل التطبيق إلى DB قبل checkpoint القراءة العامة |
| D-72 | 2026-09-06 | **ماسح orphan/reference صغير** يقارن `storage.objects` مع `public.media` عبر المجلدات الثمانية، ويفحص مراجع الجداول الحقيقية؛ صورة كتلة المدونة داخل `content.image` JSON وغلاف المقال في `cover_path` | اختبار API كشف أن افتراض أعمدة صور مسطحة للمدونة يخالف CP-B؛ التصحيح اتبع schema الفعلي قبل إغلاق CP-E |

## 3) خريطة المشروع (مختصرة)

```
src/
├── app/                      # المسارات (Phase 1 مجمدة)
│   ├── layout.tsx            # RTL + fonts + Navbar/Footer/Toaster (سيُلمس فقط لـ ChromeGate — D-01)
│   ├── page.tsx + about + courses(+[slug]) + paths(+[slug]) + blog(+[slug])
│   ├── contact + corporate-training + policies/[slug] + not-found
│   └── admin/                # ✅ Phase 2 مكتملة: layout + dashboard + courses(+editor/tabs) + trainers + paths
│                             #    + content/home + testimonials + blog(+blocks) + corporate-requests
│                             #    + media + legal + users(+new/[id]) + roles(+new/[id])
│                             #    + preview/{home,blog/[id]} + [...rest]/not-found + settings/{general,contact,footer,seo,payments}
├── components/
│   ├── layout/ (navbar, footer, chrome-gate)   ├── home/ (9 أقسام الرئيسية)
│   ├── courses/ (card, tabs, explorer) ├── forms/ (contact, corporate)
│   ├── shared/ (container, section-heading, page-header, reveal, placeholder-logo, social-icons)
│   ├── admin/ (shell+sidebar+topbar+breadcrumbs، ui/، courses/، trainers/، paths/، homepage/،
│   │           blog/، testimonials/، corporate-requests/، media/، legal/، settings/،
│   │           preview/، users/{users-list,user-editor}، roles/{roles-list,role-editor,permission-matrix,permission-preview})
│   ├── blog/ (blog-view, blog-post-view)  ├── paths/ (paths-view, path-details)
│   ├── courses/ (course-details — جسم الصفحة client)  ├── policies/ (policy-view)
│   └── ui/ (shadcn كاملة)
├── context/
│   ├── admin-store.tsx (Store الإدارة v6)   └── public-cms.tsx (جسر CP7 — قراءة فقط)
├── data/
│   ├── site.ts (siteConfig, navLinks, policyLinks, socialLinks)
│   ├── courses.ts (8 دورات + helpers) ├── paths.ts (2 مسار + getPathPricing)
│   ├── testimonials.ts (6) ├── content.ts (اعتمادات 3، شركاء 4، مقالات 6)
│   ├── categories.ts ├── images.ts (مرجع مركزي للصور)
│   ├── public-bridge.ts            # ⬅ CP7: اشتقاق العرض العام من AdminData + fallbacks
│   └── admin/                # ✅ types.ts + seed.ts (v6 + migrations v3→v6) + selectors.ts + permissions.ts (15 وحدة)
├── types/index.ts             # أنواع Phase 1 (Course, LearningPath, ...)
├── lib/format.ts              # تنسيق عربي ثابت (ممنوع Intl ar-SA)
├── hooks/ (use-mobile, use-toast)
└── app/globals.css            # Design System (مجمد)
```
```
supabase/                      # ⬅ CP-B: CLI مرتبط (config.toml project_id=bayt-almosawer)
└── migrations/                # CP-B: 20260905093844_cp_b_init_schema.sql (20 enum + 41 جدول + قيود + فهارس + triggers + RLS)
```

## 4) بيئة العمل
- **بيئتان**:
  - **الأصلية (بناء CP1–CP6)**: Linux + bun، المسار `/home/z/my-project`، خادم المعاينة standalone عبر node، dev.log/server.log.
  - **نسخة التحقق (CP6-VERIFY، 2026-09-02)**: Windows + bun 1.4.0 (مثبت عبر `npm i -g bun`) + node 24 — التثبيت بـ `bun install --frozen-lockfile` من bun.lock (818 حزمة)، **لا node_modules ولا .next كانت موجودة مسبقًا في النسخة**.
- الأوامر على نسخة Windows: `bun run lint` → **`bunx tsc --noEmit`** (npx يلتقط حزمة tsc الخادعة!) → `bunx next build` ثم التغليف يدويًا (انظر المزالق) — سكربت `build` الكامل يفشل عند cp.
- عند تعارض build مع الخادم الحي: إيقاف node ثم build ثم نسخ static/public ثم إعادة التشغيل — مسموح ومتوقع.
- فحص المتصفح: Playwright عالمي (عبر NODE_PATH إلى حزمة omniroute) + Chromium المخزن — سكربتات التحقق في Temp خارج المشروع (لا تُضاف للمستودع).
- **`next.config` يضبط `typescript.ignoreBuildErrors: true`** — بوابة `tsc --noEmit` الصريحة إلزامية.
- **`src/lib/db.ts` (بقايا قالب Prisma غير مستوردة من أي ملف)**: يلزم `bunx prisma generate` بعد أي تثبيت نظيف وإلا فشلت بوابة tsc بخطأ PrismaClient — ليس من كود التطبيق.

## 5) مزالق معروفة (لا تتكرر)
- `Intl` مع `ar-SA` يولّد تقويمًا هجريًا + hydration mismatch → **استخدم `src/lib/format.ts` دائمًا**.
- قاعدة `react-hooks/set-state-in-effect` (Next 16): لا setState متزامن داخل effects — مؤقت مؤجل أو نمط ضبط الحالة أثناء الرسم (D-12).
- `pathname.startsWith("/")` يطابق كل المسارات — الروابط الخارجية لا تُحسب نشطة في الـ Sidebar.
- زر إغلاق Sheet الافتراضي `right-4` فيزيائي — في RTL يتراكب مع محتوى البداية؛ التجاوز: `[&>button]:right-auto [&>button]:left-4`.
- Radix Dialog/Sheet بلا وصف يطلق تحذير console — أضف `DialogDescription`/`SheetDescription` (حتى sr-only).
- `backdrop-blur` يكسر `position: fixed` للأبناء (درس قائمة الموبايل في Phase 1).
- بعد استبدال صور `public/`: امسح `.next/dev/cache/images`.
- الأرقام/الهواتف داخل نص RTL → `.num-ltr`.
- الصور المولدة AI مخزنة أيضًا في `scripts/gen/*.png` مع manifests في `scripts/img-json/`.
- **`next.config` يضبط `typescript.ignoreBuildErrors: true`** — "نجاح build" وحده لا يكفي؛ بوابة `npx tsc --noEmit` الصريحة إلزامية (أمسكت خطأ scope لم يمسسه الـ build).
- agent-browser: `fill` بقيمة فارغة لا يحدّث React state — استخدم focus + Backspace بلوحة المفاتيح.
- عملية next-server **تعيد تسمية نفسها في ps** إلى «next-server (v1)» — `pkill -f "standalone/server.js"` لا تلتقطها فتبقى متمسكة بالمنفذ 3000 تخدم HTML قديمًا من ذاكرتها يشير إلى chunks حذفها الـ rebuild (ChunkLoadError كاذب). الإيقاف الصحيح: `pkill -f next-server` + `fuser -k 3000/tcp`، ثم تشغيل نظيف.
- Radix لا يستجيب لـ `el.click()` من eval — يحتاج أحداث pointer موثوقة (`find role ... click` أو refs). (الاستثناء: Switch يستجيب لـ click عادي — لكن مرجعًا قديمًا بعد re-render قد ينقر عنصرًا آخر؛ أعد snapshot بعد أي Toast/قائمة تتلاشى)
- **الشريط اللاصق يبتلع النقر على عناصر أسفل الصفحة حتى بعد scrollintoview** (Switch تقييم ظل false رغم "Done") — الحل: `scroll down` إضافي بعد scrollintoview قبل النقر على أي عنصر قرب الأسفل
- **إغلاق المتصفح (`agent-browser close`) يطلق profile جديدًا في الاستدعاء التالي** — يفقد localStorage؛ أي اختبار Persistence يجب أن يبقى داخل نفس الجلسة المفتوحة
- **الخادم الخلفي يموت عند انتهاء استدعاء Bash** حتى مع setsid+nohup+disown — النمط الذي ثبت في هذه البيئة: تغليف التشغيل بـ subshell خلفي `(env NODE_ENV=production PORT=3000 node .next/standalone/server.js > server.log 2>&1 &)` — يبقى حيًا عبر الاستدعاءات
- بعد rebuild قد يبقى الباندل القديم في ذاكرة المتصفح (أخطاء كاذبة) — افتح بـ query bust أو أغلق المتصفح كليًا ثم قياسًا نظيفًا.
- الـ Sticky Save Bar يغطي ما تحت أسفل الشاشة مؤقتًا — scrollintoview قبل النقر (سلوك متوقع لا علة).
- **bun 1.4.0 على Windows لا يدعم `cp -r` في سكربتات package.json** ("illegal option -- r") — التغليف: `bunx next build` ثم `Copy-Item -Recurse` لـ static وpublic إلى `.next/standalone`.
- **EBUSY عند البناء والخادم standalone حي** (rmdir .next/standalone) — أوقف node أولًا ثم ابنِ ثم أعد التشغيل (نظير Windows للمزلقة الموثقة).
- **ترتيب حساس**: نسخ static/public إلى standalone يجب أن يكون **بعد آخر `next build`** — أي بناء إضافي بعده يولّد أسماء chunks جديدة فيترك الخادم يخدم 404 لكل الأصول (أعراضه: لا hydration، CSS مفقود، ازدواج عناصر hidden md:* في الاختبارات).
- **خادم standalone يقرأ شجرة static عند الإقلاع** — إذا نسخت الأصول بعد تشغيله فقد لا تُخدم (404 رغم وجودها): أعد تشغيله بعد النسخ.
- Playwright: `npx tsc` على Windows يثبّت حزمة tsc الخادعة — استخدم `bunx tsc`؛ وبمحددات CSS استخدم `getByRole` للمطابقة الضمنية بدل `[role=…][aria-label=…]` مع `.first()` لأن `.first()` قد يلتقط التوأم المخفي (جدول desktop عند 360px يسبق بطاقات الموبايل في DOM).
- طلبات `_rsc=…` الملغاة (net::ERR_ERR_ABORTED) ضجيج سليم من prefetch التنقل العميل — لا تُحسب فشل طلبات.
- **Playwright `getByText(...).first()` قد يلتقط نسخة مخفية من النص** (درج موبايل النافبار يسبق DOM بعد أن أصبح CMS-aware) → دائمًا `.filter({ visible: true })` قبل waitFor.
- **صفحات الإعدادات: fill قبل اكتمال ترطيب المسودة (D-22) يُلغى** — انتظر قيمة الحقل === المحفوظ قبل التعديل، وزر الحفظ لا يتفعل إلا عند dirty (لا تنتظر تمكينه قبل التعديل).
- **زر `onClick={handler}` يمرر حدث النقر كأول وسيط** لأي handler اختياري الوسائط (handleSave(explicit?)) — دائمًا `() => handler()` (درس D-49).
- تحذيرات "preloaded using link preload but not used" من `next/image` (مقاسات مصغرة محملة مسبقًا) — ضجيج موارد بيئي بلا علاقة بـ React ولا يُحسب خطأ.
- زيارة أي مسار /admin تكتب الـ Admin Store الـ seed في localStorage (persist الترطيب) — سلوك إداري متوقع؛ اختبار عزل الموقع العام يحتاج سياقًا لم يزر الإدارة أبدًا.
- **proxy.ts في next@16.1.3 + Turbopack: يُجمَّع ولا يُسجَّل في middleware-manifest فلا يُستدعى** (مع src layout) — استخدم `middleware.ts` (D-52). وابحث في المخرجات عن `middleware.js` لا `proxy.js` — البناء يعيد التسمية داخليًا.
- **`.env.local` يجب أن يكون موجودًا وقت البناء**: متغيرات NEXT_PUBLIC_* تُضمَّن في الحزمة عند البناء — خادم standalone لا يحتاج ملفات env وقت التشغيل (لكن أعد البناء عند تغيير القيم).
- **Project URL يُقرأ حرفيًا من Settings → API** — لا يُشتق يدويًا من الـ ref في المفتاح (الاشتقاق اليدوي أخطأ بحرفين وتسبب فشل DNS).
- **`/auth/v1/health` يتطلب ترويسة `apikey`** (401 بدونها) — تمريرها عند فحص الاتصال يدويًا أو من الصفحة.
- كوكي الـ middleware يُقرأ في الصفحة من **طلب** التحميل الحالي بينما تحديث الاستجابة يظهر في التحميل التالي — اختبارات العرض تقارن قيمة الطلب لا الاستجابة (درس B2).
- **NOTICEs من psql عبر docker exec تصل عبر stderr** → PowerShell يغلفها كـ NativeCommandError (ضجيج فقط) — مقياس النجاح هو `TEST_EXIT=0` لا شكل المخرجات.
- **`now()` ثابتة طوال المعاملة** (transaction_timestamp) — اختبار «التريغر يجمّد updated_at» بمقارنة now() بعد update داخل نفس المعاملة يفشل كذبًا (المساواة لا الفضل). الاختبار الصحيح: تصفير الحقل `set updated_at = null` ثم التأكد أنه غيرُ فارغ (التريغر أعاده).
- **ترحيل Supabase CLI:** `bunx supabase` — الميجرشن يبدأ بـ `bunx supabase migration new cp_b_init_schema` (ينشئ الطابع الزمني) ثم يُملأ يدويًا؛ وعلى قاعدة نظيفة (بدون auth schema) يجب ألا يذكر أي جدول/نوع من مخطط auth (بروتوكول D-54..D-58).

## 6) ملفات مجمدة (لا تُعدل إلا لسبب ضروري موثق)
- كل `src/app` العام + `src/components/{layout,home,courses,shared,forms}` + `src/data/*` الأساسية + `globals.css` + `src/types/index.ts`.
- الصور في `public/images` (مؤقتة لكن **ممنوع استبدالها الآن**).
- مسموح: تعديل `src/app/layout.tsx` لإضافة ChromeGate فقط (قرار D-01).

## 7) سجل الجلسات (Append-only)

### 2026-08-31 — جلسة 1 (توثيق ومزامنة)
- إنشاء ثلاثية المزامنة: `prd.md` + `design.md` + `memory.md` كملحق معتمد لـ GLM 5.3 Flash وأي وكيل.
- قراءة كاملة لأكواد وبيانات Phase 1 (types, data/*, layout, globals.css, format.ts) وتثبيت قرارات D-01..D-10 للمرحلة 2.
- **الخطوة التالية:** تنفيذ Phase 2 (Owner Dashboard + CMS Mock) وفق prd.md §4 — عند إشارة المالك.

### 2026-08-31 — جلسة 2 (Checkpoint 1: Foundation — مهام #1–#6) ✅
- **#1 ChromeGate**: `src/components/layout/chrome-gate.tsx` (client) يغلّف Navbar وFooter كـ children في root layout — يخفيهما على /admin* دون تحويل الـ Layout لـ client ولا تحريك ملفات Phase 1.
- **#2 Types**: `src/data/admin/types.ts` — أنواع مستقلة كاملة (Course/Session/Curriculum/Trainer/Path/Homepage/Testimonial/BlogPost/CorporateRequest/MediaItem/Settings/Payments/Users/Roles/Permission) — لا `any`، وإعادة استخدام CourseCategory/CourseLevel من @/types.
- **#3 Seed**: `src/data/admin/seed.ts` — مشتق برمجيًا من بيانات Phase 1: 10 دورات (شملت 2 إداريتين Mock: دورة شركات "اطلب عرض سعر" + دورة مسودة)، 3 مدربين، مساران، HomepageContent كامل، 6 تقييمات، 6 مقالات، 6 طلبات شركات تغطي كل الحالات، 14 وسيلة، إعدادات كاملة، 5 أدوار × 8 وحدات صلاحيات، 5 مستخدمين، 4 صفحات قانونية + `sanitizeForStorage` (منع حفظ blob URLs).
- **#4 Store**: `src/context/admin-store.tsx` — StateContext + ActionsContext منفصلان (~60 action) + `src/data/admin/selectors.ts` (getPathPricing، remaining seats، dashboard stats...).
- **#5 Primitives**: field, status-badge, confirm-dialog, image-upload (Mock), repeater (↑↓), stat-card, empty-state, admin-page-header, admin-toolbar في `src/components/admin/ui/`.
- **#6 Shell**: `src/app/admin/layout.tsx` (noindex) + admin-shell + sidebar (3 أوضاع: 256px lg / 72px rail md / Sheet drawer) + topbar (بحث + إشعارات + بروفايل placeholders) + breadcrumbs تترجم معرفات الكيانات + nav-config + صفحة /admin placeholder مؤقتة.
- **التحقق**: lint PASS / tsc PASS / build PASS (31 صفحة) / متصفح 1440+1024+768+360: 0 overflow، 0 console، 0 hydration، Drawer يعمل (نقر + Escape)، تركيز keyboard ظاهر، لا Navbar/Footer عام داخل admin، الموقع العام سليم (12 مسارًا 200)، localStorage يعمل.
- **إصلاحات أثناء التحقق**: كتابة admin/layout.tsx (سقطت في أول Write) + isActive للروابط الخارجية + موضع زر إغلاق Sheet في RTL + SheetDescription sr-only.
- **حالة مؤقتة معروفة**: روابط Sidebar الـ 12 الأخرى تقود لصفحات لم تُبنَ بعد (Checkpoints قادمة) — وصفحة /admin الحالية placeholder حتى المهمة #7.
- **الخطوة التالية:** #7 Dashboard Home — بعد موافقة المالك.

### 2026-08-31 — جلسة 3 (Checkpoint 2: Core CMS — مهام #7–#11) ✅
- **#7 Dashboard**: `/admin` حقيقي — 8 إحصائيات عبر `getDashboardStats` + أقسام (أقرب الدورات/آخر طلبات الشركات/آخر التسجيلات/الأكثر طلبًا) + Quick Actions (الروابط غير المبنية Disabled بتلميح) — لا أرقام Hardcoded.
- **#8 Courses List**: `/admin/courses` — جدول Desktop/كروت Mobile + بحث + فلترة نوع/حالة + 5 طرق ترتيب تعمل فعليًا على المخزن + Edit/Duplicate/Preview/Delete. Preview مفعّل فقط لـ slug موجود في بيانات Phase 1 (وإلا Disabled برسالة «ستربط في مرحلة التكامل»).
- **#9 Course Editor**: `new`/`[id]` بمكوّن واحد — 9 تبويبات (معلومات/صور/تسعير/مدة/مخرجات/فئة/متطلبات/محاور/مواعيد) بتمرير أفقي داخلي على الموبايل + Sticky Save Bar + مؤشر Dirty + beforeunload + تأكيد الإلغاء + Validation (اسم/slug فريد بنمط لاتيني/سعر ≥ 0/أيام ≥ 1) مع قفز لأول تبويب خاطئ + Toast (بلا alert). التسعير: isFree → 0، requestQuote → قفل حقول وملخص مباشر. **الحالة مصدر وحيد للنشر (لا Boolean مكرر)**.
- **#10 Curriculum Builder**: تبويب «المحاور» — أيام ← محاور (عنوان + وصف) بإضافات/حذف/ترتيب ↑↓، معرفات مستقرة `makeEditorId`، ترقيم مشتق من الموضع، حذف يوم به محاور → ConfirmDialog (إلغاء/تأكيد مُختبران)، حذف محور مباشر. دورة أساسيات التصوير ممثلة كاملة بأيامها الأربعة.
- **#11 Sessions Manager**: تبويب «المواعيد» — Dialog إضافة/تعديل (دفعة/تواريخ/أوقات/مكان/مدينة/مقاعد/مسجلون/سعر دفعة/حالة) + ترتيب زمني تلقائي (لا إعادة ترتيب يدوية — قرار موثق) + Remaining محسوب + منع registered > capacity + منع end < start + وقت النهاية بعد البداية بنفس اليوم + تكرار موعد + حذف مؤكد + Derived Status «ممتلئة تلقائيًا».
- **علتان مُكتشفتان بالإختبار وأُصلحتا**: (1) علاق spinner عند التنقل الداخلي للمحرر — إصلاح نمط التهيئة (D-19). (2) زر حذف القائمة تجاوز ConfirmDialog — إصلاح onRequestDelete (D-20).
- **إصلاحات إضافية**: Breadcrumb صفحة new → «دورة جديدة» (كان «تفاصيل الدورة»)، duplicateCourse بـ slug/اسم فريدين.
- **التحقق**: lint PASS / tsc PASS (بوابة صريحة) / build PASS (33 صفحة) + standalone مُحدَّث. متصفح: CRUD 24 خطوة كاملة نجحت (إنشاء→صورة Mock→تسعير→مدة→3 مخرجات→فئة→متطلب→يومان→محاور→ترتيب→موعد→حفظ→قائمة→إعادة فتح→تعديل→Refresh→localStorage v2 صامد بلا blob→Duplicate→Delete+تأكيد). 5 مقاسات 360/390/768/1024/1440: 0 overflow. Keyboard: أسهم التبويبات RTL + Tab order + labels + aria-invalid. جلسة نظيفة: 0 console / 0 errors. Public regression: 7 مسارات 200 + Navbar/Footer سليمان.
- **الخطوة التالية:** #12 Trainers — بعد موافقة المالك (ممنوع البدء قبلها).

### 2026-08-31 — جلسة 4 (استئناف: إعادة تحقق Checkpoint 2 + إصلاح تجميلي) ✅
- إعادة تشغيل البوابات الثلاث بعد استئناف الجلسة: lint PASS / tsc PASS / build PASS (33 صفحة) — الحالة خضراء مؤكدة.
- علة بيئية مكتشفة وموثقة: OOM قتل الخادم القديم + إعادة تسمية next-server تُبطل pkill بالنمط القديم (مزلقة جديدة أعلاه) — الصحيح pkill -f next-server + fuser -k 3000/tcp.
- إصلاح تجميلي واحد في sessions-tab: لا تُلحق المدينة بنص المكان إذا كانت مضمنة فيه («جدة — جدة» سابقًا) — عرض فقط، لا تغيير في بيانات المالك المعتمدة.
- تحقق متصفح بعد إعادة البناء: 0 أخطاء/overflow (1440+390)، المنهج 4 أيام/8 محاور، Remaining محسوب، حوار المواعيد (10 حقول) وRepeater إضافة/حذف net-zero يعملان، localStorage v2 نظيف بلا blob، Public regression 6 مسارات سليمة.
- **الخطوة التالية:** #12 Trainers — بعد موافقة المالك (ممنوع البدء قبلها).

### 2026-08-31 — جلسة 5 (Checkpoint 3: المدربون #12 + المسارات #13) ✅
- **#12 Trainers**: استكمال مسارات `/admin/trainers` الثلاثة (مكونا المدربين وأactions المخزن كانت جاهزة من جلسة منقطعة) — قائمة ببحث/فلترة حالة/4 ترتيبات، محرر كامل الحقول (Skills Repeater + روابط بصيغة URL + صورة Mock + Active/Hidden)، حماية حذف D-21، وTrainer Select في محرر الدورة يعزل المخفيين مع الحفاظ على «الحالي».
- **#13 Learning Paths**: كاملة — قائمة بأعمدة التسعير المشتق (أصلي مشطوب/خصم/نهائي) وفلاتر حالة/مستوى و6 ترتيبات؛ محرر بمنع تكرار الدورات + ↑↓ + خصم مقيد 0–100 + ملخص حي (إجمالي/قيمة خصم/نهائي/توفير) + تنبيهات الدورات المسودات وتحذير «منشور بلا دورات»؛ وPreview مشروط بوجود slug عام.
- **إثبات التسعير المشتق فعليًا**: تغيير سعر دورة مرتبطة (1,000→1,200) أعاد حساب مسارين/محرر المسار تلقائيًا (4,000−20%: 3,200→3,360) ثم استعادة السعر أرجعت 3,200 — دون أي تعديل على المسار نفسه (D-09 مطبق).
- **علة بيانات خطيرة مُكتشفة ومُصلحة (D-22)**: الفتح المباشر لرابط أي محرر كان يهيئ المسودة من الـ Seed قبل ترطيب localStorage — وأول حفظ يصفّر تعديلات المالك (أمْتُهكت بـ blind-save فعلي). أُصلح في المحررات الثلاثة (دورة/مدرب/مسار) بشرط `hydrated` في التهيئتين، وتحقق: التعديل المحفوظ يظهر بعد فتح مباشر + blind save لا يلغيه. التعديل شمل course-editor (ملف Checkpoint 2) لسبب تقني ضروري موثق.
- **بيئة**: الخادم الخلفي كان يموت بين استدعاءات Bash حتى مع setsid/disown — النمط المثبت: subshell خلفي `( … & )` (مزلقة موثقة أعلاه).
- **التحقق**: lint PASS / tsc PASS / build PASS (37 صفحة) + standalone محدث؛ 6 مسارات جديدة 200؛ CRUD المدربين 10 خطوات والمسارات 16 خطوة كاملة (تغيير خصم/إضافة/إزالة/ترتيب/منع تكرار/تغيير سعر دورة→إعادة حساب/تكرار/حذف نسخة/refresh)؛ 24 تركيبة responsive (360/390/768/1024) 0 overflow؛ 0 console على 19 مسارًا؛ 0 hydration؛ localStorage v3 نظيف بلا blob.
- **الخطوة التالية:** #14 Homepage CMS — ممنوع البدء قبل موافقة المالك على هذا الـ Checkpoint.

### 2026-08-31 — جلسة 6 (Checkpoint 4: الرئيسية #14 + التقييمات والمدونة #15) ✅
- **#14 Homepage CMS**: `/admin/content/home` — محرر بـ 11 تبويبًا (مدير الأقسام: Enabled + اسم معروض + ↑↓ + زر «تعديل» يقفز لتبويب القسم، ثم Hero/الإحصائيات/الدورة القادمة/الفئات/المميزة/لماذا نحن/الاعتمادات/الشركاء/إعدادات التقييمات/CTA) بنمط المسودة/اللقطة/Dirty/beforeunload/تأكيد إلغاء + حفظ شامل واحد (D-25). أيقونات لماذا نحن = مفاتيح معروفة فقط (12 مفتاح lucide) — لا SVG من المستخدم. الفئات الأربع نصوصها وصورها قابلة للتحرير دون مساس بالـ enum.
- **معاينة الرئيسية** `/admin/preview/home`: تعكس الترتيب وEnabled/Disabled والتقييمات المخفية (Business 2/3/4) وتحذير الاختيار اليدوي غير الصالح — بنفس لغة التصميم (Container/SectionHeading/tokens) داخل إطار إداري مع تنويه أن الموقع العام لا يرتبط بالمخزن.
- **#15 Testimonials**: قائمة (بحث + فلاتر مصدر/تقييم/مميز/ظاهر تعمل فعليًا) + محرر كامل (rating 1–5، مصدر Google/يدوي، رابط مصدر بتحقق URL، مميز/ظاهر) + Duplicate (غير مميز ومخفي) + حذف مؤكد. الفلاتر مُختبرة (مميز فقط = 3/6 على البذرة).
- **#15 Blog**: قائمة (بحث + فلاتر حالة/فئة/كاتب + ترتيب newest/oldest/title + غلاف وupdated date) + محرر بكتل منظمة من خمسة أنواع (إضافة/حذف مؤكد/ترتيب ↑↓، قائمة بعناصر فرعية، صورة Mock) + Tags بمنع التكرار + Slug لاتيني فريد + SEO + readMinutes مشتق (D-28) + `/admin/preview/blog/[id]` دائمًا (D-27) بعرض كل الكتل وشارة المسودة.
- **Store v4 + Migration (D-23)**: ADMIN_CMS_VERSION=4 مع `migrateAdminData` v3→v4 (الأقسام الجديدة افتراضيات آمنة + الحفاظ على تعديلات المالك + النص القديم → كتل فقرات) — استُدعيت من ترطيب المخزن عند اختلاف النسخة. `updateHomepage` شامل استبدل الـ actions التفصيلية غير المستخدمة + `duplicateTestimonial`/`duplicatePost` + توسيع `sanitizeForStorage` (صور الفئات/خلفية CTA/شعارات الجهات/صور كتل المقالات).
- **علتان مكتشفتان بالاختبار**: (1) **Duplicate المقال بلا slug فريد** — سطر `slug: uniquePostSlug(...)` سقط في إصلاح TS أثناء التطوير؛ أُعيد وأُتحق: النسخة «cms-testing-guide-copy» مسودة. (2) تحذير «الموعد لم يعد متاحًا» لم يظهر أول مرة لأن تعديل حالة الجلسة يبقى في مسودة محرر الدورة حتى «حفظ الدورة» (تصميم CP2 وليس علة) — أعيد الاختبار صحيحًا ثم أُرجعت حالة الجلسة.
- **التحقق**: lint PASS / tsc PASS / build PASS (43 صفحة prerendered + standalone)؛ **Homepage 16/16** (عنوان Hero/CTA/تعطيل قسم/ترتيب أقسام/إضافة+ترتيب إحصائية/يدوي دورة+موعد/اعتماد+شريك/CTA/حفظ/Refresh/Persistence/معاينة الترتيب والظهور)؛ **Testimonials 10/10**؛ **Blog 14/14** (رفع غلاف فعلي بمتراس upload + 4 كتل + ترتيب + تاغز بمنع تكرار + SEO + نشر + تكرار/حذف + معاينة)؛ Responsive **35 تركيبة (7 مسارات × 360/390/768/1024/1440) 0 overflow**؛ Regression **17 مسارًا 200 و0 console** (5 admin + 4 public + الجديدة)؛ **العزل مُتحقق**: `/` تعرض عنوان الـ Seed الأصلي وقسم الشركاء رغم تعطيله في المخزن؛ localStorage v4 بلا blob (غلاف المقال blob→"").
- **معروف قائم (غير من CP4)**: صفحات 404 لمسارات /admin غير المبنية (مثل /admin/users) تعرض هيكل الموقع العام — because not-found يُصيَّر خارج admin layout؛ يُعالج ضمن المهام القادمة أو عند بناء تلك الصفحات.
- **الخطوة التالية:** #16 Corporate Requests — ممنوع البدء قبل موافقة المالك على هذا الـ Checkpoint. المؤجلة: #17 Media Library، #18 Settings.

### 2026-09-01 — جلسة 7 (Checkpoint 5: طلبات الشركات #16 + الوسائط #17 + الإعدادات والقانون #18 + إصلاح Admin 404) ✅
- **#16 Corporate Requests**: قائمة ببحث (شركة/تواصل/جوال/بريد) + فلاتر (النطاق النشط-الأرشيف/الحالة/الدورة) + 4 ترتيبات + جدول/بطاقات؛ التفاصيل بأقسامها الثلاثة (بيانات الشركة/التدريب المطلوب/بيانات النظام) + إدارة الحالة (كل تغيير يضيف Timeline تلقائيًا — D-31) + ملاحظات داخلية (إضافة/حذف بتأكيد، لا تظهر للعميل) + إجراءات سريعة روابط فقط (tel:/mailto:/wa.me مولّد من الرقم) + **Archive بدل Delete** (D-30) بتأكيد، مع فلتر أرشيف واستعادة.
- **Dashboard Integration مُتحقق فعليًا**: أرشفة الطلب الوحيد «جديد» خفّض عداد «طلبات الشركات الجديدة» 1→0 وأخفى الشارة من Sidebar وأخرجه من «آخر طلبات الشركات» — كلها مشتقة من `getDashboardStats` (لا أرقام مكررة).
- **#17 Media Library**: نموذج v5 كامل (D-32) + رفع بالتحقق المسبق (أنواع الصور فقط + 10MB قبل أي معاينة) + Grid/List + بحث (الاسم/النص البديل) + فلترة المصدر + 4 ترتيبات + تحرير بيانات (الاسم وmimeType للعرض فقط) + نسخ رابط Mock بـ Clipboard مع fallback تحديد يدوي + **حماية الحذف بماسح المراجع (D-33)** يعرض «مستخدمة في N مواضع» **مع أسماء المواضع نفسها** (hero.jpg → 3 مواضع مُعددة بالتفصيل) قبل التأكيد.
- **#18 Settings**: قائمة تنقل (5 أقسام) + hook موحد `useSettingsDraft` (نمط المحررات D-22/D-25) لكل صفحة. العام (اسم/شعارات Mock/favicon/لغة/عملة/توقيت/مدينة/بلد)، التواصل (9 قنوات بمفاتيح + تطبيع هواتف `normalizePhone` + تحقق واتساب 9665XXXXXXXX + توليد wa.me تلقائيًا + معاينة حية للقنوات المفعلة)، الفوتر (نبذة + روابط سريعة ديناميكية Label/URL/Enabled/↑↓ + روابط قانونية **مربوطة** بالصفحات القانونية + سوشال + حقوق)، SEO (عنوان/وصف/صورتا مشاركة/مفتاح فهرسة + أكواد تحقق Google/Bing نصًا فقط)، المدفوعات (UI فقط D-35: 3 مزودين Test/Production، بلا حقول مفاتيح، رسالة Environment Variables).
- **#18 Legal**: قائمة الصفحات الأربع بحالة النشر والـ slug وعدد الفقرات + محرر (عنوان/slug لاتيني فريد بتحقق/محتوى textarea منظم بفقرات بسطر فارغ — بلا Rich Text/آخر تحديث/نشر) + **معاينة داخل نفس الصفحة** بعرض الفقرات كما في الموقع العام.
- **إصلاح Admin 404 (D-36)**: catch-all `/admin/[...rest]` + `admin/not-found.tsx` — تحقق فعلي: /admin/unknown-route و/nested يعرضان 404 إداري داخل AdminShell (بدون Navbar/Footer عام) بزر «العودة إلى لوحة التحكم»، و404 العام «الصفحة خارج الإطار!» سليم لم يتأثر.
- **علتان مكتشفتان بالاختبار وأُصلحتا (D-38)**: (1) انهيار صفحة المدفوعات عند أول تفعيل — `patchDraft` كان يدمج المصفوفة ككائن؛ (2) ختم «آخر تحديث» القانوني لا يُطبق بسبب قراءة مسودة قديمة من الإغلاق — الحل `handleSave(explicit)`. + توثيق `todayISO()` المحلي بدل UTC (D-37).
- **Store v5 + Migration (امتداد D-23)**: `migrateAdminData` يرحل v3→v5 وv4→v5: طوابع Timeline للطلبات القديمة، وسائط بنموذج جديد (تحويل sizeLabel→bytes)، enabled لروابط الفوتر، slugs قانونية — مع الحفاظ على تعديلات المالك (شُخّصت حفظ backgroundImage/description في ترحيل v4 الذي كان سيفقدها).
- **التحقق**: lint PASS / tsc PASS (0 أخطاء) / build PASS (**52 صفحة** + standalone) — بوابات صريحة ثلاث. متصفح: **Corporate 12/12** (بحث/فلتر جديد/فتح/تغيير New→Contacted/Timeline+المالك/ملاحظة+تحقق الفرقاء/Refresh/Persistence/أرشفة/فلتر أرشيف/استعادة/عداد الداشبورد)؛ **Media 14/14** (Grid/List/رفع صالح/معاينة/alt/حفظ/بحث/فلترة/ترتيب حجم واسم/Refresh/blob لا يُخزن ونوع وحد 10MB مرفوضان بحق/حذف بتحذير مواضع) — ملاحظة بيئية: Playwright يضبط file.size=0 فاختُبر حد 10MB بملف DataTransfer حقيقي 11MB داخل المتصفح؛ **Settings 16/16** (اسم عربي/واتساب بصيغتين/مفتاح معاينة/إنستغرام/عنوان/تطبيع هاتف/نبذة/إضافة+ترتيب رابط/SEO title/فهرسة/Moyasar+Tabby Test/Tamara معطّل/حفظ/Refresh/Persistence)؛ **Legal 7/7** (تعديل/حفظ/Refresh/تحقق/إلغاء نشر/حالة/استعادة كاملة)؛ **Responsive 50/50** (10 مسارات × 360/390/768/1024/1440 — 0 overflow)؛ **Regression 28/28** (17 إداري + 11 عام = 200 و0 console و0 overflow)؛ A11y (تركيز، تسميات aria، focus trap بالحوار، Escape)؛ RTL سليم؛ العزل: الموقع العام على بياناته المجمدة.
- **البيانات أعيدت للـ Seed النظيف** بعد الاختبارات (localStorage v5 — 14 وسائط، 6 طلبات بكل الحالات، 1 جديد للشارة).
- **الخطوة التالية:** #19 Users & Roles — ممنوع البدء قبل موافقة المالك على هذا الـ Checkpoint. المؤجلة: #20 Public Integration وكل ما بعدهما.

### 2026-09-02 — جلسة 8 (CP6-VERIFY: التحقق من #19 Users & Roles + مزامنة التوثيق) ✅
- **خلفية**: Audit شامل كشف أن CP6 بُني (6 صفحات + 6 مكونات + permissions.ts + Store v6 + migration v5→v6 — commit 3a4fb1a بتاريخ 2026-09-01) لكن بلا أي تحقق أو توثيق — هذه الجلسة أغلقت الفجوة دون أي Feature جديدة.
- **البيئة**: تثبيت نظيف على نسخة Windows عبر bun 1.4.0 + `bun install --frozen-lockfile` من bun.lock (818 حزمة — لا dependencies جديدة) + `bunx prisma generate` (لازمة لبوابة tsc بسبب بقايا قالب lib/db.ts) + خادم standalone على :3000.
- **إصلاحات إلزامية اكتشفها التحقق (كلها عُلل بناء/كود CP6 لم تُمتحن قبله)**:
  1. Lint: 3 أخطاء `no-assign-module-variable` في permissions.ts (متغير `module`) → إعادة تسمية `adminModule`.
  2. tsc: `RolePermissions` غير مستورد في seed.ts (TS2552) + نوع LegacyUser يجعل مقارنة "disabled" مستحيلة (TS2367 — تقاطع الأنواع طمس القيمة القديمة) → إصلاح الاستيراد وOmit الحالة من النوع القديم.
  3. **علة بيانات فعلية (D-44)**: `sanitizeForStorage` لم تكن تعقم `users[].avatar` — blob: ثبتت في localStorage (اكتشاف باختبار متصفح حي) → أُضيف التعقيم وأُعيد التحقق.
- **بوابات الجودة بعد الإصلاحات**: lint **PASS** (0) / `bunx tsc --noEmit` **PASS** (0) / `next build` **PASS** (exit 0 — **56 صفحة**، مسارات users/roles الستة في الشجرة) + standalone مغلّف.
- **تحقق المتصفح (Playwright، سكربتان خارج المشروع)**: **Script1 37/37** — Users (بحث/فلترة دور/فلترة حالة/ترتيب عربي مُطابق للـ collation/إنشاء بتحقق اسم+بريد صيغة+فريد/تعديل/تعليق-تفعيل/حذف بتأكيد/persistence) + حماية آخر مالك 3/3 (UI معطل + حوار تفسيري + Store guard موثق بالكود) + Roles (بحث/تكرار مخصص/تحقق اسم فريد/مصفوفة 15×أفعال بجدول desktop وبطاقات موبايل/تحديد-مسح الكل/قاعدة «عرض» الأساس تُقفل تلقائيًا/حذف نظامي محجوب/حذف مسند محجوب بعدد/المالك مقفول بالكامل) + **الاشتقاق (D-41 مُثبت فعليًا)**: تعديل مصفوفة الدور غيّر صلاحيات مستخدمه دون لمسه، والمستخدم يخزن roleId فقط + Role Preview (تبديل/تحذير صريح/عودة/غير مخزن) + إصلاح avatar مُتحقق.
- **Script2 18/18** — **Migration v5→v6 (النقطة الحرجة)**: حُمّلت حملة v5 مصنوعة (أدوار بمستويات نصية، مستخدمون بلا طوابع + حالة disabled + بلا currentUserId) → الترحيل تلقائي إلى v6: بلا فقدان مستخدمين/أدوار/بيانات CP1–CP5، بلا duplication، disabled→suspended ظاهرًا في الواجهة، currentUserId ثبت على المالك، صفر blob — ومستقر عبر reload ثانٍ. + **Responsive 30/30** (6 مسارات × 360/390/768/1024/1440 — 0 overflow، المصفوفة على 360 بطاقات 15 وحدة بلا جدول، الأزرار ضمن الشاشة) + **A11y** (RTL على الستة، Labels مربوطة، 53 checkbox بـ aria-label، خطأ role=alert + aria-invalid، Space يبدّل checkbox، حوار: role/data-state/labelledby/focus-trap/Escape) + **Regression**: 10 مسارات إدارية CP1–CP5 + 5 عامة (200، 0 overflow، Navbar/Footer/RTL سليمة) + 404 إداري داخل الشل + **عزل الموقع العام مُتحقق** (لا يقرأ المخزن).
- **Console عبر كل الاختبارات: 0 errors / 0 warnings / 0 hydration** (طلبات rsc الملغاة ضجيج سليم مُرشَّح).
- **معلومة هيكلية مكتشفة (خارج نطاق CP6 — لقرار المالك لاحقًا، لم تُمسّ)**: `<main>` متداخل منذ CP1 (root layout يغلف الكل بـ main#main-content وAdminShell بدوره يرسم main#admin-main) — HTML landmarks غير صالح لكنه ليس regression من CP6. وكذلك نسخة Radix الحالية لا ترسم aria-modal على الحوارات (سلوك المكتبة؛ التحقق يعتمد role+focus-trap+labelledby).
- **مزامنة التوثيق**: هذه الجلسة + D-39..D-44 + تحديث الحالة والخريطة والبيئة والمزالق أعلاه.
- **الخطوة التالية:** **#20 Public Integration** — ممنوع البدء قبل موافقة المالك. Phase 3 لا تزال خارج النطاق.

### 2026-09-02 — جلسة 9 (CP7: #20 Public Integration — ربط الموقع العام بمخزن الإدارة) ✅
- **البنية (D-45)**: جسر بيانات عام — `src/data/public-bridge.ts` (اشتقاق نقي: دورات/مسارات/مدونة/رئيسية/إعدادات/قانوني بقواعد العرض D-46) + `src/context/public-cms.tsx` (Provider صغير في الـ root layout يغلف الجسم كاملًا — Navbar/Footer داخله) — **SSR ببيانات Phase 1 بايت-بايت → استبدال بعد الترطيب من localStorage قراءةً فقط (صفر كتابة عامة)** + حدث storage للمزامنة الفورية بين التبويبات (D-47 — يغلق Known Issue «multi-tab sync»).
- **صفحات الخادم رفيعة (D-48)**: metadata/staticParams محفوظة حرفيًا؛ الأجسام client جديدة: homepage (ترتيب/تفعيل/محتوى 9 أقسام)، course-details، paths-view، path-details، blog-view، blog-post-view (كتل المحتوى الخمسة بلا HTML خام)، policy-view، contact-details — + props اختيارية للأقسام التسعة وcourses-explorer وcorporate-form وnavbar وfooter (تعديلات موثقة على ملفات Phase 1 المجمدة بأمر CP7).
- **إصلاحان اكتشفهما التحقق**: (1) **D-49 علة إدارية حرجة** — زر الحفظ الموحد يمرر حدث النقر كـ explicit إلى handleSave → انهيار الحفظ في صفحات الإعدادات الخمس (لا كتابة + JSON دائري + undefined.trim) → عزل الحدث. (2) **D-50 علة ARIA كامنة من Phase 1** — 5 أقسام بمراجع aria-labelledby معلقة → `titleId` في SectionHeading.
- **البوابات**: lint PASS / `bunx tsc --noEmit` PASS (0) / build PASS (**56 صفحة** + standalone) — سيرفر أعيد بناؤه 3 مرات أثناء الجلسة (نمط Windows الموثق).
- **اختبار التكامل (Playwright — سياق واحد: تبويب إدارة + تبويب عام يتشاركان localStorage)**: **18/18 = 32 خطوة كاملة** — تعديل Hero/حفظ/انعكاس فوري بلا reload (علامة جلسة على window)، تعطيل قسم واختفاؤه، إعادة ترتيب ومطابقة ترتيب DOM للمخزن، إحصائية (4,700)، الدورة القادمة يدويًا بالاختيار الصحيح، مسودة↔نشر دورة (اختفاء/رجوع)، سعر دورة → صفحتها (1,200) + سعر مسارها المشتق (3,700→2,960)، محور منهج جديد → تفاصيل الدورة، اسم مدرب → تفاصيل الدورة، خصم مسار 25% → صفحة المسار (2,775)، إخفاء تقييم → يختفي، مسودة↔نشر مقال، تواصل/فوتر/قانوني → العام يعكسها (هاتف منسق + نبذة + فقرة + آخر تحديث)، refresh/persistence، **MT مزامنة التبويبات مُثبتة بعلامة الجلسة**، **FB fallbacks**: تالف → seed، بلا مخزن → seed، والعام لا يكتب التخزين أبدًا.
- **SCRIPT4 12/12**: **Responsive 55/55** (11 مسارًا × 360/390/768/1024/1440 — 0 overflow) + **A11y** (h1 واحدًا في 11 صفحة، skip link، alt لكل صور، **لا مراجع aria معلقة — إصلاح D-50 مُتحقق**، labels 1:1، Tab ينقل التركيز) + **Regression**: 12 مسارًا إداريًا (CP1–CP6) + 6 عامة (200، 0 overflow، Navbar/Footer/RTL) + 404 إداري داخل الشل + **عزل الموقع العام** (سياق نظيف: لا يقرأ ولا يكتب المخزن) + **Broken Links: 0** (27 رابطًا فريدًا كلها سليمة).
- **Console عبر كل السكربتات: 0 errors / 0 React warnings / 0 hydration** (ضجيج preload-hints من next/image بيئي فقط).
- **محددات معروفة (موثقة لقرار Phase 3)**: محتوى CMS يظهر بعد الترطيب (client-side) — الزائر العام يرى الثابت دائمًا؛ SSR الديناميكي وmetadata الديناميكية مؤجلان لقاعدة البيانات؛ الروابط المجهولة تعرض fallback «غير متاح» (ليست 404)؛ durationWeeks مشتق ⌈أيام/2⌉.
- **مزامنة الوثائق**: هذه الجلسة + D-45..D-50 + تحديث الحالة (Phase 2 COMPLETE) والخريطة والمزالق + prd.md (حالة Phase 2 → COMPLETE) + worklog.md (Task 10).
- **الخطوة التالية:** **Phase 3 (Backend حقيقي — Supabase/Auth/Payments)** — لا تبدأ إلا بموافقة المالك الصريحة. **Phase 2 مغلقة بالكامل.**

### 2026-09-02 — جلسة 10 (Phase 3 — CP-A: Supabase Connection + Env + Clients + SSR Compatibility) ✅
- **النطاق المنفذ حرفيًا**: عملاء Supabase الثلاثة + env + فحص توافق فعلي — **بلا** Schema/Tables/SQL/Migrations/RLS/Auth/Storage/Repositories/Payments/CP-B.
- **البيئة (D-51)**: `bun add @supabase/supabase-js@2.115.0 @supabase/ssr@0.12.6` (الحزمتان فقط) + `.env.local` بالقيم الحقيقية من المالك (URL + Publishable Key — محلي git-ignored، السر فارغ وغير مستخدم) + `.env.example` بالأسماء الثلاثة بلا قيم مع استثناء رفع `!.env.example` في .gitignore.
- **العملاء**: browser (createBrowserClient + Singleton كسول) / server (createServerClient + `await cookies()` متوافق Next 16 + setAll بصمت في RSC) / middleware (updateSession — getUser فقط، بلا حماية ولا توجيه).
- **علة اكتُشفت وحُسمت (D-52)**: `src/proxy.ts` (اصطلاح 16 الرسمي) يُجمَّع ويُكشف لكن **لا يُسجَّل في middleware-manifest فلا يُستدعى** في next@16.1.3 + Turbopack — حسم تجريبي بالمقارنة المباشرة → **`src/middleware.ts`** يعمل فورًا (MW_KEYS=/) — التوثيق يتضمن خطة إعادة التسمية عند الترقية.
- **مسار الفحص (D-53)** `/admin/dev/supabase-check`: OK/FAIL فقط (بيئة/اتصال/عميل خادم/كوكيز SSR + عميل متصفح بعد الترطيب) — بلا أي قيم — مع كوكي مسبار `cpa-probe` يثبت الكتابة/التحديث عبر نفس آلية @supabase/ssr.
- **البوابات**: lint PASS / bunx tsc --noEmit PASS / build PASS (56 صفحة + standalone) — إصلاحان أثناء الجولة: ترويسة apikey لفحص health (401→200) + نقل proxy إلى src/ ثم إلى middleware.ts (D-52).
- **بوابة التوافق الحرجة (§9) — PASS مثبت فعليًا**: Playwright 10/10 + Console نظيف: عميل الخادم مع cookies async يعمل، **قراءة كوكيز** (getAll في RSC)، **كتابة** (Set-Cookie من الـ middleware ظهر ووصل المتصفح)، **تحديث** (المسبار يتزايد before→after عبر الطلبات)، **session refresh** (getUser عبر كل طلب بلا أخطاء — 3 طلبيات متتالية 200)، عميل المتصفح (جولة ناجحة بعد الترطيب)، الاتصال بالمشروع (health بالمفتاح = 200).
- **العزل**: جسر localStorage للعام (CP7) اختُبر بجانب الـ middleware ويعمل (تعديل Hero انعكس على الرئيسية) + رجعية 8 مسارات (200/0 console/0 overflow) + الاستجابة 3 مقاسات للفحص = 0 overflow.
- **أمان الأسرار**: مسح كامل (source + .next كاملًا + chunks) — **صفر** SUPABASE_SECRET/service_role؛ السر فارغ وغير مستخدم؛ `.env.local` مؤكد git-ignored؛ لا طباعة مفاتيح في أي مخرج/تقرير.
- **مزامنة الوثائق**: هذه الجلسة + D-51..D-53 + 6 مزالق جديدة أعلاه + worklog.md (Task 11). prd.md وdesign.md لم يُمسّا (بلا تغيير متطلبات/قواعد تصميم).
- **الخطوة التالية:** **CP-B (Schema)** — لا تبدأ إلا بموافقة المالك الصريحة.

### 2026-09-05 — جلسة 11 (Phase 3 — CP-B: Schema — مكتوب ومُتحقق محليًا وبعيدًا) ✅
- **النطاق**: Schema فقط بلا RLS Policies/Auth/Seed/Storage — القرارات المعمارية D-54..D-59 (uuid مرجعي/مفاتيح طبيعية، Singleton id=1، فصل publish/operational، legal بلا enum، registered_count مؤقت + profiles بلا auth FK، RLS مفعّل 41/41)
- **الملفات**: `bunx supabase init` (config.toml project_id=bayt-almosawer) + `bunx supabase migration new cp_b_init_schema` → `supabase/migrations/20260905093844_cp_b_init_schema.sql` — 20 enum + 41 جدول (هوية/صلاحيات/مدربون/دورات+جلسات+منهج/مسارات/تقييمات/مدونة/طلبات شركات+ملاحظات+timeline/وسائط/الرئيسية Hybrid 11 جدول/إعدادات 7/قانوني) + 25 FK + finction set_updated_at + 36 trigger + 18 index (الضرورية فقط) + RLS enable
- **إعادة البناء محلية (Docker postgres:17-alpine)**: تطبيق الملف من جذر المشروع على قاعدة نظيفة — **exit 0 first try** مع `--single-transaction` و`ON_ERROR_STOP=1` (قابلية الترحيل مؤكدة)
- **اختبارات القيود المحلية** (معاملة+ROLLBACK+معاينة الفراغ التام): **15/15 PASS** — سعر سالب/خصم>100/مسجلون>سعة/تقييم 6/slug مكرر/مسار-دورة مكرر/صف ثانٍ في Singleton/FK-RESTRICT مدرب/كتلة غير-object/end<start/عدد=0 معطوب/صفوف صالحة تُقبل/CASCADE جلسات بعد فك رابط المسار/CASCADE روابط المسار/تريغر updated_at
- **تطبيق البعيد**: كلمة مرور القاعدة وُفّرت من المالك — `bunx supabase db push --db-url` نجح (exit 0، `Finished supabase db push` — الـ stack trace اللاحق ضجيج step الـ diff-probe لا غير). **عائقا بيئة**: (1) host `db.<ref>.supabase.co` **IPv6 فقط** بلا A record — حاوية Docker بلا مسار IPv6 → الحل: الصف الطويل عبر Node/CLI على المضيف (مؤكد بـ Test-NetConnection True وإلا «Network unreachable»)؛ (2) `supabase db query` لا يقبل DO blocks متعددة الأسطر (خطأ dollar-quote) → الحل: سكربت `pg` عبر bun بالـ NOTICEs
- **Introspection البعيد مطابق تمامًا للمحلي والتصميم**: ENUMS 20 / TABLES 41 / INDEXES 29 / FK 25 / CHECK 29 / UNIQUE 11 / TRIGGERS 36 / RLS 41 — بعد التطبيق مباشرة
- **اختبارات القيود البعيدة**: نسخة ذاتية التنظيف DO-block واحدة — **11/11 PASS** + `R_CLEANUP_OK total=0` (لا بقايا اختبار) + lint PASS + tsc PASS (لا تغيير src — بوابة كافية)
- **خطأان في سكربت الاختبار لا في الميجرشن** (مُصححان محليًا): CASE13 توقّع CASCADE بينما learning_path_courses→courses RESTRICT بالتصميم (يُفك الرابط أولًا)؛ CASE15 قارن now() داخل المعاملة (ثابتة — سُلوك PG صحيح) → استُبدل بتصفير الحقل
- **مزامنة الوثائق**: D-54..D-59 + جلسة 11 + الحالة + الخريطة (supabase/) + 3 مزالق (stderr/now()/مخاطر CLI)
- **الخطوة التالية**: **CP-C (Auth + RLS Policies + Seed + Storage)** — بموافقة المالك فقط

### 2026-09-05 — جلسة 12 (Phase 3 — CP-C: Security Foundation Only) ✅
- **النطاق المنفذ فقط**: Migration مستقلة `20260905131000_cp_c_security_rls.sql`؛ RLS Policies + permission helpers + publish enforcement + permission normalization + system/owner/profile guards + grants review. لا Auth UI/Login/Invites، لا حماية `/admin`، لا Seed/Storage/Repositories/Public DB reads/Admin DB writes/Payments/Edge Functions.
- **الدوال**: 7 دوال CP-C داخل `private`؛ 6 `SECURITY DEFINER` وواحدة `SECURITY INVOKER`. `has_permission(admin_module, permission_action)` = `STABLE` + `search_path=''` + لا user_id/dynamic SQL. التنفيذ المباشر للمصادق عليهم مقصور على helpers الثلاثة المقروءة: `has_permission/is_owner/can_assign_role`.
- **السياسات**: **180 Policy**. العام: 32 SELECT آمنة (published/visible/enabled وعلاقات الأب المنشور) + INSERT واحد لطلب الشركات النظيف؛ لا Public SELECT للجداول الحساسة أو profiles. الإدارة: command-specific وفق 15 module؛ كتالوج `permissions` بلا mutation؛ تعيين الدور ومنح الصلاحية يمنع تجاوز صلاحيات المانح.
- **DB enforcement**: 7 triggers — role-permission integrity/view normalization، system-role protection، last-owner/self-escalation protection، وpublish transitions للدورات/المسارات/المدونة/القانوني. مصفوفة owner لا تُخفض، system roles لا تُحذف، ومفاتيحها/نوعها لا يتغيران.
- **Grants**: deny-first ثم أقل صلاحية؛ anon = SELECT على 32 جدولًا + INSERT فقط على `corporate_requests`؛ authenticated = صلاحيات الجداول اللازمة تخضع لـ RLS. أُغلق EXECUTE عن `set_updated_at` ودوال الحماية، وعن bootstrap helper `public.rls_auto_enable()` بعد أن كشفه Advisor.
- **الاختبار المحلي النظيف**: CP-B ثم CP-C داخل PostgreSQL 17 نظيفة بـ ON_ERROR_STOP/transaction نجحا؛ اختبارات RLS المباشرة transaction-only ثم ROLLBACK غطت anon + owner/admin/content-editor/course-manager/finance/unauthorized، وكل السلبيات والإيجابيات وانتقالات النشر بالاتجاهين؛ **0 fixture rows**. إعادة الجولة بعد إصلاح Advisor تعذرت بسبب Docker Desktop engine، لكن الإضافة conditional فقط للمكوّن الاختياري `rls_auto_enable()`، واختبار CP-C الكامل السابق بقي PASS.
- **التطبيق البعيد**: المشروع المطابق للـ project ref (`bmtraining`) — تطبيق ذري ناجح وتسجيل `20260905131000 / cp_c_security_rls`. Introspection: **Policies 180 / functions 7 / SECURITY DEFINER 6 / triggers 7 / tables 41 / RLS 41 / views 0 / rows 0**؛ `rls_without_policy=0`، mutable search_path=0، anon sensitive SELECT grants=0، catalog mutation grants=0.
- **Security Advisor**: قبل إصلاح grants: تحذيران للدالة القديمة `public.rls_auto_enable()` (anon/authenticated EXECUTE). بعد revoke وإعادة تشغيل linter: **0 Errors / 0 Warnings / 0 Info**.
- **App gates/regression**: lint PASS؛ `bunx tsc --noEmit` PASS؛ Next production compilation PASS وولّد 56 صفحة. Wrapper `bun run build` أنهى exit 1 فقط عند خطوة `cp -r` على Bun/Windows؛ تغليف standalone نُفّذ بنجاح عبر GNU cp. المسارات `/`, `/courses`, `/admin`, `/admin/courses`, `/admin/users`, `/admin/dev/supabase-check` كلها 200.
- **Secret hygiene**: لا Secret/service_role/database password في كود التطبيق أو Migration/tests؛ المطابقات الوحيدة في المسح تعليقات تحذيرية. التطبيق البعيد تم عبر Dashboard بلا تمرير كلمة مرور قاعدة.
- **الانحرافات/المعروف**: لا author projection حتى Public DB reads؛ profiles ما زالت بلا auth.users FK؛ rate limiting للطلب العام مؤجل؛ Auth/Seed/Storage/DB repositories ما زالت خارج النطاق. يوجد مشروع متشابه الاسم في منظمة أخرى—يجب المطابقة بالـ ref لا الاسم. build wrapper على Windows يحتفظ بعلة `cp -r` البيئية أعلاه.
- **الحالة**: **CP-C COMPLETE + VERIFIED**.
- **الخطوة التالية**: **CP-D — Idempotent Database Seed**؛ لم يبدأ.

### 2026-09-05 — جلسة 13 (Phase 3 — CP-D: Idempotent Database Seed) ✅
- **النطاق**: إنشاء `supabase/seed.sql` فقط كـ Database Seed خارج migrations، مع مولد قابل لإعادة الإنتاج `scripts/generate-supabase-seed.ts`. إعداد `[db.seed]` الموجود في `supabase/config.toml` يشير أصلًا إلى `./seed.sql` ولم يحتج تعديلًا. لم يبدأ Storage/Auth/Public DB integration/Admin DB writes/Repositories/Payments execution/Edge Functions، ولم تُعدّل CP-B أو CP-C أو `design.md`.
- **الاستراتيجية**: UUID حتمية من namespace + logical keys (D-65)، وترتيب entities قبل relations، وUpsert على PK/Natural Key مع `IS DISTINCT FROM` (D-66). التشغيل المطابق لا يطلق updated-at triggers ولا يغيّر البصمة، ولا يوجد `DELETE ALL` أو تعطيل constraints.
- **عدادات Seed الدقيقة**: roles 5؛ permissions 53؛ role_permissions 143؛ trainers 3؛ courses 10؛ sessions 8؛ curriculum days/items 29/82؛ paths/path_courses 2/6؛ testimonials 6؛ blog posts/blocks/tags/post_tags 6/21/6/12؛ homepage sections/statistics/categories/why-items/accreditations/partners = 10/4/4/3/3/4، وستة singletons للمحتوى + upcoming/featured/testimonials settings، والعلاقات اليدوية featured/testimonials = 0/0 لأن النمط automatic؛ footer_links 14؛ site/contact/footer/seo settings = 1 لكل منها؛ payment_settings 3؛ legal_pages 4.
- **فارغ عمدًا**: profiles 0؛ corporate_requests/notes/timeline = 0/0/0؛ media 0. أول owner profile مؤجل إلى Auth؛ طلبات Mock الستة ليست Production Seed؛ وسائط Mock الأربع عشرة local/public وليست Supabase bucket objects؛ blog author_id = null حتى Auth/projection.
- **Mock→DB mapping**: حالات الدورات فُصلت إلى publish/operational حسب النموذج (9 منشورة بينها 7 registration-open، ومسودة واحدة)؛ curriculum يحتفظ خصوصًا بأساسيات التصوير 4 أيام/8 محاور؛ أسعار المسارات مشتقة من أسعار الدورات والخصم وليست مخزنة؛ Blog يستخدم الكتل الخمس المنظمة وبدون raw HTML؛ payment rows تحتوي enabled/environment/display فقط بلا أسرار.
- **الاختبار المحلي النظيف**: PostgreSQL 18 مؤقتة بـ trust محلي، ثم CP-B→CP-C→Seed→snapshot→Seed→snapshot. البصمتان SHA-256 متطابقتان تمامًا: `1abcff79ee655655975f7d9be47ab45be66291bdb34221e82e1aa0b50f25108a`؛ كل 41 جدولًا متطابق count+row checksum و0 duplicates.
- **قواعد العمل المحلية**: 0 أسعار سالبة، 0 خصم غير صالح، 0 جلسات غير صالحة، 0 slugs/path-course/order duplicates، 0 orphan FKs، 0 role-permission خارج catalog، 0 missing-view normalization؛ السعر المشتق متاح للمسارين؛ أساسيات التصوير = 4/8.
- **التطبيق البعيد**: نجاح ذري عبر SQL Editor على المشروع المؤكد `bmtraining`، project ref `rnzdleotnxznkqfrcwfa`. Introspection مستقل بعد التطبيق طابق كل العدادات المحلية؛ RLS بقي 41/41 وPolicies 180، وكل مخالفات قواعد العمل = 0.
- **RLS regression البعيد**: REST بالـ publishable client فقط: الدورات المرئية 9، المسودات 0، المقالات 6؛ roles وpayment_settings مرفوضتان 401. لا Auth UI مطلوب.
- **الجودة**: lint PASS؛ `bunx tsc --noEmit` PASS؛ Next production compilation PASS (56 صفحة). `bun run build` ما زال exit 1 فقط في wrapper `cp -r` غير المتوافق مع Bun/Windows بعد نجاح Next؛ التغليف نُفذ بـ PowerShell Copy-Item. Regression: `/`, `/courses`, `/admin`, `/admin/courses`, `/admin/users`, `/admin/dev/supabase-check` = 200.
- **Secret hygiene**: 0 database URLs/passwords/secret keys/service-role values في `seed.sql` والمولد؛ لم تُطبع أي قيمة مفتاح. Payment Seed بلا credentials.
- **الحالة**: **CP-D COMPLETE + VERIFIED**.
- **الخطوة التالية**: **CP-E — Storage**؛ لم يبدأ.

### 2026-09-06 — جلسة 14 (Phase 3 — CP-D.1: Course Schema Parity Fix) ✅
- **سبب الفجوة**: Course CMS والجسر العام يعتمدان `outcomes` و`audience` و`requirements`، بينما CP-B لم يضعها في جدول `courses` ولذلك لم يستطع CP-D زرعها. ثُبّت من `AdminCourse` والـ Seed والمحرر وصفحة التفاصيل والجسر العام أن الحقول الثلاثة قوائم نصية بسيطة `string[]`.
- **القرار المعماري D-68**: أضيفت الحقول داخل `courses` كـ `text[] NOT NULL DEFAULT '{}'`؛ لا جداول فرعية لأن الكود لا يثبت بنية أغنى أو هوية/علاقات مستقلة للعناصر. `readMinutes` لم يُضف وبقي Derived كما في D-28.
- **Migration**: `20260906090000_cp_d1_course_schema_parity.sql` additive فقط؛ لم تُعدّل CP-B أو CP-C ولم تتغير أي Policy أو Grant. طُبقت على المشروع المطابق بالـ ref `rnzdleotnxznkqfrcwfa` وسُجلت في `supabase_migrations` باسم `cp_d1_course_schema_parity`.
- **Seed parity**: حُدّث المولد و`supabase/seed.sql` لإدخال القوائم الثلاث عبر نفس UPSERT المشروط بـ `IS DISTINCT FROM`. المقارنة المباشرة Mock↔DB = **10/10 Courses، 100%، 0 فروق**. parity hash المحلي والبعيد متطابق: `0030ca58c3a36a30d5bf8a1fce8ad634`.
- **Idempotency**: إعادة الـ Seed محليًا أعطت canonical business snapshot نفسه مرتين: `6ed0d45de6181091722fad354f1777e762c667ebb6f632a9479490ad50a6fce9` مع 10 دورات. إعادة Course parity seed بعيدًا أبقت count=10 وcourse snapshot=`c6af96dd63ab8c93c38a9ae4e1f94a68` دون تغيير.
- **Security regression**: RLS **41/41** وPolicies **180** بلا تغيير. anon REST يرى 9 دورات منشورة مع القوائم الثلاث مكتملة، ويرى 0 من مسودة `night-photography-workshop`. admin التجريبي رأى 10 دورات ونجح UPDATE داخل transaction؛ ROLLBACK ترك 0 profiles اختبار.
- **Application regression**: lint PASS؛ TypeScript PASS؛ Next production compilation PASS (56 صفحة). wrapper `bun run build` بقي exit 1 فقط عند `cp -r` البيئية بعد نجاح Next، ونجح التغليف بـ PowerShell. `/`, `/courses`, `/courses/photography-fundamentals`, `/admin`, `/admin/courses` = 200.
- **النطاق المحفوظ**: لم يبدأ Storage أو Auth أو Public DB reads أو Admin DB writes، ولم يتحول التطبيق إلى DB.
- **الحالة**: **CP-D.1 COMPLETE + VERIFIED**.
- **الخطوة التالية**: **CP-E — Storage**؛ لم يبدأ.

### 2026-09-06 — جلسة 15 (Phase 3 — CP-E: Supabase Storage + Media Foundation) ✅
- **Migration/البنية**: أضيفت `20260906093000_cp_e_storage.sql` مستقلة دون تعديل CP-B/CP-C: bucket عام وحيد `bm-media` بحد 10MiB وJPEG/PNG/WebP/AVIF، default/constraint لعمود `media.bucket`، وأربع Policies على `storage.objects` (public SELECT وcreate/edit/delete عبر `private.has_permission`). `supabase/config.toml` يطابق العقد.
- **مساعد الوسائط**: `src/lib/supabase/media-storage.ts` يطبق تحقق العميل، UUID paths للمجلدات الثمانية، `getPublicUrl` المشتق، upload مع cleanup، replace new-first، delete مع reference scan، وorphan scan بالاتجاهين. أصلح الاختبار الفعلي خريطة المدونة إلى `blog_posts.cover_path` و`blog_content_blocks.content.image` بدل أعمدة مفترضة.
- **Seed Option A**: المولد و`supabase/seed.sql` يزرعان 14 صف media حتمية تقابل ملفات Mock الـ14 المرفوعة؛ metadata تستخدم bytes والأبعاد الفعلية (13 JPEG + PNG واحد)، بلا `public_url`. بقيت `public/images` والموقع والجسر العام بلا تغيير حتى CP-G؛ الأصول العامة الأربع غير الداخلة في Mock لم تُزرع.
- **Local clean**: PostgreSQL 18 مؤقت، CP-B→CP-C→CP-D.1→CP-E→Seed PASS. RLS العامة 41/41، Policies العامة 180، Storage Policies=4، media=14. Seed #1/#2 canonical SHA-256=`53F4DC58453A3CD0992B3EF0AFDBC21A1693C2DF2E888F180CCD99AEE817C722` في المرتين. anon SELECT فقط؛ content-editor create/update/delete؛ finance/suspended/cross-bucket مرفوضة؛ owner-like مسموح.
- **Remote**: تحقق URL/ref ثم تطبيق ناجح على `rnzdleotnxznkqfrcwfa` وتسجيل migration `20260906093000`. النتيجة: bucket=1، objects=14، media rows=14، metadata-without-object=0، object-without-metadata=0، RLS العامة 41/41، Policies العامة 180، Storage RLS=true وPolicies=4.
- **API/security**: session مصادق مؤقت بدور content-editor (حُذف profile وAuth user بعد الاختبار) رفع/حذف JPEG+PNG+WebP؛ AVIF config-only لعدم وجود fixture. العميل والـ bucket رفضا invalid MIME وoversize؛ wrong bucket وanon upload مرفوضان؛ public URL read ناجح. metadata failure نظف object، والماسح اكتشف كلا نوعي orphan ثم انتهى 0/0. finance/suspended=false وcontent-editor=true؛ owner role contract=true، واختبار owner-like الكامل مر محليًا.
- **Security Advisor/grants**: بعد Rerun = 0 Errors، تحذير واحد متوقع `Public Bucket Allows Listing` بسبب شرط المالك الصريح أن bucket عام وSELECT واسع داخل `bm-media`. ACL الافتراضي لـ Supabase Storage يمنح عمليات جدول واسعة للـ API roles، لكن RLS هو حاجز الصفوف الفعلي؛ الاختبار أثبت منع anon/finance/suspended/cross-bucket. لا secrets/service-role/database password في source/migrations/scripts/docs.
- **الجودة والتراجع**: lint PASS؛ `bunx tsc --noEmit` PASS؛ Next production compilation PASS (56 صفحة). wrapper `bun run build` بقي exit 1 فقط عند `cp -r` المعروفة على Bun/Windows بعد نجاح Next، والتغليف بـ PowerShell PASS. `/`, `/courses`, `/courses/photography-fundamentals`, `/admin`, `/admin/media`, `/admin/courses`, `/admin/dev/supabase-check` = 200.
- **Bugs/انحرافات**: أُصلح خطأ خريطة مراجع المدونة قبل الإغلاق؛ لا علة وظيفية متبقية في CP-E. الانحراف البيئي فقط PostgreSQL 18 بدل Docker والـ build wrapper المعروف. لم يبدأ Auth UI/Public DB reads/Admin DB writes/Payments/Edge Functions.
- **الحالة**: **CP-E COMPLETE + VERIFIED**.
- **الخطوة التالية**: **CP-F — Auth + Profiles + Admin Route Protection**؛ لم يبدأ.

## Session 17 — إعادة بناء CP-F + CP-G (المزامنة مع GitHub)

**السياق**: صندوق الرمل أعيد ضبطه ثلاث مرات؛ أُعيد بناء كل العمل من أصل GitHub (b8124a2) في أربع مراحل (milestones) مدفوعة كل واحدة فورًا إلى origin/main.

**D-77. تسلسل البناء بالدفع بعد كل مرحلة** — كل مرحلة تمر الفحوصات (tsc/eslint/tests) ثم commit ثم push ثم تحقق تطابق HEAD==origin/main. النتيجة: 5 commits (`06e65ee` M1 auth، `9249085` M2 data layer، `73d02b0` M3 actions، `28aee3c` M4 store+call-sites، + M5 docs/public). لم يُستخدم force push إطلاقًا، ولا secrets في أي commit (فحص بكل commit).

**D-78. بوابة التوكن قبل البناء** — المالك اشترط التحقق من GITHUB_TOKEN واختبار صلاحية push قبل أي بناء. فحص التوكن: `GET /repos/{owner}/{repo}` → `permissions.push == true` (أدق من محاولة push عمياء).

**D-79. مجموعة مسارات (dashboard)** — كل صفحات الإدارة انتقلت إلى `src/app/admin/(dashboard)/` مع layout يحمل الجلسة والبيانات؛ `admin/layout.tsx` أصبح metadata فقط؛ صفحة الدخول مستقلة خارج الهيكل. نقل بـ `git mv` حفاظًا على التاريخ.

**D-85. القاعدة مصدر وحيد (نهاية localStorage)** — AdminStoreProvider يستقبل `initialData` محمّلًا من الخادم (`loadAdminData` strict عبر عميل الخدمة + بريد المستخدمين من Admin API)؛ كل الإجراءات ~40 async عبر Server Actions تعيد `ActionResult` برسائل عربية؛ النجاح يحدّث الحالة محليًا من المدخلات/الاستجابة، وإجراءات يبنيها الخادم (تكرار/رفع/دعوة) تسحب `refreshData` من القاعدة. زر «تحديث البيانات» في قائمة الملف الشخصي.

**D-86. قراءات عامة بلا كوكيز** — `loadPublicView` يستخدم عميل anon منفصلًا بلا كوكيز: جلسة الإدارة لا يمكن أن تؤثر على القراءة العامة؛ الجداول المحمية (profiles/roles) تفشل للزائر فتعال فارغة (tolerate)؛ root layout يجلب `initialView` قبل أول رسم + `revalidate = 300` شبكة أمان ISR، وكل إجراء يستدعي `revalidatePath('/','layout')`.

**D-87. حالة الدورة عبر الحدود** — `mergeCourseStatus/splitCourseStatus` نقية ومختبرة: `draft` يغلب؛ `published` بلا حالة تشغيلية تُخزَّن `operational_status=null`؛ القيم غير المعروفة تُطبَّع إلى `coming-soon`.

**D-88. readMinutes مشتقة لا مخزنة** — تُحسب من كلمات كتل المقال (~180 كلمة/دقيقة، حد أدنى 1) — لا عمود في القاعدة.

**D-89. shortName تجميلي بلا عمود** — `CourseInput.shortName` يبقى في الحالة المحلية فقط ولا يُخزَّن (لا عمود) — موثق في النوع بتعليق صريح.

**D-90. إدراج anon بلا RETURNING** — سياسة RLS تمنح anon INSERT على corporate_requests فقط (لا SELECT): النموذج العام يعمل عبر PostgREST/Server Action، وأي `Prefer: return=representation` يفشل بـ GRANT — سلوك مقصود يحمي قوائم الطلبات.

**D-91. أمن الإجراءات** — كل Server Action: `requirePermission(module, action)` → تحقق مدخلات (slug/بريد/هاتف/حجم ملف) → كتابة عبر عميل الخدمة → `revalidatePath('/','layout')` → `ActionResult`. حمايات FK مسبقة برسائل عربية (مسار يستخدم دورة، مدرب مرتبط، دور مسند، آخر مالك، حذف النفس).

**D-92. الوسائط الحقيقية** — الرفع عبر Server Action: تحقق نوع/حجم → `bm-media/{folder}/{timestamp}-{rand}-{safeName}.{ext}` → سجل في `media`؛ فشل السجل يحذف الكائن اليتيم؛ الحذف يمسح الاثنين. النص البديل غير إلزامي عند الرفع (يُستكمل من المكتبة) — قرار اتساق مع نمط «بديل فارغ».

**D-93. 404 حقيقي للـslugs المجهولة** — صفحات تفاصيل courses/paths/blog تجلب عرض القاعدة (anon tolerate): slug غائب عن البيانات الثابتة **و**عن عرض القاعدة معًا = `notFound()`؛ وفشل الجلب = هيكل متسامح كما هو (D-86). كان 200 بواجهة «غير موجودة» (soft-404).

**D-94. SEO الإطلاق** — metadata ديناميكية من عرض القاعدة للـslugs غير الثابتة + canonical لكل الصفحات العامة + OG/Twitter default image + `src/app/sitemap.ts` (ثابت + قاعدة، revalidate 3600) + robots.txt يحجب /admin ويشير للخريطة.

**D-95. نموذج التواصل الحقيقي** — جدول `contact_messages` + RLS (anon INSERT فقط؛ قراءة/تحديث للإدارة عبر has_permission وحدة الطلبات) + `submitContactMessageAction` + حالات تحميل/نجاح/فشل عربية ومنع إرسال مكرر. يتطلب تطبيق المالك للـmigration — لا Module جديد للوحة (قرار نطاق).

**D-96. منح service_role لمخطط private** — المحفزات publish_enforcement على courses/paths/blog/legal ترفض كل UPDATE عبر عميل الخدمة (42501 «permission denied for schema private») لأن CP-C سحب USAGE/EXECUTE عن الجميع ما عدا authenticated. الـmigration يمنح service_role ما يلزم فقط؛ منطق الحماية كما هو (auth.uid()=NULL عبر الخدمة يتخطى فحص النشر تصميمًا، والبوابة الحقيقية requirePermission).

**D-97. رسائل أخطاء قاعدة سليمة** — toArabicDbError يقرأ message من الكائنات المجردة (PostgrestError) بدل [object Object] + نمط schema private يُترجم للعربية.

**D-98. تشغيل إنتاج آمن** — `scripts/start-prod.sh` يصدّر env من .env.local قبل standalone (standalone لا يقرأ .env.local وقت التشغيل — بدء مباشر = انهيار اللوحة).

**تحقق حي (بيئة إنتاج حقيقية)**: تسجيل دخول المالك ✓، /admin → 307 إلى الدخول مع next آمن ✓، الرئيسية/الدورات تعرض بيانات القاعدة في أول رسم ✓، anon يرى 9 منشورات و0 مسودات والخدمة ترى 1 مسودة ✓، إدراج طلب شركات مجهول ✓ (نُظّف فورًا)، الوسائط ✓، بناء 57 صفحة ✓، 29 اختبار وحدة ✓، tsc/eslint نظيفة ✓.
