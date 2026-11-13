/** Only allow same-site relative paths as a place to return to after sign-in or payment. */
export function safeNext(next: string | null | undefined, fallback = "/patterns") {
  return next && next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/\\")
    ? next
    : fallback;
}
