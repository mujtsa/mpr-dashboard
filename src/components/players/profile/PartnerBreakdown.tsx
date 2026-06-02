interface PartnerBreakdownItem {
  partner_id:     string;
  partner_name:   string;
  wins:           number;
  losses:         number;
  matches_played: number;
}

export default function PartnerBreakdown({ partners }: { partners: PartnerBreakdownItem[] }) {
  if (partners.length === 0) {
    return (
      <p className="text-sm text-slate-500 text-center py-6">
        Partner stats will appear after matches are entered.
      </p>
    );
  }

  return (
    <>
      {/* Desktop table */}
      <table className="hidden sm:table w-full text-sm">
        <thead>
          <tr className="text-xs text-slate-500 uppercase tracking-wide border-b border-surface-border">
            <th className="text-left pb-2 font-medium">Partner</th>
            <th className="text-center pb-2 font-medium">W</th>
            <th className="text-center pb-2 font-medium">L</th>
            <th className="text-right pb-2 font-medium">Played</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-surface-border/50">
          {partners.map(p => (
            <tr key={p.partner_id}>
              <td className="py-2.5 text-white font-medium">{p.partner_name}</td>
              <td className="py-2.5 text-center text-emerald-400 font-semibold tabular-nums">{p.wins}</td>
              <td className="py-2.5 text-center text-red-400 tabular-nums">{p.losses}</td>
              <td className="py-2.5 text-right text-slate-400 tabular-nums">{p.matches_played}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Mobile list */}
      <div className="sm:hidden divide-y divide-surface-border/50">
        {partners.map(p => (
          <div key={p.partner_id} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
            <span className="text-sm font-medium text-white">{p.partner_name}</span>
            <div className="flex items-center gap-3 text-sm">
              <span className="text-emerald-400 font-semibold">{p.wins}W</span>
              <span className="text-red-400">{p.losses}L</span>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
