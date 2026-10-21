"""
PassportAI - Streamlit Demo App
================================
รันด้วยคำสั่ง:  streamlit run app.py
(หรือถ้า streamlit ไม่ถูกจดจำ ให้ใช้: python -m streamlit run app.py)

STATUS ของแต่ละ Agent ในเวอร์ชันนี้ (app_v021):
  Agent 01 (Memory Collection)     -> ✅ ของจริงแล้ว! อ่าน EXIF จริงจากรูป (รองรับ .heic จาก iPhone ด้วย)
                                        + แปลงพิกัดเป็นชื่อสถานที่จริง พร้อมระบบกรองภาษาแบบ 2 ชั้น
                                        (บังคับให้เป็นไทย/อังกฤษเท่านั้น ไม่มีอักษรจีน/ญี่ปุ่น/เกาหลีหลุดออกมา)
  Agent 02 (Story Generation)      -> ✅ เชื่อม AI จริงแล้ว! เลือกได้ 2 ค่าย + เลือกโทนแคปชันได้ 4 แบบ
  Agent 03 (Travel Intelligence)   -> 🟡 Mock (ข้อความ) แต่คำนวณจากค่าใช้จ่ายจริงที่ผู้ใช้กรอกแล้ว
  Agent 04 (Passport Builder)      -> 🟢 ประกอบข้อมูลจริง + Merge ผลลัพธ์ AI เข้ากับ Mock อย่างชาญฉลาด
  Agent 05 (Photo Vision Caption)  -> ✅ ให้ AI "มองภาพ" รูปไฮไลต์ทีละรูป แล้วเขียน Caption ตามโทนที่เลือก

อัปเดตใน v021 — "แก้ภาษาจีนหลุดจริงจัง + ปรับข้อความ Mock ให้เหมาะกับลูกค้า":
  1. แก้บั๊กที่ v019 แก้ไม่หมด: ครั้งก่อนใส่ accept-language=th ให้ Nominatim เพียงภาษาเดียว
     พอสถานที่นั้นไม่มีชื่อแปลไทยในฐานข้อมูล OpenStreetMap (พบบ่อยกับสถานที่เล็กๆ ในจีน/ญี่ปุ่น) ระบบจะดีดกลับไปใช้
     ชื่อภาษาท้องถิ่นทันที (ข้ามอังกฤษไปเลย) ตอนนี้แก้เป็น 2 ชั้นป้องกัน:
       ชั้นที่ 1: ส่ง accept-language="th,en;q=0.5" ให้ Nominatim ลองภาษาไทยก่อน แล้ว Fallback เป็นอังกฤษ
                 (ยืนยันจาก Nominatim source code ว่ารองรับ Accept-Language แบบมาตรฐาน RFC2616 พร้อม q-value)
       ชั้นที่ 2 (Safety Net): ตรวจับด้วย Regex ว่ามีอักษรจีน/ญี่ปุ่น/เกาหลีปนอยู่ไหม (แม้ Nominatim จะพยายามแปลแล้ว
                 แต่บางสถานที่ไม่มีทั้งชื่อไทยและอังกฤษในฐานข้อมูลเลยจริงๆ) ถ้าพบ จะ "ตัดทิ้ง" Field นั้นแล้ว Fallback
                 ไปใช้ Field ที่กว้างกว่า (เช่น place ไม่มีทั้งไทย-อังกฤษ -> ใช้ city แทน) ไล่ไปจนถึงพิกัดดิบเป็นที่สุดท้าย
                 รับประกันว่าลูกค้าจะไม่เห็นอักษรที่อ่านไม่ออกอีกต่อไป
  2. ปรับข้อความ Fallback ในหน้าเว็บ Travel Passport (ที่จะแชร์ให้ลูกค้า/เพื่อนดู) จากเดิมที่เขียนว่า
     "(Mock — ยังไม่ได้เชื่อม AI จริง)" ซึ่งเป็นข้อความสำหรับ Debug ฝั่งนักพัฒนา ไม่เหมาะจะให้ลูกค้าเห็น
     เปลี่ยนเป็นข้อความที่เป็นธรรมชาติ ไม่มีศัพท์เทคนิค "Mock/AI" ปนอยู่เลย (ตามแนวทางเดียวกับ v018 ที่เอาป้าย
     AI Badge ออกจากหน้าเว็บลูกค้าไปแล้ว)

ก่อนรันครั้งแรก ต้องติดตั้ง library เพิ่มเติม (นอกจาก streamlit):
    pip install pillow requests pillow-heif pypdf python-dateutil pandas

(ไม่บังคับ — เลือกติดตั้งเฉพาะค่ายที่จะใช้ก็ได้ ดูวิธีเชื่อมต่อในหัวข้อ "🤖 เชื่อมต่อ AI" ในแอป)
    pip install anthropic        # ถ้าจะใช้ Claude (ต้องมีเครดิตเงินในบัญชี Anthropic)
    pip install google-genai     # ถ้าจะใช้ Google Gemini (ฟรี ไม่ต้องผูกบัตร แนะนำสำหรับมือใหม่)

(ไม่บังคับ — เสริมความสามารถ) ถ้าอยากให้ระบบ "อ่านวันที่อัตโนมัติจากรูปภาพ" Boarding Pass ได้ด้วย
(นอกเหนือจากไฟล์ PDF) ให้ติดตั้งเพิ่มอีก 2 อย่าง:
    1. pip install pytesseract
    2. ติดตั้งโปรแกรม Tesseract-OCR ในเครื่อง (ดาวน์โหลดจาก https://github.com/UB-Mannheim/tesseract/wiki สำหรับ Windows)
    ถ้าไม่ติดตั้งก็ไม่เป็นไร แอปยังใช้งานได้ปกติ แค่จะอ่านอัตโนมัติได้เฉพาะไฟล์ PDF เท่านั้น
"""

import base64
import html
import io
import json
import re
import time
from collections import Counter
from datetime import datetime, timedelta
from fractions import Fraction
from math import atan2, cos, radians, sin, sqrt

import pandas as pd
import requests
import streamlit as st
import streamlit.components.v1 as components
from dateutil import parser as dtparser
from PIL import Image
from PIL.ExifTags import IFD

# ============================================================
# รองรับไฟล์ HEIC/HEIF (ฟอร์แมตเริ่มต้นของกล้อง iPhone)
# ============================================================
try:
    from pillow_heif import register_heif_opener
    register_heif_opener()
    HEIC_SUPPORTED = True
except ImportError:
    HEIC_SUPPORTED = False

# ============================================================
# รองรับการอ่านไฟล์ PDF (สำหรับ E-Itinerary / Boarding Pass แบบ PDF)
# ============================================================
try:
    import pypdf
    PDF_SUPPORTED = True
except ImportError:
    PDF_SUPPORTED = False


def _ocr_available():
    """เช็คว่าเครื่องนี้มีทั้ง pytesseract (python package) และ Tesseract-OCR (โปรแกรมจริง) ครบหรือไม่"""
    try:
        import pytesseract
        pytesseract.get_tesseract_version()
        return True
    except Exception:
        return False


# ============================================================
# 🤖 รองรับการเชื่อมต่อ AI จริง 2 ค่าย: Claude (Anthropic) และ Google Gemini
# ============================================================
try:
    import anthropic
    ANTHROPIC_SDK_AVAILABLE = True
except ImportError:
    ANTHROPIC_SDK_AVAILABLE = False

try:
    from google import genai as google_genai
    from google.genai import types as google_genai_types
    GEMINI_SDK_AVAILABLE = True
except ImportError:
    GEMINI_SDK_AVAILABLE = False

CLAUDE_MODEL_OPTIONS = {
    "Claude Sonnet 4.5 (คุณภาพสูง เหมาะกับงานเขียนเชิงสร้างสรรค์)": "claude-sonnet-4-5-20250929",
    "Claude Haiku 4.5 (เร็ว ประหยัดกว่า)": "claude-haiku-4-5-20251001",
}
GEMINI_MODEL_OPTIONS = {
    "Gemini 3.5 Flash-Lite (แนะนำ — โควตาฟรีต่อวันเยอะที่สุด เหมาะทดสอบซ้ำๆ)": "gemini-3.5-flash-lite",
    "Gemini 3.6 Flash (คุณภาพดีกว่า แต่โควตาฟรีต่อวันน้อยกว่า)": "gemini-3.6-flash",
}
CUSTOM_MODEL_LABEL = "🔧 อื่นๆ (พิมพ์ Model ID เอง)"
# ⚠️ หมายเหตุสำคัญ: ทั้ง Google และ Anthropic เปลี่ยนชื่อรุ่นโมเดลได้บ่อย ถ้าโมเดลในลิสต์ใช้ไม่ได้แล้วในอนาคต
# ให้เลือก "อื่นๆ (พิมพ์ Model ID เอง)" แล้วพิมพ์ชื่อรุ่นปัจจุบันที่ถูกต้องแทนได้เลย โดยไม่ต้องแก้โค้ด

# ============================================================
# 🎨 ธีมสี (Preset) — เลือกได้ก่อนสร้าง แล้วจะฉีดเข้า CSS ของหน้าเว็บที่ Gen ทั้งหมด
# ============================================================
THEME_OPTIONS = {
    "🌊 Ocean Teal (แนวคลาสสิก)": {
        "primary": "#1B3A57", "secondary": "#1E7E7A", "accent": "#D9932D",
        "highlight": "#FF6B5B", "bg": "#FFF6EA",
    },
    "🌅 Sunset Amber (อบอุ่น)": {
        "primary": "#7A3B2E", "secondary": "#E8743B", "accent": "#F4A93F",
        "highlight": "#C1502E", "bg": "#FFF3E0",
    },
    "💜 Lavender Dusk (นุ่มนวล)": {
        "primary": "#4A3B6B", "secondary": "#8B7BC4", "accent": "#D9A441",
        "highlight": "#E893B4", "bg": "#FBF7FF",
    },
    "🌿 Forest Sage (ธรรมชาติ)": {
        "primary": "#2F4A3E", "secondary": "#7A9B76", "accent": "#D4A017",
        "highlight": "#C1652E", "bg": "#F7F3E9",
    },
}
DEFAULT_THEME_KEY = "🌊 Ocean Teal (แนวคลาสสิก)"

# ============================================================
# 🎭 โทนแคปชัน (Preset) — เลือกได้ก่อนสร้าง แล้วส่งเข้า System Prompt ของ AI โดยตรง
# ============================================================
TONE_OPTIONS = {
    "🥰 น่ารัก (Cute)": "น่ารัก ขี้เล่น ใช้อิโมจิน่ารักๆ ประปราย เหมือนเพื่อนสนิทที่ชอบพูดหวานๆ ให้กำลังใจ",
    "😆 ขำๆ (Funny)": "ตลก มีมุขแทรกเบาๆ ขำขัน เหมือนเพื่อนที่ชอบแซวกันสนุกๆ แต่ไม่หยาบคาย",
    "🤗 อบอุ่น (Warm)": "อบอุ่น นุ่มนวล ให้ความรู้สึกปลอดภัยและมีความสุข เหมือนคนในครอบครัวคุยกัน",
    "✨ มินิมอล (Minimal)": "สั้น กระชับ ตรงประเด็น ไม่ใช้คำฟุ่มเฟือยหรืออิโมจิเยอะ เน้นความเรียบง่าย",
}
DEFAULT_TONE_KEY = "🥰 น่ารัก (Cute)"


def _build_ai_system_prompt(tone_description):
    """สร้าง System Prompt แบบ Dynamic ตามโทนแคปชันที่ผู้ใช้เลือก"""
    return f"""คุณคือเพื่อนสนิทที่ชอบเขียนแคปชั่น/ไดอารี่ทริปแบบ{tone_description} ให้เพื่อน

ตัวอย่างที่ "ใช่" (โทนที่ต้องการ):
- "วันนี้เดินเล่นรอบเมือง กินของอร่อยจนพุงกาง ฟินสุดๆ 🌙"
- "เช้านี้ตื่นมาสดชื่น พร้อมลุยเที่ยวกันต่อ!"

ตัวอย่างที่ "ไม่ใช่" (ห้ามเขียนแบบนี้ เพราะฟังดูเวิ่นเว้อ/เป็นทางการเกินไป):
- "ทริปนี้กระชับความสัมพันธ์ ทำให้เต็มไปด้วยช่วงเวลาแสนหวาน"
- "การเดินทางครั้งนี้เปี่ยมไปด้วยความทรงจำอันน่าประทับใจตลอดระยะเวลา"

กฎสำคัญที่ต้องทำตามอย่างเคร่งครัด:
1. ตอบกลับเป็น JSON เท่านั้น ห้ามมีข้อความอื่นนอกเหนือจาก JSON (ห้ามมี ```json หรือคำอธิบายใดๆ ก่อน/หลัง JSON)
2. ใช้ภาษาไทยแบบพูดคุยธรรมดา ตรงตามโทนที่ระบุไว้ด้านบน
3. ใส่ใจ "ฟีลการเดินทาง" ที่ผู้ใช้ระบุมา (คู่รัก/ครอบครัว/เพื่อนฝูง/เที่ยวคนเดียว) แต่ยังคงโทนที่กำหนดไว้เสมอ
4. ห้ามเดาหรือสร้างข้อมูลที่ไม่มีอยู่จริง (ชื่อร้าน เมนูอาหาร กิจกรรมที่ไม่ได้ระบุมา) ใช้แค่ข้อมูลที่ให้เท่านั้น
5. ⚠️ สำคัญมาก: ชื่อสถานที่ทั้งหมดที่กล่าวถึง (ในเรื่องเล่า, คำโปรย, พื้นที่กว้างๆ, ชื่อทริป) ต้อง "แปลหรือเขียนเป็นภาษาไทยเสมอ"
   แม้ข้อมูลดิบที่ให้มาจะเป็นภาษาอื่น (จีน ญี่ปุ่น อังกฤษ ฯลฯ) เช่น ถ้าเจอ "昆明市" ให้เขียนเป็น "คุนหมิง"
   ถ้าเจอ "東京" ให้เขียนเป็น "โตเกียว" ถ้าเจอ "Chatuchak Market" ให้เขียนเป็น "ตลาดจตุจักร" ห้ามทิ้งชื่อภาษาอื่นไว้เฉยๆ
6. ความยาว: vibe_quote ไม่เกิน 25 คำ, summary ไม่เกิน 20 คำต่อวัน, narrative ไม่เกิน 50 คำต่อวัน, area ไม่เกิน 8 คำ
7. field "area" ต่อวัน: อ่านรายชื่อจุดแวะทั้งหมดของวันนั้น แล้วสรุปเป็น "พื้นที่กว้างๆ" สั้นๆ เป็นภาษาไทย ว่าวันนั้นวนเวียนอยู่แถวไหน
   เช่น "รอบเมืองคุนหมิง" หรือ "ย่านเมืองเก่า" ถ้าจุดแวะมีแค่พิกัดดิบ (ไม่มีชื่อ) ให้บอกกว้างๆ ว่า "ไม่ทราบชื่อย่านแน่ชัด"
8. ⚠️ field "trip_title" (ชื่อทริปสำหรับหัวข้อบนสุด): ต้องเป็น "ระดับเมืองเท่านั้น" ห้ามใช้ชื่อสถานที่ละเอียด/ถนน/ตึก/ย่านเล็กๆ
   ให้อ่านรายชื่อเมืองทั้งหมดที่ไปเยือนตลอดทริป (ไม่ซ้ำ เรียงตามลำดับที่ไปจริง) แล้วต่อกันด้วย " - "
   เช่น ถ้าไปคุนหมิงแล้วต่อด้วยต้าหลี่ ให้ตอบ "คุนหมิง - ต้าหลี่" ถ้าไปแค่เมืองเดียวให้ตอบชื่อเมืองนั้นเฉยๆ
   ถ้าไปหลายเมืองเกิน 3 เมือง ให้เลือกแค่ 3 เมืองแรกแล้วต่อท้ายด้วย "และอื่นๆ" ไม่เกิน 6 คำรวม
9. ต้องตอบให้ครบทุกวันที่ระบุมาใน "รายการวัน" ห้ามข้ามวันใดวันหนึ่งไป"""


