/**
 * اختبار RLS حي للمجتمع بحسابين — يكتب على القاعدة التي يشير إليها .env.local.
 * ============================================================================
 * مكمّل لـcommunity_rls.test.sql: ذاك ينتحل الأدوار داخل SQL، وهذا يمر بمسار
 * العميل الحقيقي بجلستي عضوين (JWT) فيختبر ما يراه التطبيق فعلًا.
 *
 * لا يُشغَّل ضمن `bun test` — مجلد tests/ وحده هو المرصود. التشغيل صريح:
 *   BMNET_LIVE_RLS_TEST=1 node supabase/tests/community_rls_live.mjs
 *
 * ما ينشئه: حسابا Auth مؤقتان بنطاق example.invalid وملفاهما ومنشور ووسائط
 * ومشروع. يحذف كل ذلك في finally مهما كانت النتيجة، ويطبع عدّ الصفوف بعده.
 * لا يلمس أي صف قائم: الحذف مقيّد بالمعرّفات المولّدة في التشغيل نفسه.
 *
 * قبل التشغيل على قاعدة فيها أعضاء حقيقيون: راجع أن الحذف النهائي لا يشمل
 * إلا ما أُنشئ هنا، وأن انقطاعًا في المنتصف قد يترك حسابين مؤقتين يلزم حذفهما.
 */
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

if (process.env.BMNET_LIVE_RLS_TEST !== "1") {
  console.log("اختبار حي يكتب على قاعدة .env.local. للتشغيل: BMNET_LIVE_RLS_TEST=1 node supabase/tests/community_rls_live.mjs");
  process.exit(2);
}

const env = Object.fromEntries(
  readFileSync(".env.local", "utf8")
    .split(/\r?\n/)
    .filter((l) => l && !l.startsWith("#"))
    .map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1).replace(/\r$/, "")]),
);

const URL = env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const SECRET = env.SUPABASE_SECRET_KEY;

const admin = createClient(URL, SECRET, { auth: { persistSession: false, autoRefreshToken: false } });

const stamp = Date.now().toString(36);
const results = [];
let failures = 0;

function check(name, passed, detail = "") {
  results.push({ name, passed, detail });
  if (!passed) failures++;
  console.log(`${passed ? "PASS" : "FAIL"}  ${name}${detail ? "  — " + detail : ""}`);
}

/** رمز خطأ Postgres من رد supabase-js. */
const code = (error) => error?.code ?? "";

/**
 * تأكيد رفض كتابة. النص يُحسب بعد معرفة النتيجة: حساب نص الفشل مسبقًا
 * وطباعته مع PASS أفسد قراءة السجل مرة، فلا يُكرَّر.
 */
function checkRefused(name, result) {
  const rows = result.data?.length ?? 0;
  const refused = Boolean(result.error) || rows === 0;
  check(
    name,
    refused,
    refused
      ? result.error
        ? `رُفض ${code(result.error)}`
        : "لم يتأثر أي صف — رشّحته السياسة"
      : `أثّر في ${rows} صفًا — خطر`,
  );
}

const created = { users: [], posts: [], projects: [], objects: [] };

async function makeMember(tag) {
  const email = `bmnet-rlstest-${stamp}-${tag}@example.invalid`;
  const password = `T${Math.random().toString(36).slice(2)}!${Math.random().toString(36).slice(2)}`;
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error) throw new Error(`تعذر إنشاء حساب ${tag}: ${error.message}`);
  const userId = data.user.id;
  created.users.push(userId);

  const { error: profileError } = await admin.from("community_profiles").insert({
    user_id: userId,
    username: `rlstest_${stamp}_${tag}`.slice(0, 24),
    display_name: `اختبار ${tag}`,
    status: "active",
  });
  if (profileError) throw new Error(`تعذر إنشاء ملف ${tag}: ${profileError.message}`);

  const client = createClient(URL, ANON, { auth: { persistSession: false, autoRefreshToken: false } });
  const { error: signInError } = await client.auth.signInWithPassword({ email, password });
  if (signInError) throw new Error(`تعذر تسجيل دخول ${tag}: ${signInError.message}`);
  return { userId, client };
}

