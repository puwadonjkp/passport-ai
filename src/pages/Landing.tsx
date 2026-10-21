import { Link } from 'react-router-dom'
import { BarChart3, BookOpen, Camera, Cloud, Layers, MessageCircle, Receipt, Share2, Sparkles, UploadCloud } from 'lucide-react'
import { Logo, Stamp } from '../components/ui'

const AGENTS = [
  { n: '01', icon: Camera, title: 'Travel Memory Collection', text: 'รวบรวมรูป (อ่านวันเวลา + GPS จาก EXIF) โน้ตในแชท และรายจ่าย ให้เป็นข้อมูลชุดเดียว', tint: 'bg-ember-100 text-ember' },
  { n: '02', icon: BookOpen, title: 'Travel Story Generation', text: 'AI เรียบเรียงเรื่องเล่ารายวัน และมองรูปไฮไลต์แล้วเขียนแคปชันให้', tint: 'bg-lagoon-100 text-lagoon' },
  { n: '03', icon: BarChart3, title: 'Travel Intelligence', text: 'วิเคราะห์ค่าใช้จ่ายรายหมวด รายวัน เทียบงบ และพฤติกรรมการเที่ยว', tint: 'bg-ember-100 text-ember' },
  { n: '04', icon: Layers, title: 'Travel Passport Builder', text: 'ประกอบเรื่องเล่า ตัวเลข แผนที่ และรูป เป็นหน้า Passport แบบ responsive', tint: 'bg-lagoon-100 text-lagoon' },
  { n: '05', icon: Cloud, title: 'Memory Preservation', text: 'เก็บไว้ถาวรบนคลาวด์ พร้อมลิงก์ให้กลับมาดูหรือแชร์ได้ทุกเมื่อ', tint: 'bg-ember-100 text-ember' },
]

