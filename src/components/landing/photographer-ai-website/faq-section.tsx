"use client";

import { useState } from "react";
import { ChevronDown, HelpCircle } from "lucide-react";
import { Container } from "@/components/shared/container";
import { faqList } from "@/data/landing/photographer-ai-website";
import { cn } from "@/lib/utils";
import { FAQ_ANCHOR } from "./anchors";

export function FaqSection() {
  const [openIdx, setOpenIdx] = useState<number | null>(0);

  const toggle = (idx: number) => {
    setOpenIdx(openIdx === idx ? null : idx);
  };

  return (
    <section
      id={FAQ_ANCHOR}
      aria-labelledby="faq-heading"
      className="relative bg-charcoal-950 py-16 sm:py-24 text-white border-t border-white/5 scroll-mt-12"
    >
      <Container>
        <div className="mx-auto max-w-3xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-3.5 py-1 text-xs font-semibold text-amber-300">
            <HelpCircle className="h-4 w-4" />
            <span>الأسئلة الشائعة</span>
          </div>
          <h2 id="faq-heading" className="mt-4 text-2xl sm:text-4xl font-extrabold tracking-tight text-white">
            كل ما يدور بذهنك عن الدورة
          </h2>
          <p className="mt-3 text-sm sm:text-base text-charcoal-300">
            إجابات واضحة وشفافة لأكثر الاستفسارات تكرارًا بين المتدربين:
          </p>
        </div>

        <div className="mt-12 max-w-3xl mx-auto space-y-3">
          {faqList.map((item, idx) => {
            const isOpen = openIdx === idx;
            return (
              <div
                key={idx}
                className="overflow-hidden rounded-2xl border border-white/10 bg-charcoal-900/60 backdrop-blur-sm transition-colors hover:border-white/20"
              >
                <button
                  type="button"
                  onClick={() => toggle(idx)}
                  aria-expanded={isOpen}
                  aria-controls={`faq-answer-${idx}`}
                  id={`faq-question-${idx}`}
                  className="flex w-full items-center justify-between p-5 text-start font-bold text-sm sm:text-base text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2 focus-visible:ring-offset-charcoal-950"
                >
                  <span className="pe-4">{item.q}</span>
                  <ChevronDown
                    aria-hidden="true"
                    className={cn(
                      "h-5 w-5 shrink-0 text-amber-400 transition-transform duration-200",
                      isOpen && "rotate-180",
                    )}
                  />
                </button>
                {isOpen && (
                  <div
                    id={`faq-answer-${idx}`}
                    role="region"
                    aria-labelledby={`faq-question-${idx}`}
                    className="border-t border-white/5 px-5 pb-5 pt-3 text-xs sm:text-sm leading-relaxed text-charcoal-300"
                  >
                    {item.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Container>
    </section>
  );
}
