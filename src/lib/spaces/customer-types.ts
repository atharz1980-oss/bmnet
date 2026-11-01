/**
 * نوع مزوّد الحجز — نص يُخزَّن كما يصل من النموذج مع تحققه على الخادم.
 * منفصل عن حزمة الحجز (server-only) حتى تستطيع الواجهة استيراد التسميات.
 */

export const SPACE_CUSTOMER_TYPES = {
  individual: "فرد",
  company: "شركة",
  advertiser: "معلن / جهة إعلانية",
  other: "أخرى",
} as const;

export type SpaceCustomerType = keyof typeof SPACE_CUSTOMER_TYPES;

export const SPACE_CUSTOMER_TYPE_LIST = Object.keys(SPACE_CUSTOMER_TYPES) as SpaceCustomerType[];

export const SPACE_BOOKING_CUSTOMER_TYPES = {
  individual: SPACE_CUSTOMER_TYPES.individual,
  company: SPACE_CUSTOMER_TYPES.company,
  advertiser: SPACE_CUSTOMER_TYPES.advertiser,
} as const;

export type SpaceBookingCustomerType = keyof typeof SPACE_BOOKING_CUSTOMER_TYPES;

export function isSpaceBookingCustomerType(value: string): value is SpaceBookingCustomerType {
  return Object.prototype.hasOwnProperty.call(SPACE_BOOKING_CUSTOMER_TYPES, value);
}

export function isSpaceCustomerType(value: string): value is SpaceCustomerType {
  return Object.prototype.hasOwnProperty.call(SPACE_CUSTOMER_TYPES, value);
}

export function spaceCustomerTypeLabel(value: string): string {
  if (value === "other") return SPACE_CUSTOMER_TYPES.individual;
  return isSpaceCustomerType(value) ? SPACE_CUSTOMER_TYPES[value] : value;
}
