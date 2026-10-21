import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import type { PassportRow } from '../lib/types'
import PassportView from '../components/PassportView'
import { FullScreenLoader, Logo, Stamp } from '../components/ui'

export default function PublicPassport() {
  const { slug } = useParams()
  const [row, setRow] = useState<PassportRow | null | undefined>(undefined)

  useEffect(() => {
    supabase.from('passports').select('*').eq('share_slug', slug).eq('is_public', true).maybeSingle()
      .then(({ data }) => setRow((data as PassportRow) ?? null))
  }, [slug])

  useEffect(() => {
    if (row) document.title = `${row.data.tripTitle} · Passport AI`
  }, [row])

  if (row === undefined) return <FullScreenLoader />
  if (row === null)
    return (
      <div className="grid min-h-screen place-items-center bg-espresso p-6 text-center text-cream">
        <div>
          <Stamp size={120} top="NOT" bottom="FOUND" className="mx-auto text-ember" />
          <h1 className="mt-6 text-2xl font-bold">ไม่พบ Passport นี้</h1>
          <p className="mt-2 text-cream/60">ลิงก์อาจไม่ถูกต้อง หรือเจ้าของปิดการแชร์ไปแล้ว</p>
          <Link to="/" className="btn-primary mt-6">ไปหน้าแรก Passport AI</Link>
        </div>
      </div>
    )

  return (
    <div className="min-h-screen paper">
      <header className="no-print mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
        <Logo />
        <Link to="/register" className="btn-primary">สร้าง Passport ของคุณ</Link>
      </header>
      <main className="mx-auto max-w-6xl px-3 pb-16 sm:px-4">
        <PassportView data={row.data} />
      </main>
    </div>
  )
}
