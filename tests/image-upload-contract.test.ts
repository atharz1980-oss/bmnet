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

describe("every editor stores into its own folder", () => {
  const EDITORS: Record<string, string> = {
    "src/components/admin/blog/blog-blocks-editor.tsx": "blog",
    "src/components/admin/blog/blog-editor.tsx": "blog",
    "src/components/admin/courses/editor/images-tab.tsx": "courses",
    "src/components/admin/homepage/course-section-editors.tsx": "homepage",
    "src/components/admin/homepage/hero-cta-editors.tsx": "homepage",
    "src/components/admin/homepage/list-editors.tsx": "homepage",
    "src/components/admin/paths/path-editor.tsx": "paths",
    "src/components/admin/trainers/trainer-editor.tsx": "trainers",
    "src/components/admin/users/user-editor.tsx": "site",
  };

  for (const [file, folder] of Object.entries(EDITORS)) {
    test(`${file.split("/").pop()} stores into "${folder}"`, () => {
      const text = readFileSync(file, "utf8");
      const uses = (text.match(/<ImageUpload/g) ?? []).length;
      const folders = (text.match(new RegExp(`folder="${folder}"`, "g")) ?? []).length;
      expect(uses).toBeGreaterThan(0);
      /* مجلد لكل استخدام: إغفال واحد يعيد الصور إلى misc بصمت. */
      expect(folders).toBe(uses);
    });
  }

  test("the folder prop only accepts buckets the upload action allows", () => {
    const action = readFileSync("src/app/admin/actions/content.ts", "utf8");
    for (const folder of new Set(Object.values(EDITORS))) {
      expect(action).toContain(`"${folder}"`);
    }
  });
});
