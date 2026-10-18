import {
  CalendarCheck,
  FolderTree,
  Globe,
  Image as ImageIcon,
  Info,
  Layers,
  LayoutTemplate,
  MessageCircle,
  Package,
  Settings,
  ShieldCheck,
  Smartphone,
  User,
} from "lucide-react";
import { Container } from "@/components/shared/container";
import { whatYouWillBuild } from "@/data/landing/photographer-ai-website";
import { WHAT_YOU_BUILD_ANCHOR } from "./anchors";

const featureIcons = [
  LayoutTemplate,
  ImageIcon,
  FolderTree,
  User,
  Package,
  CalendarCheck,
  MessageCircle,
  Settings,
  Layers,
  Smartphone,
  Globe,
  ShieldCheck,
];

export function WhatStudentsBuildSection() {
  return (
    <section
      id={WHAT_YOU_BUILD_ANCHOR}
      aria-labelledby="build-heading"
      className="relative bg-charcoal-950 py-16 sm:py-24 text-white border-t border-white/5 scroll-mt-12"
    >
      <Container>
        <div className="mx-auto max-w-3xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-3.5 py-1 text-xs font-semibold text-amber-300">
            <span>مخرجات التدريب العملية</span>
          </div>
          <h2 id="build-heading" className="mt-4 text-2xl sm:text-4xl font-extrabold tracking-tight text-white">
            {whatYouWillBuild.heading}
          </h2>
          <p className="mt-3 text-sm sm:text-base text-charcoal-300">
            {whatYouWillBuild.subheading}
          </p>
        </div>

        {/* شبكة البطاقات الاثنتي عشرة */}
        <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
          {whatYouWillBuild.features.map((feature, idx) => {
            const IconComponent = featureIcons[idx % featureIcons.length];
            return (
              <div
                key={feature.number}
                className="group relative rounded-2xl border border-white/10 bg-charcoal-900/60 p-5 backdrop-blur-sm transition-all hover:-translate-y-1 hover:border-amber-500/40 hover:bg-charcoal-900/90 shadow-lg"
              >
                <div className="flex items-center justify-between">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400 group-hover:bg-amber-500 group-hover:text-charcoal-950 transition-colors">
                    <IconComponent className="h-5 w-5" />
                  </div>
                  <span className="font-mono text-xs font-bold text-charcoal-500 group-hover:text-amber-400/80 transition-colors">
                    {feature.number}
                  </span>
                </div>
                <h3 className="mt-4 text-base font-bold text-white group-hover:text-amber-300 transition-colors">
                  {feature.title}
                </h3>
                <p className="mt-1.5 text-xs sm:text-sm text-charcoal-400 leading-relaxed">
                  {feature.desc}
                </p>
              </div>
            );
          })}
        </div>

        {/* تنبيه الشفافية والمصداقية */}
        <div className="mt-10 rounded-2xl border border-white/10 bg-charcoal-900/50 p-4 sm:p-5 flex items-start gap-3 text-xs sm:text-sm text-charcoal-300">
          <Info className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            {whatYouWillBuild.disclaimer}
          </p>
        </div>
      </Container>
    </section>
  );
}
