import { useEffect, useId, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import ErrorBanner from './ErrorBanner'
import { MAX_PASSWORD_LENGTH, MIN_PASSWORD_LENGTH } from '../lib/password'
import {
  changePassword,
  clearAuthError,
  selectAuthError,
  selectUser,
} from '../store/authSlice'

/**
 * The change-password card on /settings.
 *
 * A card embedded in a page, like LogTimeForm -- not a whole-page component
 * like AuthForm. The current-password field is not decoration: the thunk
 * behind it spends that password on a real sign-in before touching anything,
 * because GoTrue's own update endpoint never asks for it.
 */
export default function ChangePasswordForm() {
  const dispatch = useDispatch()
  const user = useSelector(selectUser)
  const authError = useSelector(selectAuthError)
  const email = (user && user.email) || ''

  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [touched, setTouched] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [changed, setChanged] = useState(false)

  const currentId = useId()
  const nextId = useId()
  const confirmId = useId()

  // Leaving an error behind would greet you on whatever page comes next.
  useEffect(() => () => { dispatch(clearAuthError()) }, [dispatch])

  // Derived at render, each guarded on the field being non-empty so the rules
  // do not shout at someone halfway through typing.
  let nextError = null
  if (next && next.length < MIN_PASSWORD_LENGTH) {
    nextError = `Use at least ${MIN_PASSWORD_LENGTH} characters.`
  } else if (next && current && next === current) {
    // Caught here rather than at the server's same_password, which would cost a
    // round trip and a slice of the token endpoint's rate limit.
    nextError = 'Choose a password you have not used here before.'
  }
  const confirmError = confirm && confirm !== next ? 'Passwords do not match.' : null

  const canSubmit = Boolean(current) && Boolean(next) && Boolean(confirm)
    && !nextError && !confirmError && !submitting

  async function handleSubmit(event) {
    event.preventDefault()
    if (!canSubmit) return

    setSubmitting(true)
    setChanged(false)
    try {
      // Passwords are never trimmed or case-folded -- a leading space is a
      // legitimate character and the byte string has to survive intact.
      await dispatch(changePassword({ currentPassword: current, password: next })).unwrap()
      setChanged(true)
      setCurrent('')
      setNext('')
      setConfirm('')
      setTouched({})
    } catch {
      // The slice holds the friendly message and ErrorBanner shows it. Clear
      // all three: on the "changed, but revoking the other devices failed"
      // path the current password still in the box is already stale.
      setCurrent('')
      setNext('')
      setConfirm('')
    } finally {
      setSubmitting(false)
    }
  }

  function markTouched(field) {
    setTouched((previous) => ({ ...previous, [field]: true }))
  }

  // Hold back the red until the field has been left.
  const visibleNextError = touched.next ? nextError : null
  const visibleConfirmError = touched.confirm ? confirmError : null

  return (
    <form onSubmit={handleSubmit} className="card" noValidate>
      <h2 className="card-title">Password</h2>

      <div className="mt-4">
        <ErrorBanner message={authError} onDismiss={() => dispatch(clearAuthError())} />
      </div>

      <div className="grid max-w-sm gap-4 text-left">
        {/*
          No visible email field, but a password manager needs one to know which
          saved credential this form updates. Read-only, out of the tab order
          and out of the accessibility tree.
        */}
        <input
          type="text"
          name="username"
          autoComplete="username"
          value={email}
          readOnly
          tabIndex={-1}
          aria-hidden="true"
          className="hidden"
        />

        <div>
          <label className="label" htmlFor={currentId}>
            Current password
          </label>
          <input
            id={currentId}
            type="password"
            // No input-error here: this field's only failure is server-side,
            // and reddening it after a rejection points at a box we just
            // cleared.
            className="input"
            value={current}
            onChange={(event) => setCurrent(event.target.value)}
            autoComplete="current-password"
            maxLength={MAX_PASSWORD_LENGTH}
            required
          />
        </div>

        <div>
          <label className="label" htmlFor={nextId}>
            New password
          </label>
          <input
            id={nextId}
            type="password"
            className={visibleNextError ? 'input input-error' : 'input'}
            value={next}
            onChange={(event) => setNext(event.target.value)}
            onBlur={() => markTouched('next')}
            autoComplete="new-password"
            maxLength={MAX_PASSWORD_LENGTH}
            required
            aria-invalid={Boolean(visibleNextError)}
            aria-describedby={`${nextId}-hint`}
          />
          <p id={`${nextId}-hint`} className={visibleNextError ? 'hint-error' : 'hint'}>
            {visibleNextError || `At least ${MIN_PASSWORD_LENGTH} characters.`}
          </p>
        </div>

        <div>
          <label className="label" htmlFor={confirmId}>
            Confirm new password
          </label>
          <input
            id={confirmId}
            type="password"
            className={visibleConfirmError ? 'input input-error' : 'input'}
            value={confirm}
            onChange={(event) => setConfirm(event.target.value)}
            onBlur={() => markTouched('confirm')}
            autoComplete="new-password"
            maxLength={MAX_PASSWORD_LENGTH}
            required
            aria-invalid={Boolean(visibleConfirmError)}
            aria-describedby={visibleConfirmError ? `${confirmId}-hint` : undefined}
          />
          {visibleConfirmError ? (
            <p id={`${confirmId}-hint`} className="hint-error">
              {visibleConfirmError}
            </p>
          ) : null}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button type="submit" className="btn-primary" disabled={!canSubmit}>
          {submitting ? 'Changing...' : 'Change password'}
        </button>
        {changed ? (
          // "were signed out" rather than "are locked out": revoking refresh
          // tokens does not expire the access tokens other devices already
          // hold, so they have up to an hour left.
          <span className="text-sm text-emerald-600">
            Password changed. Your other devices were signed out.
          </span>
        ) : null}
      </div>
    </form>
  )
}
