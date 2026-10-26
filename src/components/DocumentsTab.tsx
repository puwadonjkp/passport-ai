import { useMemo, useRef, useState, type FormEvent } from 'react'
import { BedDouble, CalendarCheck, ExternalLink, FileUp, Pencil, Plane, Plus, Trash2, Wallet, X } from 'lucide-react'
import { CURRENCIES } from '../lib/constants'
import { convert } from '../lib/currency'
import { deleteDocument, docDateRange, uploadDocument } from '../lib/documents'
import { fmtDate, fmtMoney, fmtRange, tripToday } from '../lib/format'
import { upsertRow } from '../lib/rows'
import { publicUrl, supabase } from '../lib/supabase'
import type { Expense, FlightInfo, HotelInfo, TravelDoc } from '../lib/types'
import type { TripData } from '../pages/TripPage'
import { Empty, Modal, Spinner } from './ui'

const EMPTY_FLIGHT: FlightInfo = { airline: null, flight_no: null, from_code: null, from_city: null, to_code: null, to_city: null, depart: null, arrive: null, seat: null, passenger: null, booking_ref: null }
const EMPTY_HOTEL: HotelInfo = { name: null, address: null, city: null, check_in: null, check_out: null, nights: null, booking_ref: null }

const time = (s: string | null) => (s && s.length >= 16 ? s.slice(11, 16) : '--:--')
const day = (s: string | null) => (s ? fmtDate(s.slice(0, 10)) : '')

