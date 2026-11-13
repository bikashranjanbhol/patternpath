import "server-only";
import { config, mockPaymentsAllowed } from "@/lib/config";
import type { Order } from "@/lib/types";

// All payment-provider calls go through this interface, so switching from
// Cashfree to another gateway touches only one adapter file.

export interface CheckoutSession {
  gatewayOrderId: string;
  /** Cashfree's payment_session_id, or a URL for the mock gateway. */
  paymentSessionId: string;
}

export interface GatewayOrderState {
  status: "pending" | "paid" | "failed" | "expired";
  gatewayPaymentId: string | null;
  method: string | null;
}

export interface WebhookEvent {
  /** Unique key used to ignore repeated deliveries. */
  key: string;
  type: "payment_success" | "payment_failed" | "other";
  orderId: string | null;
  gatewayPaymentId: string | null;
  method: string | null;
  amountPaise: number | null;
}

export interface PaymentGateway {
  name: "cashfree" | "mock";
  /** returnPath: same-site path the gateway sends the buyer back to. */
  createCheckout(
    order: Order,
    customer: { email: string; name: string; returnPath: string },
  ): Promise<CheckoutSession>;
  fetchOrderState(order: Order): Promise<GatewayOrderState>;
  /** Throws if the signature is invalid. */
  parseWebhook(rawBody: string, headers: Headers): WebhookEvent;
}

export async function paymentGateway(): Promise<PaymentGateway> {
  if (config.paymentGateway === "cashfree") {
    const { CashfreeGateway } = await import("./cashfree");
    return new CashfreeGateway();
  }
  if (!mockPaymentsAllowed()) {
    throw new Error("PAYMENT_GATEWAY=mock is only allowed with DATA_SOURCE=local");
  }
  const { MockGateway } = await import("./mock");
  return new MockGateway();
}
