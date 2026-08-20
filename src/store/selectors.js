import { createSelector } from '@reduxjs/toolkit';
import { selectAllCategories } from './categoriesSlice';
import { selectAllEntries } from './entriesSlice';
import { selectAllGoals } from './goalsSlice';
import { currentPeriodRange, eachDayKey, isWithinRange } from '../utils/periods';

// ---------------------------------------------------------------------------
// Pure helpers. These take plain arrays so they can be unit tested directly and
// reused inside components without dragging the store along.
// ---------------------------------------------------------------------------

/** Entries whose entry_date falls inside an inclusive { from, to } range. */
export function filterByRange(entries, range) {
  if (!range) return entries;
  return entries.filter((entry) => isWithinRange(entry.entry_date, range));
}

export function sumMinutes(entries) {
  return entries.reduce((total, entry) => total + entry.minutes, 0);
}

/** { [categoryId]: minutes } */
export function groupMinutesByCategory(entries) {
  const totals = {};
  for (const entry of entries) {
    totals[entry.category_id] = (totals[entry.category_id] || 0) + entry.minutes;
  }
  return totals;
}

/** { [dateKey]: { [categoryId]: minutes } } */
export function groupMinutesByDate(entries) {
  const byDate = {};
  for (const entry of entries) {
    const day = byDate[entry.entry_date] || (byDate[entry.entry_date] = {});
    day[entry.category_id] = (day[entry.category_id] || 0) + entry.minutes;
  }
  return byDate;
}

/**
 * Goal progress for one period window.
 * `reference` is injectable so tests can pin "now".
 *
 * @returns {Array<{goal, category, actualMinutes, targetMinutes, pct, remainingMinutes, met}>}
 */
export function computeGoalProgress(goals, categories, entries, reference = new Date()) {
  const categoryMap = new Map(categories.map((category) => [category.id, category]));
  // One range per period, not per goal -- most users have goals in one or two periods.
  const rangeCache = {};

  return goals
    .map((goal) => {
      const category = categoryMap.get(goal.category_id);
      if (!category) return null; // category deleted out from under the goal

      const range = rangeCache[goal.period] || (rangeCache[goal.period] = currentPeriodRange(goal.period, reference));
      const actualMinutes = sumMinutes(
        entries.filter((entry) => entry.category_id === goal.category_id && isWithinRange(entry.entry_date, range)),
      );
      const targetMinutes = goal.target_minutes;

      return {
        goal,
        category,
        range,
        actualMinutes,
        targetMinutes,
        remainingMinutes: Math.max(0, targetMinutes - actualMinutes),
        pct: targetMinutes > 0 ? Math.round((actualMinutes / targetMinutes) * 100) : 0,
        met: actualMinutes >= targetMinutes,
      };
    })
    .filter(Boolean)
    .sort((a, b) => {
      const periodOrder = { daily: 0, weekly: 1, monthly: 2 };
      if (a.goal.period !== b.goal.period) return periodOrder[a.goal.period] - periodOrder[b.goal.period];
      return a.category.name.localeCompare(b.category.name);
    });
}

/**
 * Chart-ready rows, one per day in the range, with a key per category so
 * Recharts can stack them. Days with no entries are still present (as zeroes)
 * so the x-axis has no gaps.
 */
export function buildDailySeries(entries, categories, range) {
  const byDate = groupMinutesByDate(filterByRange(entries, range));
  return eachDayKey(range.from, range.to).map((dateKey) => {
    const row = { date: dateKey, total: 0 };
    for (const category of categories) {
      const minutes = (byDate[dateKey] && byDate[dateKey][category.id]) || 0;
      row[category.id] = minutes;
      row.total += minutes;
    }
    return row;
  });
}

// ---------------------------------------------------------------------------
// Memoised selectors
// ---------------------------------------------------------------------------

export const selectActiveCategories = createSelector([selectAllCategories], (categories) =>
  categories.filter((category) => !category.archived),
);

export const selectArchivedCategories = createSelector([selectAllCategories], (categories) =>
  categories.filter((category) => category.archived),
);

/** Map for O(1) lookups when rendering entry rows. */
export const selectCategoryMap = createSelector([selectAllCategories], (categories) => {
  const map = {};
  for (const category of categories) map[category.id] = category;
  return map;
});

/** Entries with their category object attached, ready for tables and lists. */
export const selectEntriesWithCategory = createSelector(
  [selectAllEntries, selectCategoryMap],
  (entries, categoryMap) =>
    entries.map((entry) => ({ ...entry, category: categoryMap[entry.category_id] || null })),
);

/**
 * Live goal progress. Recomputed whenever goals, categories or entries change.
 * The period window is derived from the wall clock at compute time, so a tab
 * left open across midnight refreshes on the next data change.
 */
export const selectGoalProgress = createSelector(
  [selectAllGoals, selectAllCategories, selectAllEntries],
  (goals, categories, entries) => computeGoalProgress(goals, categories, entries),
);

/** True once every table has loaded at least once. */
export const selectDataReady = (state) =>
  state.categories.status === 'succeeded' &&
  state.entries.status === 'succeeded' &&
  state.goals.status === 'succeeded';

export const selectAnyLoading = (state) =>
  state.categories.status === 'loading' ||
  state.entries.status === 'loading' ||
  state.goals.status === 'loading';
