import "server-only";

/**
 * قراءة السلة وكتابتها — كلها على الخادم بعميل الخدمة.
 *
 * الملكية: سلة الضيف تُعرَّف ببصمة الرمز في الكوكي، وسلة المسجّل بمعرّف
 * حسابه (ويُثبَّت المعرّف على السلة عند أول كتابة). لا يُقبل معرّف سلة من
 * المتصفح: كل دالة تستقبل العنصر وتتحقق أن أباه هو السلة المحمّلة.
 */

import { randomBytes } from "node:crypto";

import { getCommunityContext } from "@/lib/community/member";
import { normalizeEmail, normalizeName, normalizeSaudiMobile, type GuestContact } from "@/lib/landing/guest-validation";
import { isSpaceCustomerType, type SpaceCustomerType } from "@/lib/spaces/customer-types";
import { normalizeDbTime, toMinutes } from "@/lib/spaces/schedule";
import { getServiceSupabase } from "@/lib/supabase/service";
import { getCurrentUser } from "@/lib/supabase/server";

import { priceCourseSelection, priceSpaceSelection, type PricedCartItem } from "./catalog";
import { ensureCartToken, hashCartToken, readCartToken, writeCartToken } from "./token";
import type {
  CartContact,
  CartItemKind,
  CartItemView,
  CartOrderSummary,
  CartView,
} from "./types";

interface CartRow {
  id: string;
  user_id: string | null;
  customer_type: string | null;
  customer_name: string | null;
  company_name: string | null;
  email: string | null;
  phone: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

interface CartItemRow {
  id: string;
  cart_id: string;
  kind: string;
  course_id: string | null;
  session_id: string | null;
  space_id: string | null;
  booking_date: string | null;
  start_time: string | null;
  end_time: string | null;
  title_snapshot: string;
  subtitle_snapshot: string;
  href_snapshot: string;
  unit_gross_halalas: number;
  created_at: string;
}

interface OrderRow {
  id: string;
  status: string;
  item_count: number;
  total_amount: number;
  checkout_expires_at: string | null;
  provider_checkout_url: string | null;
  created_at: string;
}

const CART_COLUMNS =
  "id, user_id, customer_type, customer_name, company_name, email, phone, notes, created_at, updated_at";
const ITEM_COLUMNS =
  "id, cart_id, kind, course_id, session_id, space_id, booking_date, start_time, end_time, title_snapshot, subtitle_snapshot, href_snapshot, unit_gross_halalas, created_at";
const ORDER_SUMMARY_COLUMNS =
  "id, status, item_count, total_amount, checkout_expires_at, provider_checkout_url, created_at";

export const EMPTY_CONTACT: CartContact = {
  customerType: null,
  customerName: "",
  companyName: "",
  email: "",
  phone: "",
  notes: "",
};

export function normalizeCartContact(input: {
  customerType?: unknown;
  customerName?: unknown;
  companyName?: unknown;
  email?: unknown;
  phone?: unknown;
  notes?: unknown;
}): CartContact {
  const rawType = typeof input.customerType === "string" ? input.customerType.trim() : "";
  const rawNotes = typeof input.notes === "string" ? input.notes.trim() : "";
  const rawName = typeof input.customerName === "string" ? input.customerName : "";
  const rawEmail = typeof input.email === "string" ? input.email : "";
  const rawPhone = typeof input.phone === "string" ? input.phone : "";
  return {
    customerType: isSpaceCustomerType(rawType) ? rawType : null,
    customerName: normalizeName(rawName) ?? "",
    companyName:
      typeof input.companyName === "string" && input.companyName.trim() !== ""
        ? input.companyName.replace(/\s+/g, " ").trim().slice(0, 120)
        : "",
    email: normalizeEmail(rawEmail) ?? "",
    phone: normalizeSaudiMobile(rawPhone) ?? "",
    notes: rawNotes === "" ? "" : rawNotes.slice(0, 2000),
  };
}

/** يتحقق من اكتمال بيانات التواصل للدفع (اسم/بريد/جوال). */
export function cartContactErrors(contact: CartContact): string | null {
  if (contact.customerName.length < 2) return "أدخل الاسم الكامل.";
  if (!contact.email) return "أدخل بريدًا إلكترونيًا صحيحًا.";
  if (!contact.phone) return "أدخل رقم جوال سعودي صحيح مثل 05XXXXXXXX.";
  if (
    (contact.customerType === "company" || contact.customerType === "advertiser") &&
    contact.companyName.length < 2
  ) {
    return "أدخل اسم الشركة أو الجهة.";
  }
  return null;
}

function contactFromRow(row: CartRow): CartContact {
  return {
    customerType: isSpaceCustomerType(row.customer_type ?? "") ? (row.customer_type as SpaceCustomerType) : null,
    customerName: row.customer_name ?? "",
    companyName: row.company_name ?? "",
    email: row.email ?? "",
    phone: row.phone ?? "",
    notes: row.notes ?? "",
  };
}

function itemView(row: CartItemRow): CartItemView {
  return {
    id: row.id,
    kind: row.kind as CartItemKind,
    courseId: row.course_id,
    sessionId: row.session_id,
    spaceId: row.space_id,
    bookingDate: row.booking_date,
    startTime: row.start_time ? normalizeDbTime(row.start_time) : null,
    endTime: row.end_time ? normalizeDbTime(row.end_time) : null,
    title: row.title_snapshot,
    subtitle: row.subtitle_snapshot,
    href: row.href_snapshot,
    unitGrossHalalas: row.unit_gross_halalas,
    createdAt: row.created_at,
  };
}

function orderSummary(row: OrderRow): CartOrderSummary {
  const expires = row.checkout_expires_at ? new Date(row.checkout_expires_at).getTime() : null;
  const open = ["created", "pending", "authorized"].includes(row.status);
  return {
    id: row.id,
    status: row.status,
    itemCount: row.item_count,
    totalAmount: row.total_amount,
    createdAt: row.created_at,
    expiresAt: row.checkout_expires_at,
    checkoutUrl: row.provider_checkout_url,
    expired: row.status === "expired" || (open && expires !== null && expires < Date.now()),
  };
}

async function findByTokenHash(hash: string): Promise<CartRow | null> {
  const { data } = await getServiceSupabase()
    .from("shopping_carts")
    .select(CART_COLUMNS)
    .eq("token_hash", hash)
    .maybeSingle();
  return (data as CartRow | null) ?? null;
}

async function findLatestForUser(userId: string): Promise<CartRow | null> {
  const { data } = await getServiceSupabase()
    .from("shopping_carts")
    .select(CART_COLUMNS)
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data as CartRow | null) ?? null;
}

