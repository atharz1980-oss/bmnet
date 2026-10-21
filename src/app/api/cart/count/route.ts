/**
 * عدّاد السلة — `GET /api/cart/count`
 * --------------------------------
 * يُغذّي شارة السلة في الهيدر. قراءة فقط عبر عميل الخدمة بعد التحقق من
 * رمز الكوكي/الحساب؛ لا معرّف سلة من المتصفح. لا يُنشئ سلة فارغة.
 *
 * العدد خاصّ بالزائر (سلة رمز أو سلة حساب) ⇒ لا كاش مشترك ولا CDN.
 * 등은 `private, no-store` كي لا يختلط عدد زائرٍ مع آخر على CDN.
 */

import { NextResponse } from "next/server";

import { loadCartCountForViewer } from "@/lib/cart/store";

export const dynamic = "force-dynamic";

const PRIVATE_NO_STORE = { "Cache-Control": "private, no-store" };

export async function GET() {
  try {
    const count = await loadCartCountForViewer();
    return NextResponse.json({ count }, { headers: PRIVATE_NO_STORE });
  } catch {
    return NextResponse.json({ count: 0 }, { headers: PRIVATE_NO_STORE });
  }
}
