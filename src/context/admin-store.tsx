"use client";

/**
 * بيت المصور — مخزن حالة الـ CMS (AdminStoreProvider)
 * ---------------------------------------------------
 * معمارية الفصل (بدون Redux/Zustand — قرار D-03):
 *   - StateContext   : البيانات + حالة الترطيب (hydrated)
 *   - ActionsContext : دوال التعديل المستقرة (لا تتغير مرجعيًا)
 *   - Selectors      : دوال نقية في src/data/admin/selectors.ts
 *
 * التخزين المحلي (Mock CMS فقط — قرار D-04):
 *   - hydration-safe: يُصيَّر بالـ Seed أولًا ثم يُحمَّل المخزون في useEffect
 *   - browser-safe: لا وصول لـ localStorage خارج الـ effects
 *   - typed + fallback للـ Seed عند تلف/تعارض النسخة
 *   - Object URLs لا تُخزَّن أبدًا (sanitizeForStorage)
 */

import { createContext, useContext, useEffect, useMemo, useState } from "react";

import {
  ADMIN_CMS_VERSION,
  ADMIN_STORAGE_KEY,
  migrateAdminData,
  sanitizeForStorage,
  seedAdminData,
} from "@/data/admin/seed";
import {
  isLastOwner,
  uniqueCopyName,
  uniqueCourseSlug,
  uniquePathSlug,
  uniquePostSlug,
  uniqueRoleCopyName,
} from "@/data/admin/selectors";
import { todayISO } from "@/lib/format";
import type {
  AdminBlogPost,
  AdminCourse,
  AdminData,
  AdminTestimonial,
  AdminTrainer,
  AdminUser,
  CorporateRequest,
  CourseSession,
  CurriculumDay,
  FooterSettings,
  GeneralSettings,
  HomepageContent,
  LegalPage,
  MediaItem,
  PaymentProviderSettings,
  RequestNote,
  RequestStatus,
  Role,
  SeoSettings,
  ContactSettings,
  AdminLearningPath,
  SessionStatus,
} from "@/data/admin/types";

/* ─────────────────────────── الأنواع الداخلية ─────────────────────────── */

export type CourseInput = Omit<AdminCourse, "id" | "createdAt" | "updatedAt">;
export type TrainerInput = Omit<AdminTrainer, "id">;
export type PathInput = Omit<AdminLearningPath, "id">;
export type PostInput = Omit<AdminBlogPost, "id">;
export type TestimonialInput = Omit<AdminTestimonial, "id">;
/** createdAt يُختم في المخزن لحظة الإنشاء */
export type UserInput = Omit<AdminUser, "id" | "createdAt">;
export type RoleInput = Omit<Role, "id">;

interface AdminStateValue {
  data: AdminData;
  /** true بعد أول تحميل من localStorage في المتصفح */
  hydrated: boolean;
  /**
   * معاينة الصلاحيات (Development Role Preview — Checkpoint 6):
   * معرف دور مؤقت في الذاكرة فقط — لا يُخزن ولا يُقيد الوصول فعليًا،
   * ويُعرض معه تنبيه صريح «معاينة صلاحيات فقط — ليست حماية أمنية».
   */
  previewRoleId: string | null;
}

