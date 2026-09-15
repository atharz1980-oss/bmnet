"use client";

/**
 * SocialLinksEditor — قائمة منصات التواصل الموحّدة
 * -------------------------------------------------
 * مصدر واحد يغذّي الهيدر والفوتر وصفحة التواصل. المنصة مفتاح فريد،
 * فلا تُضاف المنصة مرتين، والترتيب هنا هو ترتيب العرض في الموقع.
 * الرابط يُتحقق منه على الخادم أيضًا قبل الحفظ.
 */
import { useState, useTransition } from "react";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";

import { useAdminActions } from "@/context/admin-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Field } from "@/components/admin/ui/field";
import { SocialIcon } from "@/components/shared/social-icons";
import { useToast } from "@/hooks/use-toast";
import type { SocialLinkSetting } from "@/data/admin/types";
import { SOCIAL_PLATFORMS, type SocialPlatform } from "@/types";

const PLATFORM_META: Record<SocialPlatform, { label: string; hint: string }> = {
  instagram: { label: "إنستغرام", hint: "https://instagram.com/username" },
  tiktok: { label: "تيك توك", hint: "https://tiktok.com/@username" },
  snapchat: { label: "سناب شات", hint: "https://snapchat.com/add/username" },
  x: { label: "منصة X", hint: "https://x.com/username" },
  youtube: { label: "يوتيوب", hint: "https://youtube.com/@channel" },
  facebook: { label: "فيسبوك", hint: "https://facebook.com/page" },
  linkedin: { label: "لينكدإن", hint: "https://linkedin.com/company/name" },
  telegram: { label: "تيليجرام", hint: "https://t.me/username" },
  pinterest: { label: "بنترست", hint: "https://pinterest.com/username" },
  threads: { label: "ثريدز", hint: "https://threads.net/@username" },
  behance: { label: "بيهانس", hint: "https://behance.net/username" },
  whatsapp: { label: "واتساب", hint: "رقم دولي مثل 966551234567 — يُحوَّل إلى رابط wa.me" },
  email: { label: "البريد الإلكتروني", hint: "البريد فقط — يُحوَّل إلى رابط mailto" },
  website: { label: "موقع إلكتروني آخر", hint: "https://example.com" },
};

