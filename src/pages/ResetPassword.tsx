import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { KeyRound } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { Spinner, TopBar } from '../components/ui'

/** ตั้งรหัสผ่านใหม่ — ใช้ทั้งตอนเปลี่ยนรหัสจากเมนู และตอนกดลิงก์ "ลืมรหัสผ่าน" จากอีเมล */
export default function ResetPassword() {
  const nav = useNavigate()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (password !== confirm) return setError('รหัสผ่านทั้งสองช่องไม่ตรงกัน')
    setBusy(true)
    setError('')
    const { error } = await supabase.auth.updateUser({ password })
    setBusy(false)
    if (error) return setError(/should be different/i.test(error.message) ? 'รหัสใหม่ต้องไม่ซ้ำกับรหัสเดิม' : error.message)
    setDone(true)
    setTimeout(() => nav('/trips'), 1500)
  }

  return (
    <div className="min-h-screen">
      <TopBar />
      <main className="mx-auto max-w-sm px-4 py-14">
        <div className="mx-auto mb-5 grid h-14 w-14 place-items-center rounded-full bg-ember-100 text-ember"><KeyRound /></div>
        <h1 className="text-center text-2xl font-bold">ตั้งรหัสผ่านใหม่</h1>
        <form onSubmit={submit} className="mt-8 space-y-4">
          <div>
            <label className="label">รหัสผ่านใหม่</label>
            <input className="input" type="password" required minLength={6} autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="อย่างน้อย 6 ตัวอักษร" />
          </div>
          <div>
            <label className="label">ยืนยันรหัสผ่านใหม่</label>
            <input className="input" type="password" required minLength={6} autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
          </div>
          {error && <p className="rounded-xl bg-red-50 px-4 py-2.5 text-sm text-red-700">{error}</p>}
          {done && <p className="rounded-xl bg-lagoon-100 px-4 py-2.5 text-sm text-lagoon-600">เปลี่ยนรหัสผ่านเรียบร้อย ✅</p>}
          <button className="btn-primary w-full !py-3" disabled={busy || done}>{busy && <Spinner />} บันทึกรหัสผ่านใหม่</button>
          <Link to="/trips" className="block text-center text-sm text-ink-muted hover:underline">กลับหน้าทริปของฉัน</Link>
        </form>
      </main>
    </div>
  )
}
