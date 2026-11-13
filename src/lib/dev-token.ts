import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { config } from "@/lib/config";

// Signed JSON tokens for local/demo mode (DATA_SOURCE=local). They let the
// demo run on serverless hosts such as Vercel, where server memory is not
// shared between requests: the session and test orders travel in signed
// cookies and IDs instead. Never used with real data.

function sign(data: string) {
  return createHmac("sha256", config.devSessionSecret).update(data).digest("base64url");
}

export function signJson(value: unknown): string {
  const body = Buffer.from(JSON.stringify(value)).toString("base64url");
  return `${body}.${sign(body)}`;
}

export function readJson<T>(token: string): T | null {
  const dot = token.lastIndexOf(".");
  if (dot <= 0) return null;
  const body = token.slice(0, dot);
  const expected = Buffer.from(sign(body));
  const given = Buffer.from(token.slice(dot + 1));
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  try {
    return JSON.parse(Buffer.from(body, "base64url").toString()) as T;
  } catch {
    return null;
  }
}
