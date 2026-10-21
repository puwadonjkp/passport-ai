# 🛂 Passport AI — หนังสือเดินทางแห่งความทรงจำ

> AI for Business Strategy · Final Project
> ภูวดล จงกลแพทย์ (69076056) · วุฒิเมศร์ วรรณดนัยพงศ์ (69076064) · ศุภวิชญ์ การัณย์ศิริ (69076067)

เว็บแอปที่ให้นักเดินทาง **จดค่าใช้จ่ายผ่านแชทระหว่างทริป** อัปโหลดรูปเก็บไว้ในคลังของแต่ละทริป
แล้วพอจบทริป AI 5 ตัวจะสร้าง **Travel Passport** ที่มีเรื่องเล่า แผนที่ รูปไฮไลต์ และสรุปค่าใช้จ่ายให้อัตโนมัติ พร้อมลิงก์แชร์

## ✨ ฟีเจอร์

| หน้า | ทำอะไรได้ |
|---|---|
| **Login / Register** | ระบบสมาชิกด้วยอีเมล + รหัสผ่าน (Supabase Auth) ข้อมูลแยกตามผู้ใช้ด้วย Row Level Security |
| **ทริปของฉัน** | สร้าง/แก้ไข/ลบทริป ตั้งงบ สกุลเงินหลัก ไปกับใคร โทนการเล่าเรื่อง และธีมสี Passport |
| **💬 แชทจดทริป** | พิมพ์ภาษาคน เช่น `ราเมง 2 ชาม 1,800 เยน, กาแฟ 480 เยน` → AI แยกรายการ จัดหมวด แปลงเป็นเงินบาทให้อัตโนมัติ · ส่งรูปใบเสร็จให้ AI อ่านยอด · เล่าเรื่องระหว่างทาง AI จะเก็บเป็น “ความทรงจำ” ไว้เขียน Passport · ถามได้ว่า “วันนี้ใช้ไปเท่าไหร่แล้ว” |
| **🖼️ คลังรูป** | อัปโหลดทีละหลายร้อยรูป (รองรับ HEIC จาก iPhone) เก็บใน Storage โฟลเดอร์ `<user>/<trip>/` อ่านวันเวลา + GPS จาก EXIF จัดกลุ่มตามวัน ติดดาวไฮไลต์ ตั้งรูปปก |
| **💰 ค่าใช้จ่าย** | สรุปรายหมวด รายวัน เทียบงบ แก้ไข/ลบ/เพิ่มเอง และ Export CSV |
| **🛂 Passport** | กดปุ่มเดียว → Agent 5 ตัวทำงาน → ได้หน้า Passport (ปก, Day cards, แผนที่เส้นทาง + ฟิลเตอร์รายวัน, ตราประทับเมือง, เรื่องเล่า, รูปไฮไลต์ + แคปชัน AI, Travel Intelligence) แชร์ลิงก์สาธารณะ หรือพิมพ์เป็น PDF |

### Agent ทั้ง 5 (ตามสไลด์นำเสนอ)

| Agent | ทำงานที่ | รายละเอียด |
|---|---|---|
| 01 Travel Memory Collection | `src/lib/image.ts`, `src/lib/geo.ts` | อ่าน EXIF, จัดกลุ่มรูปเป็น “จุดแวะ” (รัศมี 300 ม.), แปลงพิกัดเป็นชื่อสถานที่ (Nominatim, กรองอักษรจีน/ญี่ปุ่น/เกาหลี 2 ชั้น) + ดึงบันทึกจากแชท |
| 02 Travel Story Generation | `supabase/functions/ai` (`story`, `caption`) | AI เขียนชื่อทริป คำโปรย เรื่องเล่ารายวัน และมองรูปไฮไลต์เขียนแคปชัน |
| 03 Travel Intelligence | `src/lib/pipeline.ts` | คำนวณรายหมวด รายวัน ระยะทาง ค่าเฉลี่ย เทียบงบ + AI insight |
| 04 Travel Passport Builder | `src/components/PassportView.tsx` | ประกอบเป็นหน้า responsive พร้อมธีมสี 5 แบบ |
| 05 Memory Preservation | ตาราง `passports` | บันทึกถาวร + share link (`#/p/<slug>`) |

