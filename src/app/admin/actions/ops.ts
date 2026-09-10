"use server";

/**
 * بيت المصور — إجراءات التشغيل (CP-G)
 * ------------------------------------
 * طلبات الشركات (حالة/ملاحظات/أرشفة) + الإعدادات الأربع + المدفوعات
 * + الصفحات القانونية + المستخدمون (دعوة عبر Admin API) + الأدوار.
 */

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";

import { requirePermission, requireSession } from "@/lib/admin/session";
import {
  fail,
  ok,
  sanitizeSlug,
  isValidEmail,
  toArabicDbError,
  type ActionResult,
} from "@/lib/cms/result";
import { getServiceSupabase } from "@/lib/supabase/service";
import { toStoragePath } from "@/lib/cms/mappers";
import type { RolePermissions } from "@/data/admin/types";
import type { AdminSession } from "@/lib/admin/session";
import { canDelegatePermissions } from "@/lib/admin/role-access";
import { permissionsFromRows } from "@/lib/cms/mappers";
import { checkPublication } from "@/lib/admin/publishing";

async function mayAssignRole(svc: ReturnType<typeof getServiceSupabase>, session: AdminSession, roleId: string): Promise<boolean> {
  const { data: role, error } = await svc.from("roles").select("id,key").eq("id", roleId).maybeSingle();
  if (error || !role) return false;
  if (role.key === "owner" && session.role.key !== "owner") return false;
  const { data: rows, error: permissionError } = await svc.from("role_permissions").select("module,action").eq("role_id", roleId);
  return !permissionError && canDelegatePermissions(session.role.permissions, permissionsFromRows(rows ?? []));
}

function refreshed(): void {
  revalidatePath("/", "layout");
}

/* ═══════════════════ طلبات الشركات ═══════════════════ */

export async function updateRequestStatusAction(
  requestId: string,
  status: string,
  previousStatus?: string,
): Promise<ActionResult<null>> {
  const gate = await requirePermission("corporate-requests", "edit");
  if (!gate.ok) return gate;
  const VALID = ["new", "contacted", "preparing-offer", "offer-sent", "agreed", "closed"];
  if (!VALID.includes(status)) return fail("حالة الطلب غير معروفة.");
  try {
    const svc = getServiceSupabase();
    const { error } = await svc.from("corporate_requests").update({ status }).eq("id", requestId);
    if (error) return fail(toArabicDbError(error, "تحديث حالة الطلب"));
    /* حدث Timeline تلقائي عند كل تغيير حالة (سلوك Checkpoint 5) */
    const { error: timelineError } = await svc.from("corporate_request_timeline").insert({
      request_id: requestId,
      actor_id: gate.data.userId,
      event_type: "status-changed",
      from_status: previousStatus ?? null,
      to_status: status,
      description: "",
    });
    if (timelineError) return fail(toArabicDbError(timelineError, "تسجيل حدث الحالة"));
    refreshed();
    return ok(null);
  } catch (error) {
    return fail(toArabicDbError(error, "تحديث حالة الطلب"));
  }
}

export async function updateRequestAction(
  requestId: string,
  patch: { archivedAt?: string | null },
): Promise<ActionResult<null>> {
  const gate = await requirePermission("corporate-requests", "edit");
  if (!gate.ok) return gate;
  try {
    const svc = getServiceSupabase();
    const update: Record<string, string | null> = {};
    if (patch.archivedAt !== undefined) update.archived_at = patch.archivedAt;
    const { error } = await svc.from("corporate_requests").update(update).eq("id", requestId);
    if (error) return fail(toArabicDbError(error, "تحديث الطلب"));
    refreshed();
    return ok(null);
  } catch (error) {
    return fail(toArabicDbError(error, "تحديث الطلب"));
  }
}

export async function addRequestNoteAction(
  requestId: string,
  text: string,
): Promise<ActionResult<null>> {
  const gate = await requirePermission("corporate-requests", "edit");
  if (!gate.ok) return gate;
  if (!text.trim()) return fail("نص الملاحظة فارغ.");
  try {
    const svc = getServiceSupabase();
    const { error } = await svc.from("corporate_request_notes").insert({
      request_id: requestId,
      author_id: gate.data.userId,
      note: text.trim(),
    });
    if (error) return fail(toArabicDbError(error, "إضافة الملاحظة"));
    const { error: timelineError } = await svc.from("corporate_request_timeline").insert({
      request_id: requestId,
      actor_id: gate.data.userId,
      event_type: "note-added",
      to_status: null,
      description: "أُضيفت ملاحظة داخلية",
    });
    if (timelineError) return fail(toArabicDbError(timelineError, "تسجيل حدث الملاحظة"));
    refreshed();
    return ok(null);
  } catch (error) {
    return fail(toArabicDbError(error, "إضافة الملاحظة"));
  }
}

