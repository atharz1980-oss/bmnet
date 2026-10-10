import { afterAll, beforeAll, describe, expect, mock, test } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

mock.module("server-only", () => ({}));

const { metaPixelId, purchaseEventId, purchaseTrackable, PURCHASE_TRACKING_WINDOW_MS } = await import(
  "@/lib/landing/meta-pixel-server"
);
const pixel = await import("@/lib/landing/meta-pixel");
const { pricing: mobilePricing } = await import("@/data/landing/mobile-content");
const { PHOTOGRAPHY_PIXEL_CONTENT } = await import("@/data/landing/photography-basics");

/*
 * Meta Pixel لصفحة الحملة — المرحلة الأولى (المتصفح فقط): موافقة قبل أي
 * تحميل، Purchase لطلب مدفوع حديث في الإنتاج فقط، بلا تكرار، وبلا رقم الطلب.
 */

const LIVE = pixel.LIVE_META_PIXEL_ID;
const TEST_PIXEL = "999999999999999";
const NOW = Date.UTC(2026, 9, 27, 18, 0, 0);
const minutesAgo = (minutes: number) => new Date(NOW - minutes * 60_000).toISOString();

describe("pixel id from the environment", () => {
  test("valid numeric ids only; empty or malformed disables the pixel", () => {
    expect(metaPixelId(LIVE)).toBe(LIVE);
    expect(metaPixelId(` ${LIVE} `)).toBe(LIVE);
    for (const value of [undefined, "", "   ", "abc", "123", "1124018907231466<script>"]) {
      expect(metaPixelId(value)).toBeNull();
    }
  });

  test("the live id runs on the official domain only", () => {
    expect(pixel.pixelAllowedHere(LIVE, "baytalmosawer.net")).toBe(true);
    expect(pixel.pixelAllowedHere(LIVE, "www.baytalmosawer.net")).toBe(true);
    for (const host of ["localhost", "127.0.0.1", "preview.vercel.app", "baytalmosawer.net.evil.com"]) {
      expect(pixel.pixelAllowedHere(LIVE, host)).toBe(false);
    }
    expect(pixel.pixelAllowedHere(TEST_PIXEL, "localhost")).toBe(true);
    expect(pixel.pixelAllowedHere("nope", "baytalmosawer.net")).toBe(false);
  });
});

describe("Purchase is decided on the server", () => {
  const live = { now: NOW, mode: "production" as const, testPriceSar: null, pixelId: LIVE, allowTestPurchases: false };

  test("production, no test price, paid within two hours → tracked", () => {
    expect(purchaseTrackable({ ...live, paidAt: minutesAgo(0) })).toBe(true);
    expect(purchaseTrackable({ ...live, paidAt: minutesAgo(119) })).toBe(true);
  });

  test("older than the two-hour window, missing, or malformed paid_at → not tracked", () => {
    expect(PURCHASE_TRACKING_WINDOW_MS).toBe(2 * 60 * 60 * 1000);
    expect(purchaseTrackable({ ...live, paidAt: minutesAgo(121) })).toBe(false);
    expect(purchaseTrackable({ ...live, paidAt: null })).toBe(false);
    expect(purchaseTrackable({ ...live, paidAt: "yesterday" })).toBe(false);
    expect(purchaseTrackable({ ...live, paidAt: minutesAgo(-60) })).toBe(false);
  });

  test("test payments never reach the live pixel", () => {
    expect(purchaseTrackable({ ...live, mode: "test", paidAt: minutesAgo(1) })).toBe(false);
    expect(purchaseTrackable({ ...live, testPriceSar: 1, paidAt: minutesAgo(1) })).toBe(false);
    /* حتى مع مفتاح الاختبار المحلي. */
    expect(purchaseTrackable({ ...live, mode: "test", allowTestPurchases: true, paidAt: minutesAgo(1) })).toBe(false);
  });

  test("local override works only with a separate test pixel", () => {
    expect(
      purchaseTrackable({ ...live, mode: "test", pixelId: TEST_PIXEL, allowTestPurchases: true, paidAt: minutesAgo(1) }),
    ).toBe(true);
    expect(purchaseTrackable({ ...live, mode: "test", pixelId: TEST_PIXEL, paidAt: minutesAgo(1) })).toBe(false);
  });

  test("no pixel id → nothing tracked", () => {
    expect(purchaseTrackable({ ...live, pixelId: null, paidAt: minutesAgo(1) })).toBe(false);
  });

  test("purchase event id is stable per order and never contains the order id", () => {
    const order = "4f1c2b8e-5d0a-4c1e-9f3b-2a7d6e8c9b01";
    expect(purchaseEventId(order)).toBe(purchaseEventId(order));
    expect(purchaseEventId(order)).not.toBe(purchaseEventId("5f1c2b8e-5d0a-4c1e-9f3b-2a7d6e8c9b01"));
    expect(purchaseEventId(order)).toMatch(/^purchase:[0-9a-f]{32}$/);
    expect(purchaseEventId(order)).not.toContain(order.slice(0, 8));
  });

  test("success page renders PixelPurchase only in the paid branch, valued from the confirmed order", () => {
    const page = readFileSync("src/app/lp/mobile-content/success/page.tsx", "utf8");
    expect(page).toContain('receipt?.outcome === "paid" && purchaseTrackable({ paidAt: receipt.paidAt })');
    expect(page).toContain("valueSar={receipt.totalAmount / 100}");
    /* رقم الطلب لا يصل إلى مكوّن العميل — معرّف الحدث المشتق فقط. */
    expect(page).toContain("<PixelPurchase eventId={purchaseEvent} ");
    expect(page).toContain("? purchaseEventId(orderId)");
    const paidBranch = page.slice(page.indexOf('receipt.outcome === "paid" ?'), page.indexOf('receipt.outcome === "pending" ?'));
    expect(paidBranch).toContain("<PixelPurchase");
    expect(page.match(/<PixelPurchase/g)?.length).toBe(1);
    expect(page).not.toMatch(/pricing|APPROVED_PRICE_SAR|currentSar/);
  });
});

