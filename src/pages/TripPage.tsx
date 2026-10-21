import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, BookOpen, Images, MessageCircle, Pencil, Trash2, Wallet } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { COMPANIONS } from '../lib/constants'
import { dayNumber, fmtMoney, fmtRange, todayISO } from '../lib/format'
import { deleteTripFolder } from '../lib/photos'
import type { Expense, Message, PassportRow, Photo, Trip } from '../lib/types'
import { FullScreenLoader, TopBar } from '../components/ui'
import TripFormModal from '../components/TripFormModal'
import ChatTab from '../components/ChatTab'
import PhotosTab from '../components/PhotosTab'
import ExpensesTab from '../components/ExpensesTab'
import PassportTab from '../components/PassportTab'

const TABS = [
  { key: 'chat', label: 'แชทจดทริป', icon: MessageCircle },
  { key: 'photos', label: 'คลังรูป', icon: Images },
  { key: 'expenses', label: 'ค่าใช้จ่าย', icon: Wallet },
  { key: 'passport', label: 'Passport', icon: BookOpen },
] as const

export type TripData = {
  trip: Trip
  photos: Photo[]
  expenses: Expense[]
  messages: Message[]
  passport: PassportRow | null
  setTrip: (t: Trip) => void
  setPhotos: React.Dispatch<React.SetStateAction<Photo[]>>
  setExpenses: React.Dispatch<React.SetStateAction<Expense[]>>
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>
  setPassport: (p: PassportRow | null) => void
}