async function loadItems(cartId: string): Promise<CartItemView[]> {
  const { data } = await getServiceSupabase()
    .from("shopping_cart_items")
    .select(ITEM_COLUMNS)
    .eq("cart_id", cartId)
    .order("created_at", { ascending: true });
  return ((data ?? []) as CartItemRow[]).map(itemView);
}

async function loadPendingOrders(cartId: string): Promise<CartOrderSummary[]> {
  const { data } = await getServiceSupabase()
    .from("shopping_orders")
    .select(ORDER_SUMMARY_COLUMNS)
    .eq("cart_id", cartId)
    .in("status", ["created", "pending", "authorized", "expired"])
    .order("created_at", { ascending: false })
    .limit(5);
  return ((data ?? []) as OrderRow[]).map(orderSummary);
}

function view(
  cart: CartRow | null,
  items: CartItemView[],
  orders: CartOrderSummary[],
  contact: CartContact,
  userId: string | null,
): CartView {
  return {
    cartId: cart?.id ?? null,
    items,
    contact,
    pendingOrders: orders,
    subtotalHalalas: items.reduce((sum, item) => sum + item.unitGrossHalalas, 0),
    requiresAccount: !userId && items.some((item) => item.kind === "course"),
  };
}

/**
 * السلة كما يراها الزائر الآن. لا تنشئ سلة ولا تكتب شيئًا: صفحة فارغة
 * ليست سببًا لإنشاء صف في القاعدة.
 */