interface AdminActionsValue {
  /* الدورات */
  addCourse: (input: CourseInput) => string;
  updateCourse: (id: string, patch: Partial<AdminCourse>) => void;
  deleteCourse: (id: string) => void;
  duplicateCourse: (id: string) => string | undefined;
  /* المنهج والمواعيد (مُعرَّضة كمساعدات مبنية فوق updateCourse) */
  updateCurriculum: (courseId: string, curriculum: CurriculumDay[]) => void;
  updateSessions: (courseId: string, sessions: CourseSession[]) => void;
  updateSessionStatus: (courseId: string, sessionId: string, status: SessionStatus) => void;
  /* المدربون */
  addTrainer: (input: TrainerInput) => string;
  updateTrainer: (id: string, patch: Partial<AdminTrainer>) => void;
  deleteTrainer: (id: string) => void;
  duplicateTrainer: (id: string) => string | undefined;
  /* المسارات */
  addPath: (input: PathInput) => string;
  updatePath: (id: string, patch: Partial<AdminLearningPath>) => void;
  deletePath: (id: string) => void;
  duplicatePath: (id: string) => string | undefined;
  /* المدونة */
  addPost: (input: PostInput) => string;
  updatePost: (id: string, patch: Partial<AdminBlogPost>) => void;
  deletePost: (id: string) => void;
  duplicatePost: (id: string) => string | undefined;
  /* التقييمات */
  addTestimonial: (input: TestimonialInput) => string;
  updateTestimonial: (id: string, patch: Partial<AdminTestimonial>) => void;
  deleteTestimonial: (id: string) => void;
  duplicateTestimonial: (id: string) => string | undefined;
  /* طلبات الشركات */
  /** تغيير الحالة يضيف حدث Timeline تلقائيًا (Mock — actor «المالك») */
  updateRequestStatus: (id: string, status: RequestStatus) => void;
  /** تحديث شامل للطلب (Archive / استعادة) — لا يلمس الحالة ولا الـ Timeline */
  updateRequest: (id: string, patch: Partial<CorporateRequest>) => void;
  addRequestNote: (id: string, note: Omit<RequestNote, "id" | "createdAt">) => void;
  deleteRequestNote: (requestId: string, noteId: string) => void;
  deleteRequest: (id: string) => void;
  /* الوسائط */
  addMediaItems: (items: Array<Omit<MediaItem, "id">>) => string[];
  updateMedia: (id: string, patch: Partial<MediaItem>) => void;
  deleteMedia: (id: string) => void;
  /* الصفحة الرئيسية — تحديث شامل واحد: محرر الـ CMS يعمل على مسودة محلية
     ويستدعي هذا الإجراء عند الحفظ (نمط المسودة/اللقطة الموحد مع المحررات) */
  updateHomepage: (content: HomepageContent) => void;
  /* الإعدادات */
  updateGeneral: (patch: Partial<GeneralSettings>) => void;
  updateContact: (patch: Partial<ContactSettings>) => void;
  updateFooter: (patch: Partial<FooterSettings>) => void;
  updateSeo: (patch: Partial<SeoSettings>) => void;
  updatePaymentProvider: (id: string, patch: Partial<PaymentProviderSettings>) => void;
  updateLegal: (id: string, patch: Partial<LegalPage>) => void;
  /* المستخدمون — حماية المالك مطبقة داخل الإجراءات (دفاع أخير فوق حواجز الواجهة) */
  addUser: (input: UserInput) => string;
  updateUser: (id: string, patch: Partial<Omit<AdminUser, "id">>) => void;
  deleteUser: (id: string) => void;
  setCurrentUser: (id: string) => void;
  /* الأدوار — دور المالك النظامي مقفول: لا تعديل ولا حذف */
  addRole: (input: RoleInput) => string;
  updateRole: (id: string, patch: Partial<Omit<Role, "id">>) => void;
  deleteRole: (id: string) => void;
  duplicateRole: (id: string) => string | undefined;
  /* معاينة الصلاحيات */
  setPreviewRole: (roleId: string | null) => void;
  /* عام */
  resetAll: () => void;
}

/* ─────────────────────────── السياقات ─────────────────────────── */

const StateContext = createContext<AdminStateValue | null>(null);
const ActionsContext = createContext<AdminActionsValue | null>(null);

/** مولد معرفات فريد كافٍ للـ Mock (يعمل في المتصفح فقط) */
function makeId(prefix: string): string {
  const random = Math.random().toString(36).slice(2, 8);
  return `${prefix}-${Date.now().toString(36)}-${random}`;
}

/* ─────────────────────────── المزوّد ─────────────────────────── */

