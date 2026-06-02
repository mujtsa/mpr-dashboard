'use client';

import { useActionState, useState } from 'react';
import { RefreshCw, AlertTriangle, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { recalculateRatings, type RecalcState } from '@/app/admin/recalculate/actions';

// ---------------------------------------------------------------------------
// Stage types
// ---------------------------------------------------------------------------

type Stage = 'idle' | 'confirming';

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

const INITIAL: RecalcState = { status: 'idle' };

export default function RecalculateRatings({ seasonName }: { seasonName: string }) {
  const [stage, setStage]        = useState<Stage>('idle');
  const [state, formAction, isPending] = useActionState(recalculateRatings, INITIAL);

  // ---- Success view -------------------------------------------------------
  if (state.status === 'success') {
    const r = state.result;
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-emerald-400 font-semibold text-sm">
          <CheckCircle size={18} />
          Recalculation complete
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
          {[
            { label: 'Season',             value: r.seasonName,       cls: 'text-white'         },
            { label: 'Players reset',      value: r.playersReset,     cls: 'text-brand-400'     },
            { label: 'Matches processed',  value: r.matchesProcessed, cls: 'text-emerald-400'   },
            { label: 'Matches failed',     value: r.matchesFailed,    cls: r.matchesFailed > 0 ? 'text-red-400' : 'text-slate-500' },
          ].map(s => (
            <div key={s.label} className="rounded-lg bg-surface p-3">
              <p className="text-xs text-slate-500">{s.label}</p>
              <p className={`font-bold tabular-nums mt-0.5 ${s.cls}`}>{s.value}</p>
            </div>
          ))}
        </div>

        {r.errors.length > 0 && (
          <div className="rounded-lg border border-red-800 bg-red-950/20 p-4 space-y-1.5">
            <p className="text-xs text-red-400 font-semibold uppercase tracking-wide">
              Failed matches ({r.errors.length})
            </p>
            {r.errors.map(e => (
              <p key={e.matchId} className="text-xs text-red-300 font-mono">
                {e.matchId.slice(0, 8)}… — {e.error}
              </p>
            ))}
          </div>
        )}

        <button
          onClick={() => setStage('idle')}
          className="text-xs text-slate-400 hover:text-white underline"
        >
          Close
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Error banner */}
      {state.status === 'error' && (
        <div className="flex items-start gap-3 rounded-lg border border-red-700 bg-red-950/40 px-4 py-3 text-red-300 text-sm">
          <XCircle size={16} className="mt-0.5 shrink-0" />
          {state.message}
        </div>
      )}

      {/* Processing indicator */}
      {isPending && (
        <div className="flex items-center gap-3 rounded-lg border border-surface-border bg-surface px-4 py-3 text-sm text-slate-300">
          <Loader2 size={16} className="animate-spin text-brand-400 shrink-0" />
          <div>
            <p className="font-medium">Recalculating…</p>
            <p className="text-xs text-slate-500 mt-0.5">
              Resetting ratings, replaying all matches. This may take 15–30 seconds.
            </p>
          </div>
        </div>
      )}

      {/* Idle — trigger button */}
      {stage === 'idle' && !isPending && (
        <button
          onClick={() => setStage('confirming')}
          className="flex items-center gap-2 px-4 py-2 rounded-lg border border-red-800 bg-red-950/30 text-red-400 hover:bg-red-950/60 hover:text-red-300 text-sm font-medium transition-colors"
        >
          <RefreshCw size={14} />
          Recalculate Ratings
        </button>
      )}

      {/* Confirming — confirmation dialog */}
      {stage === 'confirming' && !isPending && (
        <div className="rounded-xl border border-red-800 bg-red-950/20 p-5 space-y-4">
          <div className="flex items-start gap-3">
            <AlertTriangle size={18} className="text-red-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-sm font-semibold text-white">
                Recalculate all ratings for {seasonName}?
              </p>
              <p className="text-xs text-slate-400">
                This action will permanently overwrite all current ratings and stats.
              </p>
            </div>
          </div>

          <ul className="text-xs text-slate-400 space-y-1 ml-7 list-disc">
            <li>Every player is reset to their starting rating</li>
            <li>All rating history is cleared and rebuilt</li>
            <li>All player summary stats are cleared and rebuilt</li>
            <li>All partner summary stats are cleared and rebuilt</li>
            <li>All matches are replayed in chronological order</li>
          </ul>

          <p className="text-xs text-slate-500 ml-7">
            Match data is not affected. This cannot be undone.
          </p>

          <div className="flex items-center gap-3 ml-7">
            <form action={formAction}>
              <button
                type="submit"
                className="px-4 py-2 rounded-lg bg-red-700 hover:bg-red-600 text-white text-sm font-semibold transition-colors"
              >
                Yes, recalculate
              </button>
            </form>
            <button
              type="button"
              onClick={() => setStage('idle')}
              className="px-4 py-2 rounded-lg border border-surface-border text-slate-400 hover:text-white text-sm transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
