/**
 * حارس «تغيير ألوان الهوية فقط» لملفات محمية.
 *
 * لا يطبّع الأسطر ثم يقارنها (فذلك يقبل أي تبديل يقع في موضع لون)، بل يشترط:
 *  1. الملف معدَّل فقط (لا ملف جديد ولا محذوف ولا منقول).
 *  2. كل كتلة تغيير تحذف وتضيف العدد نفسه من الأسطر، ويقابل كل سطر نظيره.
 *  3. كل سطرين متقابلين لهما عدد الكلمات نفسه، وكل كلمة مختلفة زوجٌ من قائمة التحويلات
 *     المعتمدة للمرحلة B3 بالضبط — بالبادئة نفسها (hover: …) وبما يحيط بها حرفيًا
 *     (علامات التنصيص والأقواس). أي تغيير آخر في نص أو سعر أو رابط أو خاصية أو منطق يُرفض.
 */

/** فئة لون واحدة داخل الكلمة: بادئات المتغيرات (hover:, focus-visible:, group-open:…) ثم الاسم */
const UTILITY = /(?<![\w:-])((?:[a-z-]+:)*)((?:bg|text|border|ring|fill|stroke|shadow|outline|from|to|via)-[a-z0-9-]+(?:\/\d+)?)(?![\w/-])/g;

const APPROVED: ((from: string, to: string) => boolean)[] = [
  /* حالات دلالية: من سلم الهوية إلى سلم الخطر بالدرجة نفسها */
  (a, b) => /^(\w+)-brand-(\d{2,3})(\/\d+)?$/.test(a) && b === a.replace(/-brand-(\d{2,3})/, "-danger-$1"),
  /* نص فحمي على التعبئة البرتقالية */
  (a, b) => a === "text-white" && b === "text-brand-ink",
  /* …ومنه النص الأبيض الشفاف على التعبئة (70% منه على البرتقالي = 2.46:1) — يصبح فحميًا صلبًا */
  (a, b) => /^text-white\/\d{1,2}$/.test(a) && b === "text-brand-ink",
  /* مرور أفتح تحت النص الفحمي */
  (a, b) => a === "bg-brand-700" && b === "bg-brand-500",
  /* نص برتقالي على الفاتح: 500/600 ← 700، ومروره 700 ← 800 */
  (a, b) => /^text-brand-(500|600)$/.test(a) && b === "text-brand-700",
  (a, b) => a === "text-brand-700" && b === "text-brand-800",
];

/** الأحمر القديم المكتوب حرفيًا ← رمز البرتقالي (داخل قيمة Tailwind اعتباطية) */
const HEX_SWAP = ["rgba(217,38,50,0.18)", "color-mix(in_oklab,var(--brand-600)_18%,transparent)"] as const;

/** الكلمة مقسومة: ما بين فئات الألوان (يجب أن يبقى حرفيًا) والفئات نفسها */
function splitUtilities(token: string) {
  const gaps: string[] = [];
  const utilities: { prefix: string; name: string }[] = [];
  let last = 0;
  for (const m of token.matchAll(UTILITY)) {
    gaps.push(token.slice(last, m.index));
    utilities.push({ prefix: m[1], name: m[2] });
    last = m.index! + m[0].length;
  }
  gaps.push(token.slice(last));
  return { gaps, utilities };
}

/** سبب الرفض، أو null إن كان الزوج تحويلًا معتمدًا */
export function rejectTokenChange(a: string, b: string): string | null {
  if (a === b) return null;
  if (a.includes(HEX_SWAP[0]) && b === a.replace(HEX_SWAP[0], HEX_SWAP[1])) return null;
  const x = splitUtilities(a);
  const y = splitUtilities(b);
  if (x.utilities.length === 0 || x.utilities.length !== y.utilities.length) return `not a colour utility change: ${a} -> ${b}`;
  if (x.gaps.some((gap, i) => gap !== y.gaps[i])) return `characters around the colour changed: ${a} -> ${b}`;
  for (let i = 0; i < x.utilities.length; i++) {
    const [u, v] = [x.utilities[i], y.utilities[i]];
    if (u.prefix !== v.prefix) return `variant prefix changed: ${a} -> ${b}`;
    if (u.name === v.name || APPROVED.some((ok) => ok(u.name, v.name))) continue;
    return `colour change not in the approved B3 list: ${a} -> ${b}`;
  }
  return null;
}

/*
 * الإضافة الوحيدة المسموحة: «text-brand-ink» مرة واحدة على تعبئة برتقالية رسمية كان نصها موروثًا
 * (أبيض على #E65A2E = 3.58:1). بقية السطر يجب أن يبقى حرفيًا.
 */
function isInheritedInkFix(before: string, after: string) {
  if (!after.includes(" text-brand-ink") || after.split(" text-brand-ink").length !== 2) return false;
  if (after.replace(" text-brand-ink", "") !== before) return false;
  const classes = [...before.matchAll(UTILITY)].map((m) => m[1] + m[2]);
  return classes.includes("bg-brand-600") && !classes.some((c) => /^text-(white|black|brand-|charcoal-|danger-|\[)/.test(c));
}

export function rejectLineChange(before: string, after: string): string | null {
  if (isInheritedInkFix(before, after)) return null;
  const a = before.trim().split(/\s+/);
  const b = after.trim().split(/\s+/);
  if (a.length !== b.length) return `word count changed:\n- ${before.trim()}\n+ ${after.trim()}`;
  for (let i = 0; i < a.length; i++) {
    const why = rejectTokenChange(a[i], b[i]);
    if (why) return `${why}\n- ${before.trim()}\n+ ${after.trim()}`;
  }
  return null;
}

/** يفحص ناتج `git diff -U0` لملف واحد أو أكثر؛ يعيد قائمة الأسباب (فارغة = تغيير ألوان فقط) */
export function colourOnlyViolations(unifiedDiff: string): string[] {
  const problems: string[] = [];
  let file = "";
  let minus: string[] = [];
  let plus: string[] = [];
  const flush = () => {
    if (minus.length !== plus.length) problems.push(`${file}: lines added or removed (${minus.length} -> ${plus.length})`);
    else minus.forEach((line, i) => {
      const why = rejectLineChange(line, plus[i]);
      if (why) problems.push(`${file}: ${why}`);
    });
    minus = [];
    plus = [];
  };
  for (const line of unifiedDiff.split("\n")) {
    if (line.startsWith("diff --git")) { flush(); file = line.split(" b/")[1] ?? line; continue; }
    if (/^(new|deleted) file mode|^rename (from|to)|^similarity index|^Binary files/.test(line)) problems.push(`${file}: ${line}`);
    if (line.startsWith("@@")) { flush(); continue; }
    if (line.startsWith("---") || line.startsWith("+++") || line.startsWith("index ") || line.startsWith("\\")) continue;
    if (line.startsWith("-")) minus.push(line.slice(1));
    else if (line.startsWith("+")) plus.push(line.slice(1));
  }
  flush();
  return problems;
}
