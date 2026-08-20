import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { supabase } from '../lib/supabaseClient';

const initialState = {
  session: null,
  user: null,
  // 'loading' until the initial getSession() resolves, so ProtectedRoute does
  // not bounce a signed-in user to /login on a hard refresh.
  status: 'loading',
  error: null,
};

export const loadSession = createAsyncThunk('auth/loadSession', async (_, { rejectWithValue }) => {
  const { data, error } = await supabase.auth.getSession();
  if (error) return rejectWithValue(error.message);
  return data.session ?? null;
});

export const signInWithGoogle = createAsyncThunk(
  'auth/signInWithGoogle',
  async (_, { rejectWithValue }) => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    });
    if (error) return rejectWithValue(error.message);
    // The browser navigates away to Google; nothing else to return.
    return null;
  },
);

export const signOut = createAsyncThunk('auth/signOut', async (_, { rejectWithValue }) => {
  const { error } = await supabase.auth.signOut();
  if (error) return rejectWithValue(error.message);
  return null;
});

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    // Driven by supabase.auth.onAuthStateChange in App.jsx.
    sessionChanged(state, action) {
      state.session = action.payload ?? null;
      state.user = action.payload?.user ?? null;
      state.status = 'ready';
      state.error = null;
    },
    clearAuthError(state) {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadSession.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(loadSession.fulfilled, (state, action) => {
        state.session = action.payload;
        state.user = action.payload?.user ?? null;
        state.status = 'ready';
      })
      .addCase(loadSession.rejected, (state, action) => {
        state.status = 'ready';
        state.error = action.payload ?? action.error.message;
      })
      .addCase(signInWithGoogle.rejected, (state, action) => {
        state.error = action.payload ?? action.error.message;
      })
      .addCase(signOut.fulfilled, (state) => {
        state.session = null;
        state.user = null;
      })
      .addCase(signOut.rejected, (state, action) => {
        state.error = action.payload ?? action.error.message;
      });
  },
});

export const { sessionChanged, clearAuthError } = authSlice.actions;

export const selectSession = (state) => state.auth.session;
export const selectUser = (state) => state.auth.user;
export const selectAuthStatus = (state) => state.auth.status;
export const selectIsSignedIn = (state) => Boolean(state.auth.session);

export default authSlice.reducer;
