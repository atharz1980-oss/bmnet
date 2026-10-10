import "server-only";

/**
 * الرصيد التدريبي — يُنشأ ويُستهلك عبر دالتين ذريتين في قاعدة البيانات فقط.
 *
 * المتصفح لا يصل إلى الجداول (RLS بلا سياسات)، والخادم نفسه لا يملك عليها إلا
 * القراءة: الإصدار عبر `cancel_workshop_order_to_credit` والاستخدام عبر
 * `redeem_training_credit`. كلاهما تحديث شرطي واحد مع قيد فريد يمنع التكرار.
 */

import { getServiceSupabase } from "@/lib/supabase/service";

export type CreditStatus = "active" | "used" | "void";

export interface TrainingCreditListItem {
  id: string;
  holderName: string;
  holderEmail: string;
  holderPhone: string;
  sourceId: string;
  originalAmount: number;
  balance: number;
  status: CreditStatus;
  /** نشط لكن انتهت صلاحيته — لا يُستخدم. */
  expired: boolean;
  issuedAt: string;
  expiresAt: string;
}

const CREDIT_ERRORS: Record<string, string> = {
  order_not_cancellable: "لا يمكن إلغاء هذا الطلب.",
  credit_unavailable: "الرصيد غير متاح: منتهٍ أو مستخدم أو غير كافٍ.",
  invalid_amount: "المبلغ غير صالح.",
  reference_required: "مرجع الاستخدام مطلوب.",
};

function creditError(error: { message?: string; code?: string } | null, fallback: string): string {
  const message = error?.message ?? "";
  for (const [code, text] of Object.entries(CREDIT_ERRORS)) if (message.includes(code)) return text;
  /* 23505: المرجع نفسه استُخدم من قبل على هذا الرصيد. */
  if (error?.code === "23505") return "هذا المرجع استُخدم من قبل على هذا الرصيد.";
  return fallback;
}

/**
 * إلغاء من المشترك: الطلب يُلغى وكامل المدفوع يصبح رصيدًا صالحًا سنة ميلادية.
 * تُغلق أولًا محاولات الدفع المفتوحة كي لا يُضاف مال بعد تحويل الرصيد.
 */
export async function cancelOrderToCredit(
  orderId: string,
  actor: string,
): Promise<{ ok: true; creditId: string | null } | { ok: false; error: string }> {
  const svc = getServiceSupabase();
  await svc
    .from("workshop_payments")
    .update({ status: "cancelled" })
    .eq("order_id", orderId)
    .in("status", ["created", "pending"]);
  const { data, error } = await svc.rpc("cancel_workshop_order_to_credit", { p_order_id: orderId, p_actor: actor });
  if (error) return { ok: false, error: creditError(error, "تعذر إلغاء الطلب.") };
  await svc.from("workshop_orders").update({ balance_token_hash: null }).eq("id", orderId);
  return { ok: true, creditId: (data as string | null) ?? null };
}

/**
 * يخصم من الرصيد مقابل دورة أخرى (يُسدَّد الفرق بالدفع المعتاد). المرجع
 * (مثل رقم طلب الدورة) لا يُخصم به مرتين.
 */
export async function redeemTrainingCredit(
  creditId: string,
  amountHalalas: number,
  reference: string,
  actor: string,
): Promise<{ ok: true; balance: number } | { ok: false; error: string }> {
  if (!Number.isInteger(amountHalalas) || amountHalalas <= 0) return { ok: false, error: CREDIT_ERRORS.invalid_amount };
  const ref = reference.trim().slice(0, 200);
  if (!ref) return { ok: false, error: CREDIT_ERRORS.reference_required };
  const { data, error } = await getServiceSupabase().rpc("redeem_training_credit", {
    p_credit_id: creditId,
    p_amount: amountHalalas,
    p_reference: ref,
    p_actor: actor,
  });
  if (error) return { ok: false, error: creditError(error, "تعذر استخدام الرصيد.") };
  return { ok: true, balance: Number(data) };
}

export async function listTrainingCredits(limit = 1000): Promise<TrainingCreditListItem[]> {
  const { data, error } = await getServiceSupabase()
    .from("training_credits")
    .select("id, holder_name, holder_email, holder_phone, source_id, original_amount, balance, status, issued_at, expires_at")
    .order("issued_at", { ascending: false })
    .limit(limit);
  if (error) return [];
  const now = Date.now();
  return (data ?? []).map((row) => ({
    id: row.id,
    holderName: row.holder_name,
    holderEmail: row.holder_email,
    holderPhone: row.holder_phone,
    sourceId: row.source_id,
    originalAmount: row.original_amount,
    balance: row.balance,
    status: row.status as CreditStatus,
    expired: row.status === "active" && new Date(row.expires_at).getTime() <= now,
    issuedAt: row.issued_at,
    expiresAt: row.expires_at,
  }));
}
