"use client";

/**
 * PublicCmsProvider — جسر بيانات CMS للموقع العام (CP-G — D-85/D-86)
 * -------------------------------------------------------------------
 * قاعدة البيانات هي المصدر الوحيد: initialView يحملها الخادم من
 * loadPublicView (عميل anon بلا كوكيز — جلسات الإدارة لا تتسرب أبدًا)
 * في root layout، فتصل جميع الصفحات العامة ببيانات حقيقية من أول رسم:
 *
 * - view !== null → اعرض بيانات الـ CMS من القاعدة (النشر/الإخفاء فوري).
 * - view === null → القاعدة غير متاحة/فارغة: بيانات Phase 1 الثابتة.
 *
 * لا قراءة localStorage إطلاقًا — مخزن Mock الإداري أُزيل نهائيًا (D-85).
 */
import {
  createContext,
  useContext,
  useMemo,
  type ReactNode,
} from "react";

import type { PublicCmsView } from "@/data/public-bridge";

interface PublicCmsState {
  /** الاشتقاق العام — null = البيانات الثابتة (fallback آمن) */
  view: PublicCmsView | null;
  /** true دائمًا: البيانات وصلت من الخادم قبل أول رسم */
  hydrated: boolean;
}

const PublicCmsContext = createContext<PublicCmsState>({
  view: null,
  hydrated: false,
});

export function PublicCmsProvider({
  initialView,
  children,
}: {
  initialView: PublicCmsView | null;
  children: ReactNode;
}) {
  const state = useMemo<PublicCmsState>(
    () => ({ view: initialView, hydrated: true }),
    [initialView],
  );

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
