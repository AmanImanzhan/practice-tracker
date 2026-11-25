export interface AuthUser {
  id: string;
  email: string;
}

export interface AuthCredentials {
  email: string;
  password: string;
}

export interface SocialSignInResult {
  user: AuthUser;
  /** Apple only returns the person's name on the very first authorization ever granted
   *  to this app — null on every sign-in after that. Google returns it every time. */
  fullName: string | null;
}

export type SignInProvider = 'apple' | 'google' | 'email';

export interface AuthRepository {
  signUp(credentials: AuthCredentials): Promise<AuthUser>;
  signIn(credentials: AuthCredentials): Promise<AuthUser>;
  signOut(): Promise<void>;
  getCurrentUser(): Promise<AuthUser | null>;
  /** Returns an unsubscribe function. */
  onAuthStateChange(callback: (user: AuthUser | null) => void): () => void;
  signInWithGoogle(): Promise<SocialSignInResult>;
  signInWithApple(): Promise<SocialSignInResult>;
  /** Which provider this account originally signed up with — decides which cleanup
   *  (Apple revoke / Google revoke) account deletion needs to do. */
  getSignInProvider(): Promise<SignInProvider | null>;
  /** Re-prompts the native "Sign in with Apple" sheet to obtain a fresh, single-use
   *  authorization code — Apple has no silent way to mint one, this always shows UI.
   *  Throws with code ERR_REQUEST_CANCELED if the user dismisses the sheet. */
  requestAppleAuthorizationCode(): Promise<string>;
  /** Best-effort client-side Google OAuth revoke + sign-out. Never throws — by the time
   *  this is called the server-side account deletion has already succeeded, so a failure
   *  here is a minor cleanup miss, not a data-integrity problem. */
  revokeGoogleAccess(): Promise<void>;
  /** Calls the delete-account Edge Function, which revokes Apple access (if
   *  `appleAuthorizationCode` is given) and only then permanently deletes the account —
   *  all other rows cascade from the `auth.users` row via foreign keys. If the Apple
   *  revoke fails, the function deletes nothing and this rejects. */
  deleteAccount(appleAuthorizationCode?: string): Promise<void>;
  /** Sends a 6-digit recovery code to `email` via Supabase's "Reset Password" email
   *  template. Resolves even if the address has no account — Supabase never reveals
   *  that, by design. */
  requestPasswordReset(email: string): Promise<void>;
  /** Verifies the code from that email and sets `newPassword` in one step. */
  confirmPasswordReset(email: string, code: string, newPassword: string): Promise<void>;
}
