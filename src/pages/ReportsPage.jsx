import { useMemo, useState } from 'react'
import { useSelector } from 'react-redux'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import EmptyState from '../components/EmptyState'
import Spinner from '../components/Spinner'

import { selectAllCategories } from '../store/categoriesSlice'
import { selectAllEntries, selectEntriesStatus } from '../store/entriesSlice'
import {
  buildDailySeries,
  filterByRange,
  groupMinutesByCategory,
  sumMinutes,
} from '../store/selectors'
import { formatDuration, toHours } from '../utils/duration'
import {
  currentPeriodRange,
  eachDayKey,
  formatDateKey,
  lastNDaysRange,
  toDateKey,
  fromDateKey,
} from '../utils/periods'

// Beyond this the per-day chart turns into a smear, so it is hidden instead.
const MAX_DAILY_BARS = 120

const PRESETS = [
  { key: 'week', label: 'This week', build: () => currentPeriodRange('weekly') },
  { key: 'month', label: 'This month', build: () => currentPeriodRange('monthly') },
  { key: 'last30', label: 'Last 30 days', build: () => lastNDaysRange(30) },
  { key: 'last90', label: 'Last 90 days', build: () => lastNDaysRange(90) },
]

/** Recharts hands us minutes; humans want "1h 20min". */
function DurationTooltip({ active, payload, label, labelFormatter }) {
  if (!active || !payload || payload.length === 0) return null

  const rows = payload.filter((item) => item.value > 0)
  if (rows.length === 0) return null

  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-md">
      <p className="font-medium text-slate-700">{labelFormatter ? labelFormatter(label) : label}</p>
      <ul className="mt-1 space-y-0.5">
        {rows.map((item) => (
          <li key={item.dataKey} className="flex items-center gap-2 text-slate-600">
            <span
              className="inline-block h-2 w-2 rounded-full"
              style={{ backgroundColor: item.color || item.fill }}
            />
            <span className="flex-1">{item.name}</span>
            <span className="tabular-nums">{formatDuration(item.value)}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

export default function ReportsPage() {
  const categories = useSelector(selectAllCategories)
  const entries = useSelector(selectAllEntries)
  const status = useSelector(selectEntriesStatus)

  const [preset, setPreset] = useState('month')
  const [range, setRange] = useState(() => currentPeriodRange('monthly'))

  function applyPreset(key) {
    setPreset(key)
    const found = PRESETS.find((item) => item.key === key)
    if (found) setRange(found.build())
  }

  function setRangeField(field, value) {
    if (!value) return
    setPreset('custom')
    setRange((current) => ({ ...current, [field]: value }))
  }

  const rangeEntries = useMemo(() => filterByRange(entries, range), [entries, range])
  const total = useMemo(() => sumMinutes(rangeEntries), [rangeEntries])

  // Only categories with time in this range, biggest first.
  const categoryTotals = useMemo(() => {
    const totals = groupMinutesByCategory(rangeEntries)
    return categories
      .filter((category) => totals[category.id] > 0)
      .map((category) => ({
        id: category.id,
        name: category.name,
        color: category.color,
        minutes: totals[category.id],
        share: total > 0 ? Math.round((totals[category.id] / total) * 100) : 0,
      }))
      .sort((a, b) => b.minutes - a.minutes)
  }, [rangeEntries, categories, total])

  const dayCount = useMemo(() => {
    const start = fromDateKey(range.from)
    const end = fromDateKey(range.to)
    if (end < start) return 0
    return eachDayKey(range.from, range.to).length
  }, [range])

  const dailySeries = useMemo(() => {
    if (dayCount === 0 || dayCount > MAX_DAILY_BARS) return []
    const stacked = categories.filter((category) =>
      categoryTotals.some((row) => row.id === category.id),
    )
    return buildDailySeries(entries, stacked, range)
  }, [entries, categories, categoryTotals, range, dayCount])

  const stackedCategories = useMemo(
    () => categories.filter((category) => categoryTotals.some((row) => row.id === category.id)),
    [categories, categoryTotals],
  )

  const averagePerDay = dayCount > 0 ? Math.round(total / dayCount) : 0

  if (status === 'loading' || status === 'idle') {
    return <Spinner label="Loading reports" />
  }

  return (
    <div className="space-y-6">
      <section className="card">
        <h2 className="card-title">Range</h2>

        <div className="mt-3 flex flex-wrap gap-2">
          {PRESETS.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => applyPreset(item.key)}
              className={
                preset === item.key
                  ? 'rounded-full bg-indigo-600 px-3 py-1 text-sm font-medium text-white'
                  : 'rounded-full border border-slate-300 px-3 py-1 text-sm text-slate-600 hover:bg-slate-50'
              }
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="report-from">
              From
            </label>
            <input
              id="report-from"
              type="date"
              className="input"
              value={range.from}
              max={range.to}
              onChange={(event) => setRangeField('from', event.target.value)}
            />
          </div>
          <div>
            <label className="label" htmlFor="report-to">
              To
            </label>
            <input
              id="report-to"
              type="date"
              className="input"
              value={range.to}
              min={range.from}
              max={toDateKey(new Date())}
              onChange={(event) => setRangeField('to', event.target.value)}
            />
          </div>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-400">Total</p>
            <p className="text-xl font-semibold text-slate-900">{formatDuration(total)}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-400">Average per day</p>
            <p className="text-xl font-semibold text-slate-900">{formatDuration(averagePerDay)}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-400">Days covered</p>
            <p className="text-xl font-semibold text-slate-900">{dayCount}</p>
          </div>
        </div>
        <p className="hint">
          {formatDateKey(range.from)} to {formatDateKey(range.to)}
        </p>
      </section>

      {categoryTotals.length === 0 ? (
        <EmptyState
          title="Nothing logged in this range"
          description="Pick a wider range, or add some entries from the dashboard."
        />
      ) : (
        <>
          <section className="card">
            <h2 className="card-title">Time per category</h2>
            <div className="mt-4 h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categoryTotals} margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#64748b' }} />
                  <YAxis
                    tick={{ fontSize: 12, fill: '#64748b' }}
                    tickFormatter={(value) => `${toHours(value)}h`}
                  />
                  <Tooltip content={<DurationTooltip />} cursor={{ fill: '#f1f5f9' }} />
                  <Bar dataKey="minutes" name="Time" radius={[4, 4, 0, 0]}>
                    {categoryTotals.map((row) => (
                      <Cell key={row.id} fill={row.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <ul className="mt-4 divide-y divide-slate-100">
              {categoryTotals.map((row) => (
                <li key={row.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                  <span className="flex items-center gap-2 text-slate-700">
                    <span
                      className="inline-block h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: row.color }}
                    />
                    {row.name}
                  </span>
                  <span className="tabular-nums text-slate-600">
                    {formatDuration(row.minutes)}
                    <span className="ml-2 text-xs text-slate-400">{row.share}%</span>
                  </span>
                </li>
              ))}
            </ul>
          </section>

          <section className="card">
            <h2 className="card-title">Day by day</h2>
            {dailySeries.length === 0 ? (
              <p className="mt-4 text-sm text-slate-500">
                The daily breakdown is shown for ranges up to {MAX_DAILY_BARS} days. Narrow the range
                to see it.
              </p>
            ) : (
              <div className="mt-4 h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dailySeries} margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 11, fill: '#64748b' }}
                      tickFormatter={(value) => value.slice(5)}
                      minTickGap={12}
                    />
                    <YAxis
                      tick={{ fontSize: 12, fill: '#64748b' }}
                      tickFormatter={(value) => `${toHours(value)}h`}
                    />
                    <Tooltip
                      content={<DurationTooltip labelFormatter={formatDateKey} />}
                      cursor={{ fill: '#f1f5f9' }}
                    />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    {stackedCategories.map((category) => (
                      <Bar
                        key={category.id}
                        dataKey={category.id}
                        name={category.name}
                        stackId="time"
                        fill={category.color}
                      />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  )
}
