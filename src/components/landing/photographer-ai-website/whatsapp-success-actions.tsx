"use client";

import React, { useState } from "react";
import { Check, Copy, ExternalLink } from "lucide-react";
import { WhatsAppIcon } from "@/components/shared/social-icons";

interface WhatsAppSuccessActionsProps {
  whatsappUrl: string;
}

export function WhatsAppSuccessActions({ whatsappUrl }: WhatsAppSuccessActionsProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(whatsappUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback if clipboard API is restricted
      const textArea = document.createElement("textarea");
      textArea.value = whatsappUrl;
      textArea.style.position = "fixed";
      textArea.style.opacity = "0";
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand("copy");
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      } catch {
        // Ignore
      }
      document.body.removeChild(textArea);
    }
  };

  return (
    <div className="mt-8 space-y-4">
      {/* الزر الرئيسي: انضم إلى جروب واتساب */}
      <a
        href={whatsappUrl}
        target="_blank"
        rel="noopener noreferrer"
        data-testid="join-whatsapp-btn"
        className="group relative flex h-14 w-full items-center justify-center gap-3 rounded-2xl bg-[#25D366] px-6 text-base sm:text-lg font-bold text-white shadow-xl shadow-[#25D366]/25 transition-all duration-200 hover:bg-[#20ba59] hover:shadow-2xl hover:shadow-[#25D366]/35 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#25D366] focus-visible:ring-offset-2 focus-visible:ring-offset-charcoal-950"
      >
        <WhatsAppIcon className="h-6 w-6 shrink-0 transition-transform duration-200 group-hover:scale-110" />
        <span>انضم الآن إلى مجموعة واتساب</span>
        <ExternalLink className="h-4 w-4 opacity-80 shrink-0" aria-hidden="true" />
      </a>

      {/* زر نسخ الرابط مع تأكيد النسخ */}
      <div className="flex items-center justify-center">
        <button
          type="button"
          onClick={handleCopy}
          data-testid="copy-whatsapp-btn"
          className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-xs sm:text-sm font-semibold text-charcoal-200 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
          aria-live="polite"
        >
          {copied ? (
            <>
              <Check className="h-4 w-4 text-emerald-400" aria-hidden="true" />
              <span className="text-emerald-400 font-bold">تم نسخ الرابط بنجاح!</span>
            </>
          ) : (
            <>
              <Copy className="h-4 w-4 text-charcoal-400" aria-hidden="true" />
              <span>نسخ رابط المجموعة</span>
            </>
          )}
        </button>
      </div>

      <p className="text-center text-[12px] text-charcoal-400 leading-relaxed">
        * يُرجى الانضمام الآن للمجموعة لتلقي روابط الجلسات المباشرة والمواد التدريبية وملفات التطبيق.
      </p>
    </div>
  );
}
