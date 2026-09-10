# بيت المصوّر — Bayt Almosawer

موقع مركز تدريب التصوير (جدة) + لوحة تحكم CMS كاملة مبنية على **Supabase** —
Next.js 16 (App Router) + React 19 + Tailwind 4 + shadcn/ui + Supabase (Auth / Postgres RLS / Storage).

> اللغة: عربي RTL بالكامل. قاعدة البيانات هي المصدر الوحيد للحقيقة (D-85).

## التشغيل على Windows (CMD)

المتطلبات: Git وNode.js 22 أو أحدث وBun 1.3 أو أحدث. الأوامر التالية تعمل في CMD:

```cmd
git clone https://github.com/atharz1980-oss/bmnet.git
cd bmnet
bun install --frozen-lockfile
copy .env.example .env.local
notepad .env.local
bun run typecheck
bun run lint
bun run test
bun run build
bun run start
```

افتح http://127.0.0.1:3000. يحمّل `bun run start` ملفات البيئة وفق ترتيب Next.js،
ومنها `.env.local`؛ لا يحتاج Bash. أوقف الخادم بـ Ctrl+C قبل إعادة البناء.
للتطوير بدل البناء الإنتاجي:

```cmd
bun run dev
```

البناء يحتاج اتصالًا بالإنترنت لتنزيل خطوط Google المستخدمة حاليًا.
ضع قيم Supabase قبل البناء لأن متغيرات `NEXT_PUBLIC_` تُضمّن في حزمة المتصفح.
لا تُرسل `.env.local` إلى Git ولا تشارك مفتاح الخدمة.

**قاعدة المجتمع مطبقة بالفعل على Production. التشغيل المحلي لا يتطلب تشغيل أي migration.**
لا تنفذ `db reset` أو `db push` أو `migration repair` أو ملفات اختبارات SQL على Production.
ملفات SQL الحالية محفوظة دون تغيير. Prisma كان قالب SQLite غير مستخدم وأزيل؛
Supabase هو تكامل قاعدة البيانات المستخدم في التطبيق.

الدعوات الإدارية تستخدم بريد Supabase. أضف عنوان الموقع المحلي الذي ستستخدمه
إلى قائمة Auth Redirect URLs في إعدادات مشروعك عند الحاجة، مثل
`http://127.0.0.1:3000/admin/login**`، وتأكد من إعداد SMTP/قالب الدعوة.
يصل رابط الدعوة إلى صفحة الدخول لاختيار كلمة مرور وتفعيل الحساب.
لا يغيّر التطبيق إعدادات Auth أو قاعدة الإنتاج تلقائيًا.

حدود الاختبارات ونتائج المراجعة موثقة في [STABILITY_AUDIT.md](STABILITY_AUDIT.md).

### متغيرات البيئة (`.env.local` — غير مرفوع أبدًا)

| المتغير | الدور |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | عنوان المشروع (عام) |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | مفتاح anon/publishable (عام) |
| `SUPABASE_SECRET_KEY` | مفتاح الخدمة — خادم فقط، لا يدخل المتصفح أبدًا |

## المعمارية (Checkpoint F + G)

```
src/
  app/
    admin/
      login/                    # صفحة الدخول (خارج الهيكل، حدّ Suspense لـ useSearchParams)
      (dashboard)/              # كل صفحات الإدارة — خلف بوابة الجلسة
        layout.tsx              # جلسة + loadAdminData (strict) + AdminShell
        courses/ paths/ blog/ … # 15 وحدة إدارية
      actions/                  # Server Actions: auth, content, ops, public-form, refresh
    (الموقع العام)/             # الرئيسية/الدورات/المسارات/المدونة/التواصل/السياسات
  lib/
    supabase/                   # client (browser) / server (cookies) / service (server-only)
    admin/session.ts            # getAdminSession + requirePermission (بوابة كل إجراء)
    cms/                        # mappers (DB↔CMS) + load (39 استعلام متوازٍ)
                                # + admin-loader (strict) + public-loader (anon متسامح) + result
  context/
    admin-store.tsx             # مخزن الإدارة: initialData من الخادم + ~40 إجراء async (D-85)
    public-cms.tsx              # جسر الموقع العام: initialView من القاعدة (D-86)
supabase/migrations/            # المخطط + RLS + التخزين
tests/                          # اختبارات المحولات (bun test)
```

### الأمان — ثلاث طبقات

1. **RLS على مستوى قاعدة البيانات** (الحاجز الحقيقي):
   anon يقرأ المحتوى المنشور فقط + يُدرج طلبات الشركات فقط؛
   authenticated يقرأ/يكتب وفق صلاحيات دوره (`private.has_permission`)؛
   **المسودات غير مرئية للزائر فيزيائيًا** — verified: anon يرى 0 مسودات.
2. **بوابات الخادم**: كل Server Action يبدأ بـ `requirePermission(module, action)`
   (جلسة كوكيز + قراءة الصلاحيات عبر عميل الخدمة) — الواجهة ليست حماية.
3. **حاجز المسار**: middleware يحمي `/admin/**` → `/admin/login?next=…`
   مع تعقيم الـ next (منع open-redirect).

### قرارات معمارية موثقة (memory.md)

- **D-80**: حالة الدورة مفصولة (`publish_status` + `operational_status`) ومدموجة للعرض.
- **D-81**: مسار الصورة `/…` = أصل محلي، غير ذلك `bm-media` Storage public URL.
- **D-85**: القاعدة مصدر وحيد — لا localStorage في الـ CMS إطلاقًا؛
  الحالة المحلية تُحدَّث من استجابات الإجراءات، وزر «تحديث» يسحب الحقيقة من القاعدة.
- **D-86**: الموقع العام يقرأ عبر **anon بلا كوكيز** — جلسة الإدارة لا يمكن أن
  تتسرب إلى القراءات العامة؛ فشل الجداول المحمية يُتسامح (قوائم فارغة).

## التحقق الحي (على Supabase الحقيقي)

- تسجيل دخول المالك + حماية `/admin` (307) + بيانات حقيقية في اللوحة.
- إنشاء/تعديل/حذف الدورات والكيانات — تُثبت في القاعدة وتنعش بعد التحديث.
- نشر/إلغاء نشر ينعكس على الموقع العام (RLS + revalidate).
- رفع الوسائط إلى `bm-media` + سجل في جدول `media`.
- طلب شركات مجهول من النموذج العام → لوحة الإدارة.

## حساب المالك

أُنشئ حساب المالك الأول عبر Admin API (بريد `owner@baytalmosawer.sa`).
كلمة المرور المؤقتة وُلّدت عند الإنشاء — **غيّرها فورًا**، ثم أضف المستخدمين
من «المستخدمون» في اللوحة (دعوة بالبريد).
