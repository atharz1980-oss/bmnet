# بيت المصور — Bayt Almosawer

موقع مركز تدريب التصوير في جدة، مع لوحة محتوى وصلاحيات وCommunity V1، مبني على Next.js App Router وSupabase Auth/Postgres/Storage. عربي RTL. آخر تحديث توثيقي: 2026-09-12.

## وثائق المشروع

| الملف | الاستخدام |
|---|---|
| [PROJECT_REPORT.md](PROJECT_REPORT.md) | التقرير المفصل: الوظائف والأدلة والاختبارات والقيود والعمل المتبقي |
| [prd.md](prd.md) | متطلبات المنتج الحالي ونطاقه ومعايير القبول |
| [memory.md](memory.md) | الحالة التشغيلية والقرارات وسجل الجلسات الحديثة |
| [design.md](design.md) | مرجع التصميم والهوية العربية |
| [STABILITY_AUDIT.md](STABILITY_AUDIT.md) | إصلاحات الاستقرار وحدود تدقيق الأمان |
| [worklog.md](worklog.md) | تاريخ التنفيذ |
| [docs/history](docs/history) | وثائق مراحل سابقة؛ ليست تعليمات تشغيل حالية |

## التشغيل على Windows CMD

المتطلبات: Git، Node.js 22 أو أحدث، Bun 1.3 أو أحدث. النسخة المختبرة استخدمت Node 24.18.0 وBun 1.4.0.

~~~cmd
git clone https://github.com/atharz1980-oss/bmnet.git
cd bmnet
bun install --frozen-lockfile
if not exist .env.local copy .env.example .env.local
notepad .env.local
~~~

املأ القيم في .env.local بجوار package.json، ثم احفظه. لا ترسل الملف إلى Git:

| المتغير | الغرض |
|---|---|
| NEXT_PUBLIC_SUPABASE_URL | عنوان مشروع Supabase |
| NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY | المفتاح العام للتطبيق |
| SUPABASE_SECRET_KEY | عمليات الإدارة في الخادم فقط |

ضع المتغيرات قبل البناء لأن NEXT_PUBLIC_ تدخل حزمة المتصفح. ثم:

~~~cmd
bun run typecheck
bun run lint
bun run test
bun run build
bun run start
~~~

افتح http://127.0.0.1:3000. يحمّل start.mjs بيئة Next.js، ومنها .env.local. يكفي bun run start للتشغيل اللاحق بعد نجاح البناء. للتطوير استخدم bun run dev.

أوقف خادم المشروع بـCtrl+C قبل إعادة البناء؛ build.mjs ينظف .next ويغلف standalone مع public وstatic. لا حاجة إلى Bash أو نسخ يدوي أو Prisma. تنزيل الخطوط أثناء البناء قد يتطلب اتصالًا بالإنترنت.

**قاعدة Community مطبقة بالفعل على Production.** لا تشغل migrations أو seed أو اختبارات SQL الكتابية لتنزيل وتشغيل التطبيق. لا db reset أو drop أو truncate أو force migration أو migration repair دون طلب جديد صريح. أي runbook تاريخي لا يتقدم على هذا القيد. إذا أشارت البيئة إلى Production، فالتعديلات من التطبيق المحلي تكتب إلى قاعدة Production نفسها.

## المستخدمون والصلاحيات

جميع حسابات الدخول في Supabase Auth. الموظفون في public.profiles، بأدوار عبر roles وrole_permissions وحالة active. أعضاء المجتمع في community_profiles. إنشاء حساب Auth أو ملف مجتمع لا يمنحه صلاحية الإدارة.

افتح /admin/login بحساب موظف صالح. استخدم /admin/users لإدارة الموظفين بحسب صلاحيات الحساب. يوجد 16 module للصلاحيات، وخمسة أدوار نظامية: owner، admin، content-editor، course-manager، finance. لا كلمة مرور افتراضية موثقة أو حساب مالك مضمون لمجرد استنساخ Git.

