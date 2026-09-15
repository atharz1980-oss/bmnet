"use client";

/**
 * بيت المصور — مخزن حالة الـ CMS المتصل بقاعدة البيانات (CP-G)
 * --------------------------------------------------------------
 * المصدر الوحيد للبيانات: قاعدة بيانات Supabase عبر Server Actions
 * (قرار D-85 — لا localStorage إطلاقًا):
 *   - initialData: حمّلها الخادم في (dashboard)/layout.tsx (وضع صارم).
 *   - كل إجراء: async → Server Action → ActionResult برسائل عربية،
 *     وعند النجاح يُحدَّث الحالة المحلية من المدخلات/الاستجابة فورًا
 *     (وفي الإجراءات التي يبنيها الخادم: refreshData من القاعدة).
 *   - session: هوية المشرف من الجلسة (الملف الشخصي والدور للعرض).
 *   - previewRoleId: معاينة صلاحيات تطويرية في الذاكرة فقط.
 *
 * الأنواع: نفس واجهة الإجراءات السابقة لكنها async — الاستهلاك في
 * الصفحات محدَّث وفقًا لذلك (await + معالجة الخطأ العربي).
 */

import { createContext, useContext, useMemo, useState } from "react";

import type { AdminSession } from "@/lib/admin/session";
import {
  createCourseAction,
  deleteCourseAction,
  duplicateCourseAction,
  setCourseStatusAction,
  updateCourseAction,
  createTrainerAction,
  deleteTrainerAction,
  updateTrainerAction,
  createPathAction,
  deletePathAction,
  updatePathAction,
  createPostAction,
  deletePostAction,
  updatePostAction,
  createTestimonialAction,
  deleteTestimonialAction,
  updateTestimonialAction,
  updateMediaAction,
  deleteMediaAction,
  saveHomepageAction,
  type CourseInput,
} from "@/app/admin/actions/content";
import {
  addRequestNoteAction,
  deleteRequestAction,
  deleteRequestNoteAction,
  updateRequestAction,
  updateRequestStatusAction,
  updateGeneralAction,
  updateContactAction,
  updateSocialLinksAction,
  updateFooterAction,
  updateSeoAction,
  updatePaymentProviderAction,
  updateLegalAction,
  inviteUserAction,
  updateUserAction,
  deleteUserAction,
  createRoleAction,
  updateRoleAction,
  deleteRoleAction,
  duplicateRoleAction,
} from "@/app/admin/actions/ops";
import { refreshDataAction } from "@/app/admin/actions/refresh";
import {
  uniqueCopyName,
  uniqueCourseSlug,
  uniquePathSlug,
  uniquePostSlug,
} from "@/data/admin/selectors";
import { todayISO } from "@/lib/format";
import type { ActionResult } from "@/lib/cms/result";
import type {
  AdminBlogPost,
  AdminCourse,
  AdminData,
  AdminLearningPath,
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
  SocialLinkSetting,
  SessionStatus,
} from "@/data/admin/types";

/* ─────────────────────────── الأنواع الداخلية ─────────────────────────── */

export type TrainerInput = Omit<AdminTrainer, "id">;
export type PostInput = Omit<AdminBlogPost, "id">;
export type TestimonialInput = Omit<AdminTestimonial, "id">;
export type UserInput = Omit<AdminUser, "id" | "createdAt">;
export type RoleInput = Omit<Role, "id">;
export type PathInput = Omit<AdminLearningPath, "id">;
export { type CourseInput };

/** نتيجة إجراء يعيد معرفًا جديدًا */
type IdResult = ActionResult<string>;
/** نتيجة إجراء بلا بيانات */
type VoidResult = ActionResult<null>;
/** نتيجة أي إجراء تغيير — القوائم تفحص ok فقط */
type MutationResult = ActionResult<string | null>;

interface AdminStateValue {
  data: AdminData;
  /** التوافق مع الواجهة السابقة — صائمًا true: البيانات من الخادم */
  hydrated: boolean;
  previewRoleId: string | null;
  /** true أثناء أي إجراء كتابة جارٍ (لأزرار الحفظ) */
  saving: boolean;
  /** خطأ آخر تحديث للبيانات (إن وجد) */
  refreshError: string | null;
}