export default function TripPage() {
  const { tripId, tab = 'chat' } = useParams()
  const nav = useNavigate()
  const [trip, setTrip] = useState<Trip | null>(null)
  const [photos, setPhotos] = useState<Photo[]>([])
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [messages, setMessages] = useState<Message[]>([])
  const [passport, setPassport] = useState<PassportRow | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [editing, setEditing] = useState(false)

  const load = useCallback(async () => {
    const [t, p, e, m, pp] = await Promise.all([
      supabase.from('trips').select('*').eq('id', tripId).maybeSingle(),
      supabase.from('photos').select('*').eq('trip_id', tripId).order('taken_at', { ascending: true, nullsFirst: false }),
      supabase.from('expenses').select('*').eq('trip_id', tripId).order('spent_on').order('created_at'),
      supabase.from('messages').select('*').eq('trip_id', tripId).order('created_at'),
      supabase.from('passports').select('*').eq('trip_id', tripId).maybeSingle(),
    ])
    if (!t.data) return setNotFound(true)
    setTrip(t.data as Trip)
    setPhotos((p.data as Photo[]) ?? [])
    setExpenses((e.data as Expense[]) ?? [])
    setMessages((m.data as Message[]) ?? [])
    setPassport((pp.data as PassportRow) ?? null)
  }, [tripId])

  useEffect(() => {
    load()
  }, [load])

  const spent = useMemo(() => expenses.reduce((s, e) => s + Number(e.amount_home), 0), [expenses])

  if (notFound)
    return (
      <div className="grid min-h-screen place-items-center p-6 text-center">
        <div>
          <p className="text-lg font-bold">ไม่พบทริปนี้</p>
          <Link to="/trips" className="btn-primary mt-4">กลับหน้าทริปของฉัน</Link>
        </div>
      </div>
    )
  if (!trip) return <FullScreenLoader />

  const data: TripData = { trip, photos, expenses, messages, passport, setTrip, setPhotos, setExpenses, setMessages, setPassport }
  const today = todayISO()
  const dayNow = trip.start_date <= today && today <= trip.end_date ? dayNumber(trip.start_date, today) : null
  const totalDays = dayNumber(trip.start_date, trip.end_date)!
  const budgetPct = trip.budget ? Math.min(100, (spent / trip.budget) * 100) : 0

  async function removeTrip() {
    if (!trip || !confirm(`ลบทริป "${trip.name}" พร้อมรูป แชท และรายจ่ายทั้งหมด? (กู้คืนไม่ได้)`)) return
    await deleteTripFolder(trip)
    await supabase.from('trips').delete().eq('id', trip.id)
    nav('/trips')
  }

  return (
    <div className="flex min-h-screen flex-col">
      <TopBar />
      <div className="no-print border-b border-cream-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 pt-4">
          <div className="flex items-start gap-3">
            <Link to="/trips" className="btn-ghost mt-0.5 !p-2" aria-label="กลับ"><ArrowLeft size={20} /></Link>
            <div className="min-w-0 flex-1">
              <h1 className="truncate text-2xl font-bold">{trip.name}</h1>
              <p className="truncate text-sm text-ink-muted">
                {trip.destination && <>{trip.destination} · </>}
                {fmtRange(trip.start_date, trip.end_date)} · {totalDays} วัน · {(COMPANIONS[trip.companion] ?? COMPANIONS.friends).emoji}{' '}
                {dayNow && <span className="font-semibold text-ember">· วันนี้ Day {dayNow}</span>}
              </p>
            </div>
            <button className="btn-ghost !p-2" title="แก้ไขทริป" onClick={() => setEditing(true)}><Pencil size={18} /></button>
            <button className="btn-ghost !p-2 text-red-600" title="ลบทริป" onClick={removeTrip}><Trash2 size={18} /></button>
          </div>
          <div className="ml-11 mt-3 flex items-center gap-3 text-sm">
            <span className="font-semibold">{fmtMoney(spent, trip.home_currency)}</span>
            {trip.budget ? (
              <>
                <div className="h-2 max-w-xs flex-1 overflow-hidden rounded-full bg-cream-200">
                  <div className={`h-full rounded-full ${spent > trip.budget ? 'bg-red-500' : 'bg-lagoon'}`} style={{ width: `${budgetPct}%` }} />
                </div>
                <span className="text-ink-muted">จากงบ {fmtMoney(trip.budget, trip.home_currency)}</span>
              </>
            ) : (
              <span className="text-ink-muted">ใช้ไปทั้งหมด</span>
            )}
          </div>
          <nav className="-mb-px mt-3 hidden gap-1 sm:flex">
            {TABS.map((t) => (
              <Link key={t.key} to={`/trips/${trip.id}/${t.key}`}
                className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold transition ${tab === t.key ? 'border-ember text-ember' : 'border-transparent text-ink-muted hover:text-ink'}`}>
                <t.icon size={17} /> {t.label}
                {t.key === 'photos' && photos.length > 0 && <span className="chip bg-cream-200 text-ink-muted">{photos.filter((p) => p.kind === 'photo').length}</span>}
                {t.key === 'expenses' && expenses.length > 0 && <span className="chip bg-cream-200 text-ink-muted">{expenses.length}</span>}
              </Link>
            ))}
          </nav>
        </div>
      </div>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-24 pt-5 sm:pb-10">
        {tab === 'chat' && <ChatTab {...data} />}
        {tab === 'photos' && <PhotosTab {...data} />}
        {tab === 'expenses' && <ExpensesTab {...data} />}
        {tab === 'passport' && <PassportTab {...data} reload={load} />}
      </main>

      <nav className="no-print safe-bottom fixed inset-x-0 bottom-0 z-30 grid grid-cols-4 border-t border-cream-200 bg-white/95 backdrop-blur sm:hidden">
        {TABS.map((t) => (
          <Link key={t.key} to={`/trips/${trip.id}/${t.key}`} className={`flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium ${tab === t.key ? 'text-ember' : 'text-ink-muted'}`}>
            <t.icon size={21} /> {t.label}
          </Link>
        ))}
      </nav>

      <TripFormModal open={editing} onClose={() => setEditing(false)} trip={trip} onSaved={(t) => { setTrip(t); setEditing(false) }} />
    </div>
  )
}
