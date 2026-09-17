"use client";

/**
 * CourseEditor — محرر الدورة (المهمة #9) + المحاور (#10) + المواعيد (#11)
 * -------------------------------------------------------------------------
 * نفس الـ Component للإضافة (new) والتعديل ([id]) — فارق البدء فقط.
 * التنظيم: 9 تبويبات مع تمرير أفقي داخلي على الموبايل (لا page overflow).
 *
 * الحفظ:
 *  - Create → addCourse ثم التوجه لقائمة الدورات.
 *  - Edit   → updateCourse ثم التوجه لقائمة الدورات.
 *  - Validation قبل الحفظ (اسم/slug فريد/سعر/أيام/مواعيد) مع الانتقال
 *    لأول تبويب به خطأ وعرض رسالة واضحة عبر Toast (بلا alert).
 *
 * Dirty State (قرار موثق): تحذير beforeunload عند الخروج ببيانات غير
 * محفوظة + تأكيد عند «إلغاء» — اعتراض تغيّر المسار في App Router معقّد
 * وأُجّل عمدًا (موثق في التقرير).
 */
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LoaderCircle } from "lucide-react";

import type { AdminCourse } from "@/data/admin/types";
import type { CourseInput } from "@/context/admin-store";
import { useAdminActions, useAdminState } from "@/context/admin-store";
import { SLUG_PATTERN } from "../course-meta";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { AdminPageHeader } from "@/components/admin/ui/admin-page-header";
import { ConfirmDialog } from "@/components/admin/ui/confirm-dialog";
import { EmptyState } from "@/components/admin/ui/empty-state";
import { BasicInfoTab } from "./basic-info-tab";
import { ImagesTab } from "./images-tab";
import { PricingTab } from "./pricing-tab";
import { DurationTab } from "./duration-tab";
import { AudienceTab, OutcomesTab, RequirementsTab } from "./lists-tabs";
import { CurriculumTab } from "./curriculum-tab";
import { SessionsTab } from "./sessions-tab";
import { OnlineContentTab } from "./online-content-tab";

/* ─────────────────── تعريفات التبويبات ─────────────────── */

type TabKey =
  | "basic"
  | "images"
  | "pricing"
  | "duration"
  | "outcomes"
  | "audience"
  | "requirements"
  | "curriculum"
  | "sessions"
  | "online-content";

/** خريطة خطأ → تبويب (للانتقال لأول تبويب به خطأ) */
const ERROR_TAB: Record<string, TabKey> = {
  name: "basic",
  slug: "basic",
  "images.alt": "images",
  "pricing.price": "pricing",
  "pricing.discountPercent": "pricing",
  "duration.days": "duration",
  "duration.totalHours": "duration",
  outcomes: "outcomes",
  audience: "audience",
  requirements: "requirements",
  curriculum: "curriculum",
  sessions: "sessions",
};

const TAB_LABELS: Record<TabKey, string> = {
  basic: "المعلومات الأساسية",
  images: "الصور",
  pricing: "التسعير",
  duration: "المدة",
  outcomes: "مخرجات التعلم",
  audience: "الفئة المستهدفة",
  requirements: "المتطلبات",
  curriculum: "المحاور",
  sessions: "المواعيد",
  "online-content": "محتوى الدورة",
};

/**
 * تبويب «محتوى الدورة» يظهر لنوع الأونلاين وحده.
 *
 * القيمة من نفس الـenum الذي يستعمله المحرر والقاعدة — `course_category`:
 * in-person-individuals | in-person-corporates | online | private.
 */
const ONLINE_COURSE_TYPE: CourseInput["type"] = "online";

const BASE_TAB_ORDER: TabKey[] = [
  "basic",
  "images",
  "pricing",
  "duration",
  "outcomes",
  "audience",
  "requirements",
  "curriculum",
  "sessions",
];

/**
 * تبويبات هذه الدورة. «محتوى الدورة» يُضاف للأونلاين فقط، ويُقرأ من
 * المسودة الحالية لا من المحفوظ — فتغيير النوع في التبويب الأول يُظهره أو
 * يخفيه فورًا بلا حفظ.
 */
function tabsFor(type: CourseInput["type"] | undefined): TabKey[] {
  return type === ONLINE_COURSE_TYPE ? [...BASE_TAB_ORDER, "online-content"] : BASE_TAB_ORDER;
}

/* ─────────────────── القيم الافتراضية والتحقق ─────────────────── */

