"use client";

/**
 * HomepageEditor — محرر الصفحة الرئيسية (المهمة #14)
 * ---------------------------------------------------
 * صفحة واحدة /admin/content/home تُدار بالكامل من هنا:
 *  - تبويب «ترتيب الأقسام»: مدير الأقسام (Enabled + الاسم المعروض + ↑↓).
 *  - تبويب لكل قسم من الأقسام العشرة — النقر على «تعديل» من المدير يقفز إليه.
 *
 * النمط الموحد مع محررات الدورة/المدرب/المسار (D-19/D-22):
 *  - المسودة تُهيَّأ من المخزن بعد الترطيب فقط (hydration-safe).
 *  - Snapshot + Dirty + beforeunload + تأكيد الإلغاء + Sticky Save Bar.
 *  - الحفظ = إجراء واحد updateHomepage(draft) — لا حفظ جزئي.
 */
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowDown,
  ArrowUp,
  Eye,
  LoaderCircle,
  Pencil,
  RotateCcw,
} from "lucide-react";

import type { HomepageContent, HomepageSectionId } from "@/data/admin/types";
import { useAdminActions, useAdminState } from "@/context/admin-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { AdminPageHeader } from "@/components/admin/ui/admin-page-header";
import { ConfirmDialog } from "@/components/admin/ui/confirm-dialog";
import { HeroEditor, CtaEditor } from "./hero-cta-editors";
import {
  OrganizationsEditor,
  StatisticsEditor,
  WhyUsItemsEditor,
} from "./list-editors";
import {
  CategoriesEditor,
  FeaturedCoursesEditor,
  TestimonialsSettingsEditor,
  UpcomingCourseEditor,
} from "./course-section-editors";

/* معرّفات التبويبات — الأول مدير الأقسام ثم الأقسام بترتيبها المنطقي */
type EditorTab = "sections" | HomepageSectionId;

const TAB_META: Array<{ value: EditorTab; label: string }> = [
  { value: "sections", label: "ترتيب الأقسام" },
  { value: "hero", label: "Hero" },
  { value: "statistics", label: "الإحصائيات" },
  { value: "upcoming-course", label: "الدورة القادمة" },
  { value: "course-categories", label: "فئات الدورات" },
  { value: "featured-courses", label: "المميزة" },
  { value: "why-us", label: "لماذا نحن" },
  { value: "accreditations", label: "الاعتمادات" },
  { value: "partners", label: "الشركاء" },
  { value: "testimonials", label: "التقييمات" },
  { value: "cta", label: "CTA" },
];

