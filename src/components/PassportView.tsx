import { useMemo, useRef, useState, type CSSProperties } from 'react'
import { ChevronDown, ChevronLeft, ChevronRight, X } from 'lucide-react'
import { CATEGORIES, THEMES, dayColor } from '../lib/constants'
import { fmtCompact, fmtDate, fmtMoney, fmtRange } from '../lib/format'
import type { PassportData } from '../lib/types'
import TripMap from './TripMap'

/** หน้า Travel Passport — พอร์ตดีไซน์จาก generate_html_passport() ใน app_v022.py + ภาพร่างในสไลด์ */
export default function PassportView({ data }: { data: PassportData }) {
  const th = THEMES[data.theme] ?? THEMES.ember
  const [day, setDay] = useState<number | 'all'>('all')
  const [lightbox, setLightbox] = useState<number | null>(null)
  const detailRef = useRef<HTMLDivElement>(null)
  const cur = data.homeCurrency
  const vars = { '--p': th.primary, '--s': th.secondary, '--a': th.accent, '--h': th.highlight, '--bg': th.bg } as CSSProperties

  const highlights = useMemo(() => data.highlights.filter((h) => day === 'all' || h.day === day), [data, day])
  const days = useMemo(() => data.days.filter((d) => day === 'all' || d.day === day), [data, day])
  const maxDay = Math.max(1, ...data.byDay.map((d) => d.amount))
  const stamps = data.cities.length ? data.cities : data.destination ? [data.destination] : []

  return (
    <div style={vars} className="overflow-hidden rounded-[28px] bg-[var(--bg)] shadow-lift print:rounded-none print:shadow-none">
      {/* ========================= COVER ========================= */}
      <section className="p-4 sm:p-7">
        <div className="relative overflow-hidden rounded-3xl p-6 text-white sm:p-10" style={{ background: 'linear-gradient(120deg, var(--s), var(--a))' }}>
          <svg className="pointer-events-none absolute -right-8 -top-10 h-56 w-56 text-white/15" viewBox="0 0 100 100"><circle cx="50" cy="50" r="46" fill="none" stroke="currentColor" strokeWidth="3" /><circle cx="50" cy="50" r="40" fill="none" stroke="currentColor" strokeDasharray="2 2" /></svg>
          <div className="relative grid gap-6 md:grid-cols-[1.2fr_1fr] md:items-center">
            <div>
              <p className="kicker text-white/80">Travel Passport</p>
              <h1 className="mt-3 text-4xl font-bold leading-tight sm:text-5xl">{data.tripTitle}</h1>
              <p className="mt-3 text-white/85">{fmtRange(data.startDate, data.endDate)} · {data.tripDays} วัน</p>
              <p className="mt-1 text-sm text-white/75">👤 ทริปของ {data.userName} · {data.companion}</p>
            </div>
            <blockquote className="border-l-4 border-white/40 pl-4 font-display text-lg italic leading-relaxed text-white/95 md:border-l-0 md:border-r-4 md:pl-0 md:pr-4 md:text-right sm:text-xl">
              “{data.vibeQuote}”
            </blockquote>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-3">
          {[
            { v: data.stats.places, l: 'จุดหมาย' },
            { v: data.stats.totalSpent ? `${fmtCompact(data.stats.totalSpent)}` : '-', l: `ใช้จ่าย (${cur === 'THB' ? 'บาท' : cur})` },
            { v: data.stats.photos, l: 'รูปความทรงจำ' },
          ].map((s) => (
            <div key={s.l} className="rounded-2xl bg-white/80 p-4 text-center shadow-card ring-1 ring-black/5">
              <div className="font-display text-2xl font-bold sm:text-3xl" style={{ color: 'var(--p)' }}>{s.v}</div>
              <div className="text-xs text-ink-muted">{s.l}</div>
            </div>
          ))}
        </div>

        <div className="no-scrollbar -mx-4 mt-5 flex snap-x gap-3 overflow-x-auto px-4 pb-2 sm:-mx-7 sm:px-7">
          {data.days.map((d) => (
            <div key={d.day} className="w-64 shrink-0 snap-start rounded-2xl bg-white p-5 shadow-card ring-1 ring-black/5 sm:w-72">
              <div className="text-[11px] font-bold tracking-widest" style={{ color: 'var(--s)' }}>DAY {d.day} · {fmtDate(d.date).toUpperCase()}</div>
              <div className="mt-1.5 font-display text-lg font-bold" style={{ color: 'var(--p)' }}>{d.area}</div>
              <p className="mt-1 text-sm italic text-ink/80">“{d.summary}”</p>
              <div className="mt-3 flex gap-3 text-xs text-ink-muted">
                <span>📷 {d.photoCount} รูป</span>
                {d.spent > 0 && <span>💰 {fmtMoney(d.spent, cur)}</span>}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl bg-white p-5 shadow-card ring-1 ring-black/5">
            <h3 className="font-bold" style={{ color: 'var(--p)' }}>💰 จ่ายค่าประสบการณ์</h3>
            {data.byCategory.length ? (
              <div className="mt-4 flex h-40 items-end justify-around gap-2">
                {data.byCategory.slice(0, 5).map((c) => (
                  <div key={c.category} className="flex flex-1 flex-col items-center gap-1">
                    <span className="text-[11px] font-semibold">{c.pct}%</span>
                    <div className="w-full max-w-[38px] rounded-t-lg" style={{ height: `${Math.max(6, (c.amount / data.byCategory[0].amount) * 110)}px`, background: CATEGORIES[c.category].color }} />
                    <span className="text-lg" title={CATEGORIES[c.category].label}>{CATEGORIES[c.category].emoji}</span>
                  </div>
                ))}
              </div>
            ) : <p className="mt-3 text-sm text-ink-muted">ไม่ได้จดค่าใช้จ่ายไว้</p>}
          </div>
          <div className="overflow-hidden rounded-2xl bg-white p-5 shadow-card ring-1 ring-black/5">
            <h3 className="font-bold" style={{ color: 'var(--p)' }}>🗺️ เส้นทางที่ผ่านไป</h3>
            <div className="mt-3 h-44 overflow-hidden rounded-xl">
              {data.pins.length ? <TripMap pins={data.pins} day="all" routeColor={th.secondary} interactive={false} /> : <p className="text-sm text-ink-muted">ไม่มีข้อมูล GPS จากรูป</p>}
            </div>
          </div>
          <div className="rounded-2xl bg-white p-5 shadow-card ring-1 ring-black/5">
            <h3 className="font-bold" style={{ color: 'var(--p)' }}>🌟 รูปในความทรงจำ</h3>
            <div className="no-scrollbar mt-3 flex h-44 gap-3 overflow-x-auto pl-2">
              {data.highlights.length ? data.highlights.map((h, i) => (
                <img key={i} src={h.thumb} alt="" onClick={() => setLightbox(i)} loading="lazy"
                  className="aspect-[9/16] h-full shrink-0 cursor-zoom-in rounded-xl object-cover shadow-[-5px_5px_0_-1px_#fff,-5px_5px_0_0_rgba(0,0,0,.1)]" />
              )) : <p className="text-sm text-ink-muted">ยังไม่มีรูปไฮไลต์</p>}
            </div>
          </div>
        </div>

        <div className="no-print mt-6 text-center">
          <button className="btn text-white" style={{ background: 'var(--p)' }} onClick={() => detailRef.current?.scrollIntoView({ behavior: 'smooth' })}>
            เปิดอ่านเล่มเต็ม <ChevronDown size={18} />
          </button>
        </div>
      </section>

      {/* ========================= DETAIL ========================= */}
      <section ref={detailRef} className="space-y-5 border-t border-dashed border-black/10 p-4 sm:p-7">
        {stamps.length > 0 && (
          <div className="flex flex-wrap justify-center gap-4 py-2">
            {stamps.slice(0, 8).map((c, i) => (
              <div key={c} className="grid h-28 w-28 place-items-center rounded-full border-[3px] p-2 text-center animate-stamp"
                style={{ borderColor: i % 2 ? 'var(--s)' : 'var(--h)', color: i % 2 ? 'var(--s)' : 'var(--h)', transform: `rotate(${(i % 3) * 7 - 9}deg)`, animationDelay: `${i * 120}ms` }}>
                <div className="grid h-full w-full place-items-center rounded-full border border-dashed border-current">
                  <div>
                    <div className="font-mono text-[9px] font-bold tracking-widest">ARRIVED</div>
                    <div className="font-display text-sm font-bold leading-tight">{c}</div>
                    <div className="font-mono text-[9px]">{fmtDate(data.days.find((d) => d.area.includes(c))?.date ?? data.startDate).toUpperCase()}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="no-print sticky top-16 z-10 -mx-1 flex flex-wrap gap-2 rounded-2xl bg-[var(--bg)]/90 px-1 py-2 backdrop-blur">
          <DayBtn active={day === 'all'} onClick={() => setDay('all')}>🌏 ทั้งหมด</DayBtn>
          {data.days.map((d) => (
            <DayBtn key={d.day} active={day === d.day} onClick={() => setDay(d.day)} dot={dayColor(d.day)}>Day {d.day} · {fmtDate(d.date)}</DayBtn>
          ))}
        </div>

        {data.pins.length > 0 && (
          <div className="overflow-hidden rounded-2xl bg-white p-2 shadow-card ring-1 ring-black/5">
            <div className="h-[340px] overflow-hidden rounded-xl sm:h-[420px]"><TripMap pins={data.pins} day={day} routeColor={th.secondary} /></div>
          </div>
        )}

        <div className="rounded-2xl bg-white p-5 shadow-card ring-1 ring-black/5 sm:p-7">
          <h2 className="text-xl font-bold" style={{ color: 'var(--p)' }}>📝 เรื่องเล่าทริป</h2>
          <div className="mt-4 space-y-6">
            {days.map((d) => {
              const visits = data.visits.filter((v) => v.day === d.day)
              return (
                <article key={d.day} className="relative border-l-2 pl-5" style={{ borderColor: dayColor(d.day) }}>
                  <span className="absolute -left-[7px] top-1 h-3 w-3 rounded-full" style={{ background: dayColor(d.day) }} />
                  <h3 className="font-bold" style={{ color: 'var(--s)' }}>Day {d.day} · {d.area}</h3>
                  <p className="text-xs text-ink-muted">{fmtDate(d.date, true)}</p>
                  {d.narrative ? <p className="mt-2 leading-relaxed">{d.narrative}</p> : <p className="mt-2 italic text-ink/80">{d.summary}</p>}
                  {visits.length > 0 && (
                    <ul className="mt-3 space-y-1 text-sm text-ink-muted">
                      {visits.slice(0, 12).map((v, i) => (
                        <li key={i}>
                          <b className="text-ink">{v.start.slice(11, 16)}{v.end.slice(11, 16) !== v.start.slice(11, 16) && `–${v.end.slice(11, 16)}`}</b>{' '}
                          {v.location?.display ?? 'จุดแวะ'} {v.hasHighlight && '⭐'} {v.photoCount > 1 && `(${v.photoCount} รูป)`}
                        </li>
                      ))}
                    </ul>
                  )}
                </article>
              )
            })}
          </div>
        </div>

        {highlights.length > 0 && (
          <div className="rounded-2xl bg-white p-5 shadow-card ring-1 ring-black/5 sm:p-7">
            <h2 className="text-xl font-bold" style={{ color: 'var(--p)' }}>🌟 รูปไฮไลต์ <span className="text-sm font-normal text-ink-muted">(คลิกเพื่อขยาย)</span></h2>
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {highlights.map((h) => {
                const idx = data.highlights.indexOf(h)
                return (
                  <figure key={idx} className="overflow-hidden rounded-xl bg-[var(--bg)] ring-1 ring-black/5">
                    <img src={h.thumb} alt="" loading="lazy" onClick={() => setLightbox(idx)} className="aspect-square w-full cursor-zoom-in object-cover transition hover:opacity-90" />
                    <figcaption className="p-2.5 text-xs leading-snug">{h.caption}</figcaption>
                  </figure>
                )
              })}
            </div>
          </div>
        )}

        <div className="grid gap-5 lg:grid-cols-2">
          <div className="rounded-2xl bg-white p-5 shadow-card ring-1 ring-black/5 sm:p-7">
            <h2 className="text-xl font-bold" style={{ color: 'var(--p)' }}>💰 สรุปค่าประสบการณ์</h2>
            <p className="mt-1 font-display text-3xl font-bold">{fmtMoney(data.stats.totalSpent, cur)}</p>
            {data.stats.budget ? <p className="text-sm text-ink-muted">จากงบ {fmtMoney(data.stats.budget, cur)} ({Math.round((data.stats.totalSpent / data.stats.budget) * 100)}%)</p> : null}
            <div className="mt-5 space-y-3">
              {data.byCategory.map((c) => (
                <div key={c.category}>
                  <div className="flex justify-between text-sm"><span>{CATEGORIES[c.category].emoji} {CATEGORIES[c.category].label}</span><span><b>{fmtMoney(c.amount, cur)}</b> · {c.pct}%</span></div>
                  <div className="mt-1 h-2.5 overflow-hidden rounded-full bg-black/5"><div className="h-full rounded-full" style={{ width: `${c.pct}%`, background: 'linear-gradient(90deg, var(--h), var(--a))' }} /></div>
                </div>
              ))}
            </div>
            {data.byDay.some((d) => d.amount) && (
              <div className="mt-6 flex h-32 items-end gap-1.5">
                {data.byDay.map((d) => (
                  <div key={d.day} className="flex flex-1 flex-col items-center gap-1" title={fmtMoney(d.amount, cur)}>
                    <div className="w-full rounded-t-md" style={{ height: `${(d.amount / maxDay) * 100}px`, minHeight: d.amount ? 3 : 0, background: dayColor(d.day), opacity: day === 'all' || day === d.day ? 1 : 0.25 }} />
                    <span className="text-[10px] text-ink-muted">D{d.day}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-2xl p-5 text-white shadow-card sm:p-7" style={{ background: 'var(--p)' }}>
            <h2 className="text-xl font-bold">📊 Travel Intelligence</h2>
            <div className="mt-4 grid grid-cols-2 gap-3 text-center">
              {[
                { v: `${data.stats.distanceKm} กม.`, l: 'ระยะทางระหว่างจุดแวะ' },
                { v: fmtMoney(data.stats.dailyAverage, cur), l: 'เฉลี่ยต่อวัน' },
                { v: data.stats.expenseCount, l: 'รายการที่จด' },
                { v: data.cities.length || '-', l: 'เมืองที่ไป' },
              ].map((s) => (
                <div key={s.l} className="rounded-xl bg-white/10 p-3">
                  <div className="font-display text-xl font-bold">{s.v}</div>
                  <div className="text-[11px] text-white/60">{s.l}</div>
                </div>
              ))}
            </div>
            <ul className="mt-5 space-y-2.5">
              {data.insights.map((s, i) => <li key={i} className="flex gap-2 text-sm"><span style={{ color: 'var(--a)' }}>✦</span>{s}</li>)}
            </ul>
            {data.topExpenses.length > 0 && (
              <>
                <h3 className="mt-6 text-sm font-semibold text-white/70">จ่ายหนักสุด</h3>
                <ol className="mt-2 space-y-1.5 text-sm">
                  {data.topExpenses.map((t, i) => (
                    <li key={i} className="flex justify-between gap-3"><span className="truncate">{i + 1}. {CATEGORIES[t.category].emoji} {t.description}</span><b className="shrink-0">{fmtMoney(t.amount, cur)}</b></li>
                  ))}
                </ol>
              </>
            )}
          </div>
        </div>

        {data.notes.length > 0 && (
          <details className="rounded-2xl bg-white p-5 shadow-card ring-1 ring-black/5 sm:p-7">
            <summary className="cursor-pointer font-bold" style={{ color: 'var(--p)' }}>📒 บันทึกระหว่างทาง ({data.notes.length})</summary>
            <ul className="mt-3 space-y-1.5 text-sm text-ink/80">{data.notes.map((n, i) => <li key={i}>• {n}</li>)}</ul>
          </details>
        )}

        <p className="pt-2 text-center text-xs text-ink-muted">สร้างโดย Passport AI 🛂 — หนังสือเดินทางแห่งความทรงจำ</p>
      </section>

      {lightbox != null && data.highlights[lightbox] && (
        <div className="fixed inset-0 z-[70] flex flex-col items-center justify-center bg-black/90 p-4" onClick={() => setLightbox(null)}>
          <button className="absolute right-4 top-4 grid h-11 w-11 place-items-center rounded-full bg-white/15 text-white"><X /></button>
          <button className="absolute left-3 grid h-11 w-11 place-items-center rounded-full bg-white/10 text-white" onClick={(e) => { e.stopPropagation(); setLightbox((lightbox - 1 + data.highlights.length) % data.highlights.length) }}><ChevronLeft /></button>
          <img src={data.highlights[lightbox].url} alt="" className="max-h-[78vh] max-w-[90vw] rounded-xl object-contain shadow-2xl" onClick={(e) => e.stopPropagation()} />
          <p className="mt-4 max-w-xl text-center text-white">{data.highlights[lightbox].caption}</p>
          <button className="absolute right-3 top-1/2 grid h-11 w-11 place-items-center rounded-full bg-white/10 text-white" onClick={(e) => { e.stopPropagation(); setLightbox((lightbox + 1) % data.highlights.length) }}><ChevronRight /></button>
        </div>
      )}
    </div>
  )
}

function DayBtn({ active, onClick, children, dot }: { active: boolean; onClick: () => void; children: React.ReactNode; dot?: string }) {
  return (
    <button onClick={onClick} className={`chip !px-3.5 !py-1.5 text-sm ring-1 transition ${active ? 'text-white ring-transparent' : 'bg-white ring-black/10'}`} style={active ? { background: 'var(--p)' } : undefined}>
      {dot && <span className="h-2 w-2 rounded-full" style={{ background: dot }} />} {children}
    </button>
  )
}
