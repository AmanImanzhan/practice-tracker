import { isAuthApiError, isAuthRetryableFetchError } from '@supabase/supabase-js';

export type AuthErrorKind = 'invalidCredentials' | 'network' | 'unknown';

/** Classifies a thrown Supabase auth error into a bucket a screen can map to its own
 *  friendly wording — callers should never show `error.message` directly to the user.
 *  Always logs the real error for debugging first. */
export function classifyAuthError(error: unknown): AuthErrorKind {
  console.warn('Auth error:', error);
  // A fetch-level failure (no connectivity, DNS, timeout) — the request never got a
  // response from Supabase at all.
  if (isAuthRetryableFetchError(error)) return 'network';
  // A response Supabase's own API returned — for signIn this is virtually always
  // "Invalid login credentials"; for verifyOtp it's an incorrect/expired code.
  if (isAuthApiError(error)) return 'invalidCredentials';
  return 'unknown';
}
