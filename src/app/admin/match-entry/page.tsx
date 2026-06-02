import type { Metadata } from 'next';
import { ClipboardList, Users, Calendar } from 'lucide-react';
import { getAllSeasons } from '@/lib/db/seasons';
import { getAllPlayers } from '@/lib/db/players';
import MatchEntryForm from '@/components/admin/MatchEntryForm';

export const metadata: Metadata = { title: 'Match Entry' };

export default async function MatchEntryPage() {
  const [seasons, players] = await Promise.all([
    getAllSeasons(),
    getAllPlayers(),
  ]);

  const activeSeason = seasons.find(s => s.is_active);

  // ---- Guard: no active season ------------------------------------------
  if (!activeSeason) {
    return (
      <EmptyGuard
        icon={Calendar}
        title="No active season"
        message="Create an active season in Supabase before entering matches."
      />
    );
  }

  // ---- Guard: no players ------------------------------------------------
  if (players.length === 0) {
    return (
      <EmptyGuard
        icon={Users}
        title="No players found"
        message="Add or import players before entering matches."
      />
    );
  }

  // ---- Normal render ----------------------------------------------------
  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <ClipboardList size={20} className="text-brand-400" />
          <h1 className="text-2xl font-bold text-white">Match Entry</h1>
        </div>
        <p className="text-sm text-slate-400">
          {activeSeason.name} · Enter a completed Trillium match result
        </p>
      </div>

      <div className="rounded-xl border border-surface-border bg-surface-card p-6">
        <MatchEntryForm seasons={seasons} players={players} />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Empty guard card
// ---------------------------------------------------------------------------

function EmptyGuard({
  icon: Icon,
  title,
  message,
}: {
  icon: React.ElementType;
  title: string;
  message: string;
}) {
  return (
    <div className="max-w-md">
      <div className="rounded-xl border border-surface-border bg-surface-card p-8 flex flex-col items-center text-center gap-4">
        <div className="w-12 h-12 rounded-full bg-surface flex items-center justify-center">
          <Icon size={24} className="text-slate-500" />
        </div>
        <div>
          <p className="font-semibold text-white">{title}</p>
          <p className="mt-1 text-sm text-slate-400">{message}</p>
        </div>
      </div>
    </div>
  );
}