async function run() {
  console.log("=== تهيئة حسابين مؤقتين ===");
  const A = await makeMember("a");
  const B = await makeMember("b");
  console.log("جاهز\n=== التأكيدات ===");

  // منشور لـA
  const { data: post, error: postError } = await A.client
    .from("community_posts")
    .insert({ author_id: A.userId, caption: "منشور اختبار سياسات", status: "published", visibility: "public" })
    .select("id")
    .single();
  check("عضو ينشر منشورًا", !postError, postError?.message);
  if (postError) return;
  created.posts.push(post.id);

  // ── العيب 1: التفاعل مع محتوى النفس ──
  const selfLike = await A.client.from("community_post_likes").insert({ post_id: post.id, user_id: A.userId });
  check("صاحب المنشور يعجب بمنشوره (العيب 1)", !selfLike.error, selfLike.error?.message);

  const selfComment = await A.client
    .from("community_post_comments")
    .insert({ post_id: post.id, author_id: A.userId, body: "رد صاحب المنشور", status: "published" })
    .select("id")
    .single();
  check("صاحب المنشور يرد على تعليقات منشوره (العيب 1)", !selfComment.error, selfComment.error?.message);

  // ── سلوك أساسي: عضو آخر يتفاعل ──
  const otherLike = await B.client.from("community_post_likes").insert({ post_id: post.id, user_id: B.userId });
  check("عضو آخر يعجب بالمنشور", !otherLike.error, otherLike.error?.message);

  // ── العيب 2: الإشعارات — عمود read_at فقط ──
  const { data: notif } = await admin
    .from("community_notifications")
    .select("id, type")
    .eq("user_id", A.userId)
    .limit(1)
    .maybeSingle();
  check("إعجاب العضو الآخر ولّد إشعارًا", Boolean(notif), notif ? "" : "لا إشعار");

  if (notif) {
    const readOk = await A.client
      .from("community_notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("id", notif.id)
      .select("id");
    check("المالك يعلّم إشعاره مقروءًا", !readOk.error && readOk.data?.length === 1, readOk.error?.message);

    const tamper = await A.client
      .from("community_notifications")
      .update({ type: "follow" })
      .eq("id", notif.id)
      .select("id");
    checkRefused("تعديل نوع الإشعار مرفوض (العيب 2)", tamper);
  }

  // ── العيب 3: تعديل صف الوسائط خارج مجلد المالك ──
  const ownPath = `community/${A.userId}/${stamp}-own.jpg`;
  const foreignPath = `community/${B.userId}/${stamp}-foreign.jpg`;
  const { data: media, error: mediaError } = await A.client
    .from("community_post_media")
    .insert({ post_id: post.id, storage_path: ownPath, sort_order: 1 })
    .select("id")
    .single();
  check("عضو يضيف صف وسائط في مجلده", !mediaError, mediaError?.message);

  if (media) {
    const repoint = await A.client
      .from("community_post_media")
      .update({ storage_path: foreignPath })
      .eq("id", media.id)
      .select("id");
    checkRefused("توجيه الوسائط إلى مجلد عضو آخر مرفوض (العيب 3)", repoint);

    const sameFolder = await A.client
      .from("community_post_media")
      .update({ storage_path: `community/${A.userId}/${stamp}-renamed.jpg` })
      .eq("id", media.id)
      .select("id");
    check("التعديل داخل مجلد المالك ما زال مسموحًا", !sameFolder.error && sameFolder.data?.length === 1, sameFolder.error?.message);
  }

  // ── العيب 4: وسائط المشاريع ──
  const { data: project } = await A.client
    .from("community_portfolio_projects")
    .insert({ user_id: A.userId, title: "مشروع اختبار", published: true })
    .select("id")
    .single();
  if (project) {
    created.projects.push(project.id);
    const { data: pMedia } = await A.client
      .from("community_portfolio_media")
      .insert({ project_id: project.id, storage_path: ownPath, sort_order: 1 })
      .select("id")
      .single();
    if (pMedia) {
      const repoint = await A.client
        .from("community_portfolio_media")
        .update({ storage_path: foreignPath })
        .eq("id", pMedia.id)
        .select("id");
      checkRefused("توجيه وسائط المشروع إلى مجلد آخر مرفوض (العيب 4)", repoint);
    }
  }

  // ── الحجب ما زال يمنع التفاعل بين شخصين مختلفين ──
  const follow = await B.client
    .from("community_follows")
    .insert({ follower_id: B.userId, following_id: A.userId });
  check("عضو يتابع آخر قبل الحجب", !follow.error, follow.error?.message);

  const block = await A.client
    .from("community_user_blocks")
    .insert({ blocker_id: A.userId, blocked_id: B.userId });
  check("عضو يحجب آخر", !block.error, block.error?.message);

  const { count: followsLeft } = await admin
    .from("community_follows")
    .select("follower_id", { count: "exact", head: true })
    .or(`and(follower_id.eq.${B.userId},following_id.eq.${A.userId}),and(follower_id.eq.${A.userId},following_id.eq.${B.userId})`);
  check("الحجب قطع المتابعة بالاتجاهين", followsLeft === 0, `متبقٍ: ${followsLeft}`);

  await B.client.from("community_post_likes").delete().eq("post_id", post.id).eq("user_id", B.userId);
  const blockedLike = await B.client
    .from("community_post_likes")
    .insert({ post_id: post.id, user_id: B.userId });
  check("المحجوب لا يستطيع الإعجاب", Boolean(blockedLike.error), blockedLike.error ? code(blockedLike.error) : "نجح رغم الحجب");

  // ── متابعة الذات ما زالت ممنوعة رغم تغيير الدالة ──
  const selfFollow = await A.client
    .from("community_follows")
    .insert({ follower_id: A.userId, following_id: A.userId });
  check("متابعة الذات ما زالت ممنوعة", Boolean(selfFollow.error), selfFollow.error ? code(selfFollow.error) : "نجحت — خطر");


  // ══════════════════ طبقة التخزين ══════════════════
  // bucket community-media عام؛ السياسات تحكم الكتابة لا القراءة.
  const BUCKET = "community-media";
  const png = Uint8Array.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
    0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4,
    0x89, 0x00, 0x00, 0x00, 0x0a, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9c, 0x63, 0x00, 0x01, 0x00, 0x00,
    0x05, 0x00, 0x01, 0x0d, 0x0a, 0x2d, 0xb4, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae,
    0x42, 0x60, 0x82,
  ]);
  const upload = (client, path) =>
    client.storage.from(BUCKET).upload(path, png, { contentType: "image/png", upsert: false });

  const ownObject = `community/${A.userId}/${stamp}-live.png`;
  const ownUpload = await upload(A.client, ownObject);
  check("رفع صورة داخل مجلد العضو", !ownUpload.error, ownUpload.error?.message);
  if (!ownUpload.error) created.objects.push(ownObject);

  const foreignObject = `community/${B.userId}/${stamp}-intruder.png`;
  const foreignUpload = await upload(A.client, foreignObject);
  check("الرفع في مجلد عضو آخر مرفوض", Boolean(foreignUpload.error), foreignUpload.error?.message ?? "نجح — خطر");
  if (!foreignUpload.error) created.objects.push(foreignObject);

  const rootUpload = await upload(A.client, `${stamp}-root.png`);
  check("الرفع خارج بادئة community مرفوض", Boolean(rootUpload.error), rootUpload.error?.message ?? "نجح — خطر");
  if (!rootUpload.error) created.objects.push(`${stamp}-root.png`);

  const anonClient = createClient(URL, ANON, { auth: { persistSession: false, autoRefreshToken: false } });
  const anonUpload = await upload(anonClient, `community/${A.userId}/${stamp}-anon.png`);
  check("الزائر المجهول لا يرفع شيئًا", Boolean(anonUpload.error), anonUpload.error?.message ?? "نجح — خطر");

  const foreignDelete = await B.client.storage.from(BUCKET).remove([ownObject]);
  /* سياسة storage ترشّح الصف بصمت: لا خطأ، وقائمة محذوفات فارغة. */
  const removedCount = foreignDelete.data?.length ?? 0;
  const deleteRefused = Boolean(foreignDelete.error) || removedCount === 0;
  check(
    "عضو لا يحذف ملف عضو آخر",
    deleteRefused,
    deleteRefused
      ? foreignDelete.error?.message ?? "لم يُحذف شيء — رشّحته السياسة"
      : `حذف ${removedCount} ملفًا — خطر`,
  );

  /* القراءة العامة المباشرة: كانت ثغرة، وأُغلقت بجعل الـbucket خاصًا
     (ترحيل 20260912190000). التأكيد الآن على النتيجة المرجوة: نقطة
     /object/public لم تعد تخدم شيئًا، لا قبل الإخفاء ولا بعده. */
  const publicUrl = `${URL}/storage/v1/object/public/${BUCKET}/${ownObject}`;
  const anonFetch = await fetch(publicUrl);
  check(
    "الرابط العام المباشر لا يخدم وسائط المجتمع",
    !anonFetch.ok,
    anonFetch.ok ? "ما زال يخدم الصورة — عادت الثغرة" : `HTTP ${anonFetch.status} — مغلق`,
  );

  await admin.from("community_posts").update({ status: "hidden" }).eq("id", post.id);
  const afterHide = await fetch(publicUrl);
  check(
    "والإخفاء الإشرافي لا يفتحه",
    !afterHide.ok,
    afterHide.ok ? "خدم الصورة بعد الإخفاء — خطر" : `HTTP ${afterHide.status}`,
  );

  await admin.from("community_posts").update({ status: "published" }).eq("id", post.id);


  // ══════ الخلاصة العامة: يجب أن ترى المنشور كزائر مجهول ══════
  const feedProbe = await anonClient
    .from("community_posts")
    .select(
      `id, author_id, caption, created_at,
       author:community_profiles!community_posts_author_id_fkey!inner (user_id, username, display_name, avatar_path),
       media:community_post_media (storage_path, alt_text, sort_order),
       like_count:community_post_likes (count),
       comment_count:community_post_comments (count)`,
    )
    .order("created_at", { ascending: false })
    .range(0, 12);
  check(
    "الخلاصة تُحمَّل للزائر المجهول",
    !feedProbe.error,
    feedProbe.error ? `${feedProbe.error.code}: ${feedProbe.error.message}` : `منشورات: ${feedProbe.data?.length ?? 0}`,
  );
  check(
    "الخلاصة تعرض منشور العضو",
    (feedProbe.data ?? []).some((row) => row.id === post.id),
    `عُثر على ${feedProbe.data?.length ?? 0} منشورًا`,
  );


  // ══════ محاولات تجاوز مباشرة: A ضد B ══════
  // كل تأكيد هنا يمثل هجومًا واقعيًا عبر REST لا عبر الواجهة.
  const { data: bPost } = await B.client
    .from("community_posts")
    .insert({ author_id: B.userId, caption: "منشور B", status: "published", visibility: "public" })
    .select("id").single();
  created.posts.push(bPost.id);

  const editOther = await A.client
    .from("community_posts").update({ caption: "اختُطف" }).eq("id", bPost.id).select("id");
  checkRefused("A لا يعدّل منشور B", editOther);

  const delOther = await A.client
    .from("community_posts").delete().eq("id", bPost.id).select("id");
  checkRefused("A لا يحذف منشور B", delOther);

  const spoof = await A.client
    .from("community_posts")
    .insert({ author_id: B.userId, caption: "منشور منتحل", status: "published", visibility: "public" });
  check("A لا ينتحل author_id الخاص بـB", Boolean(spoof.error),
    spoof.error ? code(spoof.error) : "نجح الانتحال — خطر");

  const spoofComment = await A.client
    .from("community_post_comments")
    .insert({ post_id: bPost.id, author_id: B.userId, body: "تعليق منتحل", status: "published" });
  check("A لا ينتحل مؤلف تعليق", Boolean(spoofComment.error),
    spoofComment.error ? code(spoofComment.error) : "نجح — خطر");

  const readOtherNotifs = await A.client
    .from("community_notifications").select("id").eq("user_id", B.userId);
  check("A لا يقرأ إشعارات B", (readOtherNotifs.data?.length ?? 0) === 0,
    `أعاد ${readOtherNotifs.data?.length ?? 0} صفًا`);

  const readOtherSaves = await A.client
    .from("community_saved_posts").select("post_id").eq("user_id", B.userId);
  check("A لا يقرأ محفوظات B", (readOtherSaves.data?.length ?? 0) === 0,
    `أعاد ${readOtherSaves.data?.length ?? 0} صفًا`);

  const readOtherBlocks = await A.client
    .from("community_user_blocks").select("blocked_id").eq("blocker_id", B.userId);
  check("A لا يقرأ قائمة حجب B", (readOtherBlocks.data?.length ?? 0) === 0,
    `أعاد ${readOtherBlocks.data?.length ?? 0} صفًا`);

  const suspendOther = await A.client
    .from("community_profiles").update({ status: "suspended" }).eq("user_id", B.userId).select("user_id");
  checkRefused("A لا يعلّق حساب B", suspendOther);

  const editOtherProfile = await A.client
    .from("community_profiles").update({ display_name: "مخترق" }).eq("user_id", B.userId).select("user_id");
  checkRefused("A لا يعدّل ملف B", editOtherProfile);

  // إخفاء إشرافي ثم محاولة قراءة المخفي
  await admin.from("community_posts").update({ status: "hidden" }).eq("id", bPost.id);
  const readHidden = await A.client.from("community_posts").select("id").eq("id", bPost.id);
  check("A لا يقرأ منشورًا أخفاه الإشراف", (readHidden.data?.length ?? 0) === 0,
    `أعاد ${readHidden.data?.length ?? 0} صفًا`);
  const unhideByMember = await B.client
    .from("community_posts").update({ status: "published" }).eq("id", bPost.id).select("id");
  checkRefused("B لا يُحيي منشوره المخفى إداريًا", unhideByMember);
  await admin.from("community_posts").update({ status: "published" }).eq("id", bPost.id);

  const resolveReport = await A.client
    .from("community_content_reports").update({ status: "dismissed" }).eq("reporter_id", A.userId).select("id");
  checkRefused("A لا يغلق بلاغًا بنفسه", resolveReport);

  // ── العضو لا يرفع حالة تعليق نفسه ──
  const unsuspend = await A.client
    .from("community_profiles")
    .update({ status: "suspended" })
    .eq("user_id", A.userId)
    .select("user_id");
  checkRefused("العضو لا يغيّر حالة ملفه", unsuspend);
}

