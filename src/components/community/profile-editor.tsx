"use client";
/**
 * محرر ملف العضو (CP-H V1) — username/display/bio/تخصصات/خبرة/روابط + أفاتار وغلاف.
 * يمنع النقر المزدوج، يتحقق من تفرد username عبر أكشن، يرفع الصور لمجلد العضو.
 */
import Image from "next/image";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import {
  checkUsernameAvailableAction,
  communityLogoutAction,
} from "@/app/community/actions/auth";
import {
  deleteCommunityMediaAction,
  saveCommunityProfileAction,
  uploadCommunityMediaAction,
} from "@/app/community/actions/profile";
import {
  EXPERIENCE_LABELS,
  type CommunityMember,
  type ExperienceLevel,
} from "@/lib/community/types";
import {
  validateBio, validateDisplayName, validateInstagramUrl, validateSpecialties,
  validateUsername, validateWebsiteUrl, validateYoutubeUrl,
} from "@/lib/community/validation";

export function ProfileEditor({
  initial,
  email,
}: {
  initial: CommunityMember | null;
  email: string;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [username, setUsername] = useState(initial?.username ?? "");
  const [displayName, setDisplayName] = useState(initial?.displayName ?? "");
  const [bio, setBio] = useState(initial?.bio ?? "");
  const [city, setCity] = useState(initial?.city ?? "");
  const [country, setCountry] = useState(initial?.country ?? "السعودية");
  const [specialtiesText, setSpecialtiesText] = useState(
    initial?.specialties.join("، ") ?? "",
  );
  const [experienceLevel, setExperienceLevel] = useState<ExperienceLevel>(
    initial?.experienceLevel ?? "beginner",
  );
  const [availableForWork, setAvailableForWork] = useState(initial?.availableForWork ?? false);
  const [websiteUrl, setWebsiteUrl] = useState(initial?.websiteUrl ?? "");
  const [instagramUrl, setInstagramUrl] = useState(initial?.instagramUrl ?? "");
  const [youtubeUrl, setYoutubeUrl] = useState(initial?.youtubeUrl ?? "");
  const [avatarUrl, setAvatarUrl] = useState(initial?.avatarUrl ?? "");
  const [coverUrl, setCoverUrl] = useState(initial?.coverUrl ?? "");
  const [avatarPath, setAvatarPath] = useState(
    initial?.avatarUrl?.includes("community-media/")
      ? decodeURIComponent(initial.avatarUrl.split("community-media/")[1] ?? "")
      : "",
  );
  const [coverPath, setCoverPath] = useState(
    initial?.coverUrl?.includes("community-media/")
      ? decodeURIComponent(initial.coverUrl.split("community-media/")[1] ?? "")
      : "",
  );
  const [busy, setBusy] = useState(false);
  const [checkingUsername, setCheckingUsername] = useState(false);
  const avatarRef = useRef<HTMLInputElement>(null);
  const coverRef = useRef<HTMLInputElement>(null);

  async function uploadImage(file: File, kind: "avatar" | "cover") {
    const result = await uploadCommunityMediaAction(file, `${kind === "avatar" ? "صورة شخصية" : "غلاف"} ${displayName}`);
    if (result.ok) {
      const url = communityMediaUrl(result.data.path);
      if (kind === "avatar") {
        if (avatarPath) await deleteCommunityMediaAction(avatarPath).catch(() => null);
        setAvatarPath(result.data.path);
        setAvatarUrl(url);
      } else {
        if (coverPath) await deleteCommunityMediaAction(coverPath).catch(() => null);
        setCoverPath(result.data.path);
        setCoverUrl(url);
      }
      toast({ title: "تم رفع الصورة — احفظ الملف لتثبيتها" });
    } else {
      toast({ title: "تعذر رفع الصورة", description: result.error, variant: "destructive" });
    }
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const usernameError = validateUsername(username);
    if (usernameError) {
      toast({ title: "تعذر الحفظ — راجع الحقول", description: usernameError, variant: "destructive" });
      return;
    }
    const nameError = validateDisplayName(displayName);
    if (nameError) {
      toast({ title: "تعذر الحفظ — راجع الحقول", description: nameError, variant: "destructive" });
      return;
    }
    const bioError = validateBio(bio) ?? validateSpecialties(splitSpecialties(specialtiesText))
      ?? validateWebsiteUrl(websiteUrl) ?? validateInstagramUrl(instagramUrl) ?? validateYoutubeUrl(youtubeUrl);
    if (bioError) {
      toast({ title: "تعذر الحفظ — راجع الحقول", description: bioError, variant: "destructive" });
      return;
    }
    setBusy(true);
    try {
      // فحص التفرد قبل الحفظ (والفهرس الفريد في القاعدة حاجز نهائي)
      setCheckingUsername(true);
      const availability = await checkUsernameAvailableAction(username);
      setCheckingUsername(false);
      if (!availability.ok) {
        toast({ title: "تعذر الحفظ", description: availability.error, variant: "destructive" });
        return;
      }
      if (!availability.data.available) {
        toast({ title: "تعذر الحفظ", description: "اسم المستخدم محجوز — اختر اسمًا آخر.", variant: "destructive" });
        return;
      }

      const result = await saveCommunityProfileAction({
        username,
        displayName,
        bio,
        city,
        country,
        specialties: splitSpecialties(specialtiesText),
        experienceLevel,
        avatarPath,
        coverPath,
        availableForWork,
        websiteUrl,
        instagramUrl,
        youtubeUrl,
      });
      if (result.ok) {
        toast({ title: "تم حفظ ملفك", description: "ملفك العام محدّث الآن." });
        router.refresh();
      } else {
        toast({ title: "تعذر الحفظ — راجع الحقول", description: result.error, variant: "destructive" });
      }
    } finally {
      setBusy(false);
      setCheckingUsername(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5" noValidate>
      {/* الغلاف */}
      <div className="overflow-hidden rounded-xl border">
        <div className="relative aspect-[3/1] bg-muted">
          {coverUrl ? (
            <Image src={coverUrl} alt="غلاف الملف" fill sizes="(max-width:768px) 100vw, 700px"
              className="object-cover" />
          ) : null}
        </div>
        <div className="flex items-center gap-3 p-3">
          <div className="relative -mt-10 size-20 overflow-hidden rounded-full border-2 bg-background">
            {avatarUrl ? (
              <Image src={avatarUrl} alt="الصورة الشخصية" fill sizes="80px"
                className="object-cover" />
            ) : null}
          </div>
          <input ref={avatarRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadImage(f, "avatar"); }} />
          <input ref={coverRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadImage(f, "cover"); }} />
          <Button type="button" variant="outline" size="sm" onClick={() => avatarRef.current?.click()}>
            تغيير الصورة الشخصية
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => coverRef.current?.click()}>
            تغيير الغلاف
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="pf-username">اسم المستخدم (الرابط العام)</Label>
          <Input id="pf-username" value={username} onChange={(e) => setUsername(e.target.value.toLowerCase())}
            placeholder="مثال: ahmed_photography" dir="ltr" required minLength={3} maxLength={24}
            aria-describedby="pf-username-hint" />
          <p id="pf-username-hint" className="text-xs text-muted-foreground" dir="ltr">
            /community/u/{username || "…"}
          </p>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="pf-display">الاسم الظاهر</Label>
          <Input id="pf-display" value={displayName} onChange={(e) => setDisplayName(e.target.value)} required maxLength={80} />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="pf-bio">النبذة</Label>
        <Textarea id="pf-bio" value={bio} onChange={(e) => setBio(e.target.value)} rows={4} maxLength={1000}
          placeholder="عرّف بنفسك وأسلوبك في التصوير…" />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-1.5">
          <Label htmlFor="pf-city">المدينة</Label>
          <Input id="pf-city" value={city} onChange={(e) => setCity(e.target.value)} maxLength={80} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="pf-country">الدولة</Label>
          <Input id="pf-country" value={country} onChange={(e) => setCountry(e.target.value)} maxLength={80} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="pf-exp">مستوى الخبرة</Label>
          <select id="pf-exp" value={experienceLevel} onChange={(e) => setExperienceLevel(e.target.value as ExperienceLevel)}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm" aria-label="مستوى الخبرة">
            {Object.entries(EXPERIENCE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="pf-spec">التخصصات (افصل بفاصلة، حتى 8)</Label>
        <Input id="pf-spec" value={specialtiesText} onChange={(e) => setSpecialtiesText(e.target.value)}
          placeholder="بورتريه، منظر طبيعي، فلكي" />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-1.5">
          <Label htmlFor="pf-web">الموقع (اختياري)</Label>
          <Input id="pf-web" type="url" value={websiteUrl} onChange={(e) => setWebsiteUrl(e.target.value)} dir="ltr" placeholder="https://" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="pf-ig">انستقرام (اختياري)</Label>
          <Input id="pf-ig" type="url" value={instagramUrl} onChange={(e) => setInstagramUrl(e.target.value)} dir="ltr" placeholder="https://instagram.com/" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="pf-yt">يوتيوب (اختياري)</Label>
          <Input id="pf-yt" type="url" value={youtubeUrl} onChange={(e) => setYoutubeUrl(e.target.value)} dir="ltr" placeholder="https://youtube.com/" />
        </div>
      </div>

      <div className="flex items-center justify-between rounded-lg border p-3">
        <div>
          <Label htmlFor="pf-avail" className="text-sm">متاح لطلبات العمل</Label>
          <p className="text-xs text-muted-foreground">يظهر شعار «متاح للعمل» في ملفك العام.</p>
        </div>
        <Switch id="pf-avail" checked={availableForWork} onCheckedChange={setAvailableForWork} />
      </div>

      <div className="flex flex-wrap items-center gap-3 border-t pt-4">
        <Button type="submit" disabled={busy || checkingUsername}>
          {busy || checkingUsername ? <Loader2 className="size-4 animate-spin" /> : null}
          حفظ الملف
        </Button>
        <Button type="button" variant="ghost" className="text-destructive"
          onClick={async () => { await communityLogoutAction(); }}>
          تسجيل الخروج
        </Button>
        <p className="text-xs text-muted-foreground">{email}</p>
      </div>
    </form>
  );
}

function splitSpecialties(text: string): string[] {
  return text.split(/[،,]/).map((s) => s.trim()).filter(Boolean).slice(0, 8);
}

/** نفس صيغة resolveCommunityMediaUrl — NEXT_PUBLIC متغير مضمن في حزمة العميل */
function communityMediaUrl(path: string): string {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  return path ? `${base}/storage/v1/object/public/community-media/${path}` : "";
}