def _build_photo_caption_prompt(tone_description):
    """สร้าง Prompt ขอ Caption รูป แบบ Dynamic ตามโทนที่เลือก"""
    return (
        f"มองภาพนี้แล้วเขียนแคปชั่นสั้นๆ (ไม่เกิน 12 คำ) แบบ{tone_description} เป็นภาษาไทยเท่านั้น "
        "ตอบแค่ประโยคเดียว ไม่ต้องมีคำนำหรือคำอธิบายอื่น ไม่ต้องใส่เครื่องหมายคำพูดครอบ "
        "ถ้าเห็นข้อความ/ป้ายในภาพเป็นภาษาอื่น ให้แปลความหมายเป็นภาษาไทยแทนการคัดลอกภาษาเดิม"
    )


def _build_ai_user_prompt(visits, user_profile, insights, start_date, end_date, trip_days):
    """สร้าง User Prompt จากข้อมูลทริปจริง (visits, user_profile, insights) — ใช้ร่วมกันได้ทั้ง Claude และ Gemini"""
    visits_summary = []
    for v in visits:
        loc = v.get("location")
        loc_text = loc["display"] if loc else "ไม่ทราบสถานที่ (มีพิกัด GPS)"
        city_text = (loc.get("city") if loc else None) or "ไม่ทราบเมือง"
        visits_summary.append({
            "day": v["day"],
            "time": f"{v['start_time'].strftime('%H:%M')}-{v['end_time'].strftime('%H:%M')}",
            "location": loc_text,
            "city": city_text,
            "photo_count": v["photo_count"],
            "is_highlight": v.get("has_highlight", False),
        })

    day_list = list(range(1, trip_days + 1))

    prompt = f"""ข้อมูลทริป:
- ชื่อผู้เดินทาง: {user_profile['user_name']}
- เดินทางไปกับ: {user_profile['travel_companion']}
- ช่วงวันที่: {start_date} ถึง {end_date} ({trip_days} วัน)
- ค่าใช้จ่ายรวม: {insights.get('total_expense', 0):,.0f} บาท
- รายการวันที่ต้องเขียนให้ครบ: {day_list}

รายการจุดแวะทั้งหมด (เรียงตามเวลาจริง — มีทั้งชื่อสถานที่ละเอียด "location" และชื่อเมือง "city" แยกไว้ให้
ชื่อสถานที่/เมืองอาจเป็นภาษาอื่น ต้องแปลเป็นไทยตอนเขียนคำตอบทุกจุด):
{json.dumps(visits_summary, ensure_ascii=False, indent=2)}

กรุณาตอบกลับเป็น JSON ตาม Schema นี้เท่านั้น (ต้องมีครบทุกวันใน "รายการวันที่ต้องเขียนให้ครบ"):
{{
  "trip_title": "ชื่อทริประดับเมืองเท่านั้น เป็นภาษาไทย เช่น 'คุนหมิง - ต้าหลี่' (ไม่เกิน 6 คำ)",
  "vibe_quote": "คำโปรยสั้นๆ สรุปฟีลรวมทั้งทริป (ไม่เกิน 25 คำ)",
  "days": [
    {{"day": 1, "area": "พื้นที่กว้างๆ ของวันนี้ เป็นภาษาไทย (ไม่เกิน 8 คำ)", "summary": "สรุปสั้นๆ ของวันนี้ (ไม่เกิน 20 คำ)", "narrative": "เรื่องเล่าของวันนี้ (ไม่เกิน 50 คำ)"}}
  ]
}}"""
    return prompt


def _parse_ai_response(raw_text):
    """แกะ JSON จากคำตอบของ AI อย่างทนทาน (Robust Parsing) — ใช้ร่วมกันได้ทั้ง Claude และ Gemini
    คืนค่า (result_dict, error_message)
    """
    text = raw_text.strip()
    text = re.sub(r"^```(?:json)?\s*", "", text)
    text = re.sub(r"\s*```$", "", text)
    text = text.strip()

    first_brace = text.find("{")
    last_brace = text.rfind("}")
    if first_brace != -1 and last_brace != -1 and last_brace > first_brace:
        text = text[first_brace:last_brace + 1]

    try:
        data = json.loads(text)
    except json.JSONDecodeError as e:
        return None, f"AI ตอบกลับมาไม่ใช่ JSON ที่ถูกต้อง ({e})"

    if not isinstance(data, dict):
        return None, "AI ตอบกลับมาไม่ใช่รูปแบบที่คาดไว้"
    if "vibe_quote" not in data or not isinstance(data.get("vibe_quote"), str):
        return None, "AI ไม่ได้ตอบ 'vibe_quote' มาให้"
    if "days" not in data or not isinstance(data.get("days"), list):
        return None, "AI ไม่ได้ตอบ 'days' มาให้"

    trip_title_raw = data.get("trip_title", "")
    trip_title = trip_title_raw.strip() if isinstance(trip_title_raw, str) else ""

    validated_days = {}
    for d in data["days"]:
        if not isinstance(d, dict) or "day" not in d:
            continue
        day_num = d.get("day")
        summary = d.get("summary", "")
        narrative = d.get("narrative", "")
        area = d.get("area", "")
        if isinstance(summary, str) and isinstance(narrative, str) and summary.strip():
            validated_days[day_num] = {
                "summary": summary.strip(),
                "narrative": narrative.strip(),
                "area": area.strip() if isinstance(area, str) else "",
            }

    return {"vibe_quote": data["vibe_quote"].strip(), "trip_title": trip_title, "days": validated_days}, None


def call_claude_ai_writer(api_key, model, visits, user_profile, insights, start_date, end_date, trip_days, tone_description):
    """เรียก Claude API (Anthropic) จริง เพื่อขอเรื่องเล่า + คำโปรยฟีลทริป + ชื่อทริประดับเมือง"""
    if not ANTHROPIC_SDK_AVAILABLE:
        return None, "เครื่องนี้ยังไม่ได้ติดตั้ง anthropic (รัน `pip install anthropic`)"
    if not api_key or not api_key.strip():
        return None, "ยังไม่ได้กรอก API Key"
    if not visits:
        return None, "ไม่มีข้อมูลจุดแวะให้ AI เขียนเรื่องราว"

    user_prompt = _build_ai_user_prompt(visits, user_profile, insights, start_date, end_date, trip_days)
    system_prompt = _build_ai_system_prompt(tone_description)

    try:
        client = anthropic.Anthropic(api_key=api_key.strip())
        message = client.messages.create(
            model=model,
            max_tokens=2048,
            system=system_prompt,
            messages=[{"role": "user", "content": user_prompt}],
        )
        raw_text = message.content[0].text
    except Exception as e:
        return None, f"เรียก Claude API ไม่สำเร็จ: {e}"

    result, parse_err = _parse_ai_response(raw_text)
    if parse_err:
        return None, parse_err
    return result, None


def call_gemini_ai_writer(api_key, model, visits, user_profile, insights, start_date, end_date, trip_days, tone_description):
    """เรียก Google Gemini API จริง เพื่อขอเรื่องเล่า + คำโปรยฟีลทริป + ชื่อทริประดับเมือง"""
    if not GEMINI_SDK_AVAILABLE:
        return None, "เครื่องนี้ยังไม่ได้ติดตั้ง google-genai (รัน `pip install google-genai`)"
    if not api_key or not api_key.strip():
        return None, "ยังไม่ได้กรอก API Key"
    if not visits:
        return None, "ไม่มีข้อมูลจุดแวะให้ AI เขียนเรื่องราว"

    user_prompt = _build_ai_user_prompt(visits, user_profile, insights, start_date, end_date, trip_days)
    system_prompt = _build_ai_system_prompt(tone_description)

    try:
        client = google_genai.Client(api_key=api_key.strip())
        response = client.models.generate_content(
            model=model,
            contents=user_prompt,
            config=google_genai_types.GenerateContentConfig(system_instruction=system_prompt),
        )
        raw_text = response.text
    except Exception as e:
        return None, f"เรียก Gemini API ไม่สำเร็จ: {e}"

    result, parse_err = _parse_ai_response(raw_text)
    if parse_err:
        return None, parse_err
    return result, None


def call_ai_writer(provider, api_key, model, visits, user_profile, insights, start_date, end_date, trip_days, tone_description):
    """จุดเข้าเดียวสำหรับเรียก AI ไม่ว่าจะเป็นค่ายไหน"""
    if provider == "gemini":
        return call_gemini_ai_writer(api_key, model, visits, user_profile, insights, start_date, end_date, trip_days, tone_description)
    return call_claude_ai_writer(api_key, model, visits, user_profile, insights, start_date, end_date, trip_days, tone_description)


# ============================================================
# 📸 AGENT 05: PHOTO VISION CAPTION — ให้ AI "มองภาพ" รูปไฮไลต์ทีละรูป แล้วเขียน Caption ตามโทนที่เลือก
# ============================================================

def _parse_caption_response(raw_text, max_words=15):
    """แกะคำตอบ Caption สั้นๆ จาก AI ตัดให้สั้นลงถ้ายาวเกินไป กันเผื่อ AI ไม่ทำตามคำสั่งความยาว"""
    text = raw_text.strip().strip('"').strip("'").strip()
    words = text.split()
    if len(words) > max_words:
        text = " ".join(words[:max_words])
    return text


def call_claude_photo_caption(api_key, model, image_bytes, tone_description):
    """ให้ Claude Vision มองรูปไฮไลต์ 1 รูป แล้วเขียน Caption สั้นๆ ตามโทนที่เลือก"""
    if not ANTHROPIC_SDK_AVAILABLE:
        return None, "เครื่องนี้ยังไม่ได้ติดตั้ง anthropic"
    if not api_key or not api_key.strip():
        return None, "ยังไม่ได้กรอก API Key"
    img_b64 = base64.b64encode(image_bytes).decode("utf-8")
    prompt_text = _build_photo_caption_prompt(tone_description)
    try:
        client = anthropic.Anthropic(api_key=api_key.strip())
        message = client.messages.create(
            model=model,
            max_tokens=100,
            messages=[{
                "role": "user",
                "content": [
                    {"type": "image", "source": {"type": "base64", "media_type": "image/jpeg", "data": img_b64}},
                    {"type": "text", "text": prompt_text},
                ],
            }],
        )
        raw_text = message.content[0].text
    except Exception as e:
        return None, f"เรียก Claude Vision ไม่สำเร็จ: {e}"
    caption = _parse_caption_response(raw_text)
    if not caption:
        return None, "AI ไม่ได้ตอบ Caption กลับมา"
    return caption, None


def call_gemini_photo_caption(api_key, model, image_bytes, tone_description):
    """ให้ Gemini Vision มองรูปไฮไลต์ 1 รูป แล้วเขียน Caption สั้นๆ ตามโทนที่เลือก"""
    if not GEMINI_SDK_AVAILABLE:
        return None, "เครื่องนี้ยังไม่ได้ติดตั้ง google-genai"
    if not api_key or not api_key.strip():
        return None, "ยังไม่ได้กรอก API Key"
    prompt_text = _build_photo_caption_prompt(tone_description)
    try:
        client = google_genai.Client(api_key=api_key.strip())
        image_part = google_genai_types.Part.from_bytes(data=image_bytes, mime_type="image/jpeg")
        response = client.models.generate_content(model=model, contents=[image_part, prompt_text])
        raw_text = response.text
    except Exception as e:
        return None, f"เรียก Gemini Vision ไม่สำเร็จ: {e}"
    caption = _parse_caption_response(raw_text)
    if not caption:
        return None, "AI ไม่ได้ตอบ Caption กลับมา"
    return caption, None


def call_photo_caption(provider, api_key, model, image_bytes, tone_description):
    """จุดเข้าเดียวสำหรับขอ Caption รูป ไม่ว่าจะเป็นค่ายไหน"""
    if provider == "gemini":
        return call_gemini_photo_caption(api_key, model, image_bytes, tone_description)
    return call_claude_photo_caption(api_key, model, image_bytes, tone_description)


# ============================================================
# ตั้งค่าหน้าเว็บพื้นฐาน (ต้องอยู่บรรทัดแรกสุดของคำสั่ง st.*)
# ============================================================
st.set_page_config(
    page_title="PassportAI",
    page_icon="🛂",
    layout="wide",
)

MAX_HIGHLIGHT_PHOTOS = 10

DEFAULT_EXPENSE_ROWS = [
    {"หมวดหมู่": "ที่พัก (Hotel)", "จำนวนเงิน (บาท)": 0},
    {"หมวดหมู่": "อาหาร (Food)", "จำนวนเงิน (บาท)": 0},
    {"หมวดหมู่": "เดินทาง (Transport)", "จำนวนเงิน (บาท)": 0},
    {"หมวดหมู่": "ช้อปปิ้ง (Shopping)", "จำนวนเงิน (บาท)": 0},
]

COMPANION_OPTIONS = [
    "👫 เพื่อนฝูง (Friends)",
    "💑 คู่รัก โรแมนติก (Partner / Romantic)",
    "👨‍👩‍👧 ครอบครัว อบอุ่น (Family / Warm)",
    "🧍 เที่ยวคนเดียว (Solo)",
    "✨ อื่นๆ (Other)",
]

# ============================================================
# 👤 USER PROFILE
# ============================================================

def build_user_profile(user_name, companion_choice, custom_companion_text):
    is_other = companion_choice == COMPANION_OPTIONS[-1]
    companion_display = custom_companion_text.strip() if (is_other and custom_companion_text.strip()) else companion_choice
    clean_name = user_name.strip() if user_name and user_name.strip() else "นักเดินทาง"
    return {"user_name": clean_name, "travel_companion": companion_display, "is_custom_companion": is_other}


_COMPANION_ADJECTIVES = {
    "friends": ["สนุกสนาน", "เต็มไปด้วยเสียงหัวเราะ", "ไม่มีเบื่อ"],
    "romantic": ["หวานๆ", "อบอุ่นใจ", "ฟินๆ"],
    "family": ["อบอุ่น", "ยิ้มได้ทั้งวัน", "ประทับใจกันทุกคน"],
    "solo": ["ชิลๆ", "ได้ใช้เวลากับตัวเอง", "สงบดี"],
    "other": ["พิเศษ", "น่าจดจำ", "ไม่เหมือนใคร"],
}


def _companion_key(travel_companion):
    t = travel_companion or ""
    if "โรแมนติก" in t or "Romantic" in t or "คู่รัก" in t:
        return "romantic"
    if "ครอบครัว" in t or "Family" in t:
        return "family"
    if "เที่ยวคนเดียว" in t or "Solo" in t:
        return "solo"
    if "เพื่อนฝูง" in t or "Friends" in t:
        return "friends"
    return "other"


def build_trip_title_mock(visits, fallback="ทริปของคุณ"):
    """🟡 Mock fallback: สร้างชื่อทริประดับเมือง (เช่น 'Kunming - Dali') จากรายชื่อเมืองที่ไม่ซ้ำ
    เรียงตามลำดับที่ไปเยือนจริง (city ผ่านการกรองภาษาแล้วตั้งแต่ตอน Geocode จึงสะอาดอยู่แล้ว)
    """
    cities = []
    seen = set()
    for v in visits:
        loc = v.get("location")
        if not loc:
            continue
        city = loc.get("city")
        if city and city not in seen:
            cities.append(city)
            seen.add(city)
    if not cities:
        return fallback
    if len(cities) == 1:
        return cities[0]
    display_cities = cities[:3]
    suffix = " และอื่นๆ" if len(cities) > 3 else ""
    return " - ".join(display_cities) + suffix


