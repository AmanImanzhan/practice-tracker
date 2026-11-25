import { FunctionsHttpError, type User } from '@supabase/supabase-js';
import * as AppleAuthentication from 'expo-apple-authentication';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import * as Crypto from 'expo-crypto';
import { supabase } from '../../lib/supabase';
import type {
  AuthCredentials,
  AuthRepository,
  AuthUser,
  SignInProvider,
  SocialSignInResult,
} from '../interfaces/AuthRepository';

// A stable code screens check to tell "the user cancelled" apart from a real failure,
// reused across every provider (Apple/Google sign-in, IAP) that can be dismissed by the
// user rather than actually failing.
export const USER_CANCELLED_CODE = 'ERR_REQUEST_CANCELED';

function toAuthUser(user: User | null | undefined): AuthUser | null {
  // Apple sign-in accounts can legitimately have no email on record — don't reject
  // them, just fall back to empty (fillable later from Edit Profile).
  if (!user) return null;
  return { id: user.id, email: user.email ?? '' };
}

export class SupabaseAuthRepository implements AuthRepository {
  async signUp({ email, password }: AuthCredentials): Promise<AuthUser> {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;

    const user = toAuthUser(data.user);
    if (!user) {
      throw new Error('Sign up succeeded but no user was returned.');
    }
    return user;
  }

  async signIn({ email, password }: AuthCredentials): Promise<AuthUser> {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;

    const user = toAuthUser(data.user);
    if (!user) {
      throw new Error('Sign in succeeded but no user was returned.');
    }
    return user;
  }

  async signOut(): Promise<void> {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  }

  async getCurrentUser(): Promise<AuthUser | null> {
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    return toAuthUser(data.session?.user);
  }

  onAuthStateChange(callback: (user: AuthUser | null) => void): () => void {
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      callback(toAuthUser(session?.user));
    });
    return () => data.subscription.unsubscribe();
  }

  async signInWithGoogle(): Promise<SocialSignInResult> {
    GoogleSignin.configure({
      webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
      iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
    });

    const response = await GoogleSignin.signIn();
    if (response.type === 'cancelled') {
      throw Object.assign(new Error('Google sign-in was cancelled.'), { code: USER_CANCELLED_CODE });
    }

    const { idToken, user: googleUser } = response.data;
    if (!idToken) {
      throw new Error('Google sign-in did not return an ID token.');
    }

    const { data, error } = await supabase.auth.signInWithIdToken({
      provider: 'google',
      token: idToken,
    });
    if (error) throw error;

    const user = toAuthUser(data.user);
    if (!user) {
      throw new Error('Google sign-in succeeded but no user was returned.');
    }

    return { user, fullName: googleUser.name };
  }

  async signInWithApple(): Promise<SocialSignInResult> {
    // Confirmed on a real device: this native module isn't present in plain Expo Go
    // (contrary to Expo's own docs) — Sign in with Apple needs a custom dev client.
    // isAvailableAsync() itself is hardcoded to return true in the module's native iOS
    // code, so `false` here only ever means the native module wasn't found at all.
    const isAvailable = await AppleAuthentication.isAvailableAsync();
    if (!isAvailable) {
      throw new Error('Sign in with Apple requires a development build — it is not available in Expo Go.');
    }

    // Apple requires the nonce it signs into the identity token to be a hash of a raw
    // value only the client knows — Supabase re-hashes the raw nonce we send it and
    // compares against the token's own nonce claim to confirm the token wasn't replayed.
    const rawNonce = Crypto.randomUUID();
    const hashedNonce = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, rawNonce, {
      encoding: Crypto.CryptoEncoding.HEX,
    });

    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
      nonce: hashedNonce,
    });

    if (!credential.identityToken) {
      throw new Error('Apple sign-in did not return an identity token.');
    }

    const { data, error } = await supabase.auth.signInWithIdToken({
      provider: 'apple',
      token: credential.identityToken,
      nonce: rawNonce,
    });
    if (error) throw error;

    const user = toAuthUser(data.user);
    if (!user) {
      throw new Error('Apple sign-in succeeded but no user was returned.');
    }

    const fullName = credential.fullName
      ? [credential.fullName.givenName, credential.fullName.familyName].filter(Boolean).join(' ').trim() || null
      : null;

    return { user, fullName };
  }

  async getSignInProvider(): Promise<SignInProvider | null> {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) return null;
    const provider = data.user.app_metadata.provider;
    return provider === 'apple' || provider === 'google' || provider === 'email' ? provider : null;
  }

  async requestAppleAuthorizationCode(): Promise<string> {
    const credential = await AppleAuthentication.signInAsync();
    if (!credential.authorizationCode) {
      throw new Error('Apple did not return an authorization code.');
    }
    return credential.authorizationCode;
  }

  async revokeGoogleAccess(): Promise<void> {
    try {
      GoogleSignin.configure({
        webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
        iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
      });
      await GoogleSignin.revokeAccess();
      await GoogleSignin.signOut();
    } catch (error) {
      // By the time this runs, the account is already gone server-side — a stray
      // Google grant left behind is a minor cleanup miss, not worth surfacing.
      console.warn('Could not revoke Google access after account deletion', error);
    }
  }

  async deleteAccount(appleAuthorizationCode?: string): Promise<void> {
    const { error } = await supabase.functions.invoke('delete-account', {
      body: appleAuthorizationCode ? { appleAuthorizationCode } : {},
    });
    if (!error) return;

    // supabase-js only puts a generic "non-2xx status" message on a FunctionsHttpError —
    // the function's own {error: "..."} body (why deletion was refused) is on its
    // `context` Response instead, which is what the Edge Function actually put there.
    if (error instanceof FunctionsHttpError) {
      const body = await error.context.json().catch(() => null);
      throw new Error(body?.error ?? error.message);
    }
    throw error;
  }

  async requestPasswordReset(email: string): Promise<void> {
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    if (error) throw error;
  }

  async confirmPasswordReset(email: string, code: string, newPassword: string): Promise<void> {
    const { error: verifyError } = await supabase.auth.verifyOtp({ email, token: code, type: 'recovery' });
    if (verifyError) throw verifyError;

    const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
    if (updateError) throw updateError;
  }
}
