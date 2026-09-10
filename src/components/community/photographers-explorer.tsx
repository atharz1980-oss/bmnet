"use client";
/**
 * مستكشف المصورين — بحث + فلاتر (مدينة/دولة/تخصص/خبرة/متاح للعمل) + ترقيم.
 * الفلاتر عبر روابط URL (server-side filtering) — mobile-first.
 */
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { BadgeCheck, Loader2, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MemberAvatar } from "./member-avatar";
import { EXPERIENCE_LABELS, type CommunityMember } from "@/lib/community/types";
import { DISCOVERY_PAGE_SIZE } from "@/lib/community/validation";

interface Filters {
  q: string;
  city: string;
  country: string;
  specialty: string;
  experience: string;
  available: string;
}

export function PhotographersExplorer({
  initialMembers,
  initialHasMore,
  failed,
  filters,
  page,
}: {
  initialMembers: CommunityMember[];
  initialHasMore: boolean;
  failed: boolean;
  filters: Filters;
  page: number;
}) {
  const router = useRouter();
  const [q, setQ] = useState(filters.q);
  const [loading, startTransition] = useTransition();

  function apply(next: Partial<Filters>, targetPage = 0) {
    const merged = { ...filters, ...next };
    const search = new URLSearchParams();
    Object.entries(merged).forEach(([key, value]) => {
      if (value) search.set(key, value);
    });
    if (targetPage > 0) search.set("page", String(targetPage));
    startTransition(() => {
      router.push(`/community/photographers${search.size > 0 ? `?${search.toString()}` : ""}`);
    });
  }

  if (failed && initialMembers.length === 0) {
    return (
      <div className="rounded-xl border bg-card p-10 text-center space-y-3">
        <p className="font-medium">تعذر تحميل قائمة المصورين الآن.</p>
        <p className="text-sm text-muted-foreground">
          قد تكون ميزة المجتمع لم تُفعّل بعد على قاعدة البيانات.
        </p>
        <Button variant="outline" onClick={() => router.refresh()}>إعادة المحاولة</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <form
        className="grid gap-3 rounded-xl border bg-card p-4 sm:grid-cols-2 lg:grid-cols-3"
        onSubmit={(event) => {
          event.preventDefault();
          apply({ q });
        }}
      >
        <div className="space-y-1.5 sm:col-span-2 lg:col-span-1">
          <Label htmlFor="disc-q">بحث بالاسم أو اسم المستخدم</Label>
          <div className="flex gap-2">
            <Input id="disc-q" value={q} onChange={(e) => setQ(e.target.value)} placeholder="ابحث…" />
            <Button type="submit" size="icon" variant="outline" aria-label="بحث">
              <Search className="size-4" />
            </Button>
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="disc-city">المدينة</Label>
          <Input id="disc-city" defaultValue={filters.city}
            onBlur={(e) => apply({ city: e.target.value })}
            onKeyDown={(e) => { if (e.key === "Enter") apply({ city: (e.target as HTMLInputElement).value }); }}
            placeholder="الرياض" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="disc-spec">التخصص</Label>
          <Input id="disc-spec" defaultValue={filters.specialty}
            onBlur={(e) => apply({ specialty: e.target.value })}
            onKeyDown={(e) => { if (e.key === "Enter") apply({ specialty: (e.target as HTMLInputElement).value }); }}
            placeholder="بورتريه" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="disc-exp">مستوى الخبرة</Label>
          <select id="disc-exp" value={filters.experience}
            onChange={(e) => apply({ experience: e.target.value })}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm">
            <option value="">الكل</option>
            {Object.entries(EXPERIENCE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>
        <div className="flex items-end gap-3">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={filters.available === "1"}
              onChange={(e) => apply({ available: e.target.checked ? "1" : "" })}
              className="size-4 accent-[var(--primary)]" />
            متاح للعمل فقط
          </label>
          {Object.values(filters).some(Boolean) ? (
            <Button type="button" variant="ghost" size="sm"
              onClick={() => { setQ(""); router.push("/community/photographers"); }}>
              مسح الفلاتر
            </Button>
          ) : null}
        </div>
      </form>

      {initialMembers.length === 0 && !failed ? (
        <div className="rounded-xl border bg-card p-10 text-center space-y-2">
          <p className="font-medium">لا نتائج مطابقة</p>
          <p className="text-sm text-muted-foreground">جرّب تعديل البحث أو الفلاتر.</p>
        </div>
      ) : null}

      {loading ? (
        <div className="flex justify-center py-8"><Loader2 className="size-6 animate-spin" aria-label="جارٍ التحميل" /></div>
      ) : null}

      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-label="قائمة المصورين">
        {initialMembers.map((member) => (
          <li key={member.userId} className="rounded-xl border bg-card p-4 space-y-3">
            <div className="flex items-center gap-3">
              <MemberAvatar src={member.avatarUrl} name={member.displayName} className="size-12" />
              <div className="min-w-0">
                <Link href={`/community/u/${member.username}`} className="font-semibold hover:underline flex items-center gap-1">
                  <span className="truncate">{member.displayName}</span>
                  {member.availableForWork ? <BadgeCheck className="size-4 text-brand-600 shrink-0" aria-label="متاح للعمل" /> : null}
                </Link>
                <p className="text-xs text-muted-foreground" dir="ltr">@{member.username}</p>
              </div>
            </div>
            {member.bio ? <p className="line-clamp-2 text-sm text-muted-foreground">{member.bio}</p> : null}
            <div className="flex flex-wrap gap-1.5 text-xs">
              {member.city ? <span className="rounded-full bg-muted px-2 py-0.5">{member.city}</span> : null}
              <span className="rounded-full bg-muted px-2 py-0.5">{EXPERIENCE_LABELS[member.experienceLevel]}</span>
              {member.specialties.slice(0, 2).map((s) => (
                <span key={s} className="rounded-full bg-brand-50 px-2 py-0.5 text-brand-800">{s}</span>
              ))}
            </div>
            <Button asChild variant="outline" size="sm" className="w-full">
              <Link href={`/community/u/${member.username}`}>عرض الملف</Link>
            </Button>
          </li>
        ))}
      </ul>

      {initialHasMore || page > 0 ? (
        <div className="flex justify-center gap-3">
          {page > 0 ? (
            <Button variant="outline" onClick={() => apply({}, page - 1)}>
              السابق
            </Button>
          ) : null}
          {initialHasMore ? (
            <Button variant="outline" onClick={() => apply({}, page + 1)}>
              التالي ({page + 2})
            </Button>
          ) : null}
        </div>
      ) : null}
      <p className="sr-only">حجم الصفحة: {DISCOVERY_PAGE_SIZE} عضوًا</p>
    </div>
  );
}
