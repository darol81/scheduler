import { describe, expect, it } from 'vitest';
import { friendlyAuthError } from './errors';

describe('friendlyAuthError', () => {
  it.each([
    ['user_already_exists', 'That email is already registered. Sign in instead.'],
    ['email_exists', 'That email is already registered. Sign in instead.'],
    ['validation_failed', 'Enter a valid email address.'],
    ['email_address_invalid', 'Enter a valid email address.'],
    ['over_request_rate_limit', 'Too many attempts. Wait a minute and try again.'],
    ['signup_disabled', 'New registrations are closed.'],
    ['user_banned', 'That account is locked.'],
  ])('maps %s', (code, expected) => {
    expect(friendlyAuthError({ code, message: 'raw server text' })).toBe(expected);
  });

  // The no-enumeration guarantee. GoTrue returns one undifferentiated error for
  // "no such email" and "wrong password"; if this message ever grows more
  // helpful, the sign-in form becomes an account-existence oracle.
  it('never reveals whether the account exists', () => {
    const message = friendlyAuthError({
      code: 'invalid_credentials',
      message: 'Invalid login credentials',
    });
    expect(message).toBe('Wrong email or password.');
    expect(message).not.toMatch(/account|email address|registered|exists|user/i);
  });

  it('passes the server reason through for a weak password', () => {
    expect(
      friendlyAuthError({
        code: 'weak_password',
        message: 'Password is known to be weak and easy to guess, please choose a different one.',
      }),
    ).toMatch(/easy to guess/);
  });

  it('explains a failed request rather than showing a fetch error', () => {
    expect(friendlyAuthError({ name: 'AuthRetryableFetchError', message: 'Failed to fetch' })).toBe(
      'Could not reach the server. Check your connection.',
    );
  });

  it('falls back to the server message for an unknown code', () => {
    expect(friendlyAuthError({ code: 'some_new_code', message: 'Something specific' })).toBe(
      'Something specific',
    );
  });

  it('falls back to the default when there is no error at all', () => {
    expect(friendlyAuthError(null)).toBe('Something went wrong. Please try again.');
    expect(friendlyAuthError(undefined, 'Could not sign in.')).toBe('Could not sign in.');
  });
});
