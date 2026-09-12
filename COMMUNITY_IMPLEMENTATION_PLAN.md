# COMMUNITY IMPLEMENTATION PLAN — مجتمع بيت المصور (CP-H V1)

الخطة الأصلية: 2026-09-10 — على أساس `57851a4` (POST Deep-Audit B، READY WITH ACTIONS مُغلقة)

> تحديث توثيقي 2026-09-12: Community V1 موجود في التطبيق وقاعدته مطبقة على Production بحسب المالك. الخطة تسجل التصميم الأصلي ولا تفوض تشغيل SQL أو مراحل جديدة. نتائج التحقق الحالية والقيود في PROJECT_REPORT.md وSTABILITY_AUDIT.md. أسماء الجداول أدناه صُححت لتطابق migrations.

## Scope (V1 فقط)
Community Profiles، Public Photographer Profiles، Feed، Image Posts، Likes، Comments،
Saved Posts، Follow/Unfollow، Portfolio Projects + Media، Photographer Discovery
(بحث + فلاتر)، Internal Notifications، Report Content، Block Users، Admin Moderation
(داخل /admin)، Academy Integration (عرض ما هو موجود فعليًا فقط).

**مستبعد صراحةً (V2+):** Chat، Realtime messaging، Jobs Marketplace، Groups، Stories،
Live، AI ranking، paid subscriptions، Push notifications.

## Architecture (داخل المشروع الحالي — لا مشروع منفصل)
- **Identity:** Supabase Auth الحالي. الأعضاء صفوف في `auth.users` بدون أي دور إداري.
  لا نلمس `public.profiles` (هوية الموظفين — role_id NOT NULL + مشغلات حماية المالك).
- **Member layer جديد:** `public.community_profiles` (PK = auth.users.id) — امتداد مستقل.
- **Server Actions:** نمط المشروع الموحد: بوابة عضوية/صلاحية → تحقق مدخلات → كتابة →
  `revalidatePath` → `ActionResult<T>` برسائل عربية (`src/lib/community/actions.ts`).
- **Public reads:** `getPublicAnonClient()` (D-86) عبر loader مستقل `src/lib/community/loaders.ts`
  بنمط tolerate — غياب الجداول (قبل تطبيق المالك) ينتج حالات فارغة، لا انهيار.
- **Auth pages:** `/community/login` و`/community/signup` (Supabase Auth email+password،
  signUp/signInWithPassword عبر server client المرتبط بالكوكيز) — لا next-auth.
- **حماية الصفحات الخاصة:** layout خادمي للمجموعة المحمية (`getCommunityMember()` → redirect)
  + حواجز RLS حقيقية. لا تعديل على middleware الإدارة (صفر مخاطر على /admin).

## Database Model (مخططات جديدة في public + helpers في private)
| الجدول | الغرض | قيود بارزة |
|---|---|---|
| `community_profiles` | هوية العضو العامة | PK=user_id→auth.users cascade، username فريد `^[a-z0-9_]{3,24}$`، status `active\|suspended` |
| `community_posts` | منشورات صورة+تعليق | author→community_profiles cascade، status `published\|hidden`، caption ≤ 2200 |
| `community_post_media` | صور المنشور (1-6) | →posts cascade، sort_order، alt_text |
| `community_post_likes` | إعجاب | PK(post_id,user_id) — إعجاب واحد لكل مستخدم |
| `community_post_comments` | تعليقات | →posts+author cascade، body ≤ 1000، status `published\|hidden` |
| `community_saved_posts` | محفوظات | PK(user_id,post_id) |
| `community_follows` | متابعة | PK(follower_id,following_id)، follower≠following، زوج فريد |
| `community_portfolio_projects` | مشاريع الأعمال | →user cascade، published bool، project_date |
| `community_portfolio_media` | وسائط المشروع | →project cascade، sort_order |
| `community_notifications` | إشعارات داخلية | type check، read_at — تُنشأ بمشغلات DB فقط |
| `community_content_reports` | بلاغات | target `post\|comment\|profile`، reason محدد مسبقًا، status `open\|reviewing\|resolved\|dismissed` |
| `community_user_blocks` | حجب | PK(blocker_id,blocked_id)، blocker≠blocked |

- المُعامل `admin_module` يكتسب قيمة `'community'` + صفوف `permissions/role_permissions`
  (owner/admin فقط — باقي الأدوار بلا صلاحيات مجتمع افتراضيًا).
- Indexes: feed(created_at desc حيث published)، posts(author)، comments(post)،
  likes(post)، follows(طرفا الزوج)، notifications(user, read_at)،
  portfolio(user)، discovery(city/country/specialty/experience/available).

## RLS Strategy (التصميم الأصلي، لا شهادة تحقق حالي)

