/**
 * تسميات حالات تأجير المعدات — معجم واحد تقرأه الواجهة واللوحة.
 * الحالة تُعرض كما هي بلا تجميل: «بانتظار التحقق» ليست «موثّق».
 */

export const RENTAL_STATUS_LABELS: Record<string, string> = {
  pending: "بانتظار الدفع",
  confirmed: "مؤكد — بانتظار التسليم",
  out_on_rent: "لدى العميل",
  returned: "أُرجع",
  closed: "مغلق",
  cancelled: "ملغى",
  expired: "منتهي",
};

export const RENTAL_PAYMENT_STATUS_LABELS: Record<string, string> = {
  created: "أُنشئت",
  pending: "بانتظار الدفع",
  authorized: "مصرّح",
  paid: "مدفوع",
  failed: "فشل",
  cancelled: "ملغى",
  expired: "منتهي",
  refunded: "مسترد",
};

export const RENTAL_IDENTITY_STATUS_LABELS: Record<string, string> = {
  unverified: "لم تُطلب",
  pending: "بانتظار التحقق اليدوي",
  verified: "تحُقّقت عند التسليم",
  failed: "تعذّر التحقق",
};

export const RENTAL_IDENTITY_METHOD_LABELS: Record<string, string> = {
  manual: "تحقق يدوي موثّق (هوية أصلية عند التسليم)",
  nafath: "نفاذ — عبر مزوّد معتمد",
};

export const SECURITY_NOTE_STATUS_LABELS: Record<string, string> = {
  not_requested: "لم يُطلب بعد",
  requested: "طُلب من نافذ — بانتظار الاعتماد",
  approved: "معتمد من نافذ",
  rejected: "مرفوض",
  expired: "منتهي",
  released: "مُفرج عنه",
};

export const RENTAL_HANDOVER_LABELS: Record<string, string> = {
  pickup: "استلام من المركز",
  delivery: "توصيل",
};

export const EQUIPMENT_STATUS_LABELS: Record<string, string> = {
  available: "متاحة",
  rented: "مؤجرة",
  maintenance: "صيانة",
  retired: "مسحوبة",
};

export const EQUIPMENT_INSPECTION_LABELS: Record<string, string> = {
  handover: "محضر تسليم",
  return: "محضر استرجاع",
};

/** أحداث سجل التدقيق — تُقرأ في خط الزمن بصفحة تفاصيل الإيجار. */
export const EQUIPMENT_AUDIT_EVENT_LABELS: Record<string, string> = {
  rental_created: "أُنشئ الإيجار",
  checkout_failed: "تعذّر إنشاء صفحة الدفع",
  payment_paid: "وصل الدفع وتأكّد",
  payment_paid_unallocated: "دفعة مؤكدة بلا فترة متاحة — تحتاج مراجعة",
  payment_refunded: "استُرد الدفع",
  identity_verified: "وُثّق التحقق من الهوية",
  identity_failed: "تعذّر التحقق من الهوية",
  security_note_changed: "تغيّرت حالة سند الضمان",
  handover_recorded: "سُجّل محضر التسليم",
  return_recorded: "سُجّل محضر الاسترجاع",
  rental_closed: "أُغلق الإيجار",
  rental_cancelled: "أُلغي الإيجار",
  customer_notified: "سُجّل إشعار العميل",
};
