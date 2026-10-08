import { afterAll, beforeAll, describe, expect, mock, test } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

mock.module("server-only", () => ({}));

const { metaPixelId, purchaseEventId, purchaseTrackable, PURCHASE_TRACKING_WINDOW_MS } = await import(
  "@/lib/landing/meta-pixel-server"
);
const pixel = await import("@/lib/landing/meta-pixel");

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
      .map((file) => file.replace(/\\/g, "/"));
    expect(importers).toEqual(["src/app/lp/mobile-content/layout.tsx"]);
    expect(readFileSync("src/app/layout.tsx", "utf8")).not.toMatch(/MetaPixel|TrackingConsent|fbq/);
  });

  test("the campaign layout mounts the pixel and the consent bar together, only with a pixel id", () => {
    const layout = readFileSync("src/app/lp/mobile-content/layout.tsx", "utf8");
    expect(layout).toContain("const pixelId = metaPixelId();");
    expect(layout).toMatch(/\{pixelId && \(\s*<>\s*<MetaPixel pixelId=\{pixelId\} \/>\s*<TrackingConsent \/>/);
  });

  test("the script loads only after consent", () => {
    const component = readFileSync("src/components/landing/mobile-content/meta-pixel.tsx", "utf8");
    expect(component).toContain('const enabled = consent === "granted" && allowedHere;');
    expect(component).toContain("if (!enabled) return null;");
  });
});
