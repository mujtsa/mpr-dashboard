import type { Metadata } from 'next';
import { LayoutDashboard } from 'lucide-react';
import { getActiveSeason } from '@/lib/db/seasons';
import { getMatchesBySeason } from '@/lib/db/matches';
import {
  getSeasonSummary,
  getMostImproved,
  getBestWinPct,
  getTopPartnerships,
  getWeeklyGainsSummary,
  getBestAvgPointsWon,
  getTeamPerformance,
} from '@/lib/db/dashboard';
import SeasonSummaryBar  from '@/components/dashboard/SeasonSummaryBar';
import TeamPerformance   from '@/components/dashboard/TeamPerformance';
import MostImproved      from '@/components/dashboard/MostImproved';
import BestWinPct        from '@/components/dashboard/BestRecords';
import TopPartnerships   from '@/components/dashboard/BestPartners';
import WeeklyGainsByWeek from '@/components/dashboard/WeeklyGains';
import BestAvgPoints     from '@/components/dashboard/BestAvgPoints';
import MatchResultsClient from '@/components/dashboard/RecentMatches';

export const metadata: Metadata = { title: 'Dashboard' };

export const revalidate = 60;

export default async function DashboardPage() {
  const season = await getActiveSeason();

  if (!season) {
    return (
      <div className="max-w-md">
        <div className="rounded-xl border border-surface-border bg-surface-card p-8 text-center space-y-2">
          <LayoutDashboard size={28} className="text-slate-500 mx-auto" />
          <p className="font-semibold text-white">No active season</p>
          <p className="text-sm text-slate-400">
            Create and activate a season in Supabase to begin tracking matches.
          </p>
        </div>
      </div>
    );
  }

  const [
    summary,
    teamPerformance,
    mostImproved,
    bestWinPct,
    topPartnerships,
    weeklySummary,
    bestAvgPoints,
    allMatches,
  ] = await Promise.all([
    getSeasonSummary(season.id),
    getTeamPerformance(season.id),
    getMostImproved(season.id, 5),
    getBestWinPct(season.id, 5, 4),
    getTopPartnerships(season.id, 5),
    getWeeklyGainsSummary(season.id),
    getBestAvgPointsWon(season.id, 5, 4),
    getMatchesBySeason(season.id),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="mt-0.5 text-sm text-slate-400">
          {season.name} · Season overview
        </p>
      </div>

      {/* Season summary stat bar */}
      <SeasonSummaryBar season={season} summary={summary} />

      {/* Team Performance — directly below season summary */}
      <TeamPerformance rows={teamPerformance} />

      {/* Player analytics widgets */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <MostImproved      data={mostImproved}    />
        <BestWinPct        data={bestWinPct}       />
        <TopPartnerships   data={topPartnerships}  />
        <WeeklyGainsByWeek summary={weeklySummary} />
        <BestAvgPoints     data={bestAvgPoints}    />
      </div>

      {/* Filterable match results */}
      <MatchResultsClient matches={allMatches} />
    </div>
  );
}
