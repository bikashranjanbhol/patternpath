import type { Metadata } from "next";
import { Suspense } from "react";
import { PaymentResult } from "./payment-result";

export const metadata: Metadata = { title: "Payment" };

export default function ResultPage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-20">
      <Suspense fallback={<p className="text-center text-muted">Checking your payment…</p>}>
        <PaymentResult />
      </Suspense>
    </main>
  );
}