# ============================================================
# 🈶 SCRIPT FILTER — ตรวจจับ + กรองอักษรจีน/ญี่ปุ่น/เกาหลี (Safety Net ชั้นที่ 2)
# ------------------------------------------------------------
# ชั้นที่ 1 คือ accept-language="th,en;q=0.5" ตอนเรียก Nominatim (ให้ Nominatim แปลเองก่อน)
# ชั้นที่ 2 (ชุดฟังก์ชันนี้) ทำหน้าที่เป็น "ด่านสุดท้าย" เผื่อสถานที่นั้นไม่มีทั้งชื่อไทยและอังกฤษ
# ในฐานข้อมูล OpenStreetMap เลยจริงๆ (เกิดขึ้นได้กับสถานที่เล็กๆ ที่ไม่มีคนแปลไว้) — ถ้าเจอ จะ "ตัดทิ้ง"
# Field นั้นแล้ว Fallback ไปใช้ Field ที่กว้างกว่าแทน ไล่ไปจนถึงพิกัดดิบเป็นทางเลือกสุดท้าย
# รับประกันว่าลูกค้าจะไม่เห็นอักษรที่อ่านไม่ออกอีกต่อไป (ตามที่ร้องขอ)
# ============================================================

_UNREADABLE_SCRIPT_PATTERN = re.compile(
    r'[\u4e00-\u9fff'   # CJK Unified Ideographs (จีน)
    r'\u3400-\u4dbf'    # CJK Extension A
    r'\u3040-\u309f'    # Hiragana (ญี่ปุ่น)
    r'\u30a0-\u30ff'    # Katakana (ญี่ปุ่น)
    r'\uac00-\ud7a3'    # Hangul Syllables (เกาหลี)
    r']'
)


def _contains_unreadable_script(text):
    """คืนค่า True ถ้าข้อความมีอักษรจีน/ญี่ปุ่น/เกาหลีปนอยู่ (อ่านไม่ออกสำหรับลูกค้าไทย)"""
    if not text:
        return False
    return bool(_UNREADABLE_SCRIPT_PATTERN.search(text))


def _clean_field(text):
    """คืนค่า None ถ้าข้อความมีอักษรอ่านไม่ออกปนอยู่ ให้ผู้เรียกใช้ Fallback ไป Field อื่นแทน"""
    if text and _contains_unreadable_script(text):
        return None
    return text


# ============================================================
# AGENT 01: MEMORY COLLECTION  —  ✅ ของจริงแล้ว
# ============================================================

_geocode_cache = {}


def _dms_to_decimal(dms, ref):
    try:
        degrees, minutes, seconds = dms
        decimal = float(degrees) + float(minutes) / 60 + float(seconds) / 3600
        if ref in ("S", "W"):
            decimal = -decimal
        return round(decimal, 6)
    except Exception:
        return None


def _extract_exif(file_bytes):
    photo_datetime, lat, lon = None, None, None
    try:
        image = Image.open(io.BytesIO(file_bytes))
        exif = image.getexif()
        try:
            exif_ifd = exif.get_ifd(IFD.Exif)
            raw_date = exif_ifd.get(36867)
        except Exception:
            raw_date = None
        if not raw_date:
            raw_date = exif.get(306)
        if raw_date:
            try:
                photo_datetime = datetime.strptime(str(raw_date), "%Y:%m:%d %H:%M:%S")
            except Exception:
                photo_datetime = None
        try:
            gps_ifd = exif.get_ifd(IFD.GPSInfo)
        except Exception:
            gps_ifd = {}
        if gps_ifd:
            lat_dms, lat_ref = gps_ifd.get(2), gps_ifd.get(1)
            lon_dms, lon_ref = gps_ifd.get(4), gps_ifd.get(3)
            if lat_dms and lon_dms:
                lat = _dms_to_decimal(lat_dms, lat_ref)
                lon = _dms_to_decimal(lon_dms, lon_ref)
    except Exception:
        pass
    return photo_datetime, lat, lon


def _make_thumbnail_b64(file_bytes, max_dim=320):
    try:
        img = Image.open(io.BytesIO(file_bytes))
        img = img.convert("RGB")
        img.thumbnail((max_dim, max_dim))
        buf = io.BytesIO()
        img.save(buf, format="JPEG", quality=80)
        return base64.b64encode(buf.getvalue()).decode("utf-8")
    except Exception:
        return None


def _make_full_image_b64(file_bytes, max_dim=1400):
    """สร้างภาพขนาดใหญ่ขึ้น (สำหรับ Modal ขยายดู) แยกจาก Thumbnail ขนาดเล็กที่ใช้แสดงในการ์ด"""
    try:
        img = Image.open(io.BytesIO(file_bytes))
        img = img.convert("RGB")
        img.thumbnail((max_dim, max_dim))
        buf = io.BytesIO()
        img.save(buf, format="JPEG", quality=85)
        return base64.b64encode(buf.getvalue()).decode("utf-8")
    except Exception:
        return None


def _format_location_display(place, district, city, country, fallback_display_name, lat=None, lon=None):
    """ประกอบชื่อสถานที่ให้อ่านง่าย — ✅ กรองทุก field ผ่าน _clean_field ก่อนเสมอ (Safety Net ชั้นที่ 2)
    ถ้า field ไหนมีอักษรจีน/ญี่ปุ่น/เกาหลีปนอยู่ (แปลไม่ได้จริงๆ จาก Nominatim) จะถูกตัดทิ้ง แล้ว Fallback
    ไปใช้ field ที่กว้างกว่าแทน ไล่ไปจนถึงพิกัดดิบเป็นทางเลือกสุดท้าย
    """
    place = _clean_field(place)
    district = _clean_field(district)
    city = _clean_field(city)
    country = _clean_field(country)
    fallback_display_name = _clean_field(fallback_display_name)

    if place and district and city:
        return f"{place} (ย่าน {district}, {city})"
    if place and city:
        return f"{place}, {city}"
    if place:
        return place
    if district and city:
        return f"ย่าน {district}, {city}"
    if city and country:
        return f"{city}, {country}"
    if city:
        return city
    if fallback_display_name:
        return fallback_display_name
    if lat is not None and lon is not None:
        return f"พิกัด {lat:.4f}, {lon:.4f}"
    return "ตำแหน่งไม่ทราบชื่อ"


def _reverse_geocode_detailed(lat, lon):
    """แปลงพิกัด GPS เป็นชื่อสถานที่จริง
    ✅ ชั้นที่ 1: ขอ Nominatim ให้ลองภาษาไทยก่อน แล้ว Fallback เป็นอังกฤษ (accept-language="th,en;q=0.5")
       ตาม RFC2616 Accept-Language ที่ Nominatim รองรับ — ถ้าสถานที่นั้นไม่มีชื่อไทย จะได้ชื่ออังกฤษแทน
       ก่อนที่จะดีดกลับไปใช้ชื่อภาษาท้องถิ่น (เช่น จีน/ญี่ปุ่น) ซึ่งเป็นพฤติกรรมที่ต้องการหลีกเลี่ยง
    ✅ ชั้นที่ 2 (Safety Net): city ที่ได้จะถูกกรองผ่าน _clean_field อีกชั้นใน _format_location_display
       เผื่อสถานที่นั้นไม่มีทั้งชื่อไทยและอังกฤษในฐานข้อมูลเลยจริงๆ
    """
    if lat is None or lon is None:
        return None
    cache_key = (round(lat, 3), round(lon, 3))
    if cache_key in _geocode_cache:
        return _geocode_cache[cache_key]
    try:
        resp = requests.get(
            "https://nominatim.openstreetmap.org/reverse",
            params={"lat": lat, "lon": lon, "format": "json", "zoom": 16, "addressdetails": 1, "accept-language": "th,en;q=0.5"},
            headers={"User-Agent": "PassportAI-StudentProject/1.0"},
            timeout=6,
        )
        time.sleep(1)
        if resp.status_code == 200:
            data = resp.json()
            address = data.get("address", {})
            place = (address.get("attraction") or address.get("tourism") or address.get("leisure")
                     or address.get("building") or address.get("road"))
            district = (address.get("suburb") or address.get("neighbourhood")
                        or address.get("quarter") or address.get("city_district"))
            city = address.get("city") or address.get("town") or address.get("village") or address.get("municipality")
            country = address.get("country")
            display = _format_location_display(place, district, city, country, data.get("display_name"), lat=lat, lon=lon)
            # เก็บ city แบบ "กรองแล้ว" ไว้ใช้ต่อใน trip_title/day_area (ป้องกันอักษรอ่านไม่ออกหลุดไปที่อื่นด้วย)
            clean_city = _clean_field(city)
            result = {"place": _clean_field(place), "district": _clean_field(district),
                      "city": clean_city, "country": _clean_field(country), "display": display}
            _geocode_cache[cache_key] = result
            return result
    except Exception:
        pass
    return {"place": None, "district": None, "city": None, "country": None,
            "display": _format_location_display(None, None, None, None, None, lat=lat, lon=lon)}


def _reverse_geocode(lat, lon):
    detail = _reverse_geocode_detailed(lat, lon)
    return detail["display"] if detail else None


def agent01_memory_collection(uploaded_files, is_highlight_flags, start_date, end_date, flight_docs, expenses, on_progress=None):
    timeline = []
    total = len(uploaded_files)

    for i, f in enumerate(uploaded_files):
        is_highlight = is_highlight_flags[i]
        if on_progress:
            on_progress(i, total, f"กำลังอ่านรูปที่ {i + 1}/{total}: {f.name}")

        file_bytes = f.getvalue()
        photo_datetime, lat, lon = _extract_exif(file_bytes)
        has_gps = lat is not None and lon is not None
        location_name = None
        if has_gps:
            if on_progress:
                on_progress(i, total, f"พบพิกัด GPS ในรูปที่ {i + 1}/{total} กำลังค้นหาชื่อสถานที่...")
            location_name = _reverse_geocode(lat, lon)

        thumbnail_b64 = _make_thumbnail_b64(file_bytes) if is_highlight else None
        full_image_b64 = _make_full_image_b64(file_bytes) if is_highlight else None

        timeline.append({
            "filename": f.name,
            "has_exif_date": photo_datetime is not None,
            "has_gps": has_gps,
            "datetime": photo_datetime,
            "date": photo_datetime.date() if photo_datetime else None,
            "lat": lat,
            "lon": lon,
            "location": location_name or (f"{lat}, {lon}" if has_gps else "ไม่พบข้อมูลตำแหน่ง (ไม่มี GPS ใน EXIF)"),
            "is_highlight": is_highlight,
            "thumbnail_b64": thumbnail_b64,
            "full_image_b64": full_image_b64,
            "photo_caption": None,
        })

    timeline.sort(key=lambda x: (x["datetime"] is None, x["datetime"] or datetime.min))

    for entry in timeline:
        if entry["date"]:
            day_num = (entry["date"] - start_date).days + 1
            entry["day"] = day_num
            entry["out_of_range"] = day_num < 1 or day_num > (end_date - start_date).days + 1
        else:
            entry["day"] = None
            entry["out_of_range"] = False

    mode = flight_docs.get("mode")
    if mode == "e_itinerary":
        itinerary_file = flight_docs.get("itinerary_file")
        bookings = {
            "document_type": "e_itinerary",
            "flights": {"outbound": {"date": start_date.strftime("%Y-%m-%d")}, "return": {"date": end_date.strftime("%Y-%m-%d")}},
            "itinerary_filename": itinerary_file.name if itinerary_file else None,
        }
    else:
        outbound_file = flight_docs.get("outbound_file")
        return_file = flight_docs.get("return_file")
        bookings = {
            "document_type": "boarding_pass",
            "flights": {
                "outbound": {"date": start_date.strftime("%Y-%m-%d"), "filename": outbound_file.name if outbound_file else None},
                "return": {"date": end_date.strftime("%Y-%m-%d"), "filename": return_file.name if return_file else None},
            },
        }

    return {
        "trip_id": "trip_demo_001",
        "start_date": start_date,
        "end_date": end_date,
        "trip_days": (end_date - start_date).days + 1,
        "timeline": timeline,
        "bookings": bookings,
        "expenses": expenses,
    }


def agent05_photo_vision_caption(timeline, use_ai, ai_provider, ai_api_key, ai_model, tone_description, on_progress=None):
    """ให้ AI มองรูปไฮไลต์ทีละรูป แล้วเขียน Caption ตามโทนที่เลือก ใส่กลับเข้าไปใน timeline entry"""
    highlight_entries = [e for e in timeline if e.get("is_highlight") and e.get("full_image_b64")]
    total = len(highlight_entries)
    if not use_ai or total == 0:
        return timeline

    for i, entry in enumerate(highlight_entries):
        if on_progress:
            on_progress(i, total, f"กำลังให้ AI มองรูปที่ {i + 1}/{total}: {entry['filename']}")
        image_bytes = base64.b64decode(entry["full_image_b64"])
        caption, err = call_photo_caption(ai_provider, ai_api_key, ai_model, image_bytes, tone_description)
        entry["photo_caption"] = caption
    return timeline


# ============================================================
# 🧭 VISIT BUILDER
# ============================================================

def _haversine_m(lat1, lon1, lat2, lon2):
    R = 6371000
    phi1, phi2 = radians(lat1), radians(lat2)
    dphi = radians(lat2 - lat1)
    dlambda = radians(lon2 - lon1)
    a = sin(dphi / 2) ** 2 + cos(phi1) * cos(phi2) * sin(dlambda / 2) ** 2
    return 2 * R * atan2(sqrt(a), sqrt(1 - a))


def _cluster_points(entries, radius_meters=300):
    clusters = []
    for e in entries:
        assigned = None
        for c in clusters:
            if _haversine_m(e["lat"], e["lon"], c["lat"], c["lon"]) <= radius_meters:
                assigned = c
                break
        if assigned:
            assigned["members"].append(e)
            assigned["sum_lat"] += e["lat"]
            assigned["sum_lon"] += e["lon"]
            assigned["count"] += 1
            assigned["lat"] = assigned["sum_lat"] / assigned["count"]
            assigned["lon"] = assigned["sum_lon"] / assigned["count"]
        else:
            clusters.append({"lat": e["lat"], "lon": e["lon"], "sum_lat": e["lat"], "sum_lon": e["lon"], "count": 1, "members": [e]})
    return clusters


def _build_visits(timeline, radius_meters=300):
    dated = [e for e in timeline if e["has_gps"] and e["datetime"]]
    dated.sort(key=lambda e: e["datetime"])

    clusters = []
    assignments = []
    for e in dated:
        idx = None
        for ci, c in enumerate(clusters):
            if _haversine_m(e["lat"], e["lon"], c["lat"], c["lon"]) <= radius_meters:
                idx = ci
                break
        if idx is None:
            clusters.append({"lat": e["lat"], "lon": e["lon"], "sum_lat": e["lat"], "sum_lon": e["lon"], "count": 1})
            idx = len(clusters) - 1
        else:
            c = clusters[idx]
            c["sum_lat"] += e["lat"]; c["sum_lon"] += e["lon"]; c["count"] += 1
            c["lat"] = c["sum_lat"] / c["count"]; c["lon"] = c["sum_lon"] / c["count"]
        assignments.append(idx)

    visits = []
    i = 0
    n = len(dated)
    while i < n:
        j = i
        cur_idx = assignments[i]
        while j + 1 < n and assignments[j + 1] == cur_idx:
            j += 1
        group = dated[i:j + 1]
        visits.append({
            "cluster_lat": clusters[cur_idx]["lat"], "cluster_lon": clusters[cur_idx]["lon"],
            "start_time": group[0]["datetime"], "end_time": group[-1]["datetime"],
            "day": group[0]["day"], "photo_count": len(group),
            "has_highlight": any(g.get("is_highlight") for g in group), "location": None,
        })
        i = j + 1
    return visits


