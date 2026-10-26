// =====================================================================
// Passport Pipeline — Agent 5 ตัวตามสไลด์นำเสนอ
//   01 Travel Memory Collection  : รวบรวมรูป (EXIF/GPS) + บันทึกจากแชท + รายจ่าย -> จุดแวะ + ชื่อสถานที่
//   02 Travel Story Generation   : AI เขียนเรื่องเล่ารายวัน ชื่อทริป คำโปรย + แคปชันรูปไฮไลต์ (Vision)
//   03 Travel Intelligence       : วิเคราะห์ค่าใช้จ่าย/พฤติกรรม เป็นตัวเลข + insight
//   04 Travel Passport Builder   : ประกอบทุกอย่างเป็น PassportData
//   05 Memory Preservation       : บันทึกลงฐานข้อมูล พร้อมลิงก์แชร์ถาวร
// ทุกขั้นที่ใช้ AI มี Fallback แบบไม่ใช้ AI (พอร์ตจาก *_mock ใน app_v022.py) ระบบจึงไม่มีวันพัง
// =====================================================================
import { callAI } from './ai'
import { CATEGORIES, COMPANIONS, TONES } from './constants'
import { addDays, dayNumber, fmtMoney } from './format'
import { buildPins, buildVisits, reverseGeocode, routeDistanceKm } from './geo'
import { imageForAI } from './image'
import { computeBalances, settle } from './settle'
import { publicUrl, supabase } from './supabase'
import type { Category, Expense, FlightInfo, HotelInfo, Member, Message, PassportData, Photo, TravelDoc, Trip, Visit } from './types'

export type Progress = (agent: number, text: string, pct?: number) => void

interface StoryResult {
  trip_title?: string
  vibe_quote: string
  insights?: string[]
  days: { day: number; area?: string; summary?: string; narrative?: string }[]
}

const hhmm = (iso: string) => iso.slice(11, 16)

