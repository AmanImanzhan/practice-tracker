export interface PurchaseRepository {
  /** Runs the native "Full Access" purchase flow and waits for server-side verification
   *  before resolving. Throws with code USER_CANCELLED_CODE (see AuthRepository) if the
   *  user dismisses Apple's purchase sheet. */
  purchaseFullAccess(): Promise<void>;
  /** Re-checks the store for a previously completed "Full Access" purchase (e.g. after a
   *  reinstall) and re-verifies it server-side. Resolves to whether one was found. */
  restoreFullAccess(): Promise<boolean>;
  /** The store's own localized price string for "Full Access" (e.g. "€9.99", "$9.99",
   *  "¥1,500") — varies by the user's storefront, so it must never be hardcoded. Resolves
   *  to null if the product can't be fetched right now (e.g. offline). */
  getFullAccessPriceLabel(): Promise<string | null>;
}
