"use client";

/**
 * محررات الأقسام النصية للصفحة الرئيسية — Hero و CTA
 * ----------------------------------------------------
 * كل محرر يستقبل شريحة البيانات ومُغيّرها فقط (دوال نقية من الأعلى).
 * الصور عبر ImageUpload الـ Mock — ولا Object URL يُخزَّن (معقَّم عند الحفظ).
 */
import type { CtaContent, HeroContent } from "@/data/admin/types";
import { Field } from "@/components/admin/ui/field";
import { ImageUpload } from "@/components/admin/ui/image-upload";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

interface HeroEditorProps {
  hero: HeroContent;
  onChange: (hero: HeroContent) => void;
}

export function HeroEditor({ hero, onChange }: HeroEditorProps) {
  const patch = (partial: Partial<HeroContent>) => onChange({ ...hero, ...partial });

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="space-y-4">
        <Field id="hero-title" label="العنوان الرئيسي" required>
          <Input
            id="hero-title"
            value={hero.title}
            onChange={(event) => patch({ title: event.target.value })}
            placeholder="مثال: من الشغف إلى الاحتراف"
          />
        </Field>
        <Field
          id="hero-description"
          label="الوصف"
          hint="سطر أو سطران يظهران تحت العنوان الرئيسي"
        >
          <Textarea
            id="hero-description"
            value={hero.description}
            onChange={(event) => patch({ description: event.target.value })}
            rows={4}
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="hero-primary-text" label="نص الزر الأساسي" required>
            <Input
              id="hero-primary-text"
              value={hero.primaryCta.text}
              onChange={(event) =>
                patch({ primaryCta: { ...hero.primaryCta, text: event.target.value } })
              }
            />
          </Field>
          <Field id="hero-primary-url" label="رابط الزر الأساسي" required>
            <Input
              id="hero-primary-url"
              value={hero.primaryCta.url}
              dir="ltr"
              className="font-latin"
              onChange={(event) =>
                patch({ primaryCta: { ...hero.primaryCta, url: event.target.value } })
              }
              placeholder="/courses"
            />
          </Field>
          <Field id="hero-secondary-text" label="نص الزر الثانوي">
            <Input
              id="hero-secondary-text"
              value={hero.secondaryCta.text}
              onChange={(event) =>
                patch({ secondaryCta: { ...hero.secondaryCta, text: event.target.value } })
              }
            />
          </Field>
          <Field id="hero-secondary-url" label="رابط الزر الثانوي">
            <Input
              id="hero-secondary-url"
              value={hero.secondaryCta.url}
              dir="ltr"
              className="font-latin"
              onChange={(event) =>
                patch({ secondaryCta: { ...hero.secondaryCta, url: event.target.value } })
              }
              placeholder="/courses"
            />
          </Field>
        </div>
      </div>

      <div>
        <ImageUpload
              folder="homepage"
          id="hero-image"
          label="صورة الـ Hero"
          value={hero.image}
          alt={hero.imageAlt}
          aspect="video"
          onChange={({ value, alt }) => patch({ image: value, imageAlt: alt })}
          hint="رفع تجريبي — تُعرض الصورة داخل لوحة التحكم في هذه الجلسة فقط، ولا تُخزَّن Object URL."
        />
      </div>
    </div>
  );
}

interface CtaEditorProps {
  cta: CtaContent;
  onChange: (cta: CtaContent) => void;
}

export function CtaEditor({ cta, onChange }: CtaEditorProps) {
  const patch = (partial: Partial<CtaContent>) => onChange({ ...cta, ...partial });

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="space-y-4">
        <Field id="cta-title" label="العنوان" required>
          <Input
            id="cta-title"
            value={cta.title}
            onChange={(event) => patch({ title: event.target.value })}
          />
        </Field>
        <Field id="cta-description" label="الوصف">
          <Textarea
            id="cta-description"
            value={cta.description}
            onChange={(event) => patch({ description: event.target.value })}
            rows={3}
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="cta-primary-text" label="نص الزر الأساسي" required>
            <Input
              id="cta-primary-text"
              value={cta.primaryCta.text}
              onChange={(event) =>
                patch({ primaryCta: { ...cta.primaryCta, text: event.target.value } })
              }
            />
          </Field>
          <Field id="cta-primary-url" label="رابط الزر الأساسي" required>
            <Input
              id="cta-primary-url"
              value={cta.primaryCta.url}
              dir="ltr"
              className="font-latin"
              onChange={(event) =>
                patch({ primaryCta: { ...cta.primaryCta, url: event.target.value } })
              }
            />
          </Field>
          <Field id="cta-secondary-text" label="نص الزر الثانوي">
            <Input
              id="cta-secondary-text"
              value={cta.secondaryCta.text}
              onChange={(event) =>
                patch({ secondaryCta: { ...cta.secondaryCta, text: event.target.value } })
              }
            />
          </Field>
          <Field id="cta-secondary-url" label="رابط الزر الثانوي">
            <Input
              id="cta-secondary-url"
              value={cta.secondaryCta.url}
              dir="ltr"
              className="font-latin"
              onChange={(event) =>
                patch({ secondaryCta: { ...cta.secondaryCta, url: event.target.value } })
              }
            />
          </Field>
        </div>
      </div>

      <div>
        <ImageUpload
              folder="homepage"
          id="cta-background"
          label="صورة الخلفية"
          value={cta.backgroundImage ?? ""}
          alt={cta.backgroundImageAlt ?? ""}
          aspect="wide"
          onChange={({ value, alt }) => patch({ backgroundImage: value, backgroundImageAlt: alt })}
          hint="اختيارية — إن غابت يُستخدم الخلفية الداكنة الحالية للقسم."
        />
      </div>
    </div>
  );
}
