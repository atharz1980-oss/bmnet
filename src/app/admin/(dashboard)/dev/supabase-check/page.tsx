import type { Metadata } from "next";
import { cookies } from "next/headers";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { SupabaseBrowserCheck } from "./browser-check";

export const metadata: Metadata = {
  title: "فحص Supabase",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

interface CheckResult {
  label: string;
  ok: boolean;
  note: string;
}

async function runChecks(): Promise<CheckResult[]> {
  const results: CheckResult[] = [];

  /* 1) وجود متغيرات البيئة (بولياني فقط — لا قيم أبدًا) */
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  results.push({
    label: "متغيرات البيئة (URL + Publishable Key)",
    ok: Boolean(url && publishableKey),
    note: url && publishableKey ? "حاضرة في بيئة الخادم" : "غائبة — انسخ .env.example إلى .env.local",
  });

  /* 2) الوصول إلى مشروع Supabase (نقطة health — تتطلب ترويسة المفتاح العام) */
  if (url && publishableKey) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 8000);
      const res = await fetch(`${url}/auth/v1/health`, {
        signal: controller.signal,
        cache: "no-store",
        headers: { apikey: publishableKey },
      });
      clearTimeout(timer);
      results.push({
        label: "الاتصال بمشروع Supabase",
        ok: res.ok,
        note: res.ok ? "نقطة الوصول مستجيبة" : `استجابة غير متوقعة (${res.status})`,
      });
    } catch (error) {
      const note = error instanceof Error && error.name === "AbortError" ? "انتهت المهلة" : "فشل الوصول";
      results.push({ label: "الاتصال بمشروع Supabase", ok: false, note });
    }
  }

  /* 3) عميل الخادم: createServerClient + cookies() async (Next 16) + جولة auth كاملة بالمفتاح */
  if (url && publishableKey) {
    try {
      const supabase = await createSupabaseServerClient();
      const { error } = await supabase.auth.getUser();
      /* غياب مستخدم ليس خطأ (لا جلسة بعد) — المطلوب: جولة شبكة ناجحة بلا خطأ اتصال/مفتاح */
      const authError = error ? String(error.message) : "";
      const networkOk = !authError.includes("fetch") && !authError.includes("Invalid API key");
      results.push({
        label: "عميل الخادم (@supabase/ssr + cookies async)",
        ok: networkOk,
        note: networkOk
          ? "createServerClient + getUser(): جولة ناجحة"
          : authError || "خطأ غير متوقع",
      });
    } catch (error) {
      results.push({
        label: "عميل الخادم (@supabase/ssr + cookies async)",
        ok: false,
        note: error instanceof Error ? error.message : "خطأ غير متوقع",
      });
    }
  }

  /* 4) كوكيز SSR: قراءة عبر getAll + قيمة تحقق الكتابة/التحديث من الـ proxy */
  try {
    const cookieStore = await cookies();
    const all = cookieStore.getAll();
    const probe = cookieStore.get("cpa-probe")?.value;
    const writeVerified = Boolean(probe);
    results.push({
      label: "كوكيز SSR (قراءة + كتابة/تحديث عبر الـ proxy)",
      ok: all.length >= 0 && writeVerified,
      note: writeVerified
        ? `القراءة تعمل — كوكي الفحص المقروء الآن: ${probe} (يزيد مع كل طلب)`
        : "القراءة تعمل — كوكي الفحص سيُكتب من الـ proxy: أعد تحميل الصفحة",
    });
  } catch (error) {
    results.push({
      label: "كوكيز SSR (قراءة + كتابة/تحديث عبر الـ proxy)",
      ok: false,
      note: error instanceof Error ? error.message : "خطأ غير متوقع",
    });
  }

  return results;
}

export default async function SupabaseCheckPage() {
  const checks = await runChecks();
  const allOk = checks.every((check) => check.ok);

  return (
    <div className="mx-auto w-full max-w-3xl">
      <div className="rounded-xl border border-border bg-white p-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-lg font-bold text-charcoal-900">فحص Supabase — CP-A</h1>
            <p className="mt-1 text-xs text-muted-foreground">
              مسار تطويري للتحقق من الاتصال وتوافق SSR — لا يعرض أي مفاتيح أو قيم سرية.
            </p>
          </div>
          <span
            className={
              allOk
                ? "rounded-full bg-brand-50 px-3 py-1 text-xs font-bold text-brand-700"
                : "rounded-full bg-charcoal-100 px-3 py-1 text-xs font-bold text-charcoal-600"
            }
          >
            {allOk ? "الحالة العامة: OK" : "الحالة العامة: FAIL"}
          </span>
        </div>

        <ul className="mt-5 space-y-2.5">
          {checks.map((check) => (
            <li
              key={check.label}
              className="flex items-start justify-between gap-3 rounded-lg border border-border bg-surface/60 px-4 py-3"
            >
              <div className="min-w-0">
                <p className="text-sm font-semibold text-charcoal-800">{check.label}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{check.note}</p>
              </div>
              <span
                className={
                  check.ok
                    ? "shrink-0 rounded-md bg-brand-50 px-2 py-0.5 text-xs font-bold text-brand-700"
                    : "shrink-0 rounded-md bg-charcoal-100 px-2 py-0.5 text-xs font-bold text-charcoal-600"
                }
              >
                {check.ok ? "OK" : "FAIL"}
              </span>
            </li>
          ))}
        </ul>

        <p className="mt-4 text-[11px] leading-relaxed text-muted-foreground">
          ملاحظة: كوكي الفحص (cpa-probe) يُحدّثه الـ proxy مع كل طلب لهذه الصفحة —
          إعادة التحميل تثبت الكتابة والتحديث عبر نفس آلية @supabase/ssr.
        </p>
      </div>

      <SupabaseBrowserCheck />
    </div>
  );
}
