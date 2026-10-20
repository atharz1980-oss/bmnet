import "server-only";

/**
 * طلبات السلة للعرض الإداري — قراءة فقط.
 *
 * لا مرجع مزود ولا رابط دفع هنا: الإدارة ترى ما يلزم للمتابعة (من، وماذا،
 * وكم، وحالته). الجدول محجوب عن المتصفح (RLS)، فالقراءة بعميل الخدمة.
 */

import { getServiceSupabase } from "@/lib/supabase/service";

export type ShoppingOrderFilter =
  | "paid"
  | "pending"
  | "failed"
  | "expired"
  | "cancelled"
  | "refunded"
  | "all";

export const SHOPPING_ORDER_FILTERS: readonly ShoppingOrderFilter[] = [
  "paid",
  "pending",
  "failed",
  "expired",
  "cancelled",
  "refunded",
  "all",
];

export interface ShoppingOrderListItem {
  id: string;
  status: string;
  customerName: string;
  email: string;
  phone: string | null;
  customerType: string | null;
  companyName: string | null;
  itemCount: number;
  totalAmount: number;
  currency: string;
  failureCode: string;
  paidAt: string | null;
  createdAt: string;
  expiresAt: string | null;
}

type OrderRow = {
  id: string;
  status: string;
  customer_name: string;
  email: string;
  phone: string | null;
  customer_type: string | null;
  company_name: string | null;
  item_count: number;
  total_amount: number;
  currency: string;
  failure_code: string;
  paid_at: string | null;
  created_at: string;
  checkout_expires_at: string | null;
};

const STATUS_SETS: Record<ShoppingOrderFilter, string[] | null> = {
  paid: ["paid"],
  pending: ["created", "pending", "authorized"],
  failed: ["failed"],
  expired: ["expired"],
  cancelled: ["cancelled"],
  refunded: ["refunded"],
  all: null,
};

export async function listShoppingOrders(
  filter: ShoppingOrderFilter,
  limit = 100,
): Promise<ShoppingOrderListItem[]> {
  let query = getServiceSupabase()
    .from("shopping_orders")
    .select(
      "id, status, customer_name, email, phone, customer_type, company_name, item_count, total_amount, currency, failure_code, paid_at, created_at, checkout_expires_at",
    )
    .order("created_at", { ascending: false })
    .limit(limit);

  const statuses = STATUS_SETS[filter];
  if (statuses) query = query.in("status", statuses);

  const { data } = await query;
  return ((data ?? []) as OrderRow[]).map((row) => ({
    id: row.id,
    status: row.status,
    customerName: row.customer_name,
    email: row.email,
    phone: row.phone,
    customerType: row.customer_type,
    companyName: row.company_name,
    itemCount: row.item_count,
    totalAmount: row.total_amount,
    currency: row.currency,
    failureCode: row.failure_code,
    paidAt: row.paid_at,
    createdAt: row.created_at,
    expiresAt: row.checkout_expires_at,
  }));
}
