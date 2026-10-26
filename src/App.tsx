import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import type { ReactNode } from 'react'
import { AuthProvider, useAuth } from './context/AuthContext'
import { isConfigured } from './lib/supabase'
import { FullScreenLoader, SetupNotice } from './components/ui'
import Landing from './pages/Landing'
import AuthPage from './pages/AuthPage'
import Dashboard from './pages/Dashboard'
import TripPage from './pages/TripPage'
import PublicPassport from './pages/PublicPassport'
import ResetPassword from './pages/ResetPassword'
import JoinPage, { PENDING_JOIN_KEY } from './pages/JoinPage'

function Private({ children }: { children: ReactNode }) {
  const { session, loading } = useAuth()
  if (loading) return <FullScreenLoader />
  if (!session) return <Navigate to="/login" replace />
  return <>{children}</>
}

function PublicOnly({ children }: { children: ReactNode }) {
  const { session, loading } = useAuth()
  if (loading) return <FullScreenLoader />
  if (session) {
    // ถ้ามาจากลิงก์ชวนเพื่อนก่อนล็อกอิน ให้กลับไปหน้าเข้าร่วมทริป
    const pending = sessionStorage.getItem(PENDING_JOIN_KEY)
    if (pending) return <Navigate to={`/join/${pending}`} replace />
    return <Navigate to="/trips" replace />
  }
  return <>{children}</>
}

export default function App() {
  if (!isConfigured) return <SetupNotice />
  return (
    <AuthProvider>
      <HashRouter>
        <Routes>
          <Route path="/" element={<PublicOnly><Landing /></PublicOnly>} />
          <Route path="/login" element={<PublicOnly><AuthPage mode="login" /></PublicOnly>} />
          <Route path="/register" element={<PublicOnly><AuthPage mode="register" /></PublicOnly>} />
          <Route path="/trips" element={<Private><Dashboard /></Private>} />
          <Route path="/trips/:tripId/:tab?" element={<Private><TripPage /></Private>} />
          <Route path="/reset-password" element={<Private><ResetPassword /></Private>} />
          <Route path="/join/:code" element={<JoinPage />} />
          <Route path="/p/:slug" element={<PublicPassport />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </HashRouter>
    </AuthProvider>
  )
}
