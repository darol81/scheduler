import { useMemo } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Link } from 'react-router-dom'

import CategoryDot from '../components/CategoryDot'
import EmptyState from '../components/EmptyState'
import ErrorBanner from '../components/ErrorBanner'
import GoalProgressBar from '../components/GoalProgressBar'
import LogTimeForm from '../components/LogTimeForm'
import Spinner from '../components/Spinner'

import { clearEntriesError, selectAllEntries, selectEntriesError } from '../store/entriesSlice'
import { selectCategoriesError, selectCategoriesStatus } from '../store/categoriesSlice'
import {
  filterByRange,
  groupMinutesByCategory,
  selectActiveCategories,
  selectCategoryMap,
  selectEntriesWithCategory,
  selectGoalProgress,
  sumMinutes,
} from '../store/selectors'
import { formatDuration } from '../utils/duration'
import { currentPeriodRange, formatDateKey } from '../utils/periods'

function StatCard({ label, value, sub }) {
  return (
    <div className="card">
      <p className="card-title">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-slate-900">{value}</p>
      {sub ? <p className="mt-1 text-sm text-slate-500">{sub}</p> : null}
    </div>
  )
}

export default function DashboardPage() {
  const dispatch = useDispatch()

  const categories = useSelector(selectActiveCategories)
  const categoryMap = useSelector(selectCategoryMap)
  const categoriesStatus = useSelector(selectCategoriesStatus)
  const categoriesError = useSelector(selectCategoriesError)
  const entries = useSelector(selectAllEntries)
  const entriesError = useSelector(selectEntriesError)
  const entriesWithCategory = useSelector(selectEntriesWithCategory)
  const goalProgress = useSelector(selectGoalProgress)

  const todayRange = useMemo(() => currentPeriodRange('daily'), [])
  const weekRange = useMemo(() => currentPeriodRange('weekly'), [])

  const todayMinutes = useMemo(
    () => sumMinutes(filterByRange(entries, todayRange)),
    [entries, todayRange],
  )
  const weekEntries = useMemo(() => filterByRange(entries, weekRange), [entries, weekRange])
  const weekMinutes = useMemo(() => sumMinutes(weekEntries), [weekEntries])

  const weekByCategory = useMemo(() => {
    const totals = groupMinutesByCategory(weekEntries)
    return Object.entries(totals)
      .map(([categoryId, minutes]) => ({ category: categoryMap[categoryId], minutes }))
      .filter((row) => row.category)
      .sort((a, b) => b.minutes - a.minutes)
  }, [weekEntries, categoryMap])

  const recentEntries = useMemo(() => entriesWithCategory.slice(0, 8), [entriesWithCategory])

  if (categoriesStatus === 'loading' || categoriesStatus === 'idle') {
    return <Spinner label="Loading your data" />
  }

  if (categories.length === 0) {
    return (
      <div className="space-y-4">
        <ErrorBanner message={categoriesError} />
        <EmptyState
          title="Add your first category"
          description="Categories are how time gets split up: teaching, studying, admin, and so on."
          action={
            <Link to="/categories" className="btn-primary">
              Go to categories
            </Link>
          }
        />
      </div>
    )
  }

  const goalsMet = goalProgress.filter((progress) => progress.met).length

  return (
    <div className="space-y-6">
      <ErrorBanner message={entriesError} onDismiss={() => dispatch(clearEntriesError())} />

      <LogTimeForm categories={categories} />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Today"
          value={formatDuration(todayMinutes)}
          sub={formatDateKey(todayRange.from)}
        />
        <StatCard
          label="This week"
          value={formatDuration(weekMinutes)}
          sub={formatDateKey(weekRange.from) + ' to ' + formatDateKey(weekRange.to)}
        />
        <StatCard
          label="Goals met"
          value={goalsMet + ' / ' + goalProgress.length}
          sub={goalProgress.length === 0 ? 'No goals set yet' : 'In the current period'}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card">
          <div className="flex items-center justify-between">
            <h2 className="card-title">Goal progress</h2>
            <Link to="/goals" className="text-sm font-medium text-indigo-600 hover:underline">
              Manage
            </Link>
          </div>

          {goalProgress.length === 0 ? (
            <p className="mt-4 text-sm text-slate-500">
              No goals yet. Set one to see how the current week is tracking.
            </p>
          ) : (
            <div className="mt-4 space-y-5">
              {goalProgress.map((progress) => (
                <GoalProgressBar key={progress.goal.id} progress={progress} />
              ))}
            </div>
          )}
        </section>

        <section className="card">
          <h2 className="card-title">This week by category</h2>

          {weekByCategory.length === 0 ? (
            <p className="mt-4 text-sm text-slate-500">Nothing logged this week yet.</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {weekByCategory.map(({ category, minutes }) => (
                <li key={category.id}>
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="flex items-center gap-2 text-slate-700">
                      <CategoryDot color={category.color} />
                      {category.name}
                    </span>
                    <span className="tabular-nums text-slate-600">
                      {formatDuration(minutes)}
                      <span className="ml-2 text-xs text-slate-400">
                        {Math.round((minutes / weekMinutes) * 100)}%
                      </span>
                    </span>
                  </div>
                  <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: (minutes / weekMinutes) * 100 + '%',
                        backgroundColor: category.color,
                      }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="card">
        <div className="flex items-center justify-between">
          <h2 className="card-title">Recent entries</h2>
          <Link to="/entries" className="text-sm font-medium text-indigo-600 hover:underline">
            See all
          </Link>
        </div>

        {recentEntries.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500">Nothing logged yet.</p>
        ) : (
          <ul className="mt-4 divide-y divide-slate-100">
            {recentEntries.map((entry) => (
              <li key={entry.id} className="flex items-center justify-between gap-4 py-2 text-sm">
                <span className="flex min-w-0 items-center gap-2">
                  <CategoryDot color={entry.category ? entry.category.color : null} />
                  <span className="font-medium text-slate-700">
                    {entry.category ? entry.category.name : 'Unknown'}
                  </span>
                  {entry.note ? <span className="truncate text-slate-500">{entry.note}</span> : null}
                </span>
                <span className="flex shrink-0 items-center gap-4 tabular-nums text-slate-600">
                  <span className="text-slate-400">{formatDateKey(entry.entry_date)}</span>
                  <span>{formatDuration(entry.minutes)}</span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
