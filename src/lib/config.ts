import "server-only";

/**
 * Server configuration, read from environment variables.
 *
 * DATA_SOURCE=local runs the whole app from the seed content with in-memory
 * users and orders, so you can try it without a Firebase project.
 * PAYMENT_GATEWAY=mock replaces Cashfree with a local "pay" screen.
 */
export const config = {
  dataSource: (process.env.DATA_SOURCE ?? "local") as "local" | "firestore",
  paymentGateway: (process.env.PAYMENT_GATEWAY ?? "mock") as "mock" | "cashfree",
  appUrl: process.env.APP_URL ?? "http://localhost:3000",
  sessionDays: 5,
  /** Used to sign the dev-mode session cookie when DATA_SOURCE=local. */
  devSessionSecret: process.env.DEV_SESSION_SECRET ?? "dev-only-not-a-secret",
  cashfree: {
    env: (process.env.CASHFREE_ENV ?? "sandbox") as "sandbox" | "production",
    clientId: process.env.CASHFREE_CLIENT_ID ?? "",
    clientSecret: process.env.CASHFREE_CLIENT_SECRET ?? "",
    apiVersion: process.env.CASHFREE_API_VERSION ?? "2026-01-01",
  },
} as const;

export function isLocalMode() {
  return config.dataSource === "local";
}

/**
 * The mock gateway lets anyone "pay" without money, so it only runs with
 * local data, or when explicitly allowed for a staging project.
 */
export function mockPaymentsAllowed() {
  return isLocalMode() || process.env.ALLOW_MOCK_PAYMENTS === "true";
}
