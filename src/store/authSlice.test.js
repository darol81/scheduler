import { beforeEach, describe, expect, it, vi } from 'vitest';

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
      signOut: vi.fn(),
      onAuthStateChange: vi.fn(),
    },
  },
}));

const { supabase } = await import('../lib/supabaseClient');
const { createAppStore } = await import('./index');
const { signUp, signInWithPassword, sessionChanged } = await import('./authSlice');

const SESSION = { access_token: 'jwt', user: { id: 'u1', email: 'me@example.com' } };

function readyStore(preloadedAuth) {
  return createAppStore({
    auth: { session: null, user: null, status: 'ready', error: null, ...preloadedAuth },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('signInWithPassword', () => {
  it('stores the session on success', async () => {
    supabase.auth.signInWithPassword.mockResolvedValue({ data: { session: SESSION }, error: null });
    const store = readyStore();

    await store.dispatch(signInWithPassword({ email: 'me@example.com', password: 'correct horse' }));

    const { auth } = store.getState();
    expect(auth.session).toEqual(SESSION);
    expect(auth.user).toEqual(SESSION.user);
    expect(auth.error).toBeNull();
  });

  it('reports bad credentials without saying which half was wrong', async () => {
    supabase.auth.signInWithPassword.mockResolvedValue({
      data: { session: null },
      error: { code: 'invalid_credentials', message: 'Invalid login credentials' },
    });
    const store = readyStore();

    await store.dispatch(signInWithPassword({ email: 'me@example.com', password: 'wrong' }));

    const { auth } = store.getState();
    expect(auth.error).toBe('Wrong email or password.');
    expect(auth.session).toBeNull();
    // status means "has the initial session read finished" -- a failed sign-in
    // must not flip it, or ProtectedRoute swaps the form for a full-page spinner.
    expect(auth.status).toBe('ready');
  });

  it('clears a previous error while the request is in flight', async () => {
    let resolveCall;
    supabase.auth.signInWithPassword.mockReturnValue(
      new Promise((resolve) => {
        resolveCall = resolve;
      }),
    );
    const store = readyStore({ error: 'Wrong email or password.' });

    const pending = store.dispatch(signInWithPassword({ email: 'me@example.com', password: 'x' }));
    expect(store.getState().auth.error).toBeNull();
    expect(store.getState().auth.status).toBe('ready');

    resolveCall({ data: { session: SESSION }, error: null });
    await pending;
  });
});

describe('signUp', () => {
  it('stores the session when confirmations are off', async () => {
    supabase.auth.signUp.mockResolvedValue({
      data: { session: SESSION, user: SESSION.user },
      error: null,
    });
    const store = readyStore();

    await store.dispatch(signUp({ email: 'me@example.com', password: 'a long password' }));

    expect(store.getState().auth.session).toEqual(SESSION);
    expect(store.getState().auth.error).toBeNull();
  });

  it('explains itself if email confirmation was left switched on', async () => {
    supabase.auth.signUp.mockResolvedValue({
      data: { session: null, user: { id: 'u1', identities: [{ id: 'i1' }] } },
      error: null,
    });
    const store = readyStore();

    await store.dispatch(signUp({ email: 'me@example.com', password: 'a long password' }));

    expect(store.getState().auth.error).toMatch(/confirm your email/i);
    expect(store.getState().auth.session).toBeNull();
  });

  it('catches the obfuscated already-registered reply', async () => {
    // GoTrue answers a duplicate signup with a user carrying no identities
    // rather than an error, when confirmations are on.
    supabase.auth.signUp.mockResolvedValue({
      data: { session: null, user: { id: 'u1', identities: [] } },
      error: null,
    });
    const store = readyStore();

    await store.dispatch(signUp({ email: 'me@example.com', password: 'a long password' }));

    expect(store.getState().auth.error).toBe('That email is already registered. Sign in instead.');
  });

  it('surfaces a rejected weak password', async () => {
    supabase.auth.signUp.mockResolvedValue({
      data: { session: null, user: null },
      error: { code: 'weak_password', message: 'Password is too short.' },
    });
    const store = readyStore();

    await store.dispatch(signUp({ email: 'me@example.com', password: 'short' }));

    expect(store.getState().auth.error).toBe('Password is too short.');
  });
});

describe('sessionChanged', () => {
  it('marks the store ready and adopts the session', () => {
    const store = createAppStore();
    expect(store.getState().auth.status).toBe('loading');

    store.dispatch(sessionChanged(SESSION));

    const { auth } = store.getState();
    expect(auth.status).toBe('ready');
    expect(auth.user).toEqual(SESSION.user);
  });

  it('clears the session on sign out', () => {
    const store = readyStore({ session: SESSION, user: SESSION.user });
    store.dispatch(sessionChanged(null));
    expect(store.getState().auth.session).toBeNull();
    expect(store.getState().auth.user).toBeNull();
  });
});
