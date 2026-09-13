/**
 * اختبار حي لعقد «عام أولًا» على بناء إنتاجي يعمل.
 *
 * يثبت ثلاثة أشياء لا يثبتها اختبار ساكن:
 *  - الزائر يتصفح كل صفحة عامة بلا حساب وبلا تحويل.
 *  - الفعل المحمي يأخذه إلى الدخول ويعيده إلى حيث كان.
 *  - المصادقة ليست صلاحية إدارة: عضو المجتمع يُرفض برسالة، لا بارتداد صامت.
 *
 * ينشئ حسابين مؤقتين بمعرّفات صريحة (bmnet-pubfirst-) ثم يحذفهما في
 * finally مهما كانت النتيجة — لا يمس أي بيانات قائمة.
 *
 * التشغيل (يتطلب خادمًا إنتاجيًا على BMNET_BASE، افتراضه :3212):
 *   BMNET_LIVE_AUTH_TEST=1 node supabase/tests/public_first_live.mjs
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { randomBytes } from "node:crypto";

if (process.env.BMNET_LIVE_AUTH_TEST !== "1") {
  console.log("متوقف: يحتاج BMNET_LIVE_AUTH_TEST=1 (ينشئ حسابات مؤقتة على القاعدة).");
  process.exit(0);
}

const BASE = process.env.BMNET_BASE ?? "http://localhost:3212";
const env = Object.fromEntries(
  readFileSync(".env.local", "utf8").split(/\r?\n/)
    .filter((l) => l.includes("=") && !l.startsWith("#"))
    .map((l) => { const i = l.indexOf("="); return [l.slice(0, i), l.slice(i + 1).trim().replace(/^"|"$/g, "")]; }),
);
const svc = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SECRET_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

let pass = 0, fail = 0;
const check = (name, ok, detail = "") => {
  if (ok) { pass++; console.log(`PASS  ${name}`); }
  else { fail++; console.log(`FAIL  ${name}${detail ? " — " + detail : ""}`); }
};
const get = async (path, cookie) => {
  const res = await fetch(`${BASE}${path}`, { headers: cookie ? { cookie } : {}, redirect: "manual" });
  return { status: res.status, loc: res.headers.get("location"), html: res.status === 200 ? await res.text() : "" };
};

/** جرة كوكيز تكفي لجلسة Supabase عبر @supabase/ssr. */
function jar() {
  const store = new Map();
  return {
    header: () => [...store.entries()].map(([k, v]) => `${k}=${v}`).join("; "),
    absorb: (res) => {
      for (const line of res.headers.getSetCookie?.() ?? []) {
        const [pair] = line.split(";");
        const i = pair.indexOf("=");
        const name = pair.slice(0, i).trim(), value = pair.slice(i + 1).trim();
        if (!value || value === '""') store.delete(name); else store.set(name, value);
      }
    },
    has: (prefix) => [...store.keys()].some((k) => k.startsWith(prefix)),
  };
}

/** استدعاء Server Action كما يفعل المتصفح تمامًا. */
async function callAction(cookies, pagePath, actionId, args) {
  const res = await fetch(`${BASE}${pagePath}`, {
    method: "POST",
    headers: { "content-type": "text/plain;charset=UTF-8", "next-action": actionId, cookie: cookies.header() },
    body: JSON.stringify(args),
    redirect: "manual",
  });
  cookies.absorb(res);
  return { status: res.status, body: await res.text() };
}

/* المعرّفات من بيان Next، ثم تمييزها برسالة خطأ معروفة — لا تخمين. */
const manifest = JSON.parse(readFileSync(".next/server/server-reference-manifest.json", "utf8")).node;
const idsFor = (page) => Object.keys(manifest).filter((k) => page in (manifest[k].workers ?? {}));
const communityLoginId = idsFor("app/community/login/page")[0];
let adminLoginId = null;
for (const candidate of idsFor("app/admin/login/page")) {
  const probe = await callAction(jar(), "/admin/login", candidate, ["not-an-email", "wrong-password", undefined]);
  if (probe.body.includes("غير صحيحة") || probe.body.includes("أدخل البريد")) { adminLoginId = candidate; break; }
}

const pw = () => randomBytes(18).toString("base64url");
const accounts = {
  member: { email: "bmnet-pubfirst-member@example.invalid", password: pw() },
  staff: { email: "bmnet-pubfirst-staff@example.invalid", password: pw() },
};
const created = [];

