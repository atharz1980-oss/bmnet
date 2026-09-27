import Image from "next/image";
import { cn } from "@/lib/utils";

export type LogoVariant = "master" | "symbol" | "academy" | "production" | "studios";
export type LogoMode = "dark-on-light" | "light-on-dark";

export interface LogoProps {
  /** نمط الشعار: الرئيسي، الرمز المنفرد، أو شعار الوحدة */
  variant?: LogoVariant;
  /**
   * الوضع البصري:
   * - 'light-on-dark': شعار أبيض ناصع للخلفيات السينمائية الداكنة
   * - 'dark-on-light': شعار أسود فاحم للخلفيات التحريرية الفاتحة
   */
  mode?: LogoMode;
  className?: string;
  priority?: boolean;
  /** ارتفاع الشعار بالبكسل (العرض يُحسب تلقائياً للحفاظ على النسبة الهندسية الدقيقة دون أي مط أو تشويه) */
  height?: number;
  width?: number;
  alt?: string;
}

interface AssetSpec {
  src: string;
  aspectRatio: number;
  defaultWidth: number;
  defaultHeight: number;
}

/**
 * خريطة أصول الهوية الرسمية (Official Brand Assets)
 * جميع الملفات أصول بكسلية شفافة عالية الدقة بدون أي فلاتر CSS أو تدوير أو إعادة رسم.
 */
const ASSET_MAP: Record<LogoMode, Record<LogoVariant, AssetSpec>> = {
  "light-on-dark": {
    master: {
      src: "/brand/master-dark.png",
      aspectRatio: 833 / 225, // ~3.702
      defaultWidth: 155,
      defaultHeight: 42,
    },
    symbol: {
      src: "/brand/symbol-dark.png",
      aspectRatio: 287 / 290, // ~0.99
      defaultWidth: 42,
      defaultHeight: 42,
    },
    academy: {
      src: "/brand/academy-dark.png",
      aspectRatio: 834 / 228, // ~3.658
      defaultWidth: 155,
      defaultHeight: 42,
    },
    production: {
      src: "/brand/master-dark.png",
      aspectRatio: 833 / 225,
      defaultWidth: 155,
      defaultHeight: 42,
    },
    studios: {
      src: "/brand/master-dark.png",
      aspectRatio: 833 / 225,
      defaultWidth: 155,
      defaultHeight: 42,
    },
  },
  "dark-on-light": {
    master: {
      src: "/brand/master-light.png",
      aspectRatio: 833 / 225,
      defaultWidth: 155,
      defaultHeight: 42,
    },
    symbol: {
      src: "/brand/symbol-light.png",
      aspectRatio: 287 / 290,
      defaultWidth: 42,
      defaultHeight: 42,
    },
    academy: {
      src: "/brand/academy-light.png",
      aspectRatio: 834 / 228,
      defaultWidth: 155,
      defaultHeight: 42,
    },
    production: {
      src: "/brand/master-light.png",
      aspectRatio: 833 / 225,
      defaultWidth: 155,
      defaultHeight: 42,
    },
    studios: {
      src: "/brand/master-light.png",
      aspectRatio: 833 / 225,
      defaultWidth: 155,
      defaultHeight: 42,
    },
  },
};

/**
 * مكون الشعار المعتمد لهوية بيت المصور الرسمية
 * ----------------------------------------------------
 * - يضمن الحفاظ على النسب الدقيقة دون أي مط أو تشويه
 * - لا يستخدم CSS invert
 * - لا يضع الشعار داخل بوكسات عشوائية
 * - يدعم الوضعين: التحريري الفاتح (dark-on-light) والسينمائي الداكن (light-on-dark)
 */
export function Logo({
  variant = "master",
  mode = "light-on-dark",
  className,
  priority = false,
  height,
  width,
  alt = "بيت المصور — BAYT AL MOSAWER",
}: LogoProps) {
  const spec = ASSET_MAP[mode][variant] ?? ASSET_MAP[mode].master;

  // الحفاظ التام على النسبة التناسبية الطبيعية (Aspect Ratio)
  let renderWidth = width;
  let renderHeight = height;

  if (renderHeight && !renderWidth) {
    renderWidth = Math.round(renderHeight * spec.aspectRatio);
  } else if (renderWidth && !renderHeight) {
    renderHeight = Math.round(renderWidth / spec.aspectRatio);
  } else if (!renderWidth && !renderHeight) {
    renderWidth = spec.defaultWidth;
    renderHeight = spec.defaultHeight;
  }

  return (
    <span
      className={cn("inline-flex shrink-0 items-center justify-center select-none", className)}
      style={{
        aspectRatio: `${spec.aspectRatio}`,
        height: renderHeight ? `${renderHeight}px` : undefined,
        width: renderWidth ? `${renderWidth}px` : undefined,
      }}
    >
      <Image
        src={spec.src}
        alt={alt}
        width={renderWidth}
        height={renderHeight}
        priority={priority}
        className="h-full w-full object-contain"
      />
    </span>
  );
}
