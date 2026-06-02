'use client';

import { useActionState, useState } from 'react';
import { CheckCircle, AlertCircle, Loader2, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { submitMatch, type MatchEntryState } from '@/app/admin/match-entry/actions';
import type { Season, Player } from '@/types/database';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DIVISIONS = ['4.0', '3.5+', '3.5-'] as const;

const MATCH_FORMATS = [
  { value: 'mens_doubles',   label: "Men's Doubles"   },
  { value: 'womens_doubles', label: "Women's Doubles" },
  { value: 'mixed_doubles',  label: 'Mixed Doubles'   },
] as const;


// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface Props {
  seasons: Season[];
  players: Player[];
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const INITIAL_STATE: MatchEntryState = { status: 'idle' };

export default function MatchEntryForm({ seasons, players }: Props) {
  const [state, formAction, isPending] = useActionState(submitMatch, INITIAL_STATE);

  // Track selections to prevent same player in both slots
  const [player1Id, setPlayer1Id] = useState('');
  const [player2Id, setPlayer2Id] = useState('');

  const activeSeasonId = seasons.find(s => s.is_active)?.id ?? '';

  return (
    <div className="space-y-8">
      {/* Success card */}
      {state.status === 'success' && (
        <div className="rounded-xl border border-emerald-700 bg-emerald-950/40 p-6 space-y-4">
          <div className="flex items-center gap-2 text-emerald-400 font-semibold">
            <CheckCircle size={20} />
            Match saved — ratings updated
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[state.result.player1, state.result.player2].map(p => (
              <div key={p.id} className="rounded-lg bg-surface p-4 space-y-1">
                <p className="text-sm font-medium text-white">{p.displayName}</p>
                <div className="flex items-center gap-2">
                  <span className="text-slate-400 text-sm">{p.oldRating.toFixed(2)}</span>
                  <span className="text-slate-600">→</span>
                  <span className="text-white font-bold">{p.newRating.toFixed(2)}</span>
                  <RatingDeltaBadge delta={p.delta} />
                </div>
                <p className="text-xs text-slate-500">Rating updated</p>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="text-xs text-emerald-400 hover:text-emerald-300 underline"
          >
            Enter another match
          </button>
        </div>
      )}

      {/* Error banner */}
      {state.status === 'error' && (
        <div className="flex items-start gap-3 rounded-xl border border-red-700 bg-red-950/40 px-4 py-3 text-red-300 text-sm">
          <AlertCircle size={18} className="mt-0.5 shrink-0" />
          {state.message}
        </div>
      )}

      {/* Form — hidden after success */}
      {state.status !== 'success' && (
        <form action={formAction} className="space-y-6">

          {/* Row 1: Season + Week + Date */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Field label="Season" required>
              <select name="season_id" defaultValue={activeSeasonId} className={selectClass} required>
                <option value="">Select season…</option>
                {seasons.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.name}{s.is_active ? ' (active)' : ''}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Week Number" required>
              <input
                type="number"
                name="week_number"
                min={1}
                max={8}
                placeholder="1 – 8"
                className={inputClass}
                required
              />
            </Field>

            <Field label="Match Date" required>
              <input
                type="date"
                name="match_date"
                className={inputClass}
                required
              />
            </Field>
          </div>

          {/* Row 2: Division + Match Type */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Division" required>
              <select name="division" className={selectClass} required defaultValue="">
                <option value="">Select division…</option>
                {DIVISIONS.map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </Field>

            <Field label="Match Type" required>
              <select name="match_format" className={selectClass} required defaultValue="">
                <option value="">Select type…</option>
                {MATCH_FORMATS.map(f => (
                  <option key={f.value} value={f.value}>{f.label}</option>
                ))}
              </select>
            </Field>
          </div>

          {/* Row 3: Opponent Club */}
          <Field label="Opponent Club" required>
            <input
              type="text"
              name="opponent_club"
              placeholder="e.g. Burlington Pickleball Club"
              className={inputClass}
              required
            />
          </Field>

          {/* Row 4: Player 1 + Player 2 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Player 1 (Milton)" required>
              <select
                name="player_1_id"
                className={selectClass}
                required
                defaultValue=""
                onChange={e => setPlayer1Id(e.target.value)}
              >
                <option value="">Select player…</option>
                {players
                  .filter(p => p.id !== player2Id)
                  .map(p => (
                    <option key={p.id} value={p.id}>
                      {p.display_name} ({p.current_rating.toFixed(2)})
                    </option>
                  ))}
              </select>
            </Field>

            <Field label="Player 2 (Milton)" required>
              <select
                name="player_2_id"
                className={selectClass}
                required
                defaultValue=""
                onChange={e => setPlayer2Id(e.target.value)}
              >
                <option value="">Select player…</option>
                {players
                  .filter(p => p.id !== player1Id)
                  .map(p => (
                    <option key={p.id} value={p.id}>
                      {p.display_name} ({p.current_rating.toFixed(2)})
                    </option>
                  ))}
              </select>
            </Field>
          </div>

          {/* Row 5: Opponent players (optional) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Opponent Player 1" hint="Optional — for display in match history">
              <input
                type="text"
                name="opponent_player_1"
                placeholder="e.g. Jane Doe"
                className={inputClass}
              />
            </Field>
            <Field label="Opponent Player 2" hint="Optional — for display in match history">
              <input
                type="text"
                name="opponent_player_2"
                placeholder="e.g. John Doe"
                className={inputClass}
              />
            </Field>
          </div>

          {/* Row 6: Scores */}
          <div className="grid grid-cols-2 gap-4">
            <Field label="Milton Score" required hint="Games won by your pair">
              <input
                type="number"
                name="milton_score"
                min={0}
                placeholder="e.g. 2"
                className={inputClass}
                required
              />
            </Field>

            <Field label="Opponent Score" required hint="Games won by opponent">
              <input
                type="number"
                name="opponent_score"
                min={0}
                placeholder="e.g. 1"
                className={inputClass}
                required
              />
            </Field>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={isPending}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg bg-brand-600 hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium text-sm transition-colors"
          >
            {isPending ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Saving…
              </>
            ) : (
              'Save Match & Update Ratings'
            )}
          </button>
        </form>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function Field({
  label,
  required,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-medium text-slate-400 uppercase tracking-wide">
        {label}{required && <span className="text-red-400 ml-1">*</span>}
      </label>
      {children}
      {hint && <p className="text-xs text-slate-600">{hint}</p>}
    </div>
  );
}

function RatingDeltaBadge({ delta }: { delta: number }) {
  if (delta > 0) return (
    <span className="flex items-center gap-0.5 text-xs font-semibold text-emerald-400">
      <TrendingUp size={12} />+{delta.toFixed(4)}
    </span>
  );
  if (delta < 0) return (
    <span className="flex items-center gap-0.5 text-xs font-semibold text-red-400">
      <TrendingDown size={12} />{delta.toFixed(4)}
    </span>
  );
  return (
    <span className="flex items-center gap-0.5 text-xs font-semibold text-slate-500">
      <Minus size={12} />0.0000
    </span>
  );
}

// ---------------------------------------------------------------------------
// Tailwind class helpers
// ---------------------------------------------------------------------------

const inputClass =
  'w-full rounded-lg bg-surface border border-surface-border text-white text-sm px-3 py-2 ' +
  'placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent';

const selectClass =
  'w-full rounded-lg bg-surface border border-surface-border text-white text-sm px-3 py-2 ' +
  'focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent';
