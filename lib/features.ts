// Off in 1.0 — Apple's paid-apps agreement isn't active yet. Turn back on in 1.1
// once purchases can actually be processed. Nothing under repositories/ExpoIap*,
// lib/iap.ts, or supabase/functions/verify-purchase is removed — only gated here.
export const PAYWALL_ENABLED = false;
