import { repositories } from '../repositories';
import type { PracticeSession } from '../types/domain';
import { isFutureDate } from './date';

/** Finds today's (or any date's) practice session, or creates one if it doesn't exist yet.
 *  day_number is the global rank of practice days — count of earlier sessions + 1. Shared
 *  by the day detail modal and the Timer screen so both assign it the same way.
 *
 *  Creating a session out of chronological order (backfilling a day earlier than ones that
 *  already exist) bumps every already-existing later session's day_number up by one, so two
 *  sessions never end up sharing the same number. Deleting a session never renumbers its
 *  neighbors — a gap in the sequence is left as the historical record, on purpose. */
export async function ensureSessionForDate(userId: string, dateISO: string): Promise<PracticeSession> {
  if (isFutureDate(dateISO)) {
    throw new Error('Cannot log practice for a future date.');
  }

  const allSessions = await repositories.sessions.getAll(userId);
  const existing = allSessions.find((s) => s.date === dateISO);
  if (existing) return existing;

  const earlierCount = allSessions.filter((s) => s.date < dateISO).length;
  const laterSessions = allSessions.filter((s) => s.date > dateISO);
  await Promise.all(
    laterSessions.map((s) => repositories.sessions.update(s.id, { dayNumber: s.dayNumber + 1 }))
  );

  const dayNumber = earlierCount + 1;
  return repositories.sessions.create({ userId, date: dateISO, dayNumber, notes: null });
}
