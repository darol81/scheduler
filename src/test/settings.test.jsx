import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { Provider } from 'react-redux'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// Same wholesale mock as auth.test.jsx, and for the same reason: store/index.js
// pulls in the data slices, which import requireUserId, so a partial mock
// breaks the store factory. The two files duplicate it rather than share it.
vi.mock('../lib/supabaseClient', () => ({
  isSupabaseConfigured: true,
  requireUserId: vi.fn(),
  supabase: {
    auth: {
      getSession: vi.fn(),
      signUp: vi.fn(),
      signInWithPassword: vi.fn(),
      updateUser: vi.fn(),
      signOut: vi.fn(),
      onAuthStateChange: vi.fn(),
    },
  },
}))

const { supabase } = await import('../lib/supabaseClient')
const { createAppStore } = await import('../store')
const { default: SettingsPage } = await import('../pages/SettingsPage')
const { default: Layout } = await import('../components/Layout')

const SESSION = { access_token: 'jwt', user: { id: 'u1', email: 'me@example.com' } }
const SIGNED_IN = { session: SESSION, user: SESSION.user, status: 'ready', error: null }

function renderSettings(auth = SIGNED_IN) {
  return render(
    <Provider store={createAppStore({ auth })}>
      <MemoryRouter><SettingsPage /></MemoryRouter>
    </Provider>,
  )
}

function type(label, value) {
  const field = screen.getByLabelText(label)
  fireEvent.change(field, { target: { value } })
  fireEvent.blur(field)
  return field
}

function fillValidForm() {
  type('Current password', 'the old one')
  type('New password', 'a long enough new one')
  type('Confirm new password', 'a long enough new one')
}

function allCallsSucceed() {
  supabase.auth.signInWithPassword.mockResolvedValue({ data: { session: SESSION }, error: null })
  supabase.auth.updateUser.mockResolvedValue({ data: { user: SESSION.user }, error: null })
  supabase.auth.signOut.mockResolvedValue({ error: null })
}

const submit = () => screen.getByRole('button', { name: 'Change password' })

beforeEach(() => {
  vi.clearAllMocks()
})

describe('settings page', () => {
  it('shows which account you are signed in as', () => {
    renderSettings()
    expect(screen.getByText('me@example.com')).toBeInTheDocument()
  })

  it('keeps a marked-out spot for the preferences that do not exist yet', () => {
    renderSettings()
    expect(screen.getByText('Preferences')).toBeInTheDocument()
  })
})

describe('change password form', () => {
  it('tells a password manager which account and which fields are new', () => {
    renderSettings()

    expect(screen.getByLabelText('Current password')).toHaveAttribute('autocomplete', 'current-password')
    expect(screen.getByLabelText('New password')).toHaveAttribute('autocomplete', 'new-password')
    expect(screen.getByLabelText('Confirm new password')).toHaveAttribute('autocomplete', 'new-password')
  })

  it('stays disabled until all three fields are filled', () => {
    renderSettings()
    expect(submit()).toBeDisabled()

    type('Current password', 'the old one')
    type('New password', 'a long enough new one')
    expect(submit()).toBeDisabled()

    type('Confirm new password', 'a long enough new one')
    expect(submit()).toBeEnabled()
  })

  it('refuses a too-short new password without calling Supabase', () => {
    renderSettings()
    type('Current password', 'the old one')
    type('New password', 'short')
    type('Confirm new password', 'short')

    expect(screen.getByText('Use at least 10 characters.')).toBeInTheDocument()
    expect(submit()).toBeDisabled()
    expect(supabase.auth.signInWithPassword).not.toHaveBeenCalled()
  })

  it('refuses a mistyped confirmation without calling Supabase', () => {
    renderSettings()
    type('Current password', 'the old one')
    type('New password', 'a long enough new one')
    type('Confirm new password', 'a long enough new onf')

    expect(screen.getByText('Passwords do not match.')).toBeInTheDocument()
    expect(submit()).toBeDisabled()
    expect(supabase.auth.signInWithPassword).not.toHaveBeenCalled()
  })

  it('refuses to set the password you already have, without a round trip', () => {
    renderSettings()
    type('Current password', 'a long enough new one')
    type('New password', 'a long enough new one')
    type('Confirm new password', 'a long enough new one')

    expect(screen.getByText('Choose a password you have not used here before.')).toBeInTheDocument()
    expect(submit()).toBeDisabled()
    expect(supabase.auth.updateUser).not.toHaveBeenCalled()
  })

  it('never trims or case-folds either password', async () => {
    allCallsSucceed()
    renderSettings()
    type('Current password', '  Spaces Matter  ')
    type('New password', '  And Here Too  ')
    type('Confirm new password', '  And Here Too  ')
    fireEvent.click(submit())

    await waitFor(() => {
      expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
        email: 'me@example.com',
        password: '  Spaces Matter  ',
      })
    })
    expect(supabase.auth.updateUser).toHaveBeenCalledWith({ password: '  And Here Too  ' })
  })

  it('confirms success and empties every field', async () => {
    allCallsSucceed()
    renderSettings()
    fillValidForm()
    fireEvent.click(submit())

    await screen.findByText('Password changed. Your other devices were signed out.')
    expect(screen.getByLabelText('Current password')).toHaveValue('')
    expect(screen.getByLabelText('New password')).toHaveValue('')
    expect(screen.getByLabelText('Confirm new password')).toHaveValue('')
  })

  it('shows the reason and empties the fields when the current password is wrong', async () => {
    supabase.auth.signInWithPassword.mockResolvedValue({
      data: { session: null },
      error: { code: 'invalid_credentials', message: 'Invalid login credentials' },
    })
    renderSettings()
    fillValidForm()
    fireEvent.click(submit())

    const banner = await screen.findByRole('alert')
    expect(banner).toHaveTextContent('That is not your current password.')
    expect(screen.getByLabelText('Current password')).toHaveValue('')
  })

  it('claims no success when the other devices could not be signed out', async () => {
    supabase.auth.signInWithPassword.mockResolvedValue({ data: { session: SESSION }, error: null })
    supabase.auth.updateUser.mockResolvedValue({ data: { user: SESSION.user }, error: null })
    supabase.auth.signOut.mockResolvedValue({
      error: { name: 'AuthRetryableFetchError', message: 'Failed to fetch' },
    })
    renderSettings()
    fillValidForm()
    fireEvent.click(submit())

    const banner = await screen.findByRole('alert')
    expect(banner).toHaveTextContent(/password was changed/)
    // The password really did change, so a cheerful confirmation here would
    // send the user off to retype one that no longer works.
    expect(screen.queryByText(/other devices were signed out/)).not.toBeInTheDocument()
  })
})

describe('the way in to settings', () => {
  function renderShell() {
    return render(
      <Provider store={createAppStore({ auth: SIGNED_IN })}>
        <MemoryRouter><Layout /></MemoryRouter>
      </Provider>,
    )
  }

  it('turns the signed-in email into a link to the settings page', () => {
    renderShell()
    // Named by aria-label, not by visible text: the email span is hidden below
    // the sm: breakpoint, so on a phone there would be nothing to read.
    const link = screen.getByRole('link', { name: /signed in as me@example\.com/i })
    expect(link).toHaveAttribute('href', '/settings')
  })

  it('leaves sign out where it was, outside the link', () => {
    renderShell()
    const link = screen.getByRole('link', { name: /signed in as/i })
    const signOut = screen.getByRole('button', { name: 'Sign out' })
    expect(link).not.toContainElement(signOut)
  })
})
