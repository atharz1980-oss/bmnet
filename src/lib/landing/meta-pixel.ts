/**
 * Meta Pixel لصفحة الحملة /lp/mobile-content — في المتصفح فقط، وبعد موافقة الزائر.
 *
 * قواعد لا تُكسر:
 *   1. لا تحميل ولا حدث قبل «موافق». الرفض أو التجاهل لا يغيّر شيئًا في
 *      الحجز ولا في الدفع.
 *   2. معرّف الـ Pixel الحي لا يعمل إلا على النطاق الرسمي: التطوير والمعاينة
 *      لا يلوّثان بيانات الحملة.
 *   3. لا بيانات شخصية: لا اسم ولا جوال ولا بريد، ولا رقم الطلب — لا في
 *      الرابط المرسل ولا في معرّف الحدث (انظر `sendWithoutOrderParam`).
 *   4. كل وصول إلى التخزين داخل try: التصفح الخاص والتخزين المحجوب لا
 *      يكسران الصفحة.
 *   5. سحب الموافقة (هنا أو في تبويب آخر) يوقف الإرسال ويحذف ما كتبته
 *      Meta في المتصفح — بقائمة أسماء صريحة فقط، لا مسح شاملًا للتخزين.
 *
 * وحدة عادية يستوردها مكوّنا العميل؛ قرار «Purchase مسموح أم لا» على الخادم
 * في `meta-pixel-server.ts`.
 */

import { siteConfig } from "@/data/site";
import { landingCheckoutTarget, pricing } from "@/data/landing/mobile-content";

/** المعرّف الحي للحملة — حارس النطاق وحارس أحداث الاختبار يقارنان به. */
export const LIVE_META_PIXEL_ID = "1124018907231466";
export const PIXEL_ID_PATTERN = /^\d{6,20}$/;

/** ما يصف الورشة في أحداث Meta — بلا معرّف دورة داخلي. */
export const WORKSHOP_CONTENT = {
  content_ids: [landingCheckoutTarget.courseSlug ?? "lp-mobile-content"],
  content_type: "product",
  content_name: "احتراف صناعة المحتوى بالجوال",
} as const;

/** وصف المحتوى في الأحداث — `WORKSHOP_CONTENT` افتراضيًا (صفحة الجوال). */
export interface PixelContent {
  readonly content_ids: readonly string[];
  readonly content_type: string;
  readonly content_name: string;
}

const CONSENT_KEY = "bm_ad_consent_v1";
const INITIATE_KEY = "bm_px:ic";
const PURCHASE_KEY_PREFIX = "bm_px:purchase:";
/** علامة Purchase تفقد فائدتها بعد نافذة الخادم (ساعتان) — تُحذف بعد 3 ساعات. */
export const PURCHASE_MARKER_TTL_MS = 3 * 60 * 60 * 1000;
/* فرق ساعات بسيط: علامة «من المستقبل» أبعد منه طابع غير موثوق. */
const MARKER_CLOCK_SKEW_MS = 5 * 60 * 1000;

/*
 * ما تكتبه مكتبة Meta (fbevents.js) في المتصفح — أسماء صريحة رُصدت في
 * المتصفح بإعداد الـ Pixel الحي أو وُجدت في شيفرة المكتبة. لا يُحذف غيرها.
 */
export const META_COOKIES = ["_fbp", "_fbc", "_fbleid"] as const;
export const META_LOCAL_KEYS = ["multiFbc", "lastExternalReferrer", "lastExternalReferrerTime", "fbcEbpOrigin"] as const;
export const META_SESSION_KEYS = ["FACEBOOK_IWL_CONFIG_STORAGE_KEY"] as const;
/** معامل رقم الطلب في صفحة النجاح — لا يصل إلى Meta. */
const ORDER_PARAM = "o";
const MAX_PENDING = 20;
/* انتظار إعداد الـ Pixel بعد تحميل السكربت، ثم إعادة محاولة نداء أُجِّل. */
const READY_POLL_MS = 100;
const READY_MAX_WAIT_MS = 8000;
const RETRY_MS = 200;
const MAX_RETRIES = 50;

/* ─────────────────────────── الموافقة ─────────────────────────── */