export async function deleteRequestNoteAction(noteId: string): Promise<ActionResult<null>> {
  const gate = await requirePermission("corporate-requests", "edit");
  if (!gate.ok) return gate;
  try {
    const svc = getServiceSupabase();
    const { error } = await svc.from("corporate_request_notes").delete().eq("id", noteId);
    if (error) return fail(toArabicDbError(error, "حذف الملاحظة"));
    refreshed();
    return ok(null);
  } catch (error) {
    return fail(toArabicDbError(error, "حذف الملاحظة"));
  }
}

export async function deleteRequestAction(requestId: string): Promise<ActionResult<null>> {
  const gate = await requirePermission("corporate-requests", "delete");
  if (!gate.ok) return gate;
  try {
    const svc = getServiceSupabase();
    const { error } = await svc.from("corporate_requests").delete().eq("id", requestId);
    if (error) return fail(toArabicDbError(error, "حذف الطلب"));
    refreshed();
    return ok(null);
  } catch (error) {
    return fail(toArabicDbError(error, "حذف الطلب"));
  }
}

/* ═══════════════════ الإعدادات ═══════════════════ */

export interface GeneralSettingsInput {
  siteNameAr: string;
  siteNameEn: string;
  logoDark: string;
  logoLight: string;
  favicon: string;
  defaultLanguage: string;
  currency: string;
  timezone: string;
  city: string;
  country: string;
}

export async function updateGeneralAction(input: GeneralSettingsInput): Promise<ActionResult<null>> {
  const gate = await requirePermission("settings", "edit");
  if (!gate.ok) return gate;
  try {
    const svc = getServiceSupabase();
    const { error } = await svc.from("site_settings").upsert({
      id: 1,
      site_name_ar: input.siteNameAr,
      site_name_en: input.siteNameEn,
      logo_dark_path: toStoragePath(input.logoDark),
      logo_light_path: toStoragePath(input.logoLight),
      favicon_path: toStoragePath(input.favicon),
      default_language: input.defaultLanguage,
      currency: input.currency,
      timezone: input.timezone,
      city: input.city,
      country: input.country,
    });
    if (error) return fail(toArabicDbError(error, "حفظ الإعدادات العامة"));
    refreshed();
    return ok(null);
  } catch (error) {
    return fail(toArabicDbError(error, "حفظ الإعدادات العامة"));
  }
}

export interface ContactSettingsInput {
  mainMobile: string;
  whatsappNumber: string;
  whatsappMessage: string;
  secondaryPhone?: string;
  email: string;
  instagram: string;
  tiktok: string;
  address: string;
  mapsUrl?: string;
  workingHours: string;
  channels: {
    mainMobile: boolean;
    whatsapp: boolean;
    secondaryPhone: boolean;
    email: boolean;
    instagram: boolean;
    tiktok: boolean;
    address: boolean;
    mapsUrl: boolean;
    workingHours: boolean;
  };
}

export async function updateContactAction(input: ContactSettingsInput): Promise<ActionResult<null>> {
  const gate = await requirePermission("settings", "edit");
  if (!gate.ok) return gate;
  try {
    const svc = getServiceSupabase();
    const { error } = await svc.from("contact_settings").upsert({
      id: 1,
      main_mobile: input.mainMobile,
      whatsapp_number: input.whatsappNumber,
      whatsapp_message: input.whatsappMessage,
      secondary_phone: input.secondaryPhone ?? null,
      email: input.email,
      instagram_url: input.instagram,
      tiktok_url: input.tiktok,
      address: input.address,
      maps_url: input.mapsUrl ?? null,
      working_hours: input.workingHours,
      channel_main_mobile: input.channels.mainMobile,
      channel_whatsapp: input.channels.whatsapp,
      channel_secondary_phone: input.channels.secondaryPhone,
      channel_email: input.channels.email,
      channel_instagram: input.channels.instagram,
      channel_tiktok: input.channels.tiktok,
      channel_address: input.channels.address,
      channel_maps: input.channels.mapsUrl,
      channel_working_hours: input.channels.workingHours,
    });
    if (error) return fail(toArabicDbError(error, "حفظ بيانات التواصل"));
    refreshed();
    return ok(null);
  } catch (error) {
    return fail(toArabicDbError(error, "حفظ بيانات التواصل"));
  }
}