interface AdminActionsValue {
  /* الدورات */
  addCourse: (input: CourseInput) => Promise<MutationResult>;
  updateCourse: (id: string, patch: CourseInput) => Promise<MutationResult>;
  deleteCourse: (id: string) => Promise<MutationResult>;
  duplicateCourse: (id: string) => Promise<MutationResult>;
  setCourseStatus: (id: string, status: AdminCourse["status"]) => Promise<MutationResult>;
  updateCurriculum: (courseId: string, curriculum: CurriculumDay[]) => Promise<MutationResult>;
  updateSessions: (courseId: string, sessions: CourseSession[]) => Promise<MutationResult>;
  updateSessionStatus: (courseId: string, sessionId: string, status: SessionStatus) => Promise<MutationResult>;
  /* المدربون */
  addTrainer: (input: TrainerInput) => Promise<MutationResult>;
  updateTrainer: (id: string, patch: Partial<AdminTrainer>) => Promise<MutationResult>;
  deleteTrainer: (id: string) => Promise<MutationResult>;
  duplicateTrainer: (id: string) => Promise<MutationResult>;
  /* المسارات */
  addPath: (input: PathInput) => Promise<MutationResult>;
  updatePath: (id: string, patch: Partial<AdminLearningPath>) => Promise<MutationResult>;
  deletePath: (id: string) => Promise<MutationResult>;
  duplicatePath: (id: string) => Promise<MutationResult>;
  /* المدونة */
  addPost: (input: PostInput) => Promise<MutationResult>;
  updatePost: (id: string, patch: Partial<AdminBlogPost>) => Promise<MutationResult>;
  deletePost: (id: string) => Promise<MutationResult>;
  duplicatePost: (id: string) => Promise<MutationResult>;
  /* التقييمات */
  addTestimonial: (input: TestimonialInput) => Promise<MutationResult>;
  updateTestimonial: (id: string, patch: Partial<AdminTestimonial>) => Promise<MutationResult>;
  deleteTestimonial: (id: string) => Promise<MutationResult>;
  duplicateTestimonial: (id: string) => Promise<MutationResult>;
  /* طلبات الشركات */
  updateRequestStatus: (id: string, status: RequestStatus) => Promise<MutationResult>;
  updateRequest: (id: string, patch: Partial<CorporateRequest>) => Promise<MutationResult>;
  addRequestNote: (id: string, note: Omit<RequestNote, "id" | "createdAt">) => Promise<MutationResult>;
  deleteRequestNote: (requestId: string, noteId: string) => Promise<MutationResult>;
  deleteRequest: (id: string) => Promise<MutationResult>;
  /* الوسائط */
  uploadMedia: (file: File, folder: string, meta: { altText: string; caption?: string }) => Promise<MutationResult>;
  updateMedia: (id: string, patch: Partial<MediaItem>) => Promise<MutationResult>;
  deleteMedia: (id: string) => Promise<MutationResult>;
  /* الصفحة الرئيسية */
  updateHomepage: (content: HomepageContent) => Promise<MutationResult>;
  /* الإعدادات */
  updateGeneral: (patch: Partial<GeneralSettings>) => Promise<MutationResult>;
  updateContact: (patch: Partial<ContactSettings>) => Promise<MutationResult>;
  updateSocialLinks: (links: SocialLinkSetting[]) => Promise<MutationResult>;
  updateFooter: (patch: Partial<FooterSettings>) => Promise<MutationResult>;
  updateSeo: (patch: Partial<SeoSettings>) => Promise<MutationResult>;
  updatePaymentProvider: (id: string, patch: Partial<PaymentProviderSettings>) => Promise<MutationResult>;
  updateLegal: (id: string, patch: Partial<LegalPage>) => Promise<MutationResult>;
  /* المستخدمون */
  addUser: (input: UserInput) => Promise<MutationResult>;
  updateUser: (id: string, patch: Partial<Omit<AdminUser, "id">>) => Promise<MutationResult>;
  deleteUser: (id: string) => Promise<MutationResult>;
  setCurrentUser: (id: string) => void;
  /* الأدوار */
  addRole: (input: RoleInput) => Promise<MutationResult>;
  updateRole: (id: string, patch: Partial<Omit<Role, "id">>) => Promise<MutationResult>;
  deleteRole: (id: string) => Promise<MutationResult>;
  duplicateRole: (id: string) => Promise<MutationResult>;
  /* معاينة الصلاحيات */
  setPreviewRole: (roleId: string | null) => void;
  /* عام */
  refreshData: () => Promise<boolean>;
  resetAll: () => Promise<boolean>;
}

