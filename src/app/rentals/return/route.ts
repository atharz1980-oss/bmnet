import { NextResponse, type NextRequest } from "next/server";

import { cancelEquipmentRentalCheckout } from "@/lib/rentals/bookings";

export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(request: NextRequest) {
  const rentalId = request.nextUrl.searchParams.get("r");
  const token = request.nextUrl.searchParams.get("t");
  if (!rentalId || !token || !UUID.test(rentalId) || !UUID.test(token)) {
    return NextResponse.redirect(new URL("/rentals", request.url), 303);
  }

  const result = await cancelEquipmentRentalCheckout(rentalId, token);
  if (!result.itemSlug) return NextResponse.redirect(new URL("/rentals", request.url), 303);
  if (!result.cancelled) {
    return NextResponse.redirect(new URL(`/rentals/success?r=${rentalId}`, request.url), 303);
  }
  if (result.cartSaved) return NextResponse.redirect(new URL("/cart?notice=added", request.url), 303);
  return NextResponse.redirect(new URL(`/rentals/${result.itemSlug}#booking`, request.url), 303);
}
