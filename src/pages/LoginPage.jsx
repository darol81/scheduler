import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Navigate } from 'react-router-dom';
import ErrorBanner from '../components/ErrorBanner';
import Spinner from '../components/Spinner';
import { clearAuthError, selectAuthStatus, selectIsSignedIn, signInWithGoogle } from '../store/authSlice';

function GoogleMark() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 48 48" aria-hidden="true">
      <path
        fill="#EA4335"
        d="M24 9.5c3.5 0 6.6 1.2 9 3.6l6.7-6.7C35.6 2.6 30.2 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.8 6.1C12.3 13.2 17.7 9.5 24 9.5z"
      />
      <path
        fill="#4285F4"
        d="M46.5 24.5c0-1.6-.1-2.8-.4-4.1H24v7.5h12.9c-.3 2.1-1.7 5.3-4.9 7.4l7.6 5.9c4.5-4.2 6.9-10.3 6.9-16.7z"
      />
      <path
        fill="#FBBC05"
        d="M10.4 28.7c-.5-1.5-.8-3-.8-4.7s.3-3.2.8-4.7l-7.8-6.1C1 16.3 0 20 0 24s1 7.7 2.6 10.8l7.8-6.1z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.6-5.9c-2 1.4-4.8 2.4-8.3 2.4-6.3 0-11.7-3.7-13.6-9.9l-7.8 6.1C6.5 42.6 14.6 48 24 48z"
      />
    </svg>
  );
}

export default function LoginPage() {
  const dispatch = useDispatch();
  const isSignedIn = useSelector(selectIsSignedIn);
  const status = useSelector(selectAuthStatus);
  const error = useSelector((state) => state.auth.error);
  const [redirecting, setRedirecting] = useState(false);

  if (status === 'loading') {
    return <Spinner label="Checking your session" />;
  }

  if (isSignedIn) {
    return <Navigate to="/" replace />;
  }

  async function handleSignIn() {
    setRedirecting(true);
    // On success the browser navigates to Google, so this promise resolving
    // without an error simply means the redirect is on its way.
    const action = await dispatch(signInWithGoogle());
    if (action.type.endsWith('/rejected')) setRedirecting(false);
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="card text-center">
          <h1 className="text-2xl font-semibold text-slate-900">Worktime</h1>
          <p className="mt-2 text-sm text-slate-600">
            Track where your hours go, and how they measure up against your goals.
          </p>

          <div className="mt-6">
            <ErrorBanner message={error} onDismiss={() => dispatch(clearAuthError())} />
            <button
              type="button"
              className="btn-secondary w-full"
              onClick={handleSignIn}
              disabled={redirecting}
            >
              <GoogleMark />
              {redirecting ? 'Redirecting...' : 'Sign in with Google'}
            </button>
          </div>
        </div>

        <p className="mt-4 text-center text-xs text-slate-500">
          Your entries are private to your account.
        </p>
      </div>
    </div>
  );
}
