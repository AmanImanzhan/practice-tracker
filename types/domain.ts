import type { ThemeName } from './theme';

export interface Profile {
  id: string;
  email: string;
  name: string;
  practiceGoal: number | null;
  instrument: string | null;
  theme: ThemeName;
  unlocked: boolean;
  pushNotificationsEnabled: boolean;
  dailyReminderEnabled: boolean;
  dailyReminderTime: string;
  sessionTimerAlertsEnabled: boolean;
  createdAt: string;
}

export interface SessionTiming {
  id: string;
  sessionId: string;
  durationMinutes: number;
  label: string | null;
}

export interface RepertoireItem {
  id: string;
  sessionId: string;
  title: string;
}

export interface PracticeSession {
  id: string;
  userId: string;
  date: string;
  dayNumber: number;
  notes: string | null;
  createdAt: string;
  timings: SessionTiming[];
  repertoire: RepertoireItem[];
}
