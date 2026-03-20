'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { useRouter } from 'next/navigation'

interface AuthCtx {
  email: string | null
  signOut: () => void
  isLoaded: boolean
}

const AUTH_EMAIL_KEY = 'wsai_email'
const AUTH_EXPIRY_KEY = 'wsai_email_expiry'
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000 // 7 days

/** Write session to localStorage with a 7-day expiry timestamp */
export function persistSession(email: string) {
  localStorage.setItem(AUTH_EMAIL_KEY, email)
  localStorage.setItem(AUTH_EXPIRY_KEY, String(Date.now() + SESSION_TTL_MS))
}

/** Read session — returns null and clears storage if expired */
function readSession(): string | null {
  const email = localStorage.getItem(AUTH_EMAIL_KEY)
  if (!email) return null
  const expiry = Number(localStorage.getItem(AUTH_EXPIRY_KEY) || '0')
  if (expiry && Date.now() > expiry) {
    localStorage.removeItem(AUTH_EMAIL_KEY)
    localStorage.removeItem(AUTH_EXPIRY_KEY)
    return null
  }
  return email
}

const AuthContext = createContext<AuthCtx>({ email: null, signOut: () => {}, isLoaded: false })

export function AuthProvider({ children }: { children: ReactNode }) {
  const [email, setEmail] = useState<string | null>(null)
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    setEmail(readSession())
    setIsLoaded(true)

    // Listen for same-tab storage updates (e.g. after inline auth modal sign-in)
    const handleStorage = (e: StorageEvent) => {
      if (e.key === AUTH_EMAIL_KEY) {
        setEmail(e.newValue ? readSession() : null)
      }
    }
    window.addEventListener('storage', handleStorage)
    return () => window.removeEventListener('storage', handleStorage)
  }, [])

  function signOut() {
    localStorage.removeItem(AUTH_EMAIL_KEY)
    localStorage.removeItem(AUTH_EXPIRY_KEY)
    setEmail(null)
  }

  return <AuthContext.Provider value={{ email, signOut, isLoaded }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  return useContext(AuthContext)
}

/** Hook: redirect to /auth if not signed in, returns email once loaded */
export function useRequireAuth() {
  const { email, isLoaded } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (isLoaded && !email) router.push('/auth')
  }, [isLoaded, email, router])

  return { email, isLoaded }
}
