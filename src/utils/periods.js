import {
  addDays,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  parseISO,
  startOfMonth,
  startOfWeek,
} from 'date-fns';

/** Weeks run Monday -> Sunday. */
const WEEK_OPTIONS = { weekStartsOn: 1 };

export const PERIODS = ['daily', 'weekly', 'monthly'];

export const PERIOD_LABELS = {
  daily: 'Daily',
  weekly: 'Weekly',
  monthly: 'Monthly',
};

export const PERIOD_WINDOW_LABELS = {
  daily: 'today',
  weekly: 'this week',
  monthly: 'this month',
};

/** Date -> "yyyy-MM-dd", the format the `date` columns use. */
export function toDateKey(date) {
  return format(date, 'yyyy-MM-dd');
}

/** "yyyy-MM-dd" -> Date at local midnight. */
export function fromDateKey(key) {
  return parseISO(key);
}

export function todayKey(reference = new Date()) {
  return toDateKey(reference);
}

/**
 * Inclusive { from, to } date-key range for the current daily/weekly/monthly
 * window. `reference` is injectable so this stays testable.
 */
export function currentPeriodRange(period, reference = new Date()) {
  switch (period) {
    case 'daily':
      return { from: toDateKey(reference), to: toDateKey(reference) };
    case 'weekly':
      return {
        from: toDateKey(startOfWeek(reference, WEEK_OPTIONS)),
        to: toDateKey(endOfWeek(reference, WEEK_OPTIONS)),
      };
    case 'monthly':
      return {
        from: toDateKey(startOfMonth(reference)),
        to: toDateKey(endOfMonth(reference)),
      };
    default:
      throw new Error(`Unknown period: ${period}`);
  }
}

/** Trailing window of `days` days, ending today (inclusive). */
export function lastNDaysRange(days, reference = new Date()) {
  return {
    from: toDateKey(addDays(reference, -(days - 1))),
    to: toDateKey(reference),
  };
}

/** Every date key from `from` to `to`, inclusive -- gap-filling for charts. */
export function eachDayKey(from, to) {
  const start = fromDateKey(from);
  const end = fromDateKey(to);
  if (end < start) return [];
  return eachDayOfInterval({ start, end }).map(toDateKey);
}

/** True when the date key falls inside an inclusive range. Keys sort lexically. */
export function isWithinRange(dateKey, { from, to }) {
  return dateKey >= from && dateKey <= to;
}

/** "1 Sep 2026" for display. */
export function formatDateKey(key) {
  return format(fromDateKey(key), 'd MMM yyyy');
}

/** "Mon 1 Sep" for chart axes. */
export function formatDateKeyShort(key) {
  return format(fromDateKey(key), 'EEE d MMM');
}