export default function DocumentsTab({ trip, documents, setDocuments, setExpenses, setTrip, isOwner }: TripData) {
  const [busy, setBusy] = useState<string | null>(null)
  const [errors, setErrors] = useState<string[]>([])
  const [editing, setEditing] = useState<TravelDoc | 'flight' | 'hotel' | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const flights = useMemo(
    () => documents.flatMap((d) => (d.data.flights ?? []).map((f, i) => ({ f, doc: d, key: `${d.id}-${i}` })))
      .sort((a, b) => (a.f.depart ?? '9').localeCompare(b.f.depart ?? '9')),
    [documents],
  )
  const hotels = useMemo(() => documents.filter((d) => d.data.hotel).sort((a, b) => (a.data.hotel!.check_in ?? '9').localeCompare(b.data.hotel!.check_in ?? '9')), [documents])
  const others = documents.filter((d) => !(d.data.flights?.length) && !d.data.hotel)
  const range = docDateRange(documents)
  const dateMismatch = range && (range.start !== trip.start_date || range.end !== trip.end_date)

  async function handleFiles(list: FileList) {
    const files = [...list]
    setErrors([])
    for (let i = 0; i < files.length; i++) {
      setBusy(`AI กำลังอ่านเอกสาร ${i + 1}/${files.length}: ${files[i].name}`)
      try {
        const { doc, aiError } = await uploadDocument(trip, files[i])
        setDocuments((ds) => upsertRow(ds, doc))
        if (aiError) setErrors((e) => [...e, `${files[i].name}: ${aiError}`])
      } catch (e) {
        setErrors((er) => [...er, `${files[i].name}: ${(e as Error).message}`])
      }
    }
    setBusy(null)
    if (inputRef.current) inputRef.current.value = ''
  }

  async function syncDates() {
    if (!range) return
    const { data } = await supabase.from('trips').update({ start_date: range.start, end_date: range.end }).eq('id', trip.id).select().single()
    if (data) setTrip({ ...trip, start_date: range.start, end_date: range.end })
  }

  async function addAsExpense(doc: TravelDoc) {
    const price = doc.data.total_price
    if (!price) return
    const isHotel = Boolean(doc.data.hotel)
    const first = doc.data.flights?.[0]
    const description = isHotel
      ? `ที่พัก ${doc.data.hotel?.name ?? ''}`.trim()
      : `ตั๋วเครื่องบิน ${[first?.from_code, first?.to_code].filter(Boolean).join('-')}`.trim()
    const dateRaw = (isHotel ? doc.data.hotel?.check_in : first?.depart)?.slice(0, 10)
    const spentOn = dateRaw && dateRaw >= trip.start_date && dateRaw <= trip.end_date ? dateRaw : tripToday(trip.start_date, trip.end_date)
    const { rate, amountHome } = await convert(price.amount, price.currency, trip.home_currency)
    const { data, error } = await supabase.from('expenses').insert({
      trip_id: trip.id, description, category: isHotel ? 'accommodation' : 'transport', amount: price.amount, currency: price.currency,
      rate, amount_home: amountHome, spent_on: spentOn, source: 'manual',
    }).select().single()
    if (error) return alert(error.message)
    setExpenses((es) => upsertRow(es, data as Expense))
    const newData = { ...doc.data, expense_id: (data as Expense).id }
    await supabase.from('documents').update({ data: newData }).eq('id', doc.id)
    setDocuments((ds) => ds.map((d) => (d.id === doc.id ? { ...d, data: newData } : d)))
  }

  async function remove(doc: TravelDoc) {
    if (!confirm('ลบเอกสารนี้?')) return
    await deleteDocument(doc)
    setDocuments((ds) => ds.filter((d) => d.id !== doc.id))
  }

  const actions = (doc: TravelDoc) => (
    <div className="flex flex-wrap items-center gap-1">
      {doc.data.total_price && !doc.data.expense_id && (
        <button className="chip bg-ember-100 !px-2.5 !py-1 text-ember-600 hover:bg-ember hover:text-white" onClick={() => addAsExpense(doc)}>
          <Wallet size={13} /> บันทึก {fmtMoney(doc.data.total_price.amount, doc.data.total_price.currency)} เป็นรายจ่าย
        </button>
      )}
      {doc.data.expense_id && <span className="chip bg-lagoon-100 text-lagoon-600">✓ บันทึกเป็นรายจ่ายแล้ว</span>}
      {doc.storage_path && <a className="p-1.5 text-ink-muted hover:text-ink" href={publicUrl(doc.storage_path)} target="_blank" rel="noreferrer" title="ดูไฟล์ต้นฉบับ"><ExternalLink size={15} /></a>}
      <button className="p-1.5 text-ink-muted hover:text-ink" onClick={() => setEditing(doc)} title="แก้ไข"><Pencil size={15} /></button>
      <button className="p-1.5 text-ink-muted hover:text-red-600" onClick={() => remove(doc)} title="ลบ"><Trash2 size={15} /></button>
    </div>
  )

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto]">
        <button onClick={() => inputRef.current?.click()} disabled={Boolean(busy)}
          className="flex items-center gap-4 rounded-3xl border-2 border-dashed border-cream-300 bg-white p-5 text-left transition hover:border-ember disabled:opacity-60">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-ember-100 text-ember">{busy ? <Spinner /> : <FileUp />}</span>
          <span>
            <span className="block font-bold">{busy ?? 'อัปโหลด Boarding Pass / E-Ticket / ใบจองโรงแรม'}</span>
            <span className="block text-sm text-ink-muted">รูปหรือ PDF (ไม่เกิน 8 MB) · AI อ่านเที่ยวบิน เวลา ที่นั่ง ที่พัก และราคาให้อัตโนมัติ</span>
          </span>
        </button>
        <input ref={inputRef} type="file" multiple accept="image/*,.heic,.heif,application/pdf,.pdf" hidden onChange={(e) => e.target.files && handleFiles(e.target.files)} />
        <button className="btn-outline" onClick={() => setEditing('flight')}><Plus size={16} /> เที่ยวบิน</button>
        <button className="btn-outline" onClick={() => setEditing('hotel')}><Plus size={16} /> ที่พัก</button>
      </div>

      {errors.map((e) => <p key={e} className="rounded-xl bg-saffron-100 px-4 py-2.5 text-sm">⚠️ {e}</p>)}

      {dateMismatch && (
        <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-lagoon-100 p-4 text-sm">
          <CalendarCheck className="text-lagoon" />
          <span className="flex-1">ตามเอกสาร ทริปนี้คือ <b>{fmtRange(range!.start, range!.end)}</b> แต่ตั้งไว้ {fmtRange(trip.start_date, trip.end_date)}</span>
          {isOwner ? <button className="btn bg-lagoon !py-1.5 text-white" onClick={syncDates}>ปรับวันทริปตามเอกสาร</button> : <span className="text-xs text-ink-muted">(ให้เจ้าของทริปปรับได้)</span>}
        </div>
      )}

      {documents.length === 0 && !busy && (
        <Empty icon={<Plane size={28} />} title="ยังไม่มีตั๋วหรือการจองที่พัก" text="อัปโหลด Boarding Pass หรือ E-Itinerary (หลังเช็คอินแล้วไม่มีบอร์ดดิ้งพาสก็ใช้ E-Ticket แทนได้) และใบยืนยันการจองโรงแรม แล้วข้อมูลจะไปโผล่ใน Passport ด้วย" />
      )}

      {flights.length > 0 && (
        <section>
          <h3 className="mb-3 flex items-center gap-2 text-lg font-bold"><Plane size={20} className="text-ember" /> เที่ยวบิน ({flights.length})</h3>
          <div className="grid gap-4 lg:grid-cols-2">
            {flights.map(({ f, doc, key }) => (
              <div key={key}>
                <BoardingPass f={f} />
                <div className="mt-1.5 flex justify-end">{actions(doc)}</div>
              </div>
            ))}
          </div>
        </section>
      )}

      {hotels.length > 0 && (
        <section>
          <h3 className="mb-3 flex items-center gap-2 text-lg font-bold"><BedDouble size={20} className="text-lagoon" /> ที่พัก ({hotels.length})</h3>
          <div className="grid gap-4 lg:grid-cols-2">
            {hotels.map((doc) => (
              <div key={doc.id}>
                <HotelCard h={doc.data.hotel!} />
                <div className="mt-1.5 flex justify-end">{actions(doc)}</div>
              </div>
            ))}
          </div>
        </section>
      )}

      {others.length > 0 && (
        <section>
          <h3 className="mb-3 text-lg font-bold">เอกสารอื่นๆ</h3>
          <ul className="space-y-2">
            {others.map((doc) => (
              <li key={doc.id} className="card flex flex-wrap items-center gap-3 p-4">
                <FileUp size={18} className="text-ink-muted" />
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium">{doc.original_name ?? 'เอกสาร'}</div>
                  <div className="text-xs text-ink-muted">{doc.data.summary || 'ระบบยังแยกไม่ได้ว่าเป็นตั๋วหรือที่พัก — กดแก้ไขเพื่อกรอกเอง'}</div>
                </div>
                {actions(doc)}
              </li>
            ))}
          </ul>
        </section>
      )}

      {editing && (
        <DocEditModal
          key={typeof editing === 'string' ? editing : editing.id}
          trip={trip}
          doc={typeof editing === 'string' ? null : editing}
          initialKind={typeof editing === 'string' ? editing : editing.data.hotel ? 'hotel' : 'flight'}
          onClose={() => setEditing(null)}
          onSaved={(d) => { setDocuments((ds) => upsertRow(ds, d)); setEditing(null) }}
        />
      )}
    </div>
  )
}

