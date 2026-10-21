// =====================================================================
// Passport AI — Edge Function "ai"
// รวมงาน AI ทั้งหมดไว้จุดเดียว เพื่อเก็บ API Key ไว้ฝั่ง Server (ไม่หลุดไปที่ Browser)
//
//   action = "chat"     -> Chat Note Agent: อ่านข้อความ/รูปใบเสร็จ แยกรายจ่าย + บันทึกความทรงจำ
//   action = "story"    -> Agent 02/03: เขียนเรื่องเล่ารายวัน ชื่อทริป คำโปรย และ insight ค่าใช้จ่าย
//   action = "caption"  -> Agent 02 (Vision): มองรูปไฮไลต์แล้วเขียนแคปชัน
//
// Secrets (ตั้งใน Supabase Dashboard > Edge Functions > Secrets):
//   GEMINI_API_KEY    (ฟรี จาก Google AI Studio)  หรือ  ANTHROPIC_API_KEY
//   GEMINI_MODEL / CLAUDE_MODEL  (ไม่บังคับ — เปลี่ยนรุ่นโมเดลได้โดยไม่ต้องแก้โค้ด)
// =====================================================================

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const GEMINI_KEY = Deno.env.get('GEMINI_API_KEY') ?? ''
const ANTHROPIC_KEY = Deno.env.get('ANTHROPIC_API_KEY') ?? ''
const GEMINI_MODEL = Deno.env.get('GEMINI_MODEL') ?? 'gemini-3.5-flash-lite'
const CLAUDE_MODEL = Deno.env.get('CLAUDE_MODEL') ?? 'claude-haiku-5-5'

type Image = { base64: string; mime: string }

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } })
}

async function callGemini(system: string, user: string, image?: Image, wantJson = true): Promise<string> {
  const parts: Record<string, unknown>[] = []
  if (image) parts.push({ inline_data: { mime_type: image.mime, data: image.base64 } })
  parts.push({ text: user })
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: [{ role: 'user', parts }],
        generationConfig: { temperature: 0.7, ...(wantJson ? { responseMimeType: 'application/json' } : {}) },
      }),
    },
  )
  if (!res.ok) throw new Error(`Gemini ${res.status}: ${(await res.text()).slice(0, 300)}`)
  const data = await res.json()
  return data?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text ?? '').join('') ?? ''
}

async function callClaude(system: string, user: string, image?: Image, maxTokens = 2048): Promise<string> {
  const content: Record<string, unknown>[] = []
  if (image) content.push({ type: 'image', source: { type: 'base64', media_type: image.mime, data: image.base64 } })
  content.push({ type: 'text', text: user })
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({ model: CLAUDE_MODEL, max_tokens: maxTokens, system, messages: [{ role: 'user', content }] }),
  })
  if (!res.ok) throw new Error(`Claude ${res.status}: ${(await res.text()).slice(0, 300)}`)
  const data = await res.json()
  return data?.content?.map((c: { text?: string }) => c.text ?? '').join('') ?? ''
}

async function callAI(system: string, user: string, opts: { image?: Image; wantJson?: boolean; maxTokens?: number } = {}) {
  if (GEMINI_KEY) return { text: await callGemini(system, user, opts.image, opts.wantJson ?? true), provider: 'gemini' }
  return { text: await callClaude(system, user, opts.image, opts.maxTokens), provider: 'claude' }
}

/** แกะ JSON จากคำตอบ AI แบบทนทาน (ตัด ```json และข้อความรอบนอกออก) — พอร์ตมาจาก _parse_ai_response ใน v022 */
function parseJson(raw: string): Record<string, unknown> {
  let t = raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()
  const a = t.indexOf('{')
  const b = t.lastIndexOf('}')
  if (a !== -1 && b > a) t = t.slice(a, b + 1)
  return JSON.parse(t)
}

