import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import { supabase, requireUserId } from '../lib/supabaseClient'
import { friendlyError } from '../lib/errors'

const initialState = {
  items: [],
  status: 'idle', // idle | loading | succeeded | failed
  error: null,
}

export const fetchCategories = createAsyncThunk(
  'categories/fetch',
  async (_, { rejectWithValue }) => {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('archived', { ascending: true })
      .order('name', { ascending: true })
    if (error) return rejectWithValue(friendlyError(error, 'Could not load categories.'))
    return data
  },
)

export const addCategory = createAsyncThunk(
  'categories/add',
  async ({ name, color }, { rejectWithValue }) => {
    try {
      const userId = await requireUserId()
      const { data, error } = await supabase
        .from('categories')
        .insert({ user_id: userId, name: name.trim(), color })
        .select()
        .single()
      if (error) {
        if (error.code === '23505') {
          return rejectWithValue(`You already have a category called "${name.trim()}".`)
        }
        return rejectWithValue(friendlyError(error, 'Could not add the category.'))
      }
      return data
    } catch (err) {
      return rejectWithValue(friendlyError(err, 'Could not add the category.'))
    }
  },
)

export const updateCategory = createAsyncThunk(
  'categories/update',
  async ({ id, changes }, { rejectWithValue }) => {
    const payload = { ...changes }
    if (typeof payload.name === 'string') payload.name = payload.name.trim()

    const { data, error } = await supabase
      .from('categories')
      .update(payload)
      .eq('id', id)
      .select()
      .single()
    if (error) {
      if (error.code === '23505') return rejectWithValue('You already have a category with that name.')
      return rejectWithValue(friendlyError(error, 'Could not update the category.'))
    }
    return data
  },
)

/**
 * Archiving is the normal way to retire a category: entries keep pointing at it,
 * so history stays readable.
 */
export const setCategoryArchived = createAsyncThunk(
  'categories/setArchived',
  async ({ id, archived }, { dispatch }) => dispatch(updateCategory({ id, changes: { archived } })).unwrap(),
)

/** Hard delete. The database refuses if any time entry still references it. */
export const deleteCategory = createAsyncThunk(
  'categories/delete',
  async (id, { rejectWithValue }) => {
    const { error } = await supabase.from('categories').delete().eq('id', id)
    if (error) {
      if (error.code === '23503') {
        return rejectWithValue('This category has time entries. Archive it instead of deleting.')
      }
      return rejectWithValue(friendlyError(error, 'Could not delete the category.'))
    }
    return id
  },
)

const byName = (a, b) => {
  if (a.archived !== b.archived) return a.archived ? 1 : -1
  return a.name.localeCompare(b.name)
}

const categoriesSlice = createSlice({
  name: 'categories',
  initialState,
  reducers: {
    clearCategoriesError(state) {
      state.error = null
    },
    categoriesReset() {
      return initialState
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchCategories.pending, (state) => {
        state.status = 'loading'
        state.error = null
      })
      .addCase(fetchCategories.fulfilled, (state, action) => {
        state.status = 'succeeded'
        state.items = action.payload
      })
      .addCase(fetchCategories.rejected, (state, action) => {
        state.status = 'failed'
        state.error = action.payload ?? action.error.message
      })
      .addCase(addCategory.fulfilled, (state, action) => {
        state.items.push(action.payload)
        state.items.sort(byName)
        state.error = null
      })
      .addCase(updateCategory.fulfilled, (state, action) => {
        const index = state.items.findIndex((c) => c.id === action.payload.id)
        if (index !== -1) state.items[index] = action.payload
        state.items.sort(byName)
        state.error = null
      })
      .addCase(deleteCategory.fulfilled, (state, action) => {
        state.items = state.items.filter((c) => c.id !== action.payload)
        state.error = null
      })
      .addMatcher(
        (action) => action.type.startsWith('categories/') && action.type.endsWith('/rejected'),
        (state, action) => {
          state.error = action.payload ?? action.error?.message ?? 'Something went wrong.'
        },
      )
  },
})

export const { clearCategoriesError, categoriesReset } = categoriesSlice.actions

export const selectAllCategories = (state) => state.categories.items
export const selectCategoriesStatus = (state) => state.categories.status
export const selectCategoriesError = (state) => state.categories.error

export default categoriesSlice.reducer