export function BoardingPass({ f, compact = false }: { f: FlightInfo; compact?: boolean }) {
  return (
    <div className="relative flex overflow-hidden rounded-2xl bg-white shadow-card ring-1 ring-cream-200">
      <div className="min-w-0 flex-1 p-3 sm:p-5">
        <div className="flex items-center justify-between text-xs text-ink-muted">
          <span className="font-semibold uppercase tracking-wider">{f.airline ?? 'Boarding Pass'}</span>
          <span className="font-mono font-bold text-ink">{f.flight_no ?? ''}</span>
        </div>
        <div className="mt-3 flex items-center gap-3">
          <div className="min-w-0">
            <div className="font-mono text-2xl font-bold leading-none text-espresso sm:text-3xl">{f.from_code ?? '???'}</div>
            <div className="truncate text-xs text-ink-muted">{f.from_city ?? ''}</div>
          </div>
          <div className="relative flex-1">
            <div className="dotted-route h-[2px] w-full" />
            <Plane size={18} className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rotate-45 text-ember" />
          </div>
          <div className="min-w-0 text-right">
            <div className="font-mono text-2xl font-bold leading-none text-espresso sm:text-3xl">{f.to_code ?? '???'}</div>
            <div className="truncate text-xs text-ink-muted">{f.to_city ?? ''}</div>
          </div>
        </div>
        <div className="mt-3 flex justify-between gap-2 text-xs sm:text-sm">
          <span><b>{time(f.depart)}</b> <span className="text-ink-muted">{day(f.depart)}</span></span>
          <span><b>{time(f.arrive)}</b> <span className="text-ink-muted">{day(f.arrive)}</span></span>
        </div>
      </div>
      {!compact && (
        <div className="relative w-24 shrink-0 border-l-2 border-dashed border-cream-300 bg-ember p-3 text-white sm:w-32 sm:p-4">
          <span className="absolute -left-[9px] -top-2 h-4 w-4 rounded-full bg-cream" />
          <span className="absolute -bottom-2 -left-[9px] h-4 w-4 rounded-full bg-cream" />
          <div className="text-[10px] uppercase tracking-wider text-white/70">Seat</div>
          <div className="font-mono text-xl font-bold">{f.seat ?? '—'}</div>
          <div className="mt-2 text-[10px] uppercase tracking-wider text-white/70">Ref</div>
          <div className="truncate font-mono text-sm font-bold">{f.booking_ref ?? '—'}</div>
          {f.passenger && <div className="mt-2 truncate text-[10px] text-white/80">{f.passenger}</div>}
        </div>
      )}
    </div>
  )
}

