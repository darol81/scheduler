import { useMemo, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Link } from 'react-router-dom'

import CategorySelect from '../components/CategorySelect'
import DurationInput from '../components/DurationInput'
import EmptyState from '../components/EmptyState'
import ErrorBanner from '../components/ErrorBanner'
import GoalProgressBar from '../components/GoalProgressBar'
import Spinner from '../components/Spinner'

import { clearGoalsError, deleteGoal, selectGoalsError, selectGoalsStatus, upsertGoal } from '../store/goalsSlice'
import { selectActiveCategories, selectGoalProgress } from '../store/selectors'
import { MAX_GOAL_MINUTES, formatDuration } from '../utils/duration'
import { PERIODS, PERIOD_LABELS } from '../utils/periods'

function NewGoalForm({ categories, existingGoals }) {
  const dispatch = useDispatch()
  const [categoryId, setCategoryId] = useState('')
  const [period, setPeriod] = useState('weekly')
  const [duration, setDuration] = useState({ text: '', minutes: null, error: null })
  const [saving, setSaving] = useState(false)

  // Saving over an existing (category, period) pair replaces its target, so say so.
  const replaces = existingGoals.some(
    (goal) => goal.category_id === categoryId && goal.period === period,
  )

  const canSubmit = Boolean(categoryId) && Boolean(duration.minutes) && !saving

  async function handleSubmit(event) {
    event.preventDefault()
    if (!canSubmit) return
    setSaving(true)
    const action = await dispatch(
      upsertGoal({ categoryId, period, targetMinutes: duration.minutes }),
    )
    setSaving(false)
    if (!action.type.endsWith('/rejected')) {
      setDuration({ text: '', minutes: null, error: null })
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card">
      <h2 className="card-title">Set a goal</h2>

      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        <CategorySelect categories={categories} value={categoryId} onChange={setCategoryId} />

        <div>
          <label className="label" htmlFor="goal-period">
            Period
          </label>
          <select
            id="goal-period"
            className="input"
            value={period}
            onChange={(event) => setPeriod(event.target.value)}
          >
            {PERIODS.map((value) => (
              <option key={value} value={value}>
                {PERIOD_LABELS[value]}
              </option>
            ))}
          </select>
        </div>

        <DurationInput
          value={duration.text}
          onChange={setDuration}
          label="Target"
          placeholder="e.g. 10h"
          maxMinutes={MAX_GOAL_MINUTES}
        />
      </div>

      <div className="mt-4 flex items-center gap-3">
        <button type="submit" className="btn-primary" disabled={!canSubmit}>
          {saving ? 'Saving...' : 'Save goal'}
        </button>
        {replaces ? (
          <span className="text-sm text-slate-500">
            This replaces the existing {PERIOD_LABELS[period].toLowerCase()} goal for that category.
          </span>
        ) : null}
      </div>
    </form>
  )
}

function GoalRow({ progress }) {
  const dispatch = useDispatch()
  const [editing, setEditing] = useState(false)
  const [duration, setDuration] = useState({
    text: formatDuration(progress.goal.target_minutes),
    minutes: progress.goal.target_minutes,
    error: null,
  })
  const [saving, setSaving] = useState(false)

  async function handleSave(event) {
    event.preventDefault()
    if (!duration.minutes) return
    setSaving(true)
    const action = await dispatch(
      upsertGoal({
        categoryId: progress.goal.category_id,
        period: progress.goal.period,
        targetMinutes: duration.minutes,
      }),
    )
    setSaving(false)
    if (!action.type.endsWith('/rejected')) setEditing(false)
  }

  return (
    <li className="py-4">
      <GoalProgressBar progress={progress} showPeriod={false}>
        <button type="button" className="btn-ghost" onClick={() => setEditing((value) => !value)}>
          {editing ? 'Cancel' : 'Edit'}
        </button>
        <button
          type="button"
          className="btn-ghost text-rose-600"
          onClick={() => dispatch(deleteGoal(progress.goal.id))}
        >
          Remove
        </button>
      </GoalProgressBar>

      {editing ? (
        <form onSubmit={handleSave} className="mt-3 flex items-end gap-3">
          <div className="w-56">
            <DurationInput
              value={duration.text}
              onChange={setDuration}
              label="New target"
              placeholder="e.g. 10h"
              maxMinutes={MAX_GOAL_MINUTES}
            />
          </div>
          <button type="submit" className="btn-primary mb-6" disabled={!duration.minutes || saving}>
            {saving ? 'Saving...' : 'Update'}
          </button>
        </form>
      ) : null}
    </li>
  )
}

export default function GoalsPage() {
  const dispatch = useDispatch()

  const categories = useSelector(selectActiveCategories)
  const goalProgress = useSelector(selectGoalProgress)
  const status = useSelector(selectGoalsStatus)
  const error = useSelector(selectGoalsError)

  const existingGoals = useMemo(() => goalProgress.map((progress) => progress.goal), [goalProgress])

  const byPeriod = useMemo(() => {
    const groups = {}
    for (const period of PERIODS) groups[period] = []
    for (const progress of goalProgress) groups[progress.goal.period].push(progress)
    return groups
  }, [goalProgress])

  if (status === 'loading' || status === 'idle') {
    return <Spinner label="Loading goals" />
  }

  if (categories.length === 0) {
    return (
      <EmptyState
        title="Add a category first"
        description="Goals are set per category, so there needs to be at least one."
        action={
          <Link to="/categories" className="btn-primary">
            Go to categories
          </Link>
        }
      />
    )
  }

  return (
    <div className="space-y-6">
      <ErrorBanner message={error} onDismiss={() => dispatch(clearGoalsError())} />

      <NewGoalForm categories={categories} existingGoals={existingGoals} />

      {goalProgress.length === 0 ? (
        <EmptyState
          title="No goals yet"
          description="Set one above, for example 10h of teaching per week."
        />
      ) : (
        PERIODS.filter((period) => byPeriod[period].length > 0).map((period) => (
          <section key={period} className="card">
            <h2 className="card-title">{PERIOD_LABELS[period]} goals</h2>
            <ul className="mt-2 divide-y divide-slate-100">
              {byPeriod[period].map((progress) => (
                <GoalRow key={progress.goal.id} progress={progress} />
              ))}
            </ul>
          </section>
        ))
      )}
    </div>
  )
}
