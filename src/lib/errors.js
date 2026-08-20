/**
 * Turn a PostgREST/Postgres error into something worth showing a human.
 * Codes: https://www.postgresql.org/docs/current/errcodes-appendix.html
 */
export function friendlyError(error, fallback = 'Something went wrong.') {
  if (!error) return fallback;

  switch (error.code) {
    case '23505': // unique_violation
      return 'That already exists.';
    case '23503': // foreign_key_violation
      return 'This is still in use and cannot be removed.';
    case '23514': // check_violation
      return 'That value is not allowed.';
    case '42501': // insufficient_privilege -- almost always a missing RLS policy
      return 'Not allowed. Check that the row level security policies were applied.';
    case 'PGRST301':
      return 'Your session expired. Please sign in again.';
    default:
      return error.message || fallback;
  }
}
