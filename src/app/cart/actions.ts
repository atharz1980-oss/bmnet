"use server";

/**
 * إجراءات السلة — إضافة، تعديل، حذف، دفع.
 *
 * ما يصل من المتصفح: معرّف عنصر واختيارات وبيانات تواصل. لا مبلغ ولا ملكية
 * سلة ولا حالة: الملكية تُقرأ من الكوكي/الجلسة، والسعر يُحسب من القاعدة عند
 * الدفع. الحجز المؤقت والفاتورة يقعان في `startCartCheckout` وحده.
 *
 * قاعدة التعديل: لا يُعدَّل ولا يُحذف عنصر أثناء طلب مفتوح صالح — الزائر
 * إما يكمل طلبه أو يلغيه. الفاتورة لقطة، وتغيير الاختيار تحتها غشّ صامت.
 */

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { checkRateLimit, requesterKey } from "@/lib/cms/rate-limit";
import { getCommunityViewerId } from "@/lib/community/member";
import { cancelCartOrder, ownsShoppingOrder, startCartCheckout } from "@/lib/cart/checkout";
import {
  addCourseToCart,
  addEquipmentToCart,
  addSpaceToCart,
  contactFromForm,
  getOrCreateCart,
  hasLiveCartOrder,
  removeCartItem,
  updateCartItem,
} from "@/lib/cart/store";
import type { CartContact } from "@/lib/cart/types";

const CART_LIMIT = 30;
const CART_WINDOW_MS = 10 * 60 * 1000;
const HONEYPOT_FIELD = "website";

export interface CartActionState {
  error: string | null;
  notice?: string | null;
}

async function limited(scope: string): Promise<string | null> {
  const limit = checkRateLimit(requesterKey(await headers(), scope), CART_LIMIT, CART_WINDOW_MS);
  if (limit.allowed) return null;
  const minutes = Math.max(1, Math.ceil(limit.retryAfterSeconds / 60));
  return `محاولات كثيرة خلال وقت قصير. انتظر ${minutes} دقيقة ثم أعد المحاولة.`;
}

/**
 * السلة التي يملكها الزائر الحالي للكتابة. تُنشئ إن لزم (وهذا موقع كتابة
 * مشروع: Server Action)، وتتحقق أن الكوكي لا تشير إلى سلة مستخدم آخر.
 */
async function ownedCart(userId: string | null): Promise<{ id: string } | null> {
  try {
    const cart = await getOrCreateCart(userId);
    return { id: cart.id };
  } catch {
    return null;
  }
}

/**
 * إضافة دورة إلى السلة من بطاقة التسجيل.
 * لا تُعيد شيئًا معروضًا: توجّه إلى `/cart` بعد النجاح.
 */
export async function addCourseToCartAction(
  _previous: CartActionState,
  form: FormData,
): Promise<CartActionState> {
  if (form.get(HONEYPOT_FIELD)) return { error: null };

  const blocked = await limited("cart-add");
  if (blocked) return { error: blocked };

  const courseId = String(form.get("courseId") ?? "");
  const rawSession = String(form.get("sessionId") ?? "");
  const sessionId = rawSession === "" ? null : rawSession;
  if (courseId === "") return { error: "معرّف الدورة غير صالح." };

  const userId = await getCommunityViewerId();
  const result = await addCourseToCart(courseId, sessionId, userId);
  if (!result.ok) return { error: result.error };
  redirect("/cart?notice=added");
}

/** إضافة موعد مساحة — من لوح الحجز (زر «أضف إلى السلة»). */
export async function addSpaceToCartAction(
  _previous: CartActionState,
  form: FormData,
): Promise<CartActionState> {
  if (form.get(HONEYPOT_FIELD)) return { error: null };

  const blocked = await limited("cart-add");
  if (blocked) return { error: blocked };

  const spaceId = String(form.get("spaceId") ?? "");
  const bookingDate = String(form.get("date") ?? "");
  const start = String(form.get("start") ?? "");
  const end = String(form.get("end") ?? "");
  if (spaceId === "") return { error: "المساحة غير معروفة." };

  const contact = contactFromForm(form);
  const userId = await getCommunityViewerId();
  const result = await addSpaceToCart(spaceId, bookingDate, start, end, contact, userId);
  if (!result.ok) return { error: result.error };
  redirect("/cart?notice=added");
}

/** إضافة معدة إلى السلة بعد التحقق من العقد والتوقيع. */
export async function addEquipmentToCartAction(
  _previous: CartActionState,
  form: FormData,
): Promise<CartActionState> {
  if (form.get(HONEYPOT_FIELD)) return { error: null };

  const blocked = await limited("cart-add");
  if (blocked) return { error: blocked };

  const equipmentId = String(form.get("equipmentId") ?? "");
  if (!equipmentId) return { error: "المعدة غير معروفة." };

  const startDate = String(form.get("startDate") ?? "");
  const endDate = String(form.get("endDate") ?? "");
  const quantity = Number(form.get("quantity") ?? 1);
  const method = String(form.get("method") ?? "pickup") as "pickup" | "delivery";
  const deliveryAddress = form.get("deliveryAddress") ? String(form.get("deliveryAddress")) : null;
  const nationalId = String(form.get("nationalId") ?? "");
  const nationalIdExpiry = String(form.get("nationalIdExpiry") ?? "");
  const agreementAccepted = ["on", "true", "1", "yes"].includes(String(form.get("agreementAccepted") ?? "").toLowerCase());
  const signatureName = String(form.get("signatureName") ?? "");
  const signatureDataUrl = String(form.get("signatureDataUrl") ?? "") || undefined;
  const customerName = String(form.get("customerName") ?? "") || null;

  const userId = await getCommunityViewerId();
  const result = await addEquipmentToCart(
    {
      equipmentId,
      startDate,
      endDate,
      quantity,
      method,
      deliveryAddress,
      nationalId,
      nationalIdExpiry,
      agreementAccepted,
      signatureName,
      signatureDataUrl,
      customerName,
    },
    userId,
  );
  if (!result.ok) return { error: result.error };
  redirect("/cart?notice=added");
}

