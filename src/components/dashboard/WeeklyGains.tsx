'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Zap } from 'lucide-react';
import DashboardSection, { EmptySection } from './DashboardSection';
import type { WeeklyGainsSummary } from '@/lib/db/dashboard';

interface Props {
  summary: WeeklyGainsSummary;
}

export default function WeeklyGainsByWeek({ summary }: Props) {
  const { availableWeeks, byWeek } = summary;

  const defaultWeek = availableWeeks.length > 0
    ? availableWeeks[availableWeeks.length - 1]
    : null;

  const [selectedWeek, setSelectedWeek] = useState<number | null>(defaultWeek);

  const gains = selectedWeek != null ? (byWeek[String(selectedWeek)] ?? []) : [];
  const positiveGains = gains.filter(g => g.weekly_gain > 0).slice(0, 5);

  return (
    <DashboardSection
      icon={Zap}
      title="Biggest Gains by Week"
      badge={selectedWeek != null ? `Week ${selectedWeek}` : undefined}
    >
      {/* Week selector */}
      {availableWeeks.length > 0 && (
        <div className="mb-4">
          <select
            value={selectedWeek ?? ''}
            onChange={e => setSelectedWeek(Number(e.target.value))}
            className="text-xs bg-surface border border-surface-border text-slate-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-brand-500"
          >
            {availableWeeks.map(w => (
              <option key={w} value={w}>Week {w}</option>
            ))}
          </select>
        </div>
      )}

      {availableWeeks.length === 0 ? (
        <EmptySection message="Rating movement will appear after matches are entered." />
      ) : positiveGains.length === 0 ? (
        <EmptySection message={`No rating gains recorded for Week ${selectedWeek}.`} />
      ) : (
        <div className="divide-y divide-surface-border/50">
          {positiveGains.map(p => (
            <div key={p.player_id} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
              <div className="min-w-0">
                <Link
                  href={`/players/${p.player_id}`}
                  className="text-sm font-medium text-white hover:text-brand-400 transition-colors truncate block"
                >
                  {p.display_name}
                </Link>
                <p className="text-xs text-slate-500 mt-0.5">
                  Current: {p.current_rating.toFixed(2)} · {p.match_count} {p.match_count === 1 ? 'match' : 'matches'}
                </p>
              </div>
              <span className="text-sm font-bold text-emerald-400 tabular-nums shrink-0 ml-3">
                +{p.weekly_gain.toFixed(4)}
              </span>
            </div>
          ))}
        </div>
      )}
    </DashboardSection>
  );
}
