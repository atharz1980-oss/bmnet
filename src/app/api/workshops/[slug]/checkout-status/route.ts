/**
 * جاهزية الدفع الإلكتروني لورشة — `{ ready: boolean }` فقط، بلا أي تفصيل أو سر.
 *
 * صفحة الهبوط ساكنة (تُبنى وتُحدَّث كل 5 دقائق) فلا تحمل حالة الدفع: لو حُسبت
 * أثناء البناء لبقيت حالة البناء معروضة حتى التحديث. هنا تُحسب عند الطلب،
 * وإجراء الحجز على الخادم يتحقق منها مجددًا عند الضغط على «ادفع» في كل الأحوال.
 */

import { NextResponse } from "next/server";

import { workshopCatalog } from "@/lib/workshops/catalog";
import { cachedWorkshopCheckoutReady } from "@/lib/workshops/checkout-status";

export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store" };

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!workshopCatalog(slug)) return NextResponse.json({ ready: false }, { status: 404, headers: NO_STORE });
  return NextResponse.json({ ready: await cachedWorkshopCheckoutReady(slug) }, { headers: NO_STORE });
}
