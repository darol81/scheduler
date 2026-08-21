import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import { supabase, requireUserId } from '../lib/supabaseClient'
import { friendlyError } from '../lib/errors'

const initialState = {
  items: [],
  status: 'idle',
  error: null,
}

export const fetchGoals = createAsyncThunk('goals/fetch', async (_, { rejectWithValue }) => {
  const { data, error } = await supabase.from('goals').select('*')
  if (error) return rejectWithValue(friendlyError(error, 'Could not load goals.'))
  return data
})

/**
 * One goal per (category, period): re-saving the same pair updates the target
 * instead of creating a duplicate, which the unique index also enforces.
 */
export const upsertGoal = createAsyncThunk(
  'goals/upsert',
  async ({ categoryId, period, targetMinutes }, { rejectWithValue }) => {
    try {
      const userId = await requireUserId()
      const { data, error } = await supabase
        .from('goals')
        .upsert(
          {
            user_id: userId,
            category_id: categoryId,
            period,
            target_minutes: targetMinutes,
          },
          { onConflict: 'user_id,category_id,period' },
        )
        .select()
        .single()
      if (error) return rejectWithValue(friendlyError(error, 'Could not save the goal.'))
      return data
    } catch (err) {
      return rejectWithValue(friendlyError(err, 'Could not save the goal.'))
    }
  },
)

export const deleteGoal = createAsyncThunk('goals/delete', async (id, { rejectWithValue }) => {
  const { error } = await supabase.from('goals').delete().eq('id', id)
  if (error) return rejectWithValue(friendlyError(error, 'Could not delete the goal.'))
  return id
})

const goalsSlice = createSlice({
  name: 'goals',
  initialState,
  reducers: {
    clearGoalsError(state) {
      state.error = null
    },
    goalsReset() {
      return initialState
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchGoals.pending, (state) => {
        state.status = 'loading'
        state.error = null
      })
      .addCase(fetchGoals.fulfilled, (state, action) => {
        state.status = 'succeeded'
        state.items = action.payload
      })
      .addCase(upsertGoal.fulfilled, (state, action) => {
        const index = state.items.findIndex((g) => g.id === action.payload.id)
        if (index === -1) state.items.push(action.payload)
        else state.items[index] = action.payload
        state.error = null
      })
      .addCase(deleteGoal.fulfilled, (state, action) => {
        state.items = state.items.filter((g) => g.id !== action.payload)
        state.error = null
      })
      .addMatcher(
        (action) => action.type.startsWith('goals/') && action.type.endsWith('/rejected'),
        (state, action) => {
          if (state.status === 'loading') state.status = 'failed'
          state.error = action.payload || (action.error && action.error.message) || 'Something went wrong.'
        },
      )
  },
})

export const { clearGoalsError, goalsReset } = goalsSlice.actions

export const selectAllGoals = (state) => state.goals.items
export const selectGoalsStatus = (state) => state.goals.status
export const selectGoalsError = (state) => state.goals.error

export default goalsSlice.reducer
