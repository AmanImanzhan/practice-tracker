import type { SessionTiming } from '../../types/domain';

export interface SessionTimingsRepository {
  getAll(sessionId: string): Promise<SessionTiming[]>;
  add(sessionId: string, durationMinutes: number, label: string | null): Promise<SessionTiming>;
  remove(timingId: string): Promise<void>;
}
