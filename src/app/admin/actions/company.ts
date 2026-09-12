"use server";

/**
 * بيانات المنشأة — الهوية القانونية والضريبية.
 * تُكتب في commerce_settings نفسه الذي يقرأه حساب الدفع، لكن هذا الإجراء
 * يكتب أعمدة الهوية فقط فلا يمس إعدادات العربون أو السياسات.
 */

import { revalidatePath } from "next/cache";

import { requirePermission } from "@/lib/admin/session";
import { fail, ok, type ActionResult } from "@/lib/cms/result";
import { getServiceSupabase } from "@/lib/supabase/service";
import { companySchema } from "@/lib/payments/settings";

export async function saveCompanyAction(input: unknown): Promise<ActionResult<null>> {
  const gate = await requirePermission("settings", "edit");
  if (!gate.ok) return gate;
  /* الهوية القانونية والضريبية قرار مالك — لا يكفي امتلاك صلاحية الإعدادات. */
  if (gate.data.role.key !== "owner") return fail("تعديل بيانات المنشأة متاح للمالك فقط.");

  const parsed = companySchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "بيانات المنشأة غير صالحة.");

  const { error } = await getServiceSupabase()
    .from("commerce_settings")
    .update({ ...parsed.data, updated_at: new Date().toISOString() })
    .eq("id", true);
  if (error) return fail("تعذر حفظ بيانات المنشأة. تحقق من تطبيق ترحيل جداول الدفع.");

  revalidatePath("/", "layout");
  return ok(null);
}
