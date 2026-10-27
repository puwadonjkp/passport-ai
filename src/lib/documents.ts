// Agent 01 (เอกสารเดินทาง): อัปโหลด Boarding Pass / E-Itinerary / ใบจองโรงแรม แล้วให้ AI อ่านข้อมูลเที่ยวบินและที่พัก
import { AIUnavailable, callAI } from './ai'
import { blobToBase64, imageForAI, toBrowserImage } from './image'
import { PHOTO_BUCKET, supabase } from './supabase'
import type { FlightInfo, HotelInfo, TravelDoc, Trip } from './types'

export const MAX_PDF_MB = 8

interface DocAIResult {
  kind: TravelDoc['kind']
  summary: string
  flights: FlightInfo[]
  hotel: HotelInfo | null
  total_price: { amount: number; currency: string } | null
}

export async function uploadDocument(trip: Trip, file: File): Promise<{ doc: TravelDoc; aiError: string | null }> {
  const isPdf = file.type === 'application/pdf' || /\.pdf$/i.test(file.name)
  if (isPdf && file.size > MAX_PDF_MB * 1024 * 1024) throw new Error(`ไฟล์ PDF ต้องไม่เกิน ${MAX_PDF_MB} MB`)

  // รูป: ย่อเป็น JPEG ก่อน (รองรับ HEIC) / PDF: ส่งไฟล์เดิม
  let blob: Blob = file
  let mime = isPdf ? 'application/pdf' : 'image/jpeg'
  let aiFile: { base64: string; mime: string }
  if (isPdf) {
    aiFile = { base64: await blobToBase64(file), mime }
  } else {
    const src = await toBrowserImage(file)
    aiFile = await imageForAI(src, 1800)
    blob = await (await fetch(`data:image/jpeg;base64,${aiFile.base64}`)).blob()
    mime = 'image/jpeg'
  }

  const id = crypto.randomUUID()
  const path = `${trip.user_id}/${trip.id}/docs/${id}.${isPdf ? 'pdf' : 'jpg'}`
  const up = await supabase.storage.from(PHOTO_BUCKET).upload(path, blob, { contentType: mime, upsert: false })
  if (up.error) throw up.error

  let data: TravelDoc['data'] = {}
  let kind: TravelDoc['kind'] = 'other'
  let aiError: string | null = null
  try {
    const r = await callAI<DocAIResult>('document', { file: aiFile })
    kind = r.kind
    data = { summary: r.summary, flights: r.flights, hotel: r.hotel, total_price: r.total_price }
  } catch (e) {
    aiError = e instanceof AIUnavailable ? 'ยังอ่านเอกสารอัตโนมัติไม่ได้ (AI ไม่พร้อม) — กรอกข้อมูลเองได้ที่ปุ่มแก้ไข' : (e as Error).message
  }

  const { data: row, error } = await supabase
    .from('documents')
    .insert({ id, trip_id: trip.id, kind, storage_path: path, original_name: file.name, mime, data })
    .select()
    .single()
  if (error) {
    await supabase.storage.from(PHOTO_BUCKET).remove([path])
    throw error
  }
  return { doc: row as TravelDoc, aiError }
}

export async function deleteDocument(doc: TravelDoc) {
  if (doc.storage_path) await supabase.storage.from(PHOTO_BUCKET).remove([doc.storage_path])
  await supabase.from('documents').delete().eq('id', doc.id)
}

/** ช่วงวันที่ที่เอกสารบอก (เที่ยวบินแรก/สุดท้าย, เช็คอิน/เช็คเอาท์) ใช้แนะนำให้ปรับวันทริป */
export function docDateRange(docs: TravelDoc[]): { start: string; end: string } | null {
  const dates: string[] = []
  for (const d of docs) {
    for (const f of d.data.flights ?? []) {
      if (f.depart) dates.push(f.depart.slice(0, 10))
      if (f.arrive) dates.push(f.arrive.slice(0, 10))
    }
    if (d.data.hotel?.check_in) dates.push(d.data.hotel.check_in.slice(0, 10))
    if (d.data.hotel?.check_out) dates.push(d.data.hotel.check_out.slice(0, 10))
  }
  const valid = dates.filter((x) => /^\d{4}-\d{2}-\d{2}$/.test(x)).sort()
  return valid.length ? { start: valid[0], end: valid[valid.length - 1] } : null
}
