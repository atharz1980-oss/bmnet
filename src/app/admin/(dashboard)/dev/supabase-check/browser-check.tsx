"use client";

/**
 * SupabaseBrowserCheck — فحص عميل المتصفح (CP-A)
 * -------------------------------------------------
 * بعد الترطيب: إنشاء عميل المتصفح (Publishable Key فقط) وجولة auth خفيفة.
 * يبدأ بحالة «قيد الفحص» (لا حالة نهائية في SSR → لا hydration mismatch).
 */
import { useEffect, useState } from "react";

type Status = "pending" | "ok" | "fail";

export function SupabaseBrowserCheck() {
  const [status, setStatus] = useState<Status>("pending");
  const [note, setNote] = useState("قيد الفحص بعد الترطيب…");

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      try {
        const { getSupabaseBrowserClient } = await import("@/lib/supabase/client");
        const supabase = getSupabaseBrowserClient();
        const { error } = await supabase.auth.getUser();
        const authError = error ? String(error.message) : "";
        const ok = !authError.includes("fetch") && !authError.includes("Invalid API key");
        if (cancelled) return;
        setStatus(ok ? "ok" : "fail");
        setNote(
          ok
            ? "createBrowserClient + getUser(): جولة ناجحة من المتصفح"
            : authError || "خطأ غير متوقع",
        );
      } catch (error) {
        if (cancelled) return;
        setStatus("fail");
        setNote(error instanceof Error ? error.message : "خطأ غير متوقع");
      }
    };

    const timer = setTimeout(run, 0);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, []);

  return (
    <div className="mt-4 rounded-xl border border-border bg-white p-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-charcoal-800">
            عميل المتصفح (createBrowserClient)
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">{note}</p>
        </div>
        <span
          className={
            status === "ok"
              ? "shrink-0 rounded-md bg-brand-50 px-2 py-0.5 text-xs font-bold text-brand-700"
              : status === "fail"
                ? "shrink-0 rounded-md bg-charcoal-100 px-2 py-0.5 text-xs font-bold text-charcoal-600"
                : "shrink-0 rounded-md bg-charcoal-50 px-2 py-0.5 text-xs font-bold text-charcoal-400"
          }
        >
          {status === "ok" ? "OK" : status === "fail" ? "FAIL" : "…"}
        </span>
      </div>
    </div>
  );
}
