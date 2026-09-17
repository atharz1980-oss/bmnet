"use client";

import { useRef, useState } from "react";
import { CheckCircle2, ChevronDown, ListChecks, Target } from "lucide-react";
import type { Course } from "@/types";
import { cn } from "@/lib/utils";

type TabId = "overview" | "curriculum" | "outcomes";

const tabs: { id: TabId; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "overview", label: "نظرة عامة", icon: Target },
  { id: "curriculum", label: "محتوى الدورة", icon: ListChecks },
  { id: "outcomes", label: "ماذا ستتعلم؟", icon: CheckCircle2 },
];

/**
 * تبويبات تفاصيل الدورة: نظرة عامة / المحتوى / المخرجات — بنمط ARIA Tabs كامل.
 *
 * `curriculumSlot` يحل محل منهج الأيام الثابت في الدورات الأونلاين: منهجها
 * وحدات ودروس حقيقية في القاعدة، ويُبنى على الخادم فلا يمر به معرّف فيديو.
 */
export function CourseTabs({
  course,
  curriculumSlot,
}: {
  course: Course;
  curriculumSlot?: React.ReactNode;
}) {
  /* الدورة الأونلاين منهجها هو عرضها: يُفتح تبويبه أولًا، فيصل المنهج إلى
     HTML المرسَل من الخادم — لا خلف نقرة يراها الزائر ولا يراها الفهرس. */
  const [activeTab, setActiveTab] = useState<TabId>(curriculumSlot ? "curriculum" : "overview");
  const [openModule, setOpenModule] = useState<number>(0);
  const tabRefs = useRef<Record<TabId, HTMLButtonElement | null>>({
    overview: null,
    curriculum: null,
    outcomes: null,
  });

  /** تنقل بالأسهم بين التبويبات (مع مراعاة اتجاه RTL) */
  const handleTablistKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const keys = ["ArrowLeft", "ArrowRight", "Home", "End"];
    if (!keys.includes(event.key)) return;
    event.preventDefault();

    const rtl = document.documentElement.getAttribute("dir") === "rtl";
    const forwardKey = rtl ? "ArrowLeft" : "ArrowRight";
    const currentIndex = tabs.findIndex((tab) => tab.id === activeTab);

    let nextIndex = currentIndex;
    if (event.key === forwardKey) nextIndex = (currentIndex + 1) % tabs.length;
    else if (event.key === "ArrowLeft" || event.key === "ArrowRight")
      nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
    else if (event.key === "Home") nextIndex = 0;
    else if (event.key === "End") nextIndex = tabs.length - 1;

    const nextTab = tabs[nextIndex];
    setActiveTab(nextTab.id);
    tabRefs.current[nextTab.id]?.focus();
  };

  return (
    <div>
      {/* أزرار التبويبات */}
      <div
        role="tablist"
        aria-label="تفاصيل الدورة"
        onKeyDown={handleTablistKeyDown}
        className="flex flex-wrap gap-2 border-b border-charcoal-200"
      >
        {tabs.map((tab) => (
          <button
            key={tab.id}
            ref={(el) => {
              tabRefs.current[tab.id] = el;
            }}
            role="tab"
            id={`course-tab-${tab.id}`}
            aria-selected={activeTab === tab.id}
            aria-controls={`course-panel-${tab.id}`}
            tabIndex={activeTab === tab.id ? 0 : -1}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold transition-colors",
              activeTab === tab.id
                ? "border-brand-600 text-brand-600"
                : "border-transparent text-charcoal-500 hover:text-charcoal-900"
            )}
          >
            <tab.icon className="h-4 w-4" aria-hidden="true" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* المحتوى */}
      <div className="py-8">
        {activeTab === "overview" && (
          <div
            id="course-panel-overview"
            role="tabpanel"
            aria-labelledby="course-tab-overview"
            tabIndex={0}
            className="space-y-4 leading-relaxed text-charcoal-600"
          >
            {course.description.map((paragraph, index) => (
              <p key={index}>{paragraph}</p>
            ))}
            {/* Checkpoint 7: الفئة المستهدفة والمتطلبات من نموذج الإدارة (اختيارية) */}
            {course.audience && course.audience.length > 0 && (
              <div className="mt-4 rounded-xl border border-charcoal-100 bg-charcoal-50/60 p-5">
                <h3 className="text-sm font-bold text-charcoal-900">هذه الدورة موجهة لـ</h3>
                <ul className="mt-2.5 space-y-1.5 text-sm">
                  {course.audience.map((entry) => (
                    <li key={entry} className="flex items-start gap-2">
                      <Target aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-500" />
                      {entry}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {course.requirements && course.requirements.length > 0 && (
              <div className="mt-4 rounded-xl border border-charcoal-100 bg-charcoal-50/60 p-5">
                <h3 className="text-sm font-bold text-charcoal-900">المتطلبات قبل الدورة</h3>
                <ul className="mt-2.5 space-y-1.5 text-sm">
                  {course.requirements.map((entry) => (
                    <li key={entry} className="flex items-start gap-2">
                      <ListChecks aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-500" />
                      {entry}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {activeTab === "curriculum" && (
          <div
            id="course-panel-curriculum"
            role="tabpanel"
            aria-labelledby="course-tab-curriculum"
            tabIndex={0}
            className="space-y-3"
          >
            {curriculumSlot}
            {curriculumSlot ? null : course.curriculum.map((module, index) => {
              const isOpen = openModule === index;
              return (
                <div key={module.title} className="overflow-hidden rounded-xl border border-charcoal-200 bg-white">
                  <button
                    onClick={() => setOpenModule(isOpen ? -1 : index)}
                    aria-expanded={isOpen}
                    className="flex w-full items-center justify-between gap-3 px-5 py-4 text-start transition-colors hover:bg-charcoal-50"
                  >
                    <span className="flex items-center gap-3">
                      <span
                        aria-hidden="true"
                        className={cn(
                          "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold",
                          isOpen ? "bg-brand-600 text-white" : "bg-charcoal-100 text-charcoal-500"
                        )}
                      >
                        {index + 1}
                      </span>
                      <span className="font-semibold text-charcoal-900">{module.title}</span>
                    </span>
                    <ChevronDown
                      aria-hidden="true"
                      className={cn("h-4 w-4 shrink-0 text-charcoal-400 transition-transform", isOpen && "rotate-180")}
                    />
                  </button>
                  {isOpen && (
                    <ul className="space-y-2.5 border-t border-charcoal-100 px-5 py-4">
                      {module.lessons.map((lesson) => (
                        <li key={lesson} className="flex items-start gap-2.5 text-sm text-charcoal-600">
                          <CheckCircle2 aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-brand-500" />
                          {lesson}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {activeTab === "outcomes" && (
          <ul
            id="course-panel-outcomes"
            role="tabpanel"
            aria-labelledby="course-tab-outcomes"
            tabIndex={0}
            className="grid gap-3 sm:grid-cols-2"
          >
            {course.learningOutcomes.map((outcome) => (
              <li
                key={outcome}
                className="flex items-start gap-2.5 rounded-xl border border-charcoal-200 bg-white p-4 text-sm leading-relaxed text-charcoal-600"
              >
                <CheckCircle2 aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-brand-500" />
                {outcome}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
