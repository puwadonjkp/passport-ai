import { useEffect, useRef } from 'react'
import L from 'leaflet'
import { dayColor } from '../lib/constants'
import type { MapPin } from '../lib/types'

/** แผนที่เส้นทาง (Leaflet + OpenStreetMap) — หมุดเรียงตามลำดับเวลา สีตามวัน ขนาดตามจำนวนรูป */
export default function TripMap({ pins, day, routeColor, interactive = true, className = '' }: {
  pins: MapPin[]; day: number | 'all'; routeColor: string; interactive?: boolean; className?: string
}) {
  const el = useRef<HTMLDivElement>(null)
  const map = useRef<L.Map | null>(null)
  const layer = useRef<L.LayerGroup | null>(null)

  useEffect(() => {
    if (!el.current || map.current) return
    map.current = L.map(el.current, {
      zoomControl: interactive, dragging: interactive, scrollWheelZoom: false, touchZoom: interactive, doubleClickZoom: interactive, attributionControl: true,
    })
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '&copy; OpenStreetMap', maxZoom: 19 }).addTo(map.current)
    layer.current = L.layerGroup().addTo(map.current)
    const ro = new ResizeObserver(() => map.current?.invalidateSize())
    ro.observe(el.current)
    return () => {
      ro.disconnect()
      map.current?.remove()
      map.current = null
    }
  }, [interactive])

  useEffect(() => {
    const m = map.current
    const g = layer.current
    if (!m || !g) return
    g.clearLayers()
    const shown = day === 'all' ? pins : pins.filter((p) => p.day === day)
    if (!shown.length) {
      m.setView([13.75, 100.5], 3)
      return
    }
    const max = Math.max(...shown.map((p) => p.count))
    if (shown.length > 1) L.polyline(shown.map((p) => [p.lat, p.lon]), { color: routeColor, weight: 3.5, opacity: 0.7, dashArray: '6 8' }).addTo(g)
    shown.forEach((p, i) => {
      const r = 7 + (p.count / max) * 8
      L.circleMarker([p.lat, p.lon], { radius: r, color: '#fff', weight: 2, fillColor: dayColor(p.day), fillOpacity: 0.95 })
        .bindPopup(`<b>#${i + 1}</b> ${escapeHtml(p.label)}<br/><small>Day ${p.day ?? '?'} · ${p.count} รูป</small>`)
        .addTo(g)
    })
    m.fitBounds(L.latLngBounds(shown.map((p) => [p.lat, p.lon])), { padding: [28, 28], maxZoom: 15 })
  }, [pins, day, routeColor])

  return <div ref={el} className={`z-0 h-full w-full ${className}`} />
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)
}
