'use client';

import { useState, useMemo } from 'react';
import { SlidersHorizontal } from 'lucide-react';
import type { MatchWithPlayers } from '@/lib/db/matches';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const FORMAT_LABELS: Record<string, string> = {
  mens_doubles:   "Men's",
  womens_doubles: "Women's",
  mixed_doubles:  'Mixed',
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-CA', { month: 'short', day: 'numeric' });
}

function ResultBadge({ result }: { result: string }) {
  if (result === 'win')  return <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800">WIN</span>;
  if (result === 'loss') return <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-red-950 text-red-400 border border-red-900">LOSS</span>;
  return <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-surface text-slate-400 border border-surface-border">TIE</span>;
}

function RatingChangePill({ change }: { change: number | undefined }) {
  if (change === undefined) return <span className="text-slate-600">—</span>;
  if (change > 0) return <span className="text-emerald-400 tabular-nums font-medium">+{change.toFixed(4)}</span>;
  if (change < 0) return <span className="text-red-400 tabular-nums font-medium">{change.toFixed(4)}</span>;
  return <span className="text-slate-500 tabular-nums">0.0000</span>;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface Props {
  matches:               MatchWithPlayers[];
  playerId:              string;
  ratingChangeByMatchId: Record<string, number>;
}

type ResultFilter = 'all' | 'win' | 'loss';

export default function MatchHistoryClient({ matches, playerId, ratingChangeByMatchId }: Props) {
  const [division,    setDivision]    = useState('all');
  const [matchFormat, setMatchFormat] = useState('all');
  const [partnerId,   setPartnerId]   = useState('all');
  const [result,      setResult]      = useState<ResultFilter>('all');

  // Unique filter options derived from the full match list
  const filterOptions = useMemo(() => {
    const divSet     = new Set<string>();
    const formatSet  = new Set<string>();
    const partnerMap = new Map<string, string>();

    for (const m of matches) {
      divSet.add(m.division);
      formatSet.add(m.match_format);
      const partner = m.player_1_id === playerId ? m.player_2 : m.player_1;
      if (!partnerMap.has(partner.id)) partnerMap.set(partner.id, partner.display_name);
    }

    return {
      divisions: [...divSet].sort(),
      formats:   [...formatSet].sort(),
      partners:  [...partnerMap.entries()]
        .map(([id, name]) => ({ id, name }))
        .sort((a, b) => a.name.localeCompare(b.name)),
    };
  }, [matches, playerId]);

  const filtered = useMemo(() => {
    return matches.filter(m => {
      const partner = m.player_1_id === playerId ? m.player_2 : m.player_1;
      if (division    !== 'all' && m.division     !== division)     return false;
      if (matchFormat !== 'all' && m.match_format !== matchFormat)  return false;
      if (partnerId   !== 'all' && partner.id     !== partnerId)    return false;
      if (result      !== 'all' && m.result       !== result)       return false;
      return true;
    });
  }, [matches, playerId, division, matchFormat, partnerId, result]);

  const anyFilter = division !== 'all' || matchFormat !== 'all' || partnerId !== 'all' || result !== 'all';

  if (matches.length === 0) {
    return (
      <p className="text-sm text-slate-500 text-center py-8">
        No matches recorded this season.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <SlidersHorizontal size={14} className="text-slate-500 shrink-0" />

        <FilterSelect value={division}    onChange={setDivision}    label="Division"   all="All Divisions">
          {filterOptions.divisions.map(d => <option key={d} value={d}>{d}</option>)}
        </FilterSelect>

        <FilterSelect value={matchFormat} onChange={setMatchFormat} label="Type"       all="All Types">
          {filterOptions.formats.map(f => (
            <option key={f} value={f}>{FORMAT_LABELS[f] ?? f}</option>
          ))}
        </FilterSelect>

        <FilterSelect value={partnerId}   onChange={setPartnerId}   label="Partner"    all="All Partners">
          {filterOptions.partners.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </FilterSelect>

        <ResultToggle value={result} onChange={setResult} />

        {anyFilter && (
          <button
            onClick={() => { setDivision('all'); setMatchFormat('all'); setPartnerId('all'); setResult('all'); }}
            className="text-xs text-brand-400 hover:text-brand-300 underline ml-1"
          >
            Clear
          </button>
        )}
      </div>

      <p className="text-xs text-slate-500">
        {filtered.length} of {matches.length} {matches.length === 1 ? 'match' : 'matches'}
      </p>

      {filtered.length === 0 ? (
        <p className="text-sm text-slate-500 text-center py-6">No matches match the current filters.</p>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-slate-500 uppercase tracking-wide border-b border-surface-border">
                  {['Date','Wk','Division','Type','Partner','Opponents','Score','Result','Δ Rating'].map(h => (
                    <th key={h} className={`pb-2 font-medium pr-3 ${h === 'Result' || h === 'Δ Rating' ? 'text-right' : 'text-left'}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border/50">
                {filtered.map(m => {
                  const partner = m.player_1_id === playerId ? m.player_2 : m.player_1;
                  const delta   = ratingChangeByMatchId[m.id];
                  return (
                    <tr key={m.id} className="hover:bg-surface/40 transition-colors">
                      <td className="py-2.5 pr-3 text-slate-400 whitespace-nowrap tabular-nums">{formatDate(m.match_date)}</td>
                      <td className="py-2.5 pr-3 text-slate-400 tabular-nums">{m.week_number}</td>
                      <td className="py-2.5 pr-3 font-mono text-xs text-slate-300">{m.division}</td>
                      <td className="py-2.5 pr-3 text-slate-400 whitespace-nowrap">{FORMAT_LABELS[m.match_format] ?? m.match_format}</td>
                      <td className="py-2.5 pr-3 text-white font-medium whitespace-nowrap">{partner.display_name}</td>
                      <td className="py-2.5 pr-3 text-slate-400">
                        {m.opponent_player_1 || m.opponent_player_2 ? (
                          <span>
                            {[m.opponent_player_1, m.opponent_player_2].filter(Boolean).join(' & ')}
                            <span className="block text-xs text-slate-500 truncate max-w-[140px]">{m.opponent_club}</span>
                          </span>
                        ) : (
                          <span className="truncate max-w-[120px] block">{m.opponent_club}</span>
                        )}
                      </td>
                      <td className="py-2.5 pr-3 font-semibold tabular-nums text-white whitespace-nowrap">
                        {m.milton_score}–{m.opponent_score}
                      </td>
                      <td className="py-2.5 pr-3 text-right"><ResultBadge result={m.result} /></td>
                      <td className="py-2.5 text-right"><RatingChangePill change={delta} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden divide-y divide-surface-border/50">
            {filtered.map(m => {
              const partner = m.player_1_id === playerId ? m.player_2 : m.player_1;
              const delta   = ratingChangeByMatchId[m.id];
              return (
                <div key={m.id} className="py-3 first:pt-0 last:pb-0 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ResultBadge result={m.result} />
                      <span className="text-sm font-semibold text-white tabular-nums">
                        {m.milton_score}–{m.opponent_score}
                      </span>
                    </div>
                    <RatingChangePill change={delta} />
                  </div>
                  <div className="text-sm text-white">
                    Partner: <span className="font-medium">{partner.display_name}</span>
                  </div>
                  <div className="text-xs text-slate-400">
                    {m.opponent_player_1 || m.opponent_player_2
                      ? <>vs {[m.opponent_player_1, m.opponent_player_2].filter(Boolean).join(' & ')} · {m.opponent_club}</>
                      : <>vs {m.opponent_club}</>
                    }
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <span>{m.division}</span>
                    <span>·</span>
                    <span>{FORMAT_LABELS[m.match_format] ?? m.match_format}</span>
                    <span>·</span>
                    <span>Wk {m.week_number}</span>
                    <span>·</span>
                    <span>{formatDate(m.match_date)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Filter sub-components
// ---------------------------------------------------------------------------

function FilterSelect({
  value, onChange, all, children,
}: {
  value: string;
  onChange: (v: string) => void;
  label: string;
  all: string;
  children: React.ReactNode;
}) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className="text-xs bg-surface-card border border-surface-border text-slate-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-brand-500"
    >
      <option value="all">{all}</option>
      {children}
    </select>
  );
}

function ResultToggle({ value, onChange }: { value: ResultFilter; onChange: (v: ResultFilter) => void }) {
  const opts: { v: ResultFilter; label: string }[] = [
    { v: 'all',  label: 'All'    },
    { v: 'win',  label: 'Wins'   },
    { v: 'loss', label: 'Losses' },
  ];
  return (
    <div className="flex items-center gap-1 p-0.5 rounded-lg bg-surface-card border border-surface-border">
      {opts.map(o => (
        <button
          key={o.v}
          onClick={() => onChange(o.v)}
          className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
            value === o.v ? 'bg-brand-700 text-white' : 'text-slate-400 hover:text-white'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
