-- إغلاق ثغرة إشراف صور المجتمع (Medium #9) — 2026-09-12
-- ============================================================
-- المشكلة: community-media كان public: true، فنقطة /object/public/ تخدم أي
-- ملف فيه بصرف النظر عن سياسات storage.objects. أثره المؤكد حيًا: إخفاء
-- المنشور إشرافيًا لا يخفي صورته، وحذف الكائن يبقى مخدومًا من CDN حتى ساعة.
--
-- الحل: الـbucket يصير خاصًا، وكل عرض يمر بمسار خادمي في التطبيق
-- (/community/media/…) يفحص ظهور المحتوى عند كل طلب ثم يبثّ البايتات
-- بعميل الخدمة. الإخفاء يسري فورًا لا بعد انتهاء مدة توقيع.
--
-- النطاق: community-media وحده. bm-media (صور الموقع والدورات) لا يُمَس —
-- محتواه تسويقي عام بطبيعته ولا يخضع لإشراف.
-- البيانات: community-media فارغ وقت كتابة هذا الترحيل، فلا ترحيل وسائط.
begin;

-- 1) إنهاء الخدمة العامة المباشرة
update storage.buckets set public = false where id = 'community-media';

-- 2) القراءة المباشرة تقتصر على مجلد المالك.
--    العرض العام لا يمر من هنا بل بعميل الخدمة داخل مسار التطبيق، فلا
--    حاجة لإبقاء قراءة مفتوحة لـanon على كل الـbucket.
drop policy if exists community_media_public_read on storage.objects;

create policy community_media_read_own_folder
  on storage.objects for select to authenticated
  using (
    bucket_id = 'community-media'
    and (storage.foldername(name))[1] = 'community'
    and (storage.foldername(name))[2] = (select auth.uid())::text
  );

-- سياسات الرفع والتعديل والحذف تبقى كما هي بلا تغيير.

commit;
