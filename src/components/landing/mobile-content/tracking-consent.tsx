"use client";

/**
 * شريط الموافقة على التتبع الإعلاني — قبول ورفض متساويان، ويُعاد فتحه من
 * «إعدادات التتبع» لتغيير الاختيار أو سحبه. ليس نافذة حاجبة: الحجز والدفع
 * يعملان مهما كان الاختيار، ولا يُفعَّل شيء من Meta قبل «موافق».
 *
 * لا يغطي الحجز: يرتفع فوق شريط الحجز الثابت على الجوال حين يظهر، ويتنحى
 * ما دام زر حجز أو حقل من النموذج تحته، أو التركيز في حقل إدخال (لوحة
 * المفاتيح مفتوحة)، ويترك تحت الصفحة فراغًا بارتفاعه فيبقى آخر المحتوى
 * قابلًا للتمرير فوقه.
 */

import Link from "next/link";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";

import {
  consentSnapshot,
  consentUiSnapshot,
  openConsentSettings,
  registerConsentUi,
  setConsent,
  settingsSnapshot,
  subscribeConsent,
  type AdConsentSnapshot,
} from "@/lib/landing/meta-pixel";

export function useAdConsent(): AdConsentSnapshot {
  return useSyncExternalStore(subscribeConsent, consentSnapshot, () => "unknown");
}

function useSettingsOpen(): boolean {
  return useSyncExternalStore(subscribeConsent, settingsSnapshot, () => false);
}

/* ─────────── موضع الشريط: فوق شريط الحجز الثابت، وبعيدًا عن الحقول ─────────── */

const STICKY_SELECTOR = "[data-lp-sticky-cta]";
/** ما لا يُغطّى أبدًا: أزرار الحجز، وحقول النموذج وزره، وما يُعلَّم `data-lp-keep-clear` (زر ما بعد الدفع). */
const BOOKING_SELECTOR = [
  '[data-lp-checkout="ready"]',
  '[data-lp-guest-form] input:not([type="hidden"]):not([tabindex="-1"])',
  "[data-lp-guest-form] button",
  "[data-lp-keep-clear]",
].join(", ");

/* آخر ارتفاع معروف للشريط — يبقى صالحًا وهو متنحٍّ (ارتفاعه حينها 0). */
let bannerHeight = 0;

function subscribeLayout(listener: () => void): () => void {
  const sticky = document.querySelector(STICKY_SELECTOR);
  const mutations = new MutationObserver(listener);
  if (sticky) mutations.observe(sticky, { attributes: true, attributeFilter: ["aria-hidden"] });
  window.addEventListener("resize", listener);
  window.addEventListener("scroll", listener, { passive: true });
  document.addEventListener("focusin", listener);
  document.addEventListener("focusout", listener);
  return () => {
    mutations.disconnect();
    window.removeEventListener("resize", listener);
    window.removeEventListener("scroll", listener);
    document.removeEventListener("focusin", listener);
    document.removeEventListener("focusout", listener);
  };
}

/** ارتفاع شريط الحجز الثابت ما دام ظاهرًا (الجوال فقط)، وإلا 0. */
function stickyOffset(): number {
  const sticky = document.querySelector<HTMLElement>(STICKY_SELECTOR);
  if (!sticky || sticky.getAttribute("aria-hidden") === "true") return 0;
  return sticky.offsetHeight;
}

/** حقل إدخال عليه التركيز — لوحة المفاتيح مفتوحة والشريط لا يزاحمها. */
function fieldFocused(): boolean {
  return document.activeElement?.matches("input, textarea, select") ?? false;
}

/** زر حجز أو حقل نموذج داخل الشريط الذي يشغله الشريط الآن؟ */
function bookingUnderBanner(): boolean {
  if (bannerHeight === 0) return false;
  const bottom = window.innerHeight - stickyOffset();
  const top = bottom - bannerHeight;
  for (const element of document.querySelectorAll(BOOKING_SELECTOR)) {
    /* شريط الحجز الثابت نفسه: الشريط يعلوه أصلًا. */
    if (element.closest(STICKY_SELECTOR)) continue;
    const rect = element.getBoundingClientRect();
    if (rect.height > 0 && rect.bottom > top && rect.top < bottom) return true;
  }
  return false;
}

