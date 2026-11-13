import { z } from "zod";
import { config, mockPaymentsAllowed } from "@/lib/config";
import { accountStore } from "@/lib/data/store";
import { fulfillPaidOrder } from "@/lib/payments/fulfillment";
import { getViewer } from "@/lib/session";

const Body = z.object({ orderId: z.string(), outcome: z.enum(["success", "failure"]) });

/** Mock gateway only: simulate a successful or failed payment. */
export async function POST(request: Request) {
  if (config.paymentGateway !== "mock" || !mockPaymentsAllowed()) {
    return new Response("Not found", { status: 404 });
  }
  const viewer = await getViewer();
  if (!viewer) return Response.json({ error: "sign_in_required" }, { status: 401 });

  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "bad_request" }, { status: 400 });

  const store = await accountStore();
  const order = await store.getOrder(parsed.data.orderId);
  if (!order || order.uid !== viewer.uid) return Response.json({ error: "not_found" }, { status: 404 });

  if (parsed.data.outcome === "failure") {
    await store.markOrderFailed(order.id);
  } else {
    await fulfillPaidOrder(order.id, { gatewayPaymentId: `mock_${order.id}`, method: "upi" });
  }
  return Response.json({ ok: true });
}
