/**
 * حجز المقاعد — ما لا يحتاج قاعدة بيانات ليُثبت.
 *
 * التزامن يُختبر حيًّا (supabase/tests/session_seats_live.test.ts). هنا ما
 * تخطّته تلك الاختبارات لأنها تنادي القاعدة مباشرة: صياغة ما يقرؤه الزائر،
 * وترجمة خطأ القاعدة إلى عربية مفهومة، وأن لوحة الإدارة ما زالت موصولة.
 */

import { describe, expect, mock, test } from "bun:test";
import { readFileSync } from "node:fs";

mock.module("server-only", () => ({}));

const read = (path: string) => readFileSync(path, "utf8");
const code = (path: string) => read(path).replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

describe("seat counts read as Arabic, not as a template", () => {
  test("each number takes its own form", async () => {
    const { formatSeats } = await import("../src/lib/format");
    expect(formatSeats(0)).toBe("0 مقعدًا");
    expect(formatSeats(1)).toBe("مقعد واحد");
    expect(formatSeats(2)).toBe("مقعدان");
    expect(formatSeats(3)).toBe("3 مقاعد");
    expect(formatSeats(10)).toBe("10 مقاعد");
    /* «12 مقاعد» خطأ نحوي يقرؤه كل زائر — التمييز مفرد منصوب من 11. */
    expect(formatSeats(12)).toBe("12 مقعدًا");
    expect(formatSeats(1200)).toBe("1,200 مقعدًا");
  });

  test("no page writes the count by hand any more", () => {
    for (const path of [
      "src/components/courses/session-picker.tsx",
      "src/components/courses/course-card.tsx",
      "src/components/courses/course-details.tsx",
    ]) {
      expect(code(path)).toContain("formatSeats");
      expect(code(path)).not.toMatch(/\{[^}]*seatsLeft[^}]*\}\s*مقاعد/);
    }
  });
});

describe("a database refusal reaches the customer as a sentence", () => {
  /* خطأ supabase-js كائن `{ message, code }` لا `Error`. قراءته بـString
     تعطي "[object Object]"، فيضيع السبب ويصل نص عام لكل حالة — وهذا ما
     كان يحدث فعلًا قبل هذا الاختبار. */
  const source = read("src/lib/payments/purchase.ts");

  test("the mapper reads the message field, not the object", () => {
    const mapper = source.slice(
      source.indexOf("function seatErrorMessage"),
      source.indexOf("export type CommercialMode"),
    );
    expect(mapper).toContain('"message" in error');
    expect(mapper).toMatch(/String\(\s*\(error as \{ message\?: unknown \}\)\.message/);
  });

  test("every refusal the claim can raise has Arabic waiting for it", () => {
    const sql = read("supabase/migrations/20260918091000_session_seat_reservations.sql");
    const claim = sql.slice(
      sql.indexOf("function public.claim_session_seat"),
      sql.indexOf("function public.release_session_seat"),
    );
    const raised = [...claim.matchAll(/raise exception '([a-z_]+)'/g)].map((match) => match[1]);
    expect(raised.length).toBeGreaterThan(8);
    const mapped = source.slice(source.indexOf("const SEAT_ERRORS"), source.indexOf("function seatErrorMessage"));
    for (const codeName of raised) expect(mapped).toContain(`${codeName}:`);
  });

  test("a named session is asked of the database, never refused from cache", () => {
    /* القراءة قد تسبق امتلاء المقعد بلحظة؛ من اختار موعدًا يستحق جواب
       القاعدة عنه لا «لا توجد مواعيد». */
    const flow = code("src/lib/payments/purchase.ts");
    expect(flow).not.toMatch(/if \(requirement\.selectable\.length === 0\) \{\s*return/);
    expect(flow.match(/if \(!sessionId\) \{/g)?.length).toBe(2);
  });
});

describe("the admin panel still shows what the owner must see", () => {
  const tab = code("src/components/admin/courses/editor/sessions-tab.tsx");
  const panel = code("src/components/admin/courses/editor/session-seats-panel.tsx");

  test("the seats panel is wired into the sessions tab", () => {
    expect(tab).toContain("SessionSeatsPanel");
    expect(tab).toContain("courseId");
  });

  test("the manual count is labelled as manual, in both places", () => {
    expect(tab).toContain("مسجلون يدويًا");
    expect(panel).toContain("مسجلون يدويًا");
  });

  test("a paid purchase with no seat is visible, not buried", () => {
    /* JSX يكسر النص عبر أسطر ويجمعه المتصفح — نقارن كما يُقرأ لا كما يُكتب. */
    const rendered = panel.replace(/\s+/g, " ");
    expect(rendered).toContain("«مدفوع بلا مقعد»");
    expect(read("src/app/admin/actions/session-seats.ts")).toContain("seat_unavailable");
  });

  test("cancelled is a status of its own, not a synonym for closed", () => {
    expect(read("src/components/admin/courses/course-meta.ts")).toContain('{ value: "cancelled", label: "ملغاة" }');
    expect(panel).toContain("ملغاة");
  });
});

describe("the guards speak Arabic before the browser sees Postgres", () => {
  test("every database guard has a sentence in the mapper", async () => {
    const { toArabicDbError } = await import("../src/lib/cms/result");
    const messages = [
      "session_has_seats",
      "capacity_below_taken",
      "session_full",
      "session_not_open",
      "session_in_past",
      "session_capacity_unset",
      "seat_in_other_session",
    ].map((codeName) => toArabicDbError({ message: codeName }, "حفظ"));
    for (const message of messages) {
      expect(message).not.toContain("_");
      expect(message.length).toBeGreaterThan(10);
    }
    expect(new Set(messages).size).toBe(messages.length);
  });
});