def _enrich_visits_with_location(visits, on_progress=None):
    total = len(visits)
    for i, v in enumerate(visits):
        if on_progress:
            on_progress(i, total, f"กำลังค้นหาชื่อสถานที่จุดแวะที่ {i + 1}/{total}")
        v["location"] = _reverse_geocode_detailed(v["cluster_lat"], v["cluster_lon"])
    return visits


# ============================================================
# AGENT 02: STORY GENERATION  —  ✅ AI จริง (Claude หรือ Gemini) / 🟡 Mock fallback
# ============================================================

def agent02_story_generation_mock(visits, user_profile=None):
    """🟡 Mock fallback: แต่งเรื่องเล่าแบบ Bullet List จาก 'จุดแวะ' — ใช้เมื่อไม่ได้เชื่อม AI จริง
    ✅ ข้อความ Fallback ถูกปรับให้เป็นธรรมชาติ ไม่มีคำว่า "Mock/AI" ปนอยู่ เพราะข้อความนี้จะไปอยู่ในหน้าเว็บ
    ที่ผู้ใช้จะแชร์ให้ลูกค้า/เพื่อนดูจริง จึงไม่ควรมีศัพท์เทคนิคของนักพัฒนาปนอยู่ในนั้น
    """
    if not visits:
        return "ยังไม่มีข้อมูลตำแหน่งเพียงพอสำหรับสร้างเรื่องเล่า ลองอัปโหลดรูปที่มีทั้งวันที่และ GPS เพิ่มเติมนะครับ"
    lines = []
    current_day = None
    for v in visits:
        if v["day"] != current_day:
            current_day = v["day"]
            lines.append(f"\n**📅 Day {v['day'] if v['day'] else '?'}**")
        loc = v.get("location")
        loc_text = loc["display"] if loc else "ตำแหน่งไม่ทราบชื่อ"
        start_str = v["start_time"].strftime("%H:%M")
        end_str = v["end_time"].strftime("%H:%M")
        time_range = start_str if start_str == end_str else f"{start_str} - {end_str}"
        photo_note = f"(ถ่ายไว้ {v['photo_count']} รูป)" if v["photo_count"] > 1 else ""
        highlight_note = " ⭐" if v.get("has_highlight") else ""
        lines.append(
            f"- **{time_range} น.** อยู่ที่ **{loc_text}**{highlight_note} {photo_note}"
        )
    return "\n".join(lines)


def generate_vibe_quote_mock(visits, travel_companion):
    """🟡 Mock fallback: สร้างคำโปรยสั้นๆ สรุป 'ฟีล' ของทริป จากสถานที่ที่ไป + เพื่อนร่วมทริป"""
    key = _companion_key(travel_companion)
    adjs = _COMPANION_ADJECTIVES[key]
    named_visits = [v for v in visits if v.get("location")]
    if not named_visits:
        return f"ทริปนี้{adjs[0]}จนลืมไม่ลง"
    first_place = named_visits[0]["location"].get("place") or named_visits[0]["location"]["display"]
    if len(named_visits) > 1:
        last_place = named_visits[-1]["location"].get("place") or named_visits[-1]["location"]["display"]
        return f"จาก {first_place} ไปจนถึง {last_place} ทริปนี้{adjs[0]}สุดๆ"
    return f"ทริปที่ {first_place} {adjs[2]} {adjs[0]}มาก"


def generate_day_summaries_mock(visits, travel_companion=""):
    """🟡 Mock fallback: สร้างสรุปสั้นๆ รายวัน สำหรับการ์ดในหน้าปก"""
    key = _companion_key(travel_companion)
    companion_adj = _COMPANION_ADJECTIVES[key][0]

    by_day = {}
    for v in visits:
        d = v.get("day")
        by_day.setdefault(d, []).append(v)

    summaries = {}
    for d, day_visits in by_day.items():
        if d is None:
            continue
        places = []
        for v in day_visits:
            loc = v.get("location")
            if loc:
                places.append(loc.get("place") or loc.get("display"))
        photo_count = sum(v["photo_count"] for v in day_visits)
        if not places:
            summaries[d] = {"main_location": "ไม่ทราบสถานที่", "summary": "ยังไม่มีข้อมูลตำแหน่งเพียงพอสำหรับวันนี้", "photo_count": photo_count}
            continue
        main_location = places[0]
        if len(places) == 1:
            summary = f"วันนี้อยู่แถว {places[0]} บรรยากาศ{companion_adj}"
        elif len(places) == 2:
            summary = f"เริ่มที่ {places[0]} แล้วต่อที่ {places[1]} วันนี้{companion_adj}สุดๆ"
        else:
            summary = f"วันนี้แวะหลายที่ เริ่มจาก {places[0]} ยันถึง {places[-1]} ({len(places)} จุด)"
        summaries[d] = {"main_location": main_location, "summary": summary, "photo_count": photo_count}
    return summaries


# ============================================================
# AGENT 03: TRAVEL INTELLIGENCE
# ============================================================

def agent03_travel_intelligence(timeline_data, visits):
    expenses = [e for e in timeline_data["expenses"] if e.get("amount", 0) and e["amount"] > 0]
    total = sum(e["amount"] for e in expenses)
    breakdown = {e["category"]: round(e["amount"] / total * 100, 1) for e in expenses} if total > 0 else {}
    top_visits = sorted(visits, key=lambda v: v["photo_count"], reverse=True)[:3]
    highlights = [v["location"]["display"] for v in top_visits if v.get("location")]
    return {
        "total_expense": total, "breakdown": breakdown, "has_expense_data": total > 0,
        "highlights": highlights if highlights else ["ยังไม่มีข้อมูลไฮไลต์ (ต้องมีรูปที่มี GPS และวันที่)"],
    }


# ============================================================
# AGENT 04: PASSPORT BUILDER
# ============================================================

def agent04_passport_builder(timeline_data, visits, user_profile, ai_result=None, ai_error=None, ai_enabled=False, ai_provider=None):
    highlight_entries = [e for e in timeline_data["timeline"] if e.get("is_highlight")]
    trip_days = timeline_data["trip_days"]
    travel_companion = user_profile.get("travel_companion", "")

    mock_summaries = generate_day_summaries_mock(visits, travel_companion)
    mock_vibe = generate_vibe_quote_mock(visits, travel_companion)
    mock_trip_title = build_trip_title_mock(visits)

    day_summaries = {}
    day_narratives = {}
    day_areas = {}

    if ai_result:
        vibe_quote = ai_result["vibe_quote"]
        trip_title = ai_result.get("trip_title") or mock_trip_title
        ai_days = ai_result["days"]
        for d in range(1, trip_days + 1):
            if d in ai_days and ai_days[d]["summary"]:
                base = mock_summaries.get(d, {"main_location": "-", "photo_count": 0})
                day_summaries[d] = {
                    "main_location": base["main_location"],
                    "summary": ai_days[d]["summary"],
                    "photo_count": base["photo_count"],
                }
                day_narratives[d] = ai_days[d]["narrative"]
                day_areas[d] = ai_days[d].get("area") or None
            elif d in mock_summaries:
                day_summaries[d] = mock_summaries[d]
                day_narratives[d] = None
                day_areas[d] = None
    else:
        vibe_quote = mock_vibe
        trip_title = mock_trip_title
        day_summaries = mock_summaries
        day_narratives = {d: None for d in mock_summaries}
        day_areas = {d: None for d in mock_summaries}

    ai_status = {"enabled": ai_enabled, "used": ai_result is not None, "error": ai_error, "provider": ai_provider}

    passport = {
        "trip_name": f"Trip to {trip_title}",
        "start_date": timeline_data["start_date"], "end_date": timeline_data["end_date"],
        "trip_days": trip_days, "bookings": timeline_data["bookings"],
        "insights": None,
        "timeline": timeline_data["timeline"],
        "visits": visits, "highlight_entries": highlight_entries, "user_profile": user_profile,
        "vibe_quote": vibe_quote, "day_summaries": day_summaries, "day_narratives": day_narratives,
        "day_areas": day_areas, "ai_status": ai_status,
    }
    return passport


# ============================================================
# 📥 HTML PASSPORT GENERATOR — สร้างหน้าเว็บ HTML ตัวจริง (self-contained, 2 หน้า)
# ============================================================

_DAY_COLORS = ["#FF635B", "#3D5AFE", "#00D9A3", "#FFB020", "#8B5CF6", "#EC4899", "#10B981"]


def _color_for_day_hex(day_num):
    if day_num is None:
        return "#969696"
    return _DAY_COLORS[(day_num - 1) % len(_DAY_COLORS)]


def _esc(s):
    """หนี HTML special characters กันโค้ดพัง ถ้าชื่อสถานที่/ชื่อคนมีเครื่องหมาย < > & \" ปนอยู่"""
    if s is None:
        return ""
    return html.escape(str(s), quote=True)


def _build_map_data_by_day(timeline, trip_days):
    geo_entries = [e for e in timeline if e["has_gps"]]

    def build_scope(entries):
        if not entries:
            return []
        entries_sorted = sorted(entries, key=lambda e: (e["datetime"] is None, e["datetime"] or datetime.min))
        clusters = _cluster_points(entries_sorted, radius_meters=300)
        for c in clusters:
            times = [m["datetime"] for m in c["members"] if m["datetime"]]
            c["first_visit"] = min(times) if times else datetime.max
        clusters.sort(key=lambda c: c["first_visit"])
        pins = []
        max_count = max(c["count"] for c in clusters) if clusters else 1
        for i, c in enumerate(clusters):
            rep_location = Counter(m["location"] for m in c["members"]).most_common(1)[0][0]
            rep_day = c["members"][0]["day"]
            pins.append({
                "lat": c["lat"], "lon": c["lon"], "order": i + 1, "count": c["count"],
                "label": _esc(f"#{i + 1} · {rep_location} · {c['count']} รูป"),
                "color": _color_for_day_hex(rep_day),
                "radius": round(6 + (c["count"] / max_count) * 8, 1),
            })
        return pins

    result = {"all": build_scope(geo_entries)}
    for d in range(1, trip_days + 1):
        result[str(d)] = build_scope([e for e in geo_entries if e["day"] == d])
    return result


def _story_html_by_day(visits, day_narratives=None):
    """สร้าง HTML เรื่องเล่า แบ่งเป็น <div data-day="X"> ต่อวัน
    ✅ ข้อความ Fallback (กรณีไม่มี narrative จาก AI) ปรับให้เป็นธรรมชาติ ไม่มีคำว่า Mock/AI ปนอยู่แล้ว
    """
    if not visits:
        return "<p class='muted'>ยังไม่มีข้อมูลตำแหน่งเพียงพอสำหรับสร้างเรื่องเล่า</p>"

    day_narratives = day_narratives or {}
    by_day = {}
    order = []
    for v in visits:
        d = v.get("day")
        key = str(d) if d is not None else "none"
        if key not in by_day:
            by_day[key] = []
            order.append(key)
        by_day[key].append(v)

    blocks = []
    for key in order:
        day_visits = by_day[key]
        day_num = int(key) if key != "none" else None
        day_label = f"📅 Day {key}" if key != "none" else "📅 ไม่ทราบวัน"
        narrative = day_narratives.get(day_num) if day_num is not None else None

        if narrative:
            body_html = f"<p>{_esc(narrative)}</p>"
        else:
            items = []
            for v in day_visits:
                loc = v.get("location")
                loc_text = loc["display"] if loc else "ตำแหน่งไม่ทราบชื่อ"
                start_str = v["start_time"].strftime("%H:%M")
                end_str = v["end_time"].strftime("%H:%M")
                time_range = start_str if start_str == end_str else f"{start_str} - {end_str}"
                photo_note = f"(ถ่ายไว้ {v['photo_count']} รูป)" if v["photo_count"] > 1 else ""
                highlight_note = " ⭐" if v.get("has_highlight") else ""
                items.append(
                    f"<li><strong>{_esc(time_range)} น.</strong> อยู่ที่ <strong>{_esc(loc_text)}</strong>"
                    f"{highlight_note} {_esc(photo_note)}</li>"
                )
            body_html = f"<ul>{''.join(items)}</ul>"

        blocks.append(f'<div class="day-block" data-day="{key}"><h3 class="day-heading">{_esc(day_label)}</h3>{body_html}</div>')
    return "\n".join(blocks)


