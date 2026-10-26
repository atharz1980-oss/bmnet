import { NextRequest, NextResponse } from "next/server";
import { createNafathSession } from "@/lib/nafath/service";
import { nafathConfigured } from "@/lib/nafath/config";

export async function POST(req: NextRequest) {
  if (!nafathConfigured()) {
    return NextResponse.json(
      { success: false, error: "Nafath integration is not configured" },
      { status: 503 },
    );
  }

  try {
    const body = await req.json().catch(() => ({}));
    const rentalId = typeof body.rentalId === "string" ? body.rentalId : null;

    const result = await createNafathSession({ rentalId });
    if (!result.success) {
      return NextResponse.json(result, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}

export async function GET() {
  if (!nafathConfigured()) {
    return NextResponse.json(
      { success: false, error: "Nafath integration is not configured" },
      { status: 503 },
    );
  }

  return NextResponse.json({ success: true, message: "Nafath start endpoint ready" });
}
