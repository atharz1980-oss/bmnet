import "server-only";
import { createHash } from "node:crypto";

/**
 * روابط تشغيل Bunny Stream — موقّعة وقصيرة الأجل.
 *
 * الفيديو لا يُسلَّم برابط دائم أبدًا. كل تشغيل يوقَّع بمفتاح على الخادم
 * وينتهي خلال دقائق، فرابط مسروق يموت من تلقائه. هذا نفس مبدأ وسائط
 * المجتمع: الإذن يُفحص عند كل طلب ولا يُخزَّن في رابط.
 *
 * المفاتيح تبقى في بيئة الخادم. لا شيء هنا يصل المتصفح إلا الرابط الموقّع،
 * ولا `NEXT_PUBLIC_` في هذا الملف بحال.
 *
 * ── إعداد تشغيلي إلزامي، لا يستطيع الكود فحصه ─────────────────────
 * في لوحة Bunny ← Stream ← المكتبة ← Security:
 *   • Embed View Token Authentication → **يجب تفعيله.** بدونه يعمل الـembed
 *     بلا توقيع، فمن عرف معرّف الفيديو شاهد الدرس وصار كل ما هنا زينة.
 *   • CDN Token Authentication → **لا تفعّله** لهذا التدفق. مفتاح ونظام
 *     آخران يوجبان توقيع طلبات المقاطع داخليًا، وتفعيلهما يكسر التشغيل
 *     ما لم يتغير هذا التنفيذ.
 *
 * ── Fail closed ──────────────────────────────────────────────────
 * غياب الإعداد يعني **لا مشغّل**. لا رجوع إلى embed بلا توقيع بحال: ذلك
 * يحوّل عطلًا في الإعداد إلى تسريب صامت لكل المحتوى المدفوع.
 *
 * صيغة التوقيع من وثائق Bunny حرفيًا:
 *   SHA256_HEX(token_security_key + video_id + expiration)
 * والمفتاح هو *Token Authentication Key* من تبويب Security — لا مفتاح الـAPI.
 */

const EMBED_HOST = "https://iframe.mediadelivery.net/embed";
/**
 * عمر الرابط الموقّع.
 *
 * التوقيع يُفحص عند تحميل الإطار لا طوال المشاهدة، فقِصَره لا يقطع درسًا
 * جاريًا — بينما طوله يمدّ عمر أي رابط يُشارَك. عشرون دقيقة تكفي لفتح
 * الدرس وتضيّق نافذة المشاركة.
 *
 * ثابت على الخادم، ولا يُشتق من بيئة عامة.
 */
export const PLAYBACK_TTL_SECONDS = 20 * 60;
/* GUID فيديو Bunny هو UUID — نفس قيد القاعدة حرفيًا، فلا يمر ما ترفضه. */
const VIDEO_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface BunnyConfig {
  libraryId: string;
  tokenKey: string;
}

/**
 * الإعداد من البيئة، أو null إن لم يُضبط أو كان ناقصًا.
 * null يعني «لا تشغيل» عند المستدعي — لا بديلًا غير موقّع.
 */
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
