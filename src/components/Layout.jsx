import { useDispatch, useSelector } from 'react-redux'
import { Link, NavLink, Outlet } from 'react-router-dom'
import { selectUser, signOut } from '../store/authSlice'

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', end: true },
  { to: '/entries', label: 'Entries' },
  { to: '/goals', label: 'Goals' },
  { to: '/categories', label: 'Categories' },
  { to: '/reports', label: 'Reports' },
]

function navClass({ isActive }) {
  return [
    'rounded-lg px-3 py-2 text-sm font-medium transition',
    isActive ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
  ].join(' ')
}

export default function Layout() {
  const dispatch = useDispatch()
  const user = useSelector(selectUser)
  const email = user && user.email
  // Accounts are email + password, so there is no provider avatar to fetch.
  const initial = email ? email.trim().charAt(0).toUpperCase() : '?'

  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-4 px-4 py-3">
          <span className="text-base font-semibold text-slate-900">Worktime</span>

          <nav className="flex flex-1 flex-wrap items-center gap-1">
            {NAV_ITEMS.map((item) => (
              <NavLink key={item.to} to={item.to} end={item.end} className={navClass}>
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            {/*
              The email is hidden below sm: and the avatar is decorative, so the
              link carries its own name rather than relying on visible text --
              otherwise it would be an unnamed link on a phone. Both spans stay
              aria-hidden so the address is not announced twice.
            */}
            <Link
              to="/settings"
              aria-label={`Settings, signed in as ${email}`}
              className="flex items-center gap-3 rounded-lg px-2 py-1 transition hover:bg-slate-100"
            >
              <span
                aria-hidden="true"
                className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-sm font-semibold text-indigo-700"
              >
                {initial}
              </span>
              <span aria-hidden="true" className="hidden text-sm text-slate-500 sm:inline">
                {email}
              </span>
            </Link>
            <button type="button" className="btn-secondary" onClick={() => dispatch(signOut())}>
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  )
}
