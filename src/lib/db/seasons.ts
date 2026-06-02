import { createServerClient } from '@/lib/supabase/server';
import type { Season } from '@/types/database';

/** Returns the single active season, or null if none is set. */
export async function getActiveSeason(): Promise<Season | null> {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from('seasons')
    .select('*')
    .eq('is_active', true)
    .maybeSingle();

  if (error) throw new Error(`getActiveSeason: ${error.message}`);
  return data;
}

/** Returns all seasons, newest first. */
export async function getAllSeasons(): Promise<Season[]> {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from('seasons')
    .select('*')
    .order('year', { ascending: false });

  if (error) throw new Error(`getAllSeasons: ${error.message}`);
  return data ?? [];
}

/** Returns a single season by id, or null. */
export async function getSeasonById(id: string): Promise<Season | null> {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from('seasons')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) throw new Error(`getSeasonById: ${error.message}`);
  return data;
}