export interface FooterLinkInput {
  id?: string;
  label: string;
  href: string;
  enabled?: boolean;
}

export interface FooterSettingsInput {
  aboutText: string;
  quickLinks: FooterLinkInput[];
  legalLinks: FooterLinkInput[];
  socialLinks: FooterLinkInput[];
  copyright: string;
}

export async function updateFooterAction(input: FooterSettingsInput): Promise<ActionResult<null>> {
  const gate = await requirePermission("settings", "edit");
  if (!gate.ok) return gate;
  try {
    const svc = getServiceSupabase();
    const { error } = await svc.from("footer_settings").upsert({
      id: 1,
      about_text: input.aboutText,
      copyright: input.copyright,
    });
    if (error) return fail(toArabicDbError(error, "حفظ إعدادات التذييل"));

    const { error: delLinks } = await svc.from("footer_links").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    if (delLinks) return fail(toArabicDbError(delLinks, "تحديث روابط التذييل"));

    const groups: Array<[string, FooterLinkInput[]]> = [
      ["quick", input.quickLinks],
      ["legal", input.legalLinks],
      ["social", input.socialLinks],
    ];
    const rows = groups.flatMap(([group, links]) =>
      links
        .filter((link) => link.label.trim() && link.href.trim())
        .map((link, index) => ({
          link_group: group,
          label: link.label.trim(),
          url: link.href.trim(),
          enabled: link.enabled !== false,
          sort_order: index + 1,
        })),
    );
    if (rows.length > 0) {
      const { error: linksError } = await svc.from("footer_links").insert(rows);
      if (linksError) return fail(toArabicDbError(linksError, "حفظ روابط التذييل"));
    }
    refreshed();
    return ok(null);
  } catch (error) {
    return fail(toArabicDbError(error, "حفظ إعدادات التذييل"));
  }
}

export interface SeoSettingsInput {
  siteTitle: string;
  defaultMetaDescription: string;
  ogImage: string;
  socialImage: string;
  indexSite: boolean;
  googleVerification?: string;
  bingVerification?: string;
}

export async function updateSeoAction(input: SeoSettingsInput): Promise<ActionResult<null>> {
  const gate = await requirePermission("settings", "edit");
  if (!gate.ok) return gate;
  try {
    const svc = getServiceSupabase();
    const { error } = await svc.from("seo_settings").upsert({
      id: 1,
      site_title: input.siteTitle,
      default_meta_description: input.defaultMetaDescription,
      og_image_path: toStoragePath(input.ogImage),
      social_image_path: toStoragePath(input.socialImage),
      index_site: input.indexSite,
      google_verification: input.googleVerification ?? null,
      bing_verification: input.bingVerification ?? null,
    });
    if (error) return fail(toArabicDbError(error, "حفظ إعدادات SEO"));
    refreshed();
    return ok(null);
  } catch (error) {
    return fail(toArabicDbError(error, "حفظ إعدادات SEO"));
  }
}

export async function updatePaymentProviderAction(
  provider: string,
  patch: { enabled: boolean; environment: string; displayName?: string },
): Promise<ActionResult<null>> {
  const gate = await requirePermission("payments", "manage");
  if (!gate.ok) return gate;
  if (!["moyasar", "tabby", "tamara"].includes(provider)) return fail("مزود الدفع غير معروف.");
  try {
    const svc = getServiceSupabase();
    const { error } = await svc.from("payment_settings").upsert(
      {
        provider,
        enabled: patch.enabled,
        environment: patch.environment === "production" ? "production" : "test",
        display_name: patch.displayName ?? null,
        sort_order: provider === "moyasar" ? 1 : provider === "tabby" ? 2 : 3,
      },
      { onConflict: "provider" },
    );
    if (error) return fail(toArabicDbError(error, "حفظ إعدادات الدفع"));
    refreshed();
    return ok(null);
  } catch (error) {
    return fail(toArabicDbError(error, "حفظ إعدادات الدفع"));
  }
}

/* ═══════════════════ الصفحات القانونية ═══════════════════ */

export interface LegalPageInput {
  slug: string;
  title: string;
  content: string;
  published: boolean;
}