const button =
  "inline-flex min-h-11 items-center justify-center rounded-xl px-5 text-sm font-semibold outline-none transition-colors focus-visible:ring-[3px] focus-visible:ring-brand-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-charcoal-950";

export function TrackingConsent() {
  const consent = useAdConsent();
  const reopened = useSettingsOpen();
  const firstButton = useRef<HTMLButtonElement>(null);
  const banner = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(0);
  const offset = useSyncExternalStore(subscribeLayout, stickyOffset, () => 0);
  const typing = useSyncExternalStore(subscribeLayout, fieldFocused, () => false);
  const covering = useSyncExternalStore(subscribeLayout, bookingUnderBanner, () => false);
  const visible = consent !== "unknown" && (consent === "unset" || reopened);

  useEffect(() => registerConsentUi(), []);
  /* ارتفاع الشريط للفراغ أسفل الصفحة. */
  useEffect(() => {
    const element = banner.current;
    if (!visible || !element) return;
    /* مخفي أثناء الكتابة (ارتفاعه 0): يبقى الفراغ كما هو بلا قفزة في الصفحة. */
    const observer = new ResizeObserver(() => {
      if (element.offsetHeight === 0) return;
      bannerHeight = element.offsetHeight;
      setHeight(bannerHeight);
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [visible]);
  /* فُتح من «إعدادات التتبع»: ينتقل التركيز إليه لمستخدمي لوحة المفاتيح. */
  useEffect(() => {
    if (reopened) firstButton.current?.focus();
  }, [reopened]);

  if (!visible) return null;

  return (
    <>
      {/* فراغ بارتفاع الشريط بلون نهاية الصفحة: آخر المحتوى لا يبقى تحته. */}
      <div aria-hidden="true" data-lp-consent-spacer className="bg-charcoal-950" style={{ height }} />
      <div
        ref={banner}
        role="region"
        aria-label="تفضيلات التتبع الإعلاني"
        data-lp-consent
        /* فُتح من «إعدادات التتبع» بطلب الزائر: لا يتنحى إلا للكتابة. */
        hidden={typing || (covering && !reopened)}
        style={{ bottom: offset }}
        className="fixed inset-x-0 z-50 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] transition-[bottom] duration-300 motion-reduce:transition-none sm:px-6"
      >
        <div className="mx-auto max-w-2xl rounded-2xl border border-white/10 bg-charcoal-950/95 p-4 text-white shadow-2xl shadow-black/40 backdrop-blur sm:flex sm:items-center sm:gap-6 sm:p-5">
          <p className="text-sm leading-relaxed text-charcoal-200">
            نستخدم أداة Meta (فيسبوك وإنستغرام) لقياس أداء حملاتنا الإعلانية وإعادة عرض إعلاناتنا لزوار الموقع، ولا
            نفعّلها إلا بموافقتك. اختيارك لا يؤثر على الحجز أو الدفع.{" "}
            <Link
              href="/policies/privacy"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-white underline underline-offset-2"
            >
              سياسة الخصوصية
            </Link>
            {consent !== "unset" && (
              <span className="mt-1 block text-xs text-charcoal-400">
                اختيارك الحالي: {consent === "granted" ? "موافق" : "مرفوض"}
              </span>
            )}
          </p>
          <div className="mt-3 grid shrink-0 grid-cols-2 gap-2 sm:mt-0">
            <button
              ref={firstButton}
              type="button"
              onClick={() => setConsent("denied")}
              className={`${button} border border-white/25 text-white hover:bg-white/10`}
            >
              رفض
            </button>
            <button
              type="button"
              onClick={() => setConsent("granted")}
              className={`${button} bg-brand-600 text-white hover:bg-brand-700`}
            >
              موافق
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

/** رابط نصي في تذييل الصفحة لتغيير الاختيار أو سحبه — يظهر مع شريط الموافقة فقط. */
export function TrackingSettingsButton({ className }: { className?: string }) {
  const available = useSyncExternalStore(subscribeConsent, consentUiSnapshot, () => false);
  if (!available) return null;
  return (
    <button
      type="button"
      onClick={openConsentSettings}
      className={className ?? "underline underline-offset-4 outline-none hover:text-charcoal-200 focus-visible:ring-2 focus-visible:ring-brand-400/70"}
    >
      إعدادات التتبع الإعلاني
    </button>
  );
}

