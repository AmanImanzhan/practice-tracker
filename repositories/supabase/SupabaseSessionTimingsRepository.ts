import { supabase } from '../../lib/supabase';
import type { SessionTimingsRepository } from '../interfaces/SessionTimingsRepository';
import type { SessionTiming } from '../../types/domain';

interface TimingRow {
  id: string;
  session_id: string;
  duration_minutes: number;
  label: string | null;
}

function fromRow(row: TimingRow): SessionTiming {
  return { id: row.id, sessionId: row.session_id, durationMinutes: row.duration_minutes, label: row.label };
}

export class SupabaseSessionTimingsRepository implements SessionTimingsRepository {
  async getAll(sessionId: string): Promise<SessionTiming[]> {
    const { data, error } = await supabase.from('session_timings').select('*').eq('session_id', sessionId);
    if (error) throw error;
    return (data as TimingRow[]).map(fromRow);
  }

  async add(sessionId: string, durationMinutes: number, label: string | null): Promise<SessionTiming> {
    const { data, error } = await supabase
      .from('session_timings')
      .insert({ session_id: sessionId, duration_minutes: durationMinutes, label })
      .select()
      .single();
    if (error) throw error;
    return fromRow(data as TimingRow);
  }

  async remove(timingId: string): Promise<void> {
    const { error } = await supabase.from('session_timings').delete().eq('id', timingId);
    if (error) throw error;
  }
}