export default function Landing() {
  return (
    <div className="min-h-screen bg-cream">
      {/* ---------------- HERO ---------------- */}
      <section className="relative overflow-hidden bg-[linear-gradient(100deg,#2C2119_0%,#2C2119_55%,#5A3420_80%,#B4521F_100%)] text-cream">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
          <Logo dark />
          <div className="flex gap-2">
            <Link to="/login" className="btn !text-cream hover:bg-white/10">เข้าสู่ระบบ</Link>
            <Link to="/register" className="btn-primary">เริ่มใช้งานฟรี</Link>
          </div>
        </div>

        <div className="mx-auto grid max-w-6xl items-center gap-10 px-5 pb-20 pt-10 md:grid-cols-[1.3fr_1fr] md:pb-28 md:pt-16">
          <div className="relative">
            <p className="kicker text-saffron">AI for Business Strategy · Final Project</p>
            <div className="dotted-route absolute -left-40 top-24 hidden h-[2px] w-[520px] -rotate-[8deg] opacity-80 md:block" />
            <h1 className="relative mt-6 text-6xl font-bold leading-none tracking-tight sm:text-7xl md:text-8xl">
              Passport <span className="text-ember">AI</span>
            </h1>
            <p className="mt-5 font-display text-2xl text-cream/90 sm:text-3xl">“หนังสือเดินทาง แห่งความทรงจำ”</p>
            <p className="mt-6 max-w-xl text-[15px] leading-relaxed text-cream/70">
              ระหว่างเที่ยว แค่พิมพ์บอก AI ว่าจ่ายอะไรไปเท่าไหร่ ถ่ายรูปใบเสร็จ หรือเล่าเรื่องที่เจอ — พอจบทริป AI 5 ตัวจะรวมรูป แผนที่
              เรื่องเล่า และค่าใช้จ่าย สร้างเป็น <b className="text-cream">Travel Passport</b> พร้อมแชร์ให้ทันที
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/register" className="btn-primary !px-7 !py-3 text-base">สร้างทริปแรกของคุณ ✈️</Link>
              <a href="#how" className="btn !px-6 !py-3 text-base text-cream ring-1 ring-cream/25 hover:bg-white/10">ดูวิธีทำงาน</a>
            </div>
          </div>
          <div className="relative mx-auto">
            <div className="grid h-64 w-64 place-items-center rounded-full bg-ember shadow-[0_30px_80px_-20px_rgba(226,98,43,.7)] sm:h-80 sm:w-80">
              <Stamp size={230} className="animate-stamp text-cream/95" />
            </div>
          </div>
        </div>
      </section>

      {/* ---------------- HOW IT WORKS ---------------- */}
      <section id="how" className="mx-auto max-w-6xl px-5 py-20">
        <p className="kicker text-lagoon">How it works</p>
        <h2 className="mt-2 text-4xl font-bold">ทำงานอย่างไร</h2>
        <p className="mt-2 text-ink-muted">ผู้ใช้แค่ส่งข้อมูลทริปเข้ามา ระบบ AI จะรับหน้าที่ที่เหลือทั้งหมด แล้วส่งมอบ Travel Passport กลับมาให้พร้อมใช้</p>
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {[
            { icon: MessageCircle, title: 'จดผ่านแชทระหว่างทริป', text: '“ราเมง 2 ชาม 1,800 เยน” → AI แยกหมวด แปลงสกุลเงิน และบันทึกให้ทันที', dark: false },
            { icon: Sparkles, title: 'Agent 5 ส่วนทำงาน', text: 'รวบรวม → เล่าเรื่อง → วิเคราะห์ → ประกอบหน้า → จัดเก็บถาวร', dark: true },
            { icon: Share2, title: 'ได้ Travel Passport', text: 'หน้าสรุปทริป ดูย้อนหลัง และแชร์ลิงก์ให้เพื่อน/ครอบครัวได้ทันที', dark: false },
          ].map((s) => (
            <div key={s.title} className={`rounded-3xl p-8 text-center ${s.dark ? 'bg-espresso text-cream' : 'card'}`}>
              <s.icon size={44} className={`mx-auto ${s.dark ? 'text-saffron' : 'text-lagoon'}`} />
              <h3 className="mt-5 text-xl font-bold">{s.title}</h3>
              <p className={`mt-2 text-sm leading-relaxed ${s.dark ? 'text-cream/70' : 'text-ink-muted'}`}>{s.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ---------------- AGENTS ---------------- */}
      <section className="paper border-y border-cream-200 py-20">
        <div className="mx-auto max-w-6xl px-5">
          <p className="kicker text-lagoon">The team, made of AI</p>
          <h2 className="mt-2 text-4xl font-bold">Agent ทั้ง 5 ตัว</h2>
          <div className="mt-10 grid gap-4">
            {AGENTS.map((a) => (
              <div key={a.n} className="card flex items-center gap-5 p-5 sm:p-6">
                <div className={`grid h-14 w-14 shrink-0 place-items-center rounded-full ${a.tint}`}><a.icon size={26} /></div>
                <div className="font-display text-4xl font-bold text-ember">{a.n}</div>
                <div>
                  <h3 className="text-lg font-bold sm:text-xl">{a.title}</h3>
                  <p className="text-sm text-ink-muted">{a.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------- FEATURES ---------------- */}
      <section className="mx-auto max-w-6xl px-5 py-20">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: MessageCircle, t: 'แชทจดรายจ่าย', d: 'พิมพ์ภาษาคนได้เลย หลายรายการในข้อความเดียวก็ได้' },
            { icon: Receipt, t: 'สแกนใบเสร็จ', d: 'ถ่ายรูปใบเสร็จส่งเข้าแชท AI อ่านยอดให้อัตโนมัติ' },
            { icon: UploadCloud, t: 'คลังรูปรายทริป', d: 'อัปโหลดได้ทีละหลายร้อยรูป รองรับ HEIC จาก iPhone' },
            { icon: Share2, t: 'แชร์ Passport', d: 'เปิดลิงก์สาธารณะ หรือพิมพ์เป็น PDF เก็บไว้' },
          ].map((f) => (
            <div key={f.t} className="card p-6">
              <f.icon className="text-ember" />
              <h4 className="mt-4 font-bold">{f.t}</h4>
              <p className="mt-1 text-sm text-ink-muted">{f.d}</p>
            </div>
          ))}
        </div>
        <div className="mt-16 flex flex-col items-center gap-6 rounded-3xl bg-espresso p-10 text-center text-cream sm:p-14">
          <h2 className="text-3xl font-bold sm:text-4xl">“Travel Passport” ที่ AI สร้างให้ครบในที่เดียว</h2>
          <p className="text-cream/70">ทั้ง<b className="text-cream">เรื่องราว</b> และ<b className="text-cream">ความทรงจำ</b></p>
          <Link to="/register" className="btn-primary !px-8 !py-3 text-base">สมัครเลย ฟรี</Link>
        </div>
      </section>

      <footer className="border-t border-cream-200 py-8 text-center text-xs text-ink-muted">
        Passport AI · ภูวดล จงกลแพทย์ · วุฒิเมศร์ วรรณดนัยพงศ์ · ศุภวิชญ์ การัณย์ศิริ
      </footer>
    </div>
  )
}