def generate_html_passport(passport, theme=None):
    """สร้างไฟล์ HTML แบบ self-contained ไฟล์เดียว จาก passport dict — แบ่งเป็น 2 หน้า (ปก / เนื้อหา)
    theme: dict {"primary","secondary","accent","highlight","bg"} — ถ้าไม่ระบุจะใช้ธีมเริ่มต้น (Ocean Teal)
    """
    theme = theme or THEME_OPTIONS[DEFAULT_THEME_KEY]

    up = passport.get("user_profile") or {"user_name": "นักเดินทาง", "travel_companion": "-"}
    user_name = _esc(up.get("user_name", "นักเดินทาง"))
    companion = _esc(up.get("travel_companion", "-"))
    trip_name = _esc(passport["trip_name"])
    start_date_str = passport["start_date"].strftime("%d %b %Y")
    end_date_str = passport["end_date"].strftime("%d %b %Y")
    trip_days = passport["trip_days"]
    trip_start_date = passport["start_date"]

    insights = passport["insights"]
    has_expense = insights.get("has_expense_data", False)
    total_expense = insights.get("total_expense", 0)
    breakdown = insights.get("breakdown", {})
    highlights_list = insights.get("highlights", [])
    vibe_quote = _esc(passport.get("vibe_quote", ""))
    day_summaries = passport.get("day_summaries", {})
    day_narratives = passport.get("day_narratives", {})
    day_areas = passport.get("day_areas", {})

    map_data_by_day = _build_map_data_by_day(passport["timeline"], trip_days)
    has_map_points = len(map_data_by_day["all"]) > 0
    map_data_json = json.dumps(map_data_by_day, ensure_ascii=False)
    total_pins = len(map_data_by_day["all"])

    day_buttons_html = ['<button class="day-filter-btn active" data-day="all" onclick="applyDayFilter(\'all\')">🌏 ทั้งหมด</button>']
    for d in range(1, trip_days + 1):
        day_date_label = (trip_start_date + timedelta(days=d - 1)).strftime("%d %b")
        day_buttons_html.append(
            f'<button class="day-filter-btn" data-day="{d}" onclick="applyDayFilter(\'{d}\')">Day {d} · {_esc(day_date_label)}</button>'
        )
    day_buttons_str = "\n".join(day_buttons_html)

    highlight_entries = passport.get("highlight_entries", [])
    lightbox_data = []
    for entry in highlight_entries:
        caption = entry.get("photo_caption") or f"📸 ภาพความทรงจำเมื่อ {entry['datetime'].strftime('%d %b, %H:%M') if entry['datetime'] else 'ทริปนี้'}"
        lightbox_data.append({"img": entry.get("full_image_b64") or entry.get("thumbnail_b64"), "caption": caption})
    lightbox_json = json.dumps(lightbox_data, ensure_ascii=False)

    def render_highlight_cards(entries, taggable=False, show_caption=True):
        cards = []
        for idx, entry in enumerate(entries):
            img_tag = f'<img src="data:image/jpeg;base64,{entry["thumbnail_b64"]}" alt="highlight" onclick="openLightbox({idx})" style="cursor:pointer;" />' if entry.get("thumbnail_b64") else ""
            caption = entry.get("photo_caption") or f"📸 ภาพความทรงจำเมื่อ {entry['datetime'].strftime('%d %b, %H:%M') if entry['datetime'] else 'ทริปนี้'}"
            day_attr = f' data-day="{entry["day"] if entry["day"] is not None else "none"}"' if taggable else ""
            caption_html = f'<div class="highlight-caption">{_esc(caption)}</div>' if show_caption else ""
            cards.append(f"""
            <div class="highlight-card"{day_attr}>
              {img_tag}
              {caption_html}
            </div>""")
        return "\n".join(cards) if cards else "<p class='muted'>ยังไม่มีรูปไฮไลต์</p>"

    cover_highlight_html = render_highlight_cards(highlight_entries, taggable=False, show_caption=False)
    content_highlight_html = render_highlight_cards(highlight_entries, taggable=True, show_caption=True)

    def render_expense_bars(compact=False):
        if not (has_expense and breakdown):
            return "<p class='muted'>ยังไม่มีข้อมูลค่าใช้จ่าย</p>"
        bars = []
        max_pct = max(breakdown.values()) if breakdown else 1
        for cat, pct in breakdown.items():
            width = max(pct / max_pct * 100, 4)
            label_w = "90px" if compact else "135px"
            bars.append(f"""
            <div class="expense-row">
              <div class="expense-label" style="width:{label_w}">{_esc(cat)}</div>
              <div class="expense-bar-track"><div class="expense-bar-fill" style="width:{width:.1f}%">{pct:.1f}%</div></div>
            </div>""")
        return "\n".join(bars)

    expense_html_compact = render_expense_bars(compact=True)
    expense_html_full = render_expense_bars(compact=False)

    story_html = _story_html_by_day(passport["visits"], day_narratives)
    highlights_numeric_html = "".join(f"<li>{_esc(h)}</li>" for h in highlights_list)

    display_limit = 200
    timeline_rows = []
    for entry in passport["timeline"][:display_limit]:
        day_label = f"Day {entry['day']}" if entry["day"] else "ไม่ทราบวัน"
        time_label = entry["datetime"].strftime("%d %b %Y, %H:%M") if entry["datetime"] else "ไม่มีวันที่ใน EXIF"
        gps_icon = "📍" if entry["has_gps"] else "❔"
        star = " 🌟" if entry.get("is_highlight") else ""
        day_attr = entry["day"] if entry["day"] is not None else "none"
        timeline_rows.append(
            f'<li class="timeline-item" data-day="{day_attr}"><strong>{_esc(day_label)}</strong> '
            f"({_esc(time_label)}) {gps_icon} {_esc(entry['location'])}{star}</li>"
        )
    timeline_html = "\n".join(timeline_rows)
    timeline_note = (
        f"<p class='muted'>... และอีก {len(passport['timeline']) - display_limit} รูป (จำกัดแสดงผล {display_limit} รายการแรก)</p>"
        if len(passport["timeline"]) > display_limit else ""
    )

    day_card_blocks = []
    for d in range(1, trip_days + 1):
        s = day_summaries.get(d)
        area = day_areas.get(d)
        day_date_label = (trip_start_date + timedelta(days=d - 1)).strftime("%d %b")
        if s:
            display_location = area if area else s['main_location']
            day_card_blocks.append(f"""
            <div class="day-card">
              <div class="day-card-badge">DAY {d} · {_esc(day_date_label.upper())}</div>
              <div class="day-card-loc">{_esc(display_location)}</div>
              <div class="day-card-summary">{_esc(s['summary'])}</div>
              <div class="day-card-photocount">📷 {s['photo_count']} รูป</div>
            </div>""")
        else:
            day_card_blocks.append(f"""
            <div class="day-card">
              <div class="day-card-badge">DAY {d} · {_esc(day_date_label.upper())}</div>
              <div class="day-card-loc muted">ไม่มีข้อมูล</div>
              <div class="day-card-summary muted">ยังไม่มีรูปที่มี GPS + วันที่สำหรับวันนี้</div>
            </div>""")
    day_cards_html = "\n".join(day_card_blocks)

    bookings = passport["bookings"]
    if bookings["document_type"] == "e_itinerary":
        booking_html = (
            f"<p><strong>เอกสาร:</strong> 📄 E-Itinerary — ขาไป {_esc(bookings['flights']['outbound']['date'])} · "
            f"ขากลับ {_esc(bookings['flights']['return']['date'])}</p>"
        )
    else:
        booking_html = (
            f"<p><strong>เอกสาร:</strong> ✈️ Boarding Pass — ขาไป {_esc(bookings['flights']['outbound']['date'])} · "
            f"ขากลับ {_esc(bookings['flights']['return']['date'])}</p>"
        )

    gps_count = sum(1 for e in passport["timeline"] if e["has_gps"])
    total_photos = len(passport["timeline"])

    theme_primary = theme["primary"]
    theme_secondary = theme["secondary"]
    theme_accent = theme["accent"]
    theme_highlight = theme["highlight"]
    theme_bg = theme["bg"]

    html_doc = f"""<!DOCTYPE html>
<html lang="th">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>{trip_name} · PassportAI</title>
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
<style>
  :root {{ --navy:{theme_primary}; --teal:{theme_secondary}; --gold:{theme_accent}; --coral:{theme_highlight}; --cream:{theme_bg}; --text:#22323F; --muted:#6B7280; }}
  * {{ box-sizing: border-box; }}
  html, body {{ margin:0; padding:0; width:100%; }}
  body {{ font-family:'Segoe UI','Noto Sans Thai','Leelawadee UI',sans-serif; background:var(--cream); color:var(--text); line-height:1.6; overflow-x:hidden; }}
  .muted {{ color:var(--muted); font-size:12.5px; }}

  .page {{ width:100%; }}
  .page-inner {{ max-width:1280px; margin:0 auto; padding: clamp(12px, 2vw, 28px); }}
  .grid-3 {{ display:grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: clamp(10px,1.5vw,18px); align-items: stretch; }}

  #page-cover {{ position:relative; transition: transform .55s ease, opacity .55s ease; }}
  #page-cover.flipping-out {{ transform: perspective(1400px) rotateY(-25deg) scale(0.94); opacity:0; }}

  .banner {{
    background: linear-gradient(135deg, var(--navy), var(--teal));
    color:white; border-radius:16px; padding: clamp(20px,3vw,36px);
    display:grid; grid-template-columns: 1.3fr 1fr; gap: 20px; align-items:center;
  }}
  .banner-kicker {{ font-size:11px; letter-spacing:2px; opacity:.75; margin-bottom:4px; }}
  .banner h1 {{ margin:4px 0 8px; font-size: clamp(22px,2.6vw,32px); }}
  .banner .sub {{ font-size: clamp(12px,1.1vw,14px); opacity:.9; }}
  .banner .dates {{ margin-top:6px; font-size:12.5px; opacity:.85; }}
  .banner-quote {{
    font-style:italic; font-size: clamp(13px,1.3vw,16px); line-height:1.5; text-align:right;
    border-right: 3px solid rgba(255,255,255,.4); padding-right:14px;
  }}
  @media (max-width: 720px) {{
    .banner {{ grid-template-columns: 1fr; }}
    .banner-quote {{ text-align:left; border-right:none; border-left:3px solid rgba(255,255,255,.4); padding-left:14px; padding-right:0; }}
  }}

  .stat-box {{ background:white; border-radius:14px; padding:16px; text-align:center; box-shadow:0 2px 8px rgba(0,0,0,.06); border:1px solid #EDE7DA; }}
  .stat-box .num {{ font-size: clamp(18px,2vw,26px); font-weight:700; color:var(--navy); }}
  .stat-box .lbl {{ font-size:11.5px; color:var(--muted); margin-top:4px; }}

  .section-title {{ color:var(--navy); font-size: clamp(15px,1.4vw,18px); font-weight:700; margin: 20px 0 10px; }}

  .day-stack {{ display:flex; gap:14px; overflow-x:auto; scroll-snap-type:x mandatory; padding:6px 2px 14px; }}
  .day-card {{
    flex: 0 0 clamp(220px, 26vw, 300px); scroll-snap-align:start;
    background:white; border-radius:14px; padding:16px 18px; box-shadow:0 4px 14px rgba(0,0,0,.08); border:1px solid #EDE7DA;
  }}
  .day-card-badge {{ font-size:10.5px; letter-spacing:1px; color:var(--gold); font-weight:700; }}
  .day-card-loc {{ font-size:15px; font-weight:700; color:var(--navy); margin:6px 0 6px; }}
  .day-card-summary {{ font-size:12.5px; color:var(--text); line-height:1.5; }}
  .day-card-photocount {{ font-size:11px; color:var(--muted); margin-top:8px; }}

  .card {{ background:white; border-radius:14px; padding: clamp(14px,1.8vw,20px); box-shadow:0 2px 10px rgba(0,0,0,.06); border:1px solid #EDE7DA; display:flex; flex-direction:column; }}
  .card h2, .card h3.box-title {{ margin-top:0; color:var(--navy); font-size:15.5px; }}

  #mini-map, #content-map {{ height:280px; border-radius:10px; margin-top:8px; width:100%; }}
  #content-map {{ height:380px; }}

  .hcarousel {{ display:flex; gap:18px; overflow-x:auto; padding:10px 14px; height:280px; flex:1; align-items:center; }}
  .hcarousel .highlight-card {{
    flex:0 0 auto; aspect-ratio:9/16; height:86%; border-radius:10px; overflow:hidden; border:none;
    box-shadow: -5px 5px 0 -1px white, -5px 5px 0 0 rgba(0,0,0,.09), -10px 10px 0 -1px white, -10px 10px 0 0 rgba(0,0,0,.06);
  }}
  .hcarousel .highlight-card img {{ width:100%; height:100%; object-fit:cover; display:block; }}
  .hcarousel .highlight-card .highlight-caption {{ display:none; }}

  .highlight-card {{ flex:0 0 130px; background:var(--cream); border-radius:10px; overflow:hidden; border:1px solid #EDE7DA; }}
  .highlight-card img {{ width:100%; display:block; aspect-ratio:1/1; object-fit:cover; transition:opacity .15s; }}
  .highlight-card img:hover {{ opacity:.85; }}
  .highlight-caption {{ padding:6px 8px; font-size:11px; }}
  .highlight-grid {{ display:grid; grid-template-columns:repeat(auto-fill,minmax(130px,1fr)); gap:12px; margin-top:10px; }}

  .arrow-btn {{
    position:fixed; right: clamp(10px,2vw,28px); top:50%; transform:translateY(-50%);
    background:var(--coral); color:white; border:none; border-radius:50%;
    width:56px; height:56px; font-size:22px; cursor:pointer; box-shadow:0 4px 14px rgba(0,0,0,.25); z-index:50;
  }}
  .arrow-btn:hover {{ filter:brightness(0.92); }}

  .day-filter-row {{ display:flex; flex-wrap:wrap; gap:7px; margin-top:8px; }}
  .day-filter-btn {{ border:1px solid #D8D0BE; background:white; color:var(--navy); padding:6px 13px; border-radius:20px; font-size:12.5px; cursor:pointer; }}
  .day-filter-btn.active {{ background:var(--navy); color:white; border-color:var(--navy); }}

  .day-heading {{ color:var(--teal); margin:14px 0 5px; font-size:14.5px; }}
  ul {{ padding-left:18px; }} li {{ margin-bottom:5px; font-size:13.5px; }}
  .expense-row {{ display:flex; align-items:center; gap:8px; margin-bottom:8px; }}
  .expense-bar-track {{ flex:1; background:#EDE7DA; border-radius:6px; overflow:hidden; height:20px; }}
  .expense-bar-fill {{ background-color:var(--coral); background:linear-gradient(90deg,var(--coral),var(--gold)); height:100%; color:white; font-size:10.5px; display:flex; align-items:center; justify-content:flex-end; padding-right:6px; white-space:nowrap; font-weight:600; }}
  details summary {{ cursor:pointer; color:var(--navy); font-weight:600; font-size:13.5px; }}
  .footer-note {{ text-align:center; color:var(--muted); font-size:11px; margin-top:10px; }}

  .back-btn {{
    background:var(--navy); color:white; border:none; border-radius:24px; padding:8px 18px;
    font-size:13px; cursor:pointer; margin-bottom:14px;
  }}
  .back-btn:hover {{ filter:brightness(0.85); }}

  #page-content {{ display:none; }}
  #page-content.flipping-in {{ animation: fadeSlideIn .45s ease; }}
  @keyframes fadeSlideIn {{ from {{ opacity:0; transform: translateX(24px);}} to {{ opacity:1; transform:translateX(0);}} }}

  #lightbox-modal {{
    display:none; position:fixed; inset:0; background:rgba(0,0,0,.85); z-index:1000;
    align-items:center; justify-content:center; flex-direction:column; padding:24px;
  }}
  #lightbox-img {{ max-width:90vw; max-height:78vh; border-radius:10px; box-shadow:0 8px 30px rgba(0,0,0,.5); }}
  #lightbox-caption {{ color:white; margin-top:14px; font-size:14px; text-align:center; max-width:640px; }}
  #lightbox-close {{
    position:absolute; top:20px; right:24px; color:white; font-size:32px; cursor:pointer;
    background:rgba(255,255,255,.15); width:44px; height:44px; border-radius:50%; border:none;
    display:flex; align-items:center; justify-content:center; line-height:1;
  }}
  #lightbox-close:hover {{ background:rgba(255,255,255,.3); }}
</style>
</head>
<body>

<!-- ===================== หน้า 1: ปก (Cover) ===================== -->
<div class="page" id="page-cover">
  <div class="page-inner">

    <div class="banner">
      <div>
        <div class="banner-kicker">TRAVEL PASSPORT</div>
        <h1>📖 {trip_name}</h1>
        <div class="sub">👤 ทริปของคุณ {user_name} · เดินทางแบบ {companion}</div>
        <div class="dates">{_esc(start_date_str)} – {_esc(end_date_str)} · {trip_days} วัน</div>
      </div>
      <div class="banner-quote">“{vibe_quote}”</div>
    </div>

    <div class="grid-3" style="margin-top:16px;">
      <div class="stat-box"><div class="num">{total_pins}</div><div class="lbl">จุดหมายที่ไป</div></div>
      <div class="stat-box"><div class="num">{f"{total_expense:,.0f}" if has_expense else "-"}</div><div class="lbl">บาท (ค่าใช้จ่าย)</div></div>
      <div class="stat-box"><div class="num">{total_photos}</div><div class="lbl">รูป/วิดีโอทั้งหมด</div></div>
    </div>

    <div class="section-title">🗓️ สรุปแต่ละวัน (เลื่อนดูได้)</div>
    <div class="day-stack">
      {day_cards_html}
    </div>

    <div class="grid-3" style="margin-top:6px;">
      <div class="card">
        <h3 class="box-title">💰 ค่าประสบการณ์</h3>
        {f"<p style='font-size:13px;margin:4px 0 8px;'><strong>{total_expense:,.0f} บาท</strong></p>" if has_expense else ""}
        {expense_html_compact}
      </div>
      <div class="card">
        <h3 class="box-title">🗺️ เส้นทางที่ผ่านไป</h3>
        {'<div id="mini-map"></div>' if has_map_points else "<p class='muted'>ยังไม่มีข้อมูล GPS</p>"}
      </div>
      <div class="card">
        <h3 class="box-title">🌟 รูปในความทรงจำ</h3>
        <div class="hcarousel">{cover_highlight_html}</div>
      </div>
    </div>

    <div class="footer-note">สร้างโดย PassportAI 🛂 — กดลูกศรด้านขวาเพื่อดูรายละเอียดเต็ม</div>
  </div>

  <button class="arrow-btn" onclick="openContentPage()" title="ดูรายละเอียดเต็ม">➡️</button>
</div>

<!-- ===================== หน้า 2: เนื้อหา (Content) ===================== -->
<div class="page" id="page-content">
  <div class="page-inner">

    <button class="back-btn" onclick="closeContentPage()">⬅️ กลับหน้าปก</button>

    <div class="card">
      <h2>✈️ ข้อมูลการเดินทาง</h2>
      {booking_html}
    </div>

    <div class="card">
      <h2>🗺️ เส้นทางการเดินทาง</h2>
      {f'<div class="day-filter-row">{day_buttons_str}</div><div id="content-map"></div>' if has_map_points else "<p class='muted'>ยังไม่มีข้อมูล GPS สำหรับแสดงแผนที่</p>"}
      <p class="muted" style="margin-top:6px;">💡 ปุ่มกรองวันด้านบนจะกรองทุกส่วนในหน้านี้ (แผนที่ / รูปไฮไลต์ / เรื่องเล่า / Timeline) ยกเว้นค่าใช้จ่ายที่ยังไม่มีข้อมูลแยกรายวัน</p>
    </div>

    <div class="card">
      <h2>🌟 รูปไฮไลต์ <span class="muted">(คลิกรูปเพื่อขยายดู)</span></h2>
      <div class="highlight-grid">{content_highlight_html}</div>
    </div>

    <div class="card">
      <h2>📝 เรื่องเล่าทริป</h2>
      {story_html}
    </div>

    <div class="card">
      <h2>💰 สรุปค่าประสบการณ์ (ยอดรวมทั้งทริป)</h2>
      {f"<p><strong>รวมทั้งหมด: {total_expense:,.0f} บาท</strong></p>" if has_expense else "<p class='muted'>ยังไม่มีข้อมูลค่าใช้จ่าย</p>"}
      {expense_html_full}
    </div>

    <div class="card">
      <h2>⭐ ไฮไลต์เชิงตัวเลข</h2>
      <ul>{highlights_numeric_html}</ul>
    </div>

    <div class="card">
      <details>
        <summary>🗓️ Timeline แบบละเอียด รายรูป ({total_photos} รูป)</summary>
        <ul style="margin-top:10px;">{timeline_html}</ul>
        {timeline_note}
      </details>
    </div>

    <div class="footer-note">สร้างโดย PassportAI 🛂 — Your Personal Travel Memories</div>
  </div>
</div>

<!-- ===================== Lightbox Modal (ขยายดูรูปไฮไลต์) ===================== -->
<div id="lightbox-modal">
  <button id="lightbox-close" onclick="closeLightbox()">×</button>
  <img id="lightbox-img" src="" alt="ขยายรูป" />
  <div id="lightbox-caption"></div>
</div>

<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script>
  const mapDataByDay = {map_data_json};
  const lightboxData = {lightbox_json};
  let miniMap = null, contentMap = null;
  let contentMapInitialized = false;
  let currentMarkers = [];
  let currentPath = null;

  function drawScopeOnMap(mapInstance, scopeKey) {{
    const pins = mapDataByDay[scopeKey] || [];
    currentMarkers.forEach(function (m) {{ mapInstance.removeLayer(m); }});
    currentMarkers = [];
    if (currentPath) {{ mapInstance.removeLayer(currentPath); currentPath = null; }}
    if (pins.length === 0) return;
    if (pins.length >= 2) {{
      const pathCoords = pins.map(function (p) {{ return [p.lat, p.lon]; }});
      currentPath = L.polyline(pathCoords, {{ color: '{theme_secondary}', weight: 4, opacity: 0.6 }}).addTo(mapInstance);
    }}
    const bounds = [];
    pins.forEach(function (p) {{
      const marker = L.circleMarker([p.lat, p.lon], {{
        radius: p.radius, color: '#fff', weight: 1.5, fillColor: p.color, fillOpacity: 0.9
      }}).addTo(mapInstance);
      marker.bindPopup(p.label);
      currentMarkers.push(marker);
      bounds.push([p.lat, p.lon]);
    }});
    mapInstance.fitBounds(bounds, {{ padding: [20, 20] }});
  }}

  function initMiniMap() {{
    if (!mapDataByDay['all'] || mapDataByDay['all'].length === 0) return;
    miniMap = L.map('mini-map', {{ zoomControl: false, dragging: false, scrollWheelZoom: false }});
    L.tileLayer('https://{{s}}.tile.openstreetmap.org/{{z}}/{{x}}/{{y}}.png', {{ attribution: '&copy; OpenStreetMap' }}).addTo(miniMap);
    drawScopeOnMap(miniMap, 'all');
  }}

  function initContentMap() {{
    if (contentMapInitialized) return;
    if (!mapDataByDay['all'] || mapDataByDay['all'].length === 0) return;
    contentMapInitialized = true;
    contentMap = L.map('content-map');
    L.tileLayer('https://{{s}}.tile.openstreetmap.org/{{z}}/{{x}}/{{y}}.png', {{ attribution: '&copy; OpenStreetMap' }}).addTo(contentMap);
    drawScopeOnMap(contentMap, 'all');
  }}

  function applyDayFilter(scopeKey) {{
    if (contentMap) drawScopeOnMap(contentMap, scopeKey);

    document.querySelectorAll('.day-filter-btn').forEach(function (btn) {{
      btn.classList.toggle('active', btn.getAttribute('data-day') === scopeKey);
    }});

    document.querySelectorAll('#page-content .day-block').forEach(function (el) {{
      const d = el.getAttribute('data-day');
      el.style.display = (scopeKey === 'all' || d === scopeKey) ? '' : 'none';
    }});

    document.querySelectorAll('#page-content .highlight-card').forEach(function (el) {{
      const d = el.getAttribute('data-day');
      if (d === null) return;
      el.style.display = (scopeKey === 'all' || d === scopeKey) ? '' : 'none';
    }});

    document.querySelectorAll('#page-content .timeline-item').forEach(function (el) {{
      const d = el.getAttribute('data-day');
      el.style.display = (scopeKey === 'all' || d === scopeKey) ? '' : 'none';
    }});
  }}

  function openContentPage() {{
    const cover = document.getElementById('page-cover');
    const content = document.getElementById('page-content');
    cover.classList.add('flipping-out');
    setTimeout(function () {{
      cover.style.display = 'none';
      content.style.display = 'block';
      content.classList.add('flipping-in');
      initContentMap();
      setTimeout(function () {{ if (contentMap) contentMap.invalidateSize(); }}, 60);
    }}, 480);
  }}

  function closeContentPage() {{
    const cover = document.getElementById('page-cover');
    const content = document.getElementById('page-content');
    content.style.display = 'none';
    content.classList.remove('flipping-in');
    cover.style.display = 'block';
    cover.classList.remove('flipping-out');
    if (miniMap) setTimeout(function () {{ miniMap.invalidateSize(); }}, 60);
  }}

  function openLightbox(index) {{
    const item = lightboxData[index];
    if (!item) return;
    const modal = document.getElementById('lightbox-modal');
    const img = document.getElementById('lightbox-img');
    const caption = document.getElementById('lightbox-caption');
    img.src = item.img ? ('data:image/jpeg;base64,' + item.img) : '';
    caption.textContent = item.caption || '';
    modal.style.display = 'flex';
  }}

  function closeLightbox() {{
    document.getElementById('lightbox-modal').style.display = 'none';
  }}

  document.addEventListener('keydown', function (e) {{
    if (e.key === 'Escape') closeLightbox();
  }});

  initMiniMap();
</script>

</body>
</html>"""
    return html_doc


