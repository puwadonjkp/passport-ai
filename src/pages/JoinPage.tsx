import { useEffect, useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { Users } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { fmtRange } from '../lib/format'
import { useAuth } from '../context/AuthContext'
import { FullScreenLoader, Spinner, Stamp } from '../components/ui'

interface Preview {
  trip_id: string
  name: string
  destination: string | null
  start_date: string
  end_date: string
  owner_name: string
  member_count: number
  already_member: boolean
}

export const PENDING_JOIN_KEY = 'pai_pending_join'

export default function JoinPage() {
  const { code = '' } = useParams()
  const { session, loading } = useAuth()
  const nav = useNavigate()
  const [preview, setPreview] = useState<Preview | null | undefined>(undefined)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!session) return
    sessionStorage.removeItem(PENDING_JOIN_KEY)
    supabase.rpc('trip_invite_preview', { code }).then(({ data }) => setPreview(((data as Preview[]) ?? [])[0] ?? null))
  }, [session, code])

  if (loading) return <FullScreenLoader />
  if (!session) {
    // ยังไม่ได้ล็อกอิน: จำรหัสเชิญไว้ แล้วพากลับมาหน้านี้หลังล็อกอิน/สมัครเสร็จ
    sessionStorage.setItem(PENDING_JOIN_KEY, code)
    return <Navigate to="/login" replace />
  }
  if (preview === undefined) return <FullScreenLoader />

  async function join() {
    setBusy(true)
    setError('')
    const { data, error } = await supabase.rpc('join_trip', { code })
    setBusy(false)
    if (error) return setError(error.message)
    nav(`/trips/${data}/chat`, { replace: true })
  }

  return (
    <div className="grid min-h-screen place-items-center bg-[linear-gradient(160deg,#2C2119_40%,#7A3B1F_100%)] p-5 text-cream">
      <div className="w-full max-w-md text-center">
        <Stamp size={120} top="JOIN THE" bottom="TRIP" className="mx-auto -rotate-6 text-ember" />
        {preview === null ? (
          <>
            <h1 className="mt-6 text-2xl font-bold">ลิงก์ชวนไม่ถูกต้อง</h1>
            <p className="mt-2 text-cream/60">ลิงก์อาจหมดอายุ หรือเจ้าของทริปสร้างลิงก์ใหม่ไปแล้ว ลองขอลิงก์ใหม่จากเพื่อนนะ</p>
            <Link to="/trips" className="btn-primary mt-6">ไปหน้าทริปของฉัน</Link>
          </>
        ) : (
          <>
            <p className="kicker mt-6 text-saffron">{preview.owner_name} ชวนคุณร่วมทริป</p>
            <h1 className="mt-2 text-3xl font-bold">{preview.name}</h1>
            <p className="mt-2 text-cream/70">{preview.destination && `${preview.destination} · `}{fmtRange(preview.start_date, preview.end_date)}</p>
            <p className="mt-1 flex items-center justify-center gap-1.5 text-sm text-cream/50"><Users size={15} /> สมาชิกตอนนี้ {preview.member_count} คน</p>
            {error && <p className="mt-4 rounded-xl bg-red-500/20 px-4 py-2 text-sm">{error}</p>}
            {preview.already_member ? (
              <Link to={`/trips/${preview.trip_id}/chat`} className="btn-primary mt-8 w-full !py-3">คุณอยู่ในทริปนี้แล้ว — เข้าไปเลย</Link>
            ) : (
              <button className="btn-primary mt-8 w-full !py-3 text-base" onClick={join} disabled={busy}>{busy && <Spinner />} เข้าร่วมทริป ✈️</button>
            )}
            <Link to="/trips" className="mt-4 block text-sm text-cream/50 hover:text-cream">ไว้ทีหลัง</Link>
          </>
        )}
      </div>
    </div>
  )
}
