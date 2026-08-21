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

/**
 * scope: 'local' is deliberate. supabase-js defaults signOut to scope 'global',
 * which revokes every refresh token the user holds -- signing out in one tab
 * would kill the session on their phone too, which is not what a button
 * labelled just 'Sign out' promises. Local scope still clears the persisted
 * session from localStorage, which is the part that matters here.
 */
export const signOut = createAsyncThunk('auth/signOut', async (_, { rejectWithValue }) => {
  const { error } = await supabase.auth.signOut({ scope: 'local' })
  if (error) return rejectWithValue(friendlyAuthError(error, 'Could not sign out.'))
  return null
})

/**
 * Change the account password.
 *
 * GoTrue's PUT /user does not ask for the old password, so without a check of
 * our own an unlocked, signed-in browser is a two-click account takeover. We
 * re-authenticate by spending the current password on the token endpoint. That
 * is a real sign-in: supabase-js saves the returned session over the current
 * one and fires SIGNED_IN, which App.jsx maps to sessionChanged. Same user id,
 * so the per-userId fetch effect there does not refire.
 *
 * The order is load-bearing.
 *   - updateUser goes second, so a rejected new password leaves nothing revoked.
 *   - signOut goes last, so it also takes out the refresh token that the
 *     re-auth above orphaned.
 *   - scope: 'others' revokes every other device but keeps this tab and fires
 *     no SIGNED_OUT, unlike the 'local' scope the signOut thunk uses. 'global'
 *     would sign this tab out and bounce the user to /login mid-success.
 */
export const changePassword = createAsyncThunk(
  'auth/changePassword',
  async ({ currentPassword, password }, { getState, rejectWithValue }) => {
    const user = getState().auth.user
    const email = user && user.email
    if (!email) return rejectWithValue('Your session expired. Please sign in again.')

    const { error: reauthError } = await supabase.auth.signInWithPassword({
      email,
      password: currentPassword,
    })
    if (reauthError) {
      // Not friendlyAuthError's invalid_credentials wording. That one is vague
      // on purpose so /login cannot be used as an account-existence oracle;
      // here we are already signed in as the account in question, so there is
      // nothing to leak, and "Wrong email or password." would name a field
      // this form does not even have.
      if (reauthError.code === 'invalid_credentials') {
        return rejectWithValue('That is not your current password.')
      }
      return rejectWithValue(friendlyAuthError(reauthError, 'Could not verify your password.'))
    }

    const { error: updateError } = await supabase.auth.updateUser({ password })
    if (updateError) {
      return rejectWithValue(friendlyAuthError(updateError, 'Could not change the password.'))
    }

    // Past this line the password IS changed. Nothing below may report a plain
    // failure, or the user retypes an old password that no longer works.
    const { error: revokeError } = await supabase.auth.signOut({ scope: 'others' })
    if (revokeError) {
      return rejectWithValue(
        'Your password was changed, but signing out your other devices failed. '
        + 'Sign out on them yourself if that matters.',
      )
    }

    // Nothing to hand the store: supabase-js saved the session itself and
    // App.jsx's listener already dispatched sessionChanged for both SIGNED_IN
    // and USER_UPDATED. Returning null also keeps this action off the
    // serializableCheck allowlist in store/index.js.
    return null
  },
)

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
      .addCase(changePassword.pending, (state) => {
        state.error = null
      })
      // Not sessionFulfilled: its first line is `state.session = payload ?? null`
      // and this thunk resolves with null, so reusing it would sign the user out
      // of the store while supabase-js still holds a perfectly good session.
      .addCase(changePassword.fulfilled, (state) => {
        state.error = null
      })
      .addCase(changePassword.rejected, credentialsRejected)
  },
})

export const { sessionChanged, clearAuthError } = authSlice.actions

export const selectSession = (state) => state.auth.session
export const selectUser = (state) => state.auth.user
export const selectAuthStatus = (state) => state.auth.status
export const selectAuthError = (state) => state.auth.error
export const selectIsSignedIn = (state) => Boolean(state.auth.session)

export default authSlice.reducer
