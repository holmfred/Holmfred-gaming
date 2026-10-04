export function SupabaseSetup() {
  return (
    <div className="auth-screen">
      <div className="auth-card">
        <p className="eyebrow">Holmfred Gaming</p>
        <h1>Connect Supabase</h1>
        <p className="auth-copy">
          Add your project keys to <code>.env</code>, then restart the dev
          server.
        </p>
        <ol className="setup-steps">
          <li>Create a project at supabase.com</li>
          <li>
            Run <code>supabase/schema.sql</code> in the SQL Editor
          </li>
          <li>
            Copy Project URL and anon key into <code>.env</code> as{' '}
            <code>VITE_SUPABASE_URL</code> and{' '}
            <code>VITE_SUPABASE_ANON_KEY</code>
          </li>
          <li>Restart <code>npm run dev</code></li>
        </ol>
      </div>
    </div>
  )
}
