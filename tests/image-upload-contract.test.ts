/**
 * عقد رفع الصور في لوحة التحكم.
 *
 * خلل قائم منذ المرحلة الثانية: ImageUpload كان ينشئ Object URL محليًا
 * ويضعه في الحقل، فتبدو الصورة محفوظة وتختفي عند إعادة التحميل. المحرر
 * لا يملك أي إشارة إلى أن شيئًا لم يُرفع.
 *
 * اختبارات المشروع نقية بلا DOM، فالحراسة هنا ثابتة على المصدر: لا عودة
 * لنمط المعاينة الوهمية، والرفع يمر بمكتبة الوسائط، ولكل محرر مجلده.
 */
import { describe, expect, test } from "bun:test";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const COMPONENT = "src/components/admin/ui/image-upload.tsx";
const source = readFileSync(COMPONENT, "utf8");

function sources(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory()
      ? sources(join(dir, entry.name))
      : /\.tsx?$/.test(entry.name)
        ? [join(dir, entry.name)]
        : [],
  );
}

describe("no local-preview fallback in the admin panel", () => {
  test("nothing under components/admin creates an Object URL", () => {
    const offenders = sources("src/components/admin")
      .filter((file) => readFileSync(file, "utf8").includes("createObjectURL"));
    expect(offenders).toEqual([]);
  });

  test("ImageUpload never writes a blob: value into the field", () => {
    expect(source).not.toContain("createObjectURL");
    expect(source).not.toContain("blob:");
  });
});

describe("ImageUpload uploads through the media library", () => {
  test("it calls the shared upload action rather than faking a value", () => {
    expect(source).toContain("useAdminActions");
    expect(source).toContain("uploadMedia(file, folder");
  });

  test("the field changes only after a successful upload", () => {
    /* onChange بقيمة الرفع يقع داخل فرع النجاح وحده. */
    const successBranch = source.slice(source.indexOf("if (result.ok"));
    expect(successBranch).toContain("onChange({ value: result.data");
    /* الاستدعاء الآخر الوحيد هو الإزالة الصريحة والنص البديل. */
    const changeCalls = [...source.matchAll(/onChange\(\{\s*value:\s*([^,\n]+)/g)].map((m) => m[1].trim());
    for (const value of changeCalls) {
      expect(["result.data", '""', "value"]).toContain(value);
    }
  });

  test("it reports failure instead of silently continuing", () => {
    expect(source).toContain('role="alert"');
    expect(source).toContain("setError(");
    expect(source).toContain("result.error");
  });

  test("it blocks unsupported types and oversized files before uploading", () => {
    expect(source).toContain("image/webp");
    expect(source).toContain("10 * 1024 * 1024");
  });
});

describe("every ImageUpload names its storage folder", () => {
  /* القائمة الثابتة أخفت فجوة حقيقية: خمسة استخدامات في src/app كانت بلا
     folder فترتب الشعارات وصور OG في misc. الفحص الآن يمسح كل الملفات. */
  const usages = sources("src")
    .filter((file) => !file.endsWith(join("ui", "image-upload.tsx")))
    .map((file) => ({ file, text: readFileSync(file, "utf8") }))
    .filter((entry) => entry.text.includes("<ImageUpload"))
    .map((entry) => ({
      file: entry.file,
      uses: (entry.text.match(/<ImageUpload/g) ?? []).length,
      folders: (entry.text.match(/folder="/g) ?? []).length,
    }));

  test("the scan finds every editor that renders ImageUpload", () => {
    expect(usages.length).toBeGreaterThanOrEqual(11);
    /* الصفحات والمكوّنات معًا، لا المكوّنات وحدها. */
    expect(usages.some((u) => u.file.includes(join("src", "app")))).toBe(true);
    expect(usages.some((u) => u.file.includes(join("src", "components")))).toBe(true);
  });

  test("no ImageUpload falls back to the misc folder by omission", () => {
    const missing = usages
      .filter((u) => u.folders < u.uses)
      .map((u) => `${u.file}: ${u.uses} استخدامًا، ${u.folders} folder`);
    expect(missing).toEqual([]);
  });

  test("every folder value is one the upload action accepts", () => {
    const action = readFileSync("src/app/admin/actions/content.ts", "utf8");
    const allowed = action.slice(action.indexOf("uploadMediaAction"));
    const declared = new Set(
      usages.flatMap((u) =>
        [...readFileSync(u.file, "utf8").matchAll(/folder="(\w+)"/g)].map((m) => m[1]),
      ),
    );
    expect(declared.size).toBeGreaterThan(0);
    for (const folder of declared) expect(allowed).toContain(`"${folder}"`);
  });
});
