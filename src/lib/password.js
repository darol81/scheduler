/**
 * Password limits, shared by the sign-up form and the change-password form so
 * the two cannot drift apart.
 *
 * Keep MIN at or above the "Minimum password length" set in the Supabase
 * dashboard (Authentication -> Sign In / Providers -> Email). If it drops
 * below, the forms wave through passwords the server then rejects.
 *
 * This check is ergonomics, not security: the anon key is in the page source,
 * so anyone can call the auth endpoint directly. The dashboard setting is the
 * only floor that is actually enforced.
 */
export const MIN_PASSWORD_LENGTH = 10

// bcrypt truncates past 72 bytes and GoTrue rejects longer input outright, so
// stopping the field there is kinder than a server round-trip.
export const MAX_PASSWORD_LENGTH = 72
