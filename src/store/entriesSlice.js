import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { supabase, requireUserId } from '../lib/supabaseClient';
import { friendlyError } from '../lib/errors';

const initialState = {
  items: [],
  status: 'idle',
  error: null,
};

// A personal tracker generates a handful of rows a day, so the whole history is
// loaded once and every view filters it client-side with memoised selectors.
// That keeps the dashboard, the entries list and the reports perfectly in sync
// without any refetch choreography.
const MAX_ROWS = 5000;

export const fetchEntries = createAsyncThunk('entries/fetch', async (_, { rejectWithValue }) => {
  const { data, error } = await supabase
    .from('time_entries')
    .select('*')
    .order('entry_date', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(MAX_ROWS);
  if (error) return rejectWithValue(friendlyError(error, 'Could not load time entries.'));
  return data;
});

export const addEntry = createAsyncThunk(
  'entries/add',
  async ({ categoryId, entryDate, minutes, note }, { rejectWithValue }) => {
    try {
      const userId = await requireUserId();
      const { data, error } = await supabase
        .from('time_entries')
        .insert({
          user_id: userId,
          category_id: categoryId,
          entry_date: entryDate,
          minutes,
          note: note && note.trim() ? note.trim() : null,
        })
        .select()
        .single();
      if (error) return rejectWithValue(friendlyError(error, 'Could not save the entry.'));
      return data;
    } catch (err) {
      return rejectWithValue(friendlyError(err, 'Could not save the entry.'));
    }
  },
);

export const updateEntry = createAsyncThunk(
  'entries/update',
  async ({ id, changes }, { rejectWithValue }) => {
    const payload = { ...changes };
    if ('note' in payload) {
      payload.note = payload.note && payload.note.trim() ? payload.note.trim() : null;
    }

    const { data, error } = await supabase
      .from('time_entries')
      .update(payload)
      .eq('id', id)
      .select()
      .single();
    if (error) return rejectWithValue(friendlyError(error, 'Could not update the entry.'));
    return data;
  },
);

export const deleteEntry = createAsyncThunk('entries/delete', async (id, { rejectWithValue }) => {
  const { error } = await supabase.from('time_entries').delete().eq('id', id);
  if (error) return rejectWithValue(friendlyError(error, 'Could not delete the entry.'));
  return id;
});

// Newest first; ties broken by insertion order so an edit does not reshuffle rows.
const byDateDesc = (a, b) => {
  if (a.entry_date !== b.entry_date) return a.entry_date < b.entry_date ? 1 : -1;
  return (b.created_at || '').localeCompare(a.created_at || '');
};

const entriesSlice = createSlice({
  name: 'entries',
  initialState,
  reducers: {
    clearEntriesError(state) {
      state.error = null;
    },
    entriesReset() {
      return initialState;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchEntries.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchEntries.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.items = action.payload;
      })
      .addCase(addEntry.fulfilled, (state, action) => {
        state.items.push(action.payload);
        state.items.sort(byDateDesc);
        state.error = null;
      })
      .addCase(updateEntry.fulfilled, (state, action) => {
        const index = state.items.findIndex((e) => e.id === action.payload.id);
        if (index !== -1) state.items[index] = action.payload;
        state.items.sort(byDateDesc);
        state.error = null;
      })
      .addCase(deleteEntry.fulfilled, (state, action) => {
        state.items = state.items.filter((e) => e.id !== action.payload);
        state.error = null;
      })
      .addMatcher(
        (action) => action.type.startsWith('entries/') && action.type.endsWith('/rejected'),
        (state, action) => {
          if (state.status === 'loading') state.status = 'failed';
          state.error = action.payload || (action.error && action.error.message) || 'Something went wrong.';
        },
      );
  },
});

export const { clearEntriesError, entriesReset } = entriesSlice.actions;

export const selectAllEntries = (state) => state.entries.items;
export const selectEntriesStatus = (state) => state.entries.status;
export const selectEntriesError = (state) => state.entries.error;

export default entriesSlice.reducer;