function createDraftDefaults(): CourseInput {
  return {
    name: "",
    shortName: "",
    slug: "",
    excerpt: "",
    description: "",
    type: "in-person-individuals",
    level: "beginner",
    language: "ar",
    status: "draft",
    images: { main: "", alt: "" },
    pricing: { price: 0, showPrice: true, isFree: false, requestQuote: false },
    duration: { days: 1, totalHours: 0 },
    outcomes: [],
    audience: [],
    requirements: [],
    curriculum: [],
    sessions: [],
    trainerId: undefined,
    featured: false,
    seo: {},
  };
}

/** إسقاط حقول الهوية والأختام الزمنية لتحويل الدورة إلى مسودة قابلة للتعديل */
function toDraft(course: AdminCourse): CourseInput {
  const { id: _id, createdAt: _createdAt, updatedAt: _updatedAt, ...rest } = course;
  return rest;
}

function validateDraft(
  draft: CourseInput,
  existingSlugs: Array<{ id: string; slug: string }>,
  excludeId?: string,
): Record<string, string> {
  const errors: Record<string, string> = {};

  if (!draft.name.trim()) errors.name = "اسم الدورة مطلوب";

  const slug = draft.slug.trim();
  if (!slug) {
    errors.slug = "الـ slug مطلوب للرابط الدائم";
  } else if (!SLUG_PATTERN.test(slug)) {
    errors.slug = "صيغة الـ slug غير صحيحة — أحرف لاتينية صغيرة وأرقام وشرطات فقط";
  } else if (existingSlugs.some((course) => course.slug === slug && course.id !== excludeId)) {
    errors.slug = "الـ slug مستخدم مع دورة أخرى — اختر قيمة فريدة";
  }

  if (draft.pricing.price < 0) errors["pricing.price"] = "السعر لا يمكن أن يكون سالبًا";
  if (
    draft.pricing.discountPercent !== undefined &&
    (draft.pricing.discountPercent < 0 || draft.pricing.discountPercent > 100)
  ) {
    errors["pricing.discountPercent"] = "نسبة الخصم بين 0 و100";
  }

  if (draft.duration.days < 1) errors["duration.days"] = "عدد الأيام يجب أن يكون 1 على الأقل";
  if (draft.duration.totalHours < 0) {
    errors["duration.totalHours"] = "إجمالي الساعات لا يمكن أن يكون سالبًا";
  }

  if (draft.sessions.some((session) => session.registered > session.seats)) {
    errors.sessions = "يوجد موعد يتجاوز فيه المسجلون سعة المقاعد";
  }

  return errors;
}

/* ─────────────────── المكون الرئيسي ─────────────────── */

interface CourseEditorProps {
  mode: "create" | "edit";
  courseId?: string;
}

