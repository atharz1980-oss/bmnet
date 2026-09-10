# توثيق تزامن سجل المخططات — Community CP-H (2026-09-11)

## الوضع الراهن

- **الإنتاج** (`rnzdleotnxznkqfrcwfa`): مخططات المجتمع مطبقة فعليًا ومتحقق منها حيًا:
  12 جدولًا، RLS مفعّل 12/12، 49 سياسة عامة + 4 سياسات تخزين، 9 مشغلات، 6 دوال
  `private`، 21 فهرسًا، 19 مفتاحًا أجنبيًا، قيمة `community` في `admin_module`،
  3 صفوف صلاحيات، bucket `community-media` (public/5MB/jpeg+png+webp)،
  anon بلا أي كتابة مباشرة.
- **سجل التنفيذ على الإنتاج**: أداة التنفيذ سجلت العمل بأسماء/أرقام مدخلات جديدة
  (9 مدخلات) بدل أرقام ملفات Git الأصلية (3 ملفات) — **الانحراف في السجل فقط،
  لا في الـ schema**.
- **Git** (`supabase/migrations/`): الملفات الثلاثة الأصلية كما هي — تظل مصدر
  الحقيقة لأي بيئة جديدة.

## Mapping — الأصل في Git إلى سجل الإنتاج

| Migration الأصلي في Git | محتواه (جرد كامل) | المدخلات المقابلة في سجل الإنتاج |
|---|---|---|
| `20260910090000_community_schema` | 12 جدولًا + 11 قيدًا حرجًا + 21 فهرسًا + 5 مشغلات `updated_at` | `community_schema` |
| `20260910091000_community_admin_module` | `alter type admin_module add value 'community'` + بذور الصلاحيات وإسنادها لـ owner/admin | `community_enum_alter` + `community_permissions_seed` |
| `20260910092000_community_rls_storage_triggers` | تفعيل RLS على 12 + revoke/grant + دالتا helper + 49 سياسة عامة + bucket + 4 سياسات تخزين + 4 دوال مشغلات + 4 مشغلات | `community_rls_base` + `community_policies_core` + `community_policies_interactions` + `community_policies_notifications_reports` + `community_policies_blocks` + `community_storage_triggers` |

**تكافؤ الـ schema**: كل كائن قابل للعدّ في ملفات Git يطابق أرقام التحقق الحي
على الإنتاج بندًا بندًا (الأرقام أعلاه). لا يوجد أي كائن في Git غائب عن الإنتاج.

## الخطر قبل المعالجة

`supabase db push` قبل الـ repair سيجد الملفات الثلاثة غير مسجلة كسابقة التطبيق في
`supabase_migrations.schema_migrations` وس يحاول إعادة تنفيذها → سيفشل عند أول
كائن مكرر (`create policy` بلا `if not exists`). التنفيذ transactional فلا ضرر
على البيانات، لكن `db push` يبقى مسدودًا وغير آمن.

## الآلية الرسمية المعتمدة — `supabase migration repair` (الأقل خطورة)

آلية CLI الرسمية لهذه الحالة بالضبط: تسجيل المخططات كسابقة التطبيق **دون تنفيذ
أي SQL على المخطط**. اعتماد حصري بقرار المالك — **لا INSERT يدوي في
`supabase_migrations.schema_migrations` ولا shadow migrations تحت أي ظرف**.

### Runbook المالك (بالترتيب، بلا استثناء)

```bash
# 0) المصادقة (توكن المالك — لا يُشارك أبدًا)
export SUPABASE_ACCESS_TOKEN=<personal-access-token>

# 1) ربط المشروع
npx supabase link --project-ref rnzdleotnxznkqfrcwfa

# 2) BEFORE — التقاط الحالة قبل أي تغيير
npx supabase migration list

# 3) الإصلاح — تسجيل الثلاثة الأصلية كـ applied (كتابة في السجل فقط)
npx supabase migration repair --status applied \
  20260910090000 20260910091000 20260910092000

# 4) AFTER — يجب أن تظهر الثلاثة Applied على Remote
npx supabase migration list

# 5) الشرط الحاسم — بلا أي محاولة إعادة تنفيذ للمخططات الثلاثة
npx supabase db push --dry-run
```

### معايير النجاح (الحكم النهائي)

1. **AFTER**: `20260910090000` و`20260910091000` و`20260910092000` تظهر
   `Applied` على Remote في `migration list`.
2. **`db push --dry-run`**: الناتج المتوقع «No migrations to apply» أو ما يماثله
   (قاعدة محدثة) — **وأي سطر يقترح تطبيق أحد الملفات الثلاثة = فشل المعيار**
   ووقف كل شيء وتقرير فوري.
3. لا يُنفَّذ `db push` حقيقي إلا بموافقة صريحة بعد نجاح الـ dry-run — والناتج
   المتوقع عنده هو نفسه: لا شيء يُطبق.

## المدخلات التسعة الإضافية — هل هي مشكلة عملية؟

**لا. تكرار تاريخي محض (historical duplication) بلا أي أثر عملي**، والسبب:

- `db push` يقارن **ملفات Git المحلية** بجدول السجل ويطبّق فقط ما نسخته غير
  مسجلة؛ المدخلات remote-only التي لا مقابل محليًا لها **لا تُقرأ ولا تُنفَّذ
  أصلًا** — لا تعيق شيئًا ولا تُعد تنفيذًا.
- بعد الـ repair ستظهر في `migration list` 3 صفوف Local=Remote + 9 صفوف
  remote-only (وسم `x` في عمود Local). هذا **عرض معلوماتي فقط**.
- احتمال واضح بعد الـ repair: مدخلان يحملان الاسم `community_schema` (أحد
  التسعة الناتج عن أداة التطبيق، والثالث الجديد بنسخة `20260910090000`) — لا
  تعارض لأن المفتاح هو `version` لا الاسم.
- **القرار: تُترك التسعة كما هي.** هي السجل الصادق لما نُفِّذ فعليًا على
  الإنتاج. حذفها يزيّف التاريخ، وإبقاؤها يوثّق المسار الحقيقي. أي معالجة
  مستقبلية لها قرار مالك مستقل منفصل، ولا تلزم لإتمام التزامن.

## ممنوعات صارمة (قرار المالك — نهائي)

- **لا INSERT يدوي** في `supabase_migrations.schema_migrations` — الـ repair
  الرسمي هو القناة الوحيدة.
- **لا shadow migrations** — لا ملفات "ظل" لتجميل عرض `migration list`.
- لا `migration repair --status reverted`، لا حذف سجلات migration.
- لا `db reset`، لا `drop`، لا `truncate`، لا حذف أي بيانات.
- لا `db push` حقيقي قبل نجاح الـ dry-run وبموافقة صريحة.
- لا تعديل محتوى الملفات الثلاثة بعد تطبيقها — ثبات المخططات قاعدة.
