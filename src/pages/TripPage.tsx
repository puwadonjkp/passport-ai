import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, BookOpen, FileText, Images, LogOut, MessageCircle, Pencil, Trash2, UserPlus, Wallet } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { COMPANIONS } from '../lib/constants'
import { dayNumber, fmtMoney, fmtRange, todayISO } from '../lib/format'
import { deleteTripFolder } from '../lib/photos'
import type { Expense, Member, Message, PassportRow, Photo, TravelDoc, Trip } from '../lib/types'
import { useAuth } from '../context/AuthContext'
import { FullScreenLoader, TopBar } from '../components/ui'
import TripFormModal from '../components/TripFormModal'
import ChatTab from '../components/ChatTab'
import PhotosTab from '../components/PhotosTab'
import ExpensesTab from '../components/ExpensesTab'
import PassportTab from '../components/PassportTab'
import DocumentsTab from '../components/DocumentsTab'
import MembersModal, { Avatar } from '../components/MembersModal'

const TABS = [
  { key: 'chat', label: 'แชท', icon: MessageCircle },
  { key: 'photos', label: 'คลังรูป', icon: Images },
  { key: 'docs', label: 'ตั๋ว/ที่พัก', icon: FileText },
  { key: 'expenses', label: 'ค่าใช้จ่าย', icon: Wallet },
  { key: 'passport', label: 'Passport', icon: BookOpen },
] as const

export type TripData = {
  trip: Trip
  photos: Photo[]
  expenses: Expense[]
  messages: Message[]
  documents: TravelDoc[]
  members: Member[]
  passport: PassportRow | null
  me: string
  isOwner: boolean
  setTrip: (t: Trip) => void
  setPhotos: React.Dispatch<React.SetStateAction<Photo[]>>
  setExpenses: React.Dispatch<React.SetStateAction<Expense[]>>
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>
  setDocuments: React.Dispatch<React.SetStateAction<TravelDoc[]>>
  setMembers: React.Dispatch<React.SetStateAction<Member[]>>
  setPassport: (p: PassportRow | null) => void
}

type Row = { id: string }
/** รวมแถวใหม่จาก realtime เข้ากับ state (กันซ้ำกับแถวที่เพิ่ง insert เอง) */
function upsertRow<T extends Row>(list: T[], row: T) {
  const i = list.findIndex((x) => x.id === row.id)
  if (i === -1) return [...list, row]
  const copy = [...list]
  copy[i] = row
  return copy
}