export function HotelCard({ h }: { h: HotelInfo }) {
  const nights = h.nights ?? (h.check_in && h.check_out ? Math.round((new Date(h.check_out).getTime() - new Date(h.check_in).getTime()) / 86400000) : null)
  return (
    <div className="flex overflow-hidden rounded-2xl bg-white shadow-card ring-1 ring-cream-200">
      <div className="grid w-20 shrink-0 place-items-center bg-lagoon text-white"><BedDouble size={30} /></div>
      <div className="min-w-0 flex-1 p-4">
        <div className="truncate font-display text-lg font-bold">{h.name ?? 'ที่พัก'}</div>
        <div className="truncate text-xs text-ink-muted">{[h.city, h.address].filter(Boolean).join(' · ') || '—'}</div>
        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm">
          <span><span className="text-ink-muted">เช็คอิน</span> <b>{h.check_in ? fmtDate(h.check_in) : '—'}</b></span>
          <span><span className="text-ink-muted">เช็คเอาท์</span> <b>{h.check_out ? fmtDate(h.check_out) : '—'}</b></span>
          {nights != null && nights > 0 && <span className="chip bg-lagoon-100 text-lagoon-600">{nights} คืน</span>}
        </div>
        {h.booking_ref && <div className="mt-1 font-mono text-xs text-ink-muted">Ref: {h.booking_ref}</div>}
      </div>
    </div>
  )
}