export async function updateLegalAction(input: LegalPageInput): Promise<ActionResult<null>> {
  const gate = await requirePermission("legal", "edit");
  if (!gate.ok) return gate;
  const slug = sanitizeSlug(input.slug);
  if (!slug) return fail("معرف الصفحة القانونية غير صالح.");
  try {
    const svc = getServiceSupabase();
    const { data: existing } = await svc.from("legal_pages").select("id").eq("slug", slug).maybeSingle();
    const publishError = await checkPublication(svc, gate.data, "legal", input.published, existing?.id);
    if (publishError) return fail(publishError);
    const row = {
      slug,
      title: input.title.trim(),
      content: input.content,
      published: input.published,
      published_at: input.published ? new Date().toISOString() : null,
    };
    const { error } = existing
      ? await svc.from("legal_pages").update(row).eq("id", existing.id)
      : await svc.from("legal_pages").insert(row);
    if (error) return fail(toArabicDbError(error, "حفظ الصفحة القانونية"));
    refreshed();
    return ok(null);
  } catch (error) {
    return fail(toArabicDbError(error, "حفظ الصفحة القانونية"));
  }
}

/* ═══════════════════ المستخدمون ═══════════════════ */

export interface InviteUserInput {
  name: string;
  email: string;
  roleId: string;
}

export async function inviteUserAction(input: InviteUserInput): Promise<ActionResult<string>> {
  const gate = await requirePermission("users", "create");
  if (!gate.ok) return gate;
  if (!input.name.trim()) return fail("اسم المستخدم مطلوب.");
  if (!isValidEmail(input.email)) return fail("البريد الإلكتروني غير صالح.");
  try {
    const svc = getServiceSupabase();
    if (!await mayAssignRole(svc, gate.data, input.roleId)) return fail("لا يمكنك إسناد هذا الدور.");
    const origin = (await headers()).get("origin");
    if (!origin || !["http:", "https:"].includes(new URL(origin).protocol)) return fail("تعذر تحديد رابط الدعوة.");
    const { data: authData, error: authError } = await svc.auth.admin.inviteUserByEmail(
      input.email.trim().toLowerCase(),
      { redirectTo: new URL("/admin/login?invite=1", origin).toString() },
    );
    if (authError) {
      if (authError.message.includes("already registered")) {
        return fail("هذا البريد مسجّل مسبقًا.");
      }
      return fail(toArabicDbError(authError, "إنشاء المستخدم"));
    }
    const userId = authData.user?.id;
    if (!userId) return fail("تعذر إنشاء المستخدم.");
    const { error: profileError } = await svc.from("profiles").insert({
      id: userId,
      name: input.name.trim(),
      role_id: input.roleId,
      status: "invited",
    });
    if (profileError) {
      /* نظّف حساب المصادقة اليتيم إن فشل الملف الشخصي */
      await svc.auth.admin.deleteUser(userId);
      return fail(toArabicDbError(profileError, "إنشاء الملف الشخصي"));
    }
    refreshed();
    return ok(userId);
  } catch (error) {
    return fail(toArabicDbError(error, "إنشاء المستخدم"));
  }
}

export async function updateUserAction(
  id: string,
  patch: { name?: string; roleId?: string; status?: string; avatar?: string },
): Promise<ActionResult<null>> {
  const gate = await requirePermission("users", "edit");
  if (!gate.ok) return gate;
  try {
    const svc = getServiceSupabase();
    const { data: target, error: targetError } = await svc.from("profiles").select("role_id,status").eq("id", id).maybeSingle();
    if (targetError || !target) return fail("المستخدم غير موجود.");
    if (!await mayAssignRole(svc, gate.data, target.role_id)) return fail("لا يمكنك تعديل هذا المستخدم.");
    if (patch.roleId && !await mayAssignRole(svc, gate.data, patch.roleId)) return fail("لا يمكنك إسناد هذا الدور.");
    const { data: targetRole } = await svc.from("roles").select("key").eq("id", target.role_id).maybeSingle();
    if (targetRole?.key === "owner" && ((patch.roleId && patch.roleId !== target.role_id) || (patch.status && patch.status !== "active"))) {
      const { count, error } = await svc.from("profiles").select("id", { count: "exact", head: true })
        .eq("role_id", target.role_id).eq("status", "active");
      if (error || (target.status === "active" && (count ?? 0) <= 1)) return fail("لا يمكن تعطيل آخر مالك نشط أو تغيير دوره.");
    }
    const update: Record<string, string | null> = {};
    if (patch.name !== undefined) update.name = patch.name.trim();
    if (patch.roleId !== undefined) update.role_id = patch.roleId;
    if (patch.status !== undefined) update.status = patch.status;
    if (patch.avatar !== undefined) update.avatar_path = toStoragePath(patch.avatar);
    const { error } = await svc.from("profiles").update(update).eq("id", id);
    if (error) return fail(toArabicDbError(error, "تحديث المستخدم"));
    refreshed();
    return ok(null);
  } catch (error) {
    return fail(toArabicDbError(error, "تحديث المستخدم"));
  }
}