export type AdConsent = "granted" | "denied";
/** `unknown` قبل الترطيب (الخادم لا يعرف اختيار الزائر). */
export type AdConsentSnapshot = AdConsent | "unset" | "unknown";

/* احتياط حين يرفض المتصفح التخزين: الاختيار يصمد لهذه الصفحة فقط. */
let memoryConsent: AdConsent | null = null;
let settingsOpen = false;
let consentUiMounted = 0;
const listeners = new Set<() => void>();

function emit(): void {
  listeners.forEach((listener) => listener());
}

function readStoredConsent(): AdConsent | null {
  try {
    const value = window.localStorage.getItem(CONSENT_KEY);
    return value === "granted" || value === "denied" ? value : null;
  } catch {
    return null;
  }
}

export function readConsent(): AdConsent | null {
  return readStoredConsent() ?? memoryConsent;
}

export function subscribeConsent(listener: () => void): () => void {
  listeners.add(listener);
  watchOtherTabs();
  return () => {
    listeners.delete(listener);
  };
}

let watchingTabs = false;

/**
 * تبويب آخر غيّر الاختيار (أو مُسحت بيانات الموقع): يُطبَّق هنا فورًا بلا
 * إعادة تحميل — السحب يوقف المكتبة المحمّلة في هذا التبويب وينظّف.
 */
function watchOtherTabs(): void {
  if (watchingTabs) return;
  watchingTabs = true;
  window.addEventListener("storage", (event: StorageEvent) => {
    /* key === null: مُسح التخزين كله من تبويب آخر. */
    if (event.key !== CONSENT_KEY && event.key !== null) return;
    const value = readStoredConsent();
    memoryConsent = value;
    if (value === "granted") grantPixel();
    else revokePixel();
    emit();
  });
}

export function consentSnapshot(): AdConsentSnapshot {
  return readConsent() ?? "unset";
}

export function settingsSnapshot(): boolean {
  return settingsOpen;
}

export function consentUiSnapshot(): boolean {
  return consentUiMounted > 0;
}

export function setConsent(value: AdConsent): void {
  memoryConsent = value;
  settingsOpen = false;
  try {
    window.localStorage.setItem(CONSENT_KEY, value);
  } catch {
    /* المحفوظ في الذاكرة يكفي لهذه الصفحة. */
  }
  if (value === "denied") revokePixel();
  else grantPixel();
  emit();
}

/** يعيد فتح شريط الموافقة لتغيير الاختيار أو سحبه. */
export function openConsentSettings(): void {
  settingsOpen = true;
  emit();
}

/** يسجّل وجود شريط الموافقة: زر «إعدادات التتبع» لا يظهر بدونه. */
export function registerConsentUi(): () => void {
  consentUiMounted += 1;
  emit();
  return () => {
    consentUiMounted -= 1;
    emit();
  };
}

/* ─────────────────────────── تحميل الـ Pixel ─────────────────────────── */

interface Fbq {
  (...args: unknown[]): void;
  callMethod?: (...args: unknown[]) => void;
  queue: unknown[];
  push: Fbq;
  loaded: boolean;
  version: string;
  disablePushState?: boolean;
  /** داخلي في fbevents.js: إعداد كل Pixel حُمّل أم لا. */
  instance?: { configsLoaded?: Record<string, boolean> };
}

declare global {
  interface Window {
    fbq?: Fbq;
    _fbq?: Fbq;
  }
}

let activePixel: string | null = null;
let loadSeen = false;
let scriptReady = false;
const pending: Array<() => void> = [];
const sent = new Set<string>();

/** المعرّف الحي على النطاق الرسمي فقط؛ معرّف اختبار يعمل في أي مكان. */
export function pixelAllowedHere(pixelId: string, hostname: string): boolean {
  if (!PIXEL_ID_PATTERN.test(pixelId)) return false;
  if (pixelId !== LIVE_META_PIXEL_ID) return true;
  const live = new URL(siteConfig.url).hostname;
  return hostname === live || hostname === `www.${live}`;
}

/**
 * يجهّز `fbq` (مقتطف Meta القياسي) ويهيّئ المعرّف مرة واحدة. السكربت نفسه
 * يحمّله `next/script` في مكوّن الـ Pixel.
 */