/* ─────────────────────────── المتصفح ─────────────────────────── */

function fakeStorage() {
  const map = new Map<string, string>();
  return {
    getItem: (key: string) => map.get(key) ?? null,
    setItem: (key: string, value: string) => void map.set(key, String(value)),
    removeItem: (key: string) => void map.delete(key),
  };
}

function installFakeBrowser(href: string) {
  const location = new URL(href);
  const calls: Array<{ args: unknown[]; href: string }> = [];
  const timers: Array<() => void> = [];
  const win = {
    location,
    history: {
      state: { __NA: true },
      replaceState(_state: unknown, _unused: string, url: string) {
        location.href = new URL(url, location.href).href;
      },
    },
    localStorage: fakeStorage(),
    sessionStorage: fakeStorage(),
    crypto: { randomUUID: () => "uuid-1" },
    addEventListener() {},
    removeEventListener() {},
    setTimeout(run: () => void) {
      timers.push(run);
      return timers.length;
    },
    clearTimeout() {},
  } as Record<string, unknown>;
  Object.assign(globalThis, { window: win, document: { cookie: "" } });
  return {
    win,
    calls,
    location,
    flushTimers: () => timers.splice(0).forEach((run) => run()),
    /** fbevents.js «مقفل» (إعداده لم يكتمل): يؤجّل النداءات في طابوره. */
    locked: false,
    /** السكربت «حُمّل» وإعداده جاهز: كل نداء يُسجَّل مع عنوان الصفحة لحظته. */
    loadScript(pixelId: string) {
      const fbq = win.fbq as {
        queue: unknown[];
        callMethod?: (...args: unknown[]) => void;
        instance?: unknown;
      };
      fbq.instance = { configsLoaded: { [pixelId]: true } };
      fbq.callMethod = (...args: unknown[]) => {
        if (this.locked) fbq.queue.push(args);
        else calls.push({ args, href: location.href });
      };
      pixel.markPixelLoaded();
    },
  };
}

