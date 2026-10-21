export type Category = 'food' | 'transport' | 'accommodation' | 'shopping' | 'activity' | 'other'

export interface Trip {
  id: string
  user_id: string
  name: string
  destination: string | null
  start_date: string
  end_date: string
  companion: string
  budget: number | null
  home_currency: string
  tone: string
  theme: string
  status: 'active' | 'ended'
  cover_photo_path: string | null
  created_at: string
}

export interface Photo {
  id: string
  trip_id: string
  storage_path: string
  thumb_path: string | null
  original_name: string | null
  kind: 'photo' | 'receipt'
  taken_at: string | null
  lat: number | null
  lon: number | null
  width: number | null
  height: number | null
  is_highlight: boolean
  caption: string | null
  created_at: string
}

export interface Message {
  id: string
  trip_id: string
  role: 'user' | 'assistant'
  content: string
  photo_id: string | null
  meta: {
    memory?: string | null
    expense_ids?: string[]
    mode?: 'ai' | 'offline'
    pending?: boolean
  }
  created_at: string
}

export interface Expense {
  id: string
  trip_id: string
  message_id: string | null
  description: string
  category: Category
  amount: number
  currency: string
  rate: number
  amount_home: number
  spent_on: string
  source: 'chat' | 'manual' | 'receipt'
  created_at: string
}

export interface ExtractedExpense {
  description: string
  category: Category
  amount: number
  currency: string
  date: string
}

export interface PassportRow {
  id: string
  trip_id: string
  share_slug: string
  is_public: boolean
  data: PassportData
  created_at: string
  updated_at: string
}

export interface PlaceInfo {
  place: string | null
  district: string | null
  city: string | null
  country: string | null
  display: string
}

export interface Visit {
  lat: number
  lon: number
  start: string
  end: string
  day: number | null
  photoCount: number
  hasHighlight: boolean
  location: PlaceInfo | null
}

export interface MapPin {
  lat: number
  lon: number
  order: number
  count: number
  day: number | null
  label: string
}

export interface PassportData {
  version: 1
  tripName: string
  tripTitle: string
  destination: string | null
  userName: string
  companion: string
  startDate: string
  endDate: string
  tripDays: number
  homeCurrency: string
  theme: string
  vibeQuote: string
  days: { day: number; date: string; area: string; summary: string; narrative: string | null; photoCount: number; spent: number }[]
  visits: Visit[]
  pins: MapPin[]
  highlights: { url: string; thumb: string; caption: string; day: number | null; takenAt: string | null }[]
  cities: string[]
  stats: {
    places: number
    photos: number
    totalSpent: number
    budget: number | null
    distanceKm: number
    dailyAverage: number
    expenseCount: number
  }
  byCategory: { category: Category; amount: number; pct: number }[]
  byDay: { day: number; date: string; amount: number }[]
  topExpenses: { description: string; amount: number; category: Category; day: number | null }[]
  insights: string[]
  notes: string[]
  aiUsed: boolean
  generatedAt: string
}
