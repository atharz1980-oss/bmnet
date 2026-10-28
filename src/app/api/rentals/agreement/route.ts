import { NextResponse } from "next/server";

import { loadActiveEquipmentAgreement } from "@/lib/rentals/agreements";

export async function GET() {
  try {
    const agreement = await loadActiveEquipmentAgreement();
    if (!agreement) {
      return NextResponse.json({ body: null }, { status: 200 });
    }
    return NextResponse.json({ body: agreement.body }, { status: 200 });
  } catch {
    return NextResponse.json({ body: null }, { status: 200 });
  }
}