export async function loadCartForViewer(): Promise<CartView> {
  const ctx = await getCommunityContext();
  const userId = ctx?.user.id ?? null;
  const token = await readCartToken();

  let cart = token ? await findByTokenHash(hashCartToken(token)) : null;
  /* سلة مستخدم آخر (أو سلة مسجّل بعد خروجه) لا تُعرض لزائر آخر على
     الجهاز نفسه. بيانات التواصل والاختيارات تخصّ صاحبها. */
  if (cart && cart.user_id !== null && cart.user_id !== userId) cart = null;
  if (!cart && userId) cart = await findLatestForUser(userId);

  const accountContact: CartContact = {
    ...EMPTY_CONTACT,
    customerName: ctx?.member?.displayName ?? "",
    email: ctx?.user.email ?? "",
  };
  if (!cart) return view(null, [], [], accountContact, userId);

  const [items, orders] = await Promise.all([loadItems(cart.id), loadPendingOrders(cart.id)]);
  const contact = contactFromRow(cart);

  return view(
    cart,
    items,
    orders,
    {
      ...contact,
      customerName: contact.customerName || accountContact.customerName,
      email: contact.email || accountContact.email,
    },
    userId,
  );
}

/**
 * عدد عناصر السلة فقط — لشارة الهيدر.
 *
 * كانت الشارة تستدعي `loadCartForViewer()` كاملًا: عناصر السلة
 * وطلباتها المعلّقة وبيانات التواصل — أي أربعة استعلامات مع ملف
 * العضو، في **كل صفحة** من صفحات الموقع. الشارة تحتاج عددًا فقط،
 * فصار استعلامان: صف السلة ثم عدّ عناصرها.
 */
export async function loadCartCountForViewer(): Promise<number> {
  try {
    const userId = (await getCurrentUser())?.id ?? null;
    const token = await readCartToken();

    let cart = token ? await findByTokenHash(hashCartToken(token)) : null;
    /* سلة مستخدم آخر على الجهاز نفسه لا تُحسب. */
    if (cart && cart.user_id !== null && cart.user_id !== userId) cart = null;
    if (!cart && userId) cart = await findLatestForUser(userId);
    if (!cart) return 0;

    const { count, error } = await getServiceSupabase()
      .from("shopping_cart_items")
      .select("id", { count: "exact", head: true })
      .eq("cart_id", cart.id);
    if (error) return 0;
    return count ?? 0;
  } catch {
    return 0;
  }
}

/** هل السلة المحمّلة تخصّ الزائر الحالي؟ (للطلبات وصفحة الحالة) */
export async function ownsCart(cartId: string, userId: string | null): Promise<boolean> {
  if (!cartId) return false;
  const { data } = await getServiceSupabase()
    .from("shopping_carts")
    .select("id, user_id")
    .eq("id", cartId)
    .maybeSingle();
  if (!data) return false;
  const owner = data as { id: string; user_id: string | null };

  /* سلة حساب لا تُفتح لزائر آخر ولا لزائر غير مسجّل. */
  if (owner.user_id !== null) return owner.user_id === userId;

  const token = await readCartToken();
  if (!token) return false;
  const cart = await findByTokenHash(hashCartToken(token));
  return cart?.id === cartId;
}

/**
 * ملكية طلب: صاحب الحساب أولًا، والطلب الضيفي يُفتح برمز السلة نفسه.
 * طلب مسجّل لا يُعرض لضيف على الجهاز نفسه بعد الخروج.
 */
export async function ownsOrder(
  order: { cart_id: string | null; user_id: string | null },
  userId: string | null,
): Promise<boolean> {
  if (order.user_id !== null) return order.user_id === userId;
  if (!order.cart_id) return false;
  return ownsCart(order.cart_id, userId);
}

/**
 * سلة للكتابة: الرمز القائم أولًا، ثم سلة الحساب، وإلا إنشاء.
 *
 * عند العثور على سلة حساب بلا رمز في هذا المتصفح نُدوّر الرمز ونثبّته:
 * السلة تتبع الحساب، والرمز القديم على جهاز آخر يبقى صالحًا لسلة أخرى
 * إن وُجدت (لا نلمسها). هذا مقايضة مقبولة لسلة بلا تسجيل دخول إجباري.
 *
 * وإذا كان الكوكي لسلة مستخدم آخر (جهاز مشترك/خروج ودخول) لا نستخدمها:
 * ندوّر الرمز أولًا ثم نأخذ سلة الحساب الحالي أو ننشئ واحدة.
 */
