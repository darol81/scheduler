import { fireEvent, render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../lib/supabaseClient', () => ({
  isSupabaseConfigured: true,
  requireUserId: vi.fn(),
  supabase: {
    auth: {
      getSession: vi.fn(),
      signUp: vi.fn(),
      signInWithPassword: vi.fn(),
      signOut: vi.fn(),
      onAuthStateChange: vi.fn(),
    },
  },
}));

const { supabase } = await import('../lib/supabaseClient');
const { createAppStore } = await import('../store');
const { default: LoginPage } = await import('../pages/LoginPage');
const { default: RegisterPage } = await import('../pages/RegisterPage');

const SIGNED_OUT = { session: null, user: null, status: 'ready', error: null };

function renderAuth(ui, { auth = SIGNED_OUT, initialEntries = ['/login'] } = {}) {
  return render(
    <Provider store={createAppStore({ auth })}>
      <MemoryRouter initialEntries={initialEntries}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/" element={<div>Dashboard</div>} />
          <Route path="/reports" element={<div>Reports</div>} />
          {ui}
        </Routes>
      </MemoryRouter>
    </Provider>,
  );
}

function type(label, value) {
  const field = screen.getByLabelText(label);
  fireEvent.change(field, { target: { value } });
  fireEvent.blur(field);
  return field;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('sign in', () => {
  it('offers the saved credential to a password manager', () => {
    renderAuth();

    expect(screen.getByLabelText('Email')).toHaveAttribute('autocomplete', 'username');
    const password = screen.getByLabelText('Password');
    expect(password).toHaveAttribute('type', 'password');
    expect(password).toHaveAttribute('autocomplete', 'current-password');
    expect(screen.queryByLabelText('Confirm password')).not.toBeInTheDocument();
  });

  it('keeps submit disabled until both fields are filled', () => {
    renderAuth();
    const submit = screen.getByRole('button', { name: 'Sign in' });
    expect(submit).toBeDisabled();

    type('Email', 'me@example.com');
    expect(submit).toBeDisabled();

    type('Password', 'correct horse');
    expect(submit).toBeEnabled();
  });

  it('rejects a malformed email without calling Supabase', () => {
    renderAuth();
    type('Email', 'not-an-email');
    type('Password', 'correct horse');

    expect(screen.getByText('Enter a valid email address.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeDisabled();
    expect(supabase.auth.signInWithPassword).not.toHaveBeenCalled();
  });

  it('normalises the email but never the password', () => {
    supabase.auth.signInWithPassword.mockResolvedValue({ data: { session: null }, error: null });
    renderAuth();

    type('Email', '  Me@Example.COM  ');
    type('Password', ' spaces matter ');
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(supabase.auth.signInWithPassword).toHaveBeenCalledTimes(1);
    expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
      email: 'me@example.com',
      password: ' spaces matter ',
    });
  });

  it('never mentions Google', () => {
    renderAuth();
    expect(screen.queryByText(/google/i)).not.toBeInTheDocument();
  });

  it('sends an already signed-in visitor to the page they were bounced from', () => {
    render(
      <Provider store={createAppStore({ auth: { ...SIGNED_OUT, session: { user: { id: 'u1' } } } })}>
        <MemoryRouter initialEntries={[{ pathname: '/login', state: { from: '/reports' } }]}>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/reports" element={<div>Reports</div>} />
          </Routes>
        </MemoryRouter>
      </Provider>,
    );

    expect(screen.getByText('Reports')).toBeInTheDocument();
  });

  it('ignores an off-site redirect target', () => {
    render(
      <Provider store={createAppStore({ auth: { ...SIGNED_OUT, session: { user: { id: 'u1' } } } })}>
        <MemoryRouter initialEntries={[{ pathname: '/login', state: { from: '//evil.example' } }]}>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/" element={<div>Dashboard</div>} />
          </Routes>
        </MemoryRouter>
      </Provider>,
    );

    expect(screen.getByText('Dashboard')).toBeInTheDocument();
  });
});

describe('register', () => {
  it('tells the password manager this is a new password', () => {
    renderAuth(null, { initialEntries: ['/register'] });

    expect(screen.getByLabelText('Password')).toHaveAttribute('autocomplete', 'new-password');
    expect(screen.getByLabelText('Confirm password')).toHaveAttribute(
      'autocomplete',
      'new-password',
    );
  });

  it('blocks a too-short password before it reaches the server', () => {
    renderAuth(null, { initialEntries: ['/register'] });

    type('Email', 'me@example.com');
    type('Password', 'short');
    type('Confirm password', 'short');

    expect(screen.getByText('Use at least 10 characters.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create account' })).toBeDisabled();
    expect(supabase.auth.signUp).not.toHaveBeenCalled();
  });

  it('blocks a mistyped confirmation', () => {
    renderAuth(null, { initialEntries: ['/register'] });

    type('Email', 'me@example.com');
    type('Password', 'a long enough password');
    type('Confirm password', 'a long enough passwrod');

    expect(screen.getByText('Passwords do not match.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create account' })).toBeDisabled();
    expect(supabase.auth.signUp).not.toHaveBeenCalled();
  });

  it('registers when everything lines up', () => {
    supabase.auth.signUp.mockResolvedValue({ data: { session: null, user: null }, error: null });
    renderAuth(null, { initialEntries: ['/register'] });

    type('Email', 'me@example.com');
    type('Password', 'a long enough password');
    type('Confirm password', 'a long enough password');
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }));

    expect(supabase.auth.signUp).toHaveBeenCalledWith({
      email: 'me@example.com',
      password: 'a long enough password',
    });
  });

  it('links back to sign in', () => {
    renderAuth(null, { initialEntries: ['/register'] });
    expect(screen.getByRole('link', { name: 'Sign in' })).toHaveAttribute('href', '/login');
  });
});