export async function deleteUserAction(id: string): Promise<ActionResult<null>> {
  const gate = await requirePermission("users", "delete");
  if (!gate.ok) return gate;
  if (gate.data.userId === id) return fail("لا يمكنك حذف حسابك الحالي.");
  try {
    const svc = getServiceSupabase();
    const { data: target } = await svc.from("profiles").select("role_id").eq("id", id).maybeSingle();
    if (!target || !await mayAssignRole(svc, gate.data, target.role_id)) return fail("لا يمكنك حذف هذا المستخدم.");
    /* آخر مالك نشط لا يُحذف (دفاع أخير فوق الواجهة) */
    const { data: roleInfo } = await svc
      .from("profiles")
      .select("role_id, roles(key)")
      .eq("id", id)
      .maybeSingle();
    const roleRaw = roleInfo?.roles as { key: string } | { key: string }[] | null;
    const roleKey = Array.isArray(roleRaw) ? roleRaw[0]?.key : roleRaw?.key;
    if (roleKey === "owner") {
      const { data: ownerRoleId } = await svc.from("roles").select("id").eq("key", "owner").maybeSingle();
      if (ownerRoleId) {
        const { count } = await svc
          .from("profiles")
          .select("id", { count: "exact", head: true })
          .eq("role_id", ownerRoleId.id);
        if ((count ?? 0) <= 1) return fail("لا يمكن حذف آخر مالك في النظام.");
      }
    }
    const { error: profileError } = await svc.from("profiles").delete().eq("id", id);
    if (profileError) return fail(toArabicDbError(profileError, "حذف الملف الشخصي"));
    const { error: authError } = await svc.auth.admin.deleteUser(id);
    if (authError) return fail(toArabicDbError(authError, "حذف حساب المصادقة"));
    refreshed();
    return ok(null);
  } catch (error) {
    return fail(toArabicDbError(error, "حذف المستخدم"));
  }
}

/* ═══════════════════ الأدوار ═══════════════════ */

export interface RoleInput {
  name: string;
  description: string;
  permissions: RolePermissions;
}

function permissionRowsFromMatrix(roleId: string, permissions: RolePermissions) {
  const rows: Array<{ role_id: string; module: string; action: string }> = [];
  for (const [module, actions] of Object.entries(permissions)) {
    for (const action of actions) {
      rows.push({ role_id: roleId, module, action });
    }
  }
  return rows;
}

async function uniqueRoleName(
  svc: ReturnType<typeof getServiceSupabase>,
  desired: string,
  ignoreId?: string,
): Promise<string> {
  let candidate = desired;
  let suffix = 2;
  for (;;) {
    let query = svc.from("roles").select("id").eq("name", candidate).limit(1);
    if (ignoreId) query = query.neq("id", ignoreId);
    const { data } = await query;
    if (!data || data.length === 0) return candidate;
    candidate = `${desired} ${suffix++}`;
  }
}

export async function createRoleAction(input: RoleInput): Promise<ActionResult<string>> {
  const gate = await requirePermission("roles", "create");
  if (!gate.ok) return gate;
  if (!canDelegatePermissions(gate.data.role.permissions, input.permissions)) return fail("لا يمكنك منح صلاحيات لا تملكها.");
  if (!input.name.trim()) return fail("اسم الدور مطلوب.");
  try {
    const svc = getServiceSupabase();
    const name = await uniqueRoleName(svc, input.name.trim());
    const { data, error } = await svc
      .from("roles")
      .insert({ name, description: input.description, kind: "custom" })
      .select("id")
      .single();
    if (error) return fail(toArabicDbError(error, "إنشاء الدور"));
    const rows = permissionRowsFromMatrix(data.id, input.permissions);
    if (rows.length > 0) {
      const { error: permError } = await svc.from("role_permissions").insert(rows);
      if (permError) return fail(toArabicDbError(permError, "حفظ صلاحيات الدور"));
    }
    refreshed();
    return ok(data.id);
  } catch (error) {
    return fail(toArabicDbError(error, "إنشاء الدور"));
  }
}

