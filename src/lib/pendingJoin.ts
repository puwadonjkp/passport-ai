// จำลิงก์ชวนเพื่อนไว้ระหว่างที่เพื่อนสมัคร/ล็อกอิน/ยืนยันอีเมล
// ใช้ localStorage (ไม่ใช่ sessionStorage) เพราะลิงก์ยืนยันอีเมลมักเปิดในแท็บใหม่
const KEY = 'pai_pending_join'
const MAX_AGE = 7 * 24 * 3600 * 1000

export function setPendingJoin(code: string) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ code, at: Date.now() }))
  } catch {
    /* โหมดส่วนตัวบางเบราว์เซอร์เขียนไม่ได้ */
  }
}

export function getPendingJoin(): string | null {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? 'null')
    return v && Date.now() - v.at < MAX_AGE ? String(v.code) : null
  } catch {
    return null
  }
}

export function clearPendingJoin() {
  try {
    localStorage.removeItem(KEY)
  } catch {
    /* ignore */
  }
}