describe("browser tracking (consent, dedupe, no order id in the URL)", () => {
  const ORDER = "4f1c2b8e-5d0a-4c1e-9f3b-2a7d6e8c9b01";
  const EVENT = purchaseEventId(ORDER);
  let browser: ReturnType<typeof installFakeBrowser>;
  beforeAll(() => {
    browser = installFakeBrowser(`https://baytalmosawer.net/lp/mobile-content/success?o=${ORDER}&utm_source=fb`);
  });
  /* لا يتسرب «متصفح» مزيّف إلى ملفات الاختبار الأخرى. */
  afterAll(() => {
    delete (globalThis as Record<string, unknown>).window;
    delete (globalThis as Record<string, unknown>).document;
  });
  const tracked = (name: string) => browser.calls.filter((call) => call.args[0] === "track" && call.args[1] === name);

  test("nothing is sent before consent", () => {
    expect(pixel.consentSnapshot()).toBe("unset");
    pixel.trackPurchase(EVENT, 96);
    pixel.trackInitiateCheckout();
    expect(browser.win.fbq).toBeUndefined();
  });

  test("after consent: init with automatic events off, Purchase once with the confirmed value", () => {
    pixel.setConsent("granted");
    pixel.installPixel(TEST_PIXEL);
    const fbq = browser.win.fbq as { queue: unknown[][]; disablePushState?: boolean };
    expect(fbq.disablePushState).toBe(true);
    expect(fbq.queue).toEqual([
      ["set", "autoConfig", false, TEST_PIXEL],
      ["init", TEST_PIXEL],
    ]);
    browser.loadScript(TEST_PIXEL);

    pixel.trackPurchase(EVENT, 96);
    pixel.trackPurchase(EVENT, 96);
    const purchases = tracked("Purchase");
    expect(purchases.length).toBe(1);
    expect(purchases[0].args[2]).toMatchObject({ value: 96, currency: "SAR", content_ids: ["course-jawal"] });
    expect(purchases[0].args[3]).toEqual({ eventID: EVENT });
  });

  test("the order id is absent from the URL Meta reads, and restored in the same step (reload keeps it)", () => {
    const purchase = tracked("Purchase")[0];
    expect(purchase.href).not.toContain(ORDER);
    expect(purchase.href).toContain("utm_source=fb");
    /* لا مهلة: الرابط عاد فور الإرسال، قبل أي مؤقت. */
    expect(browser.location.href).toContain(`o=${ORDER}`);
  });

  test("a call deferred by fbevents is pulled back and retried — never processed with the order id", () => {
    const fbq = browser.win.fbq as { queue: unknown[] };
    const queuedBefore = fbq.queue.length;
    browser.locked = true;
    pixel.trackPageView("/lp/mobile-content/success");
    /* النداء المؤجَّل سُحب من الطابور: لن يُعالج لاحقًا برابط فيه رقم الطلب. */
    expect(fbq.queue.length).toBe(queuedBefore);
    expect(browser.location.href).toContain(`o=${ORDER}`);
    expect(tracked("PageView").length).toBe(0);
    browser.locked = false;
    browser.flushTimers();
    const views = tracked("PageView");
    expect(views.length).toBe(1);
    expect(views[0].href).not.toContain(ORDER);
    expect(browser.location.href).toContain(`o=${ORDER}`);
  });

  test("a reload on the same browser does not resend (localStorage guard)", () => {
    expect(browser.win.localStorage).toBeDefined();
    const storage = browser.win.localStorage as ReturnType<typeof fakeStorage>;
    expect(storage.getItem(`bm_px:purchase:${EVENT}`)).not.toBeNull();
  });

  test("InitiateCheckout once per session; ViewContent and PageView once", () => {
    pixel.trackInitiateCheckout();
    pixel.trackInitiateCheckout();
    pixel.trackViewContent();
    pixel.trackViewContent();
    pixel.trackPageView("/lp/mobile-content");
    pixel.trackPageView("/lp/mobile-content");
    pixel.trackPageView("/lp/mobile-content/success");
    expect(tracked("InitiateCheckout").length).toBe(1);
    expect(tracked("InitiateCheckout")[0].args[2]).toMatchObject({ currency: "SAR", num_items: 1 });
    expect(tracked("ViewContent").length).toBe(1);
    /* صفحة الهبوط مرة، وصفحة النجاح مرة (من الاختبار السابق) — لا تكرار. */
    expect(tracked("PageView").length).toBe(2);
  });

  test("photography page: its own content and the actually paid values; mobile defaults unchanged", () => {
    const photo = (name: string) =>
      tracked(name).filter((call) => (call.args[2] as { content_ids?: string[] }).content_ids?.[0] === "photography-basics");
    pixel.trackViewContent(PHOTOGRAPHY_PIXEL_CONTENT, 796);
    pixel.trackViewContent(PHOTOGRAPHY_PIXEL_CONTENT, 796);
    pixel.trackInitiateCheckout(PHOTOGRAPHY_PIXEL_CONTENT, 300);
    pixel.trackInitiateCheckout(PHOTOGRAPHY_PIXEL_CONTENT, 300);
    pixel.trackPurchase("purchase:photo-deposit", 300, PHOTOGRAPHY_PIXEL_CONTENT);
    pixel.trackPurchase("purchase:photo-balance", 496, PHOTOGRAPHY_PIXEL_CONTENT);
    pixel.trackPurchase("purchase:photo-balance", 496, PHOTOGRAPHY_PIXEL_CONTENT);

    expect(photo("ViewContent").map((call) => call.args[2])).toEqual([
      { ...PHOTOGRAPHY_PIXEL_CONTENT, value: 796, currency: "SAR" },
    ]);
    expect(photo("InitiateCheckout").length).toBe(1);
    expect(photo("InitiateCheckout")[0].args[2]).toMatchObject({ value: 300, currency: "SAR" });
    /* كل دفعة مؤكدة مرة واحدة بقيمتها هي — لا 796 مكررة. */
    expect(photo("Purchase").map((call) => (call.args[2] as { value: number }).value)).toEqual([300, 496]);
    expect(photo("Purchase").map((call) => call.args[3])).toEqual([
      { eventID: "purchase:photo-deposit" },
      { eventID: "purchase:photo-balance" },
    ]);
    /* صفحة الجوال: محتواها وسعرها الافتراضيان كما كانا، وحارس جلستها القديم نفسه. */
    const mobileView = tracked("ViewContent").find(
      (call) => (call.args[2] as { content_ids: string[] }).content_ids[0] !== "photography-basics",
    );
    expect(mobileView?.args[2]).toEqual({ ...pixel.WORKSHOP_CONTENT, value: mobilePricing.currentSar, currency: "SAR" });
    const session = browser.win.sessionStorage as ReturnType<typeof fakeStorage>;
    expect(session.getItem("bm_px:ic")).toBe("1");
    expect(session.getItem("bm_px:ic:photography-basics")).toBe("1");
  });

  test("withdrawing consent revokes and stops further events", () => {
    pixel.setConsent("denied");
    expect(browser.calls.some((call) => call.args[0] === "consent" && call.args[1] === "revoke")).toBe(true);
    const before = browser.calls.length;
    pixel.trackPageView("/lp/mobile-content/other");
    pixel.trackPurchase("purchase:another", 96);
    expect(browser.calls.length).toBe(before);
  });

  test("events never carry personal data or the order id", () => {
    for (const call of browser.calls) {
      expect(JSON.stringify(call.args)).not.toMatch(/@|9665\d{8}|"em"|"ph"|"fn"/);
      expect(JSON.stringify(call.args)).not.toContain(ORDER);
    }
    /* ما يُرسل فعلًا هو أحداث track (consent يغيّر حالة محلية بلا إرسال). */
    const sentEvents = browser.calls.filter((call) => call.args[0] === "track");
    expect(sentEvents.length).toBeGreaterThan(0);
    for (const call of sentEvents) expect(call.href).not.toContain(ORDER);
  });
});

/* ─────────────────────────── العزل ─────────────────────────── */

function walk(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory() ? walk(join(dir, entry.name)) : [join(dir, entry.name)],
  );
}

