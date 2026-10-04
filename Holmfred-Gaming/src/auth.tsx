import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase, supabaseConfigured } from './supabase.ts'

type AuthContextValue = {
  user: User | null
  session: Session | null
  ready: boolean
  login: (email: string, password: string) => Promise<string | null>
  register: (email: string, password: string) => Promise<string | null>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (!supabaseConfigured) {
      setReady(true)
      return
    }

    let mounted = true

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return
      setSession(data.session)
      setReady(true)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next)
      setReady(true)
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  async function register(email: string, password: string) {
    const normalized = email.trim()
    if (!normalized || !password) return 'Email and password are required.'
    if (password.length < 6) return 'Password must be at least 6 characters.'

    const { error } = await supabase.auth.signUp({
      email: normalized,
      password,
    })
    return error?.message ?? null
  }

  async function login(email: string, password: string) {
    const normalized = email.trim()
    if (!normalized || !password) return 'Email and password are required.'

    const { error } = await supabase.auth.signInWithPassword({
      email: normalized,
      password,
    })
    return error?.message ?? null
  }

  async function logout() {
    await supabase.auth.signOut()
  }

  const value = useMemo(
    () => ({
      user: session?.user ?? null,
      session,
      ready,
      login,
      register,
      logout,
    }),
    [session, ready],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const value = useContext(AuthContext)
  if (!value) throw new Error('useAuth must be used within AuthProvider')
  return value
}
