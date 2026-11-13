import "server-only";
import type { Order } from "@/lib/types";
import type { CheckoutSession, GatewayOrderState, PaymentGateway } from "./gateway";

// Development gateway. "Paying" happens on /checkout/mock, which calls
// /api/payments/mock — the same fulfilment code the real webhook uses.

export class MockGateway implements PaymentGateway {
  name = "mock" as const;

  async createCheckout(order: Order, customer: { returnPath: string }): Promise<CheckoutSession> {
    const back = encodeURIComponent(customer.returnPath);
    return { gatewayOrderId: order.id, paymentSessionId: `/checkout/mock?order_id=${order.id}&return=${back}` };
  }

  async fetchOrderState(order: Order): Promise<GatewayOrderState> {
    return {
      status: order.status === "paid" ? "paid" : order.status === "failed" ? "failed" : "pending",
      gatewayPaymentId: order.gatewayPaymentId,
      method: order.method,
    };
  }

  parseWebhook(): never {
    throw new Error("The mock gateway has no webhooks");
  }
}
