import { cookies } from "next/headers";
import { z } from "zod";
import { isLocalMode } from "@/lib/config";
import { accountStore } from "@/lib/data/store";
import { createDevSessionToken, SESSION_COOKIE, sessionCookieOptions } from "@/lib/session";

const Body = z.object({ premium: z.boolean().optional() });

/**
 * Local mode only: signs in a fake "Dev Learner" so the app can be tried
 * without a Firebase project. Pass { premium: true } to start with Premium.
 */
export async function POST(request: Request) {
  if (!isLocalMode()) return new Response("Not found", { status: 404 });
  const { premium } = Body.parse(await request.json().catch(() => ({})));

  const uid = "dev-learner";
  await (await accountStore()).ensureUser({ uid, name: "Dev Learner", email: "dev@example.com", photoUrl: null });
  const premiumUntil = premium ? Date.now() + 30 * 24 * 3600 * 1000 : null;

  (await cookies()).set(
    SESSION_COOKIE,
    createDevSessionToken({ uid, name: "Dev Learner", email: "dev@example.com", premiumUntil }),
    sessionCookieOptions,
  );
  return Response.json({ ok: true });
}