def _estimate_iframe_height(passport):
    base = 700
    height = base
    height += 60
    n_highlights = len(passport.get("highlight_entries", []))
    height += 220 if n_highlights else 60
    return int(min(max(height, 900), 2600))


# ============================================================
# 🧪 DEMO DATA GENERATOR
# ============================================================

class DemoUploadedFile:
    def __init__(self, name, data):
        self.name = name
        self._data = data

    def getvalue(self):
        return self._data


def _decimal_to_dms_rational(decimal_deg):
    is_negative = decimal_deg < 0
    decimal_deg = abs(decimal_deg)
    degrees = int(decimal_deg)
    minutes_full = (decimal_deg - degrees) * 60
    minutes = int(minutes_full)
    seconds_num = int(round((minutes_full - minutes) * 60 * 10000))
    return (Fraction(degrees, 1), Fraction(minutes, 1), Fraction(seconds_num, 10000)), is_negative


def _make_demo_jpeg_bytes(dt=None, lat=None, lon=None, color=(120, 150, 190)):
    img = Image.new("RGB", (80, 80), color=color)
    exif = img.getexif()
    if dt is not None:
        exif[306] = dt.strftime("%Y:%m:%d %H:%M:%S")
    if lat is not None and lon is not None:
        lat_dms, lat_neg = _decimal_to_dms_rational(lat)
        lon_dms, lon_neg = _decimal_to_dms_rational(lon)
        exif[IFD.GPSInfo] = {1: "S" if lat_neg else "N", 2: lat_dms, 3: "W" if lon_neg else "E", 4: lon_dms}
    buf = io.BytesIO()
    img.save(buf, format="JPEG", exif=exif)
    return buf.getvalue()


def generate_demo_trip():
    HOTEL = (13.7398, 100.5645)
    PALACE = (13.7500, 100.4913)
    WAT_ARUN = (13.7437, 100.4888)
    CHATUCHAK = (13.7999, 100.5501)

    plan = [
        ("d1_hotel_checkin.jpg", datetime(2026, 12, 5, 19, 0, 0), HOTEL, True),
        ("d1_hotel_room.jpg", datetime(2026, 12, 5, 19, 30, 0), HOTEL, False),
        ("d2_hotel_morning.jpg", datetime(2026, 12, 6, 8, 0, 0), HOTEL, False),
        ("d2_palace1.jpg", datetime(2026, 12, 6, 9, 30, 0), PALACE, True),
        ("d2_palace2.jpg", datetime(2026, 12, 6, 10, 0, 0), PALACE, False),
        ("d2_watarun.jpg", datetime(2026, 12, 6, 13, 0, 0), WAT_ARUN, True),
        ("d2_hotel_evening.jpg", datetime(2026, 12, 6, 20, 0, 0), HOTEL, False),
        ("d3_chatuchak1.jpg", datetime(2026, 12, 7, 11, 0, 0), CHATUCHAK, True),
        ("d3_chatuchak2.jpg", datetime(2026, 12, 7, 11, 45, 0), CHATUCHAK, False),
        ("d3_hotel_late.jpg", datetime(2026, 12, 7, 23, 55, 0), HOTEL, False),
        ("d4_hotel_after_midnight.jpg", datetime(2026, 12, 8, 0, 15, 0), HOTEL, False),
        ("edge_gps_no_date.jpg", None, PALACE, False),
        ("edge_date_no_gps.jpg", datetime(2026, 12, 6, 15, 0, 0), None, False),
    ]

    files, flags = [], []
    for name, dt, coords, is_hl in plan:
        lat, lon = coords if coords else (None, None)
        data = _make_demo_jpeg_bytes(dt=dt, lat=lat, lon=lon)
        files.append(DemoUploadedFile(name, data))
        flags.append(is_hl)

    start_date = datetime(2026, 12, 5).date()
    end_date = datetime(2026, 12, 8).date()
    expenses = [
        {"category": "ที่พัก (Hotel)", "amount": 4500},
        {"category": "อาหาร (Food)", "amount": 2800},
        {"category": "เดินทาง (Transport)", "amount": 900},
        {"category": "ช้อปปิ้ง (Shopping)", "amount": 1600},
    ]
    user_profile = build_user_profile("มิ้นท์", COMPANION_OPTIONS[2], "")
    return files, flags, start_date, end_date, expenses, user_profile


# ============================================================
# 🎬 LOADING ANIMATION
# ============================================================

class LoadingAnimation:
    def __init__(self):
        self.icon_ph = st.empty()
        self.title_ph = st.empty()
        self.bar_ph = st.empty()
        self.msg_ph = st.empty()
        self._progress = None

    def update(self, pct, icon, title, message=""):
        pct = max(0, min(100, int(pct)))
        self.icon_ph.markdown(f"<div style='text-align:center;font-size:70px;line-height:1.1;'>{icon}</div>", unsafe_allow_html=True)
        self.title_ph.markdown(f"<h3 style='text-align:center;margin-top:0;'>{title}</h3>", unsafe_allow_html=True)
        if self._progress is None:
            self._progress = self.bar_ph.progress(pct, text=f"{pct}%")
        else:
            self.bar_ph.progress(pct, text=f"{pct}%")
        if message:
            self.msg_ph.markdown(f"<p style='text-align:center;color:#888;'>{message}</p>", unsafe_allow_html=True)

    def pulse(self, base_message, frames=3, delay=0.18):
        dots_cycle = ["", ".", "..", "..."]
        for i in range(frames):
            self.msg_ph.markdown(f"<p style='text-align:center;color:#888;'>{base_message}{dots_cycle[i % len(dots_cycle)]}</p>", unsafe_allow_html=True)
            time.sleep(delay)

    def clear(self):
        self.icon_ph.empty()
        self.title_ph.empty()
        self.bar_ph.empty()
        self.msg_ph.empty()


def run_generation_pipeline(uploaded_files, is_highlight_flags, start_date, end_date, flight_docs, expenses, user_profile,
                             use_ai=False, ai_provider="claude", ai_api_key="", ai_model="",
                             tone_key=DEFAULT_TONE_KEY, theme_key=DEFAULT_THEME_KEY):
    loader = LoadingAnimation()
    loader.update(2, "🧳", "กำลังเตรียมข้อมูลทริปของคุณ", f"สวัสดีคุณ {user_profile['user_name']} เริ่มต้นกระบวนการ...")
    time.sleep(0.4)

    tone_description = TONE_OPTIONS.get(tone_key, TONE_OPTIONS[DEFAULT_TONE_KEY])
    theme_colors = THEME_OPTIONS.get(theme_key, THEME_OPTIONS[DEFAULT_THEME_KEY])

    total_photos = len(uploaded_files)

    def _on_progress(i, total, message):
        pct = 6 + int((i / max(total, 1)) * 32)
        loader.update(pct, "🔍", "กำลังอ่านความทรงจำของคุณ", message)

    loader.update(6, "🔍", "กำลังอ่านความทรงจำของคุณ", f"เตรียมประมวลผลรูปภาพ {total_photos} รูป")
    timeline_data = agent01_memory_collection(uploaded_files, is_highlight_flags, start_date, end_date, flight_docs, expenses, on_progress=_on_progress)
    loader.pulse("ตรวจสอบข้อมูลตำแหน่งทั้งหมด")

    loader.update(40, "🧭", "กำลังจัดกลุ่มสถานที่ที่ไปเยือน", "รวมรูปที่ถ่ายในจุดเดียวกันเข้าด้วยกัน...")
    visits = _build_visits(timeline_data["timeline"])

    def _on_visit_progress(i, total, message):
        pct = 43 + int((i / max(total, 1)) * 10)
        loader.update(pct, "📍", "กำลังค้นหาชื่อสถานที่แต่ละจุดแวะ", message)

    visits = _enrich_visits_with_location(visits, on_progress=_on_visit_progress)
    loader.pulse("ตรวจสอบชื่อย่าน/สถานที่")

    loader.update(55, "📊", "กำลังวิเคราะห์ทริปของคุณ", "คำนวณค่าใช้จ่ายและไฮไลต์...")
    insights = agent03_travel_intelligence(timeline_data, visits)
    loader.pulse("ตรวจสอบตัวเลขอีกครั้ง")

    ai_result, ai_error = None, None
    if use_ai:
        provider_display = "Claude AI" if ai_provider == "claude" else "Google Gemini"
        loader.update(64, "🤖", f"กำลังให้ {provider_display} เขียนเรื่องราวให้คุณ", "ส่งข้อมูลทริปไปให้ AI คิด...")
        ai_result, ai_error = call_ai_writer(
            ai_provider, ai_api_key, ai_model, visits, user_profile, insights, start_date, end_date,
            timeline_data["trip_days"], tone_description,
        )
        if ai_result:
            loader.pulse(f"{provider_display} เขียนเรื่องราวเสร็จแล้ว")
        else:
            loader.pulse(f"AI ใช้ไม่ได้ ({ai_error}) กำลังใช้ข้อความสำรองแทน", frames=2)

        def _on_caption_progress(i, total, message):
            pct = 74 + int((i / max(total, 1)) * 14)
            loader.update(pct, "👀", "กำลังให้ AI มองรูปไฮไลต์ของคุณ", message)

        timeline_data["timeline"] = agent05_photo_vision_caption(
            timeline_data["timeline"], use_ai, ai_provider, ai_api_key, ai_model, tone_description, on_progress=_on_caption_progress
        )
    else:
        loader.update(80, "✍️", "กำลังแต่งเรื่องเล่าทริปของคุณ", f"เรียบเรียง {len(visits)} จุดแวะให้เป็นเรื่องราว...")
        time.sleep(0.3)

    loader.update(93, "📖", "กำลังประกอบ Travel Passport", "จัดหน้าและรูปแบบทั้งหมด...")
    passport = agent04_passport_builder(
        timeline_data, visits, user_profile, ai_result=ai_result, ai_error=ai_error, ai_enabled=use_ai, ai_provider=ai_provider if use_ai else None
    )
    passport["insights"] = insights
    loader.pulse("เกือบเสร็จแล้ว")

    loader.update(97, "🌐", "กำลังสร้างหน้าเว็บของคุณ", "ประกอบ HTML + แผนที่ Interactive...")
    html_content = generate_html_passport(passport, theme=theme_colors)
    time.sleep(0.3)

    loader.update(100, "🎉", "เสร็จเรียบร้อย!", "กำลังแสดงผลลัพธ์...")
    time.sleep(0.5)
    loader.clear()

    return passport, html_content


