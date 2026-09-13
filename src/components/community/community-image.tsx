import Image, { type ImageProps } from "next/image";

import { bypassesImageOptimizer } from "@/lib/community/mappers";

/**
 * صورة مجتمع — الباب الوحيد الذي تُعرض منه وسائط المجتمع.
 *
 * `next/image` وحده كان يكفي لنقض الإشراف: المحسِّن يحتفظ بنسخته ويخدمها
 * بـ`public, max-age=14400`، فتبقى صورة المنشور المخفى متاحة ساعات عبر
 * `/_next/image?url=…` رغم أن مسارها المباشر يعيد 404 فورًا. ورابط
 * المحسِّن مكتوب في srcset الصفحة، فلا يحتاج كشفُه شيئًا.
 *
 * هنا يُتخذ القرار مرة واحدة بدل أن يُذكر `unoptimized` في كل موضع
 * ويُنسى في الموضع الثامن. وbm-media والصور الثابتة تمر بالمحسِّن كالعادة
 * إن مرّت من هنا أصلًا — القرار من الرابط لا من المستدعي.
 */
export function CommunityImage({ src, alt, ...rest }: ImageProps) {
  /* alt صريح لا ضمن التمرير: قاعدة a11y لا ترى ما يصل عبر spread. */
  const value = typeof src === "string" ? src : "";
  return <Image src={src} alt={alt} {...rest} unoptimized={bypassesImageOptimizer(value)} />;
}
