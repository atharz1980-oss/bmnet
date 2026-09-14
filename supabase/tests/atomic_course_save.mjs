/**
 * إثبات ذرّية حفظ الدورة — على دورة مؤقتة تُحذف في النهاية.
 *
 * لا يُختبر التراجع على دورة حقيقية: الغرض إثبات أن الفشل لا يُتلف شيئًا،
 * ولا يصح إثباته بالمخاطرة ببيانات الإنتاج.
 *
 * التشغيل: BMNET_ATOMIC_TEST=1 node supabase/tests/atomic_course_save.mjs
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { randomBytes } from "node:crypto";

if (process.env.BMNET_ATOMIC_TEST !== "1") {
  console.log("متوقف: يحتاج BMNET_ATOMIC_TEST=1 (ينشئ دورة مؤقتة).");
  process.exit(0);
}

const ENV = Object.fromEntries(readFileSync(".env.local", "utf8").split(/\r?\n/)
  .filter((l) => l.includes("=") && !l.startsWith("#"))
  .map((l) => { const i = l.indexOf("="); return [l.slice(0, i), l.slice(i + 1).trim().replace(/^"|"$/g, "")]; }));
const svc = createClient(ENV.NEXT_PUBLIC_SUPABASE_URL, ENV.SUPABASE_SECRET_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const anon = createClient(ENV.NEXT_PUBLIC_SUPABASE_URL, ENV.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, { auth: { persistSession: false } });

let pass = 0, fail = 0; const fails = [];
const check = (n, ok, d = "") => { if (ok) { pass++; console.log(`PASS  ${n}`); } else { fail++; fails.push(n); console.log(`FAIL  ${n}${d ? " — " + d : ""}`); } };

const TAG = randomBytes(4).toString("hex");
const SLUG = `bmnet-atomic-${TAG}`;
let courseId = null;

/** لقطة كاملة لحالة الدورة وأطفالها — بالمعرّفات لا بالعدد وحده. */
async function snapshot(id) {
  const { data: course } = await svc.from("courses").select("*").eq("id", id).single();
  const { data: days } = await svc.from("course_curriculum_days").select("*").eq("course_id", id).order("sort_order");
  const dayIds = (days ?? []).map((d) => d.id);
  const { data: items } = dayIds.length
    ? await svc.from("course_curriculum_items").select("*").in("day_id", dayIds).order("sort_order")
    : { data: [] };
  const { data: sessions } = await svc.from("course_sessions").select("*").eq("course_id", id).order("start_date");
  return {
    course: { name: course.name, price: course.price, publish_status: course.publish_status, duration_days: course.duration_days },
    days: (days ?? []).map((d) => ({ id: d.id, title: d.title, sort_order: d.sort_order })),
    items: (items ?? []).map((i) => ({ id: i.id, day_id: i.day_id, title: i.title, sort_order: i.sort_order })),
    sessions: (sessions ?? []).map((s) => ({ id: s.id, start_date: s.start_date, capacity: s.capacity, registered_count: s.registered_count, location: s.location })),
  };
}
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

const rpc = (id, course, curriculum, sessions) =>
  svc.rpc("save_course_atomic", { p_course_id: id, p_course: course, p_curriculum: curriculum, p_sessions: sessions });