ملاحظة المراجعة الحالية: وصف update(read_at) أدناه هدف تصميمي؛ سياسة الإشعارات الحالية لا تقيد كل الأعمدة بهذه الدقة، وبعض فحوص تعديل الوسائط/نشاط العضو غير مكتملة. راجع قيود STABILITY_AUDIT.md قبل الاعتماد على هذا الملخص.
- **anon:** قراءة الملفات العامة (status='active')، المنشورات المنشورة، تعليقاتها،
  المشاريع المنشورة، عدادات الإعجاب/المتابعة. صفر كتابة.
- **member (authenticated):** كل عمليات الكتابة مقيدة بـ `auth.uid()` مع فحص عدم وجود
  حجب متبادل (user_blocks بالاتجاهين) على likes/comments/follows — في `with check`
  داخل السياسات نفسها (لا يمكن التجاوز عبر REST). spoofing author_id مستحيل (with check
  يساوي auth.uid()). Notifications: select/update(read_at) للمالك فقط — الإنشاء عبر
  مشغلات `security definer` في private (على likes/comments/follows، skip-self) + منح
  USAGE/EXECUTE لـ authenticated وservice_role وفق نمط `20260909090000`.
- **admin:** سياسات إضافية عبر `(select private.has_permission('community', …))`
  لنمط cached-initplan — إخفاء/استرجاع منشور/تعليق، إدارة البلاغات.
- **Storage:** bucket جديد `community-media` (public read، حد 5MB، jpeg/png/webp فقط،
  upload لكل عضو في `community/{user_id}/…` فقط) — bm-media لا يُلمس إطلاقًا.
- **قائمة فحص ضد:** IDOR، privilege escalation، تعديل محتوى غيرك، قراءة إشعارات غيرك،
  spoofing المالك، bypass عبر REST — كلها مغطاة بسياسات on-table لا بواجهة فقط.

## Routes
| مسار | نوع | الحماية |
|---|---|---|
| `/community` | feed عام | عام (CTA دخول للمجهول) |
| `/community/login` `/community/signup` | دخول/تسجيل | noindex |
| `/community/profile` | محرر ملفي + portfolio الخاص بي | عضو (layout خادمي) |
| `/community/notifications` | إشعاراتي | عضو |
| `/community/photographers` | اكتشاف + بحث + فلاتر | عام |
| `/community/u/[username]` | ملف عام + portfolio المنشور | عام، metadata ديناميكية |
| `/admin/community` | moderation | requirePermission('community') |

## Components (نمط التصميم الحالي: brand/charcoal/surface، IBM Plex Arabic، RTL)
`src/components/community/*`: PostCard، PostComposer، PostMediaGrid، LikeButton،
CommentList/CommentForm، SaveButton، FollowButton، MemberCard، PortfolioGrid/
PortfolioEditor، NotificationRow، ReportDialog، BlockButton، EmptyState معاد استخدامه.

## Phases (تسلسل تاريخي للتنفيذ، لا خطة تشغيل جديدة)
1. Migrations (جداول+قيود+فهارس) → 2. RLS+storage → 3. lib (types/mappers/validators/
loaders/actions) → 4. auth pages + profile editor → 5. feed+posts+media →
6. interactions (like/comment/save) → 7. follows → 8. portfolio → 9. discovery →
10. notifications → 11. report/block → 12. admin moderation → 13. nav/SEO/a11y →
14. gates+E2E الممكنة → 15. cleanup + audit + checkpoint.

## Testing Strategy — الحالة الحالية 2026-09-12

- نجحت بوابات الاستقرار: TypeScript وESLint و70 اختبارًا/214 assertion وproduction build. أعيدت الفحوص عدا البناء في جلسة التوثيق؛ لا تغييرات كود.
- اختبار CMS حي لاحق أثبت حفظ الرئيسية واستمراره وظهوره للزائر بعد reload؛ هذا ليس اختبار مجتمع بحسابين.
- قاعدة المجتمع مطبقة؛ اختبارات SQL التي تنشئ وتحذف fixtures لا تُشغّل على Production. أي اختبار أمان كتابة يحتاج بيئة معزولة ونطاقًا مأذونًا.
- تبقى رحلة التسجيل/النشر/التفاعل/الحجب/الإشراف والبريد والوسائط تحت اختبار حي شامل مستقل؛ لا نعد غياب الجداول هو الحاجب الحالي.

## Deferred features
Chat/Realtime/Jobs/Groups/Stories/Live/Push/AI ranking — كما أمر المالك.

## Risks
| خطر | التخفيف |
|---|---|
| سجل خطر تاريخي: غياب الجداول قبل النشر | لم يعد حالة Production المعلنة؛ المجتمع مطبق، والتحقق الحي الشامل والسياسات يبقيان نطاق متابعة مستقلًا |
| تصادم أسماء المستخدمين | unique index + تحقق server-side + رسالة عربية |
| حجب/إساءة | user_blocks + content_reports + moderation بوابة 'community' |
| كسر الموقع الأساسي | صفر تعديل على loaders/مخططات موجودة؛ ISR/middleware كما هي؛ regression كامل |
| secrets | لا قيم في أي ملف؛ .env.example كما هو؛ التوكن عبر ملف مؤقت خارج المشروع يُحذف بعد كل دفعة |
