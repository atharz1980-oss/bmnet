/**
 * حساب المال — أعداد صحيحة بالهللات، بلا فاصلة عائمة إطلاقًا.
 *
 * السعر المعروض هو المبلغ المحصَّل حرفيًا: من يرى «1,000 ريال» يُخصم منه
 * 1,000 ريال بالضبط. الضريبة **داخل** السعر لا فوقه، فتُستخرج منه ولا
 * تُضاف إليه.
 *
 *   gross = السعر المعروض
 *   net   = gross × 10000 ÷ (10000 + rate_bps)   بتقريب نصفي لأعلى
 *   vat   = gross − net
 *
 * الطرح في السطر الأخير مقصود: مهما كان التقريب يبقى `net + vat = gross`
 * حرفيًا، فلا يتسرب هلل ولا يختلف المبلغ المحصَّل عن المعروض بحال.
 *
 * لماذا لا `Math.round(a / b)`: القسمة تعطي عددًا عائمًا، وقيمة على حدّ
 * النصف قد تميل إلى الجهة الخطأ بفارق تمثيل. هنا القسمة والباقي على أعداد
 * صحيحة، والقرار مقارنةٌ صحيحة — نتيجة واحدة على كل آلة وفي كل مرة.
 *
 * الحدود: أكبر مدخل 999,999,999 هللة (~10 ملايين ريال)، فأكبر بسط
 * 10^13 — دون 2^53 بفارق مريح، فالحساب دقيق لا مقرَّب.
 */

/** أصغر مبلغ يقبله المزودون فعليًا: ريال واحد. */
export const MIN_CHARGE_HALALAS = 100;
/** سقف تعسفي يحرس من خطأ إدخال يتحول إلى عملية بملايين. */
export const MAX_CHARGE_HALALAS = 999_999_999;

export interface VatBreakdown {
  /** الإجمالي المعروض والمحصَّل — بالهللات. */
  gross: number;
  /** الصافي قبل الضريبة — بالهللات. */
  net: number;
  /** الضريبة المستخرجة من الإجمالي — بالهللات. */
  vat: number;
  /** النسبة المستعملة، بنقاط الأساس (1500 = 15%). */
  rateBps: number;
}

/**
 * السعر النصي أو الرقمي إلى هللات.
 * يرفض الصيغ غير المتوقعة بدل أن يقرّبها: «1,000» و«1.005» و«1e3» كلها
 * أخطاء إدخال، وتقريبها صامتًا يعني تحصيل مبلغ غير الذي قصده المحرر.
 */
export function toHalalas(price: string | number): number {
  const value = String(price);
  if (!/^\d{1,8}(?:\.\d{1,2})?$/.test(value)) throw new Error("سعر الدفع غير صالح.");
  const [whole, fraction = ""] = value.split(".");
  const amount = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  if (!Number.isSafeInteger(amount) || amount < MIN_CHARGE_HALALAS) {
    throw new Error("الحد الأدنى للدفع ريال واحد.");
  }
  return amount;
}

function assertHalalas(gross: number): void {
  if (!Number.isSafeInteger(gross)) throw new Error("المبلغ يجب أن يكون هللات صحيحة.");
  if (gross < MIN_CHARGE_HALALAS) throw new Error("الحد الأدنى للدفع ريال واحد.");
  if (gross > MAX_CHARGE_HALALAS) throw new Error("المبلغ أكبر من الحد المسموح.");
}

function assertRate(rateBps: number): void {
  if (!Number.isSafeInteger(rateBps) || rateBps < 0 || rateBps > 10000) {
    throw new Error("نسبة الضريبة غير صالحة.");
  }
}

/**
 * يستخرج الضريبة من سعر شاملها.
 * `rateBps = 0` يعني منشأة غير مسجلة: الصافي هو الإجمالي ولا ضريبة.
 */
export function splitVatInclusive(gross: number, rateBps: number): VatBreakdown {
  assertHalalas(gross);
  assertRate(rateBps);
  if (rateBps === 0) return { gross, net: gross, vat: 0, rateBps };

  const denominator = 10000 + rateBps;
  const numerator = gross * 10000;
  const quotient = Math.floor(numerator / denominator);
  const remainder = numerator - quotient * denominator;
  /* تقريب نصفي لأعلى بمقارنة صحيحة — لا قسمة عائمة ولا Math.round. */
  const net = remainder * 2 >= denominator ? quotient + 1 : quotient;
  return { gross, net, vat: gross - net, rateBps };
}

/** هللات إلى نص ريالات للعرض — بلا حساب، تقطيع نصي فقط. */
export function formatHalalas(amount: number): string {
  if (!Number.isSafeInteger(amount) || amount < 0) return "0.00";
  const riyals = Math.floor(amount / 100);
  const fraction = String(amount % 100).padStart(2, "0");
  return `${riyals}.${fraction}`;
}
