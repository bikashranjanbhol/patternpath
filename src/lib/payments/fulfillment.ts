import "server-only";
import { isLocalMode } from "@/lib/config";
import { accountStore, type PaymentInfo } from "@/lib/data/store";

/**
 * Marks the order paid, extends Premium, and copies the new end date into the
 * user's sign-in token as a custom claim. Safe to call more than once.
 */
export async function fulfillPaidOrder(orderId: string, payment: PaymentInfo) {
  const store = await accountStore();
  const result = await store.fulfillOrder(orderId, payment, Date.now());
  if (result.changed && !isLocalMode()) {
    const { adminAuth } = await import("@/lib/firebase/admin");
    const auth = adminAuth();
    const current = (await auth.getUser(result.user.uid)).customClaims ?? {};
    await auth.setCustomUserClaims(result.user.uid, {
      ...current,
      premiumUntil: result.user.plan.premiumUntil,
    });
  }
  return result;
}
