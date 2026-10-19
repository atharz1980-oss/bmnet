import { Camera, HeartHandshake, Sparkles, Utensils, Users, ShoppingBag, Award } from "lucide-react";
import { Container } from "@/components/shared/container";
import { targetAudience } from "@/data/landing/photographer-ai-website";
import { AUDIENCE_ANCHOR } from "./anchors";

const audienceIcons = [
  HeartHandshake,
  Users,
  ShoppingBag,
  Utensils,
  Camera,
  Award,
];

export function TargetAudienceSection() {
  return (
    <section
      id={AUDIENCE_ANCHOR}
      aria-labelledby="audience-heading"
      className="relative bg-charcoal-950 py-16 sm:py-24 text-white border-t border-white/5 scroll-mt-12"
    >
      <Container>
        <div className="mx-auto max-w-3xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-3.5 py-1 text-xs font-semibold text-amber-300">
            <Users className="h-4 w-4" />
            <span>لمن هذه الدورة؟</span>
          </div>
          <h2 id="audience-heading" className="mt-4 text-2xl sm:text-4xl font-extrabold tracking-tight text-white">
            {targetAudience.heading}
          </h2>
          <p className="mt-3 text-sm sm:text-base text-charcoal-300">
            {targetAudience.subheading}
          </p>
        </div>

        {/* شبكة التخصصات الستة */}
        <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {targetAudience.categories.map((cat, idx) => {
            const Icon = audienceIcons[idx % audienceIcons.length];
            return (
              <div
                key={idx}
                className="rounded-2xl border border-white/10 bg-charcoal-900/60 p-6 backdrop-blur-sm transition-all hover:border-amber-500/30 hover:bg-charcoal-900"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400">
                  <Icon className="h-6 w-6" />
                </div>
                <h3 className="mt-4 text-lg font-bold text-white">{cat.title}</h3>
                <p className="mt-2 text-xs sm:text-sm text-charcoal-300 leading-relaxed">{cat.desc}</p>
              </div>
            );
          })}
        </div>

        {/* تأكيد عدم الحاجة لخبرة برمجية */}
        <div className="mt-10 mx-auto max-w-2xl rounded-2xl border border-emerald-500/30 bg-emerald-950/20 p-4 sm:p-5 text-center text-xs sm:text-sm text-emerald-200">
          <Sparkles className="inline-block h-4 w-4 text-emerald-400 me-2 align-middle" />
          <span>{targetAudience.levelNote}</span>
        </div>
      </Container>
    </section>
  );
}
