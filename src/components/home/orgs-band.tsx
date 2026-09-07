import { ShieldCheck } from "lucide-react";
import { Container } from "@/components/shared/container";
import { Reveal } from "@/components/shared/reveal";
import { SectionHeading } from "@/components/shared/section-heading";
import { PlaceholderLogo } from "@/components/shared/placeholder-logo";
import { accreditations as staticAccreditations, partners as staticPartners } from "@/data/content";
import { cn } from "@/lib/utils";
import type { PartnerOrg } from "@/types";

interface OrgsBandProps {
  variant: "accreditations" | "partners";
  /** Checkpoint 7: الجهات من جسر بيانات الإدارة — غائب = الجهات الثابتة */
  items?: PartnerOrg[];
}

/**
 * قسم الاعتمادات وشركاء النجاح — شعارات Placeholder مؤقتة
 * حتى تُرفق الشعارات الرسمية (تُستبدل داخل PlaceholderLogo بصورة الشعار).
 */
export function OrgsBand({ variant, items }: OrgsBandProps) {
  const isAccreditations = variant === "accreditations";
  const orgs = items ?? (isAccreditations ? staticAccreditations : staticPartners);

  return (
    <section
      aria-labelledby={isAccreditations ? "accreditations-title" : "partners-title"}
      className={cn(!isAccreditations && "bg-surface")}
    >
      <Container className="py-14 sm:py-16">
        <SectionHeading
          eyebrow={isAccreditations ? "ثقة رسمية" : "مع من نعمل"}
          title={isAccreditations ? "اعتماداتنا" : "شركاء النجاح"}
          titleId={isAccreditations ? "accreditations-title" : "partners-title"}
          description={
            isAccreditations
              ? "جهات رسمية تضمن جودة البرامج التدريبية في المركز."
              : "جهات وعلامات تدربنا أو تعاونت معنا في برامج ومبادرات مختلفة."
          }
        />

        <Reveal className="mt-10 lg:mt-12">
          <ul
            className={cn(
              "grid gap-4",
              orgs.length <= 3 ? "sm:grid-cols-3" : "grid-cols-2 sm:grid-cols-4"
            )}
          >
            {orgs.map((org) => (
              <li key={org.id}>
                <PlaceholderLogo
                  name={org.name}
                  nameEn={org.nameEn}
                  note={org.note}
                />
              </li>
            ))}
          </ul>
          <p className="mt-5 flex items-center justify-center gap-1.5 text-center text-xs text-charcoal-400">
            <ShieldCheck aria-hidden="true" className="h-3.5 w-3.5" />
            الشعارات المعروضة مؤقتة وتمثيلية – تُستبدل بالشعارات الرسمية عند توفرها
          </p>
        </Reveal>
      </Container>
    </section>
  );
}
