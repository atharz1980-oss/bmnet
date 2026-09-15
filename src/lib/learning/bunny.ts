import "server-only";
import { createHash } from "node:crypto";

/**
 * روابط تشغيل Bunny Stream — موقّعة وقصيرة الأجل.
 *
 * الفيديو لا يُسلَّم برابط دائم أبدًا. كل تشغيل يوقَّع بمفتاح على الخادم
 * وينتهي خلال دقائق، فرابط مسروق يموت من تلقائه. هذا نفس مبدأ وسائط
 * المجتمع: الإذن يُفحص عند كل طلب ولا يُخزَّن في رابط.
 *
 * المفاتيح تبقى في بيئة الخادم. لا شيء هنا يصل المتصفح إلا الرابط الموقّع.
 */

const EMBED_HOST = "https://iframe.mediadelivery.net/embed";
/** عمر الرابط. قصير بما يكفي ليموت المسروق، وطويل بما يكفي لبدء التشغيل. */
export const PLAYBACK_TTL_SECONDS = 4 * 60 * 60;
const VIDEO_ID = /^[0-9a-fA-F-]{8,64}$/;

export interface BunnyConfig {
  libraryId: string;
  tokenKey: string;
}

/** الإعداد من البيئة، أو null إن لم يُضبط بعد — لا رمي هنا. */
export function bunnyConfig(
  libraryId = process.env.BUNNY_STREAM_LIBRARY_ID,
  tokenKey = process.env.BUNNY_STREAM_TOKEN_KEY,
): BunnyConfig | null {
  if (!libraryId || !/^\d{1,12}$/.test(libraryId)) return null;
  if (!tokenKey || tokenKey.length < 16) return null;
  return { libraryId, tokenKey };
}

export function bunnyConfigured(): boolean {
  return bunnyConfig() !== null;
}

export function isValidVideoId(value: string): boolean {
  return VIDEO_ID.test(value);
}

/**
 * توقيع Bunny: sha256 لسلسلة المفتاح + معرّف الفيديو + لحظة الانتهاء.
 * الترتيب جزء من العقد ولا يُغيَّر.
 */
export function playbackToken(videoId: string, expires: number, config: BunnyConfig): string {
  return createHash("sha256").update(`${config.tokenKey}${videoId}${expires}`).digest("hex");
}

/**
 * رابط المشغّل لهذا الدرس الآن. يُبنى عند كل عرض ولا يُخزَّن ولا يُخبَّأ.
 * `now` مُمرَّر ليبقى الاختبار حتميًا.
 */
export function playbackUrl(
  videoId: string,
  config: BunnyConfig,
  now: number = Date.now(),
  ttlSeconds: number = PLAYBACK_TTL_SECONDS,
): string {
  if (!isValidVideoId(videoId)) throw new Error("معرّف فيديو غير صالح.");
  const expires = Math.floor(now / 1000) + ttlSeconds;
  const token = playbackToken(videoId, expires, config);
  const url = new URL(`${EMBED_HOST}/${config.libraryId}/${videoId}`);
  url.searchParams.set("token", token);
  url.searchParams.set("expires", String(expires));
  /* لا تشغيل تلقائي ولا جمع بيانات زائدة. */
  url.searchParams.set("autoplay", "false");
  url.searchParams.set("preload", "false");
  return url.toString();
}
