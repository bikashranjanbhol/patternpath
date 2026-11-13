import "server-only";
import { cookies } from "next/headers";
import { connection } from "next/server";
import { config, isLocalMode } from "@/lib/config";
import { readJson, signJson } from "@/lib/dev-token";
import { accountStore } from "@/lib/data/store";
import { isPremiumActive } from "@/lib/pricing";
import type { Viewer } from "@/lib/types";

// `__session` is the one cookie name Firebase hosting products always forward.
export const SESSION_COOKIE = "__session";
export const SESSION_MAX_AGE_S = config.sessionDays * 24 * 60 * 60;

export const sessionCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: SESSION_MAX_AGE_S,
};

// ---- Dev sessions (DATA_SOURCE=local only) --------------------------------
// The whole session, including the Premium end date, lives in a signed cookie
// so the demo works on serverless hosts without a database.

interface DevPayload {
  uid: string;
  name: string;
  email: string;
  premiumUntil: number | null;
  role?: "user" | "admin";
  exp: number;
}

export function createDevSessionToken(p: Omit<DevPayload, "exp">) {
  return signJson({ ...p, exp: Date.now() + SESSION_MAX_AGE_S * 1000 } satisfies DevPayload);
}

function readDevSessionToken(token: string): DevPayload | null {
  const payload = readJson<DevPayload>(token);
  return payload && payload.exp > Date.now() ? payload : null;
}

// ---- Firebase sessions -----------------------------------------------------

/**
 * Creates a Firebase session cookie from a fresh Google sign-in ID token and
 * makes sure users/{uid} exists.
 */
export async function createFirebaseSession(idToken: string, currentSessionCookie?: string) {
  const { adminAuth } = await import("@/lib/firebase/admin");
  const auth = adminAuth();
  const decoded = await auth.verifyIdToken(idToken, true);
  // Only accept a recent sign-in, as Firebase recommends for session cookies,
  // unless this is a refresh by someone who already holds a valid session
  // for the same account (used after a purchase to pick up the new claim).
  if (Date.now() / 1000 - decoded.auth_time > 5 * 60) {
    const current = currentSessionCookie
      ? await auth.verifySessionCookie(currentSessionCookie, true).catch(() => null)
      : null;
    if (!current || current.uid !== decoded.uid) throw new Error("recent_sign_in_required");
  }
  if (decoded.firebase.sign_in_provider !== "google.com") {
    throw new Error("google_only");
  }
  await (await accountStore()).ensureUser({
    uid: decoded.uid,
    name: decoded.name ?? decoded.email ?? "Learner",
    email: decoded.email ?? "",
    photoUrl: decoded.picture ?? null,
  });
  return auth.createSessionCookie(idToken, { expiresIn: SESSION_MAX_AGE_S * 1000 });
}

/**
 * The signed-in person for this request, or null. Reads the session cookie,
 * so call it only inside a <Suspense> boundary or a route handler.
 *
 * `premiumUntil` comes from the token's custom claim (no database read).
 * A claim can be stale right after a purchase; use `hasPremium()` before
 * deciding to lock something.
 */
export async function getViewer(opts: { checkRevoked?: boolean } = {}): Promise<Viewer | null> {
  // Session checks compare expiry times with the clock, so they must run per
  // request, never during prerendering (including runtime prefetches).
  await connection();
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;

  if (isLocalMode()) {
    const p = readDevSessionToken(token);
    if (!p) return null;
    return {
      uid: p.uid,
      name: p.name,
      email: p.email,
      photoUrl: null,
      role: p.role === "admin" ? "admin" : "user",
      premiumUntil: p.premiumUntil,
    };
  }

  try {
    const { adminAuth } = await import("@/lib/firebase/admin");
    const c = await adminAuth().verifySessionCookie(token, opts.checkRevoked ?? false);
    return {
      uid: c.uid,
      name: (c.name as string | undefined) ?? c.email ?? "Learner",
      email: c.email ?? "",
      photoUrl: (c.picture as string | undefined) ?? null,
      role: c.admin === true ? "admin" : "user",
      premiumUntil: typeof c.premiumUntil === "number" ? c.premiumUntil : null,
    };
  } catch {
    return null;
  }
}

/**
 * True if the viewer has Premium now. Trusts an active claim; otherwise does
 * one user-document read, so a purchase is honoured even before the session
 * cookie is refreshed.
 */
export async function hasPremium(viewer: Viewer | null, now = Date.now()): Promise<boolean> {
  if (!viewer) return false;
  if (isPremiumActive(viewer.premiumUntil, now)) return true;
  if (isLocalMode()) return false; // the dev cookie is the source of truth
  const user = await (await accountStore()).getUser(viewer.uid);
  return isPremiumActive(user?.plan.premiumUntil ?? null, now);
}

/** Premium according to the session alone (no database read). */
export function viewerHasActiveClaim(viewer: Viewer, now = Date.now()) {
  return isPremiumActive(viewer.premiumUntil, now);
}

/** The viewer if they are an admin, otherwise null. */
export async function getAdmin(): Promise<Viewer | null> {
  const viewer = await getViewer({ checkRevoked: true });
  return viewer?.role === "admin" ? viewer : null;
}
