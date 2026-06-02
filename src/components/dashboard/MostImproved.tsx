import Link from 'next/link';
import { TrendingUp } from 'lucide-react';
import DashboardSection, { EmptySection } from './DashboardSection';
import type { PlayerStatWithName } from '@/lib/db/dashboard';

export default function MostImproved({ data }: { data: PlayerStatWithName[] }) {
  return (
    <DashboardSection icon={TrendingUp} title="Most Improved">
      {data.length === 0 ? (
        <EmptySection message="Rating movement will appear after matches are entered." />
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
                <p className="text-xs text-slate-500 mt-0.5">
                  {p.current_rating.toFixed(2)} current · {p.matches_played}m
                </p>
              </div>
              <RatingChangeBadge change={p.rating_change} />
            </div>
          ))}
        </div>
      )}
    </DashboardSection>
  );
}

function RatingChangeBadge({ change }: { change: number }) {
  if (change > 0) return (
    <span className="text-sm font-semibold text-emerald-400 tabular-nums shrink-0 ml-3">
      +{change.toFixed(2)}
    </span>
  );
  if (change < 0) return (
    <span className="text-sm font-semibold text-red-400 tabular-nums shrink-0 ml-3">
      {change.toFixed(2)}
    </span>
  );
  return (
    <span className="text-sm font-semibold text-slate-500 tabular-nums shrink-0 ml-3">
      0.00
    </span>
  );
}
