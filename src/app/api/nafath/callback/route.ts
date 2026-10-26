import { NextRequest, NextResponse } from "next/server";
import { verifyNafathSession } from "@/lib/nafath/service";
import { nafathConfigured } from "@/lib/nafath/config";

export async function GET(req: NextRequest) {
  const sessionId = req.nextUrl.searchParams.get("sessionId") || req.nextUrl.searchParams.get("state");
  const successUrl = req.nextUrl.searchParams.get("successUrl") || "/rentals";

  if (!nafathConfigured()) {
    return NextResponse.redirect(new URL(`${successUrl}?nafath=disabled`, req.url));
  }

  if (!sessionId) {
    return NextResponse.redirect(new URL(`${successUrl}?nafath=error&reason=missing_session`, req.url));
  }

  try {
    const result = await verifyNafathSession(sessionId);
    if (result.success && result.status === "completed") {
      return NextResponse.redirect(new URL(`${successUrl}?nafath=success&sessionId=${sessionId}`, req.url));
    }
    return NextResponse.redirect(new URL(`${successUrl}?nafath=failed&status=${result.status}`, req.url));
  } catch {
    return NextResponse.redirect(new URL(`${successUrl}?nafath=error`, req.url));
  }
}

export async function POST(req: NextRequest) {
  const body = await req.formData().catch(() => null);
  const sessionId = body?.get("sessionId")?.toString() || body?.get("state")?.toString();
  const successUrl = body?.get("successUrl")?.toString() || "/rentals";

  if (!nafathConfigured() || !sessionId) {
    return NextResponse.redirect(new URL(`${successUrl}?nafath=error`, req.url));
  }

  try {
    const result = await verifyNafathSession(sessionId);
    if (result.success && result.status === "completed") {
      return NextResponse.redirect(new URL(`${successUrl}?nafath=success&sessionId=${sessionId}`, req.url));
    }
    return NextResponse.redirect(new URL(`${successUrl}?nafath=failed&status=${result.status}`, req.url));
  } catch {
    return NextResponse.redirect(new URL(`${successUrl}?nafath=error`, req.url));
  }
}
