import Link from 'next/link';
import { Target } from 'lucide-react';
import DashboardSection, { EmptySection } from './DashboardSection';
import type { AvgPointsWonEntry } from '@/lib/db/dashboard';

export default function BestAvgPoints({ data }: { data: AvgPointsWonEntry[] }) {
  return (
    <DashboardSection icon={Target} title="Best Avg Points Won" badge="Min. 4 matches">
      {data.length === 0 ? (
        <EmptySection message="Avg Points Won % will appear after matches are entered." />
      ) : (
        <div className="divide-y divide-surface-border/50">
          {data.map(p => (
            <div key={p.player_id} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
              <div className="min-w-0">
                <Link
                  href={`/players/${p.player_id}`}
                  className="text-sm font-medium text-white hover:text-brand-400 transition-colors truncate block"
                >
                  {p.display_name}
                </Link>
                <p className="text-xs text-slate-500 mt-0.5">{p.matches_played} matches</p>
              </div>
              <span className={`text-sm font-bold tabular-nums shrink-0 ml-3 ${p.avg_pct >= 50 ? 'text-emerald-400' : 'text-red-400'}`}>
                {p.avg_pct.toFixed(1)}%
              </span>
            </div>
          ))}
        </div>
      )}
    </DashboardSection>
  );
}
