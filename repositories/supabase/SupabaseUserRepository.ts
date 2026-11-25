import { supabase } from '../../lib/supabase';
import type { UserRepository } from '../interfaces/UserRepository';
import type { Profile } from '../../types/domain';
import type { ThemeName } from '../../types/theme';

interface ProfileRow {
  id: string;
  email: string;
  name: string;
  practice_goal: number | null;
  instrument: string | null;
  theme: string;
  unlocked: boolean;
  push_notifications_enabled: boolean;
  daily_reminder_enabled: boolean;
  daily_reminder_time: string;
  session_timer_alerts_enabled: boolean;
  created_at: string;
}

function fromRow(row: ProfileRow): Profile {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    practiceGoal: row.practice_goal,
    instrument: row.instrument,
    theme: row.theme as ThemeName,
    unlocked: row.unlocked,
    pushNotificationsEnabled: row.push_notifications_enabled,
    dailyReminderEnabled: row.daily_reminder_enabled,
    dailyReminderTime: row.daily_reminder_time,
    sessionTimerAlertsEnabled: row.session_timer_alerts_enabled,
    createdAt: row.created_at,
  };
}

export class SupabaseUserRepository implements UserRepository {
  async getProfile(userId: string): Promise<Profile | null> {
    const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
    if (error) throw error;
    return data ? fromRow(data as ProfileRow) : null;
  }

  async saveProfile(profile: Omit<Profile, 'createdAt'>): Promise<Profile> {
    // `unlocked` is deliberately left out of this payload — it's revoked from the
    // authenticated role at the DB level (see schema.sql) and can only be flipped by the
    // verify-purchase Edge Function. New rows get it from the column default (false).
    const { data, error } = await supabase
      .from('profiles')
      .upsert({
        id: profile.id,
        email: profile.email,
        name: profile.name,
        practice_goal: profile.practiceGoal,
        instrument: profile.instrument,
        theme: profile.theme,
      })
      .select()
      .single();
    if (error) throw error;
    return fromRow(data as ProfileRow);
  }

  async updateSettings(
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
  ): Promise<Profile> {
    const payload: Record<string, unknown> = {};
    if (settings.theme !== undefined) payload.theme = settings.theme;
    if (settings.instrument !== undefined) payload.instrument = settings.instrument;
    if (settings.practiceGoal !== undefined) payload.practice_goal = settings.practiceGoal;
    if (settings.name !== undefined) payload.name = settings.name;
    if (settings.pushNotificationsEnabled !== undefined) payload.push_notifications_enabled = settings.pushNotificationsEnabled;
    if (settings.dailyReminderEnabled !== undefined) payload.daily_reminder_enabled = settings.dailyReminderEnabled;
    if (settings.dailyReminderTime !== undefined) payload.daily_reminder_time = settings.dailyReminderTime;
    if (settings.sessionTimerAlertsEnabled !== undefined) payload.session_timer_alerts_enabled = settings.sessionTimerAlertsEnabled;

    const { data, error } = await supabase.from('profiles').update(payload).eq('id', userId).select().single();
    if (error) throw error;
    return fromRow(data as ProfileRow);
  }
}