describe("isolation", () => {
  test("the pixel lives only under the campaign route", () => {
    const holders = walk("src")
      .filter((file) => /fbevents|connect\.facebook\.net|fbq\(/.test(readFileSync(file, "utf8")))
      .map((file) => file.replace(/\\/g, "/"))
      .sort();
    expect(holders).toEqual([
      "src/components/landing/mobile-content/meta-pixel.tsx",
      "src/lib/landing/meta-pixel.ts",
    ]);
    const importers = walk("src")
      .filter((file) => readFileSync(file, "utf8").includes("mobile-content/meta-pixel\""))
      .map((file) => file.replace(/\\/g, "/"))
      .sort();
    /* صفحتا الحملة فقط: الجوال، ومجموعة (campaign) لأساسيات التصوير. */
    expect(importers).toEqual([
      "src/app/lp/mobile-content/layout.tsx",
      "src/app/lp/photography-basics/(campaign)/layout.tsx",
    ]);
    expect(readFileSync("src/app/layout.tsx", "utf8")).not.toMatch(/MetaPixel|TrackingConsent|fbq/);
  });

  test("the campaign layout mounts the pixel and the consent bar together, only with a pixel id", () => {
    const layout = readFileSync("src/app/lp/mobile-content/layout.tsx", "utf8");
    expect(layout).toContain("const pixelId = metaPixelId();");
    expect(layout).toMatch(/\{pixelId && \(\s*<>\s*<MetaPixel pixelId=\{pixelId\} \/>\s*<TrackingConsent \/>/);
  });

  test("photography: the pixel wraps the page and success only — never the balance-payment link page", () => {
    const layout = readFileSync("src/app/lp/photography-basics/(campaign)/layout.tsx", "utf8");
    expect(layout).toMatch(/\{pixelId && \(\s*<>\s*<MetaPixel pixelId=\{pixelId\} \/>\s*<TrackingConsent \/>/);
    const outside = walk("src/app/lp/photography-basics")
      .map((file) => file.replace(/\\/g, "/"))
      .filter((file) => !file.includes("/(campaign)/"))
      .sort();
    expect(outside).toEqual([
      "src/app/lp/photography-basics/actions.ts",
      "src/app/lp/photography-basics/pay/[token]/page.tsx",
    ]);
    for (const file of outside) expect(readFileSync(file, "utf8")).not.toMatch(/MetaPixel|TrackingConsent|fbq|meta-pixel/);
  });

  test("the script loads only after consent", () => {
    const component = readFileSync("src/components/landing/mobile-content/meta-pixel.tsx", "utf8");
    expect(component).toContain('const enabled = consent === "granted" && allowedHere;');
    expect(component).toContain("if (!enabled) return null;");
  });
});

/* ═══════════════ سحب الموافقة: تنظيف دقيق، إعادة المنح، وتعدد التبويبات ═══════════════ */

type Pixel = typeof import("@/lib/landing/meta-pixel");
let instance = 0;
/** نسخة جديدة من الوحدة = صفحة أو تبويب جديد (حالة الذاكرة تبدأ من الصفر). */
const freshPixel = () => import(`../src/lib/landing/meta-pixel.ts?tab=${++instance}`) as Promise<Pixel>;

const HOST = "www.baytalmosawer.net";
const HOUR = 60 * 60 * 1000;

/** تخزين يشبه المتصفح: length/key، و clear() يُسجَّل لو استُدعي (ممنوع). */
function browserStorage(seed: Record<string, string> = {}) {
  const map = new Map(Object.entries(seed));
  const storage = {
    clearCalls: 0,
    get length() {
      return map.size;
    },
    key: (index: number) => [...map.keys()][index] ?? null,
    getItem: (key: string) => map.get(key) ?? null,
    setItem: (key: string, value: string) => void map.set(key, String(value)),
    removeItem: (key: string) => void map.delete(key),
    clear() {
      storage.clearCalls += 1;
      map.clear();
    },
    keys: () => [...map.keys()].sort(),
  };
  return storage;
}

/** جرة ملفات ارتباط بمطابقة النطاق كالمتصفح: النقطة البادئة لا تهم، والحذف بـ Max-Age=0. */
function cookieJar(seed: Array<[name: string, domain: string | null]>) {
  const jar = new Map<string, string>();
  const id = (name: string, domain: string | null) =>
    `${name}|${domain ? domain.replace(/^\./, "") : `host:${HOST}`}`;
  for (const [name, domain] of seed) jar.set(id(name, domain), name);
  return {
    names: () => [...jar.keys()].sort(),
    document: {
      get cookie() {
        return [...jar.values()].map((name) => `${name}=x`).join("; ");
      },
      set cookie(value: string) {
        const [pair, ...attributes] = value.split(";").map((part) => part.trim());
        const name = pair.split("=")[0];
        const domain = attributes.find((a) => a.toLowerCase().startsWith("domain="))?.slice(7) ?? null;
        if (attributes.some((a) => /^max-age=0$/i.test(a))) jar.delete(id(name, domain));
        else jar.set(id(name, domain), name);
      },
    },
  };
}

interface Tab {
  window: Record<string, unknown>;
  calls: unknown[][];
  listeners: Record<string, Array<(event: unknown) => void>>;
}

/** متصفح واحد بتبويبات: تخزين محلي وملفات ارتباط مشتركة، وتخزين جلسة ونافذة لكل تبويب. */
function browserProfile(localSeed: Record<string, string>, cookies: Array<[string, string | null]>) {
  const local = browserStorage(localSeed);
  const jar = cookieJar(cookies);
  const timers: Array<() => void> = [];
  const open = (): Tab => {
    const listeners: Tab["listeners"] = {};
    const calls: unknown[][] = [];
    const window = {
      location: new URL(`https://${HOST}/lp/mobile-content`),
      history: { state: { __NA: true }, replaceState() {} },
      localStorage: local,
      sessionStorage: browserStorage({ "bm_px:ic": "1", FACEBOOK_IWL_CONFIG_STORAGE_KEY: "{}", "next-router": "keep" }),
      crypto: { randomUUID: () => "uuid" },
      addEventListener(type: string, fn: (event: unknown) => void) {
        (listeners[type] ??= []).push(fn);
      },
      removeEventListener() {},
      setTimeout(run: () => void) {
        timers.push(run);
        return timers.length;
      },
      clearTimeout() {},
    } as Record<string, unknown>;
    return { window, calls, listeners };
  };
  /** الكود يقرأ `window` و`document` العامّين لحظة التنفيذ: «التركيز» على تبويب. */
  const focus = (tab: Tab) => Object.assign(globalThis, { window: tab.window, document: jar.document });
  /** السكربت حُمّل وإعداده جاهز في هذا التبويب: نداءات fbq تُسجَّل. */
  const loadScript = (tab: Tab, pixel: Pixel, id: string) => {
    focus(tab);
    const fbq = tab.window.fbq as { callMethod?: (...a: unknown[]) => void; instance?: unknown };
    fbq.instance = { configsLoaded: { [id]: true } };
    fbq.callMethod = (...args: unknown[]) => tab.calls.push(args);
    pixel.markPixelLoaded();
  };
  /** حدث storage كما يصل إلى التبويبات الأخرى فقط. */
  const storageEvent = (tab: Tab, key: string | null) => {
    focus(tab);
    for (const fn of tab.listeners.storage ?? []) fn({ key });
  };
  const flush = () => timers.splice(0).forEach((run) => run());
  return { local, jar, open, focus, loadScript, storageEvent, flush };
}

const tracks = (tab: Tab, name?: string) =>
  tab.calls.filter((call) => call[0] === "track" && (name === undefined || call[1] === name));
const consentCalls = (tab: Tab, kind: "grant" | "revoke") =>
  tab.calls.filter((call) => call[0] === "consent" && call[1] === kind).length;
const sessionOf = (tab: Tab) => tab.window.sessionStorage as ReturnType<typeof browserStorage>;

const UNRELATED_LOCAL = {
  "sb-abcd-auth-token": "session",
  "bm-admin-store": "draft",
  "public-cms-cache": "view",
  theme: "dark",
};
const META_LOCAL = {
  multiFbc: "fb.1.123.IwAR",
  lastExternalReferrer: "facebook.com",
  lastExternalReferrerTime: "1",
  fbcEbpOrigin: "x",
};
const META_COOKIES_SEED: Array<[string, string | null]> = [
  ["_fbp", ".baytalmosawer.net"],
  ["_fbc", ".baytalmosawer.net"],
  ["_fbleid", ".baytalmosawer.net"],
  ["_fbp", null],
];
const UNRELATED_COOKIES: Array<[string, string | null]> = [
  ["sb-abcd-auth-token", null],
  ["cpa-probe", ".baytalmosawer.net"],
];

function resetGlobals() {
  delete (globalThis as Record<string, unknown>).window;
  delete (globalThis as Record<string, unknown>).document;
}

describe("clearTrackingData — explicit Meta keys only", () => {
  afterAll(resetGlobals);

  test("removes Meta cookies (every domain variant) and Meta storage keys; keeps everything else", async () => {
    const now = Date.now();
    const profile = browserProfile(
      {
        ...UNRELATED_LOCAL,
        ...META_LOCAL,
        bm_ad_consent_v1: "denied",
        "bm_px:purchase:recent": String(now - HOUR),
        "bm_px:purchase:old": String(now - 4 * HOUR),
      },
      [...META_COOKIES_SEED, ...UNRELATED_COOKIES],
    );
    const tab = profile.open();
    profile.focus(tab);
    const fresh = await freshPixel();
    fresh.clearTrackingData();

    expect(profile.local.keys()).toEqual(
      ["bm-admin-store", "bm_ad_consent_v1", "bm_px:purchase:recent", "public-cms-cache", "sb-abcd-auth-token", "theme"].sort(),
    );
    expect(profile.local.getItem("bm_ad_consent_v1")).toBe("denied");
    expect(profile.local.clearCalls).toBe(0);
    expect(sessionOf(tab).keys()).toEqual(["next-router"]);
    expect(sessionOf(tab).clearCalls).toBe(0);
    expect(profile.jar.names()).toEqual(["cpa-probe|baytalmosawer.net", `sb-abcd-auth-token|host:${HOST}`]);
  });

  test("the module never calls storage.clear(), and the key lists are explicit", () => {
    const source = readFileSync("src/lib/landing/meta-pixel.ts", "utf8");
    expect(source).not.toMatch(/\.clear\(\)/);
    expect([...pixel.META_COOKIES]).toEqual(["_fbp", "_fbc", "_fbleid"]);
    expect([...pixel.META_LOCAL_KEYS]).toEqual(["multiFbc", "lastExternalReferrer", "lastExternalReferrerTime", "fbcEbpOrigin"]);
    expect([...pixel.META_SESSION_KEYS]).toEqual(["FACEBOOK_IWL_CONFIG_STORAGE_KEY"]);
  });

  test("purchase markers: recent kept; older than 3h, malformed, or future removed", async () => {
    const now = Date.UTC(2026, 9, 27, 18, 0, 0);
    const profile = browserProfile(
      {
        "bm_px:purchase:1h": String(now - HOUR),
        "bm_px:purchase:2h59": String(now - 3 * HOUR + 60_000),
        "bm_px:purchase:3h01": String(now - 3 * HOUR - 60_000),
        "bm_px:purchase:empty": "",
        "bm_px:purchase:text": "yesterday",
        "bm_px:purchase:exp": "1e12",
        "bm_px:purchase:negative": "-5",
        "bm_px:purchase:future": String(now + HOUR),
        "bm_px:other": "kept",
        ...UNRELATED_LOCAL,
      },
      [],
    );
    profile.focus(profile.open());
    const fresh = await freshPixel();
    fresh.pruneTrackingMarkers(now);
    expect(profile.local.keys()).toEqual(
      ["bm_px:other", "bm_px:purchase:1h", "bm_px:purchase:2h59", ...Object.keys(UNRELATED_LOCAL)].sort(),
    );
    expect(fresh.PURCHASE_MARKER_TTL_MS).toBe(3 * HOUR);
  });

  test("blocked storage and cookies never throw", async () => {
    const blocked = () => {
      throw new Error("SecurityError");
    };
    Object.assign(globalThis, {
      window: {
        location: new URL(`https://${HOST}/lp/mobile-content`),
        get localStorage() {
          return blocked();
        },
        get sessionStorage() {
          return blocked();
        },
        addEventListener() {},
      },
      document: {
        set cookie(_value: string) {
          blocked();
        },
      },
    });
    const fresh = await freshPixel();
    expect(() => fresh.clearTrackingData()).not.toThrow();
    expect(() => fresh.pruneTrackingMarkers()).not.toThrow();
    expect(() => fresh.setConsent("denied")).not.toThrow();
    expect(() => fresh.trackInitiateCheckout()).not.toThrow();
    expect(fresh.consentSnapshot()).toBe("denied");
  });
});

describe("withdrawal, re-grant, and two tabs", () => {
  afterAll(resetGlobals);
  const EVENT = "purchase:0123456789abcdef0123456789abcdef";

  test("nothing reaches fbq before consent; rejecting keeps it that way", async () => {
    const profile = browserProfile({}, []);
    const tab = profile.open();
    profile.focus(tab);
    const fresh = await freshPixel();
    fresh.subscribeConsent(() => {});
    fresh.trackPageView("/lp/mobile-content");
    fresh.trackViewContent();
    fresh.trackInitiateCheckout();
    fresh.trackPurchase(EVENT, 96);
    expect(tab.window.fbq).toBeUndefined();
    fresh.setConsent("denied");
    fresh.trackPageView("/lp/mobile-content/success");
    expect(tab.window.fbq).toBeUndefined();
    expect(profile.local.getItem("bm_ad_consent_v1")).toBe("denied");
  });

  test("rejecting does not throw or block the booking submit path", async () => {
    const profile = browserProfile({ bm_ad_consent_v1: "denied" }, []);
    profile.focus(profile.open());
    const fresh = await freshPixel();
    expect(() => fresh.trackInitiateCheckout()).not.toThrow();
    const form = readFileSync("src/components/landing/mobile-content/guest-checkout-form.tsx", "utf8");
    /* القياس لا يوقف الإرسال: لا preventDefault، والإجراء نفسه باقٍ. */
    expect(form).toContain("action={formAction}");
    expect(form).not.toContain("preventDefault");
    expect(form).toContain("if (validateGuestContact(values).ok && !trap) trackInitiateCheckout();");
  });

  test("withdraw stops sending at once, drops queued events, cleans; re-grant resumes", async () => {
    const profile = browserProfile({ ...UNRELATED_LOCAL }, UNRELATED_COOKIES);
    const tab = profile.open();
    profile.focus(tab);
    const fresh = await freshPixel();
    fresh.subscribeConsent(() => {});
    fresh.setConsent("granted");
    fresh.installPixel(TEST_PIXEL);
    /* حدث ينتظر تحميل السكربت، ثم سحب قبل التحميل: لا يُرسل أبدًا. */
    fresh.trackPageView("/lp/mobile-content");
    profile.local.setItem("multiFbc", "fb.1"); // ما كانت Meta ستكتبه
    profile.jar.document.cookie = "_fbp=fb.1; path=/; domain=.baytalmosawer.net";
    fresh.setConsent("denied");
    profile.loadScript(tab, fresh, TEST_PIXEL);
    profile.flush();
    expect(tracks(tab).length).toBe(0);
    expect(profile.local.getItem("multiFbc")).toBeNull();
    expect(profile.jar.names().some((name) => name.startsWith("_fbp"))).toBe(false);
    for (const key of Object.keys(UNRELATED_LOCAL)) expect(profile.local.getItem(key)).not.toBeNull();

    fresh.trackPageView("/lp/mobile-content/success");
    fresh.trackViewContent();
    fresh.trackPurchase(EVENT, 96);
    expect(tracks(tab).length).toBe(0);

    fresh.setConsent("granted");
    expect(consentCalls(tab, "grant")).toBe(1);
    fresh.trackPageView("/lp/mobile-content/success");
    expect(tracks(tab, "PageView").length).toBe(1);
  });

  test("no duplicate Purchase after withdraw and re-grant, including after a reload", async () => {
    const profile = browserProfile({}, []);
    const tab = profile.open();
    profile.focus(tab);
    const first = await freshPixel();
    first.subscribeConsent(() => {});
    first.setConsent("granted");
    first.installPixel(TEST_PIXEL);
    profile.loadScript(tab, first, TEST_PIXEL);
    first.trackPurchase(EVENT, 96);
    expect(tracks(tab, "Purchase").length).toBe(1);

    first.setConsent("denied");
    /* العلامة الحديثة باقية بعد السحب — هي ما يمنع الاحتساب مرة ثانية. */
    expect(profile.local.getItem(`bm_px:purchase:${EVENT}`)).not.toBeNull();
    first.setConsent("granted");
    first.trackPurchase(EVENT, 96);

    /* إعادة تحميل صفحة النجاح بعد إعادة المنح: نسخة جديدة من الوحدة، والتخزين نفسه. */
    const reloaded = profile.open();
    profile.focus(reloaded);
    const second = await freshPixel();
    second.subscribeConsent(() => {});
    second.installPixel(TEST_PIXEL);
    profile.loadScript(reloaded, second, TEST_PIXEL);
    second.trackPurchase(EVENT, 96);
    expect(tracks(tab, "Purchase").length + tracks(reloaded, "Purchase").length).toBe(1);
  });

  test("withdrawing in one tab stops and cleans the other tab without a reload", async () => {
    const profile = browserProfile({ bm_ad_consent_v1: "granted", ...UNRELATED_LOCAL }, UNRELATED_COOKIES);
    const tab1 = profile.open();
    const tab2 = profile.open();

    profile.focus(tab1);
    const one = await freshPixel();
    one.subscribeConsent(() => {});
    one.installPixel(TEST_PIXEL);
    profile.loadScript(tab1, one, TEST_PIXEL);

    profile.focus(tab2);
    const two = await freshPixel();
    let tab2Notified = 0;
    two.subscribeConsent(() => (tab2Notified += 1));
    two.installPixel(TEST_PIXEL);
    profile.loadScript(tab2, two, TEST_PIXEL);
    two.trackPageView("/lp/mobile-content");
    expect(tracks(tab2, "PageView").length).toBe(1);

    /* ما كتبته Meta أثناء عمل التبويب الثاني. */
    profile.local.setItem("lastExternalReferrer", "facebook.com");
    profile.jar.document.cookie = "_fbc=fb.1; path=/; domain=.baytalmosawer.net";
    sessionOf(tab2).setItem("FACEBOOK_IWL_CONFIG_STORAGE_KEY", "{}");

    profile.focus(tab1);
    one.setConsent("denied");
    profile.storageEvent(tab2, "bm_ad_consent_v1");

    expect(consentCalls(tab2, "revoke")).toBe(1);
    expect(tab2Notified).toBeGreaterThan(0);
    expect(two.consentSnapshot()).toBe("denied");
    expect(profile.local.getItem("lastExternalReferrer")).toBeNull();
    expect(profile.jar.names().some((name) => name.startsWith("_fbc"))).toBe(false);
    expect(sessionOf(tab2).getItem("FACEBOOK_IWL_CONFIG_STORAGE_KEY")).toBeNull();
    for (const key of Object.keys(UNRELATED_LOCAL)) expect(profile.local.getItem(key)).not.toBeNull();

    two.trackPageView("/lp/mobile-content/success");
    two.trackPurchase(EVENT, 96);
    profile.flush();
    expect(tracks(tab2).length).toBe(1); // الـ PageView الأول فقط، قبل السحب

    /* إعادة المنح من التبويب الأول تصل إلى الثاني وتستأنف. */
    profile.focus(tab1);
    one.setConsent("granted");
    profile.storageEvent(tab2, "bm_ad_consent_v1");
    expect(consentCalls(tab2, "grant")).toBe(1);
    two.trackPageView("/lp/mobile-content/other");
    expect(tracks(tab2, "PageView").length).toBe(2);
  });

  test("clearing site data in another tab (storage key null) stops tracking here", async () => {
    const profile = browserProfile({ bm_ad_consent_v1: "granted" }, []);
    const tab = profile.open();
    profile.focus(tab);
    const fresh = await freshPixel();
    fresh.subscribeConsent(() => {});
    fresh.installPixel(TEST_PIXEL);
    profile.loadScript(tab, fresh, TEST_PIXEL);
    profile.local.removeItem("bm_ad_consent_v1");
    profile.storageEvent(tab, null);
    expect(consentCalls(tab, "revoke")).toBe(1);
    expect(fresh.consentSnapshot()).toBe("unset");
    fresh.trackPageView("/lp/mobile-content/x");
    expect(tracks(tab).length).toBe(0);
  });
});

describe("success page settings link and load-time cleanup", () => {
  test("TrackingSettingsButton appears once, after the result card (every outcome)", () => {
    const page = readFileSync("src/app/lp/mobile-content/success/page.tsx", "utf8");
    expect(page.match(/<TrackingSettingsButton/g)?.length).toBe(1);
    expect(page.slice(page.indexOf("</section>"))).toContain("<TrackingSettingsButton");
    /* شروط Purchase كما هي. */
    expect(page).toContain('receipt?.outcome === "paid" && purchaseTrackable({ paidAt: receipt.paidAt })');
  });

  test("the pixel component cleans leftovers when the stored choice is denied, and prunes markers on load", () => {
    const component = readFileSync("src/components/landing/mobile-content/meta-pixel.tsx", "utf8");
    expect(component).toContain('if (consent === "denied") clearTrackingData();');
    expect(component).toContain("useEffect(() => pruneTrackingMarkers(), []);");
  });
});

/* ═══════════════ الأحداث المحتجزة أثناء السحب لا تُطلق عند إعادة المنح ═══════════════ */

/**
 * يحاكي fbevents.js كما في شيفرته: `consent: revoke` قفل؛ كل نداء غير
 * consent أثناءه يُدفع إلى `fbq.queue`، و`grant` يرفع القفل ويعيد تشغيل الطابور.
 */
function loadMetaLikeLibrary(tab: Tab, pixel: Pixel, id: string, focus: (tab: Tab) => void) {
  focus(tab);
  const fbq = tab.window.fbq as {
    (...args: unknown[]): void;
    callMethod?: (...a: unknown[]) => void;
    queue: unknown[];
    instance?: unknown;
  };
  let locked = false;
  const dispatch = (args: unknown[]) => tab.calls.push(args);
  fbq.instance = { configsLoaded: { [id]: true } };
  /* ما في طابور المقتطف عند التحميل يُعالج أولًا (set/init). */
  fbq.queue.splice(0).forEach((args) => dispatch([...(args as unknown[])]));
  fbq.callMethod = (...args: unknown[]) => {
    if (args[0] === "consent") {
      dispatch(args);
      if (args[1] === "revoke") locked = true;
      if (args[1] === "grant") {
        locked = false;
        fbq.queue.splice(0).forEach((held) => dispatch([...(held as unknown[])]));
      }
      return;
    }
    if (locked) fbq.queue.push(args);
    else dispatch(args);
  };
  pixel.markPixelLoaded();
  return fbq;
}

describe("held events: dropped on re-grant, new events flow, no reload", () => {
  afterAll(resetGlobals);
  const EVENT = "purchase:fedcba9876543210fedcba9876543210";
  const named = (tab: Tab, name: string) => tab.calls.filter((call) => call[0] !== "consent" && call[1] === name);

  test("same page: calls held during withdrawal are not released by re-grant; new events work", async () => {
    const profile = browserProfile({}, []);
    const tab = profile.open();
    profile.focus(tab);
    const pixel = await freshPixel();
    pixel.subscribeConsent(() => {});
    pixel.setConsent("granted");
    pixel.installPixel(TEST_PIXEL);
    const fbq = loadMetaLikeLibrary(tab, pixel, TEST_PIXEL, profile.focus);
    pixel.trackPageView("/lp/mobile-content");
    expect(named(tab, "PageView").length).toBe(1);

    pixel.setConsent("denied");
    /* ما يصل المكتبة أثناء السحب من خارج طبقتنا (أو من آليات Meta الداخلية) يُحتجز. */
    fbq("track", "PageView");
    fbq("trackCustom", "HeldDuringWithdrawal");
    fbq("track", "ViewContent", { value: 1 });
    /* وطبقتنا لا ترسل شيئًا أثناء السحب. */
    pixel.trackPageView("/lp/mobile-content/success");
    pixel.trackPurchase(EVENT, 96);
    expect(fbq.queue.length).toBe(3);

    pixel.setConsent("granted");
    expect(fbq.queue.length).toBe(0);
    expect(named(tab, "HeldDuringWithdrawal").length).toBe(0);
    expect(named(tab, "ViewContent").length).toBe(0);
    expect(named(tab, "PageView").length).toBe(1);

    /* الأحداث الجديدة بعد إعادة المنح تُرسل فورًا. */
    pixel.trackPageView("/lp/mobile-content/success");
    pixel.trackPurchase(EVENT, 96);
    expect(named(tab, "PageView").length).toBe(2);
    expect(named(tab, "Purchase").length).toBe(1);
    /* ولا تكرار لـ Purchase. */
    pixel.trackPurchase(EVENT, 96);
    expect(named(tab, "Purchase").length).toBe(1);
  });

  test("other tab: re-grant elsewhere drops this tab's held calls, then new events work", async () => {
    const profile = browserProfile({ bm_ad_consent_v1: "granted" }, []);
    const tab1 = profile.open();
    const tab2 = profile.open();
    profile.focus(tab1);
    const one = await freshPixel();
    one.subscribeConsent(() => {});
    one.installPixel(TEST_PIXEL);
    loadMetaLikeLibrary(tab1, one, TEST_PIXEL, profile.focus);

    profile.focus(tab2);
    const two = await freshPixel();
    two.subscribeConsent(() => {});
    two.installPixel(TEST_PIXEL);
    const fbq2 = loadMetaLikeLibrary(tab2, two, TEST_PIXEL, profile.focus);

    profile.focus(tab1);
    one.setConsent("denied");
    profile.storageEvent(tab2, "bm_ad_consent_v1");
    fbq2("trackCustom", "HeldInTab2");
    expect(fbq2.queue.length).toBe(1);

    profile.focus(tab1);
    one.setConsent("granted");
    profile.storageEvent(tab2, "bm_ad_consent_v1");
    expect(named(tab2, "HeldInTab2").length).toBe(0);
    expect(fbq2.queue.length).toBe(0);
    two.trackPageView("/lp/mobile-content/after");
    expect(named(tab2, "PageView").length).toBe(1);
  });

  test("withdraw before the script loads keeps set/init; re-grant still initialises correctly", async () => {
    const profile = browserProfile({}, []);
    const tab = profile.open();
    profile.focus(tab);
    const pixel = await freshPixel();
    pixel.subscribeConsent(() => {});
    pixel.setConsent("granted");
    pixel.installPixel(TEST_PIXEL);
    pixel.setConsent("denied");
    pixel.setConsent("granted");
    const stub = tab.window.fbq as { queue: unknown[][] };
    expect(stub.queue.map((args) => [...args].slice(0, 2))).toEqual([
      ["set", "autoConfig"],
      ["init", TEST_PIXEL],
      ["consent", "revoke"],
      ["consent", "grant"],
    ]);
    loadMetaLikeLibrary(tab, pixel, TEST_PIXEL, profile.focus);
    pixel.trackPageView("/lp/mobile-content");
    expect(named(tab, "PageView").length).toBe(1);
    expect(tab.calls.some((call) => call[0] === "init")).toBe(true);
  });

  test("withdrawal also drops events already waiting inside the library", async () => {
    const profile = browserProfile({}, []);
    const tab = profile.open();
    profile.focus(tab);
    const pixel = await freshPixel();
    pixel.subscribeConsent(() => {});
    pixel.setConsent("granted");
    pixel.installPixel(TEST_PIXEL);
    const fbq = loadMetaLikeLibrary(tab, pixel, TEST_PIXEL, profile.focus);
    fbq.queue.push(["track", "WaitingBeforeWithdrawal"]);
    pixel.setConsent("denied");
    pixel.setConsent("granted");
    expect(named(tab, "WaitingBeforeWithdrawal").length).toBe(0);
  });

  test("no reload or navigation anywhere: no reload loop, booking form state untouched", () => {
    const sources = [
      "src/lib/landing/meta-pixel.ts",
      "src/components/landing/mobile-content/meta-pixel.tsx",
      "src/components/landing/mobile-content/tracking-consent.tsx",
      "src/components/landing/mobile-content/pixel-events.tsx",
    ].map((file) => readFileSync(file, "utf8"));
    for (const source of sources) {
      expect(source).not.toMatch(/location\.(reload|assign|replace)|location\.href\s*=|router\.(refresh|push|replace)/);
    }
    /* النموذج: الإجراء والحقول كما هي؛ القياس لا يوقف الإرسال. */
    const form = readFileSync("src/components/landing/mobile-content/guest-checkout-form.tsx", "utf8");
    expect(form).toContain("action={formAction}");
    expect(form).not.toContain("preventDefault");
  });
});
