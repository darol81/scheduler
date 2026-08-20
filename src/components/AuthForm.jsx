import { useEffect, useId, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, Navigate, useLocation } from 'react-router-dom';
import ErrorBanner from './ErrorBanner';
import Spinner from './Spinner';
import {
  clearAuthError,
  selectAuthError,
  selectAuthStatus,
  selectIsSignedIn,
  signInWithPassword,
  signUp,
} from '../store/authSlice';

/**
 * Keep this at or above the "Minimum password length" set in the Supabase
 * dashboard (Authentication -> Sign In / Providers -> Email). If it drops
 * below, the form waves through passwords the server then rejects.
 *
 * This check is ergonomics, not security: anyone can call the auth endpoint
 * directly with the anon key from this page's source. The dashboard setting is
 * the only floor that is actually enforced.
 */
export const MIN_PASSWORD_LENGTH = 10;

// Deliberately loose -- GoTrue is the real validator, this only catches typos.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// bcrypt truncates past 72 bytes, and GoTrue rejects longer input outright.
const MAX_PASSWORD_LENGTH = 72;

/**
 * The sign-in and register cards. One component, two routes: password managers
 * decide "save a new password" vs "fill the saved one" partly from the URL, so
 * /login and /register stay distinct pages rather than a toggle.
 */
