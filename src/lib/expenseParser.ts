// ตัวแยกรายจ่ายแบบออฟไลน์ (Rule-based) — ใช้เมื่อยังไม่ได้เชื่อม AI หรือ AI ล่ม
// ทำให้แชทจดรายจ่ายใช้งานได้เสมอ แม้ไม่มี API Key
import type { Category, ExtractedExpense } from './types'
import { addDays } from './format'

const CURRENCY_WORDS: [RegExp, string][] = [
  [/(บาท|฿|thb|baht)/i, 'THB'],
  [/(เยน|¥|jpy|yen)/i, 'JPY'],
  [/(วอน|₩|krw|won)/i, 'KRW'],
  [/(หยวน|cny|rmb|yuan)/i, 'CNY'],
  [/(ดอลลาร์ไต้หวัน|twd|nt\$)/i, 'TWD'],
  [/(ดอลลาร์ฮ่องกง|hkd|hk\$)/i, 'HKD'],
  [/(ดอลลาร์สิงคโปร์|sgd|s\$)/i, 'SGD'],
  [/(ริงกิต|myr|rm)/i, 'MYR'],
  [/(ด่ง|vnd|dong)/i, 'VND'],
  [/(ยูโร|€|eur|euro)/i, 'EUR'],
  [/(ปอนด์|£|gbp)/i, 'GBP'],
  [/(ดอลลาร์|ดอล|usd|\$)/i, 'USD'],
]

const CATEGORY_WORDS: [Category, RegExp][] = [
  ['transport', /(แท็กซี่|taxi|grab|แกร็บ|รถไฟ|train|ชินคันเซ็น|shinkansen|รถบัส|bus|รถเมล์|bts|mrt|subway|ใต้ดิน|เครื่องบิน|flight|ตั๋วเครื่อง|เรือ|ferry|น้ำมัน|ค่ารถ|ทางด่วน|jr pass|suica|pasmo|ic card|เช่ารถ|uber|bolt|มอไซค์)/i],
  ['accommodation', /(โรงแรม|ที่พัก|hotel|hostel|airbnb|รีสอร์ท|resort|เรียวกัง|ryokan|ค่าห้อง)/i],
  ['activity', /(ค่าเข้า|ตั๋วเข้า|บัตรเข้า|ทัวร์|tour|พิพิธภัณฑ์|museum|สวนสนุก|disney|universal|ออนเซ็น|onsen|สปา|spa|นวด|ดำน้ำ|กิจกรรม|activity|คอนเสิร์ต|ชมวิว|observatory|ticket)/i],
  ['shopping', /(ซื้อ|ช้อป|shopping|ของฝาก|souvenir|เสื้อ|รองเท้า|กระเป๋า|เครื่องสำอาง|ดองกิ|don ?quijote|uniqlo|ร้านค้า|ห้าง|duty ?free)/i],
  ['food', /(กิน|อาหาร|ข้าว|ราเมง|ramen|ซูชิ|sushi|ร้าน|กาแฟ|coffee|cafe|คาเฟ่|ชา|ขนม|ของหวาน|เบียร์|beer|ดินเนอร์|dinner|lunch|มื้อ|บุฟเฟ่ต์|buffet|ปิ้งย่าง|หมูกระทะ|ก๋วยเตี๋ยว|ไอติม|น้ำ|เครื่องดื่ม|ชาบู|เซเว่น|7-?11|konbini|คอมบินิ|food|snack)/i],
]

export function guessCategory(text: string): Category {
  for (const [cat, re] of CATEGORY_WORDS) if (re.test(text)) return cat
  return 'other'
}

function guessCurrency(text: string, fallback: string) {
  for (const [re, code] of CURRENCY_WORDS) if (re.test(text)) return code
  return fallback
}

const AMOUNT_RE = /(\d{1,3}(?:,\d{3})+|\d+(?:\.\d+)?)\s*(k|พัน|หมื่น)?/gi

export function parseExpensesOffline(text: string, today: string, fallbackCurrency: string): ExtractedExpense[] {
  const date = /เมื่อวาน|yesterday/i.test(text) ? addDays(today, -1) : today
  // แยกเป็นหลายรายการด้วย , ; ขึ้นบรรทัดใหม่ หรือคำว่า "และ/กับ/แล้วก็"
  const chunks = text.split(/[\n;]|,(?!\d{3})|\s(?:และ|แล้วก็|กับ|\+)\s/).map((c) => c.trim()).filter(Boolean)
  const out: ExtractedExpense[] = []
  for (const chunk of chunks) {
    const matches = [...chunk.matchAll(AMOUNT_RE)]
    if (!matches.length) continue
    // ใช้ตัวเลขตัวสุดท้ายในประโยค (มักเป็นราคา เช่น "ราเมง 2 ชาม 1800 เยน")
    const m = matches[matches.length - 1]
    let amount = parseFloat(m[1].replace(/,/g, ''))
    const mult = (m[2] || '').toLowerCase()
    if (mult === 'k' || mult === 'พัน') amount *= 1000
    if (mult === 'หมื่น') amount *= 10000
    if (!amount || amount <= 0) continue
    // ตัดตัวเลข/สกุลเงินออก เหลือเป็นคำอธิบาย
    let desc = chunk
      .replace(AMOUNT_RE, ' ')
      .replace(/(บาท|เยน|วอน|หยวน|ดอลลาร์|ดอล|ยูโร|ปอนด์|ริงกิต|ด่ง|thb|jpy|krw|cny|usd|eur|gbp|twd|hkd|sgd|myr|vnd|baht|yen|won|yuan|dollars?|฿|¥|₩|€|£|\$)/gi, ' ')
      .replace(/^(เมื่อวาน|วันนี้|เมื่อเช้า)?\s*(จ่าย)?\s*/, '')
      .replace(/(ค่า|จ่าย|ไป|หมด|เมื่อวาน|วันนี้|ราคา|รวม)\s*$/g, '')
      .replace(/\s+/g, ' ')
      .trim()
    if (!desc) desc = 'รายจ่าย'
    out.push({
      description: desc.slice(0, 40),
      category: guessCategory(chunk),
      amount,
      currency: guessCurrency(chunk, fallbackCurrency),
      date,
    })
  }
  return out
}
