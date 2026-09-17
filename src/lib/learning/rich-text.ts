/**
 * نص الدرس — مجموعة صغيرة من Markdown، آمنة بالبناء.
 *
 * الدرس النصي يحتاج عناوين وفقرات وغامقًا وقوائم وروابط. لا عمود جديد في
 * القاعدة: النص يُحفظ في `description` كما هو، ويُحوَّل هنا عند العرض.
 *
 * الأمان مبني على الترتيب لا على التنقية: **نهرب كل محارف HTML أولًا**، ثم
 * نطبّق تحويلات محدودة على النص المهروب. فلا يوجد مسار يمر به وسم من
 * المُدخَل إلى الناتج — ولا حاجة لمنقٍّ خارجي ولا لقائمة منع.
 *
 * الروابط وحدها تُركَّب، وبروتوكولها محصور في http/https وmailto؛ وما عداه
 * يبقى نصًّا. لا `javascript:` ولا `data:` ولا وسم `<a>` من المستخدم.
 */

const ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => ESCAPES[char] ?? char);
}

/** بروتوكولات مقبولة فقط — ما عداها يُعرض كنص. */
function safeHref(raw: string): string | null {
  const url = raw.trim();
  if (!/^(https?:\/\/|mailto:|\/)/i.test(url)) return null;
  /* المحارف التي قد تكسر السمة أو تُهرّب منها. */
  if (/[\s"'<>`]/.test(url)) return null;
  return url;
}

/** غامق ثم روابط — على نصّ مهروب سلفًا. */
function inline(escaped: string): string {
  let out = escaped.replace(/\*\*([^*\n]+)\*\*/g, "<strong>$1</strong>");
  out = out.replace(/\[([^\]\n]+)\]\(([^)\s]+)\)/g, (match, text: string, href: string) => {
    const safe = safeHref(href);
    if (!safe) return match;
    const external = /^https?:\/\//i.test(safe);
    const rel = external ? ' target="_blank" rel="noopener noreferrer"' : "";
    return `<a href="${safe}" class="text-brand-700 underline underline-offset-2"${rel}>${text}</a>`;
  });
  return out;
}

/**
 * يحوّل نص الدرس إلى HTML موثوق.
 * المدعوم: `##` و`###` عناوين، فقرات، `**غامق**`، `- ` و`1. ` قوائم،
 * `[نص](رابط)`. وكل ما عدا ذلك يبقى نصًّا عاديًا.
 */
export function renderLessonHtml(source: string): string {
  const escaped = escapeHtml(source.replace(/\r\n/g, "\n"));
  const lines = escaped.split("\n");
  const out: string[] = [];
  let list: { type: "ul" | "ol"; items: string[] } | null = null;
  let paragraph: string[] = [];

  const flushParagraph = () => {
    if (paragraph.length === 0) return;
    out.push(`<p class="mb-4 leading-relaxed">${inline(paragraph.join(" "))}</p>`);
    paragraph = [];
  };
  const flushList = () => {
    if (!list) return;
    const cls = list.type === "ul" ? "mb-4 list-disc space-y-1.5 ps-5" : "mb-4 list-decimal space-y-1.5 ps-5";
    out.push(`<${list.type} class="${cls}">${list.items.map((i) => `<li>${inline(i)}</li>`).join("")}</${list.type}>`);
    list = null;
  };

  for (const line of lines) {
    const text = line.trim();
    if (text === "") {
      flushParagraph();
      flushList();
      continue;
    }
    const heading = /^(#{2,3})\s+(.*)$/.exec(text);
    if (heading) {
      flushParagraph();
      flushList();
      const level = heading[1].length === 2 ? "h2" : "h3";
      const cls = level === "h2" ? "mt-6 mb-3 text-xl font-bold" : "mt-5 mb-2 text-lg font-bold";
      out.push(`<${level} class="${cls}">${inline(heading[2])}</${level}>`);
      continue;
    }
    const bullet = /^[-*]\s+(.*)$/.exec(text);
    if (bullet) {
      flushParagraph();
      if (list?.type !== "ul") { flushList(); list = { type: "ul", items: [] }; }
      list.items.push(bullet[1]);
      continue;
    }
    const numbered = /^\d+[.)]\s+(.*)$/.exec(text);
    if (numbered) {
      flushParagraph();
      if (list?.type !== "ol") { flushList(); list = { type: "ol", items: [] }; }
      list.items.push(numbered[1]);
      continue;
    }
    flushList();
    paragraph.push(text);
  }
  flushParagraph();
  flushList();
  return out.join("");
}

/** ملخّص نصّي بلا ترميز — للبطاقات ووصف الصفحة. */
export function lessonPlainText(source: string, limit = 160): string {
  const plain = source
    .replace(/\r\n/g, "\n")
    .replace(/^#{2,3}\s+/gm, "")
    .replace(/^[-*]\s+/gm, "")
    .replace(/^\d+[.)]\s+/gm, "")
    .replace(/\*\*([^*\n]+)\*\*/g, "$1")
    .replace(/\[([^\]\n]+)\]\([^)\s]+\)/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
  return plain.length > limit ? `${plain.slice(0, limit - 1)}…` : plain;
}
