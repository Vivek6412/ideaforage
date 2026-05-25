"use client";

interface Props {
  approved: number;
  total: number;
}

export function ProgressBar({ approved, total }: Props) {
  const pct = total === 0 ? 0 : Math.round((approved / total) * 100);

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="text-zinc-500 font-mono">Progress</span>
        <span className="text-zinc-400 font-mono tabular-nums">
          {approved}/{total} tasks
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-zinc-800 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700 ease-out"
          style={{
            width: `${pct}%`,
            background: pct === 100
              ? "linear-gradient(90deg, #22c55e, #16a34a)"
              : "linear-gradient(90deg, #f97316, #ef4444)",
          }}
        />
      </div>
      {pct === 100 && (
        <p className="text-xs text-emerald-400 font-mono">✓ Execution complete</p>
      )}
    </div>
  );
}