export async function getOrCreateCart(userId: string | null): Promise<CartRow> {
  const token = await ensureCartToken();
  let hash = hashCartToken(token);
  let cart = await findByTokenHash(hash);

  const accessible =
    cart !== null && (cart.user_id === null || (userId !== null && cart.user_id === userId));
  if (!accessible) cart = null;

  /* الرمز الحالي مقيّد بسلة غير متاحة: لا نكتب فيها ولا نعيد استخدامه. */
  if (!cart) {
    const fresh = randomBytes(32).toString("base64url");
    hash = hashCartToken(fresh);
    await writeCartToken(fresh);
  }

  if (!cart && userId) {
    cart = await findLatestForUser(userId);
    if (cart) {
      const { data, error } = await getServiceSupabase()
        .from("shopping_carts")
        .update({ token_hash: hash })
        .eq("id", cart.id)
        .select(CART_COLUMNS)
        .single();
      if (!error && data) return data as CartRow;
    }
  }

  if (!cart) {
    const { data, error } = await getServiceSupabase()
      .from("shopping_carts")
      .insert({ token_hash: hash, user_id: userId })
      .select(CART_COLUMNS)
      .single();
    if (!error && data) return data as CartRow;
    /* سباق إدراج نادر: الرمز نفسه صار موجودًا — نقرأه. */
    cart = await findByTokenHash(hash);
    if (cart) return cart;
    throw new Error("تعذر إنشاء سلة الشراء.");
  }

  if (userId && !cart.user_id) {
    const { data } = await getServiceSupabase()
      .from("shopping_carts")
      .update({ user_id: userId })
      .eq("id", cart.id)
      .select(CART_COLUMNS)
      .single();
    if (data) cart = data as CartRow;
  }

  return cart;
}

/** يحفظ بيانات التواصل الافتراضية على السلة (للتحقق لاحقًا عند الدفع). */
export async function saveCartContact(cartId: string, contact: CartContact): Promise<void> {
  await getServiceSupabase()
    .from("shopping_carts")
    .update({
      customer_type: contact.customerType,
      customer_name: contact.customerName || null,
      company_name: contact.companyName || null,
      email: contact.email || null,
      phone: contact.phone || null,
      notes: contact.notes || null,
    })
    .eq("id", cartId);
}

function pricedFields(item: PricedCartItem) {
  return item.kind === "course"
    ? {
        kind: "course" as const,
        course_id: item.course.id,
        session_id: item.session?.id ?? null,
        space_id: null,
        booking_date: null,
        start_time: null,
        end_time: null,
      }
    : {
        kind: "space" as const,
        course_id: null,
        session_id: null,
        space_id: item.space.id,
        booking_date: item.bookingDate,
        start_time: item.startTime,
        end_time: item.endTime,
      };
}

/**
 * يضيف دورة أو يحدّث موعدها إن كانت في السلة. الدورة الواحدة لا تتكرر:
 * الاختيار الجديد يستبدل القديم (وهذا هو «التعديل» الطبيعي).
 */
export async function addCourseToCart(
  courseId: string,
  sessionId: string | null,
  userId: string | null,
): Promise<{ ok: true; cartId: string } | { ok: false; error: string }> {
  const priced = await priceCourseSelection(courseId, sessionId, userId);
  if (!priced.ok) return priced;

  const cart = await getOrCreateCart(userId);
  const svc = getServiceSupabase();
  const { data: existing } = await svc
    .from("shopping_cart_items")
    .select("id")
    .eq("cart_id", cart.id)
    .eq("course_id", priced.item.course.id)
    .maybeSingle();

  const fields = {
    ...pricedFields(priced.item),
    title_snapshot: priced.item.title,
    subtitle_snapshot: priced.item.subtitle,
    href_snapshot: priced.item.href,
    unit_gross_halalas: priced.item.quote.gross,
  };

  const { error } = existing
    ? await svc.from("shopping_cart_items").update(fields).eq("id", existing.id)
    : await svc.from("shopping_cart_items").insert({ cart_id: cart.id, ...fields });
  if (error) return { ok: false, error: "تعذر إضافة الدورة إلى السلة. حاول مرة أخرى." };
  return { ok: true, cartId: cart.id };
}

