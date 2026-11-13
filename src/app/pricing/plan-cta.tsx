"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { buttonPremium } from "@/components/ui";

/** Carries ?next= through to checkout so the user returns to the solution. */
export function PlanCta({ planId, hero }: { planId: string; hero: boolean }) {
  const next = useSearchParams().get("next");
  const href = `/checkout?plan=${planId}${next ? `&next=${encodeURIComponent(next)}` : ""}`;
  return (
    <Link
      href={href}
      className={hero ? buttonPremium : "inline-flex min-h-11 items-center justify-center rounded-xl bg-ink px-5 py-3 text-[15px] font-semibold text-bg"}
    >
      Choose plan
    </Link>
  );
}
