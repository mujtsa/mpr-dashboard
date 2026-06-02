'use client';

import { useState, useMemo } from 'react';
import { SlidersHorizontal, Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { getRatingDelta } from '@/lib/rating/ratingEngine';
import type { MatchWithPlayers } from '@/lib/db/matches';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PAGE_SIZE = 10;

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

function DeltaBadge({ delta }: { delta: number }) {
  if (delta > 0) return <span className="text-xs font-semibold text-emerald-400 tabular-nums">+{delta.toFixed(2)}</span>;
  if (delta < 0) return <span className="text-xs font-semibold text-red-400 tabular-nums">{delta.toFixed(2)}</span>;
  return <span className="text-xs text-slate-500 tabular-nums">0.00</span>;
}

type ResultFilter = 'all' | 'win' | 'loss';

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function MatchResultsClient({ matches }: { matches: MatchWithPlayers[] }) {
  const [week,        setWeekRaw]        = useState('all');
  const [division,    setDivisionRaw]    = useState('all');
  const [matchFormat, setMatchFormatRaw] = useState('all');
  const [player,      setPlayerRaw]      = useState('all');
  const [club,        setClubRaw]        = useState('all');
  const [result,      setResultRaw]      = useState<ResultFilter>('all');
  const [page,        setPage]           = useState(1);

  // Wrappers reset pagination to page 1 whenever a filter changes
  const setWeek        = (v: string)       => { setWeekRaw(v);        setPage(1); };
  const setDivision    = (v: string)       => { setDivisionRaw(v);    setPage(1); };
  const setMatchFormat = (v: string)       => { setMatchFormatRaw(v); setPage(1); };
  const setPlayer      = (v: string)       => { setPlayerRaw(v);      setPage(1); };
  const setClub        = (v: string)       => { setClubRaw(v);        setPage(1); };
  const setResult      = (v: ResultFilter) => { setResultRaw(v);      setPage(1); };

  // Derive unique filter options from all matches
  const opts = useMemo(() => {
    const weeks   = [...new Set(matches.map(m => m.week_number))].sort((a, b) => a - b);
    const divs    = [...new Set(matches.map(m => m.division))].sort();
    const formats = [...new Set(matches.map(m => m.match_format))].sort();
    const clubs   = [...new Set(matches.map(m => m.opponent_club))].sort();
    const players = new Set<string>();
    for (const m of matches) {
      players.add(m.player_1.display_name);
      players.add(m.player_2.display_name);
    }
    return { weeks, divs, formats, clubs, players: [...players].sort() };
  }, [matches]);

  // Apply filters
  const filtered = useMemo(() => {
    return matches.filter(m => {
      if (week        !== 'all' && m.week_number  !== Number(week))    return false;
      if (division    !== 'all' && m.division     !== division)         return false;
      if (matchFormat !== 'all' && m.match_format !== matchFormat)      return false;
      if (player      !== 'all' &&
          m.player_1.display_name !== player &&
          m.player_2.display_name !== player)                           return false;
      if (club        !== 'all' && m.opponent_club !== club)            return false;
      if (result      !== 'all' && m.result       !== result)           return false;
      return true;
    });
  }, [matches, week, division, matchFormat, player, club, result]);

  // Pagination
  const totalPages  = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage    = Math.min(page, totalPages);
  const startIdx    = (safePage - 1) * PAGE_SIZE;
  const paginated   = filtered.slice(startIdx, startIdx + PAGE_SIZE);
  const endIdx      = Math.min(startIdx + PAGE_SIZE, filtered.length);

  const anyFilter = week !== 'all' || division !== 'all' || matchFormat !== 'all' ||
                    player !== 'all' || club !== 'all' || result !== 'all';

  const clearAll = () => {
    setWeekRaw('all'); setDivisionRaw('all'); setMatchFormatRaw('all');
    setPlayerRaw('all'); setClubRaw('all'); setResultRaw('all');
    setPage(1);
  };

  return (
    <div className="rounded-xl border border-surface-border bg-surface-card">
      {/* Section header */}
      <div className="px-5 py-4 border-b border-surface-border flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Calendar size={15} className="text-brand-400" />
          <h2 className="text-sm font-semibold text-white">Match Results</h2>
        </div>
        {filtered.length > 0 && (
          <span className="text-xs text-slate-500">
            {filtered.length > PAGE_SIZE
              ? `Showing ${startIdx + 1}–${endIdx} of ${filtered.length} matches`
              : `${filtered.length} ${filtered.length === 1 ? 'match' : 'matches'}`}
          </span>
        )}
      </div>

      {/* Filters */}
      {matches.length > 0 && (
        <div className="px-5 py-3 border-b border-surface-border flex flex-wrap items-center gap-2">
          <SlidersHorizontal size={13} className="text-slate-500 shrink-0" />

          <FilterSelect value={week}        onChange={setWeek}        all="All Weeks">
            {opts.weeks.map(w => <option key={w} value={w}>Week {w}</option>)}
          </FilterSelect>

          <FilterSelect value={division}    onChange={setDivision}    all="All Divisions">
            {opts.divs.map(d => <option key={d} value={d}>{d}</option>)}
          </FilterSelect>

          <FilterSelect value={matchFormat} onChange={setMatchFormat} all="All Types">
            {opts.formats.map(f => <option key={f} value={f}>{FORMAT_LABELS[f] ?? f}</option>)}
          </FilterSelect>

          <FilterSelect value={player}      onChange={setPlayer}      all="All Players">
            {opts.players.map(p => <option key={p} value={p}>{p}</option>)}
          </FilterSelect>

          <FilterSelect value={club}        onChange={setClub}        all="All Opponents">
            {opts.clubs.map(c => <option key={c} value={c}>{c}</option>)}
          </FilterSelect>

          <ResultToggle value={result} onChange={setResult} />

          {anyFilter && (
            <button onClick={clearAll} className="text-xs text-brand-400 hover:text-brand-300 underline ml-1">
              Clear
            </button>
          )}
        </div>
      )}

      <div className="p-5 space-y-4">
        {matches.length === 0 ? (
          <p className="text-sm text-slate-500 text-center py-6">No matches entered yet.</p>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-slate-500 text-center py-6">No matches match the current filters.</p>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-slate-500 uppercase tracking-wide border-b border-surface-border">
                    {['Date','Wk','Division','Type','Players','Opponent','Score','Result','Δ Rating'].map(h => (
                      <th key={h} className={`pb-2 font-medium pr-3 ${h === 'Result' || h === 'Δ Rating' ? 'text-right' : 'text-left'}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-border/50">
                  {paginated.map(m => {
                    const delta = getRatingDelta(m.milton_score, m.opponent_score);
                    return (
                      <tr key={m.id} className="hover:bg-surface/40 transition-colors">
                        <td className="py-2.5 pr-3 text-slate-400 whitespace-nowrap tabular-nums">{formatDate(m.match_date)}</td>
                        <td className="py-2.5 pr-3 text-slate-400 tabular-nums">{m.week_number}</td>
                        <td className="py-2.5 pr-3 font-mono text-xs text-slate-300">{m.division}</td>
                        <td className="py-2.5 pr-3 text-slate-400 whitespace-nowrap">{FORMAT_LABELS[m.match_format] ?? m.match_format}</td>
                        <td className="py-2.5 pr-3 text-white whitespace-nowrap">
                          {m.player_1.display_name}
                          <span className="text-slate-500 mx-1">&amp;</span>
                          {m.player_2.display_name}
                        </td>
                        <td className="py-2.5 pr-3 text-slate-400 max-w-[120px] truncate">{m.opponent_club}</td>
                        <td className="py-2.5 pr-3 font-semibold tabular-nums text-white whitespace-nowrap">
                          {m.milton_score}–{m.opponent_score}
                        </td>
                        <td className="py-2.5 pr-3 text-right"><ResultBadge result={m.result} /></td>
                        <td className="py-2.5 text-right"><DeltaBadge delta={delta} /></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden divide-y divide-surface-border/50">
              {paginated.map(m => {
                const delta = getRatingDelta(m.milton_score, m.opponent_score);
                return (
                  <div key={m.id} className="py-3 first:pt-0 last:pb-0 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-white">
                        {m.player_1.display_name} &amp; {m.player_2.display_name}
                      </span>
                      <div className="flex items-center gap-2 shrink-0 ml-2">
                        <ResultBadge result={m.result} />
                        <span className="text-sm font-semibold text-white tabular-nums">{m.milton_score}–{m.opponent_score}</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <span>vs {m.opponent_club}</span>
                      <DeltaBadge delta={delta} />
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <span>{m.division}</span><span>·</span>
                      <span>{FORMAT_LABELS[m.match_format] ?? m.match_format}</span><span>·</span>
                      <span>Wk {m.week_number}</span><span>·</span>
                      <span>{formatDate(m.match_date)}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-2 border-t border-surface-border">
                <p className="text-xs text-slate-500">
                  Showing {startIdx + 1}–{endIdx} of {filtered.length} matches
                </p>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={safePage === 1}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium border border-surface-border text-slate-400 hover:text-white hover:border-slate-500 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeft size={13} /> Prev
                  </button>
                  <span className="px-2 text-xs text-slate-500 tabular-nums">
                    {safePage} / {totalPages}
                  </span>
                  <button
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={safePage === totalPages}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium border border-surface-border text-slate-400 hover:text-white hover:border-slate-500 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    Next <ChevronRight size={13} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Filter sub-components
// ---------------------------------------------------------------------------

function FilterSelect({ value, onChange, all, children }: {
  value: string; onChange: (v: string) => void; all: string; children: React.ReactNode;
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
    <div className="flex items-center gap-0.5 p-0.5 rounded-lg bg-surface-card border border-surface-border">
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
