import type { Metadata } from 'next';
import { Upload, AlertCircle, RefreshCw } from 'lucide-react';
import { getActiveSeason } from '@/lib/db/seasons';
import CsvUploadClient from '@/components/admin/CsvUploadClient';
import RecalculateRatings from '@/components/admin/RecalculateRatings';

export const metadata: Metadata = { title: 'CSV Upload' };

export default async function CsvUploadPage() {
  const season = await getActiveSeason();

  return (
    <div className="max-w-4xl space-y-8">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Upload size={20} className="text-brand-400" />
          <h1 className="text-2xl font-bold text-white">CSV Upload</h1>
        </div>
        <p className="text-sm text-slate-400">
          Bulk-import Trillium match results from a spreadsheet
        </p>
      </div>

      {!season ? (
        <div className="flex items-start gap-3 rounded-xl border border-amber-800 bg-amber-950/30 px-4 py-3 text-amber-300 text-sm">
          <AlertCircle size={18} className="mt-0.5 shrink-0" />
          No active season found. Create and activate a season in Supabase before importing.
        </div>
      ) : (
        <div className="rounded-xl border border-surface-border bg-surface-card px-2 py-2 text-xs text-slate-500 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
          Active season: <span className="text-slate-300 font-medium">{season.name}</span>
          &nbsp;· All imported matches will be assigned to this season.
        </div>
      )}

      <div className="rounded-xl border border-surface-border bg-surface-card p-6">
        <CsvUploadClient />
      </div>

      {/* CSV format reference */}
      <div className="rounded-xl border border-surface-border bg-surface-card p-5 space-y-4">
        <h2 className="text-sm font-semibold text-white">Required CSV Format</h2>
        <div className="overflow-x-auto">
          <table className="text-xs w-full">
            <thead>
              <tr className="text-slate-500 uppercase tracking-wide border-b border-surface-border">
                {['Column','Required','Accepted Values','Example'].map(h => (
                  <th key={h} className="text-left pb-2 pr-4 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border/50 text-slate-300">
              {[
                ['date',           'Yes', 'YYYY-MM-DD',                         '2026-05-27'],
                ['week_number',    'Yes', '1 – 8',                              '1'],
                ['division',       'Yes', '4.0 · 3.5+ · 3.5-',                 '4.0'],
                ['match_type',     'Yes', 'mens_doubles · womens_doubles · mixed_doubles', 'mixed_doubles'],
                ['opponent_club',  'Yes', 'Any text',                           'Burlington Pickleball Club'],
                ['player_1',       'Yes', 'Display name (exact match or new)',  'Jane Smith'],
                ['player_2',       'Yes', 'Display name (exact match or new)',  'Bob Jones'],
                ['milton_score',   'Yes', 'Integer ≥ 0',                        '2'],
                ['opponent_score', 'Yes', 'Integer ≥ 0  (≠ milton_score)',      '1'],
              ].map(([col, req, vals, ex]) => (
                <tr key={col}>
                  <td className="py-2 pr-4 font-mono text-brand-400">{col}</td>
                  <td className="py-2 pr-4">{req}</td>
                  <td className="py-2 pr-4 text-slate-400">{vals}</td>
                  <td className="py-2 text-slate-500">{ex}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-slate-500">
          Players not found in the database are created automatically with the starting rating for their division.
          Gender is inferred from match type — verify in Supabase for mixed doubles players.
        </p>
      </div>

      {/* Danger zone */}
      <div className="rounded-xl border border-red-900/50 bg-surface-card p-5 space-y-4">
        <div className="flex items-center gap-2">
          <RefreshCw size={15} className="text-red-400" />
          <h2 className="text-sm font-semibold text-white">Recalculate Ratings</h2>
          <span className="text-xs bg-red-950 text-red-400 border border-red-800 px-2 py-0.5 rounded-full ml-1">
            Destructive
          </span>
        </div>
        <p className="text-xs text-slate-400">
          Resets all player ratings to their starting values, clears all stats,
          then replays every match in chronological order using the current rating formula.
          Use this when the rating formula changes. Match data is never deleted.
        </p>
        {!season ? (
          <p className="text-xs text-slate-500">No active season — recalculation unavailable.</p>
        ) : (
          <RecalculateRatings seasonName={season.name} />
        )}
      </div>
    </div>
  );
}
