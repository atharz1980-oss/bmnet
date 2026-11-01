import { Container } from "@/components/shared/container";
import { SpaceBookingReturn } from "@/components/spaces/booking-return";
import { loadSpaceBookingReturn } from "@/lib/spaces/bookings";

export const dynamic = "force-dynamic";
export const metadata = { title: "العودة من الدفع", robots: { index: false, follow: false } };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function SpaceBookingReturnPage({
  searchParams,
}: {
  searchParams: Promise<{ b?: string; t?: string; cancelled?: string }>;
}) {
  const { b, t, cancelled } = await searchParams;
  const result = b && t && UUID.test(b) && UUID.test(t) ? await loadSpaceBookingReturn(b, t) : null;

  const state =
    !result ? "invalid" : result.outcome === "paid" ? "paid" : cancelled === "1" ? "cancelled" :
      result.outcome === "pending" && result.checkoutUrl ? "confirm" : "ended";

  return (
    <Container className="py-16 sm:py-24">
      <SpaceBookingReturn
        bookingId={b ?? ""}
        returnToken={t ?? ""}
        spaceHref={result ? `/spaces/${result.spaceSlug}` : "/spaces"}
        checkoutUrl={result?.checkoutUrl ?? null}
        state={state}
      />
    </Container>
  );
}
