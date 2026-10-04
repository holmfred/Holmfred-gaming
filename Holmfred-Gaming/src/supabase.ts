import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL?.trim()
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim()

function isBrowserSafeKey(key: string) {
  if (key.startsWith('sb_secret_')) return false
  if (key.includes('service_role')) return false
  try {
    const parts = key.split('.')
    if (parts.length >= 2) {
      const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')))
      if (payload?.role === 'service_role') return false
    }
  } catch {
    // non-JWT publishable keys are fine
  }
  return true
}

export const supabaseKeyError =
  anonKey && !isBrowserSafeKey(anonKey)
    ? 'VITE_SUPABASE_ANON_KEY is a secret key. Use the anon / publishable key instead (Project Settings → API).'
    : null

export const supabaseConfigured = Boolean(
  url && anonKey && isBrowserSafeKey(anonKey),
)

export const supabase: SupabaseClient = supabaseConfigured
  ? createClient(url!, anonKey!)
  : (null as unknown as SupabaseClient)
