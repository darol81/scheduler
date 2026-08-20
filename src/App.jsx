import { Suspense, lazy, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Navigate, Route, Routes } from 'react-router-dom';

import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import Spinner from './components/Spinner';
import SetupNotice from './components/SetupNotice';

import CategoriesPage from './pages/CategoriesPage';
import DashboardPage from './pages/DashboardPage';
import EntriesPage from './pages/EntriesPage';
import GoalsPage from './pages/GoalsPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';

import { isSupabaseConfigured, supabase } from './lib/supabaseClient';
import { loadSession, sessionChanged } from './store/authSlice';
import { categoriesReset, fetchCategories } from './store/categoriesSlice';
import { entriesReset, fetchEntries } from './store/entriesSlice';
import { fetchGoals, goalsReset } from './store/goalsSlice';

// Recharts is the heaviest dependency and only the reports page needs it.
const ReportsPage = lazy(() => import('./pages/ReportsPage'));

export default function App() {
  const dispatch = useDispatch();
  const userId = useSelector((state) => (state.auth.user ? state.auth.user.id : null));

  // Read any persisted session, then keep the store in step with Supabase.
  useEffect(() => {
    if (!isSupabaseConfigured) return undefined;

    dispatch(loadSession());
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      dispatch(sessionChanged(session));
    });

    return () => subscription.unsubscribe();
  }, [dispatch]);

  // Load everything once per signed-in user. Keying on the user id means
  // switching accounts clears the previous account's data instead of merging it.
  useEffect(() => {
    if (!userId) {
      dispatch(categoriesReset());
      dispatch(entriesReset());
      dispatch(goalsReset());
      return;
    }
    dispatch(fetchCategories());
    dispatch(fetchEntries());
    dispatch(fetchGoals());
  }, [dispatch, userId]);

  if (!isSupabaseConfigured) {
    return <SetupNotice />;
  }

  return (
    <Suspense fallback={<Spinner />}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route element={<ProtectedRoute />}>
          <Route element={<Layout />}>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/entries" element={<EntriesPage />} />
            <Route path="/categories" element={<CategoriesPage />} />
            <Route path="/goals" element={<GoalsPage />} />
            <Route path="/reports" element={<ReportsPage />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}
