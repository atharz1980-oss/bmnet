import { Award, BookOpen, Handshake, Users } from "lucide-react";
import { Container } from "@/components/shared/container";
import { Reveal } from "@/components/shared/reveal";
import { stats as staticStats } from "@/data/categories";
import { formatNumber } from "@/lib/format";
import type { StatItem } from "@/types";

const statIcons = {
  users: Users,
  book: BookOpen,
  award: Award,
  handshake: Handshake,
} as const;

/** شريط الإحصائيات — أرقام تجريبية قابلة للتحديث لاحقاً */
export function StatsBar({ items }: { items?: StatItem[] }) {
  const stats = items ?? staticStats;
  return (
    <section aria-label="أرقام بيت المصور" className="relative z-10 -mt-14 sm:-mt-16">
      <Container>
        <Reveal>
          <ul className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-charcoal-800 bg-charcoal-800 shadow-xl shadow-charcoal-950/20 lg:grid-cols-4">
            {stats.map((stat: StatItem) => {
              const Icon = statIcons[stat.icon];
              return (
                <li
                  key={stat.label}
                  className="flex flex-col items-center gap-1.5 bg-charcoal-950 px-4 py-6 text-center sm:py-8"
                >
                  <span className="mb-1 flex h-11 w-11 items-center justify-center rounded-full bg-brand-600/15 text-brand-400">
                    <Icon aria-hidden="true" className="h-5 w-5" />
                  </span>
                  <p className="text-2xl font-bold text-white sm:text-3xl">
                    <span className="num-ltr" dir="ltr">
                      {stat.suffix}
                      {formatNumber(stat.value)}
                    </span>
                  </p>
                  <p className="text-sm text-charcoal-300">{stat.label}</p>
                </li>
              );
            })}
          </ul>
        </Reveal>
      </Container>
    </section>
  );
}
