// อัตราแลกเปลี่ยนจาก open.er-api.com (ฟรี ไม่ต้องใช้ key, อัปเดตวันละครั้ง) แคชไว้ใน localStorage 12 ชม.
const CACHE_KEY = 'pai_fx_v1'
const TTL = 12 * 3600 * 1000

type Cache = Record<string, { at: number; rates: Record<string, number> }>

function readCache(): Cache {
  try {
    return JSON.parse(localStorage.getItem(CACHE_KEY) || '{}')
  } catch {
    return {}
  }
}

/** คืนค่า rate ที่ใช้คูณ: amount(from) * rate = amount(to). ถ้าดึงไม่สำเร็จคืน null */
export async function getRate(from: string, to: string): Promise<number | null> {
  from = from.toUpperCase()
  to = to.toUpperCase()
  if (from === to) return 1
  const cache = readCache()
  const hit = cache[from]
  if (hit && Date.now() - hit.at < TTL && hit.rates[to]) return hit.rates[to]
  try {
    const res = await fetch(`https://open.er-api.com/v6/latest/${from}`)
    const data = await res.json()
    if (data?.result !== 'success') return hit?.rates[to] ?? null
    cache[from] = { at: Date.now(), rates: data.rates }
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(cache))
    } catch {
      /* ignore */
    }
    return data.rates[to] ?? null
  } catch {
    return hit?.rates[to] ?? null
  }
}

export async function convert(amount: number, from: string, to: string) {
  const rate = (await getRate(from, to)) ?? 1
  return { rate, amountHome: Math.round(amount * rate * 100) / 100, ok: rate !== 1 || from === to }
}
