import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { config } from "@/lib/config";
import { getPlans } from "@/lib/content";
import { getViewer } from "@/lib/session";
import { safeNext } from "@/lib/urls";
import { CheckoutForm } from "./checkout-form";

export const metadata: Metadata = { title: "Checkout" };

export default function CheckoutPage(props: PageProps<"/checkout">) {
  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <Suspense fallback={<p className="text-muted">Loading checkout…</p>}>
        <CheckoutGate searchParams={props.searchParams} />
      </Suspense>
    </main>
  );
}

async function CheckoutGate({ searchParams }: Pick<PageProps<"/checkout">, "searchParams">) {
  const sp = await searchParams;
  const plan = typeof sp.plan === "string" ? sp.plan : "sprint";
  const next = safeNext(typeof sp.next === "string" ? sp.next : null, "/patterns");
  const viewer = await getViewer();
  if (!viewer) {
    redirect(`/login?next=${encodeURIComponent(`/checkout?plan=${plan}&next=${encodeURIComponent(next)}`)}`);
  }
  const plans = await getPlans();
  return (
    <CheckoutForm
      plans={plans}
      initialPlanId={plans.some((p) => p.id === plan) ? plan : plans[0]?.id}
      next={next}
      email={viewer.email}
      gatewayMode={config.cashfree.env}
    />
  );
}
