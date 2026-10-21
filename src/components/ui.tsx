import { useEffect, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Loader2, LogOut, Plane, X } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

/** ตราประทับ "TIME TO TRAVEL" แบบในสไลด์ — วาดด้วย SVG ล้วน */
export function Stamp({ size = 160, top = 'TIME TO', bottom = 'TRAVEL', className = '' }: { size?: number; top?: string; bottom?: string; className?: string }) {
  const id = `arc-${top}-${bottom}`.replace(/\W/g, '')
  return (
    <svg viewBox="0 0 200 200" width={size} height={size} className={className} aria-hidden>
      <defs>
        <path id={`${id}-t`} d="M 40 100 A 60 60 0 0 1 160 100" />
        <path id={`${id}-b`} d="M 32 100 A 68 68 0 0 0 168 100" />
      </defs>
      <circle cx="100" cy="100" r="92" fill="none" stroke="currentColor" strokeWidth="5" />
      <circle cx="100" cy="100" r="84" fill="none" stroke="currentColor" strokeWidth="1.5" strokeDasharray="4 3" />
      <circle cx="100" cy="100" r="44" fill="none" stroke="currentColor" strokeWidth="3" />
      <text fontFamily="Courier Prime, monospace" fontWeight="700" fontSize="22" letterSpacing="3" fill="currentColor">
        <textPath href={`#${id}-t`} startOffset="50%" textAnchor="middle">{top}</textPath>
      </text>
      <text fontFamily="Courier Prime, monospace" fontWeight="700" fontSize="22" letterSpacing="3" fill="currentColor">
        <textPath href={`#${id}-b`} startOffset="50%" textAnchor="middle" dominantBaseline="hanging">{bottom}</textPath>
      </text>
      {[-62, -40, 40, 62].map((a) => (
        <g key={a} transform={`rotate(${a} 100 100)`}>
          <text x="100" y="30" fontSize="12" textAnchor="middle" fill="currentColor">★</text>
        </g>
      ))}
      <g transform="translate(100 100) rotate(-35) translate(-16 -16)" fill="currentColor">
        <path d="M30 13.5c1.4-1.4 1.4-3.4 0-4.8s-3.4-1.4-4.8 0l-5.6 5.6-14.2-4.2-2.4 2.4 11.5 7.1-6.5 6.5-4.6-.8-1.9 1.9 5.6 3.1 3.1 5.6 1.9-1.9-.8-4.6 6.5-6.5 7.1 11.5 2.4-2.4-4.2-14.2z" transform="scale(.95)" />
      </g>
    </svg>
  )
}

export function Logo({ dark = false }: { dark?: boolean }) {
  return (
    <Link to="/" className="flex items-center gap-2">
      <span className="grid h-9 w-9 place-items-center rounded-full bg-ember text-white shadow-md">
        <Plane size={18} className="-rotate-45" />
      </span>
      <span className={`font-display text-xl font-bold tracking-tight ${dark ? 'text-cream' : 'text-espresso'}`}>
        Passport <span className="text-ember">AI</span>
      </span>
    </Link>
  )
}

export function TopBar({ children }: { children?: ReactNode }) {
  const { displayName } = useAuth()
  const nav = useNavigate()
  return (
    <header className="no-print sticky top-0 z-30 border-b border-cream-200/80 bg-cream/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4">
        <Logo />
        <div className="flex-1">{children}</div>
        <span className="hidden text-sm text-ink-muted sm:block">สวัสดี, <b className="text-ink">{displayName}</b></span>
        <button
          className="btn-ghost !px-3"
          title="ออกจากระบบ"
          onClick={async () => {
            await supabase.auth.signOut()
            nav('/')
          }}
        >
          <LogOut size={18} />
        </button>
      </div>
    </header>
  )
}

export function Spinner({ size = 18, className = '' }: { size?: number; className?: string }) {
  return <Loader2 size={size} className={`animate-spin ${className}`} />
}

export function FullScreenLoader() {
  return (
    <div className="grid min-h-screen place-items-center bg-espresso text-cream">
      <div className="flex flex-col items-center gap-4">
        <Stamp size={96} className="animate-pulse text-ember" />
        <span className="text-sm tracking-widest text-cream/60">LOADING…</span>
      </div>
    </div>
  )
}

export function Modal({ open, onClose, title, children, wide = false }: { open: boolean; onClose: () => void; title: string; children: ReactNode; wide?: boolean }) {
  useEffect(() => {
    if (!open) return
    const h = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [open, onClose])
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-espresso/60 p-0 backdrop-blur-sm sm:items-center sm:p-4" onClick={onClose}>
      <div
        className={`max-h-[92vh] w-full overflow-y-auto rounded-t-3xl bg-cream p-5 shadow-lift animate-fade-up sm:rounded-3xl sm:p-7 ${wide ? 'sm:max-w-2xl' : 'sm:max-w-lg'}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-xl font-bold">{title}</h2>
          <button className="btn-ghost !p-2" onClick={onClose} aria-label="ปิด"><X size={20} /></button>
        </div>
        {children}
      </div>
    </div>
  )
}

export function Empty({ icon, title, text, action }: { icon: ReactNode; title: string; text?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center rounded-3xl border-2 border-dashed border-cream-300 px-6 py-14 text-center">
      <div className="mb-4 grid h-16 w-16 place-items-center rounded-full bg-ember-100 text-ember">{icon}</div>
      <h3 className="text-lg font-bold">{title}</h3>
      {text && <p className="mt-1 max-w-sm text-sm text-ink-muted">{text}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}

export function SetupNotice() {
  return (
    <div className="grid min-h-screen place-items-center bg-espresso p-6 text-cream">
      <div className="max-w-lg text-center">
        <Stamp size={110} className="mx-auto mb-6 text-ember" />
        <h1 className="text-3xl font-bold">ยังไม่ได้เชื่อมต่อ Supabase</h1>
        <p className="mt-3 text-cream/70">
          สร้างไฟล์ <code className="rounded bg-white/10 px-1.5">.env.local</code> แล้วใส่ <code>VITE_SUPABASE_URL</code> และ{' '}
          <code>VITE_SUPABASE_ANON_KEY</code> (ดูวิธีใน README.md) หรือถ้าเป็นเว็บบน GitHub Pages ให้ตั้งค่าใน Repository Secrets
        </p>
      </div>
    </div>
  )
}
