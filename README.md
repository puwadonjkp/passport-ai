# 🛂 Passport AI — หนังสือเดินทางแห่งความทรงจำ

> AI for Business Strategy · Final Project
> ภูวดล จงกลแพทย์ (69076056) · วุฒิเมศร์ วรรณดนัยพงศ์ (69076064) · ศุภวิชญ์ การัณย์ศิริ (69076067)

| | |
|---|---|
| 🌐 **เว็บใช้งานจริง** | https://puwadonjkp.github.io/passport-ai/ |
| 💻 **Source code** | https://github.com/puwadonjkp/passport-ai |

เว็บแอปที่ให้นักเดินทาง **จดค่าใช้จ่ายผ่านแชทระหว่างทริป** เก็บรูปและตั๋วไว้ในทริปเดียว ชวนเพื่อนมาจดด้วยกันและหารเงินอัตโนมัติ
พอจบทริป AI 5 ตัวจะสร้าง **Travel Passport** ที่มีเรื่องเล่า แผนที่เส้นทาง รูปไฮไลต์ และสรุปค่าใช้จ่าย พร้อมลิงก์แชร์

---

## 🧪 ลองใช้ใน 5 นาที (สำหรับผู้ตรวจ)

1. เปิด https://puwadonjkp.github.io/passport-ai/ แล้วกด **เริ่มใช้งานฟรี** เพื่อสมัครสมาชิก (หรือใช้บัญชีทดลองที่แนบมากับงาน)
2. **สร้างทริปใหม่** ใส่ชื่อทริปและวันที่
3. แท็บ **💬 แชท** พิมพ์ เช่น `ราเมง 2 ชาม 1,800 เยน, กาแฟ 480 เยน` → AI แยกเป็น 2 รายการ จัดหมวด และแปลงเป็นเงินบาทให้
4. แท็บ **🖼️ คลังรูป** อัปโหลดรูปจากมือถือที่มี GPS (รองรับ HEIC จาก iPhone)
5. แท็บ **🛂 Passport** กด **สร้าง Passport เลย** → ดู Agent 5 ตัวทำงาน แล้วได้หน้า Passport ที่แชร์ลิงก์ได้

---

## ✨ ฟีเจอร์

| หน้า | ทำอะไรได้ |
|---|---|
| **สมาชิก** | สมัคร / เข้าสู่ระบบด้วยอีเมล, ลืมรหัสผ่าน, เปลี่ยนรหัสผ่าน (Supabase Auth) |
| **ทริปของฉัน** | สร้าง / แก้ไข / ลบทริป ตั้งงบ สกุลเงินหลัก ไปกับใคร โทนการเล่าเรื่อง และธีมสี Passport |
| **💬 แชทจดทริป** | พิมพ์ภาษาคน → AI แยกรายจ่ายหลายรายการ จัดหมวด แปลงสกุลเงิน · ส่งรูปใบเสร็จให้ AI อ่านยอด · เล่าเรื่องระหว่างทาง AI เก็บเป็น “ความทรงจำ” ไว้เขียน Passport · ถาม “วันนี้ใช้ไปเท่าไหร่” ได้ · ถ้ายังไม่ตั้ง AI ใช้ตัวแยกรายจ่ายแบบออฟไลน์แทน |
| **🖼️ คลังรูป** | อัปโหลดทีละหลายร้อยรูป รองรับ HEIC จาก iPhone · อ่านวันเวลา + GPS จาก EXIF · จัดกลุ่มตามวัน · ติดดาวไฮไลต์ · ตั้งรูปปก · ข้ามรูปซ้ำอัตโนมัติ |
| **✈️ ตั๋ว / ที่พัก** | อัปโหลด Boarding Pass / E-Ticket / ใบจองโรงแรม (รูปหรือ PDF) → AI อ่านเที่ยวบิน เวลา ที่นั่ง ชื่อโรงแรม วันเช็คอิน และราคา · บันทึกราคาเป็นรายจ่ายได้ในคลิกเดียว · แนะนำปรับวันทริปตามตั๋ว · กรอกเองได้ |
| **💰 ค่าใช้จ่าย** | สรุปรายหมวด รายวัน เทียบงบ · แก้ไข / ลบ / เพิ่มเอง · Export CSV |
| **👥 ทริปร่วมกับเพื่อน** | ชวนเพื่อนด้วยลิงก์ · ทุกคนแชท จดรายจ่าย อัปรูปในทริปเดียวกันแบบ realtime · บอก AI ได้ว่า “ไปป์จ่ายค่าแท็กซี่” · สรุป **ใครต้องโอนให้ใคร** แบบโอนน้อยครั้งที่สุด |
| **🛂 Passport** | Agent 5 ตัวสร้างหน้า Passport: ปก, Day cards, แผนที่เส้นทาง + ฟิลเตอร์รายวัน, ตราประทับเมือง, ข้อมูลเที่ยวบิน/ที่พัก, เรื่องเล่า, รูปไฮไลต์ + แคปชัน AI, Travel Intelligence, สรุปหารเงิน · แชร์ลิงก์สาธารณะ หรือพิมพ์เป็น PDF |

