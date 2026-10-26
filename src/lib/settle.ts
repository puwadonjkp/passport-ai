// หารเงินในทริป: คำนวณยอดที่แต่ละคนจ่ายจริง vs ส่วนที่ต้องรับผิดชอบ แล้วหา "ใครต้องโอนให้ใคร" ให้จำนวนครั้งน้อยที่สุด
import type { Expense, Member, Transfer } from './types'

export interface Balance {
  userId: string
  name: string
  paid: number
  share: number
  net: number // + = ควรได้เงินคืน, - = ต้องจ่ายเพิ่ม
}

const round2 = (n: number) => Math.round(n * 100) / 100

export function computeBalances(expenses: Expense[], members: Member[]): Balance[] {
  const ids = members.map((m) => m.user_id)
  const map = new Map<string, Balance>(members.map((m) => [m.user_id, { userId: m.user_id, name: m.display_name, paid: 0, share: 0, net: 0 }]))
  for (const e of expenses) {
    const amount = Number(e.amount_home)
    const payer = e.paid_by && map.has(e.paid_by) ? e.paid_by : e.user_id
    const among = (e.split_with?.length ? e.split_with : ids).filter((id) => map.has(id))
    const people = among.length ? among : [payer]
    if (map.has(payer)) map.get(payer)!.paid += amount
    for (const id of people) map.get(id)!.share += amount / people.length
  }
  return [...map.values()].map((b) => ({ ...b, paid: round2(b.paid), share: round2(b.share), net: round2(b.paid - b.share) }))
}

export function settle(balances: Balance[]): Transfer[] {
  const debtors = balances.filter((b) => b.net < -0.5).map((b) => ({ id: b.userId, v: -b.net })).sort((a, b) => b.v - a.v)
  const creditors = balances.filter((b) => b.net > 0.5).map((b) => ({ id: b.userId, v: b.net })).sort((a, b) => b.v - a.v)
  const out: Transfer[] = []
  let i = 0
  let j = 0
  while (i < debtors.length && j < creditors.length) {
    const x = Math.min(debtors[i].v, creditors[j].v)
    if (x >= 0.5) out.push({ from: debtors[i].id, to: creditors[j].id, amount: Math.round(x) })
    debtors[i].v -= x
    creditors[j].v -= x
    if (debtors[i].v < 0.5) i++
    if (creditors[j].v < 0.5) j++
  }
  return out
}

/** จับคู่ชื่อที่ AI ตอบมา กับสมาชิกจริง (ไม่สนตัวพิมพ์ใหญ่เล็ก/ช่องว่าง, ยอมให้ชื่อเป็นส่วนหนึ่งของกันและกัน) */
export function matchMember(name: string | null | undefined, members: Member[]): string | null {
  if (!name) return null
  const n = name.trim().toLowerCase().replace(/\s+/g, '')
  if (!n) return null
  const exact = members.find((m) => m.display_name.toLowerCase().replace(/\s+/g, '') === n)
  if (exact) return exact.user_id
  const partial = members.find((m) => {
    const d = m.display_name.toLowerCase().replace(/\s+/g, '')
    return d.includes(n) || n.includes(d)
  })
  return partial?.user_id ?? null
}
