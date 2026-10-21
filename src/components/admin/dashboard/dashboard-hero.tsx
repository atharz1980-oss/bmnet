import { BaytMark } from "@/components/brand/bayt-mark";
import { BrandRule } from "@/components/admin/ui/brand-rule";
import { cn } from "@/lib/utils";

/**
 * DashboardHero — لافتة لوحة التحكم
 * ---------------------------------------------------------------
 * شريط حبر (BAYT BLACK) بعلامة تتحرك: تنفصل على محور 45° ثم تنفتح
 * ثم تستقر — بالضبط كما في صفحة «THE SYSTEM IN MOTION» بالملف.
 *
 * الأرقام الثلاثة (LEARN · MAKE · PRODUCE) هي تعبيرات العلامة
 * الثلاث: الأكاديمية · الاستوديوهات · الإنتاج.
 */
export function DashboardHero({ className }: { className?: string }) {
  return (
    <section
      aria-label="هوية بيت المصور"
      className={cn(
        "relative mb-8 overflow-hidden border border-white/10 bg-[#111111] px-6 py-9 text-[#F3F1EC] sm:px-9 sm:py-11",
        className,
      )}
    >
      {/* العلامة المكبّرة المقطوعة بزاوية 45° — تفيض خارج الإطار */}
      <div
        aria-hidden="true"
        className="brand-crop-start pointer-events-none absolute -top-16 -start-10 opacity-[0.05] sm:-start-20"
      >
        <BaytMark size={380} />
      </div>

      <div className="relative">
        {/* الشعار + الاسم اللاتيني */}
        <div className="flex items-center gap-3">
          <BaytMark size={30} animate aperture className="text-[#F3F1EC]" />
          <span
            dir="ltr"
            className="brand-micro text-[#F3F1EC]"
            style={{ letterSpacing: "0.16em" }}
          >
            BAYT AL MOSAWER
          </span>
        </div>

        {/* الاسم العربي — عنوان العرض */}
        <h2 className="brand-display-ar mt-7 text-4xl leading-none text-[#F3F1EC] sm:text-5xl">
          بيت المصور
        </h2>
        <p
          dir="ltr"
          className="brand-micro mt-3 text-white/45"
          style={{ letterSpacing: "0.18em" }}
        >
          THE HOME OF IMAGE MAKERS
        </p>

        <BrandRule tone="inverse" className="brand-rule-draw my-7" />

        {/* الشعار التسويقي + التعبيرات الثلاث */}
        <div className="flex flex-wrap items-end justify-between gap-4">
          <p
            dir="ltr"
            className="brand-display text-base text-[#F3F1EC] sm:text-lg"
            style={{ letterSpacing: "0.02em" }}
          >
            MAKE ROOM TO CREATE
          </p>
          <p
            dir="ltr"
            className="brand-micro text-white/40"
            style={{ letterSpacing: "0.2em" }}
          >
            LEARN · MAKE · PRODUCE
          </p>
        </div>
      </div>
    </section>
  );
}
