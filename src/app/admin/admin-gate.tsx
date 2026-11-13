import Link from "next/link";
import type { ReactNode } from "react";
import { isLocalMode } from "@/lib/config";
import { getAdmin } from "@/lib/session";
import type { Viewer } from "@/lib/types";

/** Renders children only for admins. Use inside a <Suspense> boundary. */
export async function AdminGate({ children }: { children: (admin: Viewer) => ReactNode }) {
  const admin = await getAdmin();
  if (!admin) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-4 py-24 text-center">
        <h1 className="font-display text-3xl font-bold">Admins only</h1>
        <p className="text-muted">
          {isLocalMode()
            ? "Use “Dev sign-in (Admin)” on the sign-in page."
            : "Ask an existing admin to run npm run make-admin with your email, then sign in again."}
        </p>
        <Link href="/login?next=/admin" className="rounded-xl bg-lime px-5 py-3 font-semibold text-bg">
          Sign in
        </Link>
      </div>
    );
  }
  return <>{children(admin)}</>;
}

/** Where saves go, shown at the top of every admin page. */
export function StorageNote() {
  const local = isLocalMode();
  const readOnly = local && !!process.env.VERCEL;
  return (
    <p
      className={`rounded-xl border px-4 py-3 text-sm ${
        readOnly ? "border-amber/40 bg-amber/10 text-[#f5d38b]" : "border-line-2 bg-surface text-muted"
      }`}
    >
      {readOnly
        ? "Demo deployment: saving is off here. Run the app locally to save into content/authored, or use “Download JSON” and add the file to the repo."
        : local
          ? "Demo mode: saving writes JSON files to content/authored/. Commit and push them to publish."
          : "Saving writes to Firestore. Changes are live on the next page visit."}
    </p>
  );
}
