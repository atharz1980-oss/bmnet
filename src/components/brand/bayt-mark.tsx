import { cn } from "@/lib/utils";

/**
 * BaytMark — العلامة الرسمية لبيت المصور
 * ---------------------------------------------------------------
 * «المساحة المتشابكة» (THE INTERLOCKED SPACE): قوسان على شكل حرف L
 * متقابلان بتماثل دوراني 180°، يتفاطعان عند المركز ويتركان فتحة مربّعة.
 *
 * مبنية على المسار المتجهي المقيس من ملف الهوية (Brand Identity p2/p4):
 *   - المسار الأساسي: M36 0 H150 V17 L105 62 H60 L55 67 V124 L68 137 L47 158 H22 L0 136 V36 A36 36 0 0 1 36 0 Z
 *   - الجزء الثاني = نفس المسار مُدارًا 180° ومُزاحًا (186,196)
 *
 * قواعد العلامة:
 *   - أحادية اللون فقط (يرث currentColor) — لا برتقالي، لا تدرّج، لا ظل.
 *   - لا تُدار ولا تُشوَّه ولا تُوضع على حقل متوسط اللون.
 *   - الحد الأدنى الرقمي 24px (للعلامة وحدها) و120px للاقتران بالاسم.
 */

const MARK_PATH =
  "M36 0 H150 V17 L105 62 H60 L55 67 V124 L68 137 L47 158 H22 L0 136 V36 A36 36 0 0 1 36 0 Z";

export interface BaytMarkProps {
  /** حجم العرض بالبكسل — الارتفاع يُحسب تلقائيًا (النسبة 186:196) */
  size?: number;
  className?: string;
  /**
   * تشغيل حركة «الفصل ← الفتح ← الاستقرار» الموصوفة في صفحة الهوية 16.
   * تُستخدم في رأس اللوحة وصفحة الدخول.
   */
  animate?: boolean;
  /** إظهار الفتحة المركزية أثناء الحركة (طبقة بيضاء شفافة) */
  aperture?: boolean;
}

export function BaytMark({
  size = 28,
  className,
  animate = false,
  aperture = false,
}: BaytMarkProps) {
  const height = Math.round(size * (196 / 186));

  return (
    <svg
      viewBox="0 0 186 196"
      width={size}
      height={height}
      fill="none"
      aria-hidden="true"
      focusable="false"
      data-brand-mark=""
      className={cn("shrink-0 overflow-visible", className)}
    >
      {/* الفتحة المركزية — تظهر أثناء الحركة فقط */}
      {aperture ? (
        <rect
          x="63"
          y="66"
          width="60"
          height="60"
          fill="currentColor"
          opacity={0.08}
          className={animate ? "brand-aperture" : undefined}
        />
      ) : null}

      {/* القوس الأول */}
      <g
        fill="currentColor"
        className={animate ? "brand-mark-a" : undefined}
        style={animate ? { animationDelay: "0ms" } : undefined}
      >
        <path d={MARK_PATH} />
      </g>

      {/* القوس الثاني — انعكاس دوراني 180° */}
      <g
        fill="currentColor"
        className={animate ? "brand-mark-b" : undefined}
        style={animate ? { animationDelay: "0ms" } : undefined}
      >
        <g transform="translate(186,196) rotate(180)">
          <path d={MARK_PATH} />
        </g>
      </g>
    </svg>
  );
}

/**
 * BaytLockup — اقتران العلامة بالاسم اللاتيني
 * ----------------------------------------------------
 * يتبع ترتيب الملف: العلامة على جهة البداية، ثم الاسم بحروف كبيرة
 * وتباعد 0.12em. الاسم بالإنجليزية دائمًا (كما في الملف الأصلي).
 */
export function BaytLockup({
  size = 24,
  className,
  markClassName,
  wordmarkClassName,
  animate = false,
}: {
  size?: number;
  className?: string;
  markClassName?: string;
  wordmarkClassName?: string;
  animate?: boolean;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <BaytMark size={size} animate={animate} className={markClassName} />
      <span
        dir="ltr"
        className={cn(
          "brand-micro whitespace-nowrap text-[0.6875rem] leading-none",
          wordmarkClassName,
        )}
        style={{ letterSpacing: "0.12em" }}
      >
        BAYT AL MOSAWER
      </span>
    </span>
  );
}
