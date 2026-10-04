import { useState } from 'react'
import { useAuth } from './auth.tsx'

export function LoginScreen() {
  const { login, register } = useAuth()
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setBusy(true)
    setError(null)
    setInfo(null)

    const message =
      mode === 'login'
        ? await login(email, password)
        : await register(email, password)

    if (message) {
      setError(message)
      setBusy(false)
      return
    }

    if (mode === 'register') {
      setInfo(
        'Account created. If email confirmation is enabled in Supabase, check your inbox before signing in.',
      )
      setMode('login')
    }

    setBusy(false)
  }

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <p className="eyebrow">Holmfred Gaming</p>
        <h1>{mode === 'login' ? 'Sign in' : 'Create account'}</h1>
        <p className="auth-copy">
          Your Have / Want list syncs across devices with this account.
        </p>

        <form className="auth-form" onSubmit={handleSubmit}>
          <label>
            Email
            <input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </label>

          <label>
            Password
            <span className="password-field">
              <input
                type={showPassword ? 'text' : 'password'}
                autoComplete={
                  mode === 'login' ? 'current-password' : 'new-password'
                }
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                minLength={6}
              />
              <button
                type="button"
                className="password-toggle"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                onClick={() => setShowPassword((value) => !value)}
              >
                {showPassword ? <EyeOffIcon /> : <EyeIcon />}
              </button>
            </span>
          </label>

          {error ? <p className="auth-error">{error}</p> : null}
          {info ? <p className="auth-info">{info}</p> : null}

          <button type="submit" className="auth-submit" disabled={busy}>
            {busy
              ? 'Please wait…'
              : mode === 'login'
                ? 'Sign in'
                : 'Create account'}
          </button>
        </form>

        <p className="auth-switch">
          {mode === 'login' ? (
            <>
              No account yet?{' '}
              <button type="button" onClick={() => setMode('register')}>
                Create one
              </button>
            </>
          ) : (
            <>
              Already have an account?{' '}
              <button type="button" onClick={() => setMode('login')}>
                Sign in
              </button>
            </>
          )}
        </p>
      </div>
    </div>
  )
}

function EyeIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M12 5c-5 0-9.27 3.11-11 7 1.73 3.89 6 7 11 7s9.27-3.11 11-7c-1.73-3.89-6-7-11-7zm0 12a5 5 0 1 1 0-10 5 5 0 0 1 0 10zm0-2a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"
      />
    </svg>
  )
}

function EyeOffIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M3.27 2 2 3.27l3.11 3.11A12.7 12.7 0 0 0 1 12c1.73 3.89 6 7 11 7 1.85 0 3.58-.43 5.14-1.17L20.73 22 22 20.73 3.27 2zM12 17c-2.76 0-5-2.24-5-5 0-.69.15-1.34.4-1.93l6.53 6.53c-.59.25-1.24.4-1.93.4zm7.94-2.53-2.2-2.2c.17-.4.26-.84.26-1.27a5 5 0 0 0-5-5c-.43 0-.87.09-1.27.26L9.94 4.47C10.6 4.17 11.29 4 12 4c5 0 9.27 3.11 11 7-.66 1.48-1.7 2.78-3.06 3.47z"
      />
    </svg>
  )
}