export function installPixel(pixelId: string): void {
  if (activePixel) return;
  if (!window.fbq) {
    const fbq = function (...args: unknown[]) {
      if (fbq.callMethod) fbq.callMethod(...args);
      else fbq.queue.push(args);
    } as Fbq;
    fbq.push = fbq;
    fbq.loaded = true;
    fbq.version = "2.0";
    fbq.queue = [];
    window.fbq = fbq;
    if (!window._fbq) window._fbq = fbq;
  }
  /* لا PageView تلقائي عند تغيّر الرابط (المراسي و?o=) — نرسله يدويًا لكل مسار. */
  window.fbq.disablePushState = true;
  /* لا أحداث تلقائية (نقرات الأزرار وبيانات الصفحة الوصفية). */
  window.fbq("set", "autoConfig", false, pixelId);
  window.fbq("init", pixelId);
  activePixel = pixelId;
}

function configReady(): boolean {
  return Boolean(activePixel && window.fbq?.instance?.configsLoaded?.[activePixel]);
}

/**
 * السكربت حُمّل. الإرسال يبدأ بعد تحميل إعداد الـ Pixel: قبله يؤجّل
 * fbevents.js كل نداء ويقرأ عنوان الصفحة لاحقًا. بعده يُعالَج النداء فورًا.
 */
export function markPixelLoaded(): void {
  if (loadSeen) return;
  loadSeen = true;
  const started = Date.now();
  const check = () => {
    if (configReady() || Date.now() - started >= READY_MAX_WAIT_MS) {
      scriptReady = true;
      pending.splice(0).forEach((run) => run());
    } else {
      window.setTimeout(check, READY_POLL_MS);
    }
  };
  check();
}

/** سحب الموافقة: يتوقف الإرسال فورًا، تُفرَّغ الأحداث المنتظرة، وتُحذف بيانات Meta. */
function revokePixel(): void {
  pending.length = 0;
  if (activePixel && window.fbq) {
    dropHeldEvents(window.fbq);
    window.fbq("consent", "revoke");
  }
  clearTrackingData();
}

/**
 * إعادة المنح. `consent: revoke` في fbevents.js قفل لا إسقاط: كل نداء أثناءه
 * يُحتجز في `fbq.queue` ويُعاد تشغيله عند `grant`. فيُسقط المحتجز أولًا ثم
 * يُرفع القفل — لا يُرسل شيء التُقط أثناء السحب، والأحداث الجديدة تعمل فورًا
 * بلا إعادة تحميل (فلا يضيع ما كتبه الزائر في نموذج الحجز).
 */
function grantPixel(): void {
  if (!activePixel || !window.fbq) return;
  dropHeldEvents(window.fbq);
  window.fbq("consent", "grant");
}

/** نداءات تُرسل أحداثًا؛ ما سواها (set/init/consent) إعداد يُبقى بترتيبه. */
const SENDING_METHODS = new Set(["track", "trackCustom", "trackSingle", "trackSingleCustom", "trackShopify", "trackWebchat", "send"]);

function dropHeldEvents(fbq: Fbq): void {
  if (!Array.isArray(fbq.queue)) return;
  const kept = fbq.queue.filter((entry) => !SENDING_METHODS.has(String((entry as ArrayLike<unknown>)[0])));
  fbq.queue.length = 0;
  fbq.queue.push(...kept);
}

/**
 * نطاق الصفحة وآباؤه: Meta تكتب ملفاتها على النطاق الأعلى (مثل
 * `.baytalmosawer.net`) حتى في `www` أو نطاق فرعي. نطاق بلا نقطة يرفضه
 * المتصفح فلا أثر له.
 */
function cookieDomains(hostname: string): string[] {
  const parts = hostname.split(".");
  const domains: string[] = [];
  for (let index = 0; index < parts.length - 1; index += 1) domains.push(parts.slice(index).join("."));
  return domains;
}

function removeItems(storage: () => Storage, keys: readonly string[]): void {
  for (const key of keys) {
    try {
      storage().removeItem(key);
    } catch {
      /* تخزين محجوب: لا شيء يُحذف ولا شيء يتعطل. */
    }
  }
}

