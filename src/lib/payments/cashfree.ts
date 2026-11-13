import "server-only";
import { config } from "@/lib/config";
import type { Order } from "@/lib/types";
import { parseCashfreeWebhook } from "./cashfree-webhook";
import type { CheckoutSession, GatewayOrderState, PaymentGateway } from "./gateway";

// Cashfree Payment Gateway (PG) adapter using the REST API directly.
// Docs: https://www.cashfree.com/docs/api-reference/payments/latest/orders/create

const BASE = {
  sandbox: "https://sandbox.cashfree.com/pg",
  production: "https://api.cashfree.com/pg",
} as const;

function headers() {
  const { clientId, clientSecret, apiVersion } = config.cashfree;
  if (!clientId || !clientSecret) throw new Error("Cashfree keys are not configured");
  return {
    "content-type": "application/json",
    "x-client-id": clientId,
    "x-client-secret": clientSecret,
    "x-api-version": apiVersion,
  };
}

export class CashfreeGateway implements PaymentGateway {
  name = "cashfree" as const;

  async createCheckout(
    order: Order,
    customer: { email: string; name: string; returnPath: string },
  ): Promise<CheckoutSession> {
    const res = await fetch(`${BASE[config.cashfree.env]}/orders`, {
      method: "POST",
      headers: { ...headers(), "x-idempotency-key": order.id },
      body: JSON.stringify({
        order_id: order.id,
        order_amount: Number((order.totalPaise / 100).toFixed(2)),
        order_currency: "INR",
        customer_details: {
          customer_id: order.uid,
          customer_phone: order.phone,
          customer_email: customer.email || undefined,
          customer_name: customer.name || undefined,
        },
        order_meta: {
          return_url: `${config.appUrl}${customer.returnPath}`.slice(0, 250),
          notify_url: `${config.appUrl}/api/payments/webhook`,
          payment_methods: "upi,cc,dc,nb",
        },
        order_note: `PatternPath ${order.planId}`,
      }),
    });
    if (!res.ok) {
      throw new Error(`Cashfree create order failed: ${res.status} ${await res.text()}`);
    }
    const data = (await res.json()) as { order_id: string; payment_session_id: string };
    return { gatewayOrderId: data.order_id, paymentSessionId: data.payment_session_id };
  }

  async fetchOrderState(order: Order): Promise<GatewayOrderState> {
    const res = await fetch(`${BASE[config.cashfree.env]}/orders/${encodeURIComponent(order.id)}`, {
      headers: headers(),
      cache: "no-store",
    });
    if (!res.ok) return { status: "pending", gatewayPaymentId: null, method: null };
    const data = (await res.json()) as { order_status?: string };
    const status =
      data.order_status === "PAID"
        ? "paid"
        : data.order_status === "EXPIRED" || data.order_status === "TERMINATED"
          ? "expired"
          : "pending";
    return { status, gatewayPaymentId: null, method: null };
  }

  parseWebhook(rawBody: string, h: Headers) {
    return parseCashfreeWebhook(rawBody, h, config.cashfree.clientSecret);
  }
}
