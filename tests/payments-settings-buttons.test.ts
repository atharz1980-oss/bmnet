/**
 * أزرار مفاتيح الدفع تقول لماذا هي معطّلة.
 *
 * بلاغ المالك: «الأزرار لا تعمل» في /admin/settings/payments. لم تكن معطوبة:
 * `PAYMENTS_ENCRYPTION_KEY` غير مضبوط على الخادم فتُعطَّل كلها، وزر معطّل في
 * هذا التصميم يبتلع النقرة (`disabled:pointer-events-none`) بلا مؤشر ولا
 * تلميح. التحذير أعلى الصفحة كان ظاهرًا ولم يُربط بالأزرار.
 *
 * الحراسة هنا على أن يبقى السبب مطبوعًا بجانب الأزرار، وعلى ألا يعود
 * التعطيل عَلَمًا منطقيًا بلا نص.
 */
import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";

const read = (p: string) => readFileSync(p, "utf8").replace(/\r\n/g, "\n");
const VIEW = "src/components/admin/settings/payments-preparation.tsx";
const PAGE = "src/app/admin/(dashboard)/settings/payments/page.tsx";

describe("the reason travels with the disabled state", () => {
  const source = read(VIEW);

  test("the card receives a reason, not a bare boolean", () => {
    expect(source).toContain("reason: string | null;");
    /* لو عاد `disabled` مُمرَّرًا للبطاقة أمكن تعطيلها بلا سبب. */
    expect(source).not.toMatch(/configuration: ProviderConfiguration \| undefined;\n\s*disabled: boolean;/);
    expect(source).toContain("const disabled = reason !== null;");
  });

  test("and the card prints it beside the buttons", () => {
    const card = source.slice(source.indexOf("function CredentialCard("));
    const buttons = card.indexOf("حذف المفاتيح");
    const note = card.indexOf("{hint ? (");
    expect(note).toBeGreaterThan(buttons);
    expect(card).toContain("{hint}");
  });

  test("a card with no saved keys explains its own two disabled buttons", () => {
    /* تعطيل سليم — لكنه كان صامتًا مثل الآخر. */
    expect(source).toContain("«اختبار الاتصال» و«حذف المفاتيح» يحتاجان مفاتيح محفوظة");
    expect(source).toContain("hint =\n    reason ??");
  });
});

describe("credentialsBlocker names every blocker", () => {
  const body = (() => {
    const source = read(VIEW);
    const start = source.indexOf("function credentialsBlocker(");
    expect(start).toBeGreaterThan(-1);
    return source.slice(start, source.indexOf("\nfunction DepositForm("));
  })();

  test("the missing encryption key is named, since only the host can fix it", () => {
    expect(body).toContain("PAYMENTS_ENCRYPTION_KEY");
    expect(body).toContain("!encryptionReady");
  });

  test("permission and database readiness are covered too", () => {
    expect(body).toContain("!canManage");
    expect(body).toContain("!databaseReady");
  });

  test("it returns null when nothing blocks — no permanent notice", () => {
    expect(body.trimEnd().endsWith("return null;\n}")).toBe(true);
  });

  test("the most specific blocker is reported first", () => {
    const order = ["!canManage", "!databaseReady", "!encryptionReady"].map((needle) =>
      body.indexOf(needle),
    );
    expect(order).toEqual([...order].sort((a, b) => a - b));
    expect(order.every((index) => index > -1)).toBe(true);
  });
});

describe("the page still measures readiness on the server", () => {
  const page = read(PAGE);

  test("encryption readiness comes from the server module, never the browser", () => {
    expect(page).toContain("encryptionConfigured()");
    expect(read("src/lib/payments/secrets.ts")).toContain('import "server-only"');
  });

  test("and the secret itself is never sent to the client", () => {
    expect(page).not.toContain("PAYMENTS_ENCRYPTION_KEY");
    expect(read(VIEW)).not.toContain("process.env");
  });
});
