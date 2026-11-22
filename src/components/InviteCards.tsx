import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Mail, Users } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { fmtRange } from '../lib/format'
import type { MyInvite } from '../lib/types'
import { useAuth } from '../context/AuthContext'
import { Spinner } from './ui'

/** คำเชิญเข้าทริปที่ส่งถึงอีเมลของฉัน: ตั้งชื่อในทริปแล้วกดเข้าร่วม หรือปฏิเสธ */
export default function InviteCards() {
  const { displayName } = useAuth()
  const nav = useNavigate()
  const [invites, setInvites] = useState<MyInvite[]>([])

  useEffect(() => {
    supabase.rpc('my_invites').then(({ data }) => setInvites((data as MyInvite[]) ?? []))
  }, [])

  if (!invites.length) return null
  return (
    <section className="mt-8 space-y-3">
      <h2 className="flex items-center gap-2 text-xl font-bold"><Mail size={20} className="text-ember" /> คำเชิญเข้าทริป ({invites.length})</h2>
      {invites.map((inv) => (
        <InviteCard key={inv.id} inv={inv} defaultName={displayName}
          onJoined={(tripId) => nav(`/trips/${tripId}/chat`)}
          onDeclined={() => setInvites((is) => is.filter((i) => i.id !== inv.id))} />
      ))}
    </section>
  )
}

export function InviteCard({ inv, defaultName, onJoined, onDeclined }: { inv: MyInvite; defaultName: string; onJoined: (tripId: string) => void; onDeclined: () => void }) {
  const [name, setName] = useState(defaultName)
  const [busy, setBusy] = useState<'join' | 'decline' | null>(null)
  const [error, setError] = useState('')

  async function accept() {
    if (!name.trim()) return setError('กรอกชื่อที่เพื่อนๆ ใช้เรียกคุณก่อนนะ')
    setBusy('join')
    setError('')
    const { data, error } = await supabase.rpc('accept_invite', { p_invite: inv.id, p_name: name.trim() })
    setBusy(null)
    if (error) {
      return setError(/name taken/i.test(error.message)
        ? `มีเพื่อนในทริปใช้ชื่อ "${name.trim()}" แล้ว ลองชื่ออื่นเพื่อให้น้องพาสแยกออกว่าใครจ่าย`
        : /not found/i.test(error.message) ? 'คำเชิญนี้ถูกยกเลิกไปแล้ว' : error.message)
    }
    onJoined(data as string)
  }

  async function decline() {
    if (!confirm(`ปฏิเสธคำเชิญเข้าทริป "${inv.trip_name}"?`)) return
    setBusy('decline')
    await supabase.rpc('decline_invite', { p_invite: inv.id })
    setBusy(null)
    onDeclined()
  }

  return (
    <div className="card flex flex-col gap-4 p-5 sm:flex-row sm:items-end animate-fade-up">
      <div className="min-w-0 flex-1">
        <p className="text-sm text-ink-muted">✈️ <b className="text-ink">{inv.invited_by_name}</b> ชวนคุณเข้าทริป</p>
        <h3 className="mt-1 truncate text-xl font-bold">{inv.trip_name}</h3>
        <p className="text-sm text-ink-muted">
          {inv.destination && `${inv.destination} · `}{fmtRange(inv.start_date, inv.end_date)}
          <span className="ml-2 inline-flex items-center gap-1"><Users size={13} /> {inv.member_count} คน</span>
        </p>
        <label className="label mt-3">ชื่อของคุณในทริปนี้</label>
        <input className="input !py-2" value={name} maxLength={30} placeholder="เช่น ไปป์"
          onChange={(e) => { setName(e.target.value); setError('') }} onKeyDown={(e) => e.key === 'Enter' && accept()} />
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      </div>
      <div className="flex gap-2">
        <button className="btn-ghost" onClick={decline} disabled={busy !== null}>{busy === 'decline' && <Spinner size={14} />} ปฏิเสธ</button>
        <button className="btn-primary" onClick={accept} disabled={busy !== null}>{busy === 'join' && <Spinner size={14} />} เข้าร่วมทริป</button>
      </div>
    </div>
  )
}
