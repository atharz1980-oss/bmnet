# COMMUNITY IMPLEMENTATION PLAN — مجتمع بيت المصور (CP-H V1)

آخر تحديث: 2026-09-10 — على أساس `57851a4` (POST Deep-Audit B، READY WITH ACTIONS مُغلقة)

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
| `posts` | منشورات صورة+تعليق | author→community_profiles cascade، status `published\|hidden`، caption ≤ 2200 |
| `post_media` | صور المنشور (1-6) | →posts cascade، sort_order، alt_text |
| `post_likes` | إعجاب | PK(post_id,user_id) — إعجاب واحد لكل مستخدم |
| `post_comments` | تعليقات | →posts+author cascade، body ≤ 1000، status `published\|hidden` |
| `saved_posts` | محفوظات | PK(user_id,post_id) |
| `follows` | متابعة | PK(follower_id,following_id)، follower≠following، زوج فريد |
| `portfolio_projects` | مشاريع الأعمال | →user cascade، published bool، project_date |
| `portfolio_media` | وسائط المشروع | →project cascade، sort_order |
| `notifications` | إشعارات داخلية | type check، read_at — تُنشأ بمشغلات DB فقط |
| `content_reports` | بلاغات | target `post\|comment\|profile`، reason محدد مسبقًا، status `open\|reviewing\|resolved\|dismissed` |
| `user_blocks` | حجب | PK(blocker_id,blocked_id)، blocker≠blocked |

- المُعامل `admin_module` يكتسب قيمة `'community'` + صفوف `permissions/role_permissions`
  (owner/admin فقط — باقي الأدوار بلا صلاحيات مجتمع افتراضيًا).
- Indexes: feed(created_at desc حيث published)، posts(author)، comments(post)،
  likes(post)، follows(طرفا الزوج)، notifications(user, read_at)،
  portfolio(user)، discovery(city/country/specialty/experience/available).

## RLS Strategy (حاجز أمني حقيقي)
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
| `/community/u/[username] | ملف عام + portfolio المنشور | عام، metadata ديناميكية |
| `/admin/(dashboard)/community` | moderation | requirePermission('community') |

## Components (نمط التصميم الحالي: brand/charcoal/surface، IBM Plex Arabic، RTL)
`src/components/community/*`: PostCard، PostComposer، PostMediaGrid، LikeButton،
CommentList/CommentForm، SaveButton، FollowButton، MemberCard، PortfolioGrid/
PortfolioEditor، NotificationRow، ReportDialog، BlockButton، EmptyState معاد استخدامه.

## Phases (كل مرحلة: implement → test → review → fix → retest → commit → push)
1. Migrations (جداول+قيود+فهارس) → 2. RLS+storage → 3. lib (types/mappers/validators/
loaders/actions) → 4. auth pages + profile editor → 5. feed+posts+media →
6. interactions (like/comment/save) → 7. follows → 8. portfolio → 9. discovery →
10. notifications → 11. report/block → 12. admin moderation → 13. nav/SEO/a11y →
14. gates+E2E الممكنة → 15. cleanup + audit + checkpoint.

## Testing Strategy
- **قابل للتنفيذ آليًا الآن:** lint، tsc، bun tests (validators/mappers الجديدة)،
  production build 58+N صفحة، standalone runtime، smoke للموقع الأساسي، فحص الكونسول.
- **حاجب حقيقي موثق:** تطبيق migrations على قاعدة الإنتاج لا يملكه سوى المالك (لا مسار
  DDL من البيئة — سابقة `20260909090000/091000`)، ومتغيرات env الفعلية فقدت مع إعادة
  ضبط البيئة. لذلك: اختبارات RLS/الإدراج الحي تُسلّم كسكربتات جاهزة
  (`supabase/tests/community_rls.test.sql` + `scripts/verify-community.sh`) تُنفذ فور
  تطبيق المالك للمخططات، وكل الصفحات مبنية tolerate فلا تنهار قبل التطبيق.
- **Browser E2E:** يُنفذ على ما يمكن دون قاعدة (روتينغ/حالات فارغة/تسجيل الدخول يعرض
  رسالة صادقة عند غياب الجداول) ويسلّم سيناريوهات كاملة في checkpoint.

## Deferred features
Chat/Realtime/Jobs/Groups/Stories/Live/Push/AI ranking — كما أمر المالك.

## Risks
| خطر | التخفيف |
|---|---|
| جداول غير مطبقة قبل النشر | tolerate loaders + حالات فارغة عربية + سكربت تحقق جاهز |
| تصادم أسماء المستخدمين | unique index + تحقق server-side + رسالة عربية |
| حجب/إساءة | user_blocks + content_reports + moderation بوابة 'community' |
| كسر الموقع الأساسي | صفر تعديل على loaders/مخططات موجودة؛ ISR/middleware كما هي؛ regression كامل |
| secrets | لا قيم في أي ملف؛ .env.example كما هو؛ التوكن عبر ملف مؤقت خارج المشروع يُحذف بعد كل دفعة |
