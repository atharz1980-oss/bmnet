import type { SpaceCustomerType } from "@/lib/spaces/customer-types";

/** أنواع العناصر المدعومة في السلة. */
export type CartItemKind = "course" | "space" | "equipment";

export interface CartContact {
  customerType: SpaceCustomerType | null;
  customerName: string;
  companyName: string;
  email: string;
  phone: string;
  notes: string;
}

export interface CartItemView {
  id: string;
  kind: CartItemKind;
  courseId: string | null;
  sessionId: string | null;
  spaceId: string | null;
  bookingDate: string | null;
  startTime: string | null;
  endTime: string | null;
  title: string;
  subtitle: string;
  href: string;
  /** لقطة السعر وقت الإضافة — السعر الملزم يُحسب من القاعدة عند الدفع. */
  unitGrossHalalas: number;
  createdAt: string;
  equipmentId?: string | null;
  rentalStartDate?: string | null;
  rentalEndDate?: string | null;
  rentalQuantity?: number | null;
  rentalMethod?: "pickup" | "delivery" | null;
  rentalDeliveryAddress?: string | null;
  agreementVersion?: number | null;
  agreementAcceptedAt?: string | null;
  signatureName?: string | null;
  signatureDataUrl?: string | null;
  signatureHash?: string | null;
  nationalId?: string | null;
  nationalIdExpiry?: string | null;
}

export interface CartOrderSummary {
  id: string;
  status: string;
  itemCount: number;
  totalAmount: number;
  createdAt: string;
  expiresAt: string | null;
  holdExpiresAt?: string | null;
  checkoutUrl: string | null;
  expired: boolean;
}

export interface CartView {
  cartId: string | null;
  items: CartItemView[];
  contact: CartContact;
  pendingOrders: CartOrderSummary[];
  subtotalHalalas: number;
  /** هل يلزم تسجيل الدخول قبل إتمام الدفع (لأن في السلة دورة)؟ */
  requiresAccount: boolean;
}

export interface CartOrderItemView {
  id: string;
  kind: CartItemKind;
  title: string;
  subtitle: string;
  href: string;
  grossAmount: number;
  status: "pending" | "fulfilled" | "failed" | "cancelled";
  failureCode: string;
  courseId: string | null;
  sessionId: string | null;
  spaceId: string | null;
  bookingDate: string | null;
  startTime: string | null;
  endTime: string | null;
  enrollmentId: string | null;
  spaceBookingId: string | null;
  equipmentId?: string | null;
  equipmentRentalId?: string | null;
}

export interface CartOrderView {
  id: string;
  status: string;
  customerName: string;
  email: string;
  phone: string | null;
  companyName: string | null;
  customerType: string | null;
  notes: string | null;
  itemCount: number;
  netAmount: number;
  taxAmount: number;
  totalAmount: number;
  taxRateBps: number;
  currency: string;
  createdAt: string;
  paidAt: string | null;
  failedAt: string | null;
  cancelledAt: string | null;
  expiresAt: string | null;
  checkoutUrl: string | null;
  failureCode: string;
  items: CartOrderItemView[];
}

/** دفعة قابلة للاختيار لعنصر دورة في السلة (يُعرض في «تعديل الموعد»). */
export interface CartSessionOption {
  id: string;
  label: string;
  time: string;
  place: string;
  available: number;
}

/**
 * عنصر كما تعرضه صفحة السلة: العنصر المحفوظ + ما يلزم لتعديله.
 * `sessionOptions` تُملأ للدورة المجدولة فقط، و`editHref` وجهة نصية بسيطة.
 */
export interface CartPageItem {
  item: CartItemView;
  sessionOptions: CartSessionOption[];
  /** هل الدورة تحتاج اختيار موعد؟ (لا يعني بالضرورة وجود خيارات الآن). */
  needsSession: boolean;
}

/** كل ما تحتاجه صفحة `/cart`. */
export interface CartPageView {
  cart: CartView;
  items: CartPageItem[];
  /** المزود جاهز على الخادم؟ يخفي زر الدفع ويشرح السبب إن لا. */
  checkoutReady: boolean;
  checkoutNotice: string | null;
}
