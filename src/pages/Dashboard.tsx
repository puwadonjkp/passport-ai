import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { BookOpen, CalendarDays, Globe2, Plus, Wallet } from 'lucide-react'
import { publicUrl, supabase } from '../lib/supabase'
import { COMPANIONS, THEMES } from '../lib/constants'
import { daysBetween, fmtCompact, fmtRange, todayISO } from '../lib/format'
import type { Trip } from '../lib/types'
import { useAuth } from '../context/AuthContext'
import { Empty, Spinner, Stamp, TopBar } from '../components/ui'
import TripFormModal from '../components/TripFormModal'

export default function Dashboard() {
  const { displayName } = useAuth()
  const nav = useNavigate()
  const [trips, setTrips] = useState<Trip[] | null>(null)
  const [spent, setSpent] = useState<Record<string, number>>({})
  const [passports, setPassports] = useState<Set<string>>(new Set())
  const [open, setOpen] = useState(false)

  useEffect(() => {
    ;(async () => {
      const [{ data: t }, { data: e }, { data: p }] = await Promise.all([
        supabase.from('trips').select('*').order('start_date', { ascending: false }),
        supabase.from('expenses').select('trip_id, amount_home'),
        supabase.from('passports').select('trip_id'),
      ])
      setTrips((t as Trip[]) ?? [])
      const s: Record<string, number> = {}
      for (const r of e ?? []) s[r.trip_id] = (s[r.trip_id] ?? 0) + Number(r.amount_home)
      setSpent(s)
      setPassports(new Set((p ?? []).map((r) => r.trip_id)))
    })()
  }, [])

  const stats = useMemo(() => {
    const list = trips ?? []
    return {
      trips: list.length,
      days: list.reduce((s, t) => s + daysBetween(t.start_date, t.end_date) + 1, 0),
      passports: passports.size,
      spent: Object.values(spent).reduce((a, b) => a + b, 0),
    }
  }, [trips, spent, passports])

  const today = todayISO()
  const ongoing = (trips ?? []).filter((t) => t.status === 'active' && t.start_date <= today && t.end_date >= today)

  return (
    <div className="min-h-screen">
      <TopBar />
      <main className="mx-auto max-w-6xl px-4 pb-24 pt-8">
        <section className="relative overflow-hidden rounded-3xl bg-espresso p-7 text-cream sm:p-10">
          <Stamp size={220} className="pointer-events-none absolute -right-10 -top-10 rotate-12 text-white/5" />
          <p className="kicker text-saffron">My Passport Collection</p>
          <h1 className="mt-2 text-3xl font-bold sm:text-4xl">สวัสดี {displayName} 👋</h1>
          <p className="mt-1 text-cream/60">{ongoing.length ? `กำลังเที่ยว ${ongoing[0].name} อยู่ใช่ไหม? จดรายจ่ายต่อได้เลย` : 'พร้อมออกเดินทางครั้งใหม่หรือยัง?'}</p>
          <div className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { icon: Globe2, v: stats.trips, l: 'ทริปทั้งหมด' },
              { icon: CalendarDays, v: stats.days, l: 'วันบนท้องถนน' },
              { icon: BookOpen, v: stats.passports, l: 'Passport ที่สร้างแล้ว' },
              { icon: Wallet, v: fmtCompact(stats.spent), l: 'ใช้จ่ายรวม (สกุลหลัก)' },
            ].map((s) => (
              <div key={s.l} className="rounded-2xl bg-white/5 p-4 ring-1 ring-white/10">
                <s.icon size={18} className="text-saffron" />
                <div className="mt-2 font-display text-2xl font-bold">{s.v}</div>
                <div className="text-xs text-cream/50">{s.l}</div>
              </div>
            ))}
          </div>
          <div className="mt-7 flex flex-wrap gap-3">
            <button className="btn-primary" onClick={() => setOpen(true)}><Plus size={18} /> สร้างทริปใหม่</button>
            {ongoing[0] && <Link className="btn bg-white/10 text-cream hover:bg-white/20" to={`/trips/${ongoing[0].id}/chat`}>💬 จดรายจ่ายทริปปัจจุบัน</Link>}
          </div>
        </section>

        <h2 className="mb-4 mt-10 text-2xl font-bold">ทริปของฉัน</h2>
        {trips === null ? (
          <div className="grid place-items-center py-20 text-ink-muted"><Spinner size={28} /></div>
        ) : trips.length === 0 ? (
          <Empty icon={<Globe2 size={28} />} title="ยังไม่มีทริปเลย" text="สร้างทริปแรก แล้วเริ่มจดรายจ่าย เก็บรูป ระหว่างเที่ยวได้เลย"
            action={<button className="btn-primary" onClick={() => setOpen(true)}><Plus size={18} /> สร้างทริปแรก</button>} />
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {trips.map((t, i) => {
              const th = THEMES[t.theme] ?? THEMES.ember
              const live = t.status === 'active' && t.start_date <= today && t.end_date >= today
              const upcoming = t.start_date > today
              return (
                <Link key={t.id} to={`/trips/${t.id}/${passports.has(t.id) ? 'passport' : 'chat'}`}
                  className="group card overflow-hidden transition hover:-translate-y-1 hover:shadow-lift animate-fade-up" style={{ animationDelay: `${i * 40}ms` }}>
                  <div className="relative h-40 overflow-hidden" style={{ background: `linear-gradient(135deg, ${th.primary}, ${th.secondary})` }}>
                    {t.cover_photo_path && <img src={publicUrl(t.cover_photo_path)} alt="" className="h-full w-full object-cover opacity-90 transition duration-500 group-hover:scale-105" loading="lazy" />}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                    <div className="absolute left-4 top-4 flex gap-2">
                      {live && <span className="chip bg-ember text-white"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />กำลังเที่ยว</span>}
                      {upcoming && <span className="chip bg-white/90 text-ink">เร็วๆ นี้</span>}
                      {passports.has(t.id) && <span className="chip bg-saffron text-espresso">🛂 Passport พร้อม</span>}
                    </div>
                    <div className="absolute bottom-3 left-4 right-4 text-white">
                      <h3 className="truncate text-xl font-bold">{t.name}</h3>
                      <p className="truncate text-xs text-white/80">{t.destination || '—'}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between px-4 py-3 text-sm">
                    <span className="text-ink-muted">{fmtRange(t.start_date, t.end_date)}</span>
                    <span className="font-semibold">{(COMPANIONS[t.companion] ?? COMPANIONS.friends).emoji} {fmtCompact(spent[t.id] ?? 0)} {t.home_currency}</span>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </main>
      <TripFormModal open={open} onClose={() => setOpen(false)} onSaved={(t) => nav(`/trips/${t.id}/chat`)} />
    </div>
  )
}
