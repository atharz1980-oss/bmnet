/**
 * نص الدرس آمن بالبناء لا بالتنقية.
 *
 * الترتيب هو الضمان: يُهرَّب كل محرف HTML أولًا، ثم تُطبَّق تحويلات محدودة
 * على النص المهروب. فلا مسار يمر به وسم من مُدخَل المحرر إلى الناتج، ولا
 * حاجة لقائمة منع تُنسى بندًا.
 */
import { describe, expect, test } from "bun:test";

import { escapeHtml, lessonPlainText, renderLessonHtml } from "../src/lib/learning/rich-text";

/** wosum */
const tags = (html: string) => [...html.matchAll(/<([a-z0-9]+)[\s>]/g)].map((m) => m[1]);

describe("nothing from the input can become markup", () => {
  test("a script tag comes out as text", () => {
    const html = renderLessonHtml('<script>alert("x")</script>');
    expect(html).not.toContain("<script");
    expect(html).toContain("&lt;script&gt;");
  });

  test("an event handler cannot be smuggled through an image", () => {
    const html = renderLessonHtml('<img src=x onerror="alert(1)">');
    expect(html).not.toContain("<img");
    expect(html).toContain("&lt;img");
    expect(tags(html)).toEqual(["p"]);
  });

  test("quotes and ampersands are escaped before any transform", () => {
    expect(escapeHtml(`&<>"'`)).toBe("&amp;&lt;&gt;&quot;&#39;");
  });

  test("bold does not let a tag through", () => {
    const html = renderLessonHtml("**<b>x</b>**");
    expect(html).toContain("<strong>");
    expect(html).not.toContain("<b>");
  });
});

describe("links are built, never accepted", () => {
  test("http and https become anchors that cannot reach back", () => {
    const html = renderLessonHtml("[بيت المصور](https://baytalmosawer.net)");
    expect(html).toContain('href="https://baytalmosawer.net"');
    expect(html).toContain('rel="noopener noreferrer"');
    expect(html).toContain('target="_blank"');
  });

  test("an internal path is allowed and stays in the tab", () => {
    const html = renderLessonHtml("[الدورات](/courses)");
    expect(html).toContain('href="/courses"');
    expect(html).not.toContain("target=");
  });

  test("javascript: is refused and stays plain text", () => {
    const html = renderLessonHtml("[اضغط](javascript:alert(1))");
    expect(html).not.toContain("<a ");
    expect(html).not.toContain("href=");
    expect(tags(html)).toEqual(["p"]);
  });

  test("data: is refused too", () => {
    const html = renderLessonHtml("[x](data:text/html,<script>1</script>)");
    expect(html).not.toContain("<a ");
    expect(html).not.toContain("href=");
    expect(tags(html)).toEqual(["p"]);
  });

  test("a url carrying a quote cannot break out of the attribute", () => {
    const html = renderLessonHtml('[x](https://a.com" onmouseover="alert(1))');
    expect(html).not.toContain("<a ");
    expect(tags(html)).toEqual(["p"]);
  });
});

describe("the supported subset renders", () => {
  test("headings", () => {
    expect(renderLessonHtml("## عنوان")).toContain("<h2");
    expect(renderLessonHtml("### فرعي")).toContain("<h3");
  });

  test("paragraphs join wrapped lines and split on blank lines", () => {
    const html = renderLessonHtml("سطر أول\nتكملة\n\nفقرة ثانية");
    expect(html.match(/<p /g)?.length).toBe(2);
  });

  test("bullet and numbered lists", () => {
    const ul = renderLessonHtml("- أول\n- ثانٍ");
    expect(ul).toContain("<ul");
    expect(ul.match(/<li>/g)?.length).toBe(2);
    const ol = renderLessonHtml("1. أول\n2. ثانٍ");
    expect(ol).toContain("<ol");
  });

  test("a list ends cleanly before a heading", () => {
    const html = renderLessonHtml("- بند\n\n## بعدها");
    expect(html.indexOf("</ul>")).toBeLessThan(html.indexOf("<h2"));
  });

  test("empty input renders nothing at all", () => {
    expect(renderLessonHtml("")).toBe("");
    expect(renderLessonHtml("   \n\n  ")).toBe("");
  });

  test("lists use logical padding — the page is RTL", () => {
    expect(renderLessonHtml("- بند")).toContain("ps-5");
    expect(renderLessonHtml("- بند")).not.toContain("pl-5");
  });
});

describe("plain text summary", () => {
  test("strips the markup characters", () => {
    expect(lessonPlainText("## عنوان\n\n**غامق** و[رابط](https://a.com)")).toBe("عنوان غامق ورابط");
  });

  test("and truncates with an ellipsis", () => {
    expect(lessonPlainText("ا".repeat(300), 20)).toHaveLength(20);
    expect(lessonPlainText("ا".repeat(300), 20).endsWith("…")).toBe(true);
  });
});
