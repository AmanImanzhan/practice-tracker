import { repositories } from '../repositories';
import type { SocialSignInResult } from '../repositories/interfaces/AuthRepository';

/** Creates the profile row on this account's very first social sign-in. On every
 *  sign-in after that the row already exists, so there's nothing to do — the
 *  auth-state subscription in authStore picks up the new session on its own and
 *  RootNavigator swaps to the main tab navigator automatically. Shared by Sign Up and
 *  Login, since a brand-new user can tap Continue with Apple/Google from either. */
export async function ensureProfileForSocialSignIn({ user: authUser, fullName }: SocialSignInResult): Promise<void> {
  const existingProfile = await repositories.users.getProfile(authUser.id);
  if (existingProfile) return;

  await repositories.users.saveProfile({
    id: authUser.id,
    email: authUser.email,
    name: fullName ?? '',
    practiceGoal: null,
    instrument: null,
    theme: 'classical',
    unlocked: false,
    pushNotificationsEnabled: true,
    dailyReminderEnabled: false,
    dailyReminderTime: '09:00',
    sessionTimerAlertsEnabled: true,
  });
}
