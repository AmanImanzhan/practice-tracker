import { supabase } from '../../lib/supabase';
import type { SessionsRepository } from '../interfaces/SessionsRepository';
import type { PracticeSession } from '../../types/domain';

const SESSION_SELECT = '*, session_timings(*), repertoire(*)';

interface TimingRow {
  id: string;
  session_id: string;
  duration_minutes: number;
  label: string | null;
}

interface RepertoireRow {
  id: string;
  session_id: string;
  title: string;
}

interface SessionRow {
  id: string;
  user_id: string;
  date: string;
  day_number: number;
  notes: string | null;
  created_at: string;
  session_timings: TimingRow[] | null;
  repertoire: RepertoireRow[] | null;
}

function fromRow(row: SessionRow): PracticeSession {
  return {
    id: row.id,
    userId: row.user_id,
    date: row.date,
    dayNumber: row.day_number,
    notes: row.notes,
    createdAt: row.created_at,
    timings: (row.session_timings ?? []).map((t) => ({
      id: t.id,
      sessionId: t.session_id,
      durationMinutes: t.duration_minutes,
      label: t.label,
    })),
    repertoire: (row.repertoire ?? []).map((r) => ({ id: r.id, sessionId: r.session_id, title: r.title })),
  };
}

export class SupabaseSessionsRepository implements SessionsRepository {
  async getAll(userId: string): Promise<PracticeSession[]> {
    const { data, error } = await supabase
      .from('sessions')
      .select(SESSION_SELECT)
      .eq('user_id', userId)
      .order('date', { ascending: false });
    if (error) throw error;
    return (data as unknown as SessionRow[]).map(fromRow);
  }

  async getById(sessionId: string): Promise<PracticeSession | null> {
    const { data, error } = await supabase
      .from('sessions')
      .select(SESSION_SELECT)
      .eq('id', sessionId)
      .maybeSingle();
    if (error) throw error;
    return data ? fromRow(data as unknown as SessionRow) : null;
  }

  async create(
    session: Omit<PracticeSession, 'id' | 'createdAt' | 'timings' | 'repertoire'>
  ): Promise<PracticeSession> {
    const { data, error } = await supabase
      .from('sessions')
      .insert({ user_id: session.userId, date: session.date, day_number: session.dayNumber, notes: session.notes })
      .select(SESSION_SELECT)
      .single();
    if (error) throw error;
    return fromRow(data as unknown as SessionRow);
  }

  async update(
    sessionId: string,
    changes: Partial<Omit<PracticeSession, 'id' | 'userId' | 'createdAt' | 'timings' | 'repertoire'>>
  ): Promise<PracticeSession> {
    const payload: Record<string, unknown> = {};
    if (changes.date !== undefined) payload.date = changes.date;
    if (changes.dayNumber !== undefined) payload.day_number = changes.dayNumber;
    if (changes.notes !== undefined) payload.notes = changes.notes;

    const { data, error } = await supabase
      .from('sessions')
      .update(payload)
      .eq('id', sessionId)
      .select(SESSION_SELECT)
      .single();
    if (error) throw error;
    return fromRow(data as unknown as SessionRow);
  }

  async delete(sessionId: string): Promise<void> {
    const { error } = await supabase.from('sessions').delete().eq('id', sessionId);
    if (error) throw error;
  }

  async getByDateRange(userId: string, startDate: string, endDate: string): Promise<PracticeSession[]> {
    const { data, error } = await supabase
      .from('sessions')
      .select(SESSION_SELECT)
      .eq('user_id', userId)
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: true });
    if (error) throw error;
    return (data as unknown as SessionRow[]).map(fromRow);
  }
}
