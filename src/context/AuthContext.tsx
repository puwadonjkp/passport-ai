import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

interface AuthState {
  session: Session | null
  loading: boolean
  displayName: string
}

const AuthContext = createContext<AuthState>({ session: null, loading: true, displayName: '' })

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => data.subscription.unsubscribe()
  }, [])

  const meta = session?.user.user_metadata as { display_name?: string } | undefined
  const displayName = meta?.display_name || session?.user.email?.split('@')[0] || 'นักเดินทาง'
  return <AuthContext.Provider value={{ session, loading, displayName }}>{children}</AuthContext.Provider>
}

export const useAuth = () => useContext(AuthContext)
