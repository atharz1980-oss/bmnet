# COMMUNITY FINAL CHECKPOINT — مجتمع بيت المصور (CP-H V1)

> توثيق تاريخي: قاعدة المجتمع مطبقة بالفعل على Production. لا تتبع أوامر تطبيق SQL القديمة أدناه. راجع README.md وSTABILITY_AUDIT.md للتشغيل والمراجعة الحالية.

التاريخ: 2026-09-10 — أساس البدء: `57851a4` (POST Deep-Audit B)

## Architecture
- داخل المستودع نفسه (لا مشروع منفصل) — Next.js 16 App Router + Supabase الحالي.
- الهوية: Supabase Auth (`auth.users`) — لا نظام مستخدمين مكرر. هوية الموظفين
  (`public.profiles`) لم تُلمس إطلاقًا.
- طبقة عضو جديدة: `public.community_profiles` (PK = user_id) — امتداد مستقل بـ RLS كامل.
- كل كتابة عضو تمر عبر **عميل الكوكيز الخادمي** فيُطبَّق RLS فعليًا (لا عميل خدمة في مسار العضو).
- المحتوى العام عبر `getPublicAnonClient()` (D-86) بمحمّلات tolerate — غياب الجداول/البيئة
  ينتج حالات فارغة/خطأ عربية مصممة، لا انهيار (أُثبت ببناء وتشغيل بلا env).
- الإشراف مدمج في `/admin` بلا نظام أدوار جديد: قيمة `community` في `admin_module`
  + `private.has_permission('community', view|edit|delete)` + سياسات RLS إدارية.

## Database Tables (migration 20260910090000)
`community_profiles` (username فريد `^[a-z0-9_]{3,24}$`، تخصصات ≤8، خبرة، أفاتار/غلاف،
متاح للعمل، روابط اجتماعية مُقيّدة regex، status active|suspended) — `community_posts`
(caption ≤2200، category/camera/lens/location اختيارية، visibility=public، status
published|hidden) — `community_post_media` (≤6/منشور، مسار مقيّد
`community/{uid}/…`) — `community_post_likes` (PK زوجي) — `community_post_comments`
(≤1000، status) — `community_saved_posts` (PK زوجي) — `community_follows` (PK زوجي +
منع الذات) — `community_portfolio_projects` + `community_portfolio_media` (≤20) —
`community_notifications` (follow|like|comment، read_at، فهرس unread جزئي) —
`community_content_reports` (أسباب محددة مسبقًا، status دورة حياة) —
`community_user_blocks` (PK زوجي + منع الذات).

## RLS Summary (ملخص تاريخي — migration 20260910092000)

تنبيه المراجعة الحالية: لا يثبت هذا الملخص اكتمال حماية كل أعمدة الإشعارات أو كل حالات تعديل الوسائط/نشاط العضو؛ انظر STABILITY_AUDIT.md.
- **anon:** قراءة الملفات النشطة/المنشورات المنشورة/تعليقاتها/المشاريع المنشورة/العدادات.
  صفر كتابة (مُختبر: POST مجهول → 401/403).
- **member:** كل `with check` يقيد الملكية بـ `auth.uid()` — spoofing author_id يفشل؛
  فحص الحجب المتبادل `private.community_block_between()` داخل سياسات
  like/comment/follow؛ منع التفاعل مع عضو موقوف `community_member_active()`.
- **المالك يعدّل منشوره المنشور فقط** — لا يمكنه إحياء منشور أخفاه الإشراف.
- **الإدارة:** سياسات إضافية بنمط `(select private.has_permission(...))` cached-initplan.
- **الإشعارات:** مشغلات `security definer` (notify_follow/like/comment + block_cleanup
  يقطع المتابعة بالاتجاهين) — العميل يقرأ/يحدّث `read_at` لصفوفه فقط، لا INSERT للعملاء.
- **Storage:** bucket جديد `community-media` (عام القراءة، 5MB، jpeg/png/webp) —
  رفع/تعديل/حذف في مجلد `community/{auth.uid()}/…` فقط؛ **bm-media لم يُلمس**.
- **اختبارات RLS:** `supabase/tests/community_rls.test.sql` (انتحال أدوار + skip-self +
  spoofing + حجب + إشعارات + تنظيف كامل) — تُنفذ بعد تطبيق المالك.
- **سكربت تحقق REST:** `scripts/verify-community.sh` (12 جدولًا + منع الكتابة المجهولة +
  bucket + بذور الصلاحيات؛ بلا أسرار في الملف).

## Routes
عام: `/community` (feed، الأحدث أولًا، ترقيم)، `/community/photographers` (بحث q +
مدينة/دولة/تخصص/خبرة/متاح + ترقيم)، `/community/u/[username]` (ملف عام + portfolio +
منشورات + metadata ديناميكية OG/canonical، 404 حقيقي للمجهول)، `/community/api-feed`
(ترقيم JSON)، `/community/api-comments` (تعليقات منشور).
عضو (noindex، بوابة layout خادمية): `/community/profile` (محرر الملف + مدير المشاريع)،
`/community/notifications` (غير-مقروء + تعليم واحد/الكل).
دخول: `/community/login`، `/community/signup` (noindex، رسائل عربية، دعم تأكيد البريد).
إدارة: `/admin/community` (بلاغات → إخفاء منشور/تعليق، تعليق عضو، إغلاق/رفض بلاغ)
+ سطر في `nav-config`.