# ============================================================
# 📅 AUTO-DETECT วันที่เดินทางจากเอกสาร
# ============================================================

_DATE_PATTERNS = [
    r"\b\d{1,2}\s?(?:JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)\s?\d{2,4}\b",
    r"\b\d{4}-\d{2}-\d{2}\b",
    r"\b\d{1,2}/\d{1,2}/\d{2,4}\b",
    r"\b\d{1,2}\s+(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4}\b",
    r"\b(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}\b",
]
_COMBINED_DATE_PATTERN = re.compile("|".join(_DATE_PATTERNS), re.IGNORECASE)
_EXCLUDE_KEYWORDS = ["issued", "issue date", "booking date", "purchase", "print date", "created", "generated"]


def _find_candidate_dates(text):
    results = []
    for m in _COMBINED_DATE_PATTERN.finditer(text):
        context_before = text[max(0, m.start() - 40):m.start()].lower()
        if any(kw in context_before for kw in _EXCLUDE_KEYWORDS):
            continue
        try:
            results.append(dtparser.parse(m.group(), dayfirst=True, fuzzy=False).date())
        except Exception:
            continue
    return results


def _most_common_date(dates):
    if not dates:
        return None
    return Counter(dates).most_common(1)[0][0]


def _read_file_text(uploaded_file):
    if uploaded_file is None:
        return "", "none", "ไม่มีไฟล์แนบ"
    name_lower = uploaded_file.name.lower()
    file_bytes = uploaded_file.getvalue()
    if name_lower.endswith(".pdf"):
        if not PDF_SUPPORTED:
            return "", "none", "เครื่องนี้ยังไม่ได้ติดตั้ง pypdf (รัน `pip install pypdf`)"
        try:
            reader = pypdf.PdfReader(io.BytesIO(file_bytes))
            text = "\n".join(page.extract_text() or "" for page in reader.pages)
            if text.strip():
                return text, "high", "อ่านข้อความจาก PDF โดยตรง (แม่นยำสูง)"
            return "", "none", "ไฟล์ PDF นี้อาจเป็นภาพสแกน ไม่มีข้อความให้อ่านโดยตรง"
        except Exception:
            return "", "none", "ไม่สามารถเปิดไฟล์ PDF นี้ได้"
    else:
        if not _ocr_available():
            return "", "none", "ไม่พบ OCR ในเครื่องนี้ (ใช้ได้เฉพาะไฟล์ PDF หรือกรอกวันที่เอง)"
        try:
            import pytesseract
            image = Image.open(io.BytesIO(file_bytes))
            text = pytesseract.image_to_string(image)
            if text.strip():
                return text, "medium", "อ่านด้วย OCR จากรูปภาพ (อาจคลาดเคลื่อน กรุณาตรวจสอบ)"
            return "", "none", "OCR ไม่พบข้อความในรูปภาพนี้"
        except Exception:
            return "", "none", "อ่านรูปภาพด้วย OCR ไม่สำเร็จ"


def auto_detect_trip_dates(flight_docs):
    mode = flight_docs.get("mode")
    if mode == "e_itinerary":
        f = flight_docs.get("itinerary_file")
        text, confidence, note = _read_file_text(f)
        if not text:
            return {"success": False, "message": f"ไม่สามารถอ่านวันที่อัตโนมัติได้ ({note})"}
        dates = sorted(set(_find_candidate_dates(text)))
        if len(dates) >= 2:
            return {"success": True, "start_date": dates[0], "end_date": dates[-1],
                    "message": f"พบวันที่ {dates[0].strftime('%d %b %Y')} ถึง {dates[-1].strftime('%d %b %Y')} · {note}"}
        elif len(dates) == 1:
            return {"success": True, "start_date": dates[0], "end_date": dates[0],
                    "message": f"พบวันที่เดียวในเอกสาร ({dates[0].strftime('%d %b %Y')}) ใช้เป็นทั้งขาไป-ขากลับ กรุณาตรวจสอบ · {note}"}
        return {"success": False, "message": f"ไม่พบวันที่ในเอกสารนี้ ({note})"}
    else:
        outbound_file = flight_docs.get("outbound_file")
        return_file = flight_docs.get("return_file")
        out_text, out_conf, out_note = _read_file_text(outbound_file)
        ret_text, ret_conf, ret_note = _read_file_text(return_file)
        start_date = _most_common_date(_find_candidate_dates(out_text)) if out_text else None
        end_date = _most_common_date(_find_candidate_dates(ret_text)) if ret_text else None
        if start_date and end_date:
            return {"success": True, "start_date": start_date, "end_date": end_date,
                    "message": f"ขาไป: {start_date.strftime('%d %b %Y')} ({out_note}) · ขากลับ: {end_date.strftime('%d %b %Y')} ({ret_note})"}
        elif start_date or end_date:
            return {"success": "partial", "start_date": start_date, "end_date": end_date,
                    "message": f"อ่านได้บางส่วน — ขาไป: {out_note if start_date else 'ไม่พบวันที่'} · ขากลับ: {ret_note if end_date else 'ไม่พบวันที่'}"}
        return {"success": False, "message": f"ไม่สามารถอ่านวันที่ได้ — ขาไป: {out_note} · ขากลับ: {ret_note}"}


# ============================================================
# 🔀 PAGE STATE
# ============================================================

if "page" not in st.session_state:
    st.session_state["page"] = "form"


def _reset_to_form():
    for key in ["passport", "passport_html", "auto_start_date", "auto_end_date", "auto_detect_message"]:
        st.session_state.pop(key, None)
    st.session_state["date_source"] = "manual"
    st.session_state["page"] = "form"


def _expenses_df_to_list(df):
    expenses = []
    if df is None:
        return expenses
    for _, row in df.iterrows():
        category = str(row.get("หมวดหมู่", "")).strip()
        amount_raw = row.get("จำนวนเงิน (บาท)", 0)
        try:
            amount = float(amount_raw)
        except (TypeError, ValueError):
            amount = 0
        if category and amount > 0:
            expenses.append({"category": category, "amount": amount})
    return expenses


# ============================================================
# UI หลักของแอป
# ============================================================

