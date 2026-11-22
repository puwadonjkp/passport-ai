import { useEffect, useState } from 'react'
import { Check, Copy, Crown, Mail, RefreshCw, Share2, X } from 'lucide-react'
import { nameTaken } from '../lib/settle'
import { supabase } from '../lib/supabase'
import type { TripInvite } from '../lib/types'
import type { TripData } from '../pages/TripPage'
import { Modal, Spinner } from './ui'

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
  const canShare = typeof navigator.share === 'function'
  const currentName = members.find((m) => m.user_id === me)?.display_name ?? ''
  const [myName, setMyName] = useState(currentName)
  const [nameMsg, setNameMsg] = useState<{ ok: boolean; text: string } | null>(null)

  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteMsg, setInviteMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [inviting, setInviting] = useState(false)
  const [pending, setPending] = useState<TripInvite[]>([])

  // เติมชื่อปัจจุบันทุกครั้งที่เปิดหน้าต่าง (ตอน mount รายชื่อสมาชิกอาจยังโหลดไม่เสร็จ)
  useEffect(() => {
    if (open) {
      setMyName(currentName)
      setNameMsg(null)
      setInviteMsg(null)
    }
  }, [open, currentName])

  useEffect(() => {
    if (!open) return
    supabase.from('trip_invites').select('*').eq('trip_id', trip.id).order('created_at')
      .then(({ data }) => setPending((data as TripInvite[]) ?? []))
  }, [open, trip.id])

  // เชิญด้วยอีเมล: ระบบตอบเหมือนกันไม่ว่าอีเมลนั้นมีบัญชีหรือไม่ (กันการใช้เช็คว่าใครเป็นสมาชิกเว็บ)
  async function inviteByEmail() {
    const email = inviteEmail.trim().toLowerCase()
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return setInviteMsg({ ok: false, text: 'รูปแบบอีเมลไม่ถูกต้อง' })
    if (pending.some((p) => p.email === email)) return setInviteMsg({ ok: false, text: 'เชิญอีเมลนี้ไว้แล้ว รอเพื่อนตอบรับอยู่' })
    setInviting(true)
    const { error } = await supabase.rpc('invite_by_email', { p_trip: trip.id, p_email: email })
    setInviting(false)
    if (error) {
      return setInviteMsg({ ok: false, text: /too many/i.test(error.message) ? 'มีคำเชิญค้างเยอะเกินไป (สูงสุด 30) ยกเลิกบางอันก่อนนะ' : error.message })
    }
    const { data } = await supabase.from('trip_invites').select('*').eq('trip_id', trip.id).order('created_at')
    setPending((data as TripInvite[]) ?? [])
    setInviteEmail('')
    setInviteMsg({ ok: true, text: `เชิญ ${email} แล้ว ✓ บอกเพื่อนให้เข้าเว็บด้วยอีเมลนี้ จะเห็นคำเชิญที่หน้า "ทริปของฉัน"` })
  }

  async function cancelInvite(inv: TripInvite) {
    await supabase.from('trip_invites').delete().eq('id', inv.id)
    setPending((ps) => ps.filter((p) => p.id !== inv.id))
  }
  const link = trip.invite_code ? `${window.location.origin}${window.location.pathname}#/join/${trip.invite_code}` : ''

  async function copy() {
    const text = `มาจดทริป "${trip.name}" ด้วยกันใน Passport AI ✈️\n${link}`
    if (canShare) {
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
    if (!name) return setNameMsg({ ok: false, text: 'กรอกชื่อก่อนนะ' })
    if (nameTaken(name, members, me)) return setNameMsg({ ok: false, text: `มีเพื่อนในทริปใช้ชื่อ "${name}" แล้ว ลองชื่ออื่นเพื่อให้น้องพาสแยกออกว่าใครจ่าย` })
    const { error } = await supabase.from('trip_members').update({ display_name: name }).eq('trip_id', trip.id).eq('user_id', me)
    if (error) return setNameMsg({ ok: false, text: error.message })
    setMembers((ms) => ms.map((m) => (m.user_id === me ? { ...m, display_name: name } : m)))
    setNameMsg({ ok: true, text: `บันทึกแล้ว ✓ น้องพาสจะเรียกคุณว่า "${name}"` })
  }

  return (
    <Modal open={open} onClose={onClose} title="👥 เพื่อนร่วมทริป">
      <div className="rounded-2xl bg-espresso p-5 text-cream">
        <p className="font-semibold">ชวนเพื่อนมาจดทริปด้วยกัน</p>
        <p className="mt-1 text-sm text-cream/60">ส่งลิงก์นี้ให้เพื่อน (เพื่อนต้องสมัคร/ล็อกอินก่อน) แล้วทุกคนจะแชทจดรายจ่าย อัปรูป และเห็นสรุปหารเงินร่วมกันแบบเรียลไทม์</p>
        <div className="mt-4 flex gap-2">
          <input readOnly value={link} className="min-w-0 flex-1 rounded-xl bg-white/10 px-3 py-2 text-sm text-cream outline-none" onFocus={(e) => e.target.select()} />
          <button className="btn-primary !px-4" onClick={copy}>{copied ? <Check size={16} /> : canShare ? <Share2 size={16} /> : <Copy size={16} />}{copied ? 'คัดลอกแล้ว' : 'ส่ง'}</button>
        </div>
        {isOwner && <button className="mt-3 flex items-center gap-1.5 text-xs text-cream/50 hover:text-cream" onClick={regenerate}><RefreshCw size={12} /> สร้างลิงก์ใหม่ (ยกเลิกลิงก์เดิม)</button>}
      </div>

      <div className="mt-4 rounded-2xl bg-white p-4 ring-1 ring-cream-200">
        <p className="flex items-center gap-2 font-semibold"><Mail size={16} className="text-ember" /> หรือเชิญด้วยอีเมล</p>
        <p className="mt-1 text-xs text-ink-muted">เพื่อนจะเห็นคำเชิญเมื่อเข้าเว็บด้วยอีเมลนี้ (ยังไม่มีบัญชีก็สมัครทีหลังได้) ระบบยังไม่ส่งอีเมลแจ้ง ต้องบอกเพื่อนเอง</p>
        <div className="mt-3 flex gap-2">
          <input className="input !py-2" type="email" inputMode="email" autoComplete="off" placeholder="friend@gmail.com" value={inviteEmail}
            onChange={(e) => { setInviteEmail(e.target.value); setInviteMsg(null) }} onKeyDown={(e) => e.key === 'Enter' && inviteByEmail()} />
          <button className="btn-primary !px-4" onClick={inviteByEmail} disabled={inviting || !inviteEmail.trim()}>{inviting && <Spinner size={14} />} เชิญ</button>
        </div>
        {inviteMsg && <p className={`mt-2 text-sm ${inviteMsg.ok ? 'text-lagoon-600' : 'text-red-600'}`}>{inviteMsg.text}</p>}
        {pending.length > 0 && (
          <ul className="mt-3 space-y-1.5">
            {pending.map((p) => (
              <li key={p.id} className="flex items-center gap-2 rounded-xl bg-cream px-3 py-2 text-sm">
                <Mail size={14} className="shrink-0 text-ink-muted" />
                <span className="min-w-0 flex-1 truncate">{p.email}</span>
                <span className="chip bg-saffron-100 text-ink-muted">รอตอบรับ</span>
                <button className="p-1 text-ink-muted hover:text-red-600" title="ยกเลิกคำเชิญ" onClick={() => cancelInvite(p)}><X size={14} /></button>
              </li>
            ))}
          </ul>
        )}
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
          <input className="input" value={myName} maxLength={30} placeholder="เช่น ข้าวตัง"
            onChange={(e) => { setMyName(e.target.value); setNameMsg(null) }} onKeyDown={(e) => e.key === 'Enter' && rename()} />
          <button className="btn-dark" onClick={rename} disabled={myName.trim() === currentName}>บันทึก</button>
        </div>
        {nameMsg && <p className={`mt-2 text-sm ${nameMsg.ok ? 'text-lagoon-600' : 'text-red-600'}`}>{nameMsg.text}</p>}
        <p className="mt-2 text-xs text-ink-muted">💡 ในแชทพิมพ์ได้เลย เช่น “ไปป์จ่ายค่าแท็กซี่ 2,000 เยน” หรือ “ข้าวมันไก่ 120 บาท ของฉันคนเดียว”</p>
      </div>
    </Modal>
  )
}