export function HomepageEditor() {
  const { data, hydrated } = useAdminState();
  const { updateHomepage } = useAdminActions();
  const { toast } = useToast();

  const [tab, setTab] = useState<EditorTab>("sections");
  const [draft, setDraft] = useState<HomepageContent | null>(() =>
    hydrated ? structuredClone(data.homepage) : null,
  );
  const [snapshot, setSnapshot] = useState<string>(() =>
    hydrated ? JSON.stringify(data.homepage) : "",
  );

  /* التهيئة بعد الترطيب (نمط ضبط أثناء الرسم — D-12/D-22):
     بدون الشرط تُهيَّأ المسودة من الـ Seed في أول رسم ويصفّر أول حفظ تعديلات المالك */
  if (hydrated && draft === null) {
    const initial = structuredClone(data.homepage);
    setDraft(initial);
    setSnapshot(JSON.stringify(data.homepage));
  }

  const isDirty = useMemo(
    () => draft !== null && JSON.stringify(draft) !== snapshot,
    [draft, snapshot],
  );

  useEffect(() => {
    if (!isDirty) return;
    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);

  const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false);

  if (!hydrated || !draft) {
    return (
      <div className="mx-auto flex w-full max-w-6xl items-center justify-center py-24 text-charcoal-300">
        <LoaderCircle aria-hidden="true" className="h-6 w-6 animate-spin" />
        <span className="sr-only">جارٍ تحميل إعدادات الصفحة الرئيسية…</span>
      </div>
    );
  }

  /* مُغيّر شريحة واحدة من المسودة */
  function updateSlice<K extends keyof HomepageContent>(key: K, value: HomepageContent[K]) {
    setDraft((prev) => (prev ? { ...prev, [key]: value } : prev));
  }

  /* مدير الأقسام — عمليات على مصفوفة sections */
  function setSectionEnabled(id: HomepageSectionId, enabled: boolean) {
    setDraft((prev) =>
      prev
        ? {
            ...prev,
            sections: prev.sections.map((section) =>
              section.id === id ? { ...section, enabled } : section,
            ),
          }
        : prev,
    );
  }

  function renameSection(id: HomepageSectionId, label: string) {
    setDraft((prev) =>
      prev
        ? {
            ...prev,
            sections: prev.sections.map((section) =>
              section.id === id ? { ...section, label } : section,
            ),
          }
        : prev,
    );
  }

  function moveSection(id: HomepageSectionId, direction: -1 | 1) {
    setDraft((prev) => {
      if (!prev) return prev;
      const index = prev.sections.findIndex((section) => section.id === id);
      const target = index + direction;
      if (index < 0 || target < 0 || target >= prev.sections.length) return prev;
      const sections = [...prev.sections];
      [sections[index], sections[target]] = [sections[target], sections[index]];
      return { ...prev, sections };
    });
  }

  function handleSave() {
    if (!draft) return;
    /* الحفظ يعتمد المسودة كاملة — بلا blob URLs (يُعقّم في المخزن عند التخزين) */
    updateHomepage(structuredClone(draft));
    setSnapshot(JSON.stringify(draft));
    toast({
      title: "تم حفظ الصفحة الرئيسية",
      description: "انعكست التغييرات على /admin/preview/home فورًا.",
    });
  }

  function handleCancel() {
    if (isDirty) {
      setCancelConfirmOpen(true);
      return;
    }
    /* لا مغادرة — الصفحة الواحدة: الإلغاء يعيد آخر حالة محفوظة */
    setDraft(structuredClone(data.homepage));
    setSnapshot(JSON.stringify(data.homepage));
  }

  function handleDiscard() {
    setDraft(structuredClone(data.homepage));
    setSnapshot(JSON.stringify(data.homepage));
    setCancelConfirmOpen(false);
    toast({ title: "أُعيدت الحالة المحفوظة" });
  }

  const sectionById = new Map(draft.sections.map((section) => [section.id, section]));

  return (
    <div className="mx-auto w-full max-w-6xl pb-24">
      <AdminPageHeader
        title="الصفحة الرئيسية"
        description="تحكم كامل بأقسام الصفحة الرئيسية من مكان واحد — الترتيب والتظليل والمحتوى، والمعاينة داخل لوحة التحكم."
      >
        <Button asChild variant="outline" size="sm">
          <Link href="/admin/preview/home">
            <Eye aria-hidden="true" className="me-1.5 h-4 w-4" />
            معاينة الرئيسية
          </Link>
        </Button>
      </AdminPageHeader>

      <Tabs
        value={tab}
        onValueChange={(value) => setTab(value as EditorTab)}
        className="gap-4"
      >
        <div className="overflow-x-auto pb-1">
          <TabsList className="inline-flex min-w-max">
            {TAB_META.map((meta) => {
              const section = meta.value === "sections" ? undefined : sectionById.get(meta.value);
              return (
                <TabsTrigger key={meta.value} value={meta.value} className="gap-1.5 px-3 sm:px-4">
                  {meta.label}
                  {section && !section.enabled ? (
                    <span
                      aria-hidden="true"
                      className="h-1.5 w-1.5 rounded-full bg-charcoal-300"
                      title="القسم معطّل"
                    />
                  ) : null}
                </TabsTrigger>
              );
            })}
          </TabsList>
        </div>

        {/* ── مدير الأقسام ── */}
        <TabsContent value="sections" className="mt-2">
          <section className="rounded-xl border border-border bg-white p-4 sm:p-6">
            <h2 className="text-sm font-semibold text-charcoal-900">أقسام الصفحة الرئيسية</h2>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              الترتيب هنا هو ترتيب الظهور في الصفحة. القسم المعطّل لا يظهر في المعاينة.
              اضغط «تعديل» للانتقال إلى تبويب القسم.
            </p>

            <ul className="mt-4 space-y-2">
              {draft.sections.map((section, index) => (
                <li
                  key={section.id}
                  className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-white p-3 sm:gap-3"
                >
                  <span
                    aria-hidden="true"
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-surface text-xs font-bold text-charcoal-500 num-ltr"
                  >
                    {index + 1}
                  </span>

                  <Input
                    value={section.label}
                    onChange={(event) => renameSection(section.id, event.target.value)}
                    aria-label={`اسم القسم ${index + 1}`}
                    className="h-9 min-w-0 flex-1 basis-40 bg-white text-sm"
                  />

                  <label className="flex shrink-0 cursor-pointer items-center gap-1.5 text-xs text-charcoal-600">
                    <Switch
                      checked={section.enabled}
                      onCheckedChange={(checked) => setSectionEnabled(section.id, checked)}
                      aria-label={`تفعيل قسم ${section.label}`}
                    />
                    {section.enabled ? "مُفعّل" : "معطّل"}
                  </label>

                  <div className="flex shrink-0 items-center gap-0.5">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-charcoal-500"
                      onClick={() => moveSection(section.id, -1)}
                      disabled={index === 0}
                      aria-label={`نقل قسم ${section.label} للأعلى`}
                    >
                      <ArrowUp aria-hidden="true" className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-charcoal-500"
                      onClick={() => moveSection(section.id, 1)}
                      disabled={index === draft.sections.length - 1}
                      aria-label={`نقل قسم ${section.label} للأسفل`}
                    >
                      <ArrowDown aria-hidden="true" className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-8"
                      onClick={() => setTab(section.id as EditorTab)}
                    >
                      <Pencil aria-hidden="true" className="me-1.5 h-3.5 w-3.5" />
                      تعديل
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        </TabsContent>

        {/* ── Hero ── */}
        <TabsContent value="hero" className="mt-2">
          <section className="rounded-xl border border-border bg-white p-4 sm:p-6">
            <h2 className="mb-4 text-sm font-semibold text-charcoal-900">القسم الافتتاحي (Hero)</h2>
            <HeroEditor hero={draft.hero} onChange={(hero) => updateSlice("hero", hero)} />
          </section>
        </TabsContent>

        {/* ── الإحصائيات ── */}
        <TabsContent value="statistics" className="mt-2">
          <section className="rounded-xl border border-border bg-white p-4 sm:p-6">
            <h2 className="mb-4 text-sm font-semibold text-charcoal-900">شريط الإحصائيات</h2>
            <StatisticsEditor
              statistics={draft.statistics}
              onChange={(statistics) => updateSlice("statistics", statistics)}
            />
          </section>
        </TabsContent>

        {/* ── الدورة القادمة ── */}
        <TabsContent value="upcoming-course" className="mt-2">
          <section className="rounded-xl border border-border bg-white p-4 sm:p-6">
            <h2 className="mb-4 text-sm font-semibold text-charcoal-900">الدورة القادمة</h2>
            <UpcomingCourseEditor
              settings={draft.upcomingCourse}
              onChange={(upcomingCourse) => updateSlice("upcomingCourse", upcomingCourse)}
              data={data}
            />
          </section>
        </TabsContent>

        {/* ── فئات الدورات ── */}
        <TabsContent value="course-categories" className="mt-2">
          <section className="rounded-xl border border-border bg-white p-4 sm:p-6">
            <h2 className="mb-4 text-sm font-semibold text-charcoal-900">فئات الدورات</h2>
            <CategoriesEditor
              categories={draft.categories}
              onChange={(categories) => updateSlice("categories", categories)}
            />
          </section>
        </TabsContent>

        {/* ── الدورات المميزة ── */}
        <TabsContent value="featured-courses" className="mt-2">
          <section className="rounded-xl border border-border bg-white p-4 sm:p-6">
            <h2 className="mb-4 text-sm font-semibold text-charcoal-900">الدورات المميزة</h2>
            <FeaturedCoursesEditor
              settings={draft.featuredCourses}
              onChange={(featuredCourses) => updateSlice("featuredCourses", featuredCourses)}
              courses={data.courses}
            />
          </section>
        </TabsContent>

        {/* ── لماذا نحن ── */}
        <TabsContent value="why-us" className="mt-2">
          <section className="rounded-xl border border-border bg-white p-4 sm:p-6">
            <h2 className="mb-4 text-sm font-semibold text-charcoal-900">لماذا نحن</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-1.5">
                <span className="text-sm font-medium text-charcoal-800">عنوان القسم</span>
                <Input
                  value={draft.whyUs.title}
                  onChange={(event) =>
                    updateSlice("whyUs", { ...draft.whyUs, title: event.target.value })
                  }
                  aria-label="عنوان قسم لماذا نحن"
                />
              </label>
              <label className="space-y-1.5">
                <span className="text-sm font-medium text-charcoal-800">
                  وصف القسم <span className="ms-1 text-xs font-normal text-muted-foreground">(اختياري)</span>
                </span>
                <Input
                  value={draft.whyUs.description}
                  onChange={(event) =>
                    updateSlice("whyUs", { ...draft.whyUs, description: event.target.value })
                  }
                  aria-label="وصف قسم لماذا نحن"
                />
              </label>
            </div>
            <div className="mt-4">
              <WhyUsItemsEditor
                items={draft.whyUs.items}
                onChange={(items) => updateSlice("whyUs", { ...draft.whyUs, items })}
              />
            </div>
          </section>
        </TabsContent>

        {/* ── الاعتمادات ── */}
        <TabsContent value="accreditations" className="mt-2">
          <section className="rounded-xl border border-border bg-white p-4 sm:p-6">
            <h2 className="mb-4 text-sm font-semibold text-charcoal-900">الاعتمادات</h2>
            <OrganizationsEditor
              organizations={draft.accreditations}
              onChange={(accreditations) => updateSlice("accreditations", accreditations)}
              kindLabel="اعتماد"
            />
          </section>
        </TabsContent>

        {/* ── الشركاء ── */}
        <TabsContent value="partners" className="mt-2">
          <section className="rounded-xl border border-border bg-white p-4 sm:p-6">
            <h2 className="mb-4 text-sm font-semibold text-charcoal-900">شركاء النجاح</h2>
            <OrganizationsEditor
              organizations={draft.partners}
              onChange={(partners) => updateSlice("partners", partners)}
              kindLabel="شريك"
              withDescription
            />
          </section>
        </TabsContent>

        {/* ── التقييمات (إعدادات القسم) ── */}
        <TabsContent value="testimonials" className="mt-2">
          <section className="rounded-xl border border-border bg-white p-4 sm:p-6">
            <h2 className="mb-2 text-sm font-semibold text-charcoal-900">
              إعدادات قسم التقييمات
            </h2>
            <p className="mb-4 text-xs leading-relaxed text-muted-foreground">
              التقييمات نفسها (إضافة/تعديل/حذف) تُدار من{" "}
              <Link href="/admin/testimonials" className="font-medium text-brand-700 underline-offset-4 hover:underline">
                صفحة التقييمات
              </Link>
              .
            </p>
            <TestimonialsSettingsEditor
              settings={draft.testimonials}
              onChange={(testimonials) => updateSlice("testimonials", testimonials)}
              data={data}
            />
          </section>
        </TabsContent>

        {/* ── CTA ── */}
        <TabsContent value="cta" className="mt-2">
          <section className="rounded-xl border border-border bg-white p-4 sm:p-6">
            <h2 className="mb-4 text-sm font-semibold text-charcoal-900">
              دعوة الإجراء الأخيرة (CTA)
            </h2>
            <CtaEditor cta={draft.cta} onChange={(cta) => updateSlice("cta", cta)} />
          </section>
        </TabsContent>
      </Tabs>

      {/* شريط الحفظ الثابت */}
      <div className="sticky bottom-0 -mx-4 mt-6 border-t border-border bg-white px-4 py-3 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3">
          <p aria-live="polite" className="flex items-center gap-2 text-xs text-muted-foreground">
            {isDirty ? (
              <>
                <span aria-hidden="true" className="h-2 w-2 rounded-full bg-brand-500" />
                تغييرات غير محفوظة
              </>
            ) : (
              "لا تغييرات جديدة"
            )}
          </p>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handleCancel}>
              <RotateCcw aria-hidden="true" className="me-1.5 h-4 w-4" />
              إلغاء
            </Button>
            <Button onClick={handleSave} disabled={!isDirty}>
              حفظ التغييرات
            </Button>
          </div>
        </div>
      </div>

      {/* تأكيد الإلغاء مع تعديلات غير محفوظة */}
      <ConfirmDialog
        open={cancelConfirmOpen}
        onOpenChange={setCancelConfirmOpen}
        title="تجاهل التغييرات؟"
        description="لديك تعديلات غير محفوظة على الصفحة الرئيسية. هل تريد إعادتها إلى آخر حالة محفوظة؟"
        confirmLabel="تجاهل التغييرات"
        onConfirm={handleDiscard}
      />
    </div>
  );
}