if st.session_state["page"] == "form":
    st.title("🛂 PassportAI")
    st.caption("Your Personal Travel Memories")

    with st.expander("ℹ️ สถานะความคืบหน้าของแต่ละ Agent (คลิกดู)"):
        st.markdown(
            "- **👤 User Profile** — ✅ ของจริงแล้ว (ชื่อผู้ใช้ + เพื่อนร่วมทริป)\n"
            "- **Agent 01 · Memory Collection** — ✅ ของจริงแล้ว (อ่าน EXIF + หาชื่อสถานที่จริง, กรองภาษา 2 ชั้น บังคับไทย/อังกฤษ)\n"
            "- **Agent 02 · Story Generation** — ✅ เชื่อม AI จริงได้แล้ว! เลือกโทน+ค่าย AI ได้ + ชื่อทริประดับเมือง\n"
            "- **Agent 03 · Travel Intelligence** — 🟡 Mock (ข้อความ) แต่คำนวณจากค่าใช้จ่ายจริง\n"
            "- **Agent 04 · Passport Builder** — 🟢 ประกอบข้อมูลจริง + Merge ผลลัพธ์ AI กับ Mock อย่างชาญฉลาด\n"
            "- **Agent 05 · Photo Vision Caption** — ✅ ให้ AI มองรูปไฮไลต์แล้วเขียน Caption ตามโทนที่เลือก\n"
            "- **🌏 ภาษาสถานที่** — ✅ บังคับไทย/อังกฤษเท่านั้น ไม่มีอักษรจีน/ญี่ปุ่น/เกาหลีหลุดออกมาแล้ว"
        )

    if not HEIC_SUPPORTED:
        st.warning(
            "⚠️ ยังไม่รองรับไฟล์ .HEIC (รูปจาก iPhone) เพราะเครื่องนี้ยังไม่ได้ติดตั้ง `pillow-heif`\n\n"
            "วิธีแก้: รันคำสั่ง `pip install pillow-heif` แล้วรันแอปใหม่อีกครั้ง"
        )

    st.divider()

    st.subheader("🎨 เลือกธีมสีของหน้าเว็บ")
    theme_choice = st.selectbox("ธีมสี", options=list(THEME_OPTIONS.keys()), index=0)
    theme_preview_cols = st.columns(5)
    for col, (label, hexcode) in zip(theme_preview_cols, THEME_OPTIONS[theme_choice].items()):
        with col:
            st.markdown(
                f"<div style='background:{hexcode};height:36px;border-radius:6px;border:1px solid #ddd;'></div>"
                f"<p style='text-align:center;font-size:11px;margin-top:2px;'>{label}</p>",
                unsafe_allow_html=True,
            )

    st.divider()

    with st.expander("🤖 เชื่อมต่อ AI เขียนเรื่องราว + มองรูปไฮไลต์จริง — คลิกดูวิธีเชื่อมต่อ (ไม่บังคับ ไม่ใส่ก็ใช้งานได้)", expanded=False):
        st.markdown(
            "**วิธีเชื่อมต่อ (ทำตาม 3 ขั้นตอนนี้เท่านั้น):**\n"
            "1. ติ๊ก ✨ ด้านล่าง แล้วเลือกค่าย AI (แนะนำ **Google Gemini** เพราะฟรี ไม่ต้องผูกบัตรเครดิต)\n"
            "2. ขอ API Key ฟรีได้ที่ **[aistudio.google.com/apikey](https://aistudio.google.com/apikey)** "
            "(Login ด้วย Gmail ธรรมดา กด Create API Key ใช้เวลาไม่ถึง 1 นาที)\n"
            "3. วาง Key ที่ได้ลงในช่องด้านล่าง แล้วกดปุ่มสร้าง Travel Passport ได้เลย — ไม่ต้องมีข้อมูลอื่นเพิ่มเติม "
            "(รูปภาพ, ธีม, โทน, ข้อมูลส่วนตัวที่กรอกไว้ด้านล่าง จะถูกส่งให้ AI ใช้เขียนให้อัตโนมัติ)"
        )
        st.caption(
            "ถ้าเลือก **Claude (Anthropic)** แทน ต้องมีเครดิตเงินในบัญชีก่อนถึงเรียกใช้ได้ (ต่างจาก Gemini ที่ฟรีจริง) "
            "ดูวิธีขอ Key ได้ที่ console.anthropic.com"
        )

        tone_choice = st.selectbox("🎭 เลือกโทนแคปชัน/เรื่องเล่า", options=list(TONE_OPTIONS.keys()), index=0)
        st.caption(f"ตัวอย่างโทน: _{TONE_OPTIONS[tone_choice]}_")

        use_ai_toggle = st.checkbox("✨ ใช้ AI เขียนเรื่องราว + มองรูปไฮไลต์จริง (แทนข้อความสำเร็จรูป)", value=False)

        ai_provider_choice = "claude"
        ai_api_key_input = ""
        ai_model_id = ""

        if use_ai_toggle:
            provider_label = st.radio(
                "เลือกค่าย AI",
                options=["🔵 Google Gemini — ฟรี ไม่ต้องผูกบัตร (แนะนำ)", "🟠 Claude (Anthropic) — คุณภาพสูง ต้องมีเครดิตเงิน"],
                horizontal=False,
            )
            ai_provider_choice = "gemini" if provider_label.startswith("🔵") else "claude"

            if ai_provider_choice == "gemini":
                if not GEMINI_SDK_AVAILABLE:
                    st.warning("⚠️ เครื่องนี้ยังไม่ได้ติดตั้ง `google-genai` — รันคำสั่ง `pip install google-genai` แล้วรันแอปใหม่อีกครั้ง")
                ai_api_key_input = st.text_input(
                    "Google Gemini API Key", type="password", placeholder="AIza...",
                    help="ขอ API Key ฟรีได้ที่ aistudio.google.com/apikey — ไม่ต้องผูกบัตรเครดิต ไม่มีค่าใช้จ่าย",
                )
                gemini_options_with_custom = list(GEMINI_MODEL_OPTIONS.keys()) + [CUSTOM_MODEL_LABEL]
                model_choice_label = st.selectbox("เลือกโมเดล", options=gemini_options_with_custom)
                if model_choice_label == CUSTOM_MODEL_LABEL:
                    ai_model_id = st.text_input(
                        "พิมพ์ Model ID เอง", placeholder="เช่น gemini-3.7-flash",
                        help="ดูรุ่นล่าสุดได้ที่ ai.google.dev/gemini-api/docs/models",
                    ).strip()
                else:
                    ai_model_id = GEMINI_MODEL_OPTIONS[model_choice_label]
                st.caption("💚 ฟรี 100% ไม่มีค่าใช้จ่าย (มีจำกัดจำนวนครั้ง/นาทีตาม Google แต่เพียงพอสำหรับโปรเจกต์นี้)")
                st.caption(
                    "⚠️ ถ้าเจอ Error แบบ 'API key not valid' ให้ลองสร้าง Key ใหม่ (Key เก่าอาจถูกยกเลิกจากนโยบายความปลอดภัยของ Google) "
                    "หรือถ้าเจอ Error แบบ 'model not found' ให้เลือก '🔧 อื่นๆ (พิมพ์ Model ID เอง)' ด้านบนแทน"
                )
            else:
                if not ANTHROPIC_SDK_AVAILABLE:
                    st.warning("⚠️ เครื่องนี้ยังไม่ได้ติดตั้ง `anthropic` — รันคำสั่ง `pip install anthropic` แล้วรันแอปใหม่อีกครั้ง")
                ai_api_key_input = st.text_input(
                    "Anthropic API Key", type="password", placeholder="sk-ant-...",
                    help="ขอ API Key ได้ที่ console.anthropic.com — ต้องมีเครดิตเงินในบัญชีก่อนเรียกใช้ได้",
                )
                claude_options_with_custom = list(CLAUDE_MODEL_OPTIONS.keys()) + [CUSTOM_MODEL_LABEL]
                model_choice_label = st.selectbox("เลือกโมเดล", options=claude_options_with_custom)
                if model_choice_label == CUSTOM_MODEL_LABEL:
                    ai_model_id = st.text_input(
                        "พิมพ์ Model ID เอง", placeholder="เช่น claude-opus-4-1-20250805",
                        help="ดูรุ่นล่าสุดได้ที่ docs.anthropic.com/en/docs/about-claude/models",
                    ).strip()
                else:
                    ai_model_id = CLAUDE_MODEL_OPTIONS[model_choice_label]
                st.caption("💰 ค่าใช้จ่ายโดยประมาณต่อ 1 ครั้ง: Sonnet 4.5 ~$0.01-0.03 · Haiku 4.5 ~$0.003-0.01 (รวม Caption รูปไฮไลต์แล้ว)")

            st.caption("หากไม่ใส่ Key หรือเรียกไม่สำเร็จ ระบบจะใช้ข้อความสำเร็จรูปแทนอัตโนมัติ ไม่ทำให้แอปพัง")

    st.divider()

    with st.expander("🧪 ทดลองด้วยข้อมูลทริปตัวอย่าง (Demo Data) — ไม่ต้องหารูปจริงมาอัปโหลด"):
        st.caption(
            "สร้างทริปกรุงเทพฯ 3 วันจำลอง (13 รูป) แบบสมจริง เพื่อทดสอบ Pipeline ทั้งระบบทันที "
            "(ถ้าเปิดใช้ AI ไว้ด้านบน ปุ่มนี้จะใช้ AI จริงเขียนเรื่องราว + มองรูปไฮไลต์ให้ด้วย ตามโทน+ธีมที่เลือก)"
        )
        if st.button("🧪 สร้าง Travel Passport จากข้อมูลตัวอย่างทันที", use_container_width=True):
            demo_files, demo_flags, demo_start, demo_end, demo_expenses, demo_profile = generate_demo_trip()
            demo_flight_docs = {"mode": "boarding_pass", "outbound_file": None, "return_file": None}
            passport, html_content = run_generation_pipeline(
                demo_files, demo_flags, demo_start, demo_end, demo_flight_docs, demo_expenses, demo_profile,
                use_ai=use_ai_toggle, ai_provider=ai_provider_choice, ai_api_key=ai_api_key_input, ai_model=ai_model_id,
                tone_key=tone_choice, theme_key=theme_choice,
            )
            st.session_state["passport"] = passport
            st.session_state["passport_html"] = html_content
            st.session_state["page"] = "result"
            st.rerun()

    st.divider()

    st.subheader("1️⃣ ข้อมูลส่วนตัวของคุณ")
    st.caption("ข้อมูลนี้จะใช้ปรับโทนภาษา/ธีมของหน้าเว็บ Travel Passport ให้เข้ากับบรรยากาศทริปของคุณ")
    profile_col1, profile_col2 = st.columns(2)
    with profile_col1:
        user_name_input = st.text_input("ชื่อของคุณ", placeholder="เช่น มิ้นท์, ข้าวตัง, Alex")
    with profile_col2:
        companion_choice = st.selectbox("ทริปนี้ไปกับใคร / ฟีลการเที่ยวแบบไหน", options=COMPANION_OPTIONS)

    custom_companion_text = ""
    if companion_choice == COMPANION_OPTIONS[-1]:
        custom_companion_text = st.text_input("ระบุเพิ่มเติม (ไปกับใคร/ฟีลแบบไหน)", placeholder="เช่น เพื่อนร่วมงาน 5 คน")

    user_profile = build_user_profile(user_name_input, companion_choice, custom_companion_text)
    st.caption(f"👤 สรุป: **{user_profile['user_name']}** · เดินทางแบบ **{user_profile['travel_companion']}**")

    st.divider()

    st.subheader("2️⃣ อัปโหลดเอกสารการเดินทาง")
    st.caption("เลือกได้ว่าจะใช้ Boarding Pass แยกทีละใบ หรือใช้ E-Itinerary ไฟล์เดียว")

    doc_mode_label = st.radio(
        "รูปแบบเอกสารที่มี",
        options=["✈️ Boarding Pass (แยกขาไป-ขากลับ)", "📄 E-Itinerary (ใบสรุปการจอง ไฟล์เดียว)"],
        horizontal=True,
    )

    flight_docs = {}
    _doc_types = ["jpg", "jpeg", "png", "pdf"] + (["heic", "heif"] if HEIC_SUPPORTED else [])

    if doc_mode_label.startswith("✈️"):
        flight_docs["mode"] = "boarding_pass"
        bp_col1, bp_col2 = st.columns(2)
        with bp_col1:
            st.markdown("**✈️ ขาไป (Outbound)**")
            flight_docs["outbound_file"] = st.file_uploader("อัปโหลด Boarding Pass ขาไป", type=_doc_types, key="bp_out")
        with bp_col2:
            st.markdown("**🛬 ขากลับ (Return)**")
            flight_docs["return_file"] = st.file_uploader("อัปโหลด Boarding Pass ขากลับ", type=_doc_types, key="bp_in")
    else:
        flight_docs["mode"] = "e_itinerary"
        st.markdown("**📄 E-Itinerary**")
        flight_docs["itinerary_file"] = st.file_uploader("อัปโหลด E-Itinerary (.pdf หรือรูปภาพ)", type=_doc_types, key="e_itin")

    st.divider()

    st.subheader("3️⃣ วันที่เดินทาง")

    has_any_document = (
        (flight_docs["mode"] == "e_itinerary" and flight_docs.get("itinerary_file") is not None)
        or (flight_docs["mode"] == "boarding_pass" and (flight_docs.get("outbound_file") or flight_docs.get("return_file")))
    )

    if "date_source" not in st.session_state:
        st.session_state["date_source"] = "manual"
    if "auto_start_date" not in st.session_state:
        st.session_state["auto_start_date"] = None
    if "auto_end_date" not in st.session_state:
        st.session_state["auto_end_date"] = None
    if "auto_detect_message" not in st.session_state:
        st.session_state["auto_detect_message"] = None

    if has_any_document:
        if st.button("🔍 อ่านวันที่อัตโนมัติจากเอกสาร", use_container_width=True):
            with st.spinner("กำลังอ่านเอกสาร..."):
                result = auto_detect_trip_dates(flight_docs)
            st.session_state["auto_detect_message"] = result["message"]
            if result.get("success") in (True, "partial"):
                if result.get("start_date"):
                    st.session_state["auto_start_date"] = result["start_date"]
                if result.get("end_date"):
                    st.session_state["auto_end_date"] = result["end_date"]
                st.session_state["date_source"] = "auto"
            else:
                st.session_state["date_source"] = "manual"
            st.rerun()
    else:
        st.caption("💡 อัปโหลดเอกสารการเดินทางด้านบนก่อน เพื่อให้ระบบลองอ่านวันที่ให้อัตโนมัติได้")

    if st.session_state["auto_detect_message"]:
        if st.session_state["date_source"] == "auto":
            st.success(f"✅ {st.session_state['auto_detect_message']}")
        else:
            st.warning(f"⚠️ {st.session_state['auto_detect_message']}")

    if st.session_state["date_source"] == "auto" and st.session_state["auto_start_date"]:
        disp_col1, disp_col2, disp_col3 = st.columns([2, 2, 1.3])
        with disp_col1:
            st.metric("วันที่ออกเดินทาง", st.session_state["auto_start_date"].strftime("%d %b %Y"))
        with disp_col2:
            st.metric("วันที่เดินทางกลับ", st.session_state["auto_end_date"].strftime("%d %b %Y"))
        with disp_col3:
            st.write("")
            if st.button("✏️ แก้ไขวันที่เอง", use_container_width=True):
                st.session_state["date_source"] = "manual"
                st.rerun()
        start_date = st.session_state["auto_start_date"]
        end_date = st.session_state["auto_end_date"]
    else:
        date_col1, date_col2 = st.columns(2)
        default_start = st.session_state["auto_start_date"] or datetime(2026, 11, 3).date()
        default_end = st.session_state["auto_end_date"] or datetime(2026, 11, 7).date()
        with date_col1:
            start_date = st.date_input("วันที่ออกเดินทาง (ขาไป)", value=default_start)
        with date_col2:
            end_date = st.date_input("วันที่เดินทางกลับ (ขากลับ)", value=default_end)

    if end_date < start_date:
        st.error("⚠️ วันที่เดินทางกลับต้องอยู่หลังวันที่ออกเดินทาง กรุณาแก้ไขวันที่ให้ถูกต้อง")

    st.divider()

    st.subheader("4️⃣ ค่าใช้จ่ายระหว่างทริป")
    st.caption("กรอก/แก้ไข/เพิ่ม/ลบรายการได้เอง (แถวที่จำนวนเงินเป็น 0 หรือว่าง จะไม่ถูกนับ)")

    if "expense_editor_data" not in st.session_state:
        st.session_state["expense_editor_data"] = pd.DataFrame(DEFAULT_EXPENSE_ROWS)

    expense_df = st.data_editor(
        st.session_state["expense_editor_data"],
        num_rows="dynamic",
        use_container_width=True,
        key="expense_editor",
        column_config={
            "หมวดหมู่": st.column_config.TextColumn("หมวดหมู่", required=True),
            "จำนวนเงิน (บาท)": st.column_config.NumberColumn("จำนวนเงิน (บาท)", min_value=0, step=100, format="%.0f"),
        },
    )
    st.session_state["expense_editor_data"] = expense_df
    expenses = _expenses_df_to_list(expense_df)
    current_total = sum(e["amount"] for e in expenses)
    st.metric("ยอดรวมปัจจุบัน", f"{current_total:,.0f} บาท")

    st.divider()

    st.subheader("5️⃣ อัปโหลดรูปภาพทริปของคุณ")
    st.caption("💡 เทคนิค: ใช้รูปที่ถ่ายจากมือถือโดยตรง (ไม่ผ่าน LINE/Facebook) เพื่อให้มีข้อมูล GPS ติดมาด้วย")

    _photo_types = ["jpg", "jpeg", "png"] + (["heic", "heif"] if HEIC_SUPPORTED else [])

    st.markdown(f"**🌟 รูปไฮไลต์ (เลือกได้สูงสุด {MAX_HIGHLIGHT_PHOTOS} รูป)**")
    highlight_files_raw = st.file_uploader("อัปโหลดรูปไฮไลต์", type=_photo_types, accept_multiple_files=True, key="highlight_photos")
    highlight_files_raw = highlight_files_raw or []
    highlight_truncated = len(highlight_files_raw) > MAX_HIGHLIGHT_PHOTOS
    highlight_files = highlight_files_raw[:MAX_HIGHLIGHT_PHOTOS]
    if highlight_truncated:
        st.warning(f"⚠️ เลือกมา {len(highlight_files_raw)} รูป แต่รองรับสูงสุด {MAX_HIGHLIGHT_PHOTOS} รูป จะใช้ {MAX_HIGHLIGHT_PHOTOS} รูปแรก")
    elif highlight_files:
        st.success(f"เลือกรูปไฮไลต์แล้ว {len(highlight_files)}/{MAX_HIGHLIGHT_PHOTOS} รูป ✅")

    st.markdown("**📷 รูปภาพทั้งหมด (รวมรูปที่เหลือ)**")
    other_files = st.file_uploader("อัปโหลดรูปภาพที่เหลือ (อัปโหลดได้หลายไฟล์)", type=_photo_types, accept_multiple_files=True, key="trip_photos")
    other_files = other_files or []

    all_uploaded_files = list(highlight_files) + list(other_files)
    is_highlight_flags = [True] * len(highlight_files) + [False] * len(other_files)

    if other_files:
        st.success(f"อัปโหลดรูปภาพทั้งหมดแล้ว {len(other_files)} ไฟล์ ✅")
    if all_uploaded_files:
        st.info(f"📦 รวมทั้งหมด {len(all_uploaded_files)} รูป (ไฮไลต์ {len(highlight_files)} + รูปทั่วไป {len(other_files)})")

    st.subheader("6️⃣ สร้าง Travel Passport")
    generate = st.button("🪄 สร้าง Travel Passport", type="primary", use_container_width=True)

    st.divider()

    if generate:
        if not all_uploaded_files:
            st.warning("⚠️ กรุณาอัปโหลดรูปภาพอย่างน้อย 1 รูปก่อนกดสร้าง Passport")
        elif end_date < start_date:
            st.error("⚠️ กรุณาแก้ไขวันที่เดินทางให้ถูกต้องก่อน (ขากลับต้องอยู่หลังขาไป)")
        else:
            passport, html_content = run_generation_pipeline(
                all_uploaded_files, is_highlight_flags, start_date, end_date, flight_docs, expenses, user_profile,
                use_ai=use_ai_toggle, ai_provider=ai_provider_choice, ai_api_key=ai_api_key_input, ai_model=ai_model_id,
                tone_key=tone_choice, theme_key=theme_choice,
            )
            st.session_state["passport"] = passport
            st.session_state["passport_html"] = html_content
            st.session_state["page"] = "result"
            st.rerun()

# ================================================================
# หน้า "result" — แสดงผลหน้าเว็บ HTML ตัวจริง "ฝังอยู่ในแอปทันที" เต็มความกว้าง
# ================================================================
elif st.session_state["page"] == "result" and "passport" in st.session_state:
    passport = st.session_state["passport"]
    html_content = st.session_state["passport_html"]

    top_col1, top_col2 = st.columns([3, 1.4])
    with top_col1:
        st.success("🎉 สร้าง Travel Passport สำเร็จแล้ว! (แสดงผลด้านล่างทันที ไม่ต้องดาวน์โหลด)")
    with top_col2:
        if st.button("🔙 สร้างใหม่อีกครั้ง", use_container_width=True, key="back_top"):
            _reset_to_form()
            st.rerun()

    ai_status = passport.get("ai_status", {})
    _PROVIDER_LABELS = {"claude": "Claude AI", "gemini": "Google Gemini"}
    provider_label_display = _PROVIDER_LABELS.get(ai_status.get("provider"), "AI")
    if ai_status.get("used"):
        st.info(f"✨ เรื่องเล่าและคำโปรยในหน้าเว็บด้านล่าง เขียนโดย {provider_label_display} จริงแล้ว")
    elif ai_status.get("enabled") and ai_status.get("error"):
        st.warning(f"⚠️ เชื่อม {provider_label_display} ไม่สำเร็จ ({ai_status['error']}) — ระบบใช้ข้อความสำเร็จรูปแทนให้อัตโนมัติ ลองตรวจสอบ API Key แล้วสร้างใหม่อีกครั้งได้")

    iframe_height = _estimate_iframe_height(passport)
    components.html(html_content, height=iframe_height, scrolling=True)

    st.divider()

    safe_filename = re.sub(r"[^\w\-]+", "_", passport["trip_name"])[:60]
    st.download_button(
        label="📥 ดาวน์โหลดหน้าเว็บนี้เก็บไว้ (HTML) — เผื่ออยากแชร์ต่อ",
        data=html_content,
        file_name=f"{safe_filename}.html",
        mime="text/html",
        use_container_width=True,
    )
    st.caption(
        "💡 ไฟล์ที่ได้เป็น HTML ไฟล์เดียว เปิดดูได้ทันทีในเบราว์เซอร์ หรืออัปโหลดขึ้นบริการฟรี เช่น "
        "[Netlify Drop](https://app.netlify.com/drop) เพื่อได้ลิงก์แชร์สาธารณะ"
    )

    if st.button("🔙 สร้าง Passport ใหม่อีกครั้ง", use_container_width=True, key="back_bottom"):
        _reset_to_form()
        st.rerun()

else:
    st.session_state["page"] = "form"
    st.rerun()
