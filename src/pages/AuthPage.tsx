import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Logo, Spinner, Stamp } from '../components/ui'

export default function AuthPage({ mode }: { mode: 'login' | 'register' }) {
  const nav = useNavigate()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(() => {
    const e = sessionStorage.getItem('pai_auth_error') ?? ''
    sessionStorage.removeItem('pai_auth_error')
    return e
  })
  const [info, setInfo] = useState('')
  const isLogin = mode === 'login'

  async function forgot() {
    if (!email) return setError('กรอกอีเมลก่อน แล้วกด “ลืมรหัสผ่าน?” อีกครั้ง')
    setBusy(true)
    setError('')
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin + window.location.pathname })
    setBusy(false)
    if (error) setError(/rate limit/i.test(error.message) ? 'ส่งอีเมลบ่อยเกินไป กรุณารอสักครู่แล้วลองใหม่' : error.message)
    else setInfo('ส่งลิงก์ตั้งรหัสผ่านใหม่ไปที่อีเมลแล้ว (ถ้าอีเมลนี้มีบัญชีอยู่) กรุณาเช็คกล่องจดหมาย')
  }

  async function submit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError('')
    setInfo('')
    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        nav('/trips')
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { display_name: name.trim() }, emailRedirectTo: window.location.origin + window.location.pathname },
        })
        if (error) throw error
        // Supabase ตอบ "สำเร็จ" แต่ไม่ส่งอีเมล ถ้าอีเมลนี้สมัครไว้แล้ว (identities จะว่าง)
        if (data.user && data.user.identities?.length === 0) throw new Error('already registered')
        if (data.session) nav('/trips')
        else setInfo('สมัครสำเร็จ! กรุณากดยืนยันอีเมลในกล่องจดหมายของคุณ แล้วกลับมาเข้าสู่ระบบ')
      }
    } catch (err) {
      const msg = (err as Error).message
      setError(
        /Invalid login/i.test(msg) ? 'อีเมลหรือรหัสผ่านไม่ถูกต้อง'
        : /Email not confirmed/i.test(msg) ? 'ยังไม่ได้ยืนยันอีเมล — กรุณาเช็คกล่องจดหมาย'
        : /already registered/i.test(msg) ? 'อีเมลนี้สมัครไว้แล้ว — กด “เข้าสู่ระบบ” ด้านล่างได้เลย'
        : /rate limit/i.test(msg) ? 'ส่งอีเมลบ่อยเกินไป กรุณารอสักครู่แล้วลองใหม่'
        : /Password should be/i.test(msg) ? 'รหัสผ่านต้องยาวอย่างน้อย 6 ตัวอักษร'
        : msg,
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="grid min-h-screen md:grid-cols-2">
      <div className="relative hidden flex-col justify-between overflow-hidden bg-[linear-gradient(160deg,#2C2119_40%,#7A3B1F_100%)] p-10 text-cream md:flex">
        <Logo dark />
        <div>
          <Stamp size={180} className="mb-8 -rotate-12 text-ember" />
          <h2 className="text-4xl font-bold leading-tight">ทุกทริป<br />สมควรได้มี Passport<br />เป็นของตัวเอง</h2>
          <p className="mt-4 max-w-sm text-cream/60">จดง่ายๆ ผ่านแชทระหว่างเที่ยว แล้วให้ AI ทำสมุดความทรงจำให้ตอนจบทริป</p>
        </div>
        <p className="text-xs text-cream/40">© Passport AI</p>
      </div>

      <div className="flex flex-col justify-center px-6 py-12 sm:px-12">
        <div className="mb-10 md:hidden"><Logo /></div>
        <div className="mx-auto w-full max-w-sm">
          <h1 className="text-3xl font-bold">{isLogin ? 'ยินดีต้อนรับกลับมา 👋' : 'สร้างบัญชีใหม่ ✈️'}</h1>
          <p className="mt-2 text-sm text-ink-muted">{isLogin ? 'เข้าสู่ระบบเพื่อดูทริปและ Passport ของคุณ' : 'ใช้เวลาไม่ถึงนาที แล้วเริ่มจดทริปแรกได้เลย'}</p>

          <form onSubmit={submit} className="mt-8 space-y-4">
            {!isLogin && (
              <div>
                <label className="label">ชื่อที่จะแสดงใน Passport</label>
                <input className="input" required value={name} onChange={(e) => setName(e.target.value)} placeholder="เช่น ข้าวตัง" />
              </div>
            )}
            <div>
              <label className="label">อีเมล</label>
              <input className="input" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
            </div>
            <div>
              <label className="label">รหัสผ่าน</label>
              <input className="input" type="password" required minLength={6} autoComplete={isLogin ? 'current-password' : 'new-password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="อย่างน้อย 6 ตัวอักษร" />
            </div>
            {isLogin && (
              <div className="-mt-2 text-right">
                <button type="button" onClick={forgot} className="text-sm text-ink-muted hover:text-ember hover:underline">ลืมรหัสผ่าน?</button>
              </div>
            )}
            {error && <p className="rounded-xl bg-red-50 px-4 py-2.5 text-sm text-red-700">{error}</p>}
            {info && <p className="rounded-xl bg-lagoon-100 px-4 py-2.5 text-sm text-lagoon-600">{info}</p>}
            <button className="btn-primary w-full !py-3" disabled={busy}>
              {busy && <Spinner />} {isLogin ? 'เข้าสู่ระบบ' : 'สมัครสมาชิก'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-ink-muted">
            {isLogin ? 'ยังไม่มีบัญชี? ' : 'มีบัญชีอยู่แล้ว? '}
            <Link to={isLogin ? '/register' : '/login'} className="font-semibold text-ember hover:underline">
              {isLogin ? 'สมัครสมาชิก' : 'เข้าสู่ระบบ'}
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
