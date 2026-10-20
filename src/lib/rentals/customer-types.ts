/**
 * نوع مستأجر المعدات — نص يُخزَّن كما يصل من النموذج مع تحققه على الخادم.
 * منفصل عن حزمة الحجز (server-only) حتى تستطيع الواجهة استيراد التسميات.
 */

export const RENTAL_CUSTOMER_TYPES = {
  individual: "فرد",
  company: "شركة",
  advertiser: "معلن / جهة إعلانية",
  other: "أخرى",
} as const;

export type RentalCustomerType = keyof typeof RENTAL_CUSTOMER_TYPES;

export const RENTAL_CUSTOMER_TYPE_LIST = Object.keys(RENTAL_CUSTOMER_TYPES) as RentalCustomerType[];

export function isRentalCustomerType(value: string): value is RentalCustomerType {
  return Object.prototype.hasOwnProperty.call(RENTAL_CUSTOMER_TYPES, value);
}
