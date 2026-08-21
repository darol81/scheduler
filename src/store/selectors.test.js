import { describe, expect, it } from 'vitest'
import {
  buildDailySeries,
  computeGoalProgress,
  filterByRange,
  groupMinutesByCategory,
  groupMinutesByDate,
  sumMinutes,
} from './selectors'

// Thursday 20 August 2026; week runs 17 - 23 August.
const REFERENCE = new Date(2026, 7, 20, 12, 0, 0)

const TEACHING = { id: 'cat-teaching', name: 'Teaching', color: '#4f46e5', archived: false }
const STUDYING = { id: 'cat-studying', name: 'Studying', color: '#0891b2', archived: false }
const ADMIN = { id: 'cat-admin', name: 'Admin', color: '#059669', archived: false }
const CATEGORIES = [TEACHING, STUDYING, ADMIN]

const ENTRIES = [
  { id: 'e1', category_id: TEACHING.id, entry_date: '2026-08-17', minutes: 120 },
  { id: 'e2', category_id: TEACHING.id, entry_date: '2026-08-20', minutes: 80 },
  { id: 'e3', category_id: STUDYING.id, entry_date: '2026-08-20', minutes: 45 },
  // Previous week -- must not count towards the weekly goals.
  { id: 'e4', category_id: TEACHING.id, entry_date: '2026-08-14', minutes: 300 },
  // Previous month -- must not count towards the monthly goal either.
  { id: 'e5', category_id: ADMIN.id, entry_date: '2026-07-30', minutes: 60 },
]

describe('filterByRange', () => {
  it('keeps only entries inside the inclusive range', () => {
    const kept = filterByRange(ENTRIES, { from: '2026-08-17', to: '2026-08-23' })
    expect(kept.map((entry) => entry.id)).toEqual(['e1', 'e2', 'e3'])
  })

  it('returns everything when no range is given', () => {
    expect(filterByRange(ENTRIES, null)).toHaveLength(ENTRIES.length)
  })
})

describe('sumMinutes and grouping', () => {
  it('totals minutes', () => {
    expect(sumMinutes(ENTRIES)).toBe(605)
    expect(sumMinutes([])).toBe(0)
  })

  it('groups by category', () => {
    expect(groupMinutesByCategory(ENTRIES)).toEqual({
      [TEACHING.id]: 500,
      [STUDYING.id]: 45,
      [ADMIN.id]: 60,
    })
  })

  it('groups by date and category', () => {
    expect(groupMinutesByDate(ENTRIES)['2026-08-20']).toEqual({
      [TEACHING.id]: 80,
      [STUDYING.id]: 45,
    })
  })
})

describe('computeGoalProgress', () => {
  const weeklyTeaching = {
    id: 'g1',
    category_id: TEACHING.id,
    period: 'weekly',
    target_minutes: 600,
  }
  const weeklyStudying = {
    id: 'g2',
    category_id: STUDYING.id,
    period: 'weekly',
    target_minutes: 30,
  }
  const monthlyAdmin = { id: 'g3', category_id: ADMIN.id, period: 'monthly', target_minutes: 120 }

  it('counts only the current period', () => {
    const [teaching] = computeGoalProgress([weeklyTeaching], CATEGORIES, ENTRIES, REFERENCE)
    // 120 + 80 this week; the 300 from last week is excluded.
    expect(teaching.actualMinutes).toBe(200)
    expect(teaching.targetMinutes).toBe(600)
    expect(teaching.pct).toBe(33)
    expect(teaching.remainingMinutes).toBe(400)
    expect(teaching.met).toBe(false)
  })

  it('marks a goal as met and keeps counting past 100%', () => {
    const [studying] = computeGoalProgress([weeklyStudying], CATEGORIES, ENTRIES, REFERENCE)
    expect(studying.actualMinutes).toBe(45)
    expect(studying.pct).toBe(150)
    expect(studying.remainingMinutes).toBe(0)
    expect(studying.met).toBe(true)
  })

  it('reports 0% for a category with nothing logged this month', () => {
    const [admin] = computeGoalProgress([monthlyAdmin], CATEGORIES, ENTRIES, REFERENCE)
    expect(admin.actualMinutes).toBe(0)
    expect(admin.pct).toBe(0)
    expect(admin.met).toBe(false)
  })

  it('drops goals whose category no longer exists', () => {
    const orphan = { id: 'g4', category_id: 'gone', period: 'weekly', target_minutes: 60 }
    expect(computeGoalProgress([orphan], CATEGORIES, ENTRIES, REFERENCE)).toEqual([])
  })

  it('sorts daily before weekly before monthly, then by category name', () => {
    const goals = [
      monthlyAdmin,
      weeklyTeaching,
      weeklyStudying,
      { id: 'g5', category_id: ADMIN.id, period: 'daily', target_minutes: 30 },
    ]
    const order = computeGoalProgress(goals, CATEGORIES, ENTRIES, REFERENCE).map(
      (progress) => `${progress.goal.period}:${progress.category.name}`,
    )
    expect(order).toEqual([
      'daily:Admin',
      'weekly:Studying',
      'weekly:Teaching',
      'monthly:Admin',
    ])
  })
})

describe('buildDailySeries', () => {
  it('emits one row per day with a key per category, gaps filled with zeroes', () => {
    const series = buildDailySeries(ENTRIES, CATEGORIES, { from: '2026-08-17', to: '2026-08-20' })

    expect(series.map((row) => row.date)).toEqual([
      '2026-08-17',
      '2026-08-18',
      '2026-08-19',
      '2026-08-20',
    ])
    expect(series[0]).toMatchObject({ [TEACHING.id]: 120, [STUDYING.id]: 0, total: 120 })
    expect(series[1]).toMatchObject({ total: 0 })
    expect(series[3]).toMatchObject({ [TEACHING.id]: 80, [STUDYING.id]: 45, total: 125 })
  })
})
