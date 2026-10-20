import "server-only";

/**
 * تجميع صفحة السلة: السلة كما يراها الزائر + خيارات تعديل كل عنصر.
 *
 * لا تكتب شيئًا: قراءة فقط. تُنظّف الطلبات المنتهية كسولًا (تُغلق ويُحرَّر
 * حجزها) حتى لا تُعرض «دفعة معلّقة» ميتة ولا تُمنع التعديلات لأجلها.
 */

import { expireCartOrder } from "./checkout";
import { loadCartForViewer } from "./store";
import { loadCourseSessions, sessionLabel, sessionPlace, sessionTime } from "@/lib/sessions/availability";
import { spaceCheckoutReadiness } from "@/lib/spaces/availability";
import type { CartPageItem, CartPageView, CartSessionOption } from "./types";

async function sessionOptionsFor(courseId: string): Promise<CartSessionOption[]> {
  const sessions = await loadCourseSessions(courseId);
  return sessions.map((session) => ({
    id: session.id,
    label: sessionLabel(session),
    time: sessionTime(session.startTime, session.endTime),
    place: sessionPlace(session),
    available: session.available,
  }));
}

export async function loadCartPage(): Promise<CartPageView> {
  const cart = await loadCartForViewer();

  /* تنظيف كسول: الطلب المنتهي يُغلق ويُحرر حجزه، فلا يمنع تعديلًا ولا
     يُعرض كأنه ما زال حيًّا. */
  const liveAfterCleanup: typeof cart.pendingOrders = [];
  for (const order of cart.pendingOrders) {
    if (order.expired) {
      await expireCartOrder(order.id);
      continue;
    }
    liveAfterCleanup.push(order);
  }

  const items = await Promise.all(
    cart.items.map(async (item): Promise<CartPageItem> => {
      const needsSession = item.kind === "course";
      const sessionOptions =
        item.kind === "course" && item.courseId ? await sessionOptionsFor(item.courseId) : [];
      return { item, sessionOptions, needsSession };
    }),
  );

  const readiness = await spaceCheckoutReadiness();
  const hasItems = cart.items.length > 0;

  return {
    cart: { ...cart, pendingOrders: liveAfterCleanup },
    items,
    checkoutReady: readiness.ready || !hasItems,
    checkoutNotice: readiness.ready ? null : readiness.reason,
  };
}
