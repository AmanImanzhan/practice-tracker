import type { Profile } from '../../types/domain';

export interface UserRepository {
  getProfile(userId: string): Promise<Profile | null>;
  /** Creates the profile row on first save, updates it on every save after (upsert by id). */
  saveProfile(profile: Omit<Profile, 'createdAt'>): Promise<Profile>;
  updateSettings(
    userId: string,
    settings: Partial<
      Pick<
        Profile,
        | 'theme'
        | 'instrument'
        | 'practiceGoal'
        | 'name'
        | 'pushNotificationsEnabled'
        | 'dailyReminderEnabled'
        | 'dailyReminderTime'
        | 'sessionTimerAlertsEnabled'
      >
    >
  ): Promise<Profile>;
}
