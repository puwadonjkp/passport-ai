import { useState } from 'react'
import { Check, Copy, Globe, Lock, Printer, RefreshCw, Sparkles } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { buildPassport, savePassport } from '../lib/pipeline'
import { supabase } from '../lib/supabase'
import type { PassportRow } from '../lib/types'
import type { TripData } from '../pages/TripPage'
import AgentLoader from './AgentLoader'
import PassportView from './PassportView'

export default function PassportTab({ trip, photos, expenses, messages, documents, members, passport, setPassport, setTrip, reload, isOwner }: TripData & { reload: () => void }) {
  const { displayName } = useAuth()
  const [progress, setProgress] = useState<{ agent: number; text: string; pct?: number } | null>(null)
  const [warnings, setWarnings] = useState<string[]>([])
  const [copied, setCopied] = useState(false)

  const pics = photos.filter((p) => p.kind === 'photo')
  const memories = messages.filter((m) => m.meta?.memory).length
  const checklist = [
    { ok: pics.length > 0, text: `รูปในคลัง ${pics.length} รูป`, hint: 'อัปโหลดรูปในแท็บ “คลังรูป”' },
    { ok: pics.some((p) => p.lat != null), text: `รูปที่มี GPS ${pics.filter((p) => p.lat != null).length} รูป`, hint: 'ใช้สร้างแผนที่และชื่อสถานที่' },
    { ok: expenses.length > 0, text: `รายจ่ายที่จด ${expenses.length} รายการ`, hint: 'จดผ่านแชทหรือเพิ่มเอง' },
    { ok: memories > 0, text: `บันทึกความทรงจำ ${memories} เรื่อง`, hint: 'เล่าเรื่องในแชท AI จะเอาไปเขียนเรื่องเล่า' },
    { ok: documents.length > 0, text: `ตั๋ว/การจองที่พัก ${documents.length} รายการ`, hint: 'อัปโหลดในแท็บ “ตั๋ว/ที่พัก” จะได้หน้าการเดินทางใน Passport' },
    ...(members.length > 1 ? [{ ok: true, text: `เพื่อนร่วมทริป ${members.length} คน`, hint: 'Passport จะมีสรุปหารเงินให้ด้วย' }] : []),
    { ok: photos.some((p) => p.is_highlight), text: `รูปไฮไลต์ ${photos.filter((p) => p.is_highlight).length} รูป`, hint: 'ถ้าไม่เลือก ระบบจะเลือกให้' },
  ]

  async function generate() {
    setWarnings([])
    try {
      const { data, warnings } = await buildPassport({
        trip, photos: [...photos], expenses, messages, documents, members, userName: members.length > 1 ? members.map((m) => m.display_name).join(', ') : displayName,
        onProgress: (agent, text, pct) => setProgress({ agent, text, pct }),
      })
      const row = await savePassport(trip, data)
      setPassport(row as PassportRow)
      if (isOwner) setTrip({ ...trip, status: 'ended' })
      setWarnings(warnings)
      reload()
    } catch (e) {
      alert(`สร้าง Passport ไม่สำเร็จ: ${(e as Error).message}`)
    } finally {
      setProgress(null)
    }
  }

  async function togglePublic() {
    if (!passport) return
    const { data } = await supabase.from('passports').update({ is_public: !passport.is_public }).eq('id', passport.id).select().single()
    if (data) setPassport(data as PassportRow)
  }

  const shareUrl = passport ? `${window.location.origin}${window.location.pathname}#/p/${passport.share_slug}` : ''

  if (!passport)
    return (
      <>
        {progress && <AgentLoader {...progress} />}
        <div className="mx-auto max-w-2xl">
          <div className="overflow-hidden rounded-3xl bg-espresso text-cream">
            <div className="p-7 sm:p-10">
              <p className="kicker text-saffron">จบทริปแล้วใช่ไหม?</p>
              <h2 className="mt-2 text-3xl font-bold">สร้าง Travel Passport ✨</h2>
              <p className="mt-2 text-cream/70">AI 5 ตัวจะรวบรวมรูป แผนที่ เรื่องเล่า และค่าใช้จ่ายทั้งหมด เป็นสมุดความทรงจำของทริป “{trip.name}”</p>
              <ul className="mt-6 space-y-2.5">
                {checklist.map((c) => (
                  <li key={c.text} className="flex items-start gap-3">
                    <span className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full text-xs ${c.ok ? 'bg-lagoon' : 'bg-white/15'}`}>{c.ok ? <Check size={13} /> : ''}</span>
                    <span><span className={c.ok ? '' : 'text-cream/60'}>{c.text}</span><span className="block text-xs text-cream/40">{c.hint}</span></span>
                  </li>
                ))}
              </ul>
              <button className="btn-primary mt-8 w-full !py-3.5 text-base" onClick={generate} disabled={!pics.length && !expenses.length && !memories}>
                <Sparkles size={18} /> สร้าง Passport เลย
              </button>
              {!pics.length && !expenses.length && !memories && <p className="mt-3 text-center text-xs text-cream/50">ต้องมีรูป รายจ่าย หรือบันทึกอย่างน้อย 1 อย่างก่อน</p>}
            </div>
          </div>
        </div>
      </>
    )

  return (
    <div className="space-y-4">
      {progress && <AgentLoader {...progress} />}
      <div className="no-print card flex flex-wrap items-center gap-2 p-3">
        <button onClick={togglePublic} className={`btn ${passport.is_public ? 'bg-lagoon text-white' : 'btn-outline'}`}>
          {passport.is_public ? <Globe size={16} /> : <Lock size={16} />} {passport.is_public ? 'แชร์สาธารณะอยู่' : 'ส่วนตัว'}
        </button>
        {passport.is_public && (
          <button className="btn-outline min-w-0 max-w-full" onClick={() => { navigator.clipboard.writeText(shareUrl); setCopied(true); setTimeout(() => setCopied(false), 1800) }}>
            {copied ? <Check size={16} /> : <Copy size={16} />} <span className="truncate">{copied ? 'คัดลอกลิงก์แล้ว!' : 'คัดลอกลิงก์แชร์'}</span>
          </button>
        )}
        <div className="flex-1" />
        <button className="btn-outline" onClick={() => window.print()}><Printer size={16} /> พิมพ์ / PDF</button>
        <button className="btn-dark" onClick={() => confirm('สร้าง Passport ใหม่จากข้อมูลล่าสุด? (เนื้อหาเดิมจะถูกแทนที่)') && generate()}><RefreshCw size={16} /> สร้างใหม่</button>
      </div>
      {warnings.map((w) => <p key={w} className="no-print rounded-xl bg-saffron-100 px-4 py-2.5 text-sm">⚠️ {w}</p>)}
      {!passport.data.aiUsed && <p className="no-print rounded-xl bg-saffron-100 px-4 py-2.5 text-sm">ℹ️ Passport นี้สร้างแบบไม่ใช้ AI (ยังไม่ได้ตั้งค่า API Key) — เปิดใช้ AI แล้วกด “สร้างใหม่” เพื่อให้ได้เรื่องเล่าที่ AI เขียน</p>}
      <PassportView data={passport.data} />
    </div>
  )
}
