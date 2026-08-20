/**
 * Parsing and formatting of human-typed durations.
 *
 * Everything in the app stores time as a plain integer number of minutes; this
 * module is the only place that knows how to turn "1h 20min" into 80 and back.
 */

// Default ceiling for a single value. A time entry can't sensibly exceed one
// day; goals pass a larger max because "40h per week" is perfectly normal.
export const MAX_ENTRY_MINUTES = 24 * 60;
export const MAX_GOAL_MINUTES = 31 * 24 * 60;

// "1h", "1 h", "1t" (Finnish tunti), "1hr", "1 hours" ... then optionally
// minutes, where the unit itself may be omitted ("1h 20").
const DURATION_RE =
  /^(?:(\d+(?:\.\d+)?)\s*(?:hours?|hrs?|h|tuntia|tunti|t)\s*)?(?:(\d+)\s*(?:minutes?|mins?|minuuttia|m)?)?$/;

/**
 * Parse a duration string.
 *
 * @param {string} input        e.g. "1h 20min", "90", "1,5h"
 * @param {object} [options]
 * @param {number} [options.maxMinutes]  upper bound, inclusive
 * @returns {{minutes: number}|{error: string}}
 */
export function parseDuration(input, { maxMinutes = MAX_ENTRY_MINUTES } = {}) {
  if (input === null || input === undefined) {
    return { error: 'Enter a duration, e.g. 1h 20min' };
  }

  // Normalise: lowercase, decimal comma -> point, collapse whitespace.
  const text = String(input).trim().toLowerCase().replace(',', '.').replace(/\s+/g, ' ');

  if (text === '') {
    return { error: 'Enter a duration, e.g. 1h 20min' };
  }

  const match = DURATION_RE.exec(text);
  if (!match) {
    return { error: `"${input}" is not a duration. Try 1h 20min, 90min or 1,5h.` };
  }

  const [, hoursPart, minutesPart] = match;
  if (hoursPart === undefined && minutesPart === undefined) {
    return { error: `"${input}" is not a duration. Try 1h 20min, 90min or 1,5h.` };
  }

  const hours = hoursPart === undefined ? 0 : Number(hoursPart);
  const minutes = minutesPart === undefined ? 0 : Number(minutesPart);

  // "1h 70min" is a typo, but a bare "90" plainly means 90 minutes.
  if (hoursPart !== undefined && minutes >= 60) {
    return { error: 'Minutes must be under 60 when hours are given.' };
  }

  const total = Math.round(hours * 60 + minutes);

  if (total <= 0) {
    return { error: 'Duration must be greater than zero.' };
  }
  if (total > maxMinutes) {
    return { error: `That is more than ${formatDuration(maxMinutes)}.` };
  }

  return { minutes: total };
}

/**
 * Format minutes back into the same notation the user types.
 * 80 -> "1h 20min", 45 -> "45min", 120 -> "2h"
 */
export function formatDuration(minutes) {
  const total = Math.max(0, Math.round(Number(minutes) || 0));
  const h = Math.floor(total / 60);
  const m = total % 60;

  if (h === 0) return `${m}min`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}min`;
}

/** Decimal hours, for chart axes and tooltips. 80 -> 1.3 */
export function toHours(minutes) {
  return Math.round(((Number(minutes) || 0) / 60) * 10) / 10;
}
