"use client";

import { useEffect, useRef, useState, type ReactNode, type CSSProperties } from "react";
import { cn } from "@/lib/utils";

interface RevealProps {
  children: ReactNode;
  className?: string;
  /** تأخير الظهور بالميلي ثانية */
  delay?: number;
  as?: "div" | "section" | "article" | "li";
}

/**
 * ظهور تدريجي بسيط عند التمرير — بدون مكتبات خارجية
 * يحترم prefers-reduced-motion عبر CSS.
 */
export function Reveal({ children, className, delay = 0, as = "div" }: RevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    if (typeof IntersectionObserver === "undefined") {
      const raf = requestAnimationFrame(() => setVisible(true));
      return () => cancelAnimationFrame(raf);
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setVisible(true);
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const Tag = as;

  return (
    <Tag
      ref={ref as React.RefObject<never>}
      style={{ "--reveal-delay": `${delay}ms` } as CSSProperties}
      className={cn("reveal", visible && "is-visible", className)}
    >
      {children}
    </Tag>
  );
}
