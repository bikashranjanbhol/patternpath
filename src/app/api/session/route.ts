import { cookies } from "next/headers";
import { z } from "zod";
import { isLocalMode } from "@/lib/config";
import { createFirebaseSession, SESSION_COOKIE, sessionCookieOptions } from "@/lib/session";

const Body = z.object({ idToken: z.string().min(10) });

/** Exchange a fresh Google sign-in ID token for an http-only session cookie. */
export async function POST(request: Request) {
  if (isLocalMode()) {
    return Response.json({ error: "Use /api/dev/login in local mode" }, { status: 400 });
  }
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "bad_request" }, { status: 400 });

  try {
    const jar = await cookies();
    const cookie = await createFirebaseSession(parsed.data.idToken, jar.get(SESSION_COOKIE)?.value);
    jar.set(SESSION_COOKIE, cookie, sessionCookieOptions);
    return Response.json({ ok: true });
  } catch (e) {
    const code = e instanceof Error ? e.message : "unauthorized";
    return Response.json({ error: code }, { status: 401 });
  }
}

/** Sign out. */
export async function DELETE() {
  (await cookies()).delete(SESSION_COOKIE);
  return Response.json({ ok: true });
}
