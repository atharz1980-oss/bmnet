/**
 * تسميات حالة الحجز والدفع للعرض في اللوحة والواجهة —
 * معجم واحد يقرأه الطرفان فلا يتشتت وصف حالة واحدة في مكانين.
 */

export const SPACE_BOOKING_STATUS_LABELS: Record<string, string> = {
  pending: "بانتظار الدفع",
  confirmed: "مؤكد",
  completed: "مكتمل",
  cancelled: "ملغى",
  expired: "منتهي",
};

export const SPACE_PAYMENT_STATUS_LABELS: Record<string, string> = {
  created: "أُنشئت",
  pending: "بانتظار الدفع",
  authorized: "مصرّح",
  paid: "مدفوع",
  failed: "فشل",
  cancelled: "ملغى",
  expired: "منتهي",
  refunded: "مسترد",
};
