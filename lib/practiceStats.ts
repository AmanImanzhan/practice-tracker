import type { PracticeSession } from '../types/domain';

export function totalMinutesForSessions(sessions: PracticeSession[]): number {
  return sessions.reduce(
    (sum, session) => sum + session.timings.reduce((t, timing) => t + timing.durationMinutes, 0),
    0
  );
}

/**
 * Count of distinct days with at least one practice session — matches the day-number
 * count shown per row in the day table, not a consecutive-day streak. `sessions` is
 * expected to already be scoped to one month (as fetched by loadMonth).
 */
export function countPracticeDaysInMonth(sessions: PracticeSession[]): number {
  return new Set(sessions.map((s) => s.date)).size;
}
