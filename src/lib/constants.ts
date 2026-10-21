import type { Category } from './types'

export const CATEGORIES: Record<Category, { label: string; emoji: string; color: string }> = {
  food: { label: 'อาหาร', emoji: '🍜', color: '#E2622B' },
  transport: { label: 'เดินทาง', emoji: '🚕', color: '#1F6F68' },
  accommodation: { label: 'ที่พัก', emoji: '🏨', color: '#E8A33D' },
  shopping: { label: 'ช้อปปิ้ง', emoji: '🛍️', color: '#B5527A' },
  activity: { label: 'กิจกรรม/ค่าเข้าชม', emoji: '🎟️', color: '#5B6BB5' },
  other: { label: 'อื่นๆ', emoji: '✨', color: '#9C8B7A' },
}
export const CATEGORY_KEYS = Object.keys(CATEGORIES) as Category[]

export const COMPANIONS: Record<string, { label: string; emoji: string; vibe: string[] }> = {
  friends: { label: 'เพื่อนฝูง', emoji: '👫', vibe: ['สนุกสนาน', 'เต็มไปด้วยเสียงหัวเราะ', 'ไม่มีเบื่อ'] },
  partner: { label: 'คู่รัก', emoji: '💑', vibe: ['หวานๆ', 'อบอุ่นใจ', 'ฟินๆ'] },
  family: { label: 'ครอบครัว', emoji: '👨‍👩‍👧', vibe: ['อบอุ่น', 'ยิ้มได้ทั้งวัน', 'ประทับใจกันทุกคน'] },
  solo: { label: 'เที่ยวคนเดียว', emoji: '🧍', vibe: ['ชิลๆ', 'ได้ใช้เวลากับตัวเอง', 'สงบดี'] },
  work: { label: 'ทริปงาน/สัมมนา', emoji: '💼', vibe: ['คุ้มค่า', 'ได้ประสบการณ์ใหม่', 'น่าจดจำ'] },
}

export const TONES: Record<string, { label: string; prompt: string }> = {
  cute: { label: '🥰 น่ารัก', prompt: 'น่ารัก ขี้เล่น ใช้อิโมจิน่ารักๆ ประปราย เหมือนเพื่อนสนิทที่ชอบพูดหวานๆ' },
  funny: { label: '😆 ขำๆ', prompt: 'ตลก มีมุขแทรกเบาๆ เหมือนเพื่อนที่ชอบแซวกันสนุกๆ แต่ไม่หยาบคาย' },
  warm: { label: '🤗 อบอุ่น', prompt: 'อบอุ่น นุ่มนวล ให้ความรู้สึกปลอดภัยและมีความสุข เหมือนคนในครอบครัวคุยกัน' },
  minimal: { label: '✨ มินิมอล', prompt: 'สั้น กระชับ ตรงประเด็น ไม่ใช้คำฟุ่มเฟือยหรืออิโมจิเยอะ' },
}

/** ธีมของหน้า Passport — 4 ธีมแรกพอร์ตมาจาก THEME_OPTIONS ใน app_v022.py + ธีม Ember ตามสไลด์นำเสนอ */
export const THEMES: Record<string, { label: string; primary: string; secondary: string; accent: string; highlight: string; bg: string }> = {
  ember: { label: '🔥 Ember (Passport AI)', primary: '#2C2119', secondary: '#E2622B', accent: '#E8A33D', highlight: '#1F6F68', bg: '#F8F5EF' },
  ocean: { label: '🌊 Ocean Teal', primary: '#1B3A57', secondary: '#1E7E7A', accent: '#D9932D', highlight: '#FF6B5B', bg: '#FFF6EA' },
  sunset: { label: '🌅 Sunset Amber', primary: '#7A3B2E', secondary: '#E8743B', accent: '#F4A93F', highlight: '#C1502E', bg: '#FFF3E0' },
  lavender: { label: '💜 Lavender Dusk', primary: '#4A3B6B', secondary: '#8B7BC4', accent: '#D9A441', highlight: '#E893B4', bg: '#FBF7FF' },
  forest: { label: '🌿 Forest Sage', primary: '#2F4A3E', secondary: '#7A9B76', accent: '#D4A017', highlight: '#C1652E', bg: '#F7F3E9' },
}

export const DAY_COLORS = ['#E2622B', '#1F6F68', '#5B6BB5', '#E8A33D', '#B5527A', '#3E8E5B', '#8B5CF6']
export const dayColor = (day: number | null) => (day == null ? '#9C8B7A' : DAY_COLORS[(day - 1) % DAY_COLORS.length])

export const CURRENCIES = ['THB', 'JPY', 'KRW', 'CNY', 'TWD', 'HKD', 'SGD', 'MYR', 'VND', 'USD', 'EUR', 'GBP', 'AUD', 'CHF']
