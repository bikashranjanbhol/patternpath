import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { config } from "@/lib/config";
import { MockPay } from "./mock-pay";

export const metadata: Metadata = { title: "Test payment" };

/** Stand-in for the gateway's checkout when PAYMENT_GATEWAY=mock. */
export default function MockCheckoutPage() {
  if (config.paymentGateway !== "mock") notFound();
  return (
    <main className="mx-auto max-w-md px-6 py-20">
      <Suspense fallback={null}>
        <MockPay />
      </Suspense>
    </main>
  );
}
