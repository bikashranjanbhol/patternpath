// Minimal types for the parts of Cashfree.js we use.
// https://www.cashfree.com/docs/payments/online/element/sdks
declare module "@cashfreepayments/cashfree-js" {
  export interface CashfreeCheckoutOptions {
    paymentSessionId: string;
    redirectTarget?: "_self" | "_blank" | "_top" | "_modal" | HTMLElement;
  }
  export interface CashfreeInstance {
    checkout(options: CashfreeCheckoutOptions): Promise<unknown>;
  }
  export function load(options: { mode: "sandbox" | "production" }): Promise<CashfreeInstance>;
}
