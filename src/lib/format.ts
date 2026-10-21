const TH_MONTHS = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.']

/** แปลง 'YYYY-MM-DD' เป็น Date (เวลาท้องถิ่น ไม่เพี้ยนจาก timezone) */
export function parseDate(d: string) {
  const [y, m, day] = d.slice(0, 10).split('-').map(Number)
  return new Date(y, m - 1, day)
}

export function toISODate(d: Date) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function addDays(d: string, n: number) {
  const x = parseDate(d)
  x.setDate(x.getDate() + n)
  return toISODate(x)
}

export function daysBetween(a: string, b: string) {
  return Math.round((parseDate(b).getTime() - parseDate(a).getTime()) / 86400000)
}

export function fmtDate(d: string, withYear = false) {
  const x = parseDate(d)
  return `${x.getDate()} ${TH_MONTHS[x.getMonth()]}${withYear ? ` ${x.getFullYear() + 543}` : ''}`
}

export function fmtRange(a: string, b: string) {
  const x = parseDate(a)
  const y = parseDate(b)
  if (x.getFullYear() === y.getFullYear() && x.getMonth() === y.getMonth())
    return `${x.getDate()}–${y.getDate()} ${TH_MONTHS[y.getMonth()]} ${y.getFullYear() + 543}`
  return `${fmtDate(a)} – ${fmtDate(b, true)}`
}

export function fmtMoney(n: number, currency = 'THB', digits = 0) {
  const s = n.toLocaleString('th-TH', { minimumFractionDigits: digits, maximumFractionDigits: digits })
  if (currency === 'THB') return `${s} บาท`
  return `${s} ${currency}`
}

export function fmtCompact(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 10_000) return `${(n / 1000).toFixed(1)}K`
  return n.toLocaleString('th-TH', { maximumFractionDigits: 0 })
}

export function fmtTime(iso: string) {
  const d = new Date(iso)
  return d.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })
}

export function todayISO() {
  return toISODate(new Date())
}

/** วันที่ของทริปตามเวลาปัจจุบัน (บีบให้อยู่ในช่วงทริป) */
export function tripToday(start: string, end: string) {
  const t = todayISO()
  if (t < start) return start
  if (t > end) return end
  return t
}

export function dayNumber(start: string, date: string | null) {
  if (!date) return null
  return daysBetween(start, date.slice(0, 10)) + 1
}
