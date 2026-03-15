'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { useRouter } from 'next/navigation'

interface AuthCtx {
  email: string | null
  signOut: () => void
  isLoaded: boolean
}

const AuthContext = createContext<AuthCtx>({ email: null, signOut: () => {}, isLoaded: false })

export function AuthProvider({ children }: { children: ReactNode }) {
  const [email, setEmail] = useState<string | null>(null)
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    setEmail(localStorage.getItem('wsai_email'))
    setIsLoaded(true)

    // Listen for same-tab storage updates (e.g. after inline auth modal sign-in)
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'wsai_email') {
        setEmail(e.newValue)
      }
    }
    window.addEventListener('storage', handleStorage)
    return () => window.removeEventListener('storage', handleStorage)
  }, [])

  function signOut() {
    localStorage.removeItem('wsai_email')
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