/** مفاتيح الموقع ذات البادئة المحددة فقط — لا `clear()`. */
function removeItemsByPrefix(storage: () => Storage, prefix: string): void {
  try {
    const store = storage();
    const keys: string[] = [];
    for (let index = 0; index < store.length; index += 1) {
      const key = store.key(index);
      if (key?.startsWith(prefix)) keys.push(key);
    }
    for (const key of keys) store.removeItem(key);
  } catch {
    /* تخزين محجوب. */
  }
}

/**
 * يحذف بيانات التتبع التي كتبتها Meta على موقعنا: ملفات الارتباط بكل نطاق
 * ممكن وبالمسار `/` الذي تستخدمه، ومفاتيحها المعروفة في التخزين المحلي
 * وتخزين الجلسة، وعلامة InitiateCheckout. لا يمس اختيار الزائر
 * (`bm_ad_consent_v1`) ولا أي مفتاح آخر للموقع، ولا يستعمل `clear()`.
 * ملفات Meta على نطاقاتها هي (facebook.com) خارج متناول موقعنا.
 */
export function clearTrackingData(): void {
  try {
    const expired = "Max-Age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/";
    for (const name of META_COOKIES) {
      document.cookie = `${name}=; ${expired}`;
      for (const domain of cookieDomains(window.location.hostname)) {
        document.cookie = `${name}=; ${expired}; domain=${domain}`;
      }
    }
  } catch {
    /* ملفات الارتباط محجوبة. */
  }
  removeItems(() => window.localStorage, META_LOCAL_KEYS);
  removeItems(() => window.sessionStorage, [...META_SESSION_KEYS, INITIATE_KEY]);
  removeItemsByPrefix(() => window.sessionStorage, `${INITIATE_KEY}:`);
  pruneTrackingMarkers();
}

/**
 * علامات Purchase: تبقى الحديثة (تمنع احتساب الشراء مرتين إن سُحبت الموافقة
 * ثم أُعيدت)، وتُحذف الأقدم من 3 ساعات — وكذلك ما طابعه ليس رقمًا صحيحًا
 * موجبًا أو يقع في المستقبل، فلا يُفسَّر طابع تالف على أنه حديث.
 */
export function pruneTrackingMarkers(now = Date.now()): void {
  try {
    const storage = window.localStorage;
    const stale: string[] = [];
    for (let index = 0; index < storage.length; index += 1) {
      const key = storage.key(index);
      if (!key?.startsWith(PURCHASE_KEY_PREFIX)) continue;
      const raw = storage.getItem(key) ?? "";
      const stamp = /^\d{1,16}$/.test(raw) ? Number(raw) : Number.NaN;
      const valid = Number.isSafeInteger(stamp) && stamp > 0 && stamp <= now + MARKER_CLOCK_SKEW_MS;
      if (!valid || now - stamp > PURCHASE_MARKER_TTL_MS) stale.push(key);
    }
    for (const key of stale) storage.removeItem(key);
  } catch {
    /* تخزين محجوب. */
  }
}

/* ─────────────────────────── الإرسال ─────────────────────────── */

/**
 * يُرسل والرابط بلا `?o=`. fbevents.js يقرأ عنوان الصفحة لحظة معالجة
 * النداء، فيُحذف المعامل ثم يُنادى fbq ثم يُعاد الرابط — في خطوة متزامنة
 * واحدة: لا رسم ولا تحديث صفحة بينها، فإعادة تحميل صفحة النجاح تجد رقم
 * الطلب دائمًا. وإن أجّل fbevents.js النداء (إعداده لم يكتمل) يُسحب من
 * طابوره ويُعاد لاحقًا بالطريقة نفسها — لا يبقى الرابط منقوصًا، ولا يُقرأ
 * رقم الطلب. بعد المحاولات كلها يُترك الحدث ولا يُرسل.
 */