export function AdminStoreProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<AdminData>(seedAdminData);
  const [hydrated, setHydrated] = useState(false);
  /* معاينة الصلاحيات: ذاكرة جلسة فقط — تُصفر تلقائيًا مع تحديث الصفحة */
  const [previewRoleId, setPreviewRoleId] = useState<string | null>(null);

  /* الترطيب: تحميل المخزون المحلي بعد أول رسم (بدون hydration mismatch).
     نؤجل setState إلى مؤقّت بدل الاستدعاء المتزامن داخل الـ effect
     (متطلب react-hooks/set-state-in-effect) — عمليًا يحدث في الإطار التالي.
     نسخة أقدم من المخطط (مثل v3) تُمرر عبر migrateAdminData (D-23) —
     وإذا فشل الترحيل نبقى على الـ Seed. */
  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(() => {
      try {
        const raw = window.localStorage.getItem(ADMIN_STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as AdminData;
          if (parsed && Array.isArray(parsed.courses) && Array.isArray(parsed.trainers) && !cancelled) {
            if (parsed.version === ADMIN_CMS_VERSION) {
              setData(parsed);
            } else {
              const migrated = migrateAdminData(parsed);
              if (migrated) setData(migrated);
            }
          }
        }
      } catch {
        /* تعذر القراءة — نبقى على الـ Seed */
      }
      if (!cancelled) setHydrated(true);
    }, 0);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, []);

  /* الحفظ: بعد الترطيب فقط، وبعد تعقيم Object URLs */
  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(ADMIN_STORAGE_KEY, JSON.stringify(sanitizeForStorage(data)));
    } catch {
      /* قد تتجاوز البيانات حصة التخزين — نتجاهل بهدوء (Mock) */
    }
  }, [data, hydrated]);

  const actions = useMemo<AdminActionsValue>(() => {
    return {
      /* ── الدورات ── */
      addCourse: (input) => {
        const id = makeId("course");
        const stamp = new Date().toISOString();
        setData((prev) => ({
          ...prev,
          courses: [{ ...input, id, createdAt: stamp, updatedAt: stamp }, ...prev.courses],
        }));
        return id;
      },
      updateCourse: (id, patch) =>
        setData((prev) => ({
          ...prev,
          courses: prev.courses.map((course) =>
            course.id === id
              ? { ...course, ...patch, updatedAt: new Date().toISOString() }
              : course,
          ),
        })),
      deleteCourse: (id) =>
        setData((prev) => ({
          ...prev,
          courses: prev.courses.filter((course) => course.id !== id),
        })),
      duplicateCourse: (id) => {
        const source = data.courses.find((course) => course.id === id);
        if (!source) return undefined;
        const newId = makeId("course");
        const stamp = new Date().toISOString();
        const copy: AdminCourse = {
          ...source,
          id: newId,
          /* اسم وslug فريدان دائمًا حتى مع تكرار النسخ (selectors نقية) */
          name: uniqueCopyName(source.name, data.courses),
          slug: uniqueCourseSlug(`${source.slug}-copy`, data.courses),
          status: "draft",
          featured: false,
          /* قرار موثق: المواعيد (sessions) لا تُنسخ — فهي التزامات زمنية
             مرتبطة بالدفعة الأصلية وتواريخها؛ النسخة تبدأ بلا مواعيد
             ويثبّت المالك مواعيدها الجديدة بنفسه. بقية المحتوى
             (المنهج/المخرجات/التسعير) يُنسخ كما هو. */
          sessions: [],
          createdAt: stamp,
          updatedAt: stamp,
        };
        setData((prev) => ({ ...prev, courses: [copy, ...prev.courses] }));
        return newId;
      },
      updateCurriculum: (courseId, curriculum) =>
        setData((prev) => ({
          ...prev,
          courses: prev.courses.map((course) =>
            course.id === courseId
              ? { ...course, curriculum, updatedAt: new Date().toISOString() }
              : course,
          ),
        })),
      updateSessions: (courseId, sessions) =>
        setData((prev) => ({
          ...prev,
          courses: prev.courses.map((course) =>
            course.id === courseId
              ? { ...course, sessions, updatedAt: new Date().toISOString() }
              : course,
          ),
        })),
      updateSessionStatus: (courseId, sessionId, status) =>
        setData((prev) => ({
          ...prev,
          courses: prev.courses.map((course) =>
            course.id === courseId
              ? {
                  ...course,
                  updatedAt: new Date().toISOString(),
                  sessions: course.sessions.map((session) =>
                    session.id === sessionId ? { ...session, status } : session,
                  ),
                }
              : course,
          ),
        })),

      /* ── المدربون ── */
      addTrainer: (input) => {
        const id = makeId("trainer");
        setData((prev) => ({ ...prev, trainers: [{ ...input, id }, ...prev.trainers] }));
        return id;
      },
      updateTrainer: (id, patch) =>
        setData((prev) => ({
          ...prev,
          trainers: prev.trainers.map((trainer) =>
            trainer.id === id ? { ...trainer, ...patch } : trainer,
          ),
        })),
      deleteTrainer: (id) =>
        /* تنظيف الارتباط بالدورات عند حذف مدرب غير مرتبط فعليًا —
           الحماية الأساسية (منع الحذف مع دورات مرتبطة) في طبقة الواجهة */
        setData((prev) => ({
          ...prev,
          trainers: prev.trainers.filter((trainer) => trainer.id !== id),
          courses: prev.courses.map((course) =>
            course.trainerId === id ? { ...course, trainerId: undefined } : course,
          ),
        })),
      duplicateTrainer: (id) => {
        const source = data.trainers.find((trainer) => trainer.id === id);
        if (!source) return undefined;
        const newId = makeId("trainer");
        const copy: AdminTrainer = {
          ...source,
          id: newId,
          name: uniqueCopyName(source.name, data.trainers),
          /* النسخة تبدأ مخفية — قرار آمن: لا تظهر في قوائم الاختيار
             الجديدة حتى يفعّلها المالك عمدًا (يوازي draft في الدورات) */
          status: "hidden",
        };
        setData((prev) => ({ ...prev, trainers: [copy, ...prev.trainers] }));
        return newId;
      },

      /* ── المسارات ── */
      addPath: (input) => {
        const id = makeId("path");
        setData((prev) => ({ ...prev, paths: [{ ...input, id }, ...prev.paths] }));
        return id;
      },
      updatePath: (id, patch) =>
        setData((prev) => ({
          ...prev,
          paths: prev.paths.map((path) => (path.id === id ? { ...path, ...patch } : path)),
        })),
      deletePath: (id) =>
        setData((prev) => ({ ...prev, paths: prev.paths.filter((path) => path.id !== id) })),
      duplicatePath: (id) => {
        const source = data.paths.find((path) => path.id === id);
        if (!source) return undefined;
        const newId = makeId("path");
        const copy: AdminLearningPath = {
          ...source,
          id: newId,
          name: uniqueCopyName(source.name, data.paths),
          slug: uniquePathSlug(`${source.slug}-copy`, data.paths),
          /* النسخة مسودة غير مميزة — وتحتفظ بمراجع الدورات نفسها
             (مراجع بالمعرّف فقط — لا نسخ لبيانات الدورات) */
          status: "draft",
          featured: false,
        };
        setData((prev) => ({ ...prev, paths: [copy, ...prev.paths] }));
        return newId;
      },

      /* ── المدونة ── */
      addPost: (input) => {
        const id = makeId("post");
        setData((prev) => ({ ...prev, posts: [{ ...input, id }, ...prev.posts] }));
        return id;
      },
      updatePost: (id, patch) =>
        setData((prev) => ({
          ...prev,
          posts: prev.posts.map((post) => (post.id === id ? { ...post, ...patch } : post)),
        })),
      deletePost: (id) =>
        setData((prev) => ({ ...prev, posts: prev.posts.filter((post) => post.id !== id) })),
      duplicatePost: (id) => {
        const source = data.posts.find((post) => post.id === id);
        if (!source) return undefined;
        const newId = makeId("post");
        const copy: AdminBlogPost = {
          ...source,
          id: newId,
          /* المقالات بعنوان (title) لا اسم (name) — نكيّف الشكل للـ Selector */
          title: uniqueCopyName(
            source.title,
            data.posts.map((entry) => ({ id: entry.id, name: entry.title })),
          ),
          slug: uniquePostSlug(`${source.slug}-copy`, data.posts),
          /* النسخة مسودة دائمًا — والكتل تُنسخ بمعرفات جديدة (لا مشاركة
             معرفات الكتل بين مقالين — إعادة توليد آمنة) */
          status: "draft",
          contentBlocks: source.contentBlocks.map((block, index) => ({
            ...block,
            id: `${newId}-b${index + 1}`,
          })),
        };
        setData((prev) => ({ ...prev, posts: [copy, ...prev.posts] }));
        return newId;
      },

      /* ── التقييمات ── */
      addTestimonial: (input) => {
        const id = makeId("testimonial");
        setData((prev) => ({
          ...prev,
          testimonials: [{ ...input, id }, ...prev.testimonials],
        }));
        return id;
      },
      updateTestimonial: (id, patch) =>
        setData((prev) => ({
          ...prev,
          testimonials: prev.testimonials.map((testimonial) =>
            testimonial.id === id ? { ...testimonial, ...patch } : testimonial,
          ),
        })),
      deleteTestimonial: (id) =>
        setData((prev) => ({
          ...prev,
          testimonials: prev.testimonials.filter((testimonial) => testimonial.id !== id),
        })),
      duplicateTestimonial: (id) => {
        const source = data.testimonials.find((testimonial) => testimonial.id === id);
        if (!source) return undefined;
        const newId = makeId("testimonial");
        const copy: AdminTestimonial = {
          ...source,
          id: newId,
          name: uniqueCopyName(source.name, data.testimonials),
          /* النسخة غير مميزة وغير ظاهرة — تُعدّل ثم تُظهر (يوازي draft) */
          featured: false,
          visible: false,
        };
        setData((prev) => ({ ...prev, testimonials: [copy, ...prev.testimonials] }));
        return newId;
      },

      /* ── طلبات الشركات ── */
      updateRequestStatus: (id, status) =>
        setData((prev) => ({
          ...prev,
          requests: prev.requests.map((request) =>
            request.id === id && request.status !== status
              ? {
                  ...request,
                  status,
                  timeline: [
                    ...request.timeline,
                    {
                      id: makeId("tl"),
                      previousStatus: request.status,
                      newStatus: status,
                      timestamp: new Date().toISOString(),
                      actor: "المالك",
                    },
                  ],
                }
              : request,
          ),
        })),
      updateRequest: (id, patch) =>
        setData((prev) => ({
          ...prev,
          requests: prev.requests.map((request) =>
            request.id === id ? { ...request, ...patch } : request,
          ),
        })),
      addRequestNote: (id, note) =>
        setData((prev) => ({
          ...prev,
          requests: prev.requests.map((request) =>
            request.id === id
              ? {
                  ...request,
                  internalNotes: [
                    ...request.internalNotes,
                    { ...note, id: makeId("note"), createdAt: new Date().toISOString() },
                  ],
                }
              : request,
          ),
        })),
      deleteRequestNote: (requestId, noteId) =>
        setData((prev) => ({
          ...prev,
          requests: prev.requests.map((request) =>
            request.id === requestId
              ? {
                  ...request,
                  internalNotes: request.internalNotes.filter((note) => note.id !== noteId),
                }
              : request,
          ),
        })),
      deleteRequest: (id) =>
        setData((prev) => ({
          ...prev,
          requests: prev.requests.filter((request) => request.id !== id),
        })),

      /* ── الوسائط ── */
      addMediaItems: (items) => {
        const ids = items.map(() => makeId("media"));
        setData((prev) => ({
          ...prev,
          media: [...items.map((item, index) => ({ ...item, id: ids[index] })), ...prev.media],
        }));
        return ids;
      },
      updateMedia: (id, patch) =>
        setData((prev) => ({
          ...prev,
          media: prev.media.map((item) => (item.id === id ? { ...item, ...patch } : item)),
        })),
      deleteMedia: (id) =>
        setData((prev) => ({ ...prev, media: prev.media.filter((item) => item.id !== id) })),

      /* ── الصفحة الرئيسية — تحديث شامل واحد من مسودة المحرر ── */
      updateHomepage: (content) =>
        setData((prev) => ({ ...prev, homepage: content })),

      /* ── الإعدادات ── */
      updateGeneral: (patch) =>
        setData((prev) => ({ ...prev, general: { ...prev.general, ...patch } })),
      updateContact: (patch) =>
        setData((prev) => ({ ...prev, contact: { ...prev.contact, ...patch } })),
      updateFooter: (patch) =>
        setData((prev) => ({ ...prev, footer: { ...prev.footer, ...patch } })),
      updateSeo: (patch) =>
        setData((prev) => ({ ...prev, seo: { ...prev.seo, ...patch } })),
      updatePaymentProvider: (id, patch) =>
        setData((prev) => ({
          ...prev,
          payments: prev.payments.map((provider) =>
            provider.id === id ? { ...provider, ...patch } : provider,
          ),
        })),
      updateLegal: (id, patch) =>
        setData((prev) => ({
          ...prev,
          legal: prev.legal.map((page) => (page.id === id ? { ...page, ...patch } : page)),
        })),

      /* ── المستخدمون (Checkpoint 6) — حماية آخر مالك دفاعًا أخيرًا ── */
      addUser: (input) => {
        const id = makeId("user");
        setData((prev) => ({
          ...prev,
          users: [{ ...input, id, createdAt: todayISO() }, ...prev.users],
        }));
        return id;
      },
      updateUser: (id, patch) =>
        setData((prev) => {
          const target = prev.users.find((user) => user.id === id);
          if (!target) return prev;
          const guarded = { ...patch };
          /* آخر مالك: يُمنع تعليقه أو نقله لدور آخر — يبقى Owner واحد على الأقل */
          if (isLastOwner(prev, target)) {
            if (guarded.roleId !== undefined && guarded.roleId !== "owner") {
              delete guarded.roleId;
            }
            if (guarded.status === "suspended") {
              guarded.status = target.status === "suspended" ? "active" : target.status;
            }
          }
          return {
            ...prev,
            users: prev.users.map((user) =>
              user.id === id ? { ...user, ...guarded } : user,
            ),
          };
        }),
      deleteUser: (id) =>
        setData((prev) => {
          const target = prev.users.find((user) => user.id === id);
          if (!target || isLastOwner(prev, target)) return prev;
          return {
            ...prev,
            /* إن كان المحذوف هو المستخدم الحالي (Mock) يعود المؤشر للمالك */
            currentUserId:
              prev.currentUserId === id
                ? (prev.users.find((user) => user.roleId === "owner" && user.id !== id)?.id ??
                  prev.users.filter((user) => user.id !== id)[0]?.id ??
                  prev.currentUserId)
                : prev.currentUserId,
            users: prev.users.filter((user) => user.id !== id),
          };
        }),
      setCurrentUser: (id) =>
        setData((prev) => ({ ...prev, currentUserId: id })),

      /* ── الأدوار (Checkpoint 6) ── */
      addRole: (input) => {
        const id = makeId("role");
        setData((prev) => ({ ...prev, roles: [...prev.roles, { ...input, id }] }));
        return id;
      },
      updateRole: (id, patch) =>
        setData((prev) => {
          const target = prev.roles.find((role) => role.id === id);
          /* دور المالك النظامي مقفول: لا تعديل لاسمه أو وصفه أو مصفوفته */
          if (!target || (target.id === "owner" && target.kind === "system")) return prev;
          return {
            ...prev,
            roles: prev.roles.map((role) =>
              role.id === id ? { ...role, ...patch } : role,
            ),
          };
        }),
      deleteRole: (id) =>
        setData((prev) => {
          const target = prev.roles.find((role) => role.id === id);
          /* الحماية الأخيرة: الأدوار النظامية لا تُحذف، والمسندون يمنعون الحذف */
          if (
            !target ||
            target.kind === "system" ||
            prev.users.some((user) => user.roleId === id)
          ) {
            return prev;
          }
          return { ...prev, roles: prev.roles.filter((role) => role.id !== id) };
        }),
      duplicateRole: (id) => {
        const source = data.roles.find((role) => role.id === id);
        if (!source) return undefined;
        const newId = makeId("role");
        const copy: Role = {
          ...source,
          id: newId,
          name: uniqueRoleCopyName(source.name, data.roles),
          /* النسخة مخصصة دائمًا وإن نُسخ دور نظامي — قابلة للتعديل والحذف */
          kind: "custom",
        };
        setData((prev) => ({ ...prev, roles: [...prev.roles, copy] }));
        return newId;
      },

      /* ── معاينة الصلاحيات (UX Preview فقط — ليست حماية) ── */
      setPreviewRole: (roleId) => setPreviewRoleId(roleId),

      /* ── عام ── */
      resetAll: () => {
        try {
          window.localStorage.removeItem(ADMIN_STORAGE_KEY);
        } catch {
          /* تجاهل */
        }
        setData(seedAdminData);
      },
    };
  }, [data]);

  const stateValue = useMemo<AdminStateValue>(
    () => ({ data, hydrated, previewRoleId }),
    [data, hydrated, previewRoleId],
  );

  return (
    <StateContext.Provider value={stateValue}>
      <ActionsContext.Provider value={actions}>{children}</ActionsContext.Provider>
    </StateContext.Provider>
  );
}

/* ─────────────────────────── الـ Hooks ─────────────────────────── */

export function useAdminState(): AdminStateValue {
  const context = useContext(StateContext);
  if (!context) {
    throw new Error("useAdminState must be used within AdminStoreProvider");
  }
  return context;
}

export function useAdminActions(): AdminActionsValue {
  const context = useContext(ActionsContext);
  if (!context) {
    throw new Error("useAdminActions must be used within AdminStoreProvider");
  }
  return context;
}

/** اختصار شائع: البيانات فقط */
export function useAdminData(): AdminData {
  return useAdminState().data;
}
