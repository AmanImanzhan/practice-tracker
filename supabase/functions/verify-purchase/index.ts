// Verifies a StoreKit 2 transaction with Apple's App Store Server API and, only once
// Apple confirms it's real and belongs to this app's "Full Access" product, flips
// profiles.unlocked for the calling user. This is the only place allowed to do that —
// see the column-privilege revoke on profiles.unlocked in supabase/schema.sql.
//
// Deploy: supabase functions deploy verify-purchase --project-ref <ref>
// Secrets (never commit these): supabase secrets set --project-ref <ref>
//   APPLE_IAP_KEY_ID=... APPLE_IAP_ISSUER_ID=... APPLE_IAP_PRIVATE_KEY="$(cat AuthKey_XXXX.p8)"
// SUPABASE_URL / SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY are injected automatically.

import { createClient } from 'jsr:@supabase/supabase-js@2';

const BUNDLE_ID = 'com.amanimanzhan.practicetracker';
const FULL_ACCESS_PRODUCT_ID = 'com.amanimanzhan.practicetracker.fullaccess';

const APPLE_IAP_KEY_ID = Deno.env.get('APPLE_IAP_KEY_ID')!;
const APPLE_IAP_ISSUER_ID = Deno.env.get('APPLE_IAP_ISSUER_ID')!;
const APPLE_IAP_PRIVATE_KEY = Deno.env.get('APPLE_IAP_PRIVATE_KEY')!;

function base64url(bytes: Uint8Array): string {
  let binary = '';
  bytes.forEach((b) => { binary += String.fromCharCode(b); });
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64urlDecode(input: string): Uint8Array {
  const padded = input.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(input.length / 4) * 4, '=');
  const binary = atob(padded);
  return Uint8Array.from(binary, (c) => c.charCodeAt(0));
}

async function importApplePrivateKey(): Promise<CryptoKey> {
  const base64 = APPLE_IAP_PRIVATE_KEY.replace(/-----BEGIN PRIVATE KEY-----/, '')
    .replace(/-----END PRIVATE KEY-----/, '')
    .replace(/\s+/g, '');
  const der = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
  return crypto.subtle.importKey('pkcs8', der, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
}

// App Store Server API JWTs are short-lived (Apple caps them at 60 minutes) and signed
// with the "In-App Purchase Key" generated in App Store Connect — see the setup notes
// this function's README-equivalent comment above points to.
async function createAppleJwt(): Promise<string> {
  const key = await importApplePrivateKey();
  const nowSeconds = Math.floor(Date.now() / 1000);
  const header = { alg: 'ES256', kid: APPLE_IAP_KEY_ID, typ: 'JWT' };
  const payload = {
    iss: APPLE_IAP_ISSUER_ID,
    iat: nowSeconds,
    exp: nowSeconds + 1200,
    aud: 'appstoreconnect-v1',
    bid: BUNDLE_ID,
  };
  const signingInput = `${base64url(new TextEncoder().encode(JSON.stringify(header)))}.${base64url(new TextEncoder().encode(JSON.stringify(payload)))}`;
  const signature = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, new TextEncoder().encode(signingInput));
  return `${signingInput}.${base64url(new Uint8Array(signature))}`;
}

function decodeJwsPayload(jws: string): Record<string, unknown> {
  const payloadSegment = jws.split('.')[1];
  return JSON.parse(new TextDecoder().decode(base64urlDecode(payloadSegment)));
}

interface AppleTransaction {
  transactionId: string;
  bundleId: string;
  productId: string;
  environment: 'Sandbox' | 'Production';
  revocationDate?: number;
}

// Apple has separate Production and Sandbox base URLs with no way to know in advance
// which one issued a given transaction — the documented approach is to try Production
// first and fall back to Sandbox on a 404, mirroring the old verifyReceipt 21007 dance.
async function fetchAppleTransaction(transactionId: string): Promise<AppleTransaction> {
  const jwt = await createAppleJwt();
  const path = `/inApps/v1/transactions/${transactionId}`;

  for (const base of ['https://api.storekit.itunes.apple.com', 'https://api.storekit-sandbox.itunes.apple.com']) {
    const response = await fetch(`${base}${path}`, { headers: { Authorization: `Bearer ${jwt}` } });
    if (response.status === 404) continue;
    if (!response.ok) {
      throw new Error(`Apple App Store Server API returned ${response.status}`);
    }
    const { signedTransactionInfo } = await response.json();
    return decodeJwsPayload(signedTransactionInfo) as unknown as AppleTransaction;
  }

  throw new Error('Apple has no record of this transaction (checked Production and Sandbox).');
}

Deno.serve(async (req) => {
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing Authorization header.' }), { status: 401 });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const userClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userError } = await userClient.auth.getUser();
    if (userError || !userData.user) {
      return new Response(JSON.stringify({ error: 'Not authenticated.' }), { status: 401 });
    }
    const userId = userData.user.id;

    const { transactionId } = await req.json();
    if (typeof transactionId !== 'string' || !transactionId) {
      return new Response(JSON.stringify({ error: 'Missing transactionId.' }), { status: 400 });
    }

    const transaction = await fetchAppleTransaction(transactionId);

    if (transaction.bundleId !== BUNDLE_ID || transaction.productId !== FULL_ACCESS_PRODUCT_ID) {
      return new Response(JSON.stringify({ error: 'Transaction does not match this product.' }), { status: 400 });
    }
    if (transaction.revocationDate) {
      return new Response(JSON.stringify({ error: 'This purchase was refunded or revoked.' }), { status: 400 });
    }

    const adminClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

    // Reserve the transaction id first (unique constraint) so the same Apple purchase
    // can never unlock two different accounts — belonging to this same user is fine
    // (retry after a dropped response), belonging to someone else is rejected.
    const { error: insertError } = await adminClient.from('purchases').insert({
      user_id: userId,
      product_id: transaction.productId,
      transaction_id: transaction.transactionId,
      environment: transaction.environment,
    });

    if (insertError) {
      if (insertError.code === '23505') {
        const { data: existing } = await adminClient
          .from('purchases')
          .select('user_id')
          .eq('transaction_id', transaction.transactionId)
          .single();
        if (existing && existing.user_id !== userId) {
          return new Response(JSON.stringify({ error: 'This purchase is already tied to a different account.' }), { status: 409 });
        }
        // Same user retrying — fall through and make sure they're unlocked.
      } else {
        throw insertError;
      }
    }

    const { error: updateError } = await adminClient.from('profiles').update({ unlocked: true }).eq('id', userId);
    if (updateError) throw updateError;

    return new Response(JSON.stringify({ unlocked: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), { status: 500 });
  }
});
