'use client';

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from 'recharts';
import type { ChartPoint } from '@/lib/db/player-profile';

interface Props {
  data:             ChartPoint[];
  startingRating:   number;
  divisionBaseline: number;
}

function CustomTooltip({ active, payload }: { active?: boolean; payload?: { payload: ChartPoint }[] }) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="bg-surface-card border border-surface-border rounded-lg px-3 py-2 text-xs shadow-lg">
      <p className="text-slate-400">
        {p.n === 0 ? 'Season start' : `Match ${p.n}${p.week != null ? ` · Week ${p.week}` : ''}`}
      </p>
      <p className="text-white font-bold text-sm mt-0.5">{p.rating.toFixed(4)}</p>
    </div>
  );
}

export default function RatingTrendChart({ data, startingRating, divisionBaseline }: Props) {
  if (data.length <= 1) {
    return (
      <div className="flex items-center justify-center h-48 text-sm text-slate-500">
        Rating trend will appear after matches are entered.
      </div>
    );
  }

  const ratings  = data.map(d => d.rating);
  const minR     = Math.min(...ratings);
  const maxR     = Math.max(...ratings);
  const pad      = Math.max(0.05, (maxR - minR) * 0.15);
  const yMin     = Math.max(2.50, parseFloat((minR - pad).toFixed(2)));
  const yMax     = Math.min(5.50, parseFloat((maxR + pad).toFixed(2)));

  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={data} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />

        <XAxis
          dataKey="n"
          tick={{ fill: '#64748b', fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          tickFormatter={v => v === 0 ? 'Start' : `M${v}`}
        />
        <YAxis
          domain={[yMin, yMax]}
          tick={{ fill: '#64748b', fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          tickFormatter={v => v.toFixed(2)}
          width={44}
        />

        <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#334155' }} />

        {/* Division baseline */}
        {divisionBaseline >= yMin && divisionBaseline <= yMax && (
          <ReferenceLine
            y={divisionBaseline}
            stroke="#475569"
            strokeDasharray="6 3"
            label={{ value: `Baseline ${divisionBaseline.toFixed(2)}`, fill: '#475569', fontSize: 10, position: 'insideTopRight' }}
          />
        )}

        {/* Starting rating (only if different from baseline) */}
        {Math.abs(startingRating - divisionBaseline) > 0.001 &&
         startingRating >= yMin && startingRating <= yMax && (
          <ReferenceLine
            y={startingRating}
            stroke="#1e3a5f"
            strokeDasharray="4 4"
          />
        )}

        <Line
          type="monotone"
          dataKey="rating"
          stroke="#0ea5e9"
          strokeWidth={2}
          dot={{ fill: '#0ea5e9', r: 3, strokeWidth: 0 }}
          activeDot={{ fill: '#38bdf8', r: 5, strokeWidth: 0 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
