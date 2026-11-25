import { supabase } from '../../lib/supabase';
import type { RepertoireRepository } from '../interfaces/RepertoireRepository';
import type { RepertoireItem } from '../../types/domain';

interface RepertoireRow {
  id: string;
  session_id: string;
  title: string;
}

function fromRow(row: RepertoireRow): RepertoireItem {
  return { id: row.id, sessionId: row.session_id, title: row.title };
}

export class SupabaseRepertoireRepository implements RepertoireRepository {
  async getAll(sessionId: string): Promise<RepertoireItem[]> {
    const { data, error } = await supabase.from('repertoire').select('*').eq('session_id', sessionId);
    if (error) throw error;
    return (data as RepertoireRow[]).map(fromRow);
  }

  async add(sessionId: string, title: string): Promise<RepertoireItem> {
    const { data, error } = await supabase
      .from('repertoire')
      .insert({ session_id: sessionId, title })
      .select()
      .single();
    if (error) throw error;
    return fromRow(data as RepertoireRow);
  }

  async remove(repertoireItemId: string): Promise<void> {
    const { error } = await supabase.from('repertoire').delete().eq('id', repertoireItemId);
    if (error) throw error;
  }
}