function DocEditModal({ trip, doc, initialKind, onClose, onSaved }: {
  trip: TripData['trip']; doc: TravelDoc | null; initialKind: 'flight' | 'hotel'; onClose: () => void; onSaved: (d: TravelDoc) => void
}) {
  const [kind, setKind] = useState<'flight' | 'hotel'>(initialKind)
  const [flights, setFlights] = useState<FlightInfo[]>(doc?.data.flights?.length ? doc.data.flights : [{ ...EMPTY_FLIGHT }])
  const [hotel, setHotel] = useState<HotelInfo>(doc?.data.hotel ?? { ...EMPTY_HOTEL })
  const [price, setPrice] = useState({ amount: doc?.data.total_price ? String(doc.data.total_price.amount) : '', currency: doc?.data.total_price?.currency ?? trip.home_currency })
  const [busy, setBusy] = useState(false)

  const setF = (i: number, k: keyof FlightInfo, v: string) => setFlights((fs) => fs.map((f, j) => (j === i ? { ...f, [k]: v || null } : f)))
  const setH = (k: keyof HotelInfo, v: string) => setHotel((h) => ({ ...h, [k]: v || null }))

  async function submit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    const data: TravelDoc['data'] = {
      ...(doc?.data ?? {}),
      flights: kind === 'flight' ? flights.map((f) => ({ ...f, from_code: f.from_code?.toUpperCase() ?? null, to_code: f.to_code?.toUpperCase() ?? null })) : [],
      hotel: kind === 'hotel' ? hotel : null,
      total_price: price.amount ? { amount: Number(price.amount), currency: price.currency } : null,
    }
    const q = doc
      ? supabase.from('documents').update({ kind, data }).eq('id', doc.id)
      : supabase.from('documents').insert({ trip_id: trip.id, kind, data, original_name: kind === 'flight' ? 'กรอกเอง: เที่ยวบิน' : 'กรอกเอง: ที่พัก' })
    const { data: row, error } = await q.select().single()
    setBusy(false)
    if (error) return alert(error.message)
    onSaved(row as TravelDoc)
  }

  const field = (label: string, value: string | null, on: (v: string) => void, type = 'text', placeholder = '') => (
    <div>
      <label className="label">{label}</label>
      <input className="input !py-2" type={type} value={value ?? ''} placeholder={placeholder} onChange={(e) => on(e.target.value)} />
    </div>
  )

  return (
    <Modal open onClose={onClose} title={doc ? 'แก้ไขข้อมูลเอกสาร' : kind === 'flight' ? 'เพิ่มเที่ยวบิน' : 'เพิ่มที่พัก'} wide>
      <form onSubmit={submit} className="space-y-5">
        <div className="flex gap-2">
          {(['flight', 'hotel'] as const).map((k) => (
            <button type="button" key={k} onClick={() => setKind(k)} className={`chip !px-4 !py-2 text-sm ring-1 ${kind === k ? 'bg-espresso text-cream ring-espresso' : 'bg-white ring-cream-300'}`}>
              {k === 'flight' ? '✈️ เที่ยวบิน' : '🏨 ที่พัก'}
            </button>
          ))}
        </div>

        {kind === 'flight' ? (
          <div className="space-y-4">
            {flights.map((f, i) => (
              <div key={i} className="relative rounded-2xl bg-white p-4 ring-1 ring-cream-200">
                {flights.length > 1 && <button type="button" className="absolute right-3 top-3 text-ink-muted hover:text-red-600" onClick={() => setFlights((fs) => fs.filter((_, j) => j !== i))}><X size={16} /></button>}
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {field('สายการบิน', f.airline, (v) => setF(i, 'airline', v), 'text', 'Thai Airways')}
                  {field('เที่ยวบิน', f.flight_no, (v) => setF(i, 'flight_no', v), 'text', 'TG622')}
                  {field('ที่นั่ง', f.seat, (v) => setF(i, 'seat', v), 'text', '32A')}
                  {field('รหัสการจอง', f.booking_ref, (v) => setF(i, 'booking_ref', v))}
                  {field('จาก (IATA)', f.from_code, (v) => setF(i, 'from_code', v), 'text', 'BKK')}
                  {field('เมืองต้นทาง', f.from_city, (v) => setF(i, 'from_city', v), 'text', 'กรุงเทพ')}
                  {field('ถึง (IATA)', f.to_code, (v) => setF(i, 'to_code', v), 'text', 'KIX')}
                  {field('เมืองปลายทาง', f.to_city, (v) => setF(i, 'to_city', v), 'text', 'โอซาก้า')}
                  <div className="col-span-2">{field('ออกเดินทาง', f.depart?.slice(0, 16) ?? null, (v) => setF(i, 'depart', v), 'datetime-local')}</div>
                  <div className="col-span-2">{field('ถึงปลายทาง', f.arrive?.slice(0, 16) ?? null, (v) => setF(i, 'arrive', v), 'datetime-local')}</div>
                </div>
              </div>
            ))}
            <button type="button" className="btn-ghost" onClick={() => setFlights((fs) => [...fs, { ...EMPTY_FLIGHT }])}><Plus size={16} /> เพิ่มเที่ยวบินในเอกสารนี้ (ขากลับ/ต่อเครื่อง)</button>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">{field('ชื่อที่พัก', hotel.name, (v) => setH('name', v), 'text', 'Hotel Gracery Kyoto')}</div>
            {field('เมือง', hotel.city, (v) => setH('city', v), 'text', 'เกียวโต')}
            {field('รหัสการจอง', hotel.booking_ref, (v) => setH('booking_ref', v))}
            <div className="sm:col-span-2">{field('ที่อยู่', hotel.address, (v) => setH('address', v))}</div>
            {field('เช็คอิน', hotel.check_in, (v) => setH('check_in', v), 'date')}
            {field('เช็คเอาท์', hotel.check_out, (v) => setH('check_out', v), 'date')}
          </div>
        )}

        <div className="grid grid-cols-[1fr_110px] gap-3">
          {field('ราคารวม (ไม่บังคับ)', price.amount, (v) => setPrice((p) => ({ ...p, amount: v })), 'number')}
          <div>
            <label className="label">สกุลเงิน</label>
            <select className="input !py-2" value={price.currency} onChange={(e) => setPrice((p) => ({ ...p, currency: e.target.value }))}>
              {[...new Set([price.currency, ...CURRENCIES])].map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <button type="button" className="btn-ghost" onClick={onClose}>ยกเลิก</button>
          <button className="btn-primary" disabled={busy}>{busy && <Spinner />} บันทึก</button>
        </div>
      </form>
    </Modal>
  )
}
