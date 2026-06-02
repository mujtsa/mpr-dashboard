import type { Metadata } from 'next';
import { Users } from 'lucide-react';
import { getActiveSeason } from '@/lib/db/seasons';
import { getPlayersWithStats } from '@/lib/db/players';
import PlayersClient from '@/components/players/PlayersClient';

export const metadata: Metadata = { title: 'Players' };

export const revalidate = 60;

export default async function PlayersPage() {
  const season = await getActiveSeason();

  // No active season — we still show the players list; stats will just be empty
  const players = season
    ? await getPlayersWithStats(season.id)
    : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Players</h1>
          <p className="mt-0.5 text-sm text-slate-400">
            {season ? `${season.name} · Milton Pickleball` : 'Milton Pickleball'}
          </p>
        </div>
        {players.length > 0 && (
          <span className="text-xs text-slate-500 bg-surface-card border border-surface-border px-3 py-1.5 rounded-full shrink-0">
            {players.length} {players.length === 1 ? 'player' : 'players'}
          </span>
        )}
      </div>

      {/* Empty state — no players at all */}
      {players.length === 0 ? (
        <div className="rounded-xl border border-surface-border bg-surface-card px-6 py-16 flex flex-col items-center text-center gap-3">
          <div className="w-12 h-12 rounded-full bg-surface flex items-center justify-center">
            <Users size={22} className="text-slate-500" />
          </div>
          <div>
            <p className="font-semibold text-white">No players available yet.</p>
            <p className="mt-1 text-sm text-slate-400">
              Add players through Supabase to get started.
            </p>
          </div>
        </div>
      ) : (
        <PlayersClient players={players} />
      )}
    </div>
  );
}
