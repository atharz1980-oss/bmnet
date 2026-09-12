-- إصلاحات RLS للمجتمع — تصحيحية فقط (2026-09-12)
-- ============================================================
-- لا إنشاء جداول ولا حذف ولا إعادة ترحيل. يعدّل دالة مساعدة وسياستي
-- وسائط وصلاحية عمود واحد. كل تغيير هنا يضيّق أو يصحّح، ولا يوسّع وصولًا
-- إلى بيانات عضو آخر.
--
-- العيوب المعالَجة:
--   1) community_block_between تعيد false عند a = b، فمُنع العضو من
--      الإعجاب بمنشوره والتعليق عليه — أي إن صاحب المنشور لا يستطيع الرد
--      على تعليقات منشوره إطلاقًا. الأثر ظاهر للمستخدم كرفض 42501.
--   2) منح UPDATE على community_notifications كان على مستوى الجدول، فيمكن
--      للعضو تعديل type وactor_id وentity_id لصفوفه، والمقصود read_at فقط.
--   3) و4) سياستا تعديل الوسائط (المنشورات والأعمال) تُسقطان شرط ملكية
--      مسار التخزين الذي تفرضه سياسة الإدراج، فيمكن للعضو توجيه صف وسائطه
--      إلى مجلد عضو آخر داخل bucket عام.
begin;

-- ============================================================
-- 1) التفاعل مع محتوى النفس مسموح؛ الحجب يخص طرفين مختلفين
--     منع متابعة الذات محفوظ بقيد no_self_follow وبشرط صريح في سياسة
--     community_follows_insert_own، فلا يعتمد على هذه الدالة.
-- ============================================================
create or replace function private.community_block_between(a uuid, b uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select a is not null and b is not null and not exists (
    select 1 from public.community_user_blocks blk
    where (blk.blocker_id = a and blk.blocked_id = b)
       or (blk.blocker_id = b and blk.blocked_id = a)
  );
$$;

-- ============================================================
-- 2) الإشعارات: تعليم القراءة فقط
--     لا سياسة إدارية على هذا الجدول، فتضييق المنح لا يكسر التحكم.
-- ============================================================
revoke update on public.community_notifications from authenticated;
grant update (read_at) on public.community_notifications to authenticated;

-- ============================================================
-- 3) وسائط المنشورات: التعديل يبقى داخل مجلد المالك
-- ============================================================
drop policy if exists community_post_media_update_own on public.community_post_media;
create policy community_post_media_update_own
  on public.community_post_media for update to authenticated
  using (
    exists (
      select 1 from public.community_posts p
      where p.id = post_id and p.author_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.community_posts p
      where p.id = post_id and p.author_id = (select auth.uid())
    )
    and storage_path like 'community/' || (select auth.uid())::text || '/%'
  );

-- ============================================================
-- 4) وسائط الأعمال: القيد نفسه
-- ============================================================
drop policy if exists community_portfolio_media_update_own on public.community_portfolio_media;
create policy community_portfolio_media_update_own
  on public.community_portfolio_media for update to authenticated
  using (
    exists (
      select 1 from public.community_portfolio_projects pr
      where pr.id = project_id and pr.user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.community_portfolio_projects pr
      where pr.id = project_id and pr.user_id = (select auth.uid())
    )
    and storage_path like 'community/' || (select auth.uid())::text || '/%'
  );

commit;
