/**
 * عدّاد السلة — `GET /api/cart/count`
 * --------------------------------
 * يُغذّي شارة السلة في الهيدر. قراءة فقط عبر عميل الخدمة بعد التحقق من
 * رمز الكوكي/الحساب؛ لا معرّف سلة من المتصفح. لا يُنشئ سلة فارغة.
 */

import { NextResponse } from "next/server";

import { loadCartForViewer } from "@/lib/cart/store";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const cart = await loadCartForViewer();
    return NextResponse.json(
      { count: cart.items.length },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return NextResponse.json({ count: 0 }, { headers: { "Cache-Control": "no-store" } });
  }
}
