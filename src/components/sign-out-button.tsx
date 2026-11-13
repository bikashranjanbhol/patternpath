"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

export function SignOutButton() {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        start(async () => {
          if (process.env.NEXT_PUBLIC_FIREBASE_API_KEY) {
            const { signOutEverywhere } = await import("@/lib/firebase/client");
            await signOutEverywhere();
          } else {
            await fetch("/api/session", { method: "DELETE" });
          }
          router.refresh();
        })
      }
      className="min-h-11 rounded-xl border border-line-2 px-3 text-sm text-muted hover:text-ink"
    >
      Sign out
    </button>
  );
}
