/**
 * معاملات الحملات (UTM) — تُحمل من رابط الهبوط إلى رابط الدفع فقط.
 *
 * لا تخزين ولا إرسال لأي جهة: المعاملات المعروفة تُنسخ كما هي إلى الرابط
 * الداخلي التالي، وكل ما عداها يُتجاهل.
 */

export const UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"] as const;

const MAX_VALUE_LENGTH = 200;

/** يلتقط معاملات UTM المعروفة من سلسلة استعلام. */
export function pickCampaignParams(search: string): Array<[string, string]> {
  const params = new URLSearchParams(search);
  const picked: Array<[string, string]> = [];
  for (const key of UTM_KEYS) {
    const value = params.get(key)?.trim();
    if (value) picked.push([key, value.slice(0, MAX_VALUE_LENGTH)]);
  }
  return picked;
}

/** يضيف معاملات الحملة إلى رابط داخلي (يبدأ بـ /) مع الإبقاء على المرساة. */
export function withCampaignParams(href: string, campaign: Array<[string, string]>): string {
  if (campaign.length === 0 || !href.startsWith("/")) return href;
  const url = new URL(href, "https://internal.invalid");
  for (const [key, value] of campaign) url.searchParams.set(key, value);
  return `${url.pathname}${url.search}${url.hash}`;
}
