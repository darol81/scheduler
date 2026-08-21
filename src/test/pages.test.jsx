import { render, screen, within } from '@testing-library/react'
import { Provider } from 'react-redux'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'

import { createAppStore } from '../store'
import CategoriesPage from '../pages/CategoriesPage'
import DashboardPage from '../pages/DashboardPage'
import EntriesPage from '../pages/EntriesPage'
import GoalsPage from '../pages/GoalsPage'
import ReportsPage from '../pages/ReportsPage'

const TEACHING = {
  id: 'cat-teaching',
  user_id: 'u1',
  name: 'Teaching',
  color: '#4f46e5',
  archived: false,
}
const STUDYING = {
  id: 'cat-studying',
  user_id: 'u1',
  name: 'Studying',
  color: '#0891b2',
  archived: false,
}

// Today, so the entries land inside every current period.
const today = new Date()
const todayKey = [
  today.getFullYear(),
  String(today.getMonth() + 1).padStart(2, '0'),
  String(today.getDate()).padStart(2, '0'),
].join('-')

function makeStore() {
  return createAppStore({
    auth: { session: { user: { id: 'u1' } }, user: { id: 'u1', email: 'me@example.com' }, status: 'ready', error: null },
    categories: { items: [TEACHING, STUDYING], status: 'succeeded', error: null },
    entries: {
      items: [
        {
          id: 'e1',
          user_id: 'u1',
          category_id: TEACHING.id,
          entry_date: todayKey,
          minutes: 80,
          note: 'Lecture prep',
          created_at: '2026-08-20T09:00:00Z',
        },
        {
          id: 'e2',
          user_id: 'u1',
          category_id: STUDYING.id,
          entry_date: todayKey,
          minutes: 45,
          note: null,
          created_at: '2026-08-20T10:00:00Z',
        },
      ],
      status: 'succeeded',
      error: null,
    },
    goals: {
      items: [
        {
          id: 'g1',
          user_id: 'u1',
          category_id: TEACHING.id,
          period: 'weekly',
          target_minutes: 600,
        },
      ],
      status: 'succeeded',
      error: null,
    },
  })
}

function renderPage(ui) {
  return render(
    <Provider store={makeStore()}>
      <MemoryRouter>{ui}</MemoryRouter>
    </Provider>,
  )
}

describe('pages render with real data', () => {
  it('dashboard shows the log form, totals and goal progress', () => {
    renderPage(<DashboardPage />)

    expect(screen.getByRole('button', { name: 'Add entry' })).toBeInTheDocument()
    expect(screen.getByLabelText('Duration')).toBeInTheDocument()

    // 80 + 45 logged today and this week.
    expect(screen.getAllByText('2h 5min').length).toBeGreaterThan(0)
    // The weekly teaching goal: 1h 20min of 10h.
    expect(screen.getByText('1h 20min / 10h')).toBeInTheDocument()
    expect(screen.getByText(/13%/)).toBeInTheDocument()
  })

  it('entries page lists the entries and their total', () => {
    renderPage(<EntriesPage />)

    expect(screen.getByText('Lecture prep')).toBeInTheDocument()
    const table = screen.getByRole('table')
    expect(within(table).getByText('1h 20min')).toBeInTheDocument()
    expect(within(table).getByText('45min')).toBeInTheDocument()
    expect(screen.getByText('2 entries')).toBeInTheDocument()
  })

  it('goals page shows the existing goal', () => {
    renderPage(<GoalsPage />)

    expect(screen.getByText('Weekly goals')).toBeInTheDocument()
    expect(screen.getByText('1h 20min / 10h')).toBeInTheDocument()
  })

  it('reports page totals the range and lists each category', () => {
    renderPage(<ReportsPage />)

    expect(screen.getByText('Time per category')).toBeInTheDocument()
    expect(screen.getByText('Day by day')).toBeInTheDocument()
    // 1h 20min teaching (64%) + 45min studying (36%) this month.
    expect(screen.getByText('64%')).toBeInTheDocument()
    expect(screen.getByText('36%')).toBeInTheDocument()
  })

  it('categories page lists categories with their logged totals', () => {
    renderPage(<CategoriesPage />)

    expect(screen.getByText('Teaching')).toBeInTheDocument()
    expect(screen.getByText('1h 20min logged')).toBeInTheDocument()
    expect(screen.getByText('45min logged')).toBeInTheDocument()
  })
})