export default function TripPage() {
  const { tripId, tab = 'chat' } = useParams()
  const nav = useNavigate()
  const { session } = useAuth()
  const me = session?.user.id ?? ''
  const [trip, setTrip] = useState<Trip | null>(null)
  const [photos, setPhotos] = useState<Photo[]>([])
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [messages, setMessages] = useState<Message[]>([])
  const [documents, setDocuments] = useState<TravelDoc[]>([])
  const [members, setMembers] = useState<Member[]>([])
  const [passport, setPassport] = useState<PassportRow | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [editing, setEditing] = useState(false)
  const [sharing, setSharing] = useState(false)

  const load = useCallback(async () => {
    const [t, p, e, m, pp, d, mem] = await Promise.all([
      supabase.from('trips').select('*').eq('id', tripId).maybeSingle(),
      supabase.from('photos').select('*').eq('trip_id', tripId).order('taken_at', { ascending: true, nullsFirst: false }),
      supabase.from('expenses').select('*').eq('trip_id', tripId).order('spent_on').order('created_at'),
      supabase.from('messages').select('*').eq('trip_id', tripId).order('created_at'),
      supabase.from('passports').select('*').eq('trip_id', tripId).maybeSingle(),
      supabase.from('documents').select('*').eq('trip_id', tripId).order('created_at'),
      supabase.from('trip_members').select('*').eq('trip_id', tripId).order('joined_at'),
    ])
    if (!t.data) return setNotFound(true)
    setTrip(t.data as Trip)
    setPhotos((p.data as Photo[]) ?? [])
    setExpenses((e.data as Expense[]) ?? [])
    setMessages((m.data as Message[]) ?? [])
    setPassport((pp.data as PassportRow) ?? null)
    setDocuments((d.data as TravelDoc[]) ?? [])
    setMembers((mem.data as Member[]) ?? [])
  }, [tripId])

  useEffect(() => {
    load()
  }, [load])

  // Realtime: เพื่อนในทริปพิมพ์แชท/จดรายจ่าย/อัปรูป จะเห็นทันทีโดยไม่ต้องรีเฟรช
  useEffect(() => {
    if (!tripId) return
    const filter = `trip_id=eq.${tripId}`
    const bind = <T extends Row>(table: string, set: React.Dispatch<React.SetStateAction<T[]>>) => (ch: ReturnType<typeof supabase.channel>) =>
      ch.on('postgres_changes', { event: '*', schema: 'public', table, filter }, (payload) => {
        if (payload.eventType === 'DELETE') set((l) => l.filter((x) => x.id !== (payload.old as Row).id))
        else set((l) => upsertRow(l, payload.new as T))
      })
    let ch = supabase.channel(`trip-${tripId}`)
    ch = bind<Message>('messages', setMessages)(ch)
    ch = bind<Expense>('expenses', setExpenses)(ch)
    ch = bind<Photo>('photos', setPhotos)(ch)
    ch = bind<TravelDoc>('documents', setDocuments)(ch)
    ch.on('postgres_changes', { event: '*', schema: 'public', table: 'trip_members', filter }, () => {
      supabase.from('trip_members').select('*').eq('trip_id', tripId).order('joined_at').then(({ data }) => data && setMembers(data as Member[]))
    })
    ch.subscribe()
    return () => {
      supabase.removeChannel(ch)
    }
  }, [tripId])

  const spent = useMemo(() => expenses.reduce((s, e) => s + Number(e.amount_home), 0), [expenses])

  if (notFound)
    return (
      <div className="grid min-h-screen place-items-center p-6 text-center">
        <div>
          <p className="text-lg font-bold">ไม่พบทริปนี้ หรือคุณไม่ได้เป็นสมาชิกทริปนี้</p>
          <Link to="/trips" className="btn-primary mt-4">กลับหน้าทริปของฉัน</Link>
        </div>
      </div>
    )
  if (!trip) return <FullScreenLoader />

  const isOwner = trip.user_id === me
  const data: TripData = {
    trip, photos, expenses, messages, documents, members, passport, me, isOwner,
    setTrip, setPhotos, setExpenses, setMessages, setDocuments, setMembers, setPassport,
  }
  const today = todayISO()
  const dayNow = trip.start_date <= today && today <= trip.end_date ? dayNumber(trip.start_date, today) : null
  const totalDays = dayNumber(trip.start_date, trip.end_date)!
  const budgetPct = trip.budget ? Math.min(100, (spent / trip.budget) * 100) : 0

  async function removeTrip() {
    if (!trip || !confirm(`ลบทริป "${trip.name}" พร้อมรูป แชท และรายจ่ายทั้งหมด? (กู้คืนไม่ได้ และสมาชิกทุกคนจะเห็นทริปนี้หายไป)`)) return
    await deleteTripFolder(trip)
    await supabase.from('trips').delete().eq('id', trip.id)
    nav('/trips')
  }

  async function leaveTrip() {
    if (!trip || !confirm(`ออกจากทริป "${trip.name}"? (ต้องให้เจ้าของส่งลิงก์ชวนใหม่ถึงจะกลับเข้ามาได้)`)) return
    await supabase.from('trip_members').delete().eq('trip_id', trip.id).eq('user_id', me)
    nav('/trips')
  }

  return (
    <div className="flex min-h-screen flex-col">
      <TopBar />
      <div className="no-print border-b border-cream-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 pt-4">
          <div className="flex items-start gap-2">
            <Link to="/trips" className="btn-ghost mt-0.5 !p-2" aria-label="กลับ"><ArrowLeft size={20} /></Link>
            <div className="min-w-0 flex-1">
              <h1 className="truncate text-2xl font-bold">{trip.name}</h1>
              <p className="truncate text-sm text-ink-muted">
                {trip.destination && <>{trip.destination} · </>}
                {fmtRange(trip.start_date, trip.end_date)} · {totalDays} วัน · {(COMPANIONS[trip.companion] ?? COMPANIONS.friends).emoji}{' '}
                {dayNow && <span className="font-semibold text-ember">· วันนี้ Day {dayNow}</span>}
              </p>
            </div>
            <button onClick={() => setSharing(true)} className="flex items-center gap-1 rounded-full py-1 pl-1 pr-3 ring-1 ring-cream-300 hover:ring-ember" title="สมาชิกทริป / ชวนเพื่อน">
              <div className="flex -space-x-2">
                {members.slice(0, 3).map((m) => <Avatar key={m.user_id} name={m.display_name} size={28} ring />)}
              </div>
              <UserPlus size={16} className="ml-1 text-ember" />
              <span className="hidden text-sm font-medium sm:inline">{members.length > 1 ? `${members.length} คน` : 'ชวนเพื่อน'}</span>
            </button>
            {isOwner ? (
              <>
                <button className="btn-ghost !p-2" title="แก้ไขทริป" onClick={() => setEditing(true)}><Pencil size={18} /></button>
                <button className="btn-ghost !p-2 text-red-600" title="ลบทริป" onClick={removeTrip}><Trash2 size={18} /></button>
              </>
            ) : (
              <button className="btn-ghost !p-2 text-red-600" title="ออกจากทริป" onClick={leaveTrip}><LogOut size={18} /></button>
            )}
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
                {t.key === 'docs' && documents.length > 0 && <span className="chip bg-cream-200 text-ink-muted">{documents.length}</span>}
                {t.key === 'expenses' && expenses.length > 0 && <span className="chip bg-cream-200 text-ink-muted">{expenses.length}</span>}
              </Link>
            ))}
          </nav>
        </div>
      </div>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-24 pt-5 sm:pb-10">
        {tab === 'chat' && <ChatTab {...data} />}
        {tab === 'photos' && <PhotosTab {...data} />}
        {tab === 'docs' && <DocumentsTab {...data} />}
        {tab === 'expenses' && <ExpensesTab {...data} />}
        {tab === 'passport' && <PassportTab {...data} reload={load} />}
      </main>

      <nav className="no-print safe-bottom fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-cream-200 bg-white/95 backdrop-blur sm:hidden">
        {TABS.map((t) => (
          <Link key={t.key} to={`/trips/${trip.id}/${t.key}`} className={`flex flex-col items-center gap-0.5 py-2.5 text-[10.5px] font-medium ${tab === t.key ? 'text-ember' : 'text-ink-muted'}`}>
            <t.icon size={20} /> {t.label}
          </Link>
        ))}
      </nav>

      <TripFormModal open={editing} onClose={() => setEditing(false)} trip={trip} onSaved={(t) => { setTrip(t); setEditing(false) }} />
      <MembersModal open={sharing} onClose={() => setSharing(false)} {...data} />
    </div>
  )
}
