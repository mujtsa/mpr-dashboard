import type { Metadata } from 'next';
import { HelpCircle } from 'lucide-react';

export const metadata: Metadata = { title: 'FAQ' };

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

const faqs: { q: string; a: React.ReactNode }[] = [
  {
    q: 'What is Milton Player Rating (MPR)?',
    a: (
      <>
        MPR is an internal rating system for Milton Pickleball players competing in
        Trillium League. It tracks how each player's rating moves throughout the season based on
        match results and scores — so you can see your progress over time.
      </>
    ),
  },
  {
    q: 'What rating do I start with?',
    a: (
      <div className="space-y-2">
        <p>Your starting rating is set once, based on the division you were registered in:</p>
        <ul className="ml-4 space-y-1 list-disc text-slate-300">
          <li><span className="font-mono text-white">4.0</span> division → starts at <span className="font-semibold text-white">4.00</span></li>
          <li><span className="font-mono text-white">3.5+</span> division → starts at <span className="font-semibold text-white">3.50</span></li>
          <li><span className="font-mono text-white">3.5−</span> division → starts at <span className="font-semibold text-white">3.25</span></li>
        </ul>
        <p>Your starting rating never changes — it is your baseline for measuring growth.</p>
      </div>
    ),
  },
  {
    q: 'How does my rating change after a match?',
    a: (
      <div className="space-y-2">
        <p>Your rating moves up or down based on two things only: <strong className="text-white">result</strong> (win or loss) and <strong className="text-white">score margin</strong> (how close the game was).</p>
        <p>Closer games mean smaller changes. Bigger wins or losses mean bigger changes. Here are some examples:</p>
        <div className="overflow-x-auto">
          <table className="text-sm mt-1 border-collapse">
            <thead>
              <tr className="text-slate-500 text-xs uppercase tracking-wide">
                <th className="text-left pr-6 pb-1">Score</th>
                <th className="text-right pb-1">Rating Change</th>
              </tr>
            </thead>
            <tbody className="text-slate-300">
              {[
                ['15 – 14 (win)',        '+0.02'],
                ['15 – 10 (win)',        '+0.06'],
                ['15 – 4 or better (win)', '+0.12'],
                ['14 – 15 (loss)',       '−0.02'],
                ['10 – 15 (loss)',       '−0.06'],
                ['4 – 15 or worse (loss)', '−0.12'],
              ].map(([score, delta]) => (
                <tr key={score}>
                  <td className="pr-6 py-0.5">{score}</td>
                  <td className={`text-right font-mono font-semibold py-0.5 ${delta.startsWith('+') ? 'text-emerald-400' : 'text-red-400'}`}>{delta}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    ),
  },
  {
    q: 'Does my partner\'s rating affect my rating change?',
    a: 'No. Your rating change depends only on the match result and the score. It does not matter who your partner is or what their rating is.',
  },
  {
    q: 'Do opponent ratings matter?',
    a: 'No. MPR does not track or store opponent player ratings. Only Milton players are rated. The score you played against is what matters — not who you played against.',
  },
  {
    q: 'Do both players on my team get the same rating change?',
    a: 'Yes. Both Milton players on the same team always receive exactly the same rating change for that match. The score is the only factor.',
  },
  {
    q: 'Why do we show a Season Record and an Overall Record?',
    a: (
      <>
        <strong className="text-white">Season Record</strong> shows your wins and losses in the current Trillium season only.
        <br /><br />
        <strong className="text-white">Overall Record</strong> is your combined record across all seasons tracked in MPR.
        As more seasons are added, your overall record will grow to reflect your full history.
      </>
    ),
  },
  {
    q: 'What is Avg Points Won %?',
    a: (
      <div className="space-y-2">
        <p>
          <strong className="text-white">Avg Points Won %</strong> shows what percentage of all
          points played in your matches were won by your side.
        </p>
        <p className="font-mono text-sm bg-surface px-3 py-2 rounded-lg text-slate-300">
          Avg Points Won % = total points your team scored ÷ total points played × 100
        </p>
        <p>For example, if across three matches your team scored 15, 12, and 15 points (total 42),
          and the total points played in those games was 72, your Avg Points Won % is
          <strong className="text-white ml-1">58.3%</strong>.</p>
        <p>A percentage above 50% means you are winning more points than your opponents on average.
          It is a good indicator of consistent performance even in close matches.</p>
      </div>
    ),
  },
  {
    q: 'Can the rating formula change in the future?',
    a: (
      <>
        Yes. MPR is designed to allow the rating formula to evolve. If the formula changes,
        an admin can trigger a <strong className="text-white">Recalculate</strong> action that
        replays every match using the new formula — without re-entering any data.
        All historical match scores are preserved, so ratings can always be recalculated from scratch.
      </>
    ),
  },
];

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function FaqPage() {
  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <HelpCircle size={20} className="text-brand-400" />
          <h1 className="text-2xl font-bold text-white">Frequently Asked Questions</h1>
        </div>
        <p className="text-sm text-slate-400">
          Everything you need to know about how Milton Player Rating works.
        </p>
      </div>

      <div className="space-y-4">
        {faqs.map((faq, i) => (
          <div key={i} className="rounded-xl border border-surface-border bg-surface-card p-5 space-y-2">
            <h2 className="text-sm font-semibold text-white">{faq.q}</h2>
            <div className="text-sm text-slate-400 leading-relaxed">{faq.a}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
