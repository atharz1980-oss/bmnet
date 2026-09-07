/**
 * توليد صور الموقع بهوية بصرية موحدة (داكنة سينمائية احترافية)
 * ثم تحويلها JPG عبر sharp مع ضغط مناسب.
 */
import ZAI from "z-ai-web-dev-sdk";
import sharp from "sharp";
import fs from "fs";
import path from "path";

const OUT_PNG = "/home/z/my-project/scripts/gen";
const OUT_JPG = "/home/z/my-project/public/images";

const STYLE =
  "moody cinematic lighting, dark charcoal and black color palette, premium editorial photography style, photorealistic, high quality, no text, no watermark";

const IMAGES = [
  // [filename, size, prompt]
  ["hero.jpg", "1440x720", `Professional male photographer holding a DSLR camera in a dark photo studio, standing beside tripod and softbox lights, dramatic side lighting, ${STYLE}`],
  ["course-fundamentals.jpg", "1344x768", `Close-up of a professional DSLR camera on a dark table in a dim studio, shallow depth of field, ${STYLE}`],
  ["course-lighting.jpg", "1344x768", `Photography studio lighting setup with softbox and strobe lights illuminating a dark set, ${STYLE}`],
  ["course-portrait.jpg", "1344x768", `Photographer shooting a portrait of a model in a dark professional studio with softbox light, seen from behind the photographer, ${STYLE}`],
  ["course-products.jpg", "1344x768", `Product photography table setup with professional lighting photographing a perfume bottle on a white surface in a dark studio, ${STYLE}`],
  ["course-mobile.jpg", "1344x768", `Close-up of hands holding a smartphone taking a photo in a dark studio with soft warm light, ${STYLE}`],
  ["course-editing.jpg", "1344x768", `Photo editing workstation with a large monitor showing photo editing software in a dark room, screen glow, ${STYLE}`],
  ["course-video.jpg", "1344x768", `Professional cinema video camera on tripod in a dark studio set, video production, ${STYLE}`],
  ["course-private.jpg", "1344x768", `Photography mentor teaching one student one on one in a dark studio, reviewing photos together on camera screen, ${STYLE}`],
  ["category-individuals.jpg", "1152x864", `Small group of adult students at a photography workshop in a dark studio, each holding a camera while instructor demonstrates, ${STYLE}`],
  ["category-corporates.jpg", "1152x864", `Corporate team in business casual attending a media training workshop in a modern dark meeting room with camera on tripod, ${STYLE}`],
  ["category-online.jpg", "1152x864", `Person attending an online photography class on a laptop at a desk in a dim room with a camera beside, warm screen glow, ${STYLE}`],
  ["category-private.jpg", "1152x864", `One on one photography coaching in a dark studio, instructor showing camera settings to a student, ${STYLE}`],
  ["about-studio.jpg", "1344x768", `Modern professional photography studio interior with lighting equipment, backdrops and camera tripods, dark charcoal walls with warm accent lighting, ${STYLE}`],
  ["corporate-training.jpg", "1344x768", `Trainer presenting photography techniques to corporate employees in a modern dark conference room, camera equipment on the table, ${STYLE}`],
  ["path-photography.jpg", "1344x768", `Photographer adjusting camera settings in a dark studio environment, learning journey, ${STYLE}`],
  ["path-content.jpg", "1344x768", `Content creator filming video with a camera and editing on laptop in a dark studio, ${STYLE}`],
];

async function generateBatch(zai, batch) {
  // توليد تسلسلي مع إعادة محاولة (تفادي 429 Too Many Requests)
  const failures = [];
  for (const [filename, size, prompt] of batch) {
    const pngPath = path.join(OUT_PNG, filename.replace(/\.jpg$/, ".png"));
    if (fs.existsSync(pngPath) && fs.statSync(pngPath).size > 50000) {
      console.log(`GEN SKIP (exists): ${filename}`);
      continue;
    }
    let ok = false;
    for (let attempt = 1; attempt <= 4 && !ok; attempt++) {
      try {
        const response = await zai.images.generations.create({ prompt, size });
        const base64 = response.data[0].base64;
        fs.writeFileSync(pngPath, Buffer.from(base64, "base64"));
        console.log(`GEN OK: ${filename} (attempt ${attempt})`);
        ok = true;
      } catch (err) {
        console.log(`GEN RETRY ${attempt}: ${filename} (${err.message.slice(0, 80)})`);
        await new Promise((r) => setTimeout(r, 8000 * attempt));
      }
    }
    if (!ok) failures.push({ filename });
    await new Promise((r) => setTimeout(r, 2000));
  }
  return failures;
}

async function main() {
  fs.mkdirSync(OUT_PNG, { recursive: true });
  fs.mkdirSync(OUT_JPG, { recursive: true });

  const zai = await ZAI.create();

  // توليد تسلسلي
  const failures = await generateBatch(zai, IMAGES);

  // تحويل PNG → JPG (جودة 82)
  for (const [filename] of IMAGES) {
    const pngPath = path.join(OUT_PNG, filename.replace(/\.jpg$/, ".png"));
    if (!fs.existsSync(pngPath)) continue;
    const outPath = path.join(OUT_JPG, filename);
    await sharp(pngPath).jpeg({ quality: 82, mozjpeg: true }).toFile(outPath);
    const kb = Math.round(fs.statSync(outPath).size / 1024);
    console.log(`JPG: ${filename} (${kb} KB)`);
  }

  console.log(`\nDONE. failures: ${failures.length}`);
}

main().catch((err) => {
  console.error("FATAL:", err);
  process.exit(1);
});
