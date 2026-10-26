import { useState } from 'react'
import { Check, Copy, Crown, RefreshCw, Share2, X } from 'lucide-react'
import { supabase } from '../lib/supabase'
import type { TripData } from '../pages/TripPage'
import { Modal } from './ui'

const AVATAR_COLORS = ['#E2622B', '#1F6F68', '#5B6BB5', '#E8A33D', '#B5527A', '#3E8E5B']

export function Avatar({ name, size = 32, ring = false }: { name: string; size?: number; ring?: boolean }) {
  let h = 0
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) >>> 0
  return (
    <span
      className={`grid shrink-0 place-items-center rounded-full font-semibold text-white ${ring ? 'ring-2 ring-white' : ''}`}
      style={{ width: size, height: size, fontSize: size * 0.42, background: AVATAR_COLORS[h % AVATAR_COLORS.length] }}
      title={name}
    >
      {[...name.trim()][0] ?? '?'}
    </span>
  )
}

export default function MembersModal({ open, onClose, trip, members, me, isOwner, setTrip, setMembers }: TripData & { open: boolean; onClose: () => void }) {
  const [copied, setCopied] = useState(false)
  const [myName, setMyName] = useState(members.find((m) => m.user_id === me)?.display_name ?? '')
  const link = trip.invite_code ? `${window.location.origin}${window.location.pathname}#/join/${trip.invite_code}` : ''

  async function copy() {
    const text = `มาจดทริป "${trip.name}" ด้วยกันใน Passport AI ✈️\n${link}`
    if (navigator.share) {
      try {
        await navigator.share({ title: trip.name, text, url: link })
        return
      } catch {
        /* ผู้ใช้กดยกเลิก -> คัดลอกแทน */
      }
    }
    await navigator.clipboard.writeText(link)
    setCopied(true)
    setTimeout(() => setCopied(false), 1800)
  }

  async function regenerate() {
    if (!confirm('สร้างลิงก์ใหม่? ลิงก์เดิมจะใช้ไม่ได้อีก (สมาชิกที่เข้ามาแล้วยังอยู่)')) return
    const code = crypto.randomUUID().replace(/-/g, '').slice(0, 10)
    const { data } = await supabase.from('trips').update({ invite_code: code }).eq('id', trip.id).select().single()
    if (data) setTrip({ ...trip, invite_code: code })
  }

  async function remove(userId: string, name: string) {
    if (!confirm(`เอา ${name} ออกจากทริป? (รายจ่ายที่เคยจดไว้ยังอยู่)`)) return
    await supabase.from('trip_members').delete().eq('trip_id', trip.id).eq('user_id', userId)
    setMembers((ms) => ms.filter((m) => m.user_id !== userId))
  }

  async function rename() {
    const name = myName.trim()
    if (!name) return
    await supabase.from('trip_members').update({ display_name: name }).eq('trip_id', trip.id).eq('user_id', me)
    setMembers((ms) => ms.map((m) => (m.user_id === me ? { ...m, display_name: name } : m)))
  }

  return (
    <Modal open={open} onClose={onClose} title="👥 เพื่อนร่วมทริป">
      <div className="rounded-2xl bg-espresso p-5 text-cream">
        <p className="font-semibold">ชวนเพื่อนมาจดทริปด้วยกัน</p>
        <p className="mt-1 text-sm text-cream/60">ส่งลิงก์นี้ให้เพื่อน (เพื่อนต้องสมัคร/ล็อกอินก่อน) แล้วทุกคนจะแชทจดรายจ่าย อัปรูป และเห็นสรุปหารเงินร่วมกันแบบเรียลไทม์</p>
        <div className="mt-4 flex gap-2">
          <input readOnly value={link} className="min-w-0 flex-1 rounded-xl bg-white/10 px-3 py-2 text-sm text-cream outline-none" onFocus={(e) => e.target.select()} />
          <button className="btn-primary !px-4" onClick={copy}>{copied ? <Check size={16} /> : navigator.share ? <Share2 size={16} /> : <Copy size={16} />}{copied ? 'คัดลอกแล้ว' : 'ส่ง'}</button>
        </div>
        {isOwner && <button className="mt-3 flex items-center gap-1.5 text-xs text-cream/50 hover:text-cream" onClick={regenerate}><RefreshCw size={12} /> สร้างลิงก์ใหม่ (ยกเลิกลิงก์เดิม)</button>}
      </div>

      <h3 className="mb-2 mt-6 text-sm font-semibold text-ink-muted">สมาชิก {members.length} คน</h3>
      <ul className="divide-y divide-cream-200 rounded-2xl bg-white ring-1 ring-cream-200">
        {members.map((m) => (
          <li key={m.user_id} className="flex items-center gap-3 px-4 py-3">
            <Avatar name={m.display_name} />
            <div className="min-w-0 flex-1">
              <div className="truncate font-medium">{m.display_name} {m.user_id === me && <span className="text-xs text-ink-muted">(คุณ)</span>}</div>
              <div className="text-xs text-ink-muted">{m.role === 'owner' ? 'เจ้าของทริป' : 'สมาชิก'}</div>
            </div>
            {m.role === 'owner' && <Crown size={16} className="text-saffron" />}
            {isOwner && m.role !== 'owner' && (
              <button className="p-1.5 text-ink-muted hover:text-red-600" title="เอาออก" onClick={() => remove(m.user_id, m.display_name)}><X size={16} /></button>
            )}
          </li>
        ))}
      </ul>

      <div className="mt-6">
        <label className="label">ชื่อของคุณในทริปนี้ (ใช้ตอนบอก AI ว่าใครจ่าย)</label>
        <div className="flex gap-2">
          <input className="input" value={myName} onChange={(e) => setMyName(e.target.value)} placeholder="เช่น ข้าวตัง" />
          <button className="btn-dark" onClick={rename}>บันทึก</button>
        </div>
        <p className="mt-2 text-xs text-ink-muted">💡 ในแชทพิมพ์ได้เลย เช่น “ไปป์จ่ายค่าแท็กซี่ 2,000 เยน” หรือ “ข้าวมันไก่ 120 บาท ของฉันคนเดียว”</p>
      </div>
    </Modal>
  )
}
