/**
 * إعادة محاولة توليد الصور المتبقية — تنتظر بين المحاولات لتجنب 429
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
  ["hero.jpg", "1344x768", `Professional male photographer holding a DSLR camera in a dark photo studio, standing beside tripod and softbox lights, dramatic side lighting, ${STYLE}`],
  ["course-products.jpg", "1344x768", `Product photography table setup with professional lighting photographing a perfume bottle on a white surface in a dark studio, ${STYLE}`],
  ["course-video.jpg", "1344x768", `Professional cinema video camera on tripod in a dark studio set, video production, ${STYLE}`],
  ["course-private.jpg", "1344x768", `Photography mentor teaching one student one on one in a dark studio, reviewing photos together on camera screen, ${STYLE}`],
  ["category-individuals.jpg", "1152x864", `Small group of adult students at a photography workshop in a dark studio, each holding a camera while instructor demonstrates, ${STYLE}`],
  ["category-private.jpg", "1152x864", `One on one photography coaching in a dark studio, instructor showing camera settings to a student, ${STYLE}`],
  ["about-studio.jpg", "1344x768", `Modern professional photography studio interior with lighting equipment, backdrops and camera tripods, dark charcoal walls with warm accent lighting, ${STYLE}`],
  ["corporate-training.jpg", "1344x768", `Trainer presenting photography techniques to corporate employees in a modern dark conference room, camera equipment on the table, ${STYLE}`],
  ["path-photography.jpg", "1344x768", `Photographer adjusting camera settings in a dark studio environment, learning journey, ${STYLE}`],
  ["path-content.jpg", "1344x768", `Content creator filming video with a camera and editing on laptop in a dark studio, ${STYLE}`],
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const zai = await ZAI.create();

  for (const [filename, size, prompt] of IMAGES) {
    const pngPath = path.join(OUT_PNG, filename.replace(/\.jpg$/, ".png"));
    if (fs.existsSync(pngPath) && fs.statSync(pngPath).size > 50000) {
      console.log(`SKIP: ${filename}`);
      continue;
    }
    let ok = false;
    for (let attempt = 1; attempt <= 5 && !ok; attempt++) {
      try {
        const response = await zai.images.generations.create({ prompt, size });
        fs.writeFileSync(pngPath, Buffer.from(response.data[0].base64, "base64"));
        console.log(`GEN OK: ${filename} (attempt ${attempt})`);
        ok = true;
      } catch (err) {
        const msg = err.message.slice(0, 60);
        console.log(`RETRY ${attempt}: ${filename} (${msg})`);
        await sleep(attempt * 20000); // انتظار أطول لتفادي حد المعدل
      }
    }
    if (!ok) console.log(`STILL FAILED: ${filename}`);
    await sleep(3000);
  }

  // تحويل PNG → JPG
  for (const [filename] of IMAGES) {
    const pngPath = path.join(OUT_PNG, filename.replace(/\.jpg$/, ".png"));
    if (!fs.existsSync(pngPath)) continue;
    const outPath = path.join(OUT_JPG, filename);
    await sharp(pngPath).jpeg({ quality: 82, mozjpeg: true }).toFile(outPath);
    console.log(`JPG: ${filename} (${Math.round(fs.statSync(outPath).size / 1024)} KB)`);
  }
  console.log("ALL DONE");
}

main().catch((err) => {
  console.error("FATAL:", err);
  process.exit(1);
});