### Agent ทั้ง 5 (ตามสไลด์นำเสนอ)

| Agent | ทำงานที่ | รายละเอียด |
|---|---|---|
| 01 Travel Memory Collection | `src/lib/image.ts`, `src/lib/heifExif.ts`, `src/lib/geo.ts`, `src/lib/documents.ts` | อ่าน EXIF (รวม HEIC), จัดกลุ่มรูปเป็น “จุดแวะ” (รัศมี 300 ม.), แปลงพิกัดเป็นชื่อสถานที่ (กรองอักษรจีน/ญี่ปุ่น/เกาหลี 2 ชั้น), อ่านตั๋ว/ใบจอง และดึงบันทึกจากแชท |
| 02 Travel Story Generation | `supabase/functions/ai` (`story`, `caption`) | AI เขียนชื่อทริป คำโปรย เรื่องเล่ารายวัน และมองรูปไฮไลต์แล้วเขียนแคปชัน |
| 03 Travel Intelligence | `src/lib/pipeline.ts`, `src/lib/settle.ts` | คำนวณรายหมวด รายวัน ระยะทาง ค่าเฉลี่ย เทียบงบ หารเงิน + AI insight |
| 04 Travel Passport Builder | `src/components/PassportView.tsx` | ประกอบเป็นหน้า responsive พร้อมธีมสี 5 แบบ |
| 05 Memory Preservation | ตาราง `passports` | บันทึกถาวร + ลิงก์แชร์ (`#/p/<slug>`) |

ทุกขั้นที่ใช้ AI มี **โหมดสำรองแบบไม่ใช้ AI** (พอร์ตจาก Mock ใน `legacy/app_v022.py`) ระบบจึงใช้งานได้แม้ AI ล่มหรือยังไม่ได้ตั้ง API Key

---

## 💻 รันในเครื่อง (ต้องมี Node.js 20 ขึ้นไป)

```bash
git clone https://github.com/puwadonjkp/passport-ai.git
cd passport-ai
npm install
npm run dev                  # เปิด http://localhost:5173/passport-ai/
```

ไม่ต้องตั้งค่าอะไรเพิ่ม: ไฟล์ `.env` ใน repo ชี้ไปที่ฐานข้อมูล Supabase ตัวจริงของโปรเจกต์อยู่แล้ว
(ถ้าจะใช้ Supabase ของตัวเอง ให้คัดลอก `.env.example` เป็น `.env.local` แล้วใส่ค่าใหม่ — ดูหัวข้อถัดไป)

คำสั่งอื่น: `npm run build` (สร้างไฟล์สำหรับ deploy ไว้ที่ `dist/`) · `npm run preview` (เปิดดูไฟล์ที่ build แล้ว)

---

## 🧱 Tech Stack และโครงสร้าง

React 18 + TypeScript + Vite + Tailwind · Supabase (Postgres, Auth, Storage, Realtime, Edge Functions) · Google Gemini หรือ Claude · Leaflet + OpenStreetMap · exifr + heic-to · GitHub Pages (GitHub Actions)

```
src/
  pages/        Landing, AuthPage, ResetPassword, Dashboard, TripPage, JoinPage, PublicPassport
  components/   ChatTab, PhotosTab, DocumentsTab, ExpensesTab, PassportTab, PassportView,
                MembersModal, TripMap, AgentLoader, TripFormModal, ui
  lib/          pipeline.ts (Agent 01–05), ai.ts, image.ts, heifExif.ts, geo.ts, documents.ts,
                settle.ts (หารเงิน), expenseParser.ts (ตัวแยกรายจ่ายออฟไลน์), currency.ts, photos.ts
supabase/
  migrations/001_init.sql                   ตารางหลัก + RLS + Storage bucket
  migrations/002_shared_trips_documents.sql สมาชิกทริป, ลิงก์ชวน, หารเงิน, เอกสารเดินทาง, Realtime
  functions/ai/index.ts                     Edge Function เรียก Gemini/Claude (chat, story, caption, document)
docs/
  break-even-chart.png, break_even_model.py กราฟและโมเดลคำนวณจุดคุ้มทุน (Business Plan)
legacy/                                     Streamlit app_v022.py เวอร์ชันเดิม + version log (v001–v022)
```

---

## 🚀 ติดตั้งเองตั้งแต่ศูนย์ (ใช้ Supabase ของตัวเอง)