export async function updateRoleAction(id: string, input: RoleInput): Promise<ActionResult<string>> {
  const gate = await requirePermission("roles", "edit");
  if (!gate.ok) return gate;
  if (!canDelegatePermissions(gate.data.role.permissions, input.permissions)) return fail("لا يمكنك منح صلاحيات لا تملكها.");
  if (!input.name.trim()) return fail("اسم الدور مطلوب.");
  try {
    const svc = getServiceSupabase();
    const { data: role } = await svc.from("roles").select("kind, key").eq("id", id).maybeSingle();
    if (!role) return fail("الدور غير موجود.");
    if (role.kind === "system") return fail("الدور النظامي مقفول — لا يمكن تعديله.");
    const name = await uniqueRoleName(svc, input.name.trim(), id);
    const { error } = await svc
      .from("roles")
      .update({ name, description: input.description })
      .eq("id", id);
    if (error) return fail(toArabicDbError(error, "تحديث الدور"));
    // The existing integrity trigger forbids removing view while higher actions remain.
    const { error: higherError } = await svc.from("role_permissions").delete().eq("role_id", id).neq("action", "view");
    if (higherError) return fail(toArabicDbError(higherError, "تحديث صلاحيات الدور"));
    const { error: delPerms } = await svc.from("role_permissions").delete().eq("role_id", id);
    if (delPerms) return fail(toArabicDbError(delPerms, "تحديث صلاحيات الدور"));
    const rows = permissionRowsFromMatrix(id, input.permissions);
    if (rows.length > 0) {
      const { error: permError } = await svc.from("role_permissions").insert(rows);
      if (permError) return fail(toArabicDbError(permError, "حفظ صلاحيات الدور"));
    }
    void role.key;
    refreshed();
    return ok(id);
  } catch (error) {
    return fail(toArabicDbError(error, "تحديث الدور"));
  }
}

export async function deleteRoleAction(id: string): Promise<ActionResult<null>> {
  const gate = await requirePermission("roles", "delete");
  if (!gate.ok) return gate;
  try {
    const svc = getServiceSupabase();
    const { data: role } = await svc.from("roles").select("kind, name").eq("id", id).maybeSingle();
    if (!role) return fail("الدور غير موجود.");
    if (role.kind === "system") return fail("الدور النظامي مقفول — لا يمكن حذفه.");
    const { count } = await svc
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("role_id", id);
    if ((count ?? 0) > 0) {
      return fail(`لا يمكن حذف الدور: مرتبط بـ ${count} مستخدم. انقلهم إلى دور آخر أولًا.`);
    }
    const { error } = await svc.from("roles").delete().eq("id", id);
    if (error) return fail(toArabicDbError(error, "حذف الدور"));
    refreshed();
    return ok(null);
  } catch (error) {
    return fail(toArabicDbError(error, "حذف الدور"));
  }
}

export async function duplicateRoleAction(id: string): Promise<ActionResult<string>> {
  const gate = await requirePermission("roles", "create");
  if (!gate.ok) return gate;
  try {
    const svc = getServiceSupabase();
    if (!await mayAssignRole(svc, gate.data, id)) return fail("لا يمكنك نسخ صلاحيات لا تملكها.");
    const { data: source } = await svc.from("roles").select("*").eq("id", id).maybeSingle();
    if (!source) return fail("الدور الأصلي غير موجود.");
    const { data: permRows } = await svc.from("role_permissions").select("module, action").eq("role_id", id);
    const copyName = await uniqueRoleName(svc, `${source.name} (نسخة)`);
    const { data: created, error } = await svc
      .from("roles")
      .insert({
        name: copyName,
        description: source.description,
        kind: "custom",
      })
      .select("id")
      .single();
    if (error) return fail(toArabicDbError(error, "تكرار الدور"));
    const rows = (permRows ?? []).map((row) => ({ role_id: created.id, module: row.module, action: row.action }));
    if (rows.length > 0) {
      const { error: permError } = await svc.from("role_permissions").insert(rows);
      if (permError) return fail(toArabicDbError(permError, "نسخ صلاحيات الدور"));
    }
    refreshed();
    return ok(created.id);
  } catch (error) {
    return fail(toArabicDbError(error, "تكرار الدور"));
  }
}

/** تحقق جلسة مختصر للاستخدامات غير الإدارية (مثل عرض الملف الشخصي) */
export async function whoAmIAction(): Promise<ActionResult<{ userId: string; name: string; roleName: string }>> {
  const gate = await requireSession();
  if (!gate.ok) return gate;
  return ok({
    userId: gate.data.userId,
    name: gate.data.name,
    roleName: gate.data.role.name,
  });
}
