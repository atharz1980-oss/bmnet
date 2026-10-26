import { NextRequest, NextResponse } from "next/server";
import { verifyNafathSession } from "@/lib/nafath/service";
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
    const sessionId = typeof body.sessionId === "string" ? body.sessionId : null;

    if (!sessionId) {
      return NextResponse.json({ success: false, error: "sessionId is required" }, { status: 400 });
    }

    const result = await verifyNafathSession(sessionId);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}

export async function GET(req: NextRequest) {
  if (!nafathConfigured()) {
    return NextResponse.json(
      { success: false, error: "Nafath integration is not configured" },
      { status: 503 },
    );
  }

  const sessionId = req.nextUrl.searchParams.get("sessionId");
  if (!sessionId) {
    return NextResponse.json({ success: false, error: "sessionId is required" }, { status: 400 });
  }

  try {
    const result = await verifyNafathSession(sessionId);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}