/** يضيف موعد مساحة. الدفعة نفسها لا تتكرر (مساحة/يوم/من/إلى). */
export async function addSpaceToCart(
  spaceId: string,
  bookingDate: string,
  startTime: string,
  endTime: string,
  contact: CartContact,
  userId: string | null,
): Promise<{ ok: true; cartId: string } | { ok: false; error: string }> {
  const priced = await priceSpaceSelection(spaceId, bookingDate, startTime, endTime);
  if (!priced.ok) return priced;

  const cart = await getOrCreateCart(userId);
  const svc = getServiceSupabase();

  /* تعارض داخل السلة نفسها: لا معنى لموعدين متراكبين لنفس المساحة. */
  if (await spaceOverlap(cart.id, spaceId, bookingDate, startTime, endTime, null)) {
    return { ok: false, error: "لديك موعد متعارض مع هذا الوقت لنفس المساحة في سلتك. عدّل الموعد أو احذفه." };
  }

  const { data: existing } = await svc
    .from("shopping_cart_items")
    .select("id")
    .eq("cart_id", cart.id)
    .eq("space_id", spaceId)
    .eq("booking_date", bookingDate)
    .eq("start_time", startTime)
    .eq("end_time", endTime)
    .maybeSingle();

  const fields = {
    ...pricedFields(priced.item),
    title_snapshot: priced.item.title,
    subtitle_snapshot: priced.item.subtitle,
    href_snapshot: priced.item.href,
    unit_gross_halalas: priced.item.quote.gross,
  };

  const { error } = existing
    ? await svc.from("shopping_cart_items").update(fields).eq("id", existing.id)
    : await svc.from("shopping_cart_items").insert({ cart_id: cart.id, ...fields });
  if (error) return { ok: false, error: "تعذر إضافة الموعد إلى السلة. حاول مرة أخرى." };

  /* بيانات النموذج تُقترح في الدفع؛ لا تُستخدم لإتمام أي شيء بلا تأكيد. */
  await saveCartContact(cart.id, contact);
  return { ok: true, cartId: cart.id };
}

/** يعدّل عنصرًا في سلة يملكها المستخدم — لا يقبل معرّف سلة من الخارج. */
export async function updateCartItem(
  itemId: string,
  cartId: string,
  patch:
    | { kind: "course"; sessionId: string | null }
    | { kind: "space"; bookingDate: string; startTime: string; endTime: string },
  userId: string | null,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const svc = getServiceSupabase();
  const { data: row } = await svc
    .from("shopping_cart_items")
    .select(ITEM_COLUMNS)
    .eq("id", itemId)
    .eq("cart_id", cartId)
    .maybeSingle();
  if (!row) return { ok: false, error: "العنصر غير موجود في سلتك." };
  const item = row as CartItemRow;

  if (patch.kind !== item.kind) return { ok: false, error: "نوع العنصر غير متوقع." };

  const priced =
    patch.kind === "course"
      ? await priceCourseSelection(item.course_id ?? "", patch.sessionId, userId)
      : await priceSpaceSelection(item.space_id ?? "", patch.bookingDate, patch.startTime, patch.endTime);
  if (!priced.ok) return priced;

  if (patch.kind === "space") {
    if (
      await spaceOverlap(
        cartId,
        item.space_id ?? "",
        patch.bookingDate,
        patch.startTime,
        patch.endTime,
        item.id,
      )
    ) {
      return { ok: false, error: "الموعد الجديد يتعارض مع موعد آخر لنفس المساحة في سلتك." };
    }
  }

  const { error } = await svc
    .from("shopping_cart_items")
    .update({
      ...pricedFields(priced.item),
      title_snapshot: priced.item.title,
      subtitle_snapshot: priced.item.subtitle,
      href_snapshot: priced.item.href,
      unit_gross_halalas: priced.item.quote.gross,
    })
    .eq("id", item.id)
    .eq("cart_id", cartId);
  if (error) {
    return { ok: false, error: "تعذر تعديل الموعد — قد يكون الموعد الجديد في السلة أو لم يعد متاحًا." };
  }
  return { ok: true };
}

