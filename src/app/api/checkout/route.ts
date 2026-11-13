import { z } from "zod";
import { config } from "@/lib/config";
import { accountStore } from "@/lib/data/store";
import { paymentGateway } from "@/lib/payments/gateway";
import { couponProblem, normalizeIndianPhone, quote } from "@/lib/pricing";
import { getViewer } from "@/lib/session";
import { safeNext } from "@/lib/urls";

const Body = z.object({
  planId: z.enum(["monthly", "sprint", "yearly"]),
  phone: z.string().max(20),
  couponCode: z.string().max(32).optional().nullable(),
  /** true = only price the order (to show the summary), don't create it. */
  quoteOnly: z.boolean().optional(),
  /** Where to send the user after paying (a same-site path). */
  next: z.string().max(200).optional(),
});

/** Prices a plan, creates a pending order, and opens a gateway checkout. */
export async function POST(request: Request) {
  const viewer = await getViewer({ checkRevoked: true });
  if (!viewer) return Response.json({ error: "sign_in_required" }, { status: 401 });

  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "bad_request" }, { status: 400 });
  const { planId, couponCode, quoteOnly } = parsed.data;

  const store = await accountStore();
  const plan = await store.getPlan(planId);
  if (!plan) return Response.json({ error: "plan_not_found" }, { status: 404 });

  const now = Date.now();
  let coupon = null;
  if (couponCode) {
    const code = couponCode.trim().toUpperCase();
    coupon = await store.getCoupon(code);
    const problem =
      couponProblem(coupon, plan.id, now) ??
      ((await store.hasRedeemedCoupon(code, viewer.uid)) ? "already_used" : null);
    if (problem) return Response.json({ error: "coupon", reason: problem }, { status: 400 });
  }
  const q = quote(plan, coupon);
  if (quoteOnly) return Response.json({ quote: q });

  const phone = normalizeIndianPhone(parsed.data.phone);
  if (!phone) return Response.json({ error: "phone" }, { status: 400 });

  const gateway = await paymentGateway();
  const order = await store.createOrder({
    uid: viewer.uid,
    planId: plan.id,
    ...q,
    currency: "INR",
    status: "created",
    gateway: gateway.name,
    gatewayOrderId: null,
    gatewayPaymentId: null,
    method: null,
    phone,
    periodStart: null,
    periodEnd: null,
    createdAt: now,
    paidAt: null,
  });

  try {
    const returnPath = `/checkout/result?order_id=${encodeURIComponent(order.id)}&next=${encodeURIComponent(safeNext(parsed.data.next))}`;
    const session = await gateway.createCheckout(order, {
      email: viewer.email,
      name: viewer.name,
      returnPath,
    });
    await store.setGatewayOrderId(order.id, session.gatewayOrderId);
    return Response.json({
      orderId: order.id,
      gateway: gateway.name,
      mode: config.cashfree.env,
      paymentSessionId: session.paymentSessionId,
      quote: q,
    });
  } catch (e) {
    console.error("checkout failed", e);
    await store.markOrderFailed(order.id);
    return Response.json({ error: "gateway_unavailable" }, { status: 502 });
  }
}
