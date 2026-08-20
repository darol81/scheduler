import { configureStore } from '@reduxjs/toolkit';
import authReducer from './authSlice';
import categoriesReducer from './categoriesSlice';
import entriesReducer from './entriesSlice';
import goalsReducer from './goalsSlice';

const reducer = {
  auth: authReducer,
  categories: categoriesReducer,
  entries: entriesReducer,
  goals: goalsReducer,
};

/**
 * Factory so tests can build a store with preloaded state; the app itself uses
 * the single instance exported below.
 */
export function createAppStore(preloadedState) {
  return configureStore({
    reducer,
    preloadedState,
    // createAsyncThunk copies its argument onto every dispatched action as
    // meta.arg, which would put the plaintext password in the DevTools action
    // log -- and in any "here is my DevTools trace" bug report. Redact it.
    devTools: {
      actionSanitizer: (action) =>
        action.meta && action.meta.arg && action.meta.arg.password
          ? {
              ...action,
              meta: { ...action.meta, arg: { ...action.meta.arg, password: '***' } },
            }
          : action,
    },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({
        // Supabase session objects are plain JSON but large and deeply nested;
        // skipping the serialisability scan on them keeps dev dispatches quick.
        serializableCheck: {
          ignoredActions: ['auth/sessionChanged', 'auth/loadSession/fulfilled'],
          ignoredPaths: ['auth.session', 'auth.user'],
        },
      }),
  });
}

export const store = createAppStore();

export default store;
