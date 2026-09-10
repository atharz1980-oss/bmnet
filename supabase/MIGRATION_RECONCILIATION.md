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

## الخطر

`supabase db push` قبل المعالجة سيجد الملفات الثلاثة غير مسجلة كسابقة التطبيق في
`supabase_migrations.schema_migrations` وس يحاول إعادة تنفيذها → سيفشل عند أول
كائن مكرر (`create policy` بلا `if not exists`). التنفيذ transactional فلا ضرر
على البيانات، لكن `db push` يبقى مسدودًا وغير آمن.

## الحل المعتمد — `supabase migration repair` (الأقل خطورة)

آلية CLI الرسمية لهذه الحالة بالضبط: تسجيل المخططات كسابقة التطبيق **دون تنفيذ
أي SQL على المخطط**:

```bash
supabase link --project-ref rnzdleotnxznkqfrcwfa
supabase migration repair --status applied 20260910090000 20260910091000 20260910092000
```

بديل مكافئ بلا CLI (Supabase Dashboard → SQL Editor، بصلاحية postgres):

```sql
insert into supabase_migrations.schema_migrations (version, name, statements)
values
  ('20260910090000', 'community_schema', null),
  ('20260910091000', 'community_admin_module', null),
  ('20260910092000', 'community_rls_storage_triggers', null)
on conflict (version) do nothing;
```

لماذا هذا الحل:

1. **لا يمس أي جدول أو بيانات** — كتابة في جدول السجل فقط (idempotent بـ
   `on conflict do nothing`).
2. **بعده يصبح `supabase db push` آمنًا**: الملفات الثلاثة مسجلة كسابقة التطبيق
   فلن يعيد تنفيذها أبدًا.
3. **لا يحذف مدخلات الأداة التسعة** — تظل سجلًا صادقًا لما حدث فعليًا (لا حلول
   تُخفي المشكلة).
4. **لا يعيد تسمية ملفات Git** — ثبات المخططات بعد تطبيقها قاعدة؛ التعديل بعد
   التطبيق يفسد الضمانات.
5. بيئات جديدة (staging/مساهمون) تبقى قابلة للبناء من الصفر من الملفات الثلاثة.

## خطوة اختيارية لاتساق كامل في `supabase migration list`

بعد الـ repair سيعرض `migration list` 3 صفوف متطابقة (Local=Remote) + 9 صفوف
remote-only من سجل الأداة. لاتساق عرض 100% — بعد قراءة الأرقام الفعلية من
الإنتاج:

```sql
select version, name from supabase_migrations.schema_migrations order by version;
```

تُضاف في Git ملفات ظل بنفس `version/name` محتواها تعليق توثيقي فقط (لا SQL)،
فلا تُنفّذ شيئًا على أي قاعدة جديدة وتجعل العرض متطابقًا. **لا تنفّذها قبل قراءة
الأرقام الفعلية من الإنتاج** — التخمين ممنوع.

## ممنوعات صارمة

- لا `db reset`، لا `drop`، لا `truncate`، لا حذف أي بيانات.
- لا حذف مدخلات السجل التسعة للأداة — هي السجل الصادق.
- لا تعديل محتوى الملفات الثلاثة بعد تطبيقها.
- لا `supabase db push` قبل إتمام الـ repair.