export default function AuthForm({ mode }) {
  const isSignUp = mode === 'signup';

  const dispatch = useDispatch();
  const location = useLocation();
  const status = useSelector(selectAuthStatus);
  const isSignedIn = useSelector(selectIsSignedIn);
  const authError = useSelector(selectAuthError);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [touched, setTouched] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const emailId = useId();
  const passwordId = useId();
  const confirmId = useId();

  // Leaving an error behind would greet you on the other page.
  useEffect(() => () => { dispatch(clearAuthError()); }, [dispatch]);

  const trimmedEmail = email.trim();
  const emailError = !trimmedEmail || EMAIL_PATTERN.test(trimmedEmail)
    ? null
    : 'Enter a valid email address.';
  // Only the register form states the policy -- telling someone signing in that
  // their password is "too short" would leak the rule to whoever is guessing.
  const passwordError = isSignUp && password && password.length < MIN_PASSWORD_LENGTH
    ? `Use at least ${MIN_PASSWORD_LENGTH} characters.`
    : null;
  const confirmError = isSignUp && confirm && confirm !== password
    ? 'Passwords do not match.'
    : null;

  const canSubmit =
    Boolean(trimmedEmail) &&
    Boolean(password) &&
    (!isSignUp || Boolean(confirm)) &&
    !emailError &&
    !passwordError &&
    !confirmError &&
    !submitting;

  // Hooks are all above this line -- the early returns below must stay last.
  if (status === 'loading') {
    return <Spinner label="Checking your session" />;
  }

  if (isSignedIn) {
    // Where ProtectedRoute bounced us from, if anywhere. Only same-origin
    // paths: "//evil.com" is a protocol-relative URL, not a route.
    const raw = location.state && location.state.from;
    const from =
      typeof raw === 'string' && raw.startsWith('/') && !raw.startsWith('//') ? raw : '/';
    return <Navigate to={from} replace />;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!canSubmit) return;

    setSubmitting(true);
    try {
      await dispatch(
        (isSignUp ? signUp : signInWithPassword)({
          // Emails are case-insensitive; passwords are not, and a leading or
          // trailing space is a legitimate character. Never touch the password.
          email: trimmedEmail.toLowerCase(),
          password,
        }),
      ).unwrap();
      // Nothing to do on success: onAuthStateChange updates the store, this
      // re-renders, and the isSignedIn branch above navigates. Doing it
      // declaratively avoids racing useNavigate against the store update.
    } catch {
      // The slice already holds the friendly message; ErrorBanner shows it.
      setPassword('');
      setConfirm('');
    } finally {
      setSubmitting(false);
    }
  }

  function markTouched(field) {
    setTouched((previous) => ({ ...previous, [field]: true }));
  }

  // Hold back the red until the field has been left, so the rules do not shout
  // at someone halfway through typing.
  const visibleEmailError = touched.email ? emailError : null;
  const visiblePasswordError = touched.password ? passwordError : null;
  const visibleConfirmError = touched.confirm ? confirmError : null;

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <form onSubmit={handleSubmit} className="card" noValidate>
          <h1 className="text-2xl font-semibold text-slate-900">Worktime</h1>
          <p className="mt-2 text-sm text-slate-600">
            {isSignUp
              ? 'Create an account to start tracking your hours.'
              : 'Track where your hours go, and how they measure up against your goals.'}
          </p>

          <div className="mt-6">
            <ErrorBanner message={authError} onDismiss={() => dispatch(clearAuthError())} />
          </div>

          <div className="grid gap-4 text-left">
            <div>
              <label className="label" htmlFor={emailId}>
                Email
              </label>
              <input
                id={emailId}
                type="email"
                className={visibleEmailError ? 'input input-error' : 'input'}
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                onBlur={() => markTouched('email')}
                // "username" is the spec-correct partner for current-password,
                // and is what makes managers offer the stored credential.
                autoComplete={isSignUp ? 'email' : 'username'}
                inputMode="email"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                autoFocus
                required
                aria-invalid={Boolean(visibleEmailError)}
                aria-describedby={visibleEmailError ? `${emailId}-hint` : undefined}
              />
              {visibleEmailError ? (
                <p id={`${emailId}-hint`} className="hint-error">
                  {visibleEmailError}
                </p>
              ) : null}
            </div>

            <div>
              <label className="label" htmlFor={passwordId}>
                Password
              </label>
              <input
                id={passwordId}
                type="password"
                className={visiblePasswordError ? 'input input-error' : 'input'}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                onBlur={() => markTouched('password')}
                autoComplete={isSignUp ? 'new-password' : 'current-password'}
                maxLength={MAX_PASSWORD_LENGTH}
                required
                aria-invalid={Boolean(visiblePasswordError)}
                aria-describedby={isSignUp ? `${passwordId}-hint` : undefined}
              />
              {isSignUp ? (
                <p
                  id={`${passwordId}-hint`}
                  className={visiblePasswordError ? 'hint-error' : 'hint'}
                >
                  {visiblePasswordError || `At least ${MIN_PASSWORD_LENGTH} characters.`}
                </p>
              ) : null}
            </div>

            {isSignUp ? (
              <div>
                <label className="label" htmlFor={confirmId}>
                  Confirm password
                </label>
                <input
                  id={confirmId}
                  type="password"
                  className={visibleConfirmError ? 'input input-error' : 'input'}
                  value={confirm}
                  onChange={(event) => setConfirm(event.target.value)}
                  onBlur={() => markTouched('confirm')}
                  autoComplete="new-password"
                  maxLength={MAX_PASSWORD_LENGTH}
                  required
                  aria-invalid={Boolean(visibleConfirmError)}
                  aria-describedby={visibleConfirmError ? `${confirmId}-hint` : undefined}
                />
                {visibleConfirmError ? (
                  <p id={`${confirmId}-hint`} className="hint-error">
                    {visibleConfirmError}
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>

          <button type="submit" className="btn-primary mt-5 w-full" disabled={!canSubmit}>
            {submitting
              ? (isSignUp ? 'Creating account...' : 'Signing in...')
              : (isSignUp ? 'Create account' : 'Sign in')}
          </button>

          <p className="mt-4 text-sm text-slate-600">
            {isSignUp ? 'Already have an account? ' : 'No account yet? '}
            <Link
              to={isSignUp ? '/login' : '/register'}
              // Carry the redirect target across, so bouncing off a protected
              // page and then switching to register still lands you back there.
              state={location.state}
              onClick={() => dispatch(clearAuthError())}
              className="font-medium text-indigo-600 hover:text-indigo-700 hover:underline"
            >
              {isSignUp ? 'Sign in' : 'Create an account'}
            </Link>
          </p>
        </form>

        <p className="mt-4 text-center text-xs text-slate-500">
          Your entries are private to your account.
        </p>
      </div>
    </div>
  );
}