// ---------------------------------------------------------------------
// CHAT NOTE AGENT
// ---------------------------------------------------------------------
const CHAT_SYSTEM = `คุณคือ "น้องพาส" ผู้ช่วยจดบันทึกทริปใน Passport AI คุยภาษาไทยแบบเพื่อนสนิท สั้น กระชับ เป็นกันเอง ใช้อิโมจิได้ 1-2 ตัว
หน้าที่หลัก:
1. แยก "รายจ่าย" ทุกรายการจากข้อความ (หรือจากรูปใบเสร็จถ้ามี) ออกมาเป็นข้อมูลโครงสร้าง
2. ถ้าข้อความเป็นเรื่องราว/ความรู้สึก/สถานที่ที่ไป ให้สรุปเป็น "memory" สั้นๆ 1 ประโยค เพื่อเอาไปเขียน Passport ตอนจบทริป
3. ถ้าผู้ใช้ถามเรื่องงบหรือยอดใช้จ่าย ให้ตอบจากข้อมูลสรุปที่ให้ไว้เท่านั้น ห้ามเดาตัวเลข
กฎของรายจ่าย:
- category ต้องเป็นหนึ่งใน: food, transport, accommodation, shopping, activity, other
- currency เป็นรหัส ISO 4217 (THB, JPY, CNY, KRW, USD, EUR, ...) ถ้าผู้ใช้ไม่ระบุสกุลเงิน ให้ใช้สกุลเงินท้องถิ่นของปลายทาง ถ้าไม่ชัดเจนให้ใช้สกุลเงินหลักของทริป
- amount เป็นตัวเลขยอดรวมของรายการนั้น (ถ้าบอกว่า "2 ชาม ชามละ 900" ให้คิดเป็น 1800)
- date รูปแบบ YYYY-MM-DD ตีความคำว่า "เมื่อวาน" "เมื่อเช้า" จากวันที่วันนี้ ถ้าไม่ระบุให้ใช้วันนี้
- description สั้นๆ เป็นภาษาไทย ไม่เกิน 6 คำ
- ห้ามสร้างรายจ่ายที่ผู้ใช้ไม่ได้พูดถึง ถ้าไม่มีรายจ่ายให้ส่ง expenses เป็น []
- ถ้าเป็นรูปใบเสร็จ ให้ตั้ง image_is_receipt = true แล้วอ่านยอดรวมสุทธิ (Total) เป็น 1 รายการ เว้นแต่ใบเสร็จแยกหมวดชัดเจน
reply: ข้อความตอบกลับสั้นๆ ยืนยันสิ่งที่บันทึกไว้ (ไม่ต้องแปลงสกุลเงินเอง ระบบจะแปลงให้)
ตอบเป็น JSON เท่านั้น ตาม schema:
{"reply": string, "expenses": [{"description": string, "category": string, "amount": number, "currency": string, "date": "YYYY-MM-DD"}], "memory": string | null, "image_is_receipt": boolean}`

async function handleChat(p: Record<string, any>) {
  const ctx = p.context ?? {}
  const history = (p.history ?? []).slice(-10).map((m: any) => `${m.role === 'user' ? 'ผู้ใช้' : 'น้องพาส'}: ${m.content}`).join('\n')
  const user = `ข้อมูลทริป:
- ชื่อทริป: ${ctx.tripName ?? '-'}  ปลายทาง: ${ctx.destination ?? '-'}
- ช่วงวันที่: ${ctx.startDate} ถึง ${ctx.endDate}  วันนี้: ${ctx.today}
- สกุลเงินหลักของทริป: ${ctx.homeCurrency ?? 'THB'}  งบ: ${ctx.budget ?? 'ไม่ได้ตั้ง'}
- ใช้ไปแล้วรวม: ${ctx.spentTotal ?? 0} ${ctx.homeCurrency ?? 'THB'}
- แยกตามหมวด: ${JSON.stringify(ctx.byCategory ?? {})}
- วันนี้ใช้ไป: ${ctx.spentToday ?? 0} ${ctx.homeCurrency ?? 'THB'}

บทสนทนาก่อนหน้า:
${history || '(ยังไม่มี)'}

ข้อความใหม่จากผู้ใช้: ${p.message || '(ส่งรูปมาอย่างเดียว)'}`
  const image = p.image ? { base64: p.image.base64, mime: p.image.mime ?? 'image/jpeg' } : undefined
  const { text, provider } = await callAI(CHAT_SYSTEM, user, { image, maxTokens: 1024 })
  const data = parseJson(text)
  const expenses = Array.isArray(data.expenses) ? data.expenses : []
  return {
    provider,
    reply: typeof data.reply === 'string' ? data.reply : 'บันทึกให้แล้วน้า ✨',
    memory: typeof data.memory === 'string' && data.memory.trim() ? data.memory.trim() : null,
    image_is_receipt: data.image_is_receipt === true,
    expenses: expenses
      .filter((e: any) => e && typeof e.amount === 'number' && e.amount > 0)
      .map((e: any) => ({
        description: String(e.description ?? 'รายจ่าย').slice(0, 80),
        category: ['food', 'transport', 'accommodation', 'shopping', 'activity', 'other'].includes(e.category) ? e.category : 'other',
        amount: e.amount,
        currency: String(e.currency ?? ctx.homeCurrency ?? 'THB').toUpperCase().slice(0, 3),
        date: typeof e.date === 'string' ? e.date : ctx.today,
      })),
  }
}

