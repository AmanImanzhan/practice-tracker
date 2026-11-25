import {
  ErrorCode,
  fetchProducts,
  finishTransaction,
  getAvailablePurchases,
  initConnection,
  purchaseErrorListener,
  purchaseUpdatedListener,
  requestPurchase,
  restorePurchases as restoreStorePurchases,
  type Purchase,
} from 'expo-iap';
import { supabase } from '../lib/supabase';
import { FULL_ACCESS_SKU } from '../lib/iap';
import { USER_CANCELLED_CODE } from './supabase/SupabaseAuthRepository';
import type { PurchaseRepository } from './interfaces/PurchaseRepository';

// initConnection() must run before any other IAP call, and only needs to happen once
// for the app's lifetime — cached so repeated purchase/restore calls don't repeat it.
let connectionReady: Promise<void> | null = null;
function ensureConnection(): Promise<void> {
  if (!connectionReady) {
    connectionReady = initConnection().then(() => undefined);
  }
  return connectionReady;
}

function transactionIdOf(purchase: Purchase): string {
  // Only iOS purchases exist in this app (no Android build yet), and PurchaseIOS always
  // carries transactionId — this cast just narrows past the PurchaseAndroid half of the
  // union, which doesn't have that field at all.
  return (purchase as { transactionId: string }).transactionId;
}

async function verifyOnServer(purchase: Purchase): Promise<void> {
  const { error } = await supabase.functions.invoke('verify-purchase', {
    body: { transactionId: transactionIdOf(purchase) },
  });
  if (error) throw error;
}

export class ExpoIapPurchaseRepository implements PurchaseRepository {
  async purchaseFullAccess(): Promise<void> {
    await ensureConnection();

    // requestPurchase() looks the SKU up in the native module's own product cache,
    // which is only populated by fetchProducts() — skipping this makes every purchase
    // fail with ErrorCode.SkuNotFound even for a perfectly real, live product.
    const products = await fetchProducts({ skus: [FULL_ACCESS_SKU], type: 'in-app' });
    if (!products?.some((product) => product.id === FULL_ACCESS_SKU)) {
      throw new Error(
        'Full Access is not available for purchase right now. If you just created this product in App Store Connect, it can take a few hours to propagate — try again later.'
      );
    }

    await new Promise<void>((resolve, reject) => {
      const updateSub = purchaseUpdatedListener(async (purchase) => {
        if (purchase.productId !== FULL_ACCESS_SKU) return;
        cleanup();
        try {
          await verifyOnServer(purchase);
          await finishTransaction({ purchase, isConsumable: false });
          resolve();
        } catch (error) {
          reject(error);
        }
      });

      const errorSub = purchaseErrorListener((error) => {
        cleanup();
        if (error.code === ErrorCode.UserCancelled) {
          reject(Object.assign(new Error('Purchase was cancelled.'), { code: USER_CANCELLED_CODE }));
        } else {
          reject(new Error(error.message));
        }
      });

      function cleanup() {
        updateSub.remove();
        errorSub.remove();
      }

      requestPurchase({ request: { apple: { sku: FULL_ACCESS_SKU } }, type: 'in-app' }).catch((error) => {
        cleanup();
        reject(error);
      });
    });
  }

  async restoreFullAccess(): Promise<boolean> {
    await ensureConnection();
    await restoreStorePurchases();

    const purchases = await getAvailablePurchases();
    const purchase = purchases.find((p) => p.productId === FULL_ACCESS_SKU);
    if (!purchase) return false;

    await verifyOnServer(purchase);
    try {
      await finishTransaction({ purchase, isConsumable: false });
    } catch {
      // Already finished by a previous run — not worth surfacing.
    }
    return true;
  }

  async getFullAccessPriceLabel(): Promise<string | null> {
    // Only a successful lookup is cached — a transient failure (offline at launch, say)
    // must not permanently stick the UI with a price-less label for the rest of the session.
    if (cachedPriceLabel) return cachedPriceLabel;
    cachedPriceLabel = await fetchFullAccessPriceLabel();
    return cachedPriceLabel;
  }
}

let cachedPriceLabel: string | null = null;
async function fetchFullAccessPriceLabel(): Promise<string | null> {
  try {
    await ensureConnection();
    const products = await fetchProducts({ skus: [FULL_ACCESS_SKU], type: 'in-app' });
    const product = products?.find((p) => p.id === FULL_ACCESS_SKU);
    return (product as { displayPrice?: string } | undefined)?.displayPrice ?? null;
  } catch {
    // Offline, store unreachable, etc. — caller falls back to a price-less label.
    return null;
  }
}
