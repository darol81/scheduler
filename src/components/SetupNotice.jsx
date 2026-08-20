/**
 * Shown instead of the app when .env.local has no Supabase credentials, so the
 * first run explains itself rather than failing with a network error.
 */
export default function SetupNotice() {
  return (
    <div className="mx-auto max-w-2xl p-8">
      <div className="card">
        <h1 className="text-xl font-semibold text-slate-900">Finish the Supabase setup</h1>
        <p className="mt-2 text-sm text-slate-600">
          The app needs your Supabase project URL and anon key before it can sign anyone in.
        </p>
        <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm text-slate-700">
          <li>
            Create a project at <span className="font-medium">supabase.com</span> and open{' '}
            <span className="font-medium">Project Settings &rarr; API</span>.
          </li>
          <li>
            Copy <code className="rounded bg-slate-100 px-1">.env.example</code> to{' '}
            <code className="rounded bg-slate-100 px-1">.env.local</code> and fill in{' '}
            <code className="rounded bg-slate-100 px-1">VITE_SUPABASE_URL</code> and{' '}
            <code className="rounded bg-slate-100 px-1">VITE_SUPABASE_ANON_KEY</code>.
          </li>
          <li>
            Run <code className="rounded bg-slate-100 px-1">supabase/schema.sql</code> in the
            Supabase SQL editor.
          </li>
          <li>
            Under{' '}
            <span className="font-medium">
              Authentication &rarr; Sign In / Providers &rarr; Email
            </span>
            , turn <span className="font-medium">Confirm email</span> off.
          </li>
          <li>Restart the dev server so Vite picks up the new environment variables.</li>
        </ol>
        <p className="mt-4 text-sm text-slate-600">
          The full walkthrough is in <code className="rounded bg-slate-100 px-1">README.md</code>.
        </p>
      </div>
    </div>
  );
}
