import { accountStore } from "@/lib/data/store";
import { paymentGateway } from "@/lib/payments/gateway";
import { fulfillPaidOrder } from "@/lib/payments/fulfillment";

/**
 * Payment gateway webhook. Premium is unlocked only here (or by the order
 * status check, which asks the gateway directly) — never by the browser.
 *
 * Unlocking is idempotent, so a repeated delivery is harmless. If unlocking
 * fails we return 500 and the gateway retries. Each delivery is logged in
 * paymentEvents for support.
 */
export async function POST(request: Request) {
  const rawBody = await request.text();
  const gateway = await paymentGateway();

  let event;
  try {
    event = gateway.parseWebhook(rawBody, request.headers);
  } catch {
    return new Response("invalid signature", { status: 401 });
  }

  const store = await accountStore();
  const log = (processed: boolean, note?: string) =>
    store.recordPaymentEvent(event.key, {
      type: event.type,
      orderId: event.orderId,
      signatureValid: true,
      processed,
      note: note ?? null,
    });

  const order = event.orderId ? await store.getOrder(event.orderId) : null;
  if (event.type === "other" || !order) {
    await log(false, order ? "ignored type" : "unknown order");
    return Response.json({ ok: true });
  }

  if (event.type === "payment_failed") {
    await store.markOrderFailed(order.id);
    await log(true);
    return Response.json({ ok: true });
  }

  if (event.amountPaise !== null && event.amountPaise !== order.totalPaise) {
    console.error("webhook amount mismatch", { orderId: order.id, got: event.amountPaise });
    await log(false, "amount mismatch");
    return Response.json({ ok: true });
  }

  try {
    await fulfillPaidOrder(order.id, {
      gatewayPaymentId: event.gatewayPaymentId,
      method: event.method,
    });
  } catch (e) {
    console.error("fulfilment failed", { orderId: order.id, error: e });
    return new Response("retry", { status: 500 });
  }
  await log(true);
  return Response.json({ ok: true });
}