// ---------------------------------------------------------------------
// STORY WRITER (Agent 02 + 03) — prompt พอร์ตมาจาก _build_ai_system_prompt ใน app_v022.py
// ---------------------------------------------------------------------
function storySystem(tone: string) {
  return `คุณคือเพื่อนสนิทที่ชอบเขียนแคปชั่น/ไดอารี่ทริปแบบ${tone} ให้เพื่อน

ตัวอย่างที่ "ใช่": "วันนี้เดินเล่นรอบเมือง กินของอร่อยจนพุงกาง ฟินสุดๆ 🌙"
ตัวอย่างที่ "ไม่ใช่" (เวิ่นเว้อ/ทางการเกินไป): "การเดินทางครั้งนี้เปี่ยมไปด้วยความทรงจำอันน่าประทับใจตลอดระยะเวลา"

กฎ:
1. ตอบเป็น JSON เท่านั้น
2. ภาษาไทยแบบพูดคุยธรรมดา ตามโทนที่กำหนด และใส่ใจ "ฟีลการเดินทาง" (คู่รัก/ครอบครัว/เพื่อน/คนเดียว)
3. ห้ามแต่งข้อมูลที่ไม่มีจริง ใช้เฉพาะจุดแวะ บันทึกจากแชท และรายจ่ายที่ให้มา (บันทึกจากแชทคือสิ่งที่ผู้ใช้เล่าเอง ให้หยิบมาใช้ได้เต็มที่)
4. ชื่อสถานที่ทุกจุดต้องเขียนเป็นภาษาไทย แม้ข้อมูลดิบจะเป็นภาษาอื่น (เช่น "昆明市" -> "คุนหมิง", "Chatuchak Market" -> "ตลาดจตุจักร")
5. ความยาว: vibe_quote ≤ 25 คำ, summary ≤ 20 คำ/วัน, narrative ≤ 60 คำ/วัน, area ≤ 8 คำ
6. area = พื้นที่กว้างๆ ที่วันนั้นวนเวียนอยู่ เช่น "รอบเมืองเกียวโต"
7. trip_title = ระดับเมืองเท่านั้น ต่อกันด้วย " - " ไม่เกิน 3 เมือง (เกินให้ต่อท้าย "และอื่นๆ")
8. insights = ข้อสังเกตเชิงพฤติกรรมการเดินทางและการใช้เงิน 3 ข้อ สั้นๆ ข้อละ ≤ 20 คำ อ้างอิงตัวเลขจริงที่ให้มา
9. ต้องมีครบทุกวันใน "รายการวัน"`
}

async function handleStory(p: Record<string, any>) {
  const user = `ข้อมูลทริป:
- ผู้เดินทาง: ${p.userName}  เดินทางแบบ: ${p.companion}
- ปลายทางที่ผู้ใช้ตั้งไว้: ${p.destination ?? '-'}
- ช่วงวันที่: ${p.startDate} ถึง ${p.endDate} (${p.tripDays} วัน)
- รายการวันที่ต้องเขียนให้ครบ: ${JSON.stringify(Array.from({ length: p.tripDays }, (_, i) => i + 1))}

จุดแวะจากรูปถ่าย (เรียงตามเวลา):
${JSON.stringify(p.visits ?? [], null, 1)}

บันทึกความทรงจำจากแชท (ผู้ใช้เล่าเอง):
${JSON.stringify(p.notes ?? [], null, 1)}

สรุปค่าใช้จ่าย (${p.homeCurrency}):
${JSON.stringify(p.expenseSummary ?? {}, null, 1)}

ตอบ JSON ตาม schema:
{"trip_title": string, "vibe_quote": string, "insights": [string, string, string],
 "days": [{"day": 1, "area": string, "summary": string, "narrative": string}]}`
  const { text, provider } = await callAI(storySystem(p.tone ?? 'น่ารัก ขี้เล่น'), user, { maxTokens: 4096 })
  const data = parseJson(text)
  if (typeof data.vibe_quote !== 'string' || !Array.isArray(data.days)) throw new Error('AI ตอบไม่ครบ schema')
  return { provider, ...data }
}

// ---------------------------------------------------------------------
// PHOTO CAPTION (Vision)
// ---------------------------------------------------------------------
async function handleCaption(p: Record<string, any>) {
  const system = `คุณเขียนแคปชันรูปท่องเที่ยวแบบ${p.tone ?? 'น่ารัก'} เป็นภาษาไทยเท่านั้น`
  const user = 'มองภาพนี้แล้วเขียนแคปชันสั้นๆ ไม่เกิน 12 คำ ตอบแค่ประโยคเดียว ไม่ต้องมีเครื่องหมายคำพูด ถ้ามีป้ายภาษาอื่นให้แปลความหมายเป็นไทย'
  const { text, provider } = await callAI(system, user, {
    image: { base64: p.image.base64, mime: p.image.mime ?? 'image/jpeg' },
    wantJson: false,
    maxTokens: 120,
  })
  const caption = text.trim().replace(/^["'“]|["'”]$/g, '').split(/\s+/).slice(0, 20).join(' ')
  return { provider, caption }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405)
  if (!GEMINI_KEY && !ANTHROPIC_KEY) return json({ error: 'no_ai_key' }, 503)
  try {
    const { action, payload } = await req.json()
    if (action === 'chat') return json(await handleChat(payload))
    if (action === 'story') return json(await handleStory(payload))
    if (action === 'caption') return json(await handleCaption(payload))
    return json({ error: 'unknown_action' }, 400)
  } catch (e) {
    console.error(e)
    return json({ error: 'ai_failed', detail: String((e as Error)?.message ?? e) }, 502)
  }
})