الدعوات الإدارية مرتبطة ببريد Supabase وتعيين كلمة مرور على صفحة الدخول. يلزم SMTP/قالب الدعوة وإضافة عنوان العودة المحلي الفعلي في إعدادات Auth عند الحاجة. لم يُختبر وصول الدعوات بالبريد في مراجعة الاستقرار. احتفظ باستخدام اسم المضيف نفسه أثناء الدخول؛ cookies الخاصة بـlocalhost تختلف عن 127.0.0.1.

## متى تظهر تعديلات لوحة التحكم؟

حفظ الصفحة الرئيسية يكتب إلى Supabase ويستدعي revalidatePath('/', 'layout'). اختُبر العنوان الرئيسي والدورة القادمة بتاريخ 2026-09-12: البيانات بقيت بعد إعادة فتح الإدارة، وظهرت لزائر مجهول بعد F5. لا يحتاج تعديل المحتوى build أو restart، لكنه لا يُحدّث تبويب الزائر المفتوح تلقائيًا. الكاش في نسخة مستضافة منفصلة لم يُختبر بهذه التجربة.

للدورة القادمة يدويًا: اختر الدورة والموعد، ثم احفظ وانتظر النجاح وحدّث الموقع. الاختيار الناقص يعود إلى التلقائي. تمت إعادة القيم الأصلية بعد الاختبار.

## حدود مهمة للوظائف

- مكتبة الوسائط ترفع فعلًا إلى bm-media، لكن ImageUpload في عدة محررات ما زال معاينة محلية فقط. ظهور صورة بعد اختيارها ليس دليلًا على رفعها وحفظها.
- إعدادات الدفع ليست Checkout؛ رقم الإيرادات في لوحة الإدارة تقدير مشتق من الأسعار وأعداد المسجلين، وليس دفعات محصلة.
- حفظ البيانات متعددة الجداول ليس transaction؛ بعض سياسات Community تحتاج مراجعة قاعدة منفصلة. التفاصيل في التقرير، ولا تُعد نتائج البناء اعتماد أمان Production.
- المتاح Community V1 فقط؛ لا دردشة أو Push أو سوق وظائف أو اشتراكات مدفوعة.

## خريطة الكود

~~~text
src/app                    مسارات الموقع والإدارة والمجتمع وServer Actions
src/lib/supabase            عملاء المتصفح والخادم والخدمة والتخزين
src/lib/admin               الجلسة والصلاحيات وحصر البيانات
src/lib/cms                 المحولات ومحمّلات CMS
src/lib/community           محولات وتحقق ومحمّلات وعمليات المجتمع
src/context                 حالة الإدارة وعرض CMS العام
src/data/public-bridge.ts   اشتقاق العرض العام من بيانات CMS
supabase/migrations        عقد SQL الحالي (لا إعادة على Production)
tests                      5 ملفات اختبارات Bun
scripts/build.mjs           بناء وتغليف standalone
scripts/start.mjs           تشغيل الإنتاج مع تحميل البيئة
~~~

## نتائج التحقق

TypeScript: 0 أخطاء. ESLint: 0 أخطاء/تحذيرات. الاختبارات: 70 ناجحًا و214 assertions. أعيدت هذه الفحوص في جلسة التوثيق. آخر production build موثق PASS على Next 16.3.4 وتوليد 67/67؛ لم يُعد بناء الخادم الجاري لتحديث Markdown فقط.

مراجعة الاستقرار تضمنت browser smoke على 16 مسارًا وأربع حالات موبايل، وفحص Gitleaks نظيف وbun audit بلا advisories وقتها. تجربة CMS اللاحقة حية ومحدودة بالسيناريو الموثق. اختبارات Community بحسابين وSQL/RLS والتسليم البريدي ليست ضمن هذا التحقق الحي.
