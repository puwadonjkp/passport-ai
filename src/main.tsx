import React from 'react'
import ReactDOM from 'react-dom/client'
import 'leaflet/dist/leaflet.css'
import './index.css'
import App from './App'
import { isConfigured, supabase } from './lib/supabase'

// ลิงก์ยืนยันอีเมลจาก Supabase จะกลับมาพร้อม token ใน "#access_token=..." ซึ่งชนกับ HashRouter (#/...)
// จึงให้ Supabase อ่าน token ให้เสร็จก่อน แล้วค่อยเปลี่ยน URL ไปหน้าที่ถูกต้อง ก่อนเริ่มแสดงผลแอป
async function handleAuthRedirect() {
  const hash = window.location.hash
  const base = window.location.pathname + window.location.search
  if (/error_description=/.test(hash)) {
    const msg = new URLSearchParams(hash.slice(1)).get('error_description') ?? ''
    sessionStorage.setItem('pai_auth_error', /expired|invalid/i.test(msg) ? 'ลิงก์ยืนยันหมดอายุหรือถูกใช้ไปแล้ว — ถ้าเคยกดยืนยันแล้ว ลองเข้าสู่ระบบได้เลย' : msg)
    history.replaceState(null, '', base + '#/login')
  } else if ((/access_token=|refresh_token=/.test(hash) || /[?&]code=/.test(window.location.search)) && isConfigured) {
    await supabase.auth.getSession()
    history.replaceState(null, '', window.location.pathname + '#/trips')
  }
}

handleAuthRedirect().finally(() =>
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  ),
)
