import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { Camera, ImagePlus, Receipt, SendHorizontal, Sparkles, WifiOff, X } from 'lucide-react'
import { AIUnavailable, callAI } from '../lib/ai'
import { CATEGORIES } from '../lib/constants'
import { convert } from '../lib/currency'
import { parseExpensesOffline } from '../lib/expenseParser'
import { dayNumber, fmtMoney, fmtTime, tripToday } from '../lib/format'
import { imageForAI, prepareImage } from '../lib/image'
import { uploadPhoto } from '../lib/photos'
import { publicUrl, supabase } from '../lib/supabase'
import type { Category, Expense, ExtractedExpense, Message } from '../lib/types'
import type { TripData } from '../pages/TripPage'
import { Spinner } from './ui'

interface ChatAIResult {
  reply: string
  expenses: ExtractedExpense[]
  memory: string | null
  image_is_receipt: boolean
}

const SUGGESTIONS = ['ราเมง 2 ชาม 1,800 เยน', 'ค่าแท็กซี่ไปโรงแรม 350 บาท', 'วันนี้ใช้ไปเท่าไหร่แล้ว?', 'เดินเล่นศาลเจ้าฟูชิมิ วิวสวยมาก ⛩️']

export default function ChatTab({ trip, photos, expenses, messages, setMessages, setExpenses, setPhotos }: TripData) {
  const [text, setText] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string>('')
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState('')
  const endRef = useRef<HTMLDivElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const camRef = useRef<HTMLInputElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const today = tripToday(trip.start_date, trip.end_date)
  const photoById = useMemo(() => new Map(photos.map((p) => [p.id, p])), [photos])
  const expenseById = useMemo(() => new Map(expenses.map((e) => [e.id, e])), [expenses])
  const totals = useMemo(() => {
    const byCategory: Partial<Record<Category, number>> = {}
    let total = 0
    let todayTotal = 0
    for (const e of expenses) {
      const v = Number(e.amount_home)
      total += v
      if (e.spent_on === today) todayTotal += v
      byCategory[e.category] = (byCategory[e.category] ?? 0) + v
    }
    return { total, todayTotal, byCategory }
  }, [expenses, today])

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length, busy])

  useEffect(() => {
    if (!file) return setPreview('')
    const u = URL.createObjectURL(file)
    setPreview(u)
    return () => URL.revokeObjectURL(u)
  }, [file])

  function offlineAnswer(msg: string, items: ExtractedExpense[]): ChatAIResult {
    const cur = trip.home_currency
    if (!items.length && /(เท่าไหร่|เท่าไร|สรุป|ยอด|งบ|total|how much)/i.test(msg)) {
      const top = Object.entries(totals.byCategory).sort((a, b) => b[1] - a[1])[0]
      return {
        reply: `ตอนนี้ใช้ไปทั้งหมด ${fmtMoney(totals.total, cur)} 💸 วันนี้ ${fmtMoney(totals.todayTotal, cur)}` +
          (top ? ` หมวดที่จ่ายเยอะสุดคือ${CATEGORIES[top[0] as Category].label}` : '') +
          (trip.budget ? ` (เหลืองบอีก ${fmtMoney(trip.budget - totals.total, cur)})` : ''),
        expenses: [], memory: null, image_is_receipt: false,
      }
    }
    if (items.length) return { reply: `จดให้แล้ว ${items.length} รายการ ✅`, expenses: items, memory: null, image_is_receipt: false }
    if (msg.trim().length > 3) return { reply: 'จดไว้ในบันทึกความทรงจำแล้วน้า 📝 เดี๋ยวตอนจบทริปจะเอาไปเล่าใน Passport ให้', expenses: [], memory: msg.trim(), image_is_receipt: false }
    return { reply: 'ได้รับรูปแล้ว 📸 เก็บเข้าคลังรูปของทริปให้แล้วน้า', expenses: [], memory: null, image_is_receipt: false }
  }

  async function send(e?: FormEvent, preset?: string) {
    e?.preventDefault()
    const msg = (preset ?? text).trim()
    if ((!msg && !file) || busy) return
    setBusy(true)
    setText('')
    const attached = file
    setFile(null)
    try {
      // 1) อัปโหลดรูป (ถ้ามี) เข้าโฟลเดอร์ของทริป
      let photoId: string | null = null
      let aiImage: { base64: string; mime: string } | undefined
      if (attached) {
        setStatus('กำลังอัปโหลดรูป...')
        const prepared = await prepareImage(attached)
        const photo = await uploadPhoto(trip, attached, 'photo', prepared)
        photoId = photo.id
        setPhotos((ps) => [...ps, photo])
        aiImage = await imageForAI(prepared.full)
      }

      // 2) บันทึกข้อความของผู้ใช้
      const { data: userMsg, error } = await supabase
        .from('messages').insert({ trip_id: trip.id, role: 'user', content: msg, photo_id: photoId }).select().single()
      if (error) throw error
      setMessages((m) => [...m, userMsg as Message])

      // 3) ให้ AI อ่าน (ถ้าไม่มี AI ใช้ตัวแยกแบบออฟไลน์)
      setStatus('น้องพาสกำลังอ่าน...')
      let result: ChatAIResult
      let mode: 'ai' | 'offline' = 'ai'
      try {
        result = await callAI<ChatAIResult>('chat', {
          message: msg,
          image: aiImage,
          history: messages.slice(-10).map((m) => ({ role: m.role, content: m.content })),
          context: {
            tripName: trip.name, destination: trip.destination, startDate: trip.start_date, endDate: trip.end_date, today,
            homeCurrency: trip.home_currency, budget: trip.budget, spentTotal: Math.round(totals.total), spentToday: Math.round(totals.todayTotal),
            byCategory: Object.fromEntries(Object.entries(totals.byCategory).map(([k, v]) => [k, Math.round(v)])),
          },
        })
      } catch (err) {
        if (!(err instanceof AIUnavailable)) throw err
        mode = 'offline'
        result = offlineAnswer(msg, parseExpensesOffline(msg, today, trip.home_currency))
      }

      if (photoId && result.image_is_receipt) {
        await supabase.from('photos').update({ kind: 'receipt' }).eq('id', photoId)
        setPhotos((ps) => ps.map((p) => (p.id === photoId ? { ...p, kind: 'receipt' } : p)))
      }

      // 4) แปลงสกุลเงิน + บันทึกรายจ่าย
      const rows = []
      for (const x of result.expenses) {
        setStatus(`กำลังแปลงสกุลเงิน ${x.currency} → ${trip.home_currency}...`)
        const { rate, amountHome } = await convert(x.amount, x.currency, trip.home_currency)
        const spentOn = x.date >= trip.start_date && x.date <= trip.end_date ? x.date : today
        rows.push({
          trip_id: trip.id, message_id: userMsg.id, description: x.description, category: x.category,
          amount: x.amount, currency: x.currency, rate, amount_home: amountHome, spent_on: spentOn,
          source: result.image_is_receipt ? 'receipt' : 'chat',
        })
      }
      let inserted: Expense[] = []
      if (rows.length) {
        const { data, error } = await supabase.from('expenses').insert(rows).select()
        if (error) throw error
        inserted = data as Expense[]
        setExpenses((es) => [...es, ...inserted])
      }

      // 5) ข้อความตอบกลับ
      const { data: botMsg, error: e2 } = await supabase
        .from('messages')
        .insert({ trip_id: trip.id, role: 'assistant', content: result.reply, meta: { memory: result.memory, expense_ids: inserted.map((x) => x.id), mode } })
        .select().single()
      if (e2) throw e2
      setMessages((m) => [...m, botMsg as Message])
    } catch (err) {
      setText(msg)
      alert(`ส่งไม่สำเร็จ: ${(err as Error).message}`)
    } finally {
      setBusy(false)
      setStatus('')
      inputRef.current?.focus()
    }
  }

  async function removeExpense(id: string) {
    if (!confirm('ลบรายจ่ายนี้?')) return
    await supabase.from('expenses').delete().eq('id', id)
    setExpenses((es) => es.filter((e) => e.id !== id))
  }

  const offline = messages.some((m) => m.meta?.mode === 'offline') && !messages.slice(-4).some((m) => m.meta?.mode === 'ai')

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_300px]">
      <section className="card flex h-[calc(100dvh-270px)] min-h-[420px] flex-col overflow-hidden sm:h-[calc(100dvh-250px)]">
        <div className="flex-1 space-y-4 overflow-y-auto bg-[linear-gradient(180deg,#FBF9F5,#F6F1E8)] p-4 sm:p-6">
          {messages.length === 0 && (
            <div className="mx-auto max-w-md py-8 text-center animate-fade-up">
              <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-ember text-3xl shadow-lg">🛂</div>
              <h3 className="mt-4 text-xl font-bold">สวัสดี! เราคือน้องพาส</h3>
              <p className="mt-2 text-sm text-ink-muted">
                พิมพ์บอกได้เลยว่าจ่ายอะไรไปเท่าไหร่ ใช้สกุลเงินไหนก็ได้ หรือถ่ายรูปใบเสร็จส่งมา
                เล่าเรื่องสนุกๆ ระหว่างทางก็ได้นะ เดี๋ยวตอนจบทริปจะเอาไปทำ Passport ให้ ✨
              </p>
              <div className="mt-5 flex flex-wrap justify-center gap-2">
                {SUGGESTIONS.map((s) => (
                  <button key={s} className="chip bg-white !px-3 !py-1.5 text-sm ring-1 ring-cream-300 hover:ring-ember" onClick={() => send(undefined, s)}>{s}</button>
                ))}
              </div>
            </div>
          )}

          {messages.map((m) => {
            const photo = m.photo_id ? photoById.get(m.photo_id) : null
            const items = (m.meta?.expense_ids ?? []).map((id) => expenseById.get(id)).filter(Boolean) as Expense[]
            const mine = m.role === 'user'
            return (
              <div key={m.id} className={`flex gap-2.5 animate-fade-up ${mine ? 'justify-end' : ''}`}>
                {!mine && <div className="mt-1 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-ember text-sm">🛂</div>}
                <div className={`max-w-[85%] sm:max-w-[70%] ${mine ? 'items-end' : ''} flex flex-col gap-1.5`}>
                  {photo && (
                    <a href={publicUrl(photo.storage_path)} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-2xl ring-1 ring-cream-300">
                      <img src={publicUrl(photo.thumb_path || photo.storage_path)} alt="" className="max-h-60 w-full object-cover" />
                    </a>
                  )}
                  {m.content && (
                    <div className={`whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-[15px] leading-relaxed ${mine ? 'rounded-br-md bg-espresso text-cream' : 'rounded-bl-md bg-white shadow-card'}`}>
                      {m.content}
                    </div>
                  )}
                  {items.length > 0 && (
                    <div className="space-y-1.5">
                      {items.map((x) => (
                        <div key={x.id} className="group flex items-center gap-3 rounded-xl border border-cream-200 bg-white px-3 py-2 text-sm">
                          <span className="grid h-8 w-8 place-items-center rounded-lg text-base" style={{ background: CATEGORIES[x.category].color + '1f' }}>{CATEGORIES[x.category].emoji}</span>
                          <div className="min-w-0 flex-1">
                            <div className="truncate font-medium">{x.description}</div>
                            <div className="text-xs text-ink-muted">{CATEGORIES[x.category].label} · Day {dayNumber(trip.start_date, x.spent_on)}{x.source === 'receipt' && ' · 🧾 ใบเสร็จ'}</div>
                          </div>
                          <div className="text-right">
                            <div className="font-semibold">{fmtMoney(Number(x.amount), x.currency, x.amount % 1 ? 2 : 0)}</div>
                            {x.currency !== trip.home_currency && <div className="text-xs text-ink-muted">≈ {fmtMoney(Number(x.amount_home), trip.home_currency)}</div>}
                          </div>
                          <button onClick={() => removeExpense(x.id)} className="text-ink-muted opacity-60 hover:text-red-600 group-hover:opacity-100" title="ลบ"><X size={16} /></button>
                        </div>
                      ))}
                    </div>
                  )}
                  {m.meta?.memory && !mine && <div className="chip self-start bg-lagoon-100 text-lagoon-600">📝 เก็บเป็นความทรงจำ: {m.meta.memory.slice(0, 60)}{m.meta.memory.length > 60 ? '…' : ''}</div>}
                  <span className={`text-[11px] text-ink-muted ${mine ? 'text-right' : ''}`}>{fmtTime(m.created_at)}</span>
                </div>
              </div>
            )
          })}
          {busy && (
            <div className="flex items-center gap-2.5">
              <div className="grid h-8 w-8 place-items-center rounded-full bg-ember text-sm">🛂</div>
              <div className="flex items-center gap-2 rounded-2xl rounded-bl-md bg-white px-4 py-2.5 text-sm text-ink-muted shadow-card"><Spinner size={14} /> {status}</div>
            </div>
          )}
          <div ref={endRef} />
        </div>

        <form onSubmit={send} className="border-t border-cream-200 bg-white p-3">
          {preview && (
            <div className="relative mb-2 inline-block">
              <img src={preview} alt="" className="h-20 rounded-xl object-cover ring-1 ring-cream-300" />
              <button type="button" onClick={() => setFile(null)} className="absolute -right-2 -top-2 grid h-6 w-6 place-items-center rounded-full bg-espresso text-white"><X size={14} /></button>
            </div>
          )}
          <div className="flex items-end gap-2">
            <input ref={fileRef} type="file" accept="image/*,.heic,.heif" hidden onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            <input ref={camRef} type="file" accept="image/*" capture="environment" hidden onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            <button type="button" className="btn-ghost !p-2.5" title="แนบรูป / ใบเสร็จ" onClick={() => fileRef.current?.click()}><ImagePlus size={20} /></button>
            <button type="button" className="btn-ghost !p-2.5 sm:hidden" title="ถ่ายรูปใบเสร็จ" onClick={() => camRef.current?.click()}><Camera size={20} /></button>
            <textarea
              ref={inputRef}
              rows={1}
              className="input max-h-32 min-h-[44px] flex-1 resize-none !rounded-2xl"
              placeholder="พิมพ์รายจ่าย หรือเล่าเรื่องในทริป..."
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                  e.preventDefault()
                  send()
                }
              }}
            />
            <button className="btn-primary !h-11 !w-11 !p-0" disabled={busy || (!text.trim() && !file)} aria-label="ส่ง"><SendHorizontal size={19} /></button>
          </div>
          {offline && <p className="mt-2 flex items-center gap-1.5 text-xs text-ink-muted"><WifiOff size={13} /> โหมดออฟไลน์: ยังไม่ได้เชื่อม AI ระบบใช้ตัวแยกรายจ่ายพื้นฐานแทน (ดู README เพื่อเปิดใช้ AI)</p>}
        </form>
      </section>

      <aside className="hidden space-y-4 lg:block">
        <div className="card p-5">
          <p className="kicker text-lagoon">วันนี้ · Day {dayNumber(trip.start_date, today)}</p>
          <div className="mt-2 font-display text-3xl font-bold">{fmtMoney(totals.todayTotal, trip.home_currency)}</div>
          <p className="text-sm text-ink-muted">รวมทั้งทริป {fmtMoney(totals.total, trip.home_currency)}</p>
          <div className="mt-4 space-y-2.5">
            {Object.entries(totals.byCategory).sort((a, b) => b[1] - a[1]).map(([k, v]) => (
              <div key={k}>
                <div className="flex justify-between text-sm"><span>{CATEGORIES[k as Category].emoji} {CATEGORIES[k as Category].label}</span><span className="font-medium">{fmtMoney(v, trip.home_currency)}</span></div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-cream-200"><div className="h-full rounded-full" style={{ width: `${(v / (totals.total || 1)) * 100}%`, background: CATEGORIES[k as Category].color }} /></div>
              </div>
            ))}
          </div>
        </div>
        <div className="card space-y-3 p-5 text-sm">
          <p className="flex items-center gap-2 font-bold"><Sparkles size={16} className="text-ember" /> ลองพิมพ์แบบนี้</p>
          <p className="text-ink-muted">• “ข้าวเช้า 650 เยน กาแฟ 480 เยน” — หลายรายการในข้อความเดียว</p>
          <p className="text-ink-muted">• “เมื่อวานจ่ายค่ารถไฟ 1,200 เยน” — ย้อนวันได้</p>
          <p className="flex gap-1 text-ink-muted">• <Receipt size={15} className="mt-0.5 shrink-0" /> แนบรูปใบเสร็จ ให้ AI อ่านยอดเอง</p>
          <p className="text-ink-muted">• เล่าความประทับใจ — จะถูกเก็บไปเขียนใน Passport</p>
        </div>
      </aside>
    </div>
  )
}
