import "server-only";

/**
 * توافر المعدات على مدى فترة — الحارس الثاني بعد حارس القاعدة.
 * ------------------------------------------------------------
 * الكمية المحجوزة = إيجارات حالة حاجزة تتقاطع مع الفترة المطلوبة:
 *   - confirmed / out_on_rent / returned (مدفوعة أو في حيازة العميل)
 *   - pending بمحاولة دفع حيّة لم تنتهِ مهلتها
 * متبقٍ = كمية المعدة − المحجوز. القرار النهائي عند `startEquipmentRental`
 * وعند حارس `prevent_equipment_overbook` في القاعدة، لا في المتصفح.
 */

import { checkoutReady } from "@/lib/payments/purchase";
import { getServiceSupabase } from "@/lib/supabase/service";

import { rentalDays } from "./dates";

export const OPEN_RENTAL_PAYMENT_STATES = ["created", "pending", "authorized"] as const;
export const BLOCKING_RENTAL_STATUSES = ["confirmed", "out_on_rent", "returned"] as const;

interface BlockingRow {
  quantity: number;
  status: string;
  payment_status: string;
  checkout_expires_at: string | null;
}

export function isBlockingRental(row: BlockingRow, now = Date.now()): boolean {
  if ((BLOCKING_RENTAL_STATUSES as readonly string[]).includes(row.status)) return true;
  return (
    row.status === "pending" &&
    (OPEN_RENTAL_PAYMENT_STATES as readonly string[]).includes(row.payment_status) &&
    row.checkout_expires_at !== null &&
    new Date(row.checkout_expires_at).getTime() > now
  );
}

/** إغلاق محاولات الدفع المنتهية لتعود الكمية إلى المتاح. */
export async function expireStaleEquipmentRentals(): Promise<void> {
  await getServiceSupabase()
    .from("equipment_rentals")
    .update({ status: "expired", payment_status: "expired" })
    .eq("status", "pending")
    .in("payment_status", [...OPEN_RENTAL_PAYMENT_STATES])
    .lte("checkout_expires_at", new Date().toISOString());
}

export interface EquipmentAvailability {
  itemId: string;
  startDate: string;
  endDate: string;
  days: number;
  capacity: number;
  reserved: number;
  remaining: number;
}

/** الكمية المتاحة من معدة في فترة مغلقة الطرفين. */
export async function loadEquipmentAvailability(
  itemId: string,
  startDate: string,
  endDate: string,
): Promise<EquipmentAvailability | null> {
  const days = rentalDays(startDate, endDate);
  if (days === null) return null;

  await expireStaleEquipmentRentals();
  const svc = getServiceSupabase();
  const [{ data: item }, { data: rentals }] = await Promise.all([
    svc.from("equipment_items").select("quantity").eq("id", itemId).maybeSingle(),
    svc
      .from("equipment_rentals")
      .select("quantity, status, payment_status, checkout_expires_at")
      .eq("item_id", itemId)
      .lte("start_date", endDate)
      .gte("end_date", startDate),
  ]);
  if (!item) return null;

  const reserved = ((rentals ?? []) as BlockingRow[])
    .filter((row) => isBlockingRental(row))
    .reduce((sum, row) => sum + row.quantity, 0);

  return {
    itemId,
    startDate,
    endDate,
    days,
    capacity: item.quantity,
    reserved,
    remaining: Math.max(0, item.quantity - reserved),
  };
}

export interface EquipmentCheckoutReadiness {
  ready: boolean;
  reason: string | null;
}

/** هل يستطيع الخادم تحصيل مبلغ الآن؟ (مفتاح ميسر + ضريبة معتمدة) */
export async function equipmentCheckoutReadiness(): Promise<EquipmentCheckoutReadiness> {
  if (await checkoutReady("moyasar")) return { ready: true, reason: null };
  return {
    ready: false,
    reason: "الدفع الإلكتروني غير متاح حاليًا. تواصل معنا لتأكيد الإيجار.",
  };
}
