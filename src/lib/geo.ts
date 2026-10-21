// Visit Builder + Reverse Geocoding — พอร์ตมาจาก app_v022.py
// (รวมระบบกรองภาษา 2 ชั้น: accept-language th,en + ตัดอักษรจีน/ญี่ปุ่น/เกาหลีทิ้ง)
import type { MapPin, PlaceInfo, Visit } from './types'

export function haversineM(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371000
  const toRad = (d: number) => (d * Math.PI) / 180
  const dphi = toRad(lat2 - lat1)
  const dl = toRad(lon2 - lon1)
  const a = Math.sin(dphi / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dl / 2) ** 2
  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

interface GeoPoint {
  lat: number
  lon: number
  takenAt: string
  day: number | null
  isHighlight: boolean
}

/** รวมรูปที่ถ่ายต่อเนื่องในรัศมีเดียวกันเป็น 1 "จุดแวะ" (รองรับการกลับไปที่เดิมซ้ำเป็นคนละ visit) */
export function buildVisits(points: GeoPoint[], radius = 300): Visit[] {
  const sorted = [...points].sort((a, b) => a.takenAt.localeCompare(b.takenAt))
  const clusters: { lat: number; lon: number; sumLat: number; sumLon: number; n: number }[] = []
  const assign: number[] = []
  for (const p of sorted) {
    let idx = clusters.findIndex((c) => haversineM(p.lat, p.lon, c.lat, c.lon) <= radius)
    if (idx === -1) {
      clusters.push({ lat: p.lat, lon: p.lon, sumLat: p.lat, sumLon: p.lon, n: 1 })
      idx = clusters.length - 1
    } else {
      const c = clusters[idx]
      c.sumLat += p.lat
      c.sumLon += p.lon
      c.n++
      c.lat = c.sumLat / c.n
      c.lon = c.sumLon / c.n
    }
    assign.push(idx)
  }
  const visits: Visit[] = []
  let i = 0
  while (i < sorted.length) {
    let j = i
    while (j + 1 < sorted.length && assign[j + 1] === assign[i]) j++
    const group = sorted.slice(i, j + 1)
    const c = clusters[assign[i]]
    visits.push({
      lat: c.lat,
      lon: c.lon,
      start: group[0].takenAt,
      end: group[group.length - 1].takenAt,
      day: group[0].day,
      photoCount: group.length,
      hasHighlight: group.some((g) => g.isHighlight),
      location: null,
    })
    i = j + 1
  }
  return visits
}

/** หมุดบนแผนที่: รวมจุดที่อยู่ใกล้กันทั้งทริปเป็นหมุดเดียว เรียงตามเวลาที่ไปครั้งแรก */
export function buildPins(visits: Visit[], radius = 300): MapPin[] {
  const pins: (MapPin & { sumLat: number; sumLon: number; n: number })[] = []
  for (const v of visits) {
    const hit = pins.find((p) => haversineM(v.lat, v.lon, p.lat, p.lon) <= radius && p.day === v.day)
    if (hit) {
      hit.count += v.photoCount
      hit.sumLat += v.lat
      hit.sumLon += v.lon
      hit.n++
      hit.lat = hit.sumLat / hit.n
      hit.lon = hit.sumLon / hit.n
    } else {
      pins.push({
        lat: v.lat, lon: v.lon, order: pins.length + 1, count: v.photoCount, day: v.day,
        label: v.location?.display ?? `${v.lat.toFixed(4)}, ${v.lon.toFixed(4)}`, sumLat: v.lat, sumLon: v.lon, n: 1,
      })
    }
  }
  return pins.map(({ sumLat: _a, sumLon: _b, n: _n, ...p }) => p)
}

export function routeDistanceKm(visits: Visit[]) {
  let d = 0
  for (let i = 1; i < visits.length; i++) d += haversineM(visits[i - 1].lat, visits[i - 1].lon, visits[i].lat, visits[i].lon)
  return Math.round(d / 100) / 10
}

const UNREADABLE = /[一-鿿㐀-䶿぀-ゟ゠-ヿ가-힣]/
const clean = (t?: string | null) => (t && !UNREADABLE.test(t) ? t : null)

function formatDisplay(place: string | null, district: string | null, city: string | null, country: string | null, fallback: string | null, lat: number, lon: number) {
  if (place && district && city) return `${place} (ย่าน${district}, ${city})`
  if (place && city) return `${place}, ${city}`
  if (place) return place
  if (district && city) return `ย่าน${district}, ${city}`
  if (city && country) return `${city}, ${country}`
  if (city) return city
  if (fallback) return fallback
  return `พิกัด ${lat.toFixed(4)}, ${lon.toFixed(4)}`
}

const GEO_CACHE = 'pai_geo_v1'
let lastCall = 0

function cacheGet(key: string): PlaceInfo | null {
  try {
    return JSON.parse(localStorage.getItem(GEO_CACHE) || '{}')[key] ?? null
  } catch {
    return null
  }
}
function cacheSet(key: string, v: PlaceInfo) {
  try {
    const all = JSON.parse(localStorage.getItem(GEO_CACHE) || '{}')
    all[key] = v
    localStorage.setItem(GEO_CACHE, JSON.stringify(all))
  } catch {
    /* ignore */
  }
}

/** แปลงพิกัดเป็นชื่อสถานที่ผ่าน OpenStreetMap Nominatim (ฟรี, จำกัด 1 ครั้ง/วินาที — มีแคชในเครื่อง) */
export async function reverseGeocode(lat: number, lon: number): Promise<PlaceInfo> {
  const key = `${lat.toFixed(3)},${lon.toFixed(3)}`
  const cached = cacheGet(key)
  if (cached) return cached
  const wait = 1100 - (Date.now() - lastCall)
  if (wait > 0) await new Promise((r) => setTimeout(r, wait))
  lastCall = Date.now()
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&zoom=16&addressdetails=1&accept-language=th,en;q=0.5`
    const res = await fetch(url)
    if (res.ok) {
      const data = await res.json()
      const a = data.address ?? {}
      const place = clean(a.attraction || a.tourism || a.leisure || a.amenity || a.building || a.road)
      const district = clean(a.suburb || a.neighbourhood || a.quarter || a.city_district)
      const city = clean(a.city || a.town || a.village || a.municipality || a.county || a.state)
      const country = clean(a.country)
      const info: PlaceInfo = { place, district, city, country, display: formatDisplay(place, district, city, country, clean(data.display_name), lat, lon) }
      cacheSet(key, info)
      return info
    }
  } catch {
    /* ใช้ fallback ด้านล่าง */
  }
  return { place: null, district: null, city: null, country: null, display: formatDisplay(null, null, null, null, null, lat, lon) }
}