/* ─────────────────────────── السياقات ─────────────────────────── */

const StateContext = createContext<AdminStateValue | null>(null);
const ActionsContext = createContext<AdminActionsValue | null>(null);

/* ─────────────────────────── المزوّد ─────────────────────────── */

export function AdminStoreProvider({
  session,
  initialData,
  refreshError: initialRefreshError = null,
  children,
}: {
  session: Pick<AdminSession, "userId" | "name" | "roleId">;
  initialData: AdminData;
  refreshError?: string | null;
  children: React.ReactNode;
}) {
  const [data, setData] = useState<AdminData>(() => ({
    ...initialData,
    currentUserId: session.userId,
  }));
  const [saving, setSaving] = useState(false);
  const [refreshError, setRefreshError] = useState<string | null>(initialRefreshError);
  const [previewRoleId, setPreviewRoleId] = useState<string | null>(null);

  const actions = useMemo<AdminActionsValue>(() => {
    /** غلاف موحد: حالة saving + تمرير النتيجة */
    async function run<T>(fn: () => Promise<ActionResult<T>>): Promise<ActionResult<T>> {
      setSaving(true);
      try {
        return await fn();
      } finally {
        setSaving(false);
      }
    }

    async function refreshFromDb(): Promise<boolean> {
      const fresh = await refreshDataAction();
      if (fresh) {
        setData(fresh);
        setRefreshError(null);
        return true;
      }
      setRefreshError("تعذر تحديث البيانات من قاعدة البيانات.");
      return false;
    }

    return {
      /* ── الدورات ── */
      addCourse: (input) =>
        run(async () => {
          const result = await createCourseAction(input);
          /* سحب من القاعدة لا ترقيع بالمُدخَل: المحرر يولّد معرّفات مؤقتة
             للمواعيد وأيام المنهج (`session-…`)، والقاعدة تعطيها UUID عند
             الحفظ. الترقيع المحلي يُبقي المؤقت في المخزن، فتعرضه قوائم
             أخرى — واختيار موعد للصفحة الرئيسية كان يُرسله إلى عمود uuid
             فيفشل الحفظ. */
          if (result.ok) await refreshFromDb();
          return result;
        }),
      updateCourse: (id, patch) =>
        run(async () => {
          const result = await updateCourseAction(id, patch);
          /* انظر ملاحظة addCourse: معرّفات الأطفال تأتي من القاعدة. */
          if (result.ok) await refreshFromDb();
          return result;
        }),
      deleteCourse: (id) =>
        run(async () => {
          const result = await deleteCourseAction(id);
          if (result.ok) {
            setData((prev) => ({ ...prev, courses: prev.courses.filter((course) => course.id !== id) }));
          }
          return result;
        }),
      duplicateCourse: (id) =>
        run(async () => {
          const result = await duplicateCourseAction(id);
          if (result.ok) await refreshFromDb();
          return result;
        }),
      setCourseStatus: (id, status) =>
        run(async () => {
          const result = await setCourseStatusAction(id, status);
          if (result.ok) {
            setData((prev) => ({
              ...prev,
              courses: prev.courses.map((course) =>
                course.id === id ? { ...course, status, updatedAt: new Date().toISOString() } : course,
              ),
            }));
          }
          return result;
        }),
      updateCurriculum: (courseId, curriculum) =>
        run(async () => {
          const course = data.courses.find((entry) => entry.id === courseId);
          if (!course) return { ok: false, error: "الدورة غير موجودة في المخزن." };
          const result = await updateCourseAction(courseId, { ...course, curriculum });
          if (result.ok) await refreshFromDb();
          return result;
        }),
      updateSessions: (courseId, sessions) =>
        run(async () => {
          const course = data.courses.find((entry) => entry.id === courseId);
          if (!course) return { ok: false, error: "الدورة غير موجودة في المخزن." };
          const result = await updateCourseAction(courseId, { ...course, sessions });
          if (result.ok) await refreshFromDb();
          return result;
        }),
      updateSessionStatus: (courseId, sessionId, status) =>
        run(async () => {
          const course = data.courses.find((entry) => entry.id === courseId);
          if (!course) return { ok: false, error: "الدورة غير موجودة في المخزن." };
          const sessions = course.sessions.map((session) =>
            session.id === sessionId ? { ...session, status } : session,
          );
          const result = await updateCourseAction(courseId, { ...course, sessions });
          if (result.ok) {
            setData((prev) => ({
              ...prev,
              courses: prev.courses.map((entry) =>
                entry.id === courseId ? { ...entry, sessions, updatedAt: new Date().toISOString() } : entry,
              ),
            }));
          }
          return result;
        }),

      /* ── المدربون ── */
      addTrainer: (input) =>
        run(async () => {
          const result = await createTrainerAction(input);
          if (result.ok) {
            setData((prev) => ({ ...prev, trainers: [{ ...input, id: result.data }, ...prev.trainers] }));
          }
          return result;
        }),
      updateTrainer: (id, patch) =>
        run(async () => {
          const current = data.trainers.find((entry) => entry.id === id);
          if (!current) return { ok: false, error: "المدرب غير موجود في المخزن." };
          const merged = { ...current, ...patch, id: current.id };
          const result = await updateTrainerAction(id, merged);
          if (result.ok) {
            setData((prev) => ({
              ...prev,
              trainers: prev.trainers.map((entry) => (entry.id === id ? merged : entry)),
            }));
          }
          return result;
        }),
      deleteTrainer: (id) =>
        run(async () => {
          const result = await deleteTrainerAction(id);
          if (result.ok) {
            setData((prev) => ({ ...prev, trainers: prev.trainers.filter((entry) => entry.id !== id) }));
          }
          return result;
        }),
      duplicateTrainer: (id) =>
        run(async () => {
          const source = data.trainers.find((entry) => entry.id === id);
          if (!source) return { ok: false, error: "المدرب غير موجود." };
          const { id: _sourceId, ...rest } = source;
          const result = await createTrainerAction({
            ...rest,
            name: uniqueCopyName(source.name, data.trainers),
          });
          if (result.ok) {
            const newId = result.data;
            setData((prev) => ({
              ...prev,
              trainers: [{ ...rest, id: newId, name: `${source.name} (نسخة)` }, ...prev.trainers],
            }));
          }
          return result;
        }),

      /* ── المسارات ── */
      addPath: (input) =>
        run(async () => {
          const result = await createPathAction(input);
          if (result.ok) {
            setData((prev) => ({ ...prev, paths: [{ ...input, id: result.data }, ...prev.paths] }));
          }
          return result;
        }),
      updatePath: (id, patch) =>
        run(async () => {
          const current = data.paths.find((entry) => entry.id === id);
          if (!current) return { ok: false, error: "المسار غير موجود في المخزن." };
          const merged = { ...current, ...patch, id: current.id };
          const result = await updatePathAction(id, merged);
          if (result.ok) {
            setData((prev) => ({
              ...prev,
              paths: prev.paths.map((entry) => (entry.id === id ? merged : entry)),
            }));
          }
          return result;
        }),
      deletePath: (id) =>
        run(async () => {
          const result = await deletePathAction(id);
          if (result.ok) {
            setData((prev) => ({ ...prev, paths: prev.paths.filter((entry) => entry.id !== id) }));
          }
          return result;
        }),
      duplicatePath: (id) =>
        run(async () => {
          const source = data.paths.find((entry) => entry.id === id);
          if (!source) return { ok: false, error: "المسار غير موجود." };
          const { id: _sourceId, ...rest } = source;
          const result = await createPathAction({
            ...rest,
            featured: false,
            status: "draft",
            name: uniqueCopyName(source.name, data.paths),
            slug: uniquePathSlug(`${source.slug}-copy`, data.paths),
          });
          if (result.ok) {
            await refreshFromDb();
          }
          return result;
        }),

      /* ── المدونة ── */
      addPost: (input) =>
        run(async () => {
          const result = await createPostAction(input);
          if (result.ok) {
            setData((prev) => ({ ...prev, posts: [{ ...input, id: result.data }, ...prev.posts] }));
          }
          return result;
        }),
      updatePost: (id, patch) =>
        run(async () => {
          const current = data.posts.find((entry) => entry.id === id);
          if (!current) return { ok: false, error: "المقال غير موجود في المخزن." };
          const merged = { ...current, ...patch, id: current.id, updatedAt: new Date().toISOString() };
          const result = await updatePostAction(id, merged);
          if (result.ok) {
            setData((prev) => ({
              ...prev,
              posts: prev.posts.map((entry) => (entry.id === id ? merged : entry)),
            }));
          }
          return result;
        }),
      deletePost: (id) =>
        run(async () => {
          const result = await deletePostAction(id);
          if (result.ok) {
            setData((prev) => ({ ...prev, posts: prev.posts.filter((entry) => entry.id !== id) }));
          }
          return result;
        }),
      duplicatePost: (id) =>
        run(async () => {
          const source = data.posts.find((entry) => entry.id === id);
          if (!source) return { ok: false, error: "المقال غير موجود." };
          const { id: _sourceId, ...rest } = source;
          const result = await createPostAction({
            ...rest,
            status: "draft",
            title: `${source.title} (نسخة)`,
            slug: uniquePostSlug(`${source.slug}-copy`, data.posts),
          });
          if (result.ok) {
            await refreshFromDb();
          }
          return result;
        }),

      /* ── التقييمات ── */
      addTestimonial: (input) =>
        run(async () => {
          const result = await createTestimonialAction(input);
          if (result.ok) {
            setData((prev) => ({ ...prev, testimonials: [{ ...input, id: result.data }, ...prev.testimonials] }));
          }
          return result;
        }),
      updateTestimonial: (id, patch) =>
        run(async () => {
          const current = data.testimonials.find((entry) => entry.id === id);
          if (!current) return { ok: false, error: "التقييم غير موجود في المخزن." };
          const merged = { ...current, ...patch, id: current.id };
          const result = await updateTestimonialAction(id, merged);
          if (result.ok) {
            setData((prev) => ({
              ...prev,
              testimonials: prev.testimonials.map((entry) => (entry.id === id ? merged : entry)),
            }));
          }
          return result;
        }),
      deleteTestimonial: (id) =>
        run(async () => {
          const result = await deleteTestimonialAction(id);
          if (result.ok) {
            setData((prev) => ({ ...prev, testimonials: prev.testimonials.filter((entry) => entry.id !== id) }));
          }
          return result;
        }),
      duplicateTestimonial: (id) =>
        run(async () => {
          const source = data.testimonials.find((entry) => entry.id === id);
          if (!source) return { ok: false, error: "التقييم غير موجود." };
          const { id: _sourceId, ...rest } = source;
          const result = await createTestimonialAction({
            ...rest,
            featured: false,
            name: uniqueCopyName(source.name, data.testimonials),
          });
          if (result.ok) {
            const newId = result.data;
            setData((prev) => ({
              ...prev,
              testimonials: [{ ...rest, id: newId, name: `${source.name} (نسخة)` }, ...prev.testimonials],
            }));
          }
          return result;
        }),

      /* ── طلبات الشركات ── */
      updateRequestStatus: (id, status) =>
        run(async () => {
          const current = data.requests.find((entry) => entry.id === id);
          const result = await updateRequestStatusAction(id, status, current?.status);
          if (result.ok) {
            setData((prev) => ({
              ...prev,
              requests: prev.requests.map((entry) =>
                entry.id === id
                  ? {
                      ...entry,
                      status,
                      timeline: [
                        ...entry.timeline,
                        {
                          id: `local-${Date.now()}`,
                          previousStatus: entry.status,
                          newStatus: status,
                          timestamp: new Date().toISOString(),
                          actor: "أنت",
                        },
                      ],
                    }
                  : entry,
              ),
            }));
          }
          return result;
        }),
      updateRequest: (id, patch) =>
        run(async () => {
          const result = await updateRequestAction(id, { archivedAt: patch.archivedAt ?? null });
          if (result.ok) {
            setData((prev) => ({
              ...prev,
              requests: prev.requests.map((entry) =>
                entry.id === id ? { ...entry, ...patch } : entry,
              ),
            }));
          }
          return result;
        }),
      addRequestNote: (id, note) =>
        run(async () => {
          const result = await addRequestNoteAction(id, note.text);
          if (result.ok) {
            setData((prev) => ({
              ...prev,
              requests: prev.requests.map((entry) =>
                entry.id === id
                  ? {
                      ...entry,
                      internalNotes: [
                        ...entry.internalNotes,
                        { ...note, id: `local-${Date.now()}`, createdAt: new Date().toISOString() },
                      ],
                    }
                  : entry,
              ),
            }));
          }
          return result;
        }),
      deleteRequestNote: (requestId, noteId) =>
        run(async () => {
          const result = await deleteRequestNoteAction(noteId);
          if (result.ok) {
            setData((prev) => ({
              ...prev,
              requests: prev.requests.map((entry) =>
                entry.id === requestId
                  ? { ...entry, internalNotes: entry.internalNotes.filter((note) => note.id !== noteId) }
                  : entry,
              ),
            }));
          }
          return result;
        }),
      deleteRequest: (id) =>
        run(async () => {
          const result = await deleteRequestAction(id);
          if (result.ok) {
            setData((prev) => ({ ...prev, requests: prev.requests.filter((entry) => entry.id !== id) }));
          }
          return result;
        }),

      /* ── الوسائط ── */
      uploadMedia: (file, folder, meta) =>
        run(async () => {
          const formData = new FormData();
          formData.append("file", file);
          formData.append("folder", folder);
          formData.append("altText", meta.altText);
          if (meta.caption) formData.append("caption", meta.caption);
          const { uploadMediaAction } = await import("@/app/admin/actions/content");
          const result = await uploadMediaAction(formData);
          if (result.ok) {
            await refreshFromDb();
            /* الرابط لا المعرّف: المحرر يضعه مباشرة في الحقل. */
            return { ok: true, data: result.data.url };
          }
          return result;
        }),
      updateMedia: (id, patch) =>
        run(async () => {
          const result = await updateMediaAction(id, {
            altText: patch.altText,
            caption: patch.caption,
          });
          if (result.ok) {
            setData((prev) => ({
              ...prev,
              media: prev.media.map((item) =>
                item.id === id ? { ...item, ...patch, updatedAt: new Date().toISOString() } : item,
              ),
            }));
          }
          return result;
        }),
      deleteMedia: (id) =>
        run(async () => {
          const result = await deleteMediaAction(id);
          if (result.ok) {
            setData((prev) => ({ ...prev, media: prev.media.filter((item) => item.id !== id) }));
          }
          return result;
        }),

      /* ── الصفحة الرئيسية ── */
      updateHomepage: (content) =>
        run(async () => {
          const result = await saveHomepageAction(content);
          if (result.ok) {
            setData((prev) => ({ ...prev, homepage: content }));
          }
          return result;
        }),

      /* ── الإعدادات ── */
      updateGeneral: (patch) =>
        run(async () => {
          const merged = { ...data.general, ...patch };
          const result = await updateGeneralAction(merged);
          if (result.ok) {
            setData((prev) => ({ ...prev, general: merged }));
          }
          return result;
        }),
      updateContact: (patch) =>
        run(async () => {
          const merged = { ...data.contact, ...patch };
          const result = await updateContactAction(merged);
          if (result.ok) {
            setData((prev) => ({ ...prev, contact: merged }));
          }
          return result;
        }),
      updateSocialLinks: (links) =>
        run(async () => {
          const result = await updateSocialLinksAction(links);
          if (result.ok) {
            setData((prev) => ({ ...prev, social: links }));
          }
          return result;
        }),
      updateFooter: (patch) =>
        run(async () => {
          const merged = { ...data.footer, ...patch };
          const result = await updateFooterAction(merged);
          if (result.ok) {
            setData((prev) => ({ ...prev, footer: merged }));
          }
          return result;
        }),
      updateSeo: (patch) =>
        run(async () => {
          const merged = { ...data.seo, ...patch };
          const result = await updateSeoAction(merged);
          if (result.ok) {
            setData((prev) => ({ ...prev, seo: merged }));
          }
          return result;
        }),
      updatePaymentProvider: (id, patch) =>
        run(async () => {
          const current = data.payments.find((entry) => entry.id === id);
          if (!current) return { ok: false, error: "مزود الدفع غير معروف." };
          const merged = { ...current, ...patch, id: current.id };
          const result = await updatePaymentProviderAction(id, merged);
          if (result.ok) {
            setData((prev) => ({
              ...prev,
              payments: prev.payments.map((entry) => (entry.id === id ? merged : entry)),
            }));
          }
          return result;
        }),
      updateLegal: (id, patch) =>
        run(async () => {
          const current = data.legal.find((entry) => entry.id === id);
          if (!current) return { ok: false, error: "الصفحة القانونية غير موجودة." };
          const merged = { ...current, ...patch, id: current.id, lastUpdated: todayISO() };
          const result = await updateLegalAction(merged);
          if (result.ok) {
            setData((prev) => ({
              ...prev,
              legal: prev.legal.map((entry) => (entry.id === id ? merged : entry)),
            }));
          }
          return result;
        }),

      /* ── المستخدمون ── */
      addUser: (input) =>
        run(async () => {
          const result = await inviteUserAction({ name: input.name, email: input.email, roleId: input.roleId });
          if (result.ok) {
            await refreshFromDb();
          }
          return result;
        }),
      updateUser: (id, patch) =>
        run(async () => {
          const result = await updateUserAction(id, patch);
          if (result.ok) {
            setData((prev) => ({
              ...prev,
              users: prev.users.map((entry) => (entry.id === id ? { ...entry, ...patch, id: entry.id } : entry)),
            }));
          }
          return result;
        }),
      deleteUser: (id) =>
        run(async () => {
          const result = await deleteUserAction(id);
          if (result.ok) {
            await refreshFromDb();
          }
          return result;
        }),
      setCurrentUser: (id) => {
        /* التوافق: تبديل المستخدم الحالي Mock — مع الجلسة الفعلية لا يغير شيئًا */
        setData((prev) => ({ ...prev, currentUserId: id }));
      },

      /* ── الأدوار ── */
      addRole: (input) =>
        run(async () => {
          const result = await createRoleAction(input);
          if (result.ok) {
            setData((prev) => ({ ...prev, roles: [...prev.roles, { ...input, id: result.data }] }));
          }
          return result;
        }),
      updateRole: (id, patch) =>
        run(async () => {
          const current = data.roles.find((entry) => entry.id === id);
          if (!current) return { ok: false, error: "الدور غير موجود في المخزن." };
          const merged = { ...current, ...patch, id: current.id };
          const result = await updateRoleAction(id, merged);
          if (result.ok) {
            setData((prev) => ({
              ...prev,
              roles: prev.roles.map((entry) => (entry.id === id ? merged : entry)),
            }));
          }
          return result;
        }),
      deleteRole: (id) =>
        run(async () => {
          const result = await deleteRoleAction(id);
          if (result.ok) {
            setData((prev) => ({ ...prev, roles: prev.roles.filter((entry) => entry.id !== id) }));
          }
          return result;
        }),
      duplicateRole: (id) =>
        run(async () => {
          const source = data.roles.find((entry) => entry.id === id);
          if (!source) return { ok: false, error: "الدور غير موجود." };
          const result = await duplicateRoleAction(id);
          if (result.ok) {
            await refreshFromDb();
          }
          return result;
        }),

      /* ── معاينة الصلاحيات ── */
      setPreviewRole: (roleId) => setPreviewRoleId(roleId),

      /* ── عام ── */
      refreshData: async () => refreshFromDb(),
      resetAll: async () => refreshFromDb(),
    };
  }, [data]);

  const state = useMemo<AdminStateValue>(
    () => ({ data, hydrated: true, previewRoleId, saving, refreshError }),
    [data, previewRoleId, saving, refreshError],
  );

  return (
    <StateContext.Provider value={state}>
      <ActionsContext.Provider value={actions}>{children}</ActionsContext.Provider>
    </StateContext.Provider>
  );
}

/* ─────────────────────────── الخطافات ─────────────────────────── */

export function useAdminState(): AdminStateValue {
  const value = useContext(StateContext);
  if (!value) throw new Error("useAdminState must be used within AdminStoreProvider");
  return value;
}

export function useAdminActions(): AdminActionsValue {
  const value = useContext(ActionsContext);
  if (!value) throw new Error("useAdminActions must be used within AdminStoreProvider");
  return value;
}

/** اختصار: بيانات المخزن فقط */
export function useAdminData(): AdminData {
  return useAdminState().data;
}
