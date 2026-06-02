'use client';

import { useState, useCallback, useActionState } from 'react';
import Papa from 'papaparse';
import {
  Upload, FileText, CheckCircle, AlertCircle, XCircle,
  TrendingUp, TrendingDown, Minus, Download, RotateCcw,
} from 'lucide-react';
import { importCsv, type ImportState, type ParsedCsvRow } from '@/app/admin/upload/actions';

// ---------------------------------------------------------------------------
// CSV column → internal key normalization
// ---------------------------------------------------------------------------

const FORMAT_ALIASES: Record<string, string> = {
  "mens_doubles":    "mens_doubles",
  "men's doubles":   "mens_doubles",
  "mens doubles":    "mens_doubles",
  "mens":            "mens_doubles",
  "womens_doubles":  "womens_doubles",
  "women's doubles": "womens_doubles",
  "womens doubles":  "womens_doubles",
  "womens":          "womens_doubles",
  "mixed_doubles":   "mixed_doubles",
  "mixed doubles":   "mixed_doubles",
  "mixed":           "mixed_doubles",
};

const VALID_DIVISIONS = new Set(['4.0', '3.5+', '3.5-']);

// ---------------------------------------------------------------------------
// Input normalizers — run before validation
// ---------------------------------------------------------------------------

/** Accepts YYYY-MM-DD or M/D/YYYY (Excel default) → always returns YYYY-MM-DD. */
function normalizeDate(raw: string): string {
  const s = raw.trim();
  // Already ISO
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  // M/D/YYYY or MM/DD/YYYY
  const slash = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (slash) {
    const [, m, d, y] = slash;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  return s; // unrecognised — let validation report the error
}

/** Normalizes division strings: '4' → '4.0', trims whitespace. */
function normalizeDivision(raw: string): string {
  const s = raw.trim();
  if (s === '4') return '4.0';
  return s;
}

// ---------------------------------------------------------------------------
// Client-side row validation
// ---------------------------------------------------------------------------

interface ValidatedRow extends ParsedCsvRow {
  errors: string[];
}

function validateRow(raw: Record<string, string>, idx: number): ValidatedRow {
  const errors: string[] = [];

  const date         = normalizeDate(raw['date'] ?? '');
  const weekRaw      = raw['week_number']?.trim()  ?? '';
  const division     = normalizeDivision(raw['division'] ?? '');
  const matchTypeRaw = (raw['match_type'] ?? raw['match_format'] ?? '').trim().toLowerCase();
  const match_format = FORMAT_ALIASES[matchTypeRaw] ?? '';
  const opponent_club = raw['opponent_club']?.trim() ?? '';
  const player_1     = raw['player_1']?.trim()     ?? '';
  const player_2     = raw['player_2']?.trim()     ?? '';
  const miltonRaw    = raw['milton_score']?.trim()  ?? '';
  const oppRaw       = raw['opponent_score']?.trim() ?? '';

  // Date
  if (!date) errors.push('Date is required.');
  else if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) errors.push('Date must be YYYY-MM-DD.');

  // Week
  const week_number = parseInt(weekRaw, 10);
  if (!weekRaw) errors.push('Week number is required.');
  else if (isNaN(week_number) || week_number < 1 || week_number > 8)
    errors.push('Week must be 1–8.');

  // Division
  if (!division) errors.push('Division is required.');
  else if (!VALID_DIVISIONS.has(division))
    errors.push(`Division must be one of: 4.0, 3.5+, 3.5-  (got "${division}").`);

  // Match format
  if (!matchTypeRaw) errors.push('Match type is required.');
  else if (!match_format) errors.push(`Unknown match type "${matchTypeRaw}". Use mens_doubles, womens_doubles, or mixed_doubles.`);

  // Opponent club
  if (!opponent_club) errors.push('Opponent club is required.');

  // Players
  if (!player_1) errors.push('Player 1 is required.');
  if (!player_2) errors.push('Player 2 is required.');
  if (player_1 && player_2 && player_1.toLowerCase() === player_2.toLowerCase())
    errors.push('Player 1 and Player 2 cannot be the same person.');

  // Scores
  const milton_score   = parseInt(miltonRaw, 10);
  const opponent_score = parseInt(oppRaw, 10);
  if (miltonRaw === '')  errors.push('Milton score is required.');
  else if (isNaN(milton_score)   || milton_score   < 0) errors.push('Milton score must be 0 or greater.');
  if (oppRaw === '')     errors.push('Opponent score is required.');
  else if (isNaN(opponent_score) || opponent_score < 0) errors.push('Opponent score must be 0 or greater.');
  if (!isNaN(milton_score) && !isNaN(opponent_score) && milton_score === opponent_score)
    errors.push('Scores cannot be equal — one side must win.');

  // Opponent player names (optional columns)
  const opponent_player_1 = raw['opponent_player_1']?.trim() || null;
  const opponent_player_2 = raw['opponent_player_2']?.trim() || null;

  return {
    rowIndex: idx,
    date,
    week_number:       isNaN(week_number)    ? 0 : week_number,
    division,
    match_format,
    opponent_club,
    player_1,
    player_2,
    milton_score:      isNaN(milton_score)   ? 0 : milton_score,
    opponent_score:    isNaN(opponent_score) ? 0 : opponent_score,
    opponent_player_1,
    opponent_player_2,
    errors,
  };
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

const INITIAL_STATE: ImportState = { status: 'idle' };

export default function CsvUploadClient() {
  const [rows,     setRows]     = useState<ValidatedRow[]>([]);
  const [fileName, setFileName] = useState('');
  const [state,    formAction,  isPending] = useActionState(importCsv, INITIAL_STATE);

  const parseFile = useCallback((file: File) => {
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = e => {
      const text = e.target?.result as string;
      const parsed = Papa.parse<Record<string, string>>(text, {
        header: true,
        skipEmptyLines: true,
        dynamicTyping: false,   // keep all values as strings; prevents 4.0 → 4
        transformHeader: h => h.trim().toLowerCase().replace(/\s+/g, '_'),
        transform: v => v.trim(),
      });
      const validated = parsed.data.map((row, i) => validateRow(row, i + 1));
      setRows(validated);
    };
    reader.readAsText(file);
  }, []);

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) parseFile(file);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file?.name.endsWith('.csv')) parseFile(file);
  };

  const reset = () => { setRows([]); setFileName(''); };

  const validCount   = rows.filter(r => r.errors.length === 0).length;
  const errorCount   = rows.length - validCount;
  const canImport    = rows.length > 0 && errorCount === 0;

  // Show import result
  if (state.status === 'success') {
    return <ImportSummary result={state.result} onReset={reset} />;
  }

  return (
    <div className="space-y-6">
      {/* Global error from server action */}
      {state.status === 'error' && (
        <div className="flex items-start gap-3 rounded-xl border border-red-700 bg-red-950/40 px-4 py-3 text-red-300 text-sm">
          <AlertCircle size={18} className="mt-0.5 shrink-0" />
          {state.message}
        </div>
      )}

      {/* Drop zone */}
      {rows.length === 0 && (
        <div
          onDrop={onDrop}
          onDragOver={e => e.preventDefault()}
          className="rounded-xl border-2 border-dashed border-surface-border hover:border-brand-600 transition-colors bg-surface-card p-12 flex flex-col items-center text-center gap-4 cursor-pointer"
          onClick={() => document.getElementById('csv-input')?.click()}
        >
          <div className="w-14 h-14 rounded-full bg-surface flex items-center justify-center">
            <Upload size={24} className="text-slate-400" />
          </div>
          <div>
            <p className="text-white font-semibold">Drop your CSV here or click to browse</p>
            <p className="text-sm text-slate-500 mt-1">Requires the MPR column format — see template below</p>
          </div>
          <a
            href="/sample-csv-template.csv"
            download
            onClick={e => e.stopPropagation()}
            className="flex items-center gap-1.5 text-xs text-brand-400 hover:text-brand-300 transition-colors"
          >
            <Download size={13} /> Download CSV template
          </a>
          <input id="csv-input" type="file" accept=".csv" className="hidden" onChange={onFileChange} />
        </div>
      )}

      {/* Preview */}
      {rows.length > 0 && (
        <div className="space-y-4">
          {/* Summary bar */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3 text-sm">
              <FileText size={16} className="text-slate-400" />
              <span className="text-slate-300 font-medium">{fileName}</span>
              <span className="text-slate-500">·</span>
              <span className="text-white">{rows.length} rows</span>
              {errorCount > 0 && (
                <span className="text-red-400 font-medium">{errorCount} with errors</span>
              )}
              {validCount > 0 && errorCount === 0 && (
                <span className="text-emerald-400 font-medium">All valid</span>
              )}
            </div>
            <button onClick={reset} className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors">
              <RotateCcw size={13} /> Choose different file
            </button>
          </div>

          {/* Error notice */}
          {errorCount > 0 && (
            <div className="flex items-start gap-2 rounded-lg border border-red-800 bg-red-950/30 px-4 py-3 text-sm text-red-300">
              <XCircle size={16} className="mt-0.5 shrink-0" />
              Fix the {errorCount} row{errorCount > 1 ? 's' : ''} with errors before importing.
            </div>
          )}

          {/* Preview table */}
          <PreviewTable rows={rows} />

          {/* Import button */}
          <form action={formAction}>
            <input type="hidden" name="rows" value={JSON.stringify(rows.filter(r => r.errors.length === 0))} />
            <button
              type="submit"
              disabled={!canImport || isPending}
              className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-brand-600 hover:bg-brand-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-medium text-sm transition-colors"
            >
              {isPending ? 'Importing…' : canImport ? `Import ${rows.length} matches` : 'Fix errors before importing'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Preview table
// ---------------------------------------------------------------------------

const FORMAT_SHORT: Record<string, string> = {
  mens_doubles:   "Men's",
  womens_doubles: "Women's",
  mixed_doubles:  'Mixed',
};

function PreviewTable({ rows }: { rows: ValidatedRow[] }) {
  return (
    <div className="rounded-xl border border-surface-border overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-surface text-slate-500 uppercase tracking-wide border-b border-surface-border">
              {['#','Date','Wk','Div','Type','Opponent','P1','P2','Score','Status'].map(h => (
                <th key={h} className="text-left px-3 py-2.5 font-medium whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-border/50">
            {rows.map(row => {
              const hasError = row.errors.length > 0;
              return (
                <>
                  <tr key={row.rowIndex} className={hasError ? 'bg-red-950/20' : ''}>
                    <td className="px-3 py-2 text-slate-500 tabular-nums">{row.rowIndex}</td>
                    <td className="px-3 py-2 text-slate-300 tabular-nums whitespace-nowrap">{row.date || '—'}</td>
                    <td className="px-3 py-2 text-slate-300 tabular-nums">{row.week_number || '—'}</td>
                    <td className="px-3 py-2 font-mono text-slate-300 whitespace-nowrap">{row.division || '—'}</td>
                    <td className="px-3 py-2 text-slate-300 whitespace-nowrap">{(FORMAT_SHORT[row.match_format] ?? row.match_format) || '—'}</td>
                    <td className="px-3 py-2 text-slate-300 max-w-[100px] truncate">{row.opponent_club || '—'}</td>
                    <td className="px-3 py-2 text-white font-medium whitespace-nowrap">{row.player_1 || '—'}</td>
                    <td className="px-3 py-2 text-white font-medium whitespace-nowrap">{row.player_2 || '—'}</td>
                    <td className="px-3 py-2 text-white tabular-nums whitespace-nowrap">
                      {row.errors.length === 0 ? `${row.milton_score}–${row.opponent_score}` : '—'}
                    </td>
                    <td className="px-3 py-2">
                      {hasError
                        ? <XCircle size={14} className="text-red-400" />
                        : <CheckCircle size={14} className="text-emerald-400" />
                      }
                    </td>
                  </tr>
                  {hasError && (
                    <tr key={`${row.rowIndex}-err`} className="bg-red-950/10">
                      <td />
                      <td colSpan={9} className="px-3 pb-2 text-red-400 text-xs">
                        {row.errors.join(' · ')}
                      </td>
                    </tr>
                  )}
                </>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Import summary
// ---------------------------------------------------------------------------

import type { ImportResult } from '@/app/admin/upload/actions';

function ImportSummary({ result, onReset }: { result: ImportResult; onReset: () => void }) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <CheckCircle size={22} className="text-emerald-400" />
        <div>
          <p className="font-semibold text-white">Import complete</p>
          <p className="text-sm text-slate-400">
            {result.importedCount} of {result.totalRows} matches imported
            {result.skippedCount > 0 && ` · ${result.skippedCount} skipped`}
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
        {[
          { label: 'Matches imported', value: result.importedCount, cls: 'text-emerald-400' },
          { label: 'Rows skipped',     value: result.skippedCount,  cls: result.skippedCount > 0 ? 'text-red-400' : 'text-slate-500' },
          { label: 'Players created',  value: result.playersCreated.length, cls: 'text-brand-400' },
          { label: 'Total rows',       value: result.totalRows,     cls: 'text-white' },
        ].map(s => (
          <div key={s.label} className="rounded-lg bg-surface p-3">
            <p className="text-xs text-slate-500">{s.label}</p>
            <p className={`text-2xl font-bold tabular-nums ${s.cls}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* New players */}
      {result.playersCreated.length > 0 && (
        <div className="rounded-xl border border-brand-800 bg-brand-950/30 p-4">
          <p className="text-xs text-brand-400 font-semibold uppercase tracking-wide mb-2">
            New players created ({result.playersCreated.length})
          </p>
          <div className="flex flex-wrap gap-2">
            {result.playersCreated.map(name => (
              <span key={name} className="text-xs bg-surface text-slate-300 px-2 py-1 rounded-md border border-surface-border">
                {name}
              </span>
            ))}
          </div>
          <p className="text-xs text-slate-500 mt-2">
            Gender was inferred from match type where possible. Verify in Supabase and update if needed.
          </p>
        </div>
      )}

      {/* Row errors */}
      {result.rowErrors.length > 0 && (
        <div className="rounded-xl border border-red-800 bg-red-950/20 p-4 space-y-2">
          <p className="text-xs text-red-400 font-semibold uppercase tracking-wide">
            Skipped rows ({result.rowErrors.length})
          </p>
          {result.rowErrors.map(e => (
            <div key={e.rowIndex} className="text-xs text-red-300">
              Row {e.rowIndex} ({e.player1} &amp; {e.player2}): {e.error}
            </div>
          ))}
        </div>
      )}

      {/* Rating changes */}
      {result.matchSummaries.length > 0 && (
        <div className="rounded-xl border border-surface-border bg-surface-card">
          <div className="px-5 py-3.5 border-b border-surface-border">
            <p className="text-sm font-semibold text-white">Rating Changes</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-slate-500 uppercase tracking-wide border-b border-surface-border">
                  {['Row','Player','Before','After','Change'].map(h => (
                    <th key={h} className={`px-4 py-2.5 font-medium ${h === 'Change' || h === 'After' ? 'text-right' : 'text-left'}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border/50">
                {result.matchSummaries.flatMap(s => [
                  { row: s.rowIndex, name: s.player1, before: s.player1Before, after: s.player1After, delta: s.player1Delta },
                  { row: s.rowIndex, name: s.player2, before: s.player2Before, after: s.player2After, delta: s.player2Delta },
                ]).map((r, i) => (
                  <tr key={i}>
                    <td className="px-4 py-2 text-slate-500 tabular-nums">{r.row}</td>
                    <td className="px-4 py-2 text-white font-medium">{r.name}</td>
                    <td className="px-4 py-2 text-slate-400 tabular-nums">{r.before.toFixed(2)}</td>
                    <td className="px-4 py-2 text-right text-white tabular-nums">{r.after.toFixed(2)}</td>
                    <td className="px-4 py-2 text-right">
                      {r.delta > 0
                        ? <span className="text-emerald-400 flex items-center justify-end gap-0.5"><TrendingUp size={11} />+{r.delta.toFixed(4)}</span>
                        : r.delta < 0
                          ? <span className="text-red-400 flex items-center justify-end gap-0.5"><TrendingDown size={11} />{r.delta.toFixed(4)}</span>
                          : <span className="text-slate-500 flex items-center justify-end gap-0.5"><Minus size={11} />0.0000</span>
                      }
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Reset */}
      <button
        onClick={onReset}
        className="flex items-center gap-2 px-5 py-2 rounded-lg border border-surface-border text-slate-300 hover:text-white hover:border-slate-500 text-sm transition-colors"
      >
        <Upload size={14} /> Import another file
      </button>
    </div>
  );
}
