"use server";

/**
 * إجراءات إدارة حجوزات الورش الحضورية والرصيد التدريبي.
 *
 * كلها تحت صلاحية `payments:manage` القائمة. لا استرداد تلقائي ولا إرسال
 * تلقائي: رابط السداد يُعاد للمشرف ليرسله يدويًا، والاسترداد يُنفَّذ في لوحة
 * ميسّر ثم يُسجَّل هنا.
 */

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requirePermission } from "@/lib/admin/session";
import { fail, ok, type ActionResult } from "@/lib/cms/result";
import { cancelOrderToCredit, redeemTrainingCredit } from "@/lib/workshops/credits";
import { cancelOrderByAcademy, createBalanceLink, markRefundCompleted } from "@/lib/workshops/orders";

const PATH = "/admin/workshop-orders";
const uuid = z.string().uuid("معرّف غير صالح.");

export interface BalanceLinkView {
  url: string;
  /** رابط واتساب جاهز بالرسالة — يفتحه المشرف ويرسل بنفسه. */
  whatsappHref: string;
  remainingSar: number;
}

export async function createBalanceLinkAction(orderId: unknown): Promise<ActionResult<BalanceLinkView>> {
  const gate = await requirePermission("payments", "manage");
  if (!gate.ok) return gate;
  const id = uuid.safeParse(orderId);
  if (!id.success) return fail("معرّف الطلب غير صالح.");
  const result = await createBalanceLink(id.data);
  if (!result.ok) return fail(result.error);
  const remainingSar = result.remaining / 100;
  const message = `السلام عليكم، هذا رابط سداد المبلغ المتبقي (${remainingSar} ريال) لـ${result.title}:\n${result.url}`;
  revalidatePath(PATH);
  return ok({
    url: result.url,
    whatsappHref: `https://wa.me/${result.phone}?text=${encodeURIComponent(message)}`,
    remainingSar,
  });
}

export async function cancelByAcademyAction(orderId: unknown): Promise<ActionResult<null>> {
  const gate = await requirePermission("payments", "manage");
  if (!gate.ok) return gate;
  const id = uuid.safeParse(orderId);
  if (!id.success) return fail("معرّف الطلب غير صالح.");
  const result = await cancelOrderByAcademy(id.data, gate.data.userId);
  if (!result.ok) return fail(result.error);
  revalidatePath(PATH);
  return ok(null);
}

export async function markRefundedAction(orderId: unknown): Promise<ActionResult<null>> {
  const gate = await requirePermission("payments", "manage");
  if (!gate.ok) return gate;
  const id = uuid.safeParse(orderId);
  if (!id.success) return fail("معرّف الطلب غير صالح.");
  const result = await markRefundCompleted(id.data);
  if (!result.ok) return fail(result.error);
  revalidatePath(PATH);
  return ok(null);
}

export async function cancelToCreditAction(orderId: unknown): Promise<ActionResult<{ creditId: string | null }>> {
  const gate = await requirePermission("payments", "manage");
  if (!gate.ok) return gate;
  const id = uuid.safeParse(orderId);
  if (!id.success) return fail("معرّف الطلب غير صالح.");
  const result = await cancelOrderToCredit(id.data, gate.data.userId);
  if (!result.ok) return fail(result.error);
  revalidatePath(PATH);
  return ok({ creditId: result.creditId });
}

const redeemSchema = z.object({
  creditId: uuid,
  amountSar: z.coerce.number().positive("المبلغ غير صالح.").max(100_000),
  reference: z.string().trim().min(3, "اكتب مرجع الاستخدام (مثل رقم طلب الدورة).").max(200),
});

export async function redeemCreditAction(input: unknown): Promise<ActionResult<{ balanceSar: number }>> {
  const gate = await requirePermission("payments", "manage");
  if (!gate.ok) return gate;
  const parsed = redeemSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "بيانات غير صالحة.");
  const halalas = Math.round(parsed.data.amountSar * 100);
  const result = await redeemTrainingCredit(parsed.data.creditId, halalas, parsed.data.reference, gate.data.userId);
  if (!result.ok) return fail(result.error);
  revalidatePath(PATH);
  return ok({ balanceSar: result.balance / 100 });
}
