import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

/**
 * True once .env.local actually has credentials. The UI checks this so a fresh
 * clone shows setup instructions instead of an opaque network error.
 */
export const isSupabaseConfigured = Boolean(url && anonKey);

if (!isSupabaseConfigured) {
  // eslint-disable-next-line no-console
  console.warn(
    'Supabase is not configured. Copy .env.example to .env.local and fill in ' +
      'VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY, then restart the dev server.',
  );
}

// A dummy-but-valid URL keeps createClient from throwing before the user has
// configured anything; every call will fail, which is what the setup notice is for.
export const supabase = createClient(
  url || 'http://localhost:54321',
  anonKey || 'public-anon-key-placeholder',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  },
);

/** Current user id, or throws -- every write needs it for the RLS check. */
export async function requireUserId() {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  if (!data?.user) throw new Error('You are not signed in.');
  return data.user.id;
}
