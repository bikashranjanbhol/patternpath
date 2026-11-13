import { accountStore } from "@/lib/data/store";
import { paymentGateway } from "@/lib/payments/gateway";
import { fulfillPaidOrder } from "@/lib/payments/fulfillment";
import { getViewer } from "@/lib/session";

/**
 * The buyer's view of one order. If the order is still pending, asks the
 * gateway once, so a late webhook doesn't keep the user waiting.
 */
export async function GET(_request: Request, ctx: RouteContext<"/api/orders/[orderId]">) {
  const viewer = await getViewer();
  if (!viewer) return Response.json({ error: "sign_in_required" }, { status: 401 });

  const { orderId } = await ctx.params;
  const store = await accountStore();
  let order = await store.getOrder(orderId);
  if (!order || order.uid !== viewer.uid) {
    return Response.json({ error: "not_found" }, { status: 404 });
  }

  if (order.status === "created" && order.gateway !== "mock") {
    const gateway = await paymentGateway();
    const state = await gateway.fetchOrderState(order);
    if (state.status === "paid") {
      order = (await fulfillPaidOrder(order.id, state)).order;
    }
  }

  return Response.json({
    orderId: order.id,
    status: order.status,
    planId: order.planId,
    totalPaise: order.totalPaise,
    periodEnd: order.periodEnd,
  });
}
