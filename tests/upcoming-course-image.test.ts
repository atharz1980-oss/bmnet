/**
 * صورة «الدورة القادمة» تُعرض كاملة.
 *
 * عمود الصورة يأخذ ارتفاعه من عمود النص، فنسبته تتغير مع عرض الشاشة
 * (‎1.53‎ على هاتف 375، و‎0.82‎ عند 1024، و‎1.18‎ عند 1440). وملصقات الورش
 * التي يرفعها المالك مربّعة بينما صور الدورات المرفقة ‎16:9‎ — فلا نسبة
 * واحدة تناسب الاثنتين. `object-cover` كان يقصّ الفارق: قياسًا على
 * الإنتاج ‎34%‎ من ارتفاع الملصق على الهاتف و‎18%‎ من عرضه عند 1024،
 * والمقصوص شريطا هوية «بيت المصور» أعلى الملصق وأسفله.
 */
import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";

const read = (p: string) => readFileSync(p, "utf8").replace(/\r\n/g, "\n");
const LIVE = "src/components/home/upcoming-course.tsx";
const PREVIEW = "src/components/admin/preview/home-preview.tsx";

/** كتلة الصورة في القسم — من فتح العنصر حتى إغلاقه. */
function imageBlock(source: string): string {
  const start = source.indexOf('className="relative aspect-square');
  expect(start).toBeGreaterThan(-1);
  const end = source.indexOf("</div>", start);
  expect(end).toBeGreaterThan(start);
  return source.slice(start, end);
}

describe("the poster is never cropped", () => {
  const live = imageBlock(read(LIVE));

  test("the visible layer contains rather than covers", () => {
    expect(live).toContain("object-contain");
  });

  test("the only object-cover left is the blurred backdrop", () => {
    const covers = live.split("object-cover").length - 1;
    expect(covers).toBe(1);
    const cover = live.slice(live.indexOf("object-cover") - 260, live.indexOf("object-cover") + 40);
    expect(cover).toContain("blur-");
    expect(cover).toContain('aria-hidden="true"');
  });

  test("the backdrop is decorative — one alt text reaches assistive tech", () => {
    expect(live.split("alt=").length - 1).toBe(2);
    expect(live).toContain('alt=""');
    expect(live).toContain("alt={course.imageAlt}");
  });

  test("both layers share one src, so the browser fetches one image", () => {
    expect(live.split("src={imageSrc}").length - 1).toBe(2);
    expect(live.split('sizes="(max-width: 1024px) 100vw, 40vw"').length - 1).toBe(2);
  });

  test("the blur is clipped to the card", () => {
    /* بلا overflow-hidden يسيل التمويه خارج الحافة المستديرة. */
    expect(live).toContain("overflow-hidden");
  });
});

describe("the box keeps a usable shape at every width", () => {
  const live = imageBlock(read(LIVE));

  test("stacked layouts get a declared ratio instead of a short min-height", () => {
    /* min-h-56 كان يفرض 224px على الهاتف مهما كانت الصورة. */
    expect(live).not.toContain("min-h-56");
    expect(live).toContain("aspect-square");
    expect(live).toContain("sm:aspect-[4/3]");
  });

  test("beside the text it still stretches to the card height", () => {
    expect(live).toContain("lg:aspect-auto");
    expect(live).toContain("lg:min-h-full");
  });
});

describe("the admin preview shows what the visitor sees", () => {
  const preview = imageBlock(read(PREVIEW));

  test("same fit, same ratios, same backdrop", () => {
    for (const needle of ["object-contain", "blur-", "aspect-square", "sm:aspect-[4/3]", "lg:aspect-auto"]) {
      expect(preview).toContain(needle);
    }
  });

  test("and the preview does not crop either", () => {
    expect(preview.split("object-cover").length - 1).toBe(1);
  });
});
