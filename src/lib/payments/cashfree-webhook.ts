// Cashfree webhook parsing and signature check. Kept free of server-only
// imports so it can be unit tested.
//
// Signature (Cashfree docs, "Webhook payloads and signatures"):
//   expected = Base64( HMAC-SHA256( x-webhook-timestamp + rawBody, clientSecret ) )
// compared with the x-webhook-signature header. Always use the raw body.

import { createHmac, timingSafeEqual } from "node:crypto";
import type { WebhookEvent } from "./gateway";

export class WebhookSignatureError extends Error {}

export function cashfreeSignature(timestamp: string, rawBody: string, secret: string) {
  return createHmac("sha256", secret).update(timestamp + rawBody).digest("base64");
}

export function verifyCashfreeSignature(
  rawBody: string,
  timestamp: string | null,
  signature: string | null,
  secret: string,
) {
  if (!timestamp || !signature || !secret) throw new WebhookSignatureError("missing signature");
  const expected = Buffer.from(cashfreeSignature(timestamp, rawBody, secret));
  const given = Buffer.from(signature);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) {
    throw new WebhookSignatureError("bad signature");
  }
}

interface CashfreePayload {
  type?: string;
  data?: {
    order?: { order_id?: string; order_amount?: number };
    payment?: {
      cf_payment_id?: number | string;
      payment_status?: string;
      payment_amount?: number;
      payment_group?: string;
      payment_method?: unknown;
    };
  };
}

function methodOf(p: NonNullable<CashfreePayload["data"]>["payment"]): string | null {
  if (!p) return null;
  if (p.payment_group) return p.payment_group;
  if (typeof p.payment_method === "string") return p.payment_method;
  if (p.payment_method && typeof p.payment_method === "object") {
    return Object.keys(p.payment_method)[0] ?? null;
  }
  return null;
}

export function parseCashfreeWebhook(
  rawBody: string,
  headers: Headers,
  secret: string,
): WebhookEvent {
  verifyCashfreeSignature(
    rawBody,
    headers.get("x-webhook-timestamp"),
    headers.get("x-webhook-signature"),
    secret,
  );
  const body = JSON.parse(rawBody) as CashfreePayload;
  const rawType = body.type ?? "";
  const status = body.data?.payment?.payment_status ?? "";
  const type: WebhookEvent["type"] =
    rawType.startsWith("PAYMENT_SUCCESS") && status === "SUCCESS"
      ? "payment_success"
      : rawType.startsWith("PAYMENT_FAILED")
        ? "payment_failed"
        : "other";
  const orderId = body.data?.order?.order_id ?? null;
  const paymentId = body.data?.payment?.cf_payment_id;
  const amount = body.data?.payment?.payment_amount ?? body.data?.order?.order_amount;
  return {
    key: `cf_${orderId ?? "none"}_${paymentId ?? "none"}_${rawType || "unknown"}`,
    type,
    orderId,
    gatewayPaymentId: paymentId === undefined ? null : String(paymentId),
    method: methodOf(body.data?.payment),
    amountPaise: typeof amount === "number" ? Math.round(amount * 100) : null,
  };
}