function sendWithoutOrderParam(args: unknown[], attempt = 0): void {
  const fbq = window.fbq;
  if (!fbq || readConsent() !== "granted") return;
  const url = new URL(window.location.href);
  if (!url.searchParams.has(ORDER_PARAM)) {
    fbq(...args);
    return;
  }
  const original = url.href;
  url.searchParams.delete(ORDER_PARAM);
  const queued = fbq.queue?.length ?? 0;
  /* history.state يحمل علامة الموجّه: الاستبدال لا يُطلق تنقلًا في Next. */
  window.history.replaceState(window.history.state, "", url.href);
  let deferred = false;
  try {
    fbq(...args);
  } finally {
    if ((fbq.queue?.length ?? 0) > queued) {
      fbq.queue.splice(queued);
      deferred = true;
    }
    window.history.replaceState(window.history.state, "", original);
  }
  if (deferred && attempt < MAX_RETRIES) {
    window.setTimeout(() => sendWithoutOrderParam(args, attempt + 1), RETRY_MS);
  }
}

type PixelEvent = "PageView" | "ViewContent" | "InitiateCheckout" | "Purchase";

function track(event: PixelEvent, params: Record<string, unknown> = {}, eventID?: string): void {
  if (typeof window === "undefined") return;
  const run = () => {
    if (readConsent() !== "granted" || !activePixel) return;
    sendWithoutOrderParam(["track", event, params, eventID ? { eventID } : {}]);
  };
  if (scriptReady) run();
  else if (pending.length < MAX_PENDING) pending.push(run);
}

/** مرة واحدة لكل مفتاح في عمر الصفحة. */
function once(key: string): boolean {
  if (sent.has(key)) return false;
  sent.add(key);
  return true;
}

function randomId(): string {
  try {
    return window.crypto.randomUUID();
  } catch {
    return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }
}

/** PageView لكل مسار مرة واحدة — تغيّر `?` أو `#` وحده ليس صفحة جديدة. */
/** بلا موافقة لا يُحجز مفتاح «مرة واحدة»: الحدث يبقى ممكنًا بعد إعادة المنح. */
export function trackPageView(pathname: string): void {
  if (readConsent() !== "granted") return;
  if (once(`pv:${pathname}`)) track("PageView");
}

export function trackViewContent(content: PixelContent = WORKSHOP_CONTENT, valueSar: number = pricing.currentSar): void {
  if (readConsent() !== "granted" || !once(`vc:${content.content_ids.join(",")}`)) return;
  track("ViewContent", { ...content, value: valueSar, currency: "SAR" });
}

/**
 * «ادفع الآن» ببيانات صالحة — مرة واحدة في الجلسة. لا يُعرف قبول الخادم:
 * التحويل إلى صفحة الدفع `redirect()` بلا رد إلى الواجهة.
 */
export function trackInitiateCheckout(
  content: PixelContent = WORKSHOP_CONTENT,
  valueSar: number = pricing.currentSar,
): void {
  /* صفحة الجوال تحتفظ بمفتاحها القديم؛ غيرها مفتاح لكل محتوى. */
  const key = content === WORKSHOP_CONTENT ? INITIATE_KEY : `${INITIATE_KEY}:${content.content_ids.join(",")}`;
  if (readConsent() !== "granted" || !once(key)) return;
  try {
    if (window.sessionStorage.getItem(key)) return;
    window.sessionStorage.setItem(key, "1");
  } catch {
    /* حارس الذاكرة يكفي لهذه الصفحة. */
  }
  track(
    "InitiateCheckout",
    { ...content, value: valueSar, currency: "SAR", num_items: 1 },
    `ic:${randomId()}`,
  );
}

/**
 * Purchase لطلب حسمه الخادم «مدفوعًا» — مرة واحدة لكل طلب على هذا المتصفح.
 * القيمة من الطلب المؤكد. `eventId` يشتقه الخادم من الطلب بتجزئة لا تُعكس:
 * ثابت لكل طلب، ولا يحمل رقم الطلب نفسه.
 */
export function trackPurchase(eventId: string, valueSar: number, content: PixelContent = WORKSHOP_CONTENT): void {
  if (readConsent() !== "granted") return;
  const key = `${PURCHASE_KEY_PREFIX}${eventId}`;
  if (!once(key)) return;
  try {
    if (window.localStorage.getItem(key)) return;
    window.localStorage.setItem(key, String(Date.now()));
  } catch {
    /* حارس الذاكرة وحده؛ ونافذة الساعتين على الخادم تحد من الباقي. */
  }
  track("Purchase", { ...content, value: valueSar, currency: "SAR", num_items: 1 }, eventId);
}