ทุกขั้นที่ใช้ AI มี **โหมดสำรองแบบไม่ใช้ AI** (พอร์ตจาก Mock ใน `legacy/app_v022.py`) ระบบจึงใช้งานได้แม้ยังไม่ตั้ง API Key

## 🧱 Tech Stack

React 18 + TypeScript + Vite + Tailwind · Supabase (Postgres, Auth, Storage, Edge Functions) · Google Gemini หรือ Claude · Leaflet + OpenStreetMap · exifr + heic2any · GitHub Pages (GitHub Actions)

```
src/
  pages/        Landing, AuthPage, Dashboard, TripPage, PublicPassport
  components/   ChatTab, PhotosTab, ExpensesTab, PassportTab, PassportView, TripMap, AgentLoader, ...
  lib/          pipeline.ts (Agent 01–05), geo.ts, image.ts, expenseParser.ts, currency.ts, ai.ts
supabase/
  migrations/001_init.sql   ตาราง + RLS + Storage bucket
  functions/ai/index.ts     Edge Function เรียก Gemini/Claude (เก็บ API Key ฝั่ง Server)
legacy/                     Streamlit app_v022.py เวอร์ชันเดิม + version log
```

## 🚀 ติดตั้งและ Deploy

### 1) Supabase
1. สร้างโปรเจกต์ที่ [supabase.com](https://supabase.com) (ฟรี)
2. **SQL Editor** → วางไฟล์ `supabase/migrations/001_init.sql` ทั้งไฟล์ แล้วกด Run
3. **Edge Functions** → Deploy function ชื่อ `ai` จาก `supabase/functions/ai/index.ts`
   (หรือใช้ CLI: `supabase functions deploy ai`)
4. **Edge Functions → Secrets** ใส่ key อย่างใดอย่างหนึ่ง:
   - `GEMINI_API_KEY` — ฟรี ไม่ต้องผูกบัตร ขอได้ที่ [aistudio.google.com/apikey](https://aistudio.google.com/apikey)
   - หรือ `ANTHROPIC_API_KEY` — จาก [console.anthropic.com](https://console.anthropic.com)
   - (ไม่บังคับ) `GEMINI_MODEL` / `CLAUDE_MODEL` เพื่อเปลี่ยนรุ่นโมเดลโดยไม่ต้องแก้โค้ด
5. **Authentication → URL Configuration** ตั้ง Site URL เป็น `https://<username>.github.io/passport-ai/`
   (ถ้าอยากให้สมัครแล้วใช้ได้ทันทีตอนเดโม: Authentication → Sign In / Providers → Email → ปิด *Confirm email*)

### 2) GitHub Pages
1. Repo → **Settings → Pages** → Source: **GitHub Actions**
2. **Settings → Secrets and variables → Actions → Variables** เพิ่ม
   - `VITE_SUPABASE_URL` = Project URL
   - `VITE_SUPABASE_ANON_KEY` = Publishable (anon) key
3. Push เข้า `main` → เว็บจะขึ้นที่ `https://<username>.github.io/passport-ai/`

### รันในเครื่อง
```bash
cp .env.example .env.local   # ใส่ค่า Supabase
npm install
npm run dev                  # http://localhost:5173/passport-ai/
```

## 🔒 ความปลอดภัย
- ทุกตารางเปิด RLS — ผู้ใช้เห็นเฉพาะข้อมูลของตัวเอง, trigger กันการผูกข้อมูลเข้าทริปของคนอื่น
- API Key ของ AI อยู่ใน Edge Function Secrets เท่านั้น ไม่ถูกส่งไป Browser และเรียกได้เฉพาะผู้ที่ล็อกอิน
- Storage อัปโหลด/ลบได้เฉพาะโฟลเดอร์ของตัวเอง; ไฟล์รูปอ่านได้ผ่าน URL ที่เป็น UUID (เพื่อให้ลิงก์แชร์ Passport แสดงรูปได้)
