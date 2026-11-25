import type { PracticeSession } from '../../types/domain';

export interface SessionsRepository {
  getAll(userId: string): Promise<PracticeSession[]>;
  getById(sessionId: string): Promise<PracticeSession | null>;
  create(session: Omit<PracticeSession, 'id' | 'createdAt' | 'timings' | 'repertoire'>): Promise<PracticeSession>;
  update(
    sessionId: string,
    changes: Partial<Omit<PracticeSession, 'id' | 'userId' | 'createdAt' | 'timings' | 'repertoire'>>
  ): Promise<PracticeSession>;
  delete(sessionId: string): Promise<void>;
  getByDateRange(userId: string, startDate: string, endDate: string): Promise<PracticeSession[]>;
}
