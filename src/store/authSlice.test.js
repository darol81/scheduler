import { beforeEach, describe, expect, it, vi } from 'vitest'

// Mock every export: store/index.js pulls in the data slices, which import
// requireUserId, so a partial mock breaks the store factory.
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
const { createAppStore } = await import('./index')
const { signUp, signInWithPassword, changePassword, sessionChanged } = await import('./authSlice')

const SESSION = { access_token: 'jwt', user: { id: 'u1', email: 'me@example.com' } }

function readyStore(preloadedAuth) {
  return createAppStore({
    auth: { session: null, user: null, status: 'ready', error: null, ...preloadedAuth },
  })
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('signInWithPassword', () => {
  it('stores the session on success', async () => {
    supabase.auth.signInWithPassword.mockResolvedValue({ data: { session: SESSION }, error: null })
    const store = readyStore()

    await store.dispatch(signInWithPassword({ email: 'me@example.com', password: 'correct horse' }))

    const { auth } = store.getState()
    expect(auth.session).toEqual(SESSION)
    expect(auth.user).toEqual(SESSION.user)
    expect(auth.error).toBeNull()
  })

  it('reports bad credentials without saying which half was wrong', async () => {
    supabase.auth.signInWithPassword.mockResolvedValue({
      data: { session: null },
      error: { code: 'invalid_credentials', message: 'Invalid login credentials' },
    })
    const store = readyStore()

    await store.dispatch(signInWithPassword({ email: 'me@example.com', password: 'wrong' }))

    const { auth } = store.getState()
    expect(auth.error).toBe('Wrong email or password.')
    expect(auth.session).toBeNull()
    // status means "has the initial session read finished" -- a failed sign-in
    // must not flip it, or ProtectedRoute swaps the form for a full-page spinner.
    expect(auth.status).toBe('ready')
  })

  it('clears a previous error while the request is in flight', async () => {
    let resolveCall
    supabase.auth.signInWithPassword.mockReturnValue(
      new Promise((resolve) => {
        resolveCall = resolve
      }),
    )
    const store = readyStore({ error: 'Wrong email or password.' })

    const pending = store.dispatch(signInWithPassword({ email: 'me@example.com', password: 'x' }))
    expect(store.getState().auth.error).toBeNull()
    expect(store.getState().auth.status).toBe('ready')

    resolveCall({ data: { session: SESSION }, error: null })
    await pending
  })
})

describe('signUp', () => {
  it('stores the session when confirmations are off', async () => {
    supabase.auth.signUp.mockResolvedValue({
      data: { session: SESSION, user: SESSION.user },
      error: null,
    })
    const store = readyStore()

    await store.dispatch(signUp({ email: 'me@example.com', password: 'a long password' }))

    expect(store.getState().auth.session).toEqual(SESSION)
    expect(store.getState().auth.error).toBeNull()
  })

  it('explains itself if email confirmation was left switched on', async () => {
    supabase.auth.signUp.mockResolvedValue({
      data: { session: null, user: { id: 'u1', identities: [{ id: 'i1' }] } },
      error: null,
    })
    const store = readyStore()

    await store.dispatch(signUp({ email: 'me@example.com', password: 'a long password' }))

    expect(store.getState().auth.error).toMatch(/confirm your email/i)
    expect(store.getState().auth.session).toBeNull()
  })

  it('catches the obfuscated already-registered reply', async () => {
    // GoTrue answers a duplicate signup with a user carrying no identities
    // rather than an error, when confirmations are on.
    supabase.auth.signUp.mockResolvedValue({
      data: { session: null, user: { id: 'u1', identities: [] } },
      error: null,
    })
    const store = readyStore()

    await store.dispatch(signUp({ email: 'me@example.com', password: 'a long password' }))

    expect(store.getState().auth.error).toBe('That email is already registered. Sign in instead.')
  })

  it('surfaces a rejected weak password', async () => {
    supabase.auth.signUp.mockResolvedValue({
      data: { session: null, user: null },
      error: { code: 'weak_password', message: 'Password is too short.' },
    })
    const store = readyStore()

    await store.dispatch(signUp({ email: 'me@example.com', password: 'short' }))

    expect(store.getState().auth.error).toBe('Password is too short.')
  })
})

describe('sessionChanged', () => {
  it('marks the store ready and adopts the session', () => {
    const store = createAppStore()
    expect(store.getState().auth.status).toBe('loading')

    store.dispatch(sessionChanged(SESSION))

    const { auth } = store.getState()
    expect(auth.status).toBe('ready')
    expect(auth.user).toEqual(SESSION.user)
  })

  it('clears the session on sign out', () => {
    const store = readyStore({ session: SESSION, user: SESSION.user })
    store.dispatch(sessionChanged(null))
    expect(store.getState().auth.session).toBeNull()
    expect(store.getState().auth.user).toBeNull()
  })
})

describe('changePassword', () => {
  const SIGNED_IN = { session: SESSION, user: SESSION.user }

  function allCallsSucceed() {
    supabase.auth.signInWithPassword.mockResolvedValue({ data: { session: SESSION }, error: null })
    supabase.auth.updateUser.mockResolvedValue({ data: { user: SESSION.user }, error: null })
    supabase.auth.signOut.mockResolvedValue({ error: null })
  }

  it('re-authenticates with the email from the session, not from a form field', async () => {
    allCallsSucceed()
    const store = readyStore(SIGNED_IN)

    await store.dispatch(changePassword({ currentPassword: 'old one', password: 'a new long one' }))

    expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
      email: 'me@example.com',
      password: 'old one',
    })
  })

  it('never reaches updateUser when the current password is wrong', async () => {
    supabase.auth.signInWithPassword.mockResolvedValue({
      data: { session: null },
      error: { code: 'invalid_credentials', message: 'Invalid login credentials' },
    })
    const store = readyStore(SIGNED_IN)

    await store.dispatch(changePassword({ currentPassword: 'wrong', password: 'a new long one' }))

    // The whole point of the re-auth: a failed check must not change anything.
    expect(supabase.auth.updateUser).not.toHaveBeenCalled()
    expect(supabase.auth.signOut).not.toHaveBeenCalled()
  })

  it('names the password rather than reusing the vague sign-in wording', async () => {
    supabase.auth.signInWithPassword.mockResolvedValue({
      data: { session: null },
      error: { code: 'invalid_credentials', message: 'Invalid login credentials' },
    })
    const store = readyStore(SIGNED_IN)

    await store.dispatch(changePassword({ currentPassword: 'wrong', password: 'a new long one' }))

    const { auth } = store.getState()
    // On /login the vague version stops the form being an account-existence
    // oracle. Here we are already signed in as this account, so there is
    // nothing to protect and no email field to be wrong about.
    expect(auth.error).toBe('That is not your current password.')
    expect(auth.session).toEqual(SESSION)
    expect(auth.status).toBe('ready')
  })

  it('signs out the other devices but not this one', async () => {
    allCallsSucceed()
    const store = readyStore(SIGNED_IN)

    await store.dispatch(changePassword({ currentPassword: 'old one', password: 'a new long one' }))

    // 'global' would revoke this tab too and bounce the user to /login the
    // instant their password change succeeded.
    expect(supabase.auth.signOut).toHaveBeenCalledWith({ scope: 'others' })
    expect(store.getState().auth.session).toEqual(SESSION)
    expect(store.getState().auth.error).toBeNull()
  })

  it('revokes nothing when the password change itself fails', async () => {
    supabase.auth.signInWithPassword.mockResolvedValue({ data: { session: SESSION }, error: null })
    supabase.auth.updateUser.mockResolvedValue({
      data: { user: null },
      error: { code: 'weak_password', message: 'Password is too short.' },
    })
    const store = readyStore(SIGNED_IN)

    await store.dispatch(changePassword({ currentPassword: 'old one', password: 'short' }))

    expect(supabase.auth.signOut).not.toHaveBeenCalled()
    expect(store.getState().auth.error).toBe('Password is too short.')
  })

  it('passes a same_password rejection through as its own message', async () => {
    supabase.auth.signInWithPassword.mockResolvedValue({ data: { session: SESSION }, error: null })
    supabase.auth.updateUser.mockResolvedValue({
      data: { user: null },
      error: { code: 'same_password', message: 'New password should be different.' },
    })
    const store = readyStore(SIGNED_IN)

    await store.dispatch(changePassword({ currentPassword: 'old one', password: 'old one again' }))

    expect(store.getState().auth.error).toBe('That is already your password. Choose a different one.')
  })

  it('admits the password changed when revoking the other devices fails', async () => {
    supabase.auth.signInWithPassword.mockResolvedValue({ data: { session: SESSION }, error: null })
    supabase.auth.updateUser.mockResolvedValue({ data: { user: SESSION.user }, error: null })
    supabase.auth.signOut.mockResolvedValue({
      error: { name: 'AuthRetryableFetchError', message: 'Failed to fetch' },
    })
    const store = readyStore(SIGNED_IN)

    await store.dispatch(changePassword({ currentPassword: 'old one', password: 'a new long one' }))

    // Reporting a plain failure here would send the user back to retype a
    // password that no longer works.
    expect(store.getState().auth.error).toMatch(/password was changed/)
  })

  it('refuses when there is no signed-in user to re-authenticate', async () => {
    const store = readyStore()

    await store.dispatch(changePassword({ currentPassword: 'old one', password: 'a new long one' }))

    expect(supabase.auth.signInWithPassword).not.toHaveBeenCalled()
    expect(store.getState().auth.error).toBe('Your session expired. Please sign in again.')
  })

  it('clears the previous error without touching status while in flight', async () => {
    let resolveCall
    supabase.auth.signInWithPassword.mockReturnValue(new Promise((resolve) => {
      resolveCall = resolve
    }))
    const store = readyStore({ ...SIGNED_IN, error: 'That is not your current password.' })

    const pending = store.dispatch(changePassword({ currentPassword: 'old one', password: 'a new long one' }))

    expect(store.getState().auth.error).toBeNull()
    // status means "has the initial session read finished". Flipping it here
    // would swap the form for ProtectedRoute's full-page spinner mid-submit.
    expect(store.getState().auth.status).toBe('ready')

    resolveCall({ data: { session: SESSION }, error: null })
    supabase.auth.updateUser.mockResolvedValue({ data: { user: SESSION.user }, error: null })
    supabase.auth.signOut.mockResolvedValue({ error: null })
    await pending
  })
})