async function cleanup() {
  console.log("\n=== التنظيف ===");
  if (created.objects.length > 0) {
    const { error } = await admin.storage.from("community-media").remove(created.objects);
    console.log(error ? `تعذر حذف ملفات التخزين: ${error.message}` : `حُذفت ${created.objects.length} ملفًا من التخزين`);
  }
  for (const id of created.projects) await admin.from("community_portfolio_projects").delete().eq("id", id);
  for (const id of created.posts) await admin.from("community_posts").delete().eq("id", id);
  for (const id of created.users) {
    await admin.from("community_user_blocks").delete().or(`blocker_id.eq.${id},blocked_id.eq.${id}`);
    await admin.from("community_profiles").delete().eq("user_id", id);
    await admin.auth.admin.deleteUser(id);
  }
  const leftovers = {};
  for (const t of ["community_profiles", "community_posts", "community_post_media", "community_post_likes",
    "community_post_comments", "community_follows", "community_notifications",
    "community_user_blocks", "community_portfolio_projects", "community_portfolio_media"]) {
    const { count } = await admin.from(t).select("*", { count: "exact", head: true });
    leftovers[t] = count ?? -1;
  }
  console.log("عدد الصفوف بعد التنظيف:", JSON.stringify(leftovers));
  const dirty = Object.entries(leftovers).filter(([, n]) => n !== 0);
  console.log(dirty.length === 0 ? "القاعدة عادت فارغة تمامًا" : `تبقّت صفوف: ${JSON.stringify(dirty)}`);
  const { data: leftFiles } = await admin.storage.from("community-media").list("community", { limit: 100 });
  console.log(`مجلدات متبقية في community-media: ${leftFiles?.length ?? 0}`);
}

try {
  await run();
} catch (error) {
  console.log("خطأ غير متوقع:", error.message);
  failures++;
} finally {
  await cleanup();
}

console.log(`\n=== النتيجة: ${results.length - failures}/${results.length} نجحت ===`);
process.exit(failures > 0 ? 1 : 0);
