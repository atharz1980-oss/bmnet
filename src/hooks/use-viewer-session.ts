"use client";

/**
 * هل للزائر جلسة؟ — سؤال يُجاب في المتصفح عمدًا.
 *
 * قراءته على الخادم كانت ستجعل **كل صفحة عامة ديناميكية**: الشريط والتذييل
 * في root layout، فأي جلسة يقرآنها تُخرج الموقع كله من التوليد الساكن وتعيد
 * رحلة مصادقة على كل زيارة — نقض ما بُني في مرحلة «عام أولًا».
 *
 * لذلك: الخادم يرسم دائمًا حالة الزائر (وهي الصحيحة للأغلبية وتعمل بلا JS)،
 * ثم يصحّحها المتصفح بعد الإرطاب. القراءة محلية من الكوكي لا رحلة شبكة.
 */
import { useEffect, useState } from "react";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";

export type ViewerSession = "guest" | "signed-in";

export function useViewerSession(): ViewerSession {
  /* يبدأ زائرًا ليطابق ما رسمه الخادم — فلا اختلاف إرطاب. */
  const [session, setSession] = useState<ViewerSession>("guest");

  useEffect(() => {
    let active = true;
    let unsubscribe: (() => void) | undefined;

    try {
      const supabase = getSupabaseBrowserClient();
      void supabase.auth.getSession().then(({ data }) => {
        if (active) setSession(data.session ? "signed-in" : "guest");
      });
      /* الخروج من تبويب آخر أو انتهاء الرمز ينعكس هنا بلا إعادة تحميل. */
      const { data } = supabase.auth.onAuthStateChange((_event, next) => {
        if (active) setSession(next ? "signed-in" : "guest");
      });
      unsubscribe = () => data.subscription.unsubscribe();
    } catch {
      /* بلا env (نسخة محلية بلا Supabase): تبقى الحالة الابتدائية — زائر،
         وهي الأدنى صلاحية. لا شيء يُضبط هنا. */
    }

    return () => {
      active = false;
      unsubscribe?.();
    };
  }, []);

  return session;
}
