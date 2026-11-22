import { useEffect, useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { Users } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { nameTaken } from '../lib/settle'
import type { Member } from '../lib/types'
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
  const { session, loading, displayName } = useAuth()
  const nav = useNavigate()
  const [preview, setPreview] = useState<Preview | null | undefined>(undefined)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [name, setName] = useState('')
  const [joinedTrip, setJoinedTrip] = useState<string | null>(null)

  useEffect(() => {
    if (displayName) setName((n) => n || displayName)
  }, [displayName])

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

  // เข้าร่วมทริป แล้วตั้งชื่อในทริปนี้ (เช็คชื่อซ้ำได้หลังเป็นสมาชิกแล้วเท่านั้น เพราะคนนอกดูรายชื่อสมาชิกไม่ได้)
  async function join() {
    const myName = name.trim()
    if (!myName) return setError('กรอกชื่อที่เพื่อนๆ ใช้เรียกคุณก่อนนะ')
    setBusy(true)
    setError('')
    let tripId = joinedTrip
    if (!tripId) {
      const { data, error } = await supabase.rpc('join_trip', { code })
      if (error) {
        setBusy(false)
        return setError(error.message)
      }
      tripId = data as string
      setJoinedTrip(tripId)
    }
    const { data: members } = await supabase.from('trip_members').select('*').eq('trip_id', tripId)
    if (nameTaken(myName, (members as Member[]) ?? [], session!.user.id)) {
      setBusy(false)
      return setError(`มีเพื่อนในทริปใช้ชื่อ "${myName}" แล้ว ลองเพิ่มนามสกุลหรือชื่อเล่นอื่น เพื่อให้น้องพาสแยกออกว่าใครจ่าย`)
    }
    await supabase.from('trip_members').update({ display_name: myName }).eq('trip_id', tripId).eq('user_id', session!.user.id)
    setBusy(false)
    nav(`/trips/${tripId}/chat`, { replace: true })
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
            {!preview.already_member && (
              <div className="mt-8 text-left">
                <label className="mb-1.5 block text-sm text-cream/70">ชื่อของคุณในทริปนี้</label>
                <input className="w-full rounded-xl bg-white/10 px-4 py-3 text-cream outline-none ring-1 ring-white/15 placeholder:text-cream/40 focus:ring-ember"
                  value={name} onChange={(e) => setName(e.target.value)} placeholder="เช่น ไปป์" maxLength={30} />
                <p className="mt-1.5 text-xs text-cream/50">ใช้ชื่อที่เพื่อนๆ เรียกกัน น้องพาสจะใช้ชื่อนี้จำว่าใครเป็นคนจ่าย เช่น “ไปป์จ่ายค่าแท็กซี่”</p>
              </div>
            )}
            {error && <p className="mt-4 rounded-xl bg-red-500/20 px-4 py-2 text-sm">{error}</p>}
            {preview.already_member ? (
              <Link to={`/trips/${preview.trip_id}/chat`} className="btn-primary mt-8 w-full !py-3">คุณอยู่ในทริปนี้แล้ว — เข้าไปเลย</Link>
            ) : (
              <button className="btn-primary mt-5 w-full !py-3 text-base" onClick={join} disabled={busy}>{busy && <Spinner />} {joinedTrip ? 'บันทึกชื่อแล้วเข้าทริป' : 'เข้าร่วมทริป ✈️'}</button>
            )}
            <Link to="/trips" className="mt-4 block text-sm text-cream/50 hover:text-cream">ไว้ทีหลัง</Link>
          </>
        )}
      </div>
    </div>
  )
}
