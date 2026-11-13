import { cookies } from "next/headers";
import { z } from "zod";
import { config, isLocalMode, mockPaymentsAllowed } from "@/lib/config";
import { accountStore } from "@/lib/data/store";
import { fulfillPaidOrder } from "@/lib/payments/fulfillment";
import { createDevSessionToken, getViewer, SESSION_COOKIE, sessionCookieOptions } from "@/lib/session";

const Body = z.object({ orderId: z.string(), outcome: z.enum(["success", "failure"]) });

/**
 * Mock gateway only: simulate a successful or failed payment.
 * Returns the order's ID afterwards, which changes in local mode because
 * local orders are signed snapshots.
 */
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
    const { LocalAccountStore } = await import("@/lib/data/local-store");
    const id =
      store instanceof LocalAccountStore ? store.snapshot({ ...order, status: "failed" }).id : order.id;
    return Response.json({ ok: true, orderId: id });
  }

  const result = await fulfillPaidOrder(order.id, {
    gatewayPaymentId: `mock_${Date.now()}`,
    method: "upi",
  });

  if (isLocalMode()) {
    // The demo session carries Premium itself, so extend it in the cookie.
    const premiumUntil =
      Math.max(viewer.premiumUntil ?? 0, result.user.plan.premiumUntil ?? 0) || null;
    (await cookies()).set(
      SESSION_COOKIE,
      createDevSessionToken({
        uid: viewer.uid,
        name: viewer.name,
        email: viewer.email,
        premiumUntil,
        role: viewer.role,
      }),
      sessionCookieOptions,
    );
  }
  return Response.json({ ok: true, orderId: result.order.id });
}
