import { useSelector } from 'react-redux';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import Spinner from './Spinner';
import { selectAuthStatus, selectIsSignedIn } from '../store/authSlice';

export default function ProtectedRoute() {
  const status = useSelector(selectAuthStatus);
  const isSignedIn = useSelector(selectIsSignedIn);
  const location = useLocation();

  // Wait for the persisted session to be read, otherwise a hard refresh would
  // bounce a signed-in user straight to the login page.
  if (status === 'loading') {
    return <Spinner label="Checking your session" />;
  }

  if (!isSignedIn) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return <Outlet />;
}
