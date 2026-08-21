import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import { supabase } from '../lib/supabaseClient'
import { friendlyAuthError } from '../lib/errors'

const initialState = {
  session: null,
  user: null,
  // 'loading' until the initial getSession() resolves, so ProtectedRoute does
  // not bounce a signed-in user to /login on a hard refresh.
  status: 'loading',
  error: null,
}

export const loadSession = createAsyncThunk('auth/loadSession', async (_, { rejectWithValue }) => {
  const { data, error } = await supabase.auth.getSession()
  if (error) return rejectWithValue(error.message)
  return data.session ?? null
})

/**
 * Register with an email and a password.
 *
 * Supabase hashes the password (bcrypt) into auth.users and hands back a
 * session; nothing here ever sees, stores or forwards the plaintext. The
 * caller passes it in and it goes straight out over TLS.
 */
export const signUp = createAsyncThunk(
  'auth/signUp',
  async ({ email, password }, { rejectWithValue }) => {
    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error) return rejectWithValue(friendlyAuthError(error, 'Could not create the account.'))

    // GoTrue's obfuscated "already registered" reply: a user with no identities
    // rather than an error. Only sent when email confirmation is switched on.
    if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
      return rejectWithValue('That email is already registered. Sign in instead.')
    }

    // With confirmations off this is a live session. Say something useful
    // rather than nothing if someone turns that dashboard toggle back on.
    if (!data.session) {
      return rejectWithValue('Check your inbox to confirm your email, then sign in.')
    }

    return data.session
  },
)

export const signInWithPassword = createAsyncThunk(
  'auth/signInWithPassword',
  async ({ email, password }, { rejectWithValue }) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) return rejectWithValue(friendlyAuthError(error, 'Could not sign in.'))
    return data.session
  },
)

export const signOut = createAsyncThunk('auth/signOut', async (_, { rejectWithValue }) => {
  const { error } = await supabase.auth.signOut()
  if (error) return rejectWithValue(friendlyAuthError(error, 'Could not sign out.'))
  return null
})

/**
 * Both credential thunks land here on success. supabase-js has already saved
 * the session and notified onAuthStateChange by this point, so this is really
 * just closing the one-tick window before that listener fires.
 */
function sessionFulfilled(state, action) {
  state.session = action.payload ?? null
  state.user = action.payload?.user ?? null
  state.status = 'ready'
  state.error = null
}

function credentialsRejected(state, action) {
  state.error = action.payload ?? action.error.message
}

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    // Driven by supabase.auth.onAuthStateChange in App.jsx.
    sessionChanged(state, action) {
      state.session = action.payload ?? null
      state.user = action.payload?.user ?? null
      state.status = 'ready'
      state.error = null
    },
    clearAuthError(state) {
      state.error = null
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadSession.pending, (state) => {
        state.status = 'loading'
      })
      .addCase(loadSession.fulfilled, (state, action) => {
        state.session = action.payload
        state.user = action.payload?.user ?? null
        state.status = 'ready'
      })
      .addCase(loadSession.rejected, (state, action) => {
        state.status = 'ready'
        state.error = action.payload ?? action.error.message
      })
      // Note what these pending cases do NOT do: touch `status`. That flag means
      // "has the initial session read finished", and flipping it mid-submit
      // would swap the form for ProtectedRoute's full-page spinner. In-flight
      // state lives in the form's own `submitting`, like LogTimeForm's `saving`.
      .addCase(signUp.pending, (state) => {
        state.error = null
      })
      .addCase(signUp.fulfilled, sessionFulfilled)
      .addCase(signUp.rejected, credentialsRejected)
      .addCase(signInWithPassword.pending, (state) => {
        state.error = null
      })
      .addCase(signInWithPassword.fulfilled, sessionFulfilled)
      .addCase(signInWithPassword.rejected, credentialsRejected)
      .addCase(signOut.fulfilled, (state) => {
        state.session = null
        state.user = null
      })
      .addCase(signOut.rejected, credentialsRejected)
  },
})

export const { sessionChanged, clearAuthError } = authSlice.actions

export const selectSession = (state) => state.auth.session
export const selectUser = (state) => state.auth.user
export const selectAuthStatus = (state) => state.auth.status
export const selectAuthError = (state) => state.auth.error
export const selectIsSignedIn = (state) => Boolean(state.auth.session)

export default authSlice.reducer
