import type { RepertoireItem } from '../../types/domain';

export interface RepertoireRepository {
  getAll(sessionId: string): Promise<RepertoireItem[]>;
  add(sessionId: string, title: string): Promise<RepertoireItem>;
  remove(repertoireItemId: string): Promise<void>;
}