export function CourseEditor({ mode, courseId }: CourseEditorProps) {
  const router = useRouter();
  const { toast } = useToast();
  const { data, hydrated, saving } = useAdminState();
  const { addCourse, updateCourse } = useAdminActions();

  const course = mode === "edit" ? data.courses.find((entry) => entry.id === courseId) : undefined;

  /* مسودة الحالة + لقطة الحفظ — تُهيّآن من بيانات المخزن بعد الترطيب فقط:
     التحميل المباشر لرابط المحرر يبدأ بالـ Seed قبل قراءة localStorage،
     وتهيئة المسودة منه كانت تُصفّر تعديلات المالك المحفوظة عند أول حفظ
     (علة مكتشفة أثناء تحقق Checkpoint 3 — إصلاح موثق في memory.md). */
  const [draft, setDraft] = useState<CourseInput | null>(() =>
    mode === "create" ? createDraftDefaults() : hydrated && course ? toDraft(course) : null,
  );
  const [snapshot, setSnapshot] = useState<string>(() =>
    mode === "create"
      ? JSON.stringify(createDraftDefaults())
      : hydrated && course
        ? JSON.stringify(toDraft(course))
        : "",
  );

  /* تغيير المعرّف ضمن نفس المسار (الانتقال بين دورتين) → إعادة تهيئة المسودة */
  const [prevId, setPrevId] = useState<string | undefined>(courseId);
  if (courseId !== prevId) {
    setPrevId(courseId);
    if (course) {
      const initial = toDraft(course);
      setSnapshot(JSON.stringify(initial));
      setDraft(initial);
    } else {
      setSnapshot("");
      setDraft(null);
    }
  }

  /* التهيئة المؤجلة: الدورة لم تكن متاحة أولًا ووصلت بعد ترطيب المخزن —
     نمط «ضبط الحالة أثناء الرسم» المعتمد (D-12) بدل setState في effect.
     الشرط يشمل hydrated: بدونها تُهيَّأ المسودة من الـ Seed في أول رسم. */
  if (mode === "edit" && hydrated && draft === null && course) {
    const initial = toDraft(course);
    setSnapshot(JSON.stringify(initial));
    setDraft(initial);
  }

  const update = (patch: Partial<CourseInput>) =>
    setDraft((prev) => (prev ? { ...prev, ...patch } : prev));

  const isDirty = useMemo(
    () => draft !== null && JSON.stringify(draft) !== snapshot,
    [draft, snapshot],
  );

  /* تحذير المتصفح عند الخروج ببيانات غير محفوظة */
  useEffect(() => {
    if (!isDirty) return;
    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);

  const [activeTab, setActiveTab] = useState<TabKey>("basic");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false);

  const visibleTabs = tabsFor(draft?.type);
  /* غيّر النوع من أونلاين إلى غيره وهو واقف على «محتوى الدورة»: التبويب
     المعروض يُشتق لا يُصحَّح بأثر جانبي — فلا وميض ولا حالة متأخرة. */
  const effectiveTab = visibleTabs.includes(activeTab) ? activeTab : "basic";

  const tabCounts: Partial<Record<TabKey, number>> = draft
    ? {
        outcomes: draft.outcomes.length,
        audience: draft.audience.length,
        requirements: draft.requirements.length,
        curriculum: draft.curriculum.length,
        sessions: draft.sessions.length,
      }
    : {};

  if (mode === "edit" && hydrated && !course) {
    return (
      <div className="mx-auto w-full max-w-6xl">
        <EmptyState
          title="الدورة غير موجودة"
          description="ربما حُذفت هذه الدورة أو أن الرابط غير صحيح."
        >
          <Button asChild size="sm">
            <Link href="/admin/courses">العودة لقائمة الدورات</Link>
          </Button>
        </EmptyState>
      </div>
    );
  }

  if (!draft) {
    /* انتظار تهيئة مسودة التعديل (ترطيب المخزن) */
    return (
      <div className="mx-auto flex w-full max-w-6xl items-center justify-center py-24 text-charcoal-300">
        <LoaderCircle aria-hidden="true" className="h-6 w-6 animate-spin" />
        <span className="sr-only">جارٍ تحميل الدورة…</span>
      </div>
    );
  }

  async function handleSave() {
    /* الحارس ضد الضغط المتكرر.
       الحفظ رحلة طويلة: إنشاء على الخادم ثم سحب بيانات اللوحة كاملة. بلا
       حارس تبقى الشاشة ساكنة ثوانيَ، فيضغط المستخدم ثانيةً وثالثة — وكل
       ضغطة تُنشئ دورة جديدة لأن الخادم يفضّ تكرار الـslug صامتًا
       (`uniqueCourseSlug`) فلا يفشل شيء. وقع فعلًا: خمس عشرة دورة مكرّرة
       في إحدى وثلاثين ثانية. */
    if (!draft || saving) return;
    const validation = validateDraft(
      draft,
      data.courses.map((entry) => ({ id: entry.id, slug: entry.slug })),
      courseId,
    );
    setErrors(validation);

    const errorKeys = Object.keys(validation);
    if (errorKeys.length > 0) {
      const firstTab = ERROR_TAB[errorKeys[0]] ?? "basic";
      setActiveTab(firstTab);
      toast({
        title: "تعذر الحفظ — راجع الحقول",
        description: validation[errorKeys[0]],
        variant: "destructive",
      });
      return;
    }

    if (mode === "create") {
      const result = await addCourse(draft);
      if (!result.ok) {
        toast({ title: "تعذر إنشاء الدورة", description: result.error, variant: "destructive" });
        return;
      }
      toast({ title: "تم إنشاء الدورة", description: `أُضيفت «${draft.name}» إلى قائمة الدورات.` });
      router.push(`/admin/courses/${result.data}`);
    } else if (courseId) {
      const result = await updateCourse(courseId, draft);
      if (!result.ok) {
        toast({ title: "تعذر الحفظ", description: result.error, variant: "destructive" });
        return;
      }
      toast({ title: "تم حفظ الدورة", description: `حُدّثت «${draft.name}» بنجاح.` });
      router.push("/admin/courses");
    }
  }

  function handleCancel() {
    if (isDirty) {
      setCancelConfirmOpen(true);
      return;
    }
    router.push("/admin/courses");
  }

  return (
    <div className="mx-auto w-full max-w-6xl pb-24">
      <AdminPageHeader
        title={mode === "create" ? "دورة جديدة" : draft.name || "تعديل الدورة"}
        description={
          mode === "create"
            ? "أدخل بيانات الدورة الجديدة — كل التبويبات محفوظة معًا عند الضغط على «حفظ الدورة»."
            : "عدّل بيانات الدورة — الحفظ يجمع تغييرات كل التبويبات دفعة واحدة."
        }
      >
        {mode === "edit" && course ? (
          <Button asChild variant="outline" size="sm">
            <Link href="/admin/courses">قائمة الدورات</Link>
          </Button>
        ) : null}
      </AdminPageHeader>

      <Tabs
        value={effectiveTab}
        onValueChange={(value) => setActiveTab(value as TabKey)}
        className="w-full"
      >
        {/* تمرير أفقي داخلي للتبويبات على الموبايل — لا overflow للصفحة */}
        <div className="-mx-4 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
          <TabsList className="inline-flex min-w-max">
            {visibleTabs.map((tab) => (
              <TabsTrigger key={tab} value={tab} className="gap-1.5 px-3 sm:px-4">
                {TAB_LABELS[tab]}
                {typeof tabCounts[tab] === "number" && tabCounts[tab] !== 0 ? (
                  <span
                    aria-hidden="true"
                    className="rounded-full bg-charcoal-900/8 px-1.5 text-[10px] font-semibold text-charcoal-600 num-ltr"
                  >
                    {tabCounts[tab]}
                  </span>
                ) : null}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        <TabsContent value="basic" className="mt-4">
          <div className="rounded-xl border border-border bg-white p-4 sm:p-6">
            <BasicInfoTab draft={draft} update={update} errors={errors} />
          </div>
        </TabsContent>
        <TabsContent value="images" className="mt-4">
          <div className="rounded-xl border border-border bg-white p-4 sm:p-6">
            <ImagesTab draft={draft} update={update} errors={errors} />
          </div>
        </TabsContent>
        <TabsContent value="pricing" className="mt-4">
          <div className="rounded-xl border border-border bg-white p-4 sm:p-6">
            <PricingTab draft={draft} update={update} errors={errors} courseId={courseId} />
          </div>
        </TabsContent>
        <TabsContent value="duration" className="mt-4">
          <div className="rounded-xl border border-border bg-white p-4 sm:p-6">
            <DurationTab draft={draft} update={update} errors={errors} />
          </div>
        </TabsContent>
        <TabsContent value="outcomes" className="mt-4">
          <div className="rounded-xl border border-border bg-white p-4 sm:p-6">
            <OutcomesTab draft={draft} update={update} errors={errors} />
          </div>
        </TabsContent>
        <TabsContent value="audience" className="mt-4">
          <div className="rounded-xl border border-border bg-white p-4 sm:p-6">
            <AudienceTab draft={draft} update={update} errors={errors} />
          </div>
        </TabsContent>
        <TabsContent value="requirements" className="mt-4">
          <div className="rounded-xl border border-border bg-white p-4 sm:p-6">
            <RequirementsTab draft={draft} update={update} errors={errors} />
          </div>
        </TabsContent>
        <TabsContent value="curriculum" className="mt-4">
          <CurriculumTab draft={draft} update={update} errors={errors} />
        </TabsContent>
        <TabsContent value="sessions" className="mt-4">
          <SessionsTab draft={draft} update={update} errors={errors} />
        </TabsContent>
        {draft.type === ONLINE_COURSE_TYPE ? (
          <TabsContent value="online-content" className="mt-4">
            <OnlineContentTab courseId={mode === "edit" ? courseId : undefined} isDirty={isDirty} />
          </TabsContent>
        ) : null}
      </Tabs>

      {/* شريط الحفظ الثابت — يبقى مرئيًا أثناء التمرير دون كسر الموبايل */}
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
            <Button variant="outline" disabled={saving} onClick={handleCancel}>
              إلغاء
            </Button>
            <Button disabled={saving} onClick={handleSave}>
              {saving ? "جارٍ الحفظ…" : "حفظ الدورة"}
            </Button>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={cancelConfirmOpen}
        onOpenChange={setCancelConfirmOpen}
        title="تجاهل التغييرات؟"
        description="لديك تعديلات غير محفوظة ستُفقد عند المغادرة. هل تريد المتابعة دون حفظ؟"
        confirmLabel="تجاهل التغييرات"
        onConfirm={() => router.push("/admin/courses")}
      />
    </div>
  );
}
