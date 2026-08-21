/**
 * Turn a PostgREST/Postgres error into something worth showing a human.
 * Codes: https://www.postgresql.org/docs/current/errcodes-appendix.html
 */
export function friendlyError(error, fallback = 'Something went wrong.') {
  if (!error) return fallback

  switch (error.code) {
  case '23505': // unique_violation
    return 'That already exists.'
  case '23503': // foreign_key_violation
    return 'This is still in use and cannot be removed.'
  case '23514': // check_violation
    return 'That value is not allowed.'
  case '42501': // insufficient_privilege -- almost always a missing RLS policy
    return 'Not allowed. Check that the row level security policies were applied.'
  case 'PGRST301':
    return 'Your session expired. Please sign in again.'
  default:
    return error.message || fallback
  }
}

/**
 * Turn a Supabase Auth (GoTrue) error into something worth showing a human.
 * A different error family from friendlyError above: these carry a string
 * `code` and a numeric `status`, not a Postgres SQLSTATE.
 * Codes: @supabase/auth-js/dist/main/lib/error-codes.d.ts
 */
export function friendlyAuthError(error, fallback = 'Something went wrong. Please try again.') {
  if (!error) return fallback

  // Network/CORS failures never reach the server, so they have no code.
  if (error.name === 'AuthRetryableFetchError') {
    return 'Could not reach the server. Check your connection.'
  }

  // Also code-less: thrown client-side when the call needed a session and there
  // was none. Without this the switch below falls through to error.message and
  // shows "Auth session missing!" verbatim.
  if (error.name === 'AuthSessionMissingError') {
    return 'Your session expired. Please sign in again.'
  }

  switch (error.code) {
  case 'invalid_credentials':
    // Deliberately vague. GoTrue returns one undifferentiated error for both
    // "no such email" and "wrong password"; saying which would turn the sign
    // in form into an account-existence oracle. Do not make this friendlier.
    return 'Wrong email or password.'
  case 'user_already_exists':
  case 'email_exists':
    return 'That email is already registered. Sign in instead.'
  case 'same_password':
    return 'That is already your password. Choose a different one.'
  case 'reauthentication_needed':
  case 'reauthentication_not_valid':
    // "Secure password change" is on in the Supabase dashboard, which wants a
    // code mailed to the address. This app verifies the current password
    // instead and never configures SMTP, so the two cannot both be on.
    return 'This project requires an emailed code to change a password. '
      + 'Turn off "Secure password change" in the Supabase dashboard.'
  case 'session_expired':
  case 'session_not_found':
    return 'Your session expired. Please sign in again.'
  case 'weak_password':
    // GoTrue says exactly why -- too short, missing a character class, or
    // found in a breach -- and its wording is better than anything here.
    return error.message || 'Choose a stronger password.'
  case 'validation_failed':
  case 'email_address_invalid':
    return 'Enter a valid email address.'
  case 'over_request_rate_limit':
  case 'over_email_send_rate_limit':
    return 'Too many attempts. Wait a minute and try again.'
  case 'signup_disabled':
  case 'email_provider_disabled':
    return 'New registrations are closed.'
  case 'email_not_confirmed':
    // Should not fire -- email confirmation is off -- but keeps the failure
    // legible if someone flips that toggle in the Supabase dashboard.
    return 'Confirm your email address before signing in.'
  case 'user_banned':
    return 'That account is locked.'
  default:
    return error.message || fallback
  }
}
