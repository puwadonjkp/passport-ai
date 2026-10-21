import { useMemo, useState, type FormEvent } from 'react'
import { Download, Pencil, Plus, Trash2, Wallet } from 'lucide-react'
import { CATEGORIES, CATEGORY_KEYS, CURRENCIES } from '../lib/constants'
import { convert } from '../lib/currency'
import { guessCategory } from '../lib/expenseParser'
import { addDays, dayNumber, fmtDate, fmtMoney, tripToday } from '../lib/format'
import { supabase } from '../lib/supabase'
import type { Category, Expense } from '../lib/types'
import type { TripData } from '../pages/TripPage'
import { Empty, Modal, Spinner } from './ui'

export default function ExpensesTab({ trip, expenses, setExpenses }: TripData) {
  const [editing, setEditing] = useState<Expense | 'new' | null>(null)
  const cur = trip.home_currency
  const tripDays = dayNumber(trip.start_date, trip.end_date) ?? 1

  const s = useMemo(() => {
    const total = expenses.reduce((a, e) => a + Number(e.amount_home), 0)
    const cats = CATEGORY_KEYS.map((c) => ({ c, v: expenses.filter((e) => e.category === c).reduce((a, e) => a + Number(e.amount_home), 0) }))
      .filter((x) => x.v > 0).sort((a, b) => b.v - a.v)
    const days = Array.from({ length: tripDays }, (_, i) => {
      const date = addDays(trip.start_date, i)
      return { day: i + 1, date, v: expenses.filter((e) => e.spent_on === date).reduce((a, e) => a + Number(e.amount_home), 0) }
    })
    return { total, cats, days, maxDay: Math.max(1, ...days.map((d) => d.v)) }
  }, [expenses, trip, tripDays])

  const byDay = useMemo(() => {
    const m = new Map<string, Expense[]>()
    for (const e of [...expenses].sort((a, b) => a.spent_on.localeCompare(b.spent_on) || a.created_at.localeCompare(b.created_at)))
      m.set(e.spent_on, [...(m.get(e.spent_on) ?? []), e])
    return [...m.entries()]
  }, [expenses])

  function exportCsv() {
    const rows = [['วันที่', 'Day', 'รายการ', 'หมวด', 'จำนวน', 'สกุลเงิน', `เทียบเป็น ${cur}`, 'ที่มา']]
    for (const e of expenses)
      rows.push([e.spent_on, String(dayNumber(trip.start_date, e.spent_on)), e.description, CATEGORIES[e.category].label, String(e.amount), e.currency, String(e.amount_home), e.source])
    const csv = '﻿' + rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(',')).join('\n')
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
    a.download = `${trip.name}-expenses.csv`
    a.click()
  }

  async function remove(e: Expense) {
    if (!confirm(`ลบ "${e.description}"?`)) return
    await supabase.from('expenses').delete().eq('id', e.id)
    setExpenses((es) => es.filter((x) => x.id !== e.id))
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          { l: 'ใช้ไปทั้งหมด', v: fmtMoney(s.total, cur), accent: true },
          { l: trip.budget ? (s.total > trip.budget ? 'เกินงบ' : 'เหลืองบ') : 'งบประมาณ', v: trip.budget ? fmtMoney(Math.abs(trip.budget - s.total), cur) : 'ไม่ได้ตั้ง' },
          { l: 'เฉลี่ยต่อวัน', v: fmtMoney(s.total / tripDays, cur) },
          { l: 'จำนวนรายการ', v: `${expenses.length} รายการ` },
        ].map((x) => (
          <div key={x.l} className={`rounded-2xl p-4 ${x.accent ? 'bg-espresso text-cream' : 'card'}`}>
            <div className={`text-xs ${x.accent ? 'text-cream/60' : 'text-ink-muted'}`}>{x.l}</div>
            <div className="mt-1 font-display text-xl font-bold sm:text-2xl">{x.v}</div>
          </div>
        ))}
      </div>

      {expenses.length > 0 && (
        <div className="grid gap-5 md:grid-cols-2">
          <div className="card p-5">
            <h3 className="font-bold">แยกตามหมวด</h3>
            <div className="mt-4 flex h-4 overflow-hidden rounded-full">
              {s.cats.map((x) => <div key={x.c} style={{ width: `${(x.v / s.total) * 100}%`, background: CATEGORIES[x.c].color }} title={CATEGORIES[x.c].label} />)}
            </div>
            <ul className="mt-4 space-y-2 text-sm">
              {s.cats.map((x) => (
                <li key={x.c} className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: CATEGORIES[x.c].color }} />
                  <span className="flex-1">{CATEGORIES[x.c].emoji} {CATEGORIES[x.c].label}</span>
                  <span className="text-ink-muted">{((x.v / s.total) * 100).toFixed(1)}%</span>
                  <span className="w-28 text-right font-semibold">{fmtMoney(x.v, cur)}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="card p-5">
            <h3 className="font-bold">รายวัน</h3>
            <div className="mt-4 flex h-44 items-end gap-1.5 overflow-x-auto">
              {s.days.map((d) => (
                <div key={d.day} className="flex min-w-[28px] flex-1 flex-col items-center gap-1" title={`${fmtDate(d.date)}: ${fmtMoney(d.v, cur)}`}>
                  <span className="text-[10px] text-ink-muted">{d.v ? (d.v >= 1000 ? `${(d.v / 1000).toFixed(1)}k` : Math.round(d.v)) : ''}</span>
                  <div className="w-full rounded-t-md bg-gradient-to-t from-ember to-saffron" style={{ height: `${(d.v / s.maxDay) * 120}px`, minHeight: d.v ? 4 : 0 }} />
                  <span className="text-[10px] font-medium">D{d.day}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <h3 className="flex-1 text-lg font-bold">รายการทั้งหมด</h3>
        {expenses.length > 0 && <button className="btn-outline" onClick={exportCsv}><Download size={16} /> CSV</button>}
        <button className="btn-primary" onClick={() => setEditing('new')}><Plus size={16} /> เพิ่มเอง</button>
      </div>

      {expenses.length === 0 ? (
        <Empty icon={<Wallet size={28} />} title="ยังไม่มีรายจ่าย" text="พิมพ์ในแชท เช่น “ค่าแท็กซี่ 350 บาท” แล้ว AI จะจดลงมาที่นี่ให้อัตโนมัติ" />
      ) : (
        byDay.map(([date, list]) => (
          <section key={date} className="card overflow-hidden">
            <div className="flex items-center justify-between bg-cream-200/60 px-4 py-2 text-sm">
              <b>Day {dayNumber(trip.start_date, date)} · {fmtDate(date)}</b>
              <span className="font-semibold">{fmtMoney(list.reduce((a, e) => a + Number(e.amount_home), 0), cur)}</span>
            </div>
            <ul className="divide-y divide-cream-200">
              {list.map((e) => (
                <li key={e.id} className="group flex items-center gap-3 px-4 py-3">
                  <span className="grid h-9 w-9 place-items-center rounded-xl" style={{ background: CATEGORIES[e.category].color + '1f' }}>{CATEGORIES[e.category].emoji}</span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium">{e.description}</div>
                    <div className="text-xs text-ink-muted">{CATEGORIES[e.category].label} · {e.source === 'chat' ? '💬 แชท' : e.source === 'receipt' ? '🧾 ใบเสร็จ' : '✍️ เพิ่มเอง'}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold">{fmtMoney(Number(e.amount), e.currency, Number(e.amount) % 1 ? 2 : 0)}</div>
                    {e.currency !== cur && <div className="text-xs text-ink-muted">≈ {fmtMoney(Number(e.amount_home), cur)}</div>}
                  </div>
                  <button className="p-1.5 text-ink-muted hover:text-ink" onClick={() => setEditing(e)} title="แก้ไข"><Pencil size={15} /></button>
                  <button className="p-1.5 text-ink-muted hover:text-red-600" onClick={() => remove(e)} title="ลบ"><Trash2 size={15} /></button>
                </li>
              ))}
            </ul>
          </section>
        ))
      )}

      <ExpenseModal
        key={editing === 'new' ? 'new' : editing?.id ?? 'none'}
        open={editing !== null}
        expense={editing === 'new' ? null : editing}
        onClose={() => setEditing(null)}
        defaults={{ currency: expenses[expenses.length - 1]?.currency ?? cur, date: tripToday(trip.start_date, trip.end_date) }}
        trip={trip}
        onSaved={(x) => {
          setExpenses((es) => (es.some((e) => e.id === x.id) ? es.map((e) => (e.id === x.id ? x : e)) : [...es, x]))
          setEditing(null)
        }}
      />
    </div>
  )
}

function ExpenseModal({ open, expense, onClose, onSaved, defaults, trip }: {
  open: boolean; expense: Expense | null; onClose: () => void; onSaved: (e: Expense) => void
  defaults: { currency: string; date: string }; trip: TripData['trip']
}) {
  const [f, setF] = useState({
    description: expense?.description ?? '', category: (expense?.category ?? 'food') as Category,
    amount: expense ? String(expense.amount) : '', currency: expense?.currency ?? defaults.currency, spent_on: expense?.spent_on ?? defaults.date,
  })
  const [busy, setBusy] = useState(false)
  const [catTouched, setCatTouched] = useState(Boolean(expense))

  async function submit(ev: FormEvent) {
    ev.preventDefault()
    setBusy(true)
    const amount = Number(f.amount)
    const { rate, amountHome } = await convert(amount, f.currency, trip.home_currency)
    const row = { description: f.description.trim(), category: f.category, amount, currency: f.currency, rate, amount_home: amountHome, spent_on: f.spent_on }
    const q = expense
      ? supabase.from('expenses').update(row).eq('id', expense.id)
      : supabase.from('expenses').insert({ ...row, trip_id: trip.id, source: 'manual' })
    const { data, error } = await q.select().single()
    setBusy(false)
    if (error) return alert(error.message)
    onSaved(data as Expense)
  }

  return (
    <Modal open={open} onClose={onClose} title={expense ? 'แก้ไขรายจ่าย' : 'เพิ่มรายจ่าย'}>
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="label">รายการ</label>
          <input className="input" required value={f.description} placeholder="เช่น ซูชิสายพาน"
            onChange={(e) => setF({ ...f, description: e.target.value, category: catTouched ? f.category : guessCategory(e.target.value) })} />
        </div>
        <div className="grid grid-cols-[1fr_110px] gap-3">
          <div>
            <label className="label">จำนวนเงิน</label>
            <input className="input" type="number" step="any" min="0" required inputMode="decimal" value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} />
          </div>
          <div>
            <label className="label">สกุลเงิน</label>
            <select className="input" value={f.currency} onChange={(e) => setF({ ...f, currency: e.target.value })}>
              {[...new Set([f.currency, ...CURRENCIES])].map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className="label">หมวด</label>
          <div className="flex flex-wrap gap-2">
            {CATEGORY_KEYS.map((c) => (
              <button type="button" key={c} onClick={() => { setCatTouched(true); setF({ ...f, category: c }) }}
                className={`chip !px-3 !py-1.5 text-sm ring-1 ${f.category === c ? 'bg-espresso text-cream ring-espresso' : 'bg-white ring-cream-300'}`}>
                {CATEGORIES[c].emoji} {CATEGORIES[c].label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="label">วันที่</label>
          <input className="input" type="date" min={trip.start_date} max={trip.end_date} value={f.spent_on} onChange={(e) => setF({ ...f, spent_on: e.target.value })} />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" className="btn-ghost" onClick={onClose}>ยกเลิก</button>
          <button className="btn-primary" disabled={busy}>{busy && <Spinner />} บันทึก</button>
        </div>
      </form>
    </Modal>
  )
}