try {
  for (const account of Object.values(accounts)) {
    const { data, error } = await svc.auth.admin.createUser({
      email: account.email, password: account.password, email_confirm: true,
    });
    if (error) throw new Error(`إنشاء ${account.email}: ${error.message}`);
    account.id = data.user.id;
    created.push(account.id);
  }

  await svc.from("community_profiles").insert({
    user_id: accounts.member.id, username: "bmnetpubfirst", display_name: "عضو اختبار مؤقت",
    bio: "حساب اختبار — يُحذف فور انتهاء السيناريو.", experience_level: "beginner",
    specialties: [], status: "active", available_for_work: false,
  });
  const { data: post } = await svc.from("community_posts").insert({
    author_id: accounts.member.id, caption: "منشور اختبار مؤقت.", status: "published", visibility: "public",
  }).select("id").single();

  /* الحساب الإداري المؤقت بأقل دور ذي معنى — لا نمنح اختبارًا أكثر مما يثبته. */
  const { data: roles } = await svc.from("roles").select("id, key, name");
  const role = roles.find((r) => r.key === "content-editor") ?? roles.find((r) => r.key !== "owner");
  await svc.from("profiles").insert({
    id: accounts.staff.id, name: "مشرف اختبار مؤقت", role_id: role.id, status: "active",
  });

  // ── A/B/C: الزائر يتصفح كل شيء عام ───────────────────────────
  const PUBLIC = ["/", "/about", "/courses", "/courses/photography-fundamentals", "/paths", "/blog",
    "/contact", "/corporate-training", "/policies/privacy", "/community", "/community/photographers",
    "/community/u/bmnetpubfirst", "/community/login", "/community/signup"];
  for (const path of PUBLIC) {
    const r = await get(path);
    check(`زائر يفتح ${path}`, r.status === 200, `status=${r.status} loc=${r.loc ?? "-"}`);
  }

  // ── D: مسار الحجز الحالي لا يطلب حسابًا ──────────────────────
  const course = await get("/courses/photography-fundamentals");
  /* لا يصح فحص غياب كلمة «دخول» من الصفحة: الشريط والتذييل يحملان مدخل
     الحساب في كل صفحة وهذا مقصود. العبرة بزر الحجز نفسه — إلى أين يشير. */
  const bookingCta = course.html.slice(course.html.indexOf("احجز مقعدك"), course.html.indexOf("احجز مقعدك") + 400);
  check("D صفحة الدورة تُفتح للزائر بلا تحويل", course.status === 200, `status=${course.status}`);
  check("D زر الحجز يشير إلى واتساب لا إلى الدخول",
    /wa\.me|whatsapp/i.test(bookingCta) && !bookingCta.includes("/community/login"),
    "زر الحجز صار خلف بوابة دخول");

  // ── F: الفعل المحمي يحمل وجهة العودة ─────────────────────────
  const feedPage = await get("/community");
  check("F خلاصة المجتمع تُصيَّر للزائر", feedPage.html.includes("انضم إلى مجتمع بيت المصور"), "لم تظهر دعوة الانضمام");
  check("F دعوتا الدخول والتسجيل تحملان /community",
    feedPage.html.includes("/community/login?next=%2Fcommunity") &&
    feedPage.html.includes("/community/signup?next=%2Fcommunity"), "أُسقطت وجهة العودة");

  const profilePage = await get("/community/u/bmnetpubfirst");
  check("F زر المتابعة معروض للزائر", profilePage.html.includes("متابعة"), "الزر مخفي عن الزائر");

  // ── مدخل الحساب في الشريط والتذييل ───────────────────────────
  const coursesPage = await get("/courses");
  const loginLinks = (coursesPage.html.match(/href="\/community\/login\?next=%2Fcourses"/g) ?? []).length;
  check("N الزائر يرى «تسجيل الدخول» في HTML الساكن", coursesPage.html.includes("تسجيل الدخول"), "");
  check("N ثلاثة مداخل: شريط سطح المكتب + شريط الموبايل + التذييل", loginLinks === 3, `وُجد ${loginLinks}`);
  check("N وكلها تحمل الصفحة الحالية وجهةَ عودة", loginLinks > 0, "");
  check("N ولا يرى «حسابي»", !coursesPage.html.includes("حسابي"), "ظهر مدخل الحساب لزائر");
  check("N الصفحة ما زالت ساكنة (لا جلسة تُقرأ على الخادم)",
    !coursesPage.html.includes("<!--$~-->"), "صارت الصفحة مؤجَّلة");

  const loginPage = await get("/community/login?next=%2Fcommunity%2Fu%2Fbmnetpubfirst");
  check("F نموذج الدخول في HTML لا خلف هيكل تحميل", loginPage.html.includes("كلمة المرور"), "");
  check("F رابط «أنشئ حسابًا» يحمل نفس الوجهة",
    loginPage.html.includes("/community/signup?next=%2Fcommunity%2Fu%2Fbmnetpubfirst"), "");

  for (const hostile of ["https%3A%2F%2Fevil.test", "%2F%2Fevil.test", "%2F%5Cevil.test"]) {
    const r = await get(`/community/login?next=${hostile}`);
    /* Next يردّد رابط الطلب داخل حمولة RSC — صدى لا وجهة. العبرة ألا يحمله رابط. */
    const inAttribute = /(?:href|action|src)="[^"]*evil\.test/.test(r.html);
    check(`F وجهة خارجية تُسقط (${decodeURIComponent(hostile)})`,
      !inAttribute && r.html.includes('href="/community/signup"'), "حُملت وجهة خارجية");
  }

  // ── E/G: بعد الدخول يعود إلى ما كان يفعله ────────────────────
  const member = jar();
  const login = await callAction(member, "/community/login?next=%2Fcommunity", communityLoginId,
    [accounts.member.email, accounts.member.password, "/community"]);
  check("G الدخول نجح", login.body.includes('"ok":true'), `status=${login.status}`);
  check("G وُجِّه إلى وجهة العودة", login.body.includes("/community"), "");
  check("G كوكي جلسة مكتوب", member.has("sb-"), "");

  const asMember = await get("/community", member.header());
  check("G الخلاصة صارت خلاصة عضو", asMember.status === 200 && !asMember.html.includes("انضم إلى مجتمع بيت المصور"), "");
  check("G منطقة الأعضاء انفتحت", (await get("/community/profile", member.header())).status === 200, "");

  // ── N: موجّه /account ────────────────────────────────────────
  const accountGuest = await get("/account");
  check("N زائر على /account يذهب للدخول ويعود إليه",
    accountGuest.status === 307 && (accountGuest.loc ?? "").includes("/community/login?next=%2Faccount"),
    `status=${accountGuest.status} loc=${accountGuest.loc}`);

  const accountMember = await get("/account", member.header());
  check("N العضو يُوجَّه إلى ملفه",
    accountMember.status === 307 && (accountMember.loc ?? "").includes("/community/profile"),
    `status=${accountMember.status} loc=${accountMember.loc}`);

  // ── H/I: الإدارة ──────────────────────────────────────────────
  for (const path of ["/admin", "/admin/courses", "/admin/users", "/admin/settings/general"]) {
    const r = await get(path);
    check(`H زائر على ${path} يُحوَّل لدخول الإدارة`,
      r.status === 307 && (r.loc ?? "").includes("/admin/login?next="), `status=${r.status}`);
  }
  const memberOnAdmin = await get("/admin", member.header());
  check("I عضو المجتمع لا يدخل /admin",
    memberOnAdmin.status === 307 && (memberOnAdmin.loc ?? "").includes("/admin/login"), `status=${memberOnAdmin.status}`);

  const rejected = jar();
  const badAdmin = await callAction(rejected, "/admin/login", adminLoginId,
    [accounts.member.email, accounts.member.password, undefined]);
  check("I دخول الإدارة يرفض حساب المجتمع", badAdmin.body.includes('"ok":false'), "");
  check("I برسالة صريحة لا ارتداد صامت", badAdmin.body.includes("ليس حساب إدارة"), "");
  check("I ولا يُبقي جلسة فتحها", !rejected.has("sb-"), "بقي كوكي جلسة");

  // ── J: حساب إدارة حقيقي ──────────────────────────────────────
  const staff = jar();
  const goodAdmin = await callAction(staff, "/admin/login", adminLoginId,
    [accounts.staff.email, accounts.staff.password, "/admin/courses"]);
  check("J دخول الإدارة نجح", goodAdmin.body.includes('"ok":true'), goodAdmin.body.slice(0, 160));
  check("J يحترم next", goodAdmin.body.includes("/admin/courses"), "");
  const dash = await get("/admin", staff.header());
  check("J اللوحة تُفتح بلا تحويل", dash.status === 200, `status=${dash.status}`);
  check("J صفحة داخلية تُفتح", (await get("/admin/courses", staff.header())).status === 200, "");
  const accountStaff = await get("/account", staff.header());
  check("N الموظف يُوجَّه إلى لوحة التحكم لا إلى ملف مجتمع لا يملكه",
    accountStaff.status === 307 && (accountStaff.loc ?? "").endsWith("/admin"),
    `status=${accountStaff.status} loc=${accountStaff.loc}`);

  // ── لا تسريب لمناطق خاصة ─────────────────────────────────────
  const sitemap = await get("/sitemap.xml");
  for (const secret of ["/admin", "/community/profile", "/community/saved", "/community/media"]) {
    check(`خريطة الموقع بلا ${secret}`, !sitemap.html.includes(`${secret}<`), "");
  }
  if (post) await svc.from("community_posts").delete().eq("id", post.id);
} finally {
  console.log("\n=== التنظيف ===");
  for (const id of created) {
    await svc.from("community_posts").delete().eq("author_id", id);
    await svc.from("community_profiles").delete().eq("user_id", id);
    await svc.from("profiles").delete().eq("id", id);
    await svc.auth.admin.deleteUser(id);
  }
  const { data: after } = await svc.auth.admin.listUsers({ perPage: 200 });
  const stray = after.users.filter((u) => (u.email ?? "").startsWith("bmnet-pubfirst-"));
  console.log(stray.length ? `متبقٍ: ${stray.map((u) => u.email)}` : "حُذفت كل حسابات الاختبار");
  console.log(`\n=== النتيجة: ${pass}/${pass + fail} نجحت ===`);
}
process.exit(fail ? 1 : 0);