export async function buildPassport(opts: {
  trip: Trip
  photos: Photo[]
  expenses: Expense[]
  messages: Message[]
  documents?: TravelDoc[]
  members?: Member[]
  userName: string
  onProgress: Progress
}): Promise<{ data: PassportData; warnings: string[] }> {
  const { trip, expenses, messages, userName, onProgress } = opts
  const documents = opts.documents ?? []
  const members = opts.members ?? []
  const warnings: string[] = []
  const tripDays = Math.max(1, dayNumber(trip.start_date, trip.end_date) ?? 1)
  const companion = COMPANIONS[trip.companion] ?? COMPANIONS.friends
  const tone = TONES[trip.tone] ?? TONES.cute
  const cur = trip.home_currency

  // ------------------------------ AGENT 01 ------------------------------
  onProgress(1, 'กำลังรวบรวมรูป บันทึก และรายจ่ายทั้งหมดของทริป...', 0)
  const photos = opts.photos.filter((p) => p.kind === 'photo')
  const geoPoints = photos
    .filter((p) => p.taken_at && p.lat != null && p.lon != null)
    .map((p) => ({ lat: p.lat!, lon: p.lon!, takenAt: p.taken_at!, day: dayNumber(trip.start_date, p.taken_at), isHighlight: p.is_highlight }))
  const visits: Visit[] = buildVisits(geoPoints)
  const toGeocode = visits.slice(0, 80)
  for (let i = 0; i < toGeocode.length; i++) {
    onProgress(1, `กำลังค้นหาชื่อสถานที่ จุดแวะที่ ${i + 1}/${toGeocode.length}`, (i + 1) / toGeocode.length)
    toGeocode[i].location = await reverseGeocode(toGeocode[i].lat, toGeocode[i].lon)
  }
  const notes = messages
    .filter((m) => m.role === 'assistant' && m.meta?.memory)
    .map((m) => {
      const d = dayNumber(trip.start_date, m.created_at.slice(0, 10))
      return d && d >= 1 && d <= tripDays ? `[Day ${d}] ${m.meta.memory}` : `${m.meta.memory}`
    })

  const flights: FlightInfo[] = documents.flatMap((d) => d.data.flights ?? []).sort((a, b) => (a.depart ?? '9').localeCompare(b.depart ?? '9'))
  const hotels: HotelInfo[] = documents.map((d) => d.data.hotel).filter(Boolean).sort((a, b) => (a!.check_in ?? '9').localeCompare(b!.check_in ?? '9')) as HotelInfo[]

  // ------------------------------ AGENT 03 (ตัวเลข) ------------------------------
  onProgress(3, 'กำลังวิเคราะห์ค่าใช้จ่ายและพฤติกรรมการเดินทาง...')
  const total = expenses.reduce((s, e) => s + Number(e.amount_home), 0)
  const catTotals = new Map<Category, number>()
  for (const e of expenses) catTotals.set(e.category, (catTotals.get(e.category) ?? 0) + Number(e.amount_home))
  const byCategory = [...catTotals.entries()]
    .map(([category, amount]) => ({ category, amount, pct: total ? Math.round((amount / total) * 1000) / 10 : 0 }))
    .sort((a, b) => b.amount - a.amount)
  const byDay = Array.from({ length: tripDays }, (_, i) => {
    const date = addDays(trip.start_date, i)
    return { day: i + 1, date, amount: expenses.filter((e) => e.spent_on === date).reduce((s, e) => s + Number(e.amount_home), 0) }
  })
  const topExpenses = [...expenses]
    .sort((a, b) => Number(b.amount_home) - Number(a.amount_home))
    .slice(0, 5)
    .map((e) => ({ description: e.description, amount: Number(e.amount_home), category: e.category, day: dayNumber(trip.start_date, e.spent_on) }))
  const distanceKm = routeDistanceKm(visits)
  const nameOf = new Map(members.map((m) => [m.user_id, m.display_name]))
  const balances = members.length > 1 ? computeBalances(expenses, members) : []
  const transfers = settle(balances).map((t) => ({ from: nameOf.get(t.from) ?? '?', to: nameOf.get(t.to) ?? '?', amount: t.amount }))
  const pins = buildPins(visits)
  const cities: string[] = []
  for (const v of visits) {
    const c = v.location?.city
    if (c && !cities.includes(c)) cities.push(c)
  }

  // ------------------------------ AGENT 02 ------------------------------
  onProgress(2, 'AI กำลังเรียบเรียงเรื่องเล่าของแต่ละวัน...')
  let story: StoryResult | null = null
  try {
    story = await callAI<StoryResult>('story', {
      userName,
      companion: companion.label,
      destination: trip.destination,
      tone: tone.prompt,
      startDate: trip.start_date,
      endDate: trip.end_date,
      tripDays,
      homeCurrency: cur,
      visits: visits.slice(0, 120).map((v) => ({
        day: v.day,
        time: `${hhmm(v.start)}-${hhmm(v.end)}`,
        location: v.location?.display ?? 'ไม่ทราบชื่อ (มีพิกัด GPS)',
        city: v.location?.city ?? null,
        photo_count: v.photoCount,
        is_highlight: v.hasHighlight,
      })),
      notes: notes.slice(-80),
      travel: {
        flights: flights.map((f) => `${f.flight_no ?? ''} ${f.from_city ?? f.from_code} → ${f.to_city ?? f.to_code} ${f.depart ?? ''}`.trim()),
        hotels: hotels.map((h) => `${h.name ?? ''} (${h.city ?? ''}) ${h.check_in ?? ''} ถึง ${h.check_out ?? ''}`.trim()),
      },
      members: members.map((m) => m.display_name),
      expenseSummary: {
        total: Math.round(total),
        budget: trip.budget,
        byCategory: Object.fromEntries(byCategory.map((c) => [CATEGORIES[c.category].label, Math.round(c.amount)])),
        byDay: Object.fromEntries(byDay.map((d) => [`Day ${d.day}`, Math.round(d.amount)])),
        top: topExpenses.map((t) => `${t.description} ${Math.round(t.amount)}`),
      },
    })
  } catch (e) {
    warnings.push(`AI เขียนเรื่องเล่าไม่สำเร็จ ใช้ข้อความอัตโนมัติแทน (${(e as Error).message})`)
  }

  // ไฮไลต์: ใช้รูปที่ผู้ใช้ติดดาว ถ้าไม่มีเลย ให้ระบบเลือกให้ (รูปแรกของแต่ละจุดแวะที่ถ่ายเยอะสุด)
  let highlightPhotos = photos.filter((p) => p.is_highlight)
  if (!highlightPhotos.length && photos.length) {
    const sorted = [...photos].sort((a, b) => (a.taken_at ?? '').localeCompare(b.taken_at ?? ''))
    const step = Math.max(1, Math.floor(sorted.length / 8))
    highlightPhotos = sorted.filter((_, i) => i % step === 0).slice(0, 8)
  }
  highlightPhotos = highlightPhotos.slice(0, 12)

  let aiCaptionWorks = true
  for (let i = 0; i < highlightPhotos.length; i++) {
    const p = highlightPhotos[i]
    if (p.caption || !aiCaptionWorks) continue
    onProgress(2, `AI กำลังมองรูปไฮไลต์ ${i + 1}/${highlightPhotos.length} แล้วเขียนแคปชัน...`, (i + 1) / highlightPhotos.length)
    try {
      const blob = await (await fetch(publicUrl(p.storage_path))).blob()
      const image = await imageForAI(blob, 1024)
      const { caption } = await callAI<{ caption: string }>('caption', { image, tone: tone.prompt })
      if (caption) {
        p.caption = caption
        await supabase.from('photos').update({ caption }).eq('id', p.id)
      }
    } catch {
      aiCaptionWorks = false // ถ้ารูปแรกพัง ไม่ต้องลองต่อทุกรูป
    }
  }

  // ------------------------------ AGENT 04 ------------------------------
  onProgress(4, 'กำลังประกอบหน้า Travel Passport...')
  const aiDays = new Map((story?.days ?? []).map((d) => [Number(d.day), d]))
  const days = byDay.map(({ day, date, amount }) => {
    const dayVisits = visits.filter((v) => v.day === day)
    const places = dayVisits.map((v) => v.location?.place || v.location?.display).filter(Boolean) as string[]
    const ai = aiDays.get(day)
    const photoCount = photos.filter((p) => dayNumber(trip.start_date, p.taken_at) === day).length
    let summary = ai?.summary?.trim() || ''
    if (!summary) {
      const adj = companion.vibe[0]
      if (places.length === 1) summary = `วันนี้อยู่แถว ${places[0]} บรรยากาศ${adj}`
      else if (places.length === 2) summary = `เริ่มที่ ${places[0]} แล้วต่อที่ ${places[1]} วันนี้${adj}สุดๆ`
      else if (places.length > 2) summary = `วันนี้แวะหลายที่ เริ่มจาก ${places[0]} ยันถึง ${places[places.length - 1]} (${places.length} จุด)`
      else if (amount > 0) summary = `วันนี้ใช้ไป ${fmtMoney(amount, cur)} เก็บความทรงจำไว้เต็มกระเป๋า`
      else summary = 'วันพักผ่อนชิลๆ ไม่ได้จดอะไรไว้'
    }
    const area = ai?.area?.trim() || dayVisits.find((v) => v.location?.city)?.location?.city || places[0] || trip.destination || '-'
    return { day, date, area, summary, narrative: ai?.narrative?.trim() || null, photoCount, spent: amount }
  })

  const tripTitle =
    story?.trip_title?.trim() ||
    (cities.length ? cities.slice(0, 3).join(' - ') + (cities.length > 3 ? ' และอื่นๆ' : '') : trip.destination || trip.name)

  let vibeQuote = story?.vibe_quote?.trim() || ''
  if (!vibeQuote) {
    const named = visits.filter((v) => v.location)
    const first = named[0]?.location?.place || named[0]?.location?.display
    const last = named[named.length - 1]?.location?.place || named[named.length - 1]?.location?.display
    vibeQuote = first && last && first !== last ? `จาก ${first} ไปจนถึง ${last} ทริปนี้${companion.vibe[0]}สุดๆ` : `ทริปนี้${companion.vibe[0]}จนลืมไม่ลง`
  }

  let insights = (story?.insights ?? []).filter((s) => typeof s === 'string' && s.trim()).slice(0, 4)
  if (!insights.length) {
    if (byCategory[0]) insights.push(`หมวดที่จ่ายเยอะสุดคือ${CATEGORIES[byCategory[0].category].label} ${byCategory[0].pct}% ของทั้งทริป`)
    const peak = [...byDay].sort((a, b) => b.amount - a.amount)[0]
    if (peak && peak.amount > 0) insights.push(`Day ${peak.day} เป็นวันที่ใช้เงินเยอะที่สุด ${fmtMoney(peak.amount, cur)}`)
    if (trip.budget) {
      const pct = Math.round((total / trip.budget) * 100)
      insights.push(pct <= 100 ? `ใช้ไป ${pct}% ของงบที่ตั้งไว้ คุมงบเก่งมาก!` : `เกินงบไป ${pct - 100}% แต่ความสุขประเมินค่าไม่ได้`)
    }
    if (distanceKm > 0) insights.push(`ตะลุยไปทั้งหมดราว ${distanceKm} กม. ผ่าน ${pins.length} จุดหมาย`)
  }

  const highlights = highlightPhotos.map((p) => ({
    url: publicUrl(p.storage_path),
    thumb: publicUrl(p.thumb_path || p.storage_path),
    caption: p.caption || (p.taken_at ? `📸 ความทรงจำ Day ${dayNumber(trip.start_date, p.taken_at)} เวลา ${hhmm(p.taken_at)}` : '📸 ความทรงจำจากทริปนี้'),
    day: dayNumber(trip.start_date, p.taken_at),
    takenAt: p.taken_at,
  }))

  const data: PassportData = {
    version: 1,
    tripName: trip.name,
    tripTitle,
    destination: trip.destination,
    userName,
    companion: `${companion.emoji} ${companion.label}`,
    startDate: trip.start_date,
    endDate: trip.end_date,
    tripDays,
    homeCurrency: cur,
    theme: trip.theme,
    vibeQuote,
    days,
    visits,
    pins,
    highlights,
    cities,
    stats: {
      places: pins.length,
      photos: photos.length,
      totalSpent: Math.round(total * 100) / 100,
      budget: trip.budget,
      distanceKm,
      dailyAverage: Math.round(total / tripDays),
      expenseCount: expenses.length,
    },
    byCategory,
    byDay,
    topExpenses,
    insights,
    notes,
    aiUsed: Boolean(story),
    flights,
    hotels,
    members: balances.map((b) => ({ name: b.name, paid: b.paid, share: b.share })),
    settlement: transfers,
    generatedAt: new Date().toISOString(),
  }

  // ------------------------------ AGENT 05 ------------------------------
  onProgress(5, 'กำลังเก็บความทรงจำไว้อย่างถาวร...')
  return { data, warnings }
}

export async function savePassport(trip: Trip, data: PassportData) {
  const { data: row, error } = await supabase
    .from('passports')
    .upsert({ trip_id: trip.id, data, updated_at: new Date().toISOString() }, { onConflict: 'trip_id' })
    .select()
    .single()
  if (error) throw error
  await supabase.from('trips').update({ status: 'ended' }).eq('id', trip.id)
  return row
}
