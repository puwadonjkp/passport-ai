import { BarChart3, BookOpen, Camera, Check, Cloud, Layers, Plane } from 'lucide-react'

const AGENTS = [
  { icon: Camera, name: 'Travel Memory Collection' },
  { icon: BookOpen, name: 'Travel Story Generation' },
  { icon: BarChart3, name: 'Travel Intelligence' },
  { icon: Layers, name: 'Travel Passport Builder' },
  { icon: Cloud, name: 'Memory Preservation' },
]
// ลำดับที่ pipeline เรียกจริง: 1 -> 3 (ตัวเลข) -> 2 -> 4 -> 5
const ORDER = [1, 3, 2, 4, 5]

export default function AgentLoader({ agent, text, pct }: { agent: number; text: string; pct?: number }) {
  const pos = ORDER.indexOf(agent)
  return (
    <div className="fixed inset-0 z-[60] grid place-items-center bg-espresso/95 p-5 text-cream backdrop-blur">
      <div className="w-full max-w-md">
        <div className="relative mb-8 h-10 overflow-hidden">
          <div className="dotted-route absolute left-0 right-0 top-1/2 h-[2px]" />
          <Plane className="absolute top-1/2 -translate-y-1/2 rotate-45 text-ember animate-fly" size={28} />
        </div>
        <p className="kicker text-center text-saffron">AI Agents at work</p>
        <h2 className="mt-2 text-center text-2xl font-bold">กำลังสร้าง Travel Passport ✨</h2>
        <ol className="mt-8 space-y-3">
          {AGENTS.map((a, i) => {
            const n = i + 1
            const p = ORDER.indexOf(n)
            const done = p < pos
            const active = n === agent
            return (
              <li key={n} className={`flex items-center gap-4 rounded-2xl px-4 py-3 transition ${active ? 'bg-white/10 ring-1 ring-ember' : ''} ${!done && !active ? 'opacity-40' : ''}`}>
                <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-full ${done ? 'bg-lagoon' : active ? 'bg-ember animate-pulse' : 'bg-white/10'}`}>
                  {done ? <Check size={18} /> : <a.icon size={18} />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs text-cream/50">Agent 0{n}</div>
                  <div className="truncate font-semibold">{a.name}</div>
                  {active && <div className="truncate text-xs text-saffron">{text}</div>}
                  {active && pct != null && (
                    <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-white/10"><div className="h-full bg-saffron transition-all" style={{ width: `${pct * 100}%` }} /></div>
                  )}
                </div>
              </li>
            )
          })}
        </ol>
        <p className="mt-6 text-center text-xs text-cream/40">การค้นหาชื่อสถานที่ใช้เวลาประมาณ 1 วินาทีต่อจุดแวะ</p>
      </div>
    </div>
  )
}
