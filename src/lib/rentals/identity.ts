/**
 * بيان هوية المستأجر — تحقق شكلي محلي، وليس تحققًا حكوميًا.
 * ---------------------------------------------------------
 * الحقول النقية (خانة التحقق وسريان التاريخ) في `identity-fields.ts` لأن
 * نموذج المستأجر مكوّن عميل يستوردها؛ هذا الملف يضيف ما يلزم الخادم وحده:
 * بصمة توقيع SHA-256 التي تربط الاسم والهوية وإصدار العقد والمعدة والفترة،
 * فتكشف أي تغيير لاحق في السجل.
 *
 * هذا **لا** يغني عن التحقق البشري من أصل الهوية عند التسليم، ولا يدّعي
 * تكاملًا مع نفاذ أو أي جهة حكومية. حالة `identity_status` تبقى `pending`
 * حتى يوثّق الموظف التحقق في اللوحة.
 */

import { createHash, timingSafeEqual } from "node:crypto";

export {
  identityCoversRental,
  isIsoDate,
  isValidSaudiNationalId,
  maskNationalId,
  nationalIdKind,
} from "./identity-fields";

export interface SignatureInput {
  agreementVersion: number;
  itemId: string;
  nationalId: string;
  signatureName: string;
  startDate: string;
  endDate: string;
  quantity: number;
  acceptedAt: string;
}

/**
 * بصمة التوقيع الإلكتروني. الترتيب والفواصل ثابتة ومعلنة هنا وحدها، فأي
 * إعادة حساب لاحقة (مراجعة قانونية أو نزاع) تعطي البصمة نفسها.
 */
export function signatureHash(input: SignatureInput): string {
  const canonical = [
    "bayt-almosawer-equipment-rental-v1",
    `agreement:${input.agreementVersion}`,
    `item:${input.itemId}`,
    `id:${input.nationalId}`,
    `signer:${input.signatureName.trim()}`,
    `from:${input.startDate}`,
    `to:${input.endDate}`,
    `qty:${input.quantity}`,
    `accepted:${input.acceptedAt}`,
  ].join("\n");
  return createHash("sha256").update(canonical, "utf8").digest("hex");
}

/** مقارنة بصمتين بزمن ثابت (لأغراض المراجعة والاختبار). */
export function signatureMatches(stored: string, expected: string): boolean {
  const a = Buffer.from(stored, "utf8");
  const b = Buffer.from(expected, "utf8");
  return a.length === b.length && timingSafeEqual(a, b);
}
