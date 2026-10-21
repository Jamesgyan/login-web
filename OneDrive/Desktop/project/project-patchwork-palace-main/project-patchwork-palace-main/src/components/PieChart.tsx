import { money } from "@/lib/session";

/** Donut-style pie comparing money spent against money left, for one room. */
export function PieChart({ spent, remaining }: { spent: number; remaining: number }) {
  const safeRemaining = Math.max(remaining, 0);
  const total = spent + safeRemaining;
  const spentPct = total > 0 ? spent / total : 0;
  const r = 60;
  const c = 2 * Math.PI * r;
  return (
    <div className="flex flex-col items-center gap-5 sm:flex-row sm:justify-center">
      <svg viewBox="0 0 160 160" className="h-44 w-44 -rotate-90" role="img" aria-label={`Spent ${money(spent)} of ${money(total)}`}>
        <circle cx="80" cy="80" r={r} fill="none" strokeWidth="32" className="stroke-success" />
        {spentPct > 0 && (
          <circle
            cx="80" cy="80" r={r} fill="none" strokeWidth="32"
            className="stroke-destructive"
            strokeDasharray={`${spentPct * c} ${c}`}
          />
        )}
      </svg>
      <div className="space-y-2 text-sm">
        <p className="flex items-center gap-2"><span className="inline-block h-4 w-4 rounded border-2 border-ink bg-destructive" /> Spent: <b>{money(spent)}</b></p>
        <p className="flex items-center gap-2"><span className="inline-block h-4 w-4 rounded border-2 border-ink bg-success" /> Remaining: <b>{money(remaining)}</b></p>
        <p className="text-muted-foreground">Total income: {money(total)}</p>
        {remaining < 0 && <p className="font-semibold text-destructive">Over budget by {money(Math.abs(remaining))}</p>}
      </div>
    </div>
  );
}
