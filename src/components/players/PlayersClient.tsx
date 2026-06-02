'use client';

import { useState, useMemo } from 'react';
import { Search, SlidersHorizontal } from 'lucide-react';
import PlayerCard from './PlayerCard';
import type { PlayerListItem } from '@/lib/db/players';

type GenderFilter = 'all' | 'M' | 'F';

const GENDER_OPTIONS: { value: GenderFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'M',   label: 'Male' },
  { value: 'F',   label: 'Female' },
];

export default function PlayersClient({ players }: { players: PlayerListItem[] }) {
  const [query,  setQuery]  = useState('');
  const [gender, setGender] = useState<GenderFilter>('all');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return players.filter(p => {
      const matchesSearch = q === '' || p.display_name.toLowerCase().includes(q);
      const matchesGender = gender === 'all' || p.gender === gender;
      return matchesSearch && matchesGender;
    });
  }, [players, query, gender]);

  return (
    <div className="space-y-5">
      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
          <input
            type="text"
            placeholder="Search players…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-lg bg-surface-card border border-surface-border text-white text-sm placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
          />
        </div>

        {/* Gender filter */}
        <div className="flex items-center gap-1 p-1 rounded-lg bg-surface-card border border-surface-border shrink-0">
          <SlidersHorizontal size={14} className="text-slate-500 ml-2 mr-1" />
          {GENDER_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => setGender(opt.value)}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                gender === opt.value
                  ? 'bg-brand-700 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Count */}
      <p className="text-xs text-slate-500">
        {filtered.length} {filtered.length === 1 ? 'player' : 'players'}
        {(query || gender !== 'all') && ' matching current filters'}
      </p>

      {/* Results */}
      {filtered.length === 0 ? (
        <div className="rounded-xl border border-surface-border bg-surface-card px-6 py-12 text-center">
          <p className="text-slate-400 text-sm font-medium">No players match your search.</p>
          <button
            onClick={() => { setQuery(''); setGender('all'); }}
            className="mt-3 text-xs text-brand-400 hover:text-brand-300 underline"
          >
            Clear filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(p => (
            <PlayerCard key={p.id} player={p} />
          ))}
        </div>
      )}
    </div>
  );
}