export function SocialLinksEditor({ initial }: { initial: SocialLinkSetting[] }) {
  const { updateSocialLinks } = useAdminActions();
  const { toast } = useToast();
  const [pending, start] = useTransition();
  const [links, setLinks] = useState<SocialLinkSetting[]>(initial);
  const [dirty, setDirty] = useState(false);

  const used = new Set(links.map((link) => link.platform));
  const available = SOCIAL_PLATFORMS.filter((platform) => !used.has(platform));

  const apply = (next: SocialLinkSetting[]) => {
    setLinks(next);
    setDirty(true);
  };

  const patch = (index: number, value: Partial<SocialLinkSetting>) =>
    apply(links.map((link, position) => (position === index ? { ...link, ...value } : link)));

  const move = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= links.length) return;
    const next = [...links];
    [next[index], next[target]] = [next[target], next[index]];
    apply(next);
  };

  const add = () => {
    const platform = available[0];
    if (!platform) return;
    apply([...links, { platform, label: PLATFORM_META[platform].label, url: "", enabled: false }]);
  };

  const save = () =>
    start(async () => {
      const result = await updateSocialLinks(links);
      if (result.ok) {
        setDirty(false);
        toast({ title: "حُفظت وسائل التواصل", description: "تظهر المنصات المفعّلة في الهيدر والفوتر وصفحة التواصل." });
      } else {
        toast({ title: "تعذر الحفظ", description: result.error });
      }
    });

  return (
    <section aria-label="وسائل التواصل الاجتماعي" className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-charcoal-900">وسائل التواصل الاجتماعي</h2>
        <Button variant="outline" size="sm" onClick={() => add()} disabled={pending || available.length === 0}>
          <Plus aria-hidden="true" className="me-1.5 h-4 w-4" />
          إضافة منصة
        </Button>
      </div>

      <p className="text-xs leading-relaxed text-muted-foreground">
        قائمة واحدة تغذّي الهيدر والفوتر وصفحة التواصل. المنصة المعطّلة أو بلا رابط صالح لا تظهر للزائر،
        وترتيب الصفوف هنا هو ترتيب الأيقونات في الموقع.
      </p>

      {links.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-charcoal-400">
          لا منصات مضافة بعد.
        </p>
      ) : null}

      <ul className="space-y-3">
        {links.map((link, index) => {
          const meta = PLATFORM_META[link.platform];
          return (
            <li key={link.platform} className="rounded-xl border border-border bg-surface/60 p-4">
              <div className="flex items-start gap-3">
                <span
                  aria-hidden="true"
                  className="mt-7 flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-charcoal-500 lg:h-9 lg:w-9"
                >
                  <SocialIcon platform={link.platform} />
                </span>

                <div className="grid min-w-0 flex-1 gap-3 sm:grid-cols-2">
                  <Field id={`social-platform-${link.platform}`} label="المنصة" compact>
                    <Select
                      value={link.platform}
                      disabled={pending}
                      onValueChange={(value) => {
                        const platform = value as SocialPlatform;
                        patch(index, {
                          platform,
                          /* الاسم الافتراضي يتبع المنصة ما لم يكن المالك قد غيّره. */
                          label: link.label === meta.label ? PLATFORM_META[platform].label : link.label,
                        });
                      }}
                    >
                      <SelectTrigger id={`social-platform-${link.platform}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[link.platform, ...available].map((platform) => (
                          <SelectItem key={platform} value={platform}>
                            {PLATFORM_META[platform].label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>

                  <Field id={`social-label-${link.platform}`} label="الاسم المعروض" compact>
                    <Input
                      id={`social-label-${link.platform}`}
                      value={link.label}
                      disabled={pending}
                      onChange={(event) => patch(index, { label: event.target.value })}
                    />
                  </Field>

                  <Field
                    id={`social-url-${link.platform}`}
                    label="الرابط"
                    hint={meta.hint}
                    compact
                    className="sm:col-span-2"
                  >
                    <Input
                      id={`social-url-${link.platform}`}
                      dir="ltr"
                      value={link.url}
                      disabled={pending}
                      onChange={(event) => patch(index, { url: event.target.value })}
                    />
                  </Field>
                </div>

                <div className="flex shrink-0 flex-col items-center gap-2 pt-6">
                  <Switch
                    checked={link.enabled}
                    disabled={pending}
                    onCheckedChange={(checked) => patch(index, { enabled: checked })}
                    aria-label={`تفعيل ${link.label}`}
                  />
                  <span className="text-[10px] font-medium text-charcoal-500">
                    {link.enabled ? "ظاهرة" : "مخفية"}
                  </span>
                  <div className="flex gap-0.5">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      aria-label={`تحريك ${link.label} للأعلى`}
                      disabled={pending || index === 0}
                      onClick={() => move(index, -1)}
                    >
                      <ArrowUp aria-hidden="true" className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      aria-label={`تحريك ${link.label} للأسفل`}
                      disabled={pending || index === links.length - 1}
                      onClick={() => move(index, 1)}
                    >
                      <ArrowDown aria-hidden="true" className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-brand-600"
                    aria-label={`حذف ${link.label}`}
                    disabled={pending}
                    onClick={() => apply(links.filter((_, position) => position !== index))}
                  >
                    <Trash2 aria-hidden="true" className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      <div className="flex items-center justify-between gap-3">
        <p aria-live="polite" className="text-xs text-muted-foreground">
          {dirty ? "تغييرات غير محفوظة في وسائل التواصل" : "لا تغييرات جديدة"}
        </p>
        <Button onClick={() => save()} disabled={pending || !dirty}>
          {pending ? "جارٍ الحفظ…" : "حفظ وسائل التواصل"}
        </Button>
      </div>
    </section>
  );
}
