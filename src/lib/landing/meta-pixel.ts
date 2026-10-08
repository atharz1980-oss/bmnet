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

const CONSENT_KEY = "bm_ad_consent_v1";
const INITIATE_KEY = "bm_px:ic";
const PURCHASE_KEY_PREFIX = "bm_px:purchase:";
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
  /* تبويب آخر غيّر الاختيار. */
  const onStorage = (event: StorageEvent) => {
    if (event.key === CONSENT_KEY) listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
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
  else if (activePixel) window.fbq?.("consent", "grant");
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

/** سحب الموافقة: يتوقف الإرسال فورًا وتُحذف ملفات ارتباط Meta من الموقع. */
function revokePixel(): void {
  pending.length = 0;
  if (activePixel) window.fbq?.("consent", "revoke");
  const host = window.location.hostname;
  for (const name of ["_fbp", "_fbc"]) {
    for (const domain of ["", `; domain=${host}`, `; domain=.${host.replace(/^www\./, "")}`]) {
      document.cookie = `${name}=; Max-Age=0; path=/${domain}`;
    }
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
export function trackPageView(pathname: string): void {
  if (once(`pv:${pathname}`)) track("PageView");
}

export function trackViewContent(): void {
  if (!once("vc")) return;
  track("ViewContent", { ...WORKSHOP_CONTENT, value: pricing.currentSar, currency: "SAR" });
}

/**
 * «ادفع الآن» ببيانات صالحة — مرة واحدة في الجلسة. لا يُعرف قبول الخادم:
 * التحويل إلى صفحة الدفع `redirect()` بلا رد إلى الواجهة.
 */
export function trackInitiateCheckout(): void {
  if (readConsent() !== "granted" || !once("ic")) return;
  try {
    if (window.sessionStorage.getItem(INITIATE_KEY)) return;
    window.sessionStorage.setItem(INITIATE_KEY, "1");
  } catch {
    /* حارس الذاكرة يكفي لهذه الصفحة. */
  }
  track(
    "InitiateCheckout",
    { ...WORKSHOP_CONTENT, value: pricing.currentSar, currency: "SAR", num_items: 1 },
    `ic:${randomId()}`,
  );
}

/**
 * Purchase لطلب حسمه الخادم «مدفوعًا» — مرة واحدة لكل طلب على هذا المتصفح.
 * القيمة من الطلب المؤكد. `eventId` يشتقه الخادم من الطلب بتجزئة لا تُعكس:
 * ثابت لكل طلب، ولا يحمل رقم الطلب نفسه.
 */
export function trackPurchase(eventId: string, valueSar: number): void {
  if (readConsent() !== "granted") return;
  const key = `${PURCHASE_KEY_PREFIX}${eventId}`;
  if (!once(key)) return;
  try {
    if (window.localStorage.getItem(key)) return;
    window.localStorage.setItem(key, String(Date.now()));
  } catch {
    /* حارس الذاكرة وحده؛ ونافذة الساعتين على الخادم تحد من الباقي. */
  }
  track("Purchase", { ...WORKSHOP_CONTENT, value: valueSar, currency: "SAR", num_items: 1 }, eventId);
}