### 1) Supabase
1. สร้างโปรเจกต์ที่ [supabase.com](https://supabase.com)
2. **SQL Editor** → รัน `supabase/migrations/001_init.sql` แล้วตามด้วย `002_shared_trips_documents.sql` ตามลำดับ
3. **Edge Functions** → Deploy function ชื่อ `ai` จาก `supabase/functions/ai/index.ts` (หรือ CLI: `supabase functions deploy ai`)
4. **Edge Functions → Secrets** ใส่ key อย่างใดอย่างหนึ่ง:
   - `GEMINI_API_KEY` — ขอฟรีได้ที่ [aistudio.google.com/apikey](https://aistudio.google.com/apikey)
   - หรือ `ANTHROPIC_API_KEY` — จาก [console.anthropic.com](https://console.anthropic.com)
   - (ไม่บังคับ) `GEMINI_MODEL` / `CLAUDE_MODEL` เพื่อเปลี่ยนรุ่นโมเดลโดยไม่ต้องแก้โค้ด
5. **Authentication → URL Configuration** ตั้ง Site URL และ Redirect URLs เป็นที่อยู่เว็บของคุณ
   (ถ้าอยากให้สมัครแล้วใช้ได้ทันทีตอนเดโม: Authentication → Sign In / Providers → Email → ปิด *Confirm email*)
6. นำ Project URL และ Publishable key ไปใส่ใน `.env.local` (รันในเครื่อง) หรือแก้ `.env` (ตอน deploy)

### 2) Deploy หน้าเว็บ
- **GitHub Pages** (ใช้อยู่ตอนนี้): Repo → Settings → Pages → Source: **GitHub Actions** แล้ว push เข้า `main` ระบบ build และ deploy ให้อัตโนมัติ
- **ถ้าจะใช้เชิงพาณิชย์:** GitHub Pages ไม่อนุญาตให้ใช้กับธุรกิจ/SaaS ให้ย้ายไป **Cloudflare Pages** (Build command `npm run build`, Output `dist`, ตั้ง environment variable `VITE_BASE_PATH=/`) แล้วแก้ Site URL ใน Supabase ให้ตรงกับโดเมนใหม่

---

## 🔒 ความปลอดภัย
- **Row Level Security ทุกตาราง:** ผู้ใช้เห็นเฉพาะทริปที่ตัวเองเป็นเจ้าของหรือเป็นสมาชิก คนนอกเห็นได้แค่ Passport ที่เจ้าของเปิดแชร์
- **สิทธิ์ในทริป:** เฉพาะเจ้าของทริปที่แก้ไข / ลบทริป และเอาสมาชิกออกได้ · มี trigger กันการใส่ข้อมูลเข้าทริปที่ไม่ได้เป็นสมาชิก
- **API Key ของ AI** อยู่ใน Edge Function Secrets เท่านั้น ไม่ถูกส่งไป Browser และเรียกได้เฉพาะผู้ที่ล็อกอิน
- **Storage:** อัปโหลด / ลบได้เฉพาะในโฟลเดอร์ทริปที่เป็นสมาชิก ไฟล์รูปอ่านได้ผ่าน URL ที่เป็น UUID (เพื่อให้ลิงก์แชร์ Passport แสดงรูปได้)
- **Key ในไฟล์ `.env`** เป็น publishable key ที่ออกแบบมาให้เปิดเผยได้ ข้อมูลถูกป้องกันด้วย RLS ด้านบน

---

## 📊 Business Plan (เอกสารประกอบ)
- `docs/break-even-chart.png` — กราฟรายรับ / รายจ่าย / กำไรต่อเดือน: ต้นทุนคงที่ ~900 บาท/เดือน **คุ้มทุนที่ 7 ทริป/เดือน**
- `docs/break_even_model.py` — โมเดลคำนวณ ปรับสมมติฐานได้ (ราคาแพ็กเกจ, สัดส่วนผู้ใช้ฟรี, การใช้งานต่อทริป)

## ⚠️ ข้อจำกัดที่ทราบ
- การแปลงพิกัดเป็นชื่อสถานที่ใช้เซิร์ฟเวอร์สาธารณะของ OpenStreetMap (จำกัด 1 ครั้ง/วินาที) เหมาะกับการใช้งานระดับเดโม ถ้าผู้ใช้เยอะควรเปลี่ยนเป็นแคชกลาง + ผู้ให้บริการเชิงพาณิชย์
- ระบบแพ็กเกจ / โควตา / การรับชำระเงิน ยังอยู่ในแผนธุรกิจ ยังไม่ได้ทำในเว็บ
- ถ้าเพื่อนในทริป **ลบ** รายการ หน้าจอของคนอื่นจะอัปเดตเมื่อรีเฟรช (การเพิ่มและแก้ไขอัปเดตทันที)
- Supabase แผนฟรีจะ Pause โปรเจกต์อัตโนมัติถ้าไม่มีการใช้งาน 7 วัน
