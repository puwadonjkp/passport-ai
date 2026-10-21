import { useMemo, useRef, useState, type DragEvent } from 'react'
import { ChevronLeft, ChevronRight, ImageUp, MapPin, MapPinOff, Star, Trash2, X } from 'lucide-react'
import { addDays, dayNumber, fmtDate } from '../lib/format'
import { deletePhotos, uploadPhoto } from '../lib/photos'
import { publicUrl, supabase } from '../lib/supabase'
import type { Photo } from '../lib/types'
import type { TripData } from '../pages/TripPage'
import { Empty, Spinner } from './ui'

type Filter = 'all' | 'highlight' | 'receipt'

export default function PhotosTab({ trip, photos, setPhotos, setTrip }: TripData) {
  const [queue, setQueue] = useState<{ done: number; total: number; failed: string[] } | null>(null)
  const [drag, setDrag] = useState(false)
  const [filter, setFilter] = useState<Filter>('all')
  const [viewer, setViewer] = useState<number | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const visible = useMemo(
    () => photos.filter((p) => (filter === 'receipt' ? p.kind === 'receipt' : p.kind === 'photo' && (filter === 'all' || p.is_highlight))),
    [photos, filter],
  )
  const groups = useMemo(() => {
    const g = new Map<string, Photo[]>()
    for (const p of visible) {
      const d = dayNumber(trip.start_date, p.taken_at)
      const key = d == null ? 'none' : d < 1 ? 'before' : d > (dayNumber(trip.start_date, trip.end_date) ?? 1) ? 'after' : String(d)
      g.set(key, [...(g.get(key) ?? []), p])
    }
    const order = (k: string) => (k === 'before' ? -1 : k === 'none' ? 9999 : k === 'after' ? 9998 : Number(k))
    return [...g.entries()].sort((a, b) => order(a[0]) - order(b[0]))
  }, [visible, trip])

  const gpsCount = photos.filter((p) => p.kind === 'photo' && p.lat != null).length
  const photoCount = photos.filter((p) => p.kind === 'photo').length

  async function handleFiles(list: FileList | File[]) {
    const files = [...list].filter((f) => f.type.startsWith('image/') || /\.(heic|heif)$/i.test(f.name))
    if (!files.length) return
    const state = { done: 0, total: files.length, failed: [] as string[] }
    setQueue({ ...state })
    let i = 0
    const worker = async () => {
      while (i < files.length) {
        const f = files[i++]
        try {
          const photo = await uploadPhoto(trip, f)
          setPhotos((ps) => [...ps, photo].sort((a, b) => (a.taken_at ?? '9').localeCompare(b.taken_at ?? '9')))
        } catch (e) {
          state.failed.push(`${f.name}: ${(e as Error).message}`)
        }
        state.done++
        setQueue({ ...state })
      }
    }
    await Promise.all([worker(), worker(), worker()])
    setTrip({ ...trip })
    setTimeout(() => setQueue((q) => (q && !q.failed.length ? null : q)), 2500)
  }

  async function toggleHighlight(p: Photo) {
    const v = !p.is_highlight
    setPhotos((ps) => ps.map((x) => (x.id === p.id ? { ...x, is_highlight: v } : x)))
    await supabase.from('photos').update({ is_highlight: v }).eq('id', p.id)
  }

  async function setCover(p: Photo) {
    await supabase.from('trips').update({ cover_photo_path: p.storage_path }).eq('id', trip.id)
    setTrip({ ...trip, cover_photo_path: p.storage_path })
  }

  async function remove(p: Photo) {
    if (!confirm('ลบรูปนี้ออกจากทริป?')) return
    await deletePhotos([p])
    setPhotos((ps) => ps.filter((x) => x.id !== p.id))
    setViewer(null)
  }

  const onDrop = (e: DragEvent) => {
    e.preventDefault()
    setDrag(false)
    handleFiles(e.dataTransfer.files)
  }

  const current = viewer != null ? visible[viewer] : null

  return (
    <div className="space-y-5">
      <div
        onDragOver={(e) => { e.preventDefault(); setDrag(true) }}
        onDragLeave={() => setDrag(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        className={`cursor-pointer rounded-3xl border-2 border-dashed p-8 text-center transition ${drag ? 'border-ember bg-ember-100' : 'border-cream-300 bg-white hover:border-ember'}`}
      >
        <input ref={inputRef} type="file" multiple accept="image/*,.heic,.heif" hidden onChange={(e) => e.target.files && handleFiles(e.target.files)} />
        <ImageUp className="mx-auto text-ember" size={36} />
        <p className="mt-3 font-bold">ลากรูปมาวาง หรือคลิกเพื่อเลือกรูป</p>
        <p className="mt-1 text-sm text-ink-muted">เลือกได้ทีละหลายร้อยรูป · รองรับ JPG / PNG / HEIC จาก iPhone · ระบบอ่านวันเวลาและ GPS จากรูปให้อัตโนมัติ</p>
        <p className="mt-1 text-xs text-ink-muted">💡 ถ้าส่งจาก iPhone ให้เลือก “ตัวเลือก &gt; ข้อมูลตำแหน่ง” ไว้ด้วย เพื่อให้มีหมุดบนแผนที่</p>
      </div>

      {queue && (
        <div className="card p-4">
          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2 font-medium">{queue.done < queue.total && <Spinner size={15} />} อัปโหลด {queue.done}/{queue.total} รูป</span>
            {queue.done === queue.total && <button className="text-ink-muted" onClick={() => setQueue(null)}><X size={16} /></button>}
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-cream-200"><div className="h-full rounded-full bg-ember transition-all" style={{ width: `${(queue.done / queue.total) * 100}%` }} /></div>
          {queue.failed.length > 0 && <ul className="mt-2 text-xs text-red-600">{queue.failed.map((f) => <li key={f}>✗ {f}</li>)}</ul>}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {([['all', `ทั้งหมด (${photoCount})`], ['highlight', `⭐ ไฮไลต์ (${photos.filter((p) => p.is_highlight).length})`], ['receipt', `🧾 ใบเสร็จ (${photos.filter((p) => p.kind === 'receipt').length})`]] as const).map(([k, l]) => (
          <button key={k} onClick={() => setFilter(k)} className={`chip !px-3.5 !py-1.5 text-sm ring-1 ${filter === k ? 'bg-espresso text-cream ring-espresso' : 'bg-white ring-cream-300'}`}>{l}</button>
        ))}
        <span className="ml-auto flex items-center gap-1 text-xs text-ink-muted"><MapPin size={13} /> มี GPS {gpsCount}/{photoCount} รูป</span>
      </div>

      {visible.length === 0 ? (
        <Empty icon={<ImageUp size={28} />} title={filter === 'all' ? 'ยังไม่มีรูปในทริปนี้' : 'ยังไม่มีรูปในหมวดนี้'}
          text={filter === 'highlight' ? 'กดดาว ⭐ ที่รูปที่ชอบ เพื่อให้ขึ้นเป็นรูปเด่นใน Passport (ถ้าไม่เลือก ระบบจะเลือกให้)' : 'อัปโหลดรูปจากทริป หรือส่งรูปผ่านแชทก็ได้'} />
      ) : (
        groups.map(([key, list]) => (
          <section key={key}>
            <h3 className="mb-2 flex items-baseline gap-2 text-lg font-bold">
              {key === 'none' ? 'ไม่มีข้อมูลวันที่' : key === 'before' ? 'ก่อนเริ่มทริป' : key === 'after' ? 'หลังจบทริป' : `Day ${key}`}
              {!['none', 'before', 'after'].includes(key) && <span className="text-sm font-normal text-ink-muted">{fmtDate(addDays(trip.start_date, Number(key) - 1))}</span>}
              <span className="text-sm font-normal text-ink-muted">· {list.length} รูป</span>
            </h3>
            <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-4 md:grid-cols-6">
              {list.map((p) => (
                <div key={p.id} className="group relative aspect-square overflow-hidden rounded-xl bg-cream-200">
                  <img src={publicUrl(p.thumb_path || p.storage_path)} alt="" loading="lazy" onClick={() => setViewer(visible.indexOf(p))}
                    className="h-full w-full cursor-zoom-in object-cover transition duration-300 group-hover:scale-105" />
                  <button onClick={() => toggleHighlight(p)} title="ไฮไลต์"
                    className={`absolute right-1.5 top-1.5 grid h-7 w-7 place-items-center rounded-full backdrop-blur transition ${p.is_highlight ? 'bg-saffron text-white' : 'bg-black/30 text-white opacity-70 group-hover:opacity-100'}`}>
                    <Star size={14} fill={p.is_highlight ? 'currentColor' : 'none'} />
                  </button>
                  {p.lat == null && p.kind === 'photo' && <MapPinOff size={13} className="absolute bottom-1.5 left-1.5 text-white drop-shadow" />}
                  {p.taken_at && <span className="absolute bottom-1 right-1.5 text-[10px] font-medium text-white drop-shadow">{p.taken_at.slice(11, 16)}</span>}
                </div>
              ))}
            </div>
          </section>
        ))
      )}

      {current && (
        <div className="fixed inset-0 z-50 flex flex-col bg-black/95" onClick={() => setViewer(null)}>
          <div className="flex items-center gap-2 p-3 text-white" onClick={(e) => e.stopPropagation()}>
            <span className="flex-1 truncate text-sm text-white/70">
              {current.taken_at ? `Day ${dayNumber(trip.start_date, current.taken_at)} · ${current.taken_at.replace('T', ' ').slice(0, 16)}` : current.original_name}
              {current.lat != null && ` · 📍 ${current.lat.toFixed(4)}, ${current.lon!.toFixed(4)}`}
            </span>
            <button className="btn !px-3 text-white hover:bg-white/10" onClick={() => toggleHighlight(current)}><Star size={16} fill={current.is_highlight ? 'currentColor' : 'none'} /> ไฮไลต์</button>
            <button className="btn !px-3 text-white hover:bg-white/10" onClick={() => setCover(current)}>ตั้งเป็นปก</button>
            <button className="btn !px-3 text-red-400 hover:bg-white/10" onClick={() => remove(current)}><Trash2 size={16} /></button>
            <button className="btn !px-3 text-white hover:bg-white/10" onClick={() => setViewer(null)}><X size={20} /></button>
          </div>
          <div className="relative flex flex-1 items-center justify-center p-4" onClick={(e) => e.stopPropagation()}>
            <button className="absolute left-2 grid h-11 w-11 place-items-center rounded-full bg-white/10 text-white" onClick={() => setViewer((v) => (v! - 1 + visible.length) % visible.length)}><ChevronLeft /></button>
            <img src={publicUrl(current.storage_path)} alt="" className="max-h-full max-w-full rounded-lg object-contain" />
            <button className="absolute right-2 grid h-11 w-11 place-items-center rounded-full bg-white/10 text-white" onClick={() => setViewer((v) => (v! + 1) % visible.length)}><ChevronRight /></button>
          </div>
          {current.caption && <p className="pb-6 text-center text-white/80">{current.caption}</p>}
        </div>
      )}
    </div>
  )
}
