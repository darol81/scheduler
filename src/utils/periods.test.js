import { describe, expect, it } from 'vitest'
import {
  currentPeriodRange,
  eachDayKey,
  isWithinRange,
  lastNDaysRange,
  toDateKey,
} from './periods'

// Thursday 20 August 2026. Its Monday-start week is 17 - 23 August.
const REFERENCE = new Date(2026, 7, 20, 12, 0, 0)

describe('currentPeriodRange', () => {
  it('returns a single day for the daily period', () => {
    expect(currentPeriodRange('daily', REFERENCE)).toEqual({
      from: '2026-08-20',
      to: '2026-08-20',
    })
  })

  it('starts weeks on Monday', () => {
    expect(currentPeriodRange('weekly', REFERENCE)).toEqual({
      from: '2026-08-17',
      to: '2026-08-23',
    })
  })

  it('keeps a Sunday in the week that started the previous Monday', () => {
    const sunday = new Date(2026, 7, 23, 12, 0, 0)
    expect(currentPeriodRange('weekly', sunday)).toEqual({
      from: '2026-08-17',
      to: '2026-08-23',
    })
  })

  it('keeps a Monday as the first day of its own week', () => {
    const monday = new Date(2026, 7, 24, 12, 0, 0)
    expect(currentPeriodRange('weekly', monday)).toEqual({
      from: '2026-08-24',
      to: '2026-08-30',
    })
  })

  it('covers the whole calendar month', () => {
    expect(currentPeriodRange('monthly', REFERENCE)).toEqual({
      from: '2026-08-01',
      to: '2026-08-31',
    })
  })

  it('handles February in a non-leap year', () => {
    const february = new Date(2026, 1, 15, 12, 0, 0)
    expect(currentPeriodRange('monthly', february)).toEqual({
      from: '2026-02-01',
      to: '2026-02-28',
    })
  })

  it('rejects an unknown period', () => {
    expect(() => currentPeriodRange('yearly', REFERENCE)).toThrow(/Unknown period/)
  })
})

describe('lastNDaysRange', () => {
  it('includes today as the last day', () => {
    expect(lastNDaysRange(30, REFERENCE)).toEqual({ from: '2026-07-22', to: '2026-08-20' })
  })

  it('treats a single day as today only', () => {
    expect(lastNDaysRange(1, REFERENCE)).toEqual({ from: '2026-08-20', to: '2026-08-20' })
  })
})

describe('eachDayKey', () => {
  it('is inclusive at both ends', () => {
    expect(eachDayKey('2026-08-17', '2026-08-20')).toEqual([
      '2026-08-17',
      '2026-08-18',
      '2026-08-19',
      '2026-08-20',
    ])
  })

  it('crosses a month boundary', () => {
    expect(eachDayKey('2026-08-30', '2026-09-01')).toEqual([
      '2026-08-30',
      '2026-08-31',
      '2026-09-01',
    ])
  })

  it('returns nothing for a backwards range', () => {
    expect(eachDayKey('2026-08-20', '2026-08-10')).toEqual([])
  })
})

describe('isWithinRange', () => {
  const range = { from: '2026-08-17', to: '2026-08-23' }

  it('includes the boundaries', () => {
    expect(isWithinRange('2026-08-17', range)).toBe(true)
    expect(isWithinRange('2026-08-23', range)).toBe(true)
  })

  it('excludes days outside', () => {
    expect(isWithinRange('2026-08-16', range)).toBe(false)
    expect(isWithinRange('2026-08-24', range)).toBe(false)
  })
})

describe('toDateKey', () => {
  it('uses local time, not UTC', () => {
    expect(toDateKey(new Date(2026, 7, 20, 23, 30))).toBe('2026-08-20')
    expect(toDateKey(new Date(2026, 7, 20, 0, 30))).toBe('2026-08-20')
  })
})
