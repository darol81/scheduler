import { formatDuration } from '../utils/duration';
import { PERIOD_WINDOW_LABELS } from '../utils/periods';

/**
 * One goal, its target and how far the current period has got.
 * The bar caps at 100% but the label keeps counting past it.
 */
export default function GoalProgressBar({ progress, showPeriod = true, children }) {
  const { category, goal, actualMinutes, targetMinutes, pct, met, remainingMinutes } = progress;
  const width = Math.min(100, pct);

  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="font-medium text-slate-800">{category.name}</span>
          {showPeriod ? (
            <span className="text-xs text-slate-400">{PERIOD_WINDOW_LABELS[goal.period]}</span>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm tabular-nums text-slate-600">
            {formatDuration(actualMinutes)} / {formatDuration(targetMinutes)}
          </span>
          {children}
        </div>
      </div>

      <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-200">
        <div
          className="h-full rounded-full transition-all"
          style={{
            width: `${width}%`,
            backgroundColor: met ? '#059669' : category.color || '#4f46e5',
          }}
        />
      </div>

      <p className="mt-1 text-xs text-slate-500">
        {met ? `Goal met (${pct}%)` : `${pct}% -- ${formatDuration(remainingMinutes)} to go`}
      </p>
    </div>
  );
}
