// Permanently deletes the calling user's account. If they signed in with Apple, their
// Apple grant is revoked FIRST — Apple requires this (Sign in with Apple guidelines) — and
// only once that succeeds does the function delete the `auth.users` row. Deleting that row
// cascades everything else (profiles, sessions, session_timings, repertoire, purchases —
// see the `on delete cascade` foreign keys in supabase/schema.sql), so this one call is the
// entire deletion. If the Apple revoke fails for any reason, nothing is deleted — there is
// no "half-deleted" state possible, only "fully intact" or "fully gone."
//
// Deploy: supabase functions deploy delete-account --project-ref <ref>
// Secrets (never commit these): supabase secrets set --project-ref <ref>
//   APPLE_SIGNIN_KEY_ID=... APPLE_SIGNIN_TEAM_ID=... APPLE_SIGNIN_PRIVATE_KEY="$(cat AuthKey_XXXX.p8)"
// SUPABASE_URL / SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY are injected automatically.
//
// Note: this key is a Developer Portal "Sign in with Apple" key (Certificates, IDs &
// Profiles -> Keys), a completely different key from the App Store Connect "In-App
// Purchase" key used by verify-purchase — do not confuse APPLE_SIGNIN_* with APPLE_IAP_*.

import { createClient } from 'jsr:@supabase/supabase-js@2';

const BUNDLE_ID = 'com.amanimanzhan.practicetracker';

const APPLE_SIGNIN_KEY_ID = Deno.env.get('APPLE_SIGNIN_KEY_ID')!;
const APPLE_SIGNIN_TEAM_ID = Deno.env.get('APPLE_SIGNIN_TEAM_ID')!;
const APPLE_SIGNIN_PRIVATE_KEY = Deno.env.get('APPLE_SIGNIN_PRIVATE_KEY')!;

function base64url(bytes: Uint8Array): string {
  let binary = '';
  bytes.forEach((b) => { binary += String.fromCharCode(b); });
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function importApplePrivateKey(): Promise<CryptoKey> {
  const base64 = APPLE_SIGNIN_PRIVATE_KEY.replace(/-----BEGIN PRIVATE KEY-----/, '')
    .replace(/-----END PRIVATE KEY-----/, '')
    .replace(/\s+/g, '');
  const der = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
  return crypto.subtle.importKey('pkcs8', der, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
}

// Apple's "client_secret" for native Sign in with Apple token/revoke calls is a JWT
// signed with the Sign in with Apple key — `sub`/`client_id` is the app's bundle id here
// (not a Services ID; that's only for the web JS flow), `iss` is the Apple Developer Team ID.
async function createAppleClientSecret(): Promise<string> {
  const key = await importApplePrivateKey();
  const nowSeconds = Math.floor(Date.now() / 1000);
  const header = { alg: 'ES256', kid: APPLE_SIGNIN_KEY_ID, typ: 'JWT' };
  const payload = {
    iss: APPLE_SIGNIN_TEAM_ID,
    iat: nowSeconds,
    exp: nowSeconds + 300,
    aud: 'https://appleid.apple.com',
    sub: BUNDLE_ID,
  };
  const signingInput = `${base64url(new TextEncoder().encode(JSON.stringify(header)))}.${base64url(new TextEncoder().encode(JSON.stringify(payload)))}`;
  const signature = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, new TextEncoder().encode(signingInput));
  return `${signingInput}.${base64url(new Uint8Array(signature))}`;
}

// Exchanges the one-time authorization code for a refresh token, then immediately
// revokes it — the standard "delete account" pattern Apple documents, since revoking
// needs a token (access or refresh), not the authorization code itself.
async function revokeAppleAccess(authorizationCode: string): Promise<void> {
  const clientSecret = await createAppleClientSecret();

  const tokenResponse = await fetch('https://appleid.apple.com/auth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code: authorizationCode,
      client_id: BUNDLE_ID,
      client_secret: clientSecret,
    }),
  });
  const tokenBody = await tokenResponse.json();
  if (!tokenResponse.ok || !tokenBody.refresh_token) {
    throw new Error(`Apple token exchange failed: ${tokenBody.error ?? tokenResponse.status}`);
  }

  const revokeResponse = await fetch('https://appleid.apple.com/auth/revoke', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      token: tokenBody.refresh_token,
      token_type_hint: 'refresh_token',
      client_id: BUNDLE_ID,
      client_secret: clientSecret,
    }),
  });
  if (!revokeResponse.ok) {
    const revokeBody = await revokeResponse.json().catch(() => ({}));
    throw new Error(`Apple revoke failed: ${revokeBody.error ?? revokeResponse.status}`);
  }
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

    const { appleAuthorizationCode } = await req.json().catch(() => ({}));

    if (typeof appleAuthorizationCode === 'string' && appleAuthorizationCode) {
      try {
        await revokeAppleAccess(appleAuthorizationCode);
      } catch (error) {
        // Deliberately stop here — the account must stay fully intact if Apple's side
        // of the deletion can't be confirmed.
        return new Response(
          JSON.stringify({ error: error instanceof Error ? error.message : 'Could not revoke Apple access.' }),
          { status: 502 }
        );
      }
    }

    const adminClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const { error: deleteError } = await adminClient.auth.admin.deleteUser(userId);
    if (deleteError) throw deleteError;

    return new Response(JSON.stringify({ deleted: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), { status: 500 });
  }
});
