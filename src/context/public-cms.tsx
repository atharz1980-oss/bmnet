"use client";

/**
 * PublicCmsProvider — جسر بيانات CMS للموقع العام (Checkpoint 7 — D-45)
 * ---------------------------------------------------------------------
 * صغير ومحدد: يقرأ مخزن الإدارة من localStorage (قراءة فقط — لا يكتب أبدًا)
 * ويحوّله عبر public-bridge إلى عرض عام. القيم:
 *
 * - view === null + hydrated === false → مرحلة SSR/ما قبل الترطيب:
 *   كل المكونات تعرض بيانات Phase 1 الثابتة → HTML مطابق بايت-بايت → صفر mismatch.
 * - hydrated === true + view === null → لا مخزن (زائر عام) → تبقى البيانات الثابتة.
 * - hydrated === true + view !== null → صاحب المتصفح لديه تعديلات CMS → يستبدل العرض.
 * - حدث storage (حفظ من تبويب الإدارة) → إعادة اشتقاق فورية — مزامنة تبويبات بلا reload.
 * - أي بيانات تالفة/غير قابلة للترحيل → تجاهل صامت والبقاء على البيانات الثابتة.
 *
 * التحميل مؤجل بـ setTimeout(0) داخل الـ effect (نمط D-12 — قاعدة
 * react-hooks/set-state-in-effect في Next 16).
 */
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

import {
  ADMIN_STORAGE_KEY,
  migrateAdminData,
} from "@/data/admin/seed";
import { derivePublicCms, type PublicCmsView } from "@/data/public-bridge";

interface PublicCmsState {
  /** الاشتقاق العام — null = البيانات الثابتة (Phase 1) */
  view: PublicCmsView | null;
  /** true بعد محاولة القراءة الأولى (تمييز «لم يُحمَّل بعد» عن «لا مخزن») */
  hydrated: boolean;
}

const PublicCmsContext = createContext<PublicCmsState>({
  view: null,
  hydrated: false,
});

function readStore(): PublicCmsView | null {
  try {
    const raw = window.localStorage.getItem(ADMIN_STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    const migrated = migrateAdminData(parsed);
    if (!migrated) return null;
    return derivePublicCms(migrated);
  } catch {
    /* تالف أو غير قابل للقراءة → البيانات الثابتة */
    return null;
  }
}

export function PublicCmsProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<PublicCmsState>({
    view: null,
    hydrated: false,
  });

  useEffect(() => {
    const load = () => setState({ view: readStore(), hydrated: true });
    /* تأجيل القراءة بعد الترطيب — أول رسم يطابق SSR دائمًا */
    const timer = setTimeout(load, 0);
    /* مزامنة التبويبات: حفظ من تبويب الإدارة يُنعش هذا التبويب فورًا */
    const onStorage = (event: StorageEvent) => {
      if (event.key === null || event.key === ADMIN_STORAGE_KEY) load();
    };
    window.addEventListener("storage", onStorage);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  return (
    <PublicCmsContext.Provider value={state}>
      {children}
    </PublicCmsContext.Provider>
  );
}

/** حالة الجسر العام — view=null يعني «اعرض البيانات الثابتة» */
export function usePublicCms(): PublicCmsState {
  return useContext(PublicCmsContext);
}
