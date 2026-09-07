/**
 * تنزيل الصور المختارة من نتائج البحث إلى public/images
 * كل صورة: ملف JSON + رقم النتيجة المختارة
 */
const { readFileSync, writeFileSync, existsSync, statSync, mkdirSync } = require("fs");
const { execSync } = require("child_process");

const JSON_DIR = "/home/z/my-project/scripts/img-json";
const OUT_DIR = "/home/z/my-project/public/images";

// الاسم النهائي → [ملف البحث، رقم النتيجة]
const MAPPING = {
  "hero.jpg": ["hero", 0],
  "course-fundamentals.jpg": ["camera_dark", 0],
  "category-individuals.jpg": ["workshop", 0],
  "category-corporates.jpg": ["corporate", 0],
  "corporate-training.jpg": ["corporate", 1],
  "category-online.jpg": ["online", 0],
  "category-private.jpg": ["private_lesson", 0],
  "course-portrait.jpg": ["portrait_studio", 0],
  "course-products.jpg": ["photo_editing", 1],
  "course-mobile.jpg": ["mobile_photo", 0],
  "course-editing.jpg": ["photo_editing", 0],
  "course-lighting.jpg": ["studio_light", 0],
  "course-video.jpg": ["videography", 0],
  "course-private.jpg": ["workshop", 1],
  "about-studio.jpg": ["studio_space", 0],
  "path-photography.jpg": ["hero", 1],
  "path-content.jpg": ["videography", 1],
};

function parseJsonLoose(text) {
  const start = text.indexOf("{");
  if (start === -1) throw new Error("no JSON found");
  return JSON.parse(text.slice(start));
}

function download(url, dest) {
  execSync(
    `curl -sL --max-time 60 -o "${dest}" "${url}"`,
    { stdio: "pipe", timeout: 70000 }
  );
  return statSync(dest).size;
}

mkdirSync(OUT_DIR, { recursive: true });

const results = [];
const manifest = {};

for (const [filename, [searchName, index]] of Object.entries(MAPPING)) {
  const jsonPath = `${JSON_DIR}/${searchName}.json`;
  const outPath = `${OUT_DIR}/${filename}`;
  if (existsSync(outPath) && statSync(outPath).size > 20000) {
    results.push(`SKIP (exists): ${filename}`);
    continue;
  }
  try {
    if (!existsSync(jsonPath)) throw new Error("json missing");
    const data = parseJsonLoose(readFileSync(jsonPath, "utf8"));
    if (!data.success || !data.results?.length) throw new Error("no results in json");
    const pick = data.results[Math.min(index, data.results.length - 1)];
    const url = pick.original_url;
    const size = download(url, outPath);
    if (size < 10000) throw new Error(`too small (${size} bytes)`);
    manifest[filename] = { url, size, source: pick.source };
    results.push(`OK: ${filename} <- ${searchName}[${index}] (${Math.round(size / 1024)} KB)`);
  } catch (err) {
    results.push(`FAIL: ${filename} (${err.message})`);
  }
}

writeFileSync(
  "/home/z/my-project/scripts/images-manifest.json",
  JSON.stringify(manifest, null, 2)
);

console.log(results.join("\n"));
console.log(`\nTotal OK: ${results.filter((r) => r.startsWith("OK")).length}/${Object.keys(MAPPING).length}`);