try {
  const { data: trainer } = await svc.from("trainers").select("id").limit(1).single();
  const baseCourse = {
    slug: SLUG, name: `دورة اختبار الذرّية ${TAG}`, short_description: "مؤقتة", description: "مؤقتة",
    category: "in-person-individuals", level: "beginner", language: "ar", trainer_id: trainer.id,
    image_path: "", image_alt: "", price: 100, original_price: null, discount_percent: null,
    show_price: true, is_free: false, request_quote: false, duration_days: 2, duration_hours: 6,
    outcomes: ["أ"], audience: ["ب"], requirements: ["ج"], featured: false,
    publish_status: "draft", operational_status: null, seo_title: null, seo_description: null,
  };
  const baseCurriculum = [
    { id: null, title: "اليوم الأول", items: [{ id: null, title: "بند ١", description: null }, { id: null, title: "بند ٢", description: null }] },
    { id: null, title: "اليوم الثاني", items: [{ id: null, title: "بند ٣", description: null }] },
  ];
  const baseSessions = [
    { id: null, batch_name: "دفعة ١", start_date: "2026-12-01", end_date: "2026-12-03", start_time: "18:00", end_time: "21:00", location: "جدة", city: "جدة", capacity: 10, registered_count: 2, price_override: null, status: "open" },
    { id: null, batch_name: "دفعة ٢", start_date: "2026-12-15", end_date: "2026-12-17", start_time: "18:00", end_time: "21:00", location: "جدة", city: "جدة", capacity: 8, registered_count: 0, price_override: null, status: "open" },
  ];

  /* ── إنشاء ─────────────────────────────────────────────────── */
  const created = await rpc(null, baseCourse, baseCurriculum, baseSessions);
  check("إنشاء الدورة بالـRPC", !created.error && Boolean(created.data), created.error?.message);
  courseId = created.data;
  const s0 = await snapshot(courseId);
  check("أُنشئ المنهج (يومان، 3 بنود) والمواعيد (2)",
    s0.days.length === 2 && s0.items.length === 3 && s0.sessions.length === 2,
    `أيام=${s0.days.length} بنود=${s0.items.length} مواعيد=${s0.sessions.length}`);

  /* ── A) نجاح: تعديل الدورة والمنهج والمواعيد معًا ──────────── */
  const editCurriculum = [
    { id: s0.days[0].id, title: "اليوم الأول — معدَّل", items: [
      { id: s0.items.find((i) => i.day_id === s0.days[0].id).id, title: "بند ١ معدَّل", description: "وصف" },
      { id: null, title: "بند جديد", description: null },
    ] },
    { id: s0.days[1].id, title: "اليوم الثاني", items: [{ id: s0.items.find((i) => i.day_id === s0.days[1].id).id, title: "بند ٣", description: null }] },
    { id: null, title: "اليوم الثالث — جديد", items: [{ id: null, title: "بند ٤", description: null }] },
  ];
  const editSessions = [
    { ...baseSessions[0], id: s0.sessions[0].id, capacity: 12, registered_count: 3 },
    { id: null, batch_name: "دفعة ٣", start_date: "2027-01-10", end_date: "2027-01-12", start_time: "17:00", end_time: "20:00", location: "الرياض", city: "الرياض", capacity: 5, registered_count: 1, price_override: null, status: "open" },
  ];
  const saved = await rpc(courseId, { ...baseCourse, name: `${baseCourse.name} — محدَّثة`, price: 150 }, editCurriculum, editSessions);
  check("A حفظ ناجح للدورة والمنهج والمواعيد معًا", !saved.error, saved.error?.message);
  const s1 = await snapshot(courseId);
  check("A بيانات الدورة تحدّثت", s1.course.name.endsWith("محدَّثة") && Number(s1.course.price) === 150, `${s1.course.name} / ${s1.course.price}`);
  check("A المنهج صار 3 أيام و4 بنود", s1.days.length === 3 && s1.items.length === 4, `أيام=${s1.days.length} بنود=${s1.items.length}`);
  check("A المواعيد صارت 2 والقديم الباقي حافظ على هويته",
    s1.sessions.length === 2 && s1.sessions.some((x) => x.id === s0.sessions[0].id), "");
  check("A الموعد المحذوف من الحمولة أُزيل", !s1.sessions.some((x) => x.id === s0.sessions[1].id), "");
  check("A اليومان القديمان حافظا على معرّفيهما",
    s1.days.some((d) => d.id === s0.days[0].id) && s1.days.some((d) => d.id === s0.days[1].id), "");
  check("A لا بنود يتيمة", s1.items.every((i) => s1.days.some((d) => d.id === i.day_id)), "");

  /* ── B) فشل متعمد بعد بدء المعاملة وبعد كتابة المنهج ───────── */
  const before = await snapshot(courseId);
  /* الموعد الأخير ينتهك CHECK(registered_count <= capacity) — ويقع بعد
     كتابة المنهج كاملًا، فيثبت التراجع عبر الدالة لا داخل خطوة واحدة. */
  const poisonCurriculum = [{ id: null, title: "يوم يجب ألا يبقى", items: [{ id: null, title: "بند يجب ألا يبقى", description: null }] }];
  const poisonSessions = [
    { id: null, batch_name: "سليم", start_date: "2027-02-01", end_date: "2027-02-02", start_time: "18:00", end_time: "20:00", location: "ج", city: "ج", capacity: 5, registered_count: 1, price_override: null, status: "open" },
    { id: null, batch_name: "مسموم", start_date: "2027-03-01", end_date: "2027-03-02", start_time: "18:00", end_time: "20:00", location: "ج", city: "ج", capacity: 1, registered_count: 999, price_override: null, status: "open" },
  ];
  const rolled = await rpc(courseId, { ...baseCourse, name: "اسم يجب ألا يبقى", price: 999 }, poisonCurriculum, poisonSessions);
  check("B الـRPC أعادت فشلًا", Boolean(rolled.error), "نجحت رغم الانتهاك — لا تراجع");
  check("B ورمز الخطأ قيد تحقق لا خطأ عام", /23514|check constraint|registered_within_capacity/i.test(`${rolled.error?.code} ${rolled.error?.message}`), `${rolled.error?.code}: ${rolled.error?.message?.slice(0, 90)}`);

  const after = await snapshot(courseId);
  check("B بيانات الدورة لم تتغير حرفيًا", same(before.course, after.course), `${JSON.stringify(after.course)}`);
  check("B المنهج لم يتغير حرفيًا (المعرّفات والترتيب)", same(before.days, after.days), `${before.days.length} → ${after.days.length}`);
  check("B بنود المنهج لم تتغير حرفيًا", same(before.items, after.items), `${before.items.length} → ${after.items.length}`);
  check("B المواعيد لم تتغير حرفيًا", same(before.sessions, after.sessions), `${before.sessions.length} → ${after.sessions.length}`);
  check("B لا إدراج جزئي: لا أثر لليوم المسموم", !after.days.some((d) => d.title.includes("يجب ألا يبقى")), "");
  check("B ولا للموعد السليم الذي رافق المسموم", !after.sessions.some((s) => s.start_date === "2027-02-01"), "");
  check("B ولا حذف جزئي: العدد كما كان", after.days.length === before.days.length && after.sessions.length === before.sessions.length, "");
  const { data: orphanItems } = await svc.from("course_curriculum_items").select("id, day_id");
  const { data: allDays } = await svc.from("course_curriculum_days").select("id");
  check("B لا صفوف يتيمة في القاعدة كلها",
    (orphanItems ?? []).every((i) => (allDays ?? []).some((d) => d.id === i.day_id)), "");

  /* ── التفويض ───────────────────────────────────────────────── */
  const anonCall = await anon.rpc("save_course_atomic", { p_course_id: courseId, p_course: baseCourse, p_curriculum: [], p_sessions: [] });
  check("التفويض: زائر لا يستطيع استدعاء الـRPC", Boolean(anonCall.error), "نجح الاستدعاء — خطر");
  const email = `bmnet-atomic-${TAG}@example.invalid`, password = randomBytes(18).toString("base64url");
  const { data: made } = await svc.auth.admin.createUser({ email, password, email_confirm: true });
  const tok = await (await fetch(`${ENV.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: "POST", headers: { apikey: ENV.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, "content-type": "application/json" },
    body: JSON.stringify({ email, password }) })).json();
  const member = createClient(ENV.NEXT_PUBLIC_SUPABASE_URL, ENV.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
    auth: { persistSession: false }, global: { headers: { Authorization: `Bearer ${tok.access_token}` } } });
  const memberCall = await member.rpc("save_course_atomic", { p_course_id: courseId, p_course: { ...baseCourse, name: "اختراق" }, p_curriculum: [], p_sessions: [] });
  check("التفويض: عضو عادي لا يستطيع استدعاءها", Boolean(memberCall.error), "نجح الاستدعاء — خطر");
  const afterAuth = await snapshot(courseId);
  check("التفويض: ولا أثر لمحاولتيهما", same(after, afterAuth), "تغيّرت البيانات");
  await svc.auth.admin.deleteUser(made.user.id);

  /* ── التزامن ───────────────────────────────────────────────── */
  const mk = (n) => ({
    course: { ...baseCourse, name: `تزامن-${n}` },
    curriculum: [{ id: null, title: `يوم-${n}`, items: [{ id: null, title: `بند-${n}`, description: null }] }],
    sessions: [{ id: null, batch_name: `دفعة-${n}`, start_date: n === 1 ? "2027-05-01" : "2027-06-01", end_date: null, start_time: "18:00", end_time: "20:00", location: "ج", city: "ج", capacity: 5, registered_count: 0, price_override: null, status: "open" }],
  });
  const [r1, r2] = await Promise.all([
    rpc(courseId, mk(1).course, mk(1).curriculum, mk(1).sessions),
    rpc(courseId, mk(2).course, mk(2).curriculum, mk(2).sessions),
  ]);
  check("التزامن: كلا الحفظين انتهى بلا خطأ", !r1.error && !r2.error, `${r1.error?.message ?? ""} ${r2.error?.message ?? ""}`);
  const conc = await snapshot(courseId);
  const isOne = conc.days.length === 1 && conc.items.length === 1 && conc.sessions.length === 1;
  const consistent = isOne && ((conc.course.name === "تزامن-1" && conc.days[0].title === "يوم-1" && conc.sessions[0].start_date === "2027-05-01")
    || (conc.course.name === "تزامن-2" && conc.days[0].title === "يوم-2" && conc.sessions[0].start_date === "2027-06-01"));
  check("التزامن: الحالة النهائية إحدى الحمولتين كاملةً لا مزيجًا",
    consistent, `اسم=${conc.course.name} أيام=${conc.days.length} بنود=${conc.items.length} مواعيد=${conc.sessions.length}`);
} finally {
  if (courseId) {
    await svc.from("courses").delete().eq("id", courseId); // CASCADE يزيل الأطفال
    const { count: leftD } = await svc.from("course_curriculum_days").select("*", { count: "exact", head: true }).eq("course_id", courseId);
    const { count: leftS } = await svc.from("course_sessions").select("*", { count: "exact", head: true }).eq("course_id", courseId);
    console.log(`\nحُذفت الدورة المؤقتة — أيام متبقية=${leftD} مواعيد متبقية=${leftS}`);
  }
  const { data: stray } = await svc.from("courses").select("slug").like("slug", "bmnet-atomic-%");
  console.log(stray?.length ? `دورات اختبار متبقية: ${stray.map((c) => c.slug)}` : "لا دورات اختبار متبقية");
  console.log(`\nالنتيجة: ${pass}/${pass + fail}`);
  if (fails.length) console.log("FAILS:", fails.join(" | "));
  process.exit(fail ? 1 : 0);
}