/** تعديل موعد مساحة أو دفعة دورة في السلة. */
export async function updateCartItemAction(
  _previous: CartActionState,
  form: FormData,
): Promise<CartActionState> {
  if (form.get(HONEYPOT_FIELD)) return { error: null };

  const blocked = await limited("cart-update");
  if (blocked) return { error: blocked };

  const itemId = String(form.get("itemId") ?? "");
  const kind = String(form.get("kind") ?? "");
  const userId = await getCommunityViewerId();

  const cart = await ownedCart(userId);
  if (!cart) return { error: "تعذر قراءة سلتك. حاول مرة أخرى." };

  if (await hasLiveCartOrder(cart.id)) {
    return { error: "لديك طلب دفع معلق — أكمله أو ألغِه قبل تعديل العناصر." };
  }

  if (kind === "course") {
    const rawSession = String(form.get("sessionId") ?? "");
    const result = await updateCartItem(
      itemId,
      cart.id,
      { kind: "course", sessionId: rawSession === "" ? null : rawSession },
      userId,
    );
    if (!result.ok) return { error: result.error };
  } else if (kind === "space") {
    const result = await updateCartItem(
      itemId,
      cart.id,
      {
        kind: "space",
        bookingDate: String(form.get("date") ?? ""),
        startTime: String(form.get("start") ?? ""),
        endTime: String(form.get("end") ?? ""),
      },
      userId,
    );
    if (!result.ok) return { error: result.error };
  } else {
    return { error: "نوع العنصر غير معروف." };
  }

  redirect("/cart?notice=updated");
}

/** حذف عنصر من السلة. */
export async function removeCartItemAction(
  _previous: CartActionState,
  form: FormData,
): Promise<CartActionState> {
  if (form.get(HONEYPOT_FIELD)) return { error: null };

  const blocked = await limited("cart-remove");
  if (blocked) return { error: blocked };

  const itemId = String(form.get("itemId") ?? "");
  const userId = await getCommunityViewerId();
  const cart = await ownedCart(userId);
  if (!cart) return { error: "تعذر قراءة سلتك. حاول مرة أخرى." };

  if (await hasLiveCartOrder(cart.id)) {
    return { error: "لديك طلب دفع معلق — أكمله أو ألغِه قبل حذف العناصر." };
  }

  const removed = await removeCartItem(itemId, cart.id);
  if (!removed) return { error: "تعذر حذف العنصر. حاول مرة أخرى." };
  redirect("/cart?notice=removed");
}

/**
 * بدء الدفع.
 *
 * `intent`:
 *   - absent / "all"   → طلب واحد لكل السلة.
 *   - "item"           → طلب من عنصر واحد (`itemId`).
 * بيانات التواصل تُحفظ على السلة وتُمرَّر للطلب؛ الخادم يتحقق من اكتمالها.
 */
export async function startCartCheckoutAction(
  _previous: CartActionState,
  form: FormData,
): Promise<CartActionState> {
  if (form.get(HONEYPOT_FIELD)) return { error: null };

  const blocked = await limited("cart-checkout");
  if (blocked) return { error: blocked };

  const userId = await getCommunityViewerId();
  const cart = await ownedCart(userId);
  if (!cart) return { error: "تعذر قراءة سلتك. حاول مرة أخرى." };

  const intent = String(form.get("intent") ?? "all");
  const rawItem = String(form.get("itemId") ?? "");
  const itemId = intent === "item" ? rawItem : null;
  if (intent === "item" && itemId === "") {
    return { error: "العنصر المطلوب غير محدد." };
  }

  const contact: CartContact = contactFromForm(form);
  const result = await startCartCheckout({ cartId: cart.id, userId, itemId, contact });

  if (result.ok) redirect(result.checkoutUrl);

  if (result.code === "open_order") {
    /* طلب قائم: نعيده إلى صفحته ليُكمل أو يُلغي بدل خطأ مسدود. */
    if (result.orderId) redirect(`/order/${result.orderId}`);
    return { error: result.error };
  }
  if (result.code === "account_required") {
    return { error: result.error };
  }
  return { error: result.error };
}

/** إلغاء طلب معلق — يحرر حجوزاته ويُبقي عناصر السلة. */
export async function cancelCartOrderAction(
  _previous: CartActionState,
  form: FormData,
): Promise<CartActionState> {
  if (form.get(HONEYPOT_FIELD)) return { error: null };

  const blocked = await limited("cart-cancel");
  if (blocked) return { error: blocked };

  const orderId = String(form.get("orderId") ?? "");
  if (orderId === "") return { error: "الطلب غير محدد." };

  const userId = await getCommunityViewerId();
  if (!(await ownsShoppingOrder(orderId, userId))) {
    return { error: "هذا الطلب لا يخصّ سلتك." };
  }

  const result = await cancelCartOrder(orderId);
  if (!result.ok) return { error: result.error };
  redirect("/cart?notice=cancelled");
}