export async function removeCartItem(itemId: string, cartId: string): Promise<boolean> {
  const { error } = await getServiceSupabase()
    .from("shopping_cart_items")
    .delete()
    .eq("id", itemId)
    .eq("cart_id", cartId);
  return !error;
}

/** بيانات تواصل جاهزة للحفظ من عنصر سلة مساحة. */
export function contactFromForm(form: FormData): CartContact {
  return normalizeCartContact({
    customerType: form.get("customerType"),
    customerName: form.get("name"),
    companyName: form.get("companyName"),
    email: form.get("email"),
    phone: form.get("phone"),
    notes: form.get("notes"),
  });
}

/** يتحقق أن بيانات الحجز التي جمعها نموذج المساحة صالحة قبل إضافتها. */
export function validatedContact(contact: CartContact): GuestContact | null {
  if (!contact.customerName || !contact.email || !contact.phone) return null;
  return { name: contact.customerName, email: contact.email, phone: contact.phone };
}

/**
 * هل للسلة طلب مفتوح صالح الآن؟ التعديل والحذف يُمنعان حتى لا يدفع الزائر
 * اختيارًا غيّرناه تحت الفاتورة؛ عليه إكمال الطلب أو إلغاؤه أولًا.
 * الطلب المنتهي لا يُحسب قيدًا (يُغلق كسولًا عند قراءته في `loadCartForViewer`).
 */
export async function hasLiveCartOrder(cartId: string): Promise<boolean> {
  const { data } = await getServiceSupabase()
    .from("shopping_orders")
    .select("id, status, checkout_expires_at")
    .eq("cart_id", cartId)
    .in("status", ["created", "pending", "authorized"]);
  return (data ?? []).some((row) => {
    const expires = row.checkout_expires_at ? new Date(row.checkout_expires_at).getTime() : null;
    return expires === null || expires > Date.now();
  });
}

/** معرّف مساحة منشورة بالاسم اللطيف — لمسار إضافة السلة من نموذج الحجز. */
export async function findPublishedSpaceId(slug: string): Promise<string | null> {
  const { data } = await getServiceSupabase()
    .from("studio_spaces")
    .select("id")
    .eq("slug", slug)
    .eq("publish_status", "published")
    .maybeSingle();
  return data?.id ?? null;
}

/**
 * تعارض المواعيد داخل السلة نفسها: موعدان لنفس المساحة في اليوم نفسه
 * يتقاطعان. نرفض الإضافة/التعديل بدل ترك تعارض يكتشفه الدفع متأخرًا.
 * `excludingItemId` للعنصر قيد التعديل حتى لا يتعارض مع نفسه.
 */
async function spaceOverlap(
  cartId: string,
  spaceId: string,
  bookingDate: string,
  startTime: string,
  endTime: string,
  excludingItemId: string | null,
): Promise<boolean> {
  const { data } = await getServiceSupabase()
    .from("shopping_cart_items")
    .select("id, start_time, end_time")
    .eq("cart_id", cartId)
    .eq("kind", "space")
    .eq("space_id", spaceId)
    .eq("booking_date", bookingDate);
  const start = toMinutes(startTime);
  const end = toMinutes(endTime);
  if (start === null || end === null) return false;
  return (data ?? []).some((row) => {
    if (excludingItemId && row.id === excludingItemId) return false;
    const otherStart = row.start_time ? toMinutes(normalizeDbTime(row.start_time)) : null;
    const otherEnd = row.end_time ? toMinutes(normalizeDbTime(row.end_time)) : null;
    if (otherStart === null || otherEnd === null) return false;
    return start < otherEnd && end > otherStart;
  });
}