## Completed Features (V1 كلها)
Profiles ✓ — Public Profiles ✓ — Feed ✓ — Image Posts (1-6 صور، نص بديل) ✓ — Likes ✓
— Comments (إضافة/حذف/عرض حي) ✓ — Saved ✓ — Follow/Unfollow + عدادات ✓ — Portfolio
CRUD + وسائط + غلاف + نشر/إلغاء ✓ — Discovery بحث وفلاتر ✓ — Notifications (مشغلات
DB) ✓ — Report ✓ — Block ✓ — Admin Moderation ✓ — Academy Integration: **يعرض فقط ما
هو موجود** — لا يوجد نظام تسجيل/شهادات موثوق في الأكاديمية بعد (لا جدول
trainees/completions)، فلا يُعرض أي شيء مختلق، والقسم جاهز للتوصيل عند وجود المصدر.

## Quality Gates (أرقام فعلية على HEAD)
- lint: PASS (0 أخطاء، 0 تحذيرات) — eslint .
- TypeScript: PASS — tsc --noEmit = 0 أخطاء
- tests: 51/51 (29 cms-mappers + 22 community — مدققات/محولات/مسارات تخزين آمنة)
- production build: PASS — 66 صفحة، standalone OK (بما فيها /community و/admin/community)
- standalone runtime: PASS — / و/courses و/blog 200؛ /community 200؛ ملف مجهول → 404 حقيقي
- console: صفر أخطاء كونسول من كود المجتمع (الأخطاء الظاهرة في بيئة اللا-env هي
  ERR_CONNECTION_REFUSED من غياب مفاتيح Supabase — تزول بالإنتاج)
- responsive @360px: 4/4 صفحات مجتمع RTL، scrollWidth=360، بلا overflow أفقي، h1 واحد

## E2E Results (ضمن حدود بيئة بلا env)
- تنقل حي + حالات فارغة/خطأ مصممة + نموذج دخول يعرض رسالة خطأ صادقة ✓
- سيناريوهات القاعدة الحية (تسجيل→ملف→نشر→تفاعل→متابعة→بلاغ→إشراف) جاهزة التنفيذ فور
  تطبيق المالك للمخططات وتوفير env — عبر سكربتي التحقق أعلاه وواجهة الموقع نفسها.

## Security Results
- بوابة مزدوجة في كل أكشن عضو (خادمية) + RLS كحاجز نهائي حتى عبر REST المباشر.
- مسارات الوسائط مقيّدة بملكية المجلد (تحقق مزدوج: تطبيق + policy storage).
- منع IDOR/escalation/spoofing موثق بسياسات with check + اختبارات SQL جاهزة.
- صفر أسرار في الكود؛ لا .env متتبع؛ التوكن استُخدم عبر ملف مؤقت خارج المشروع حُذف
  بعد كل دفعة (لا يتوفر بيانات التوكن في أي ملف للمشروع).

## Known Limitations — تحديث 2026-09-12

1. قاعدة المجتمع مطبقة على Production بحسب المالك. لا إعادة migrations أو إصلاح سجلها دون طلب جديد صريح.
2. لم تتضمن مراجعة الاستقرار الحديثة اختبارات مجتمع حية بحسابين أو SQL/RLS كتابية؛ تجربة CMS اللاحقة لا توسع هذا النطاق تلقائيًا.
3. توجد فجوات سياسات قاعدة وقيود حفظ غير ذري وتخزين عام موثقة في STABILITY_AUDIT.md؛ اختبارات الكود لا تُغلقها.
4. اختبارات fixtures التي تنشئ وتحذف حسابات/سجلات تستخدم فقط بيئة اختبار منفصلة مأذونة.

## Deferred Features
Chat، Realtime messaging، Jobs Marketplace، Groups، Stories، Live، Push Notifications،
AI Feed Ranking، paid subscriptions — بأمر المالك.

## Latest Commits
- `6d8392d` fix(community): self-review cycle — profile-creation gate, live comments, needsProfile CTA
- `3098739` feat(community): add portfolios — full CRUD manager
- `f5ed4f2` feat(community): feed, posts, profiles, social, discovery, notifications
- `937fd02` feat(community): profile schema and RLS (12 tables)
- `76bafb6` docs(community): implementation plan
- (أساس) `57851a4` fix(build): rm -rf .next — D-99

## Deployment Notes

مخططات المجتمع مطبقة بالفعل على Production. لا تُعد تنفيذها ولا تنفذ اختبارات SQL التي تكتب بيانات على الإنتاج. اتبع أوامر البناء والتشغيل الحالية في README.md فقط.

## Future Mobile/PWA Readiness
**تصور تاريخي يحتاج إعادة تقييم أمني قبل التنفيذ:** كل وظائف المجتمع عبر Supabase (PostgREST + Auth + Storage) — أي عميل
موبايل (React Native/Flutter) أو PWA يستهلك نفس الـAPI والـRLS دون وسيط. الخادم مجرد
واجهة عرض؛ الأكشنات Server Actions اختيارية لأن كل قاعدة قابلة للتنفيذ من العميل عبر
RLS. الخطوة المستقبلية: manifest + service worker (PWA) أو غلاف native — دون أي تغيير
في قاعدة البيانات أو الصلاحيات.
