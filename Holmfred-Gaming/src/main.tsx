import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { AuthProvider } from './auth.tsx'
import { LibraryProvider } from './library.tsx'
import { supabaseConfigured } from './supabase.ts'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {supabaseConfigured ? (
      <AuthProvider>
        <LibraryProvider>
          <App />
        </LibraryProvider>
      </AuthProvider>
    ) : (
      <App />
    )}
  </StrictMode>,
)